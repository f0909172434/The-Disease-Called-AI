"""
Spoken and whispered lines: natural Kokoro speech, placed so the first sound lands on `tb`.

Kokoro keeps its own durations (divided by the line's `speed`) and its own energy curve;
only the F0 curve is reshaped per style before decoding:
  ai                calmer, flatter intonation (deviation x0.6) + a light WORLD sheen
  human_trembling   +1.5 st, 6.6 Hz tremor (+-55 cents, irregular), jitter, breath layer
  whisper           decoded normally, then WORLD-resynthesised with F0 = 0
`cut_tb` hard-stops the line with a 10 ms glitch (the AI is interrupted mid-word).
"""
from __future__ import annotations

import re

import numpy as np
from scipy.ndimage import gaussian_filter1d

import cache
import kokoro_backend as kb
import planner as pl
import world_voice as wv
from lineaudio import (LineRender, SR_OUT, add_air, edge_gate, glitch_cut, ortho_syllables,
                       set_level, to48k)
from phonology import VOWELS, kind, syllabify, word_phonemes
from singer import stable_seed
from styles import SpokenStyle, spoken_style

TTS_SOURCES = ["kokoro_backend.py", "phonology.py"]
TTS_VERSION = 1        # bump when speak_native() / shape_f0() change


def shape_f0(f0: np.ndarray, st: SpokenStyle, seed: int, rate: int = 80) -> np.ndarray:
    """Reshape Kokoro's predicted F0 (80 Hz) per style; unvoiced samples stay unvoiced."""
    rng = np.random.default_rng(seed)
    v = f0 > 10.0
    if not v.any():
        return f0
    out = f0.copy()
    med = np.median(f0[v])
    if st.flatten != 1.0:
        out[v] = med * (f0[v] / med) ** st.flatten
    cents = np.full(len(f0), 100.0 * st.shift_semitones)
    t = np.arange(len(f0)) / rate
    if st.tremor_cents:
        depth = st.tremor_cents * (1 + 0.35 * gaussian_filter1d(rng.standard_normal(len(f0)), 6))
        rate_mod = st.tremor_hz * (1 + 0.08 * gaussian_filter1d(rng.standard_normal(len(f0)), 10))
        cents += depth * np.sin(2 * np.pi * np.cumsum(rate_mod) / rate + rng.uniform(0, 6))
    if st.jitter_cents:
        cents += st.jitter_cents * gaussian_filter1d(rng.standard_normal(len(f0)), 0.7)
    out[v] *= 2 ** (cents[v] / 1200)
    return np.where(v, out, f0)


def _tokens_to_ps(say: str):
    """misaki tokens -> phoneme string + per-token char spans (pronunciation overrides)."""
    voc = kb.vocab()
    ps, spans = "", []
    for t in kb.g2p(say):
        ph = "".join(c for c in (t.phonemes or "") if c in voc)
        if re.search(r"[A-Za-z]", t.text):
            ph = word_phonemes(t.text, ph, sung=False)
        spans.append((len(ps), len(ps) + len(ph), t.text))
        ps += ph
        if t.whitespace:
            ps += " "
    return ps.rstrip(), spans


def speak_native(line: dict, blend: dict, st: SpokenStyle, seed: int) -> dict:
    key = cache.key("tts", line, blend, seed, TTS_VERSION, st.flatten, st.shift_semitones,
                    st.tremor_cents, st.tremor_hz, st.jitter_cents, sources=TTS_SOURCES)
    hit = cache.load("tts", line["id"], key)
    if hit is not None:
        return hit
    pack = kb.voice_pack(blend)
    ps, spans = _tokens_to_ps(line["say"])
    enc = kb.encode(ps, pack)
    speed = float(line.get("speed") or 1.0)
    d = np.maximum(np.round(enc.natdur / speed), 1.0)         # exactly what Kokoro does
    bounds = kb.frames_to_bounds(d)
    A = kb.alignment(bounds, int(bounds[-1]))
    f0p, energy = kb.prosody(enc, A)
    f0 = shape_f0(f0p, st, seed)
    native = kb.decode(enc, A, f0, energy, seed=seed % (2 ** 31))
    out = {"ps": ps, "spans": spans, "bounds": bounds, "f0": f0, "native": native}
    cache.save("tts", line["id"], key, out)
    return out


def _f0_5ms(f0_80: np.ndarray, n: int) -> np.ndarray:
    t = np.arange(n) * 0.005
    idx = np.clip((t * 80).astype(int), 0, len(f0_80) - 1)
    f = f0_80[idx]
    return np.where(f > 10.0, f, 0.0)


def style_audio(r: dict, st: SpokenStyle, seed: int) -> np.ndarray:
    x = r["native"]
    y = x
    if st.world or st.breath_layer_db is not None:
        f0 = _f0_5ms(r["f0"], wv.n_world_frames(len(x)))
        _, sp, ap = wv.analyze(x, f0)
        sp_s = wv.formant_warp(sp, st.formant)
        if st.tilt_db_oct:
            sp_s = wv.tilt(sp_s, st.tilt_db_oct, pivot_hz=1000.0, lo_hz=1000.0)
        if st.world:
            y = wv.synthesize(np.zeros_like(f0) if st.whisper else f0, sp_s, ap)
            if st.vocoder_db is not None and not st.whisper:
                voc = wv.vocoder_layer(f0, sp_s, len(y), seed=seed)
                g = np.sqrt(np.mean(y ** 2) / (np.mean(voc ** 2) + 1e-12))
                y = y + voc * g * 10 ** (st.vocoder_db / 20)
        if st.breath_layer_db is not None:
            br = wv.synthesize(np.zeros_like(f0), sp, ap)
            g = np.sqrt(np.mean(y ** 2) / (np.mean(br ** 2) + 1e-12))
            y = y + br[: len(y)] * g * 10 ** (st.breath_layer_db / 20)
    if st.amp_tremor:
        rng = np.random.default_rng(seed + 1)
        t = np.arange(len(y)) / wv.FS
        wob = np.sin(2 * np.pi * st.tremor_hz * t + rng.uniform(0, 6))
        y = y * (1 + st.amp_tremor * wob)
    return np.asarray(y, np.float32)


def _onset(y: np.ndarray, sr: int, rel_db: float = 32.0) -> float:
    n = int(0.005 * sr)
    w = y[: len(y) // n * n].reshape(-1, n)
    db = 10 * np.log10((w ** 2).mean(1) + 1e-12)
    return float(np.argmax(db > db.max() - rel_db) * n / sr)


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9']", "", s.lower().replace("’", "'"))


def render_spoken(line: dict, voices: dict) -> LineRender:
    st = spoken_style(line)
    blend = voices[line["voice"]]["blend"]
    seed = stable_seed(line["id"])
    r = speak_native(line, blend, st, seed)
    y = add_air(to48k(style_audio(r, st, seed)), seed=seed)

    # Token times come from Kokoro's alignment, whose audio runs a few frames ahead of it;
    # instead of modelling that lag we anchor the alignment to the first *measured* sound
    # (a plosive is heard at its burst, i.e. the end of its token), and place the render so
    # that this first sound lands exactly on tb.
    b = r["bounds"] * kb.FRAME
    toks = [(a, e, txt) for a, e, txt in r["spans"] if e > a and re.search(r"[A-Za-z]", txt)]
    t_first = 0.0
    if toks:
        a0 = toks[0][0]
        t_first = b[a0 + 2] if kind(r["ps"][a0]) == "plosive" else b[a0 + 1]
    on = _onset(y, SR_OUT)
    shift = on - t_first
    start = line["tb"] * pl.BEAT - on

    cut = None
    if line.get("cut_tb") is not None:
        cut = line["cut_tb"] * pl.BEAT - start
        y = glitch_cut(y, SR_OUT, cut, seed=seed)
        y = y[: int(cut * SR_OUT) + 1]
    last_end = b[toks[-1][1] + 1] + shift if toks else len(y) / SR_OUT
    y = edge_gate(y, SR_OUT, max(0.0, on - 0.03), min(len(y) / SR_OUT, last_end + 0.12),
                  fade_in=0.01, fade_out=0.08)
    y = set_level(y, st.level_dbfs)

    # display words <- say tokens (sequential match on normalised text)
    disp = [w for w in line["text"].split() if re.search(r"[A-Za-z]", w)]
    words, sylls, ti = [], [], 0
    for w in disp:
        nw = _norm(w)
        while ti < len(toks) and _norm(toks[ti][2]) != nw:
            ti += 1
        if ti >= len(toks):
            break
        a, e, _ = toks[ti]
        ws, we = b[a + 1] + shift, b[e + 1] + shift
        if cut is not None:
            if ws >= cut:
                break
            we = min(we, cut)
        text = re.sub(r"^[^\w']+|[^\w']+$", "", w)
        words.append({"text": text, "start": round(start + ws, 4), "end": round(start + we, 4)})
        ph = r["ps"][a:e]
        nv = max(1, sum(c in VOWELS for c in ph))
        parts = syllabify(ph, nv)
        names = ortho_syllables(text, nv)
        if len(names) != nv:
            names = [text] + [""] * (nv - 1)
        for k, p in enumerate(parts):
            idx = p.onset + p.nucleus + p.coda
            if not idx:
                continue
            ss = b[a + 1 + idx[0]] + shift
            se = b[a + 1 + idx[-1] + 1] + shift
            if cut is not None:
                if ss >= cut:
                    break
                se = min(se, cut)
            sylls.append({"text": names[k], "start": round(start + ss, 4),
                          "end": round(start + se, 4)})
        ti += 1
    timing = {
        "id": line["id"], "speaker": line["speaker"], "section": line["section"],
        "mode": line["mode"], "style": line["style"], "bus": line["bus"],
        "display": bool(line.get("display")), "text": line["text"],
        "start": words[0]["start"] if words else round(start + on, 4),
        "end": words[-1]["end"] if words else round(start + len(y) / SR_OUT, 4),
        "syllables": sylls, "words": words,
    }
    if cut is not None:
        timing["cut"] = round(start + cut, 4)
    return LineRender(line["id"], y, start, timing, {"phonemes": r["ps"]})
