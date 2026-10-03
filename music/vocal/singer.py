"""
Sung lines: score -> Kokoro forced singing (native range) -> WORLD (target pitch + style).

    plan     planner.plan_sung         every phoneme placed in song time
    contour  contour.design            expressive target F0 (human / AI / choir)
    native   kokoro_backend.decode     Kokoro sings the plan, melody squeezed into the
                                       voice's clean range, energy curve designed per token
    world    world_voice.*             same spectral envelope, exact target pitch, styled
"""
from __future__ import annotations

import copy
import hashlib

import numpy as np
from scipy.signal import butter, sosfiltfilt

import cache
import contour as ct
import dynamics as dy
import kokoro_backend as kb
import planner as pl
import world_voice as wv
from lineaudio import LineRender, SR_OUT, add_air, edge_gate, inhale, set_level, to48k
from styles import SungStyle, sung_style, voice_range

# The Kokoro stage is the expensive one (~80 % of a line's render time), so its cache key
# covers only what shapes it: these modules plus the TTS-side style values (timing,
# expression, energy) — WORLD/timbre tweaks re-use the cached renders. Bump TTS_VERSION
# when sing_native() itself changes.
TTS_SOURCES = ["kokoro_backend.py", "phonology.py", "planner.py", "contour.py", "dynamics.py"]
TTS_VERSION = 1


def stable_seed(text: str) -> int:
    return int(hashlib.sha1(text.encode()).hexdigest()[:8], 16)


def jitter_line(line: dict, seed: int, sigma: float = 0.007, clip: float = 0.014) -> dict:
    """A double is a second take, not a copy: nudge each syllable's landing by a few ms
    (the previous note's end follows when the two were tied)."""
    rng = np.random.default_rng(seed)
    out = copy.deepcopy(line)
    prev = None
    for s in out["syllables"]:
        d = float(np.clip(rng.normal(0, sigma), -clip, clip)) / pl.BEAT
        first = s["notes"][0]
        if prev is not None and abs(prev["tb"] + prev["d"] - first["tb"]) < 1e-6:
            prev["d"] += d
        first["tb"] += d
        first["d"] -= d
        prev = s["notes"][-1]
    return out


def sing_native(line: dict, blend: dict, style: SungStyle, seed: int) -> dict:
    """Kokoro stage (cached): plan, contour and the native-range render."""
    key = cache.key("tts", line, blend, seed, TTS_VERSION, kb.CONTENT_LAG, style.timing, style.expr,
                    style.vowel_level, style.onset_boost, style.dynamics, voice_range(blend),
                    sources=TTS_SOURCES)
    hit = cache.load("tts", line["id"], key)
    if hit is not None:
        return hit
    pack = kb.voice_pack(blend)
    st = style.timing
    wps = pl.phoneme_words([w["say"] for w in line["words"]], sung=True)
    ps, slots = pl.prepare_line(line, wps, st)
    enc = kb.encode(ps, pack)
    plan = pl.plan_sung(line, enc.natdur, ps, slots, st)
    con = ct.design(plan, style.expr, seed, detune_cents=float(line.get("detune_cents") or 0.0))
    lo, hi = voice_range(blend)
    nat_m = ct.native_midi(con.target_midi, con.voiced, lo, hi)

    bounds = plan.bounds_frames()                     # intended (audio) timeline
    A, nf = kb.content_alignment(bounds)              # content shifted by the decoder's lag
    f0_dec = ct.to_decoder_rate(con.t, ct.midi_to_hz(nat_m), con.voiced, plan.t0, nf)
    levels = dy.token_levels([p.sym for p in plan.phones], [p.role for p in plan.phones],
                             vowel_level=style.vowel_level, onset_boost=style.onset_boost)
    b_pros = bounds.copy()
    b_pros[-1] = nf                                   # EOS silence runs to the last frame
    energy = dy.design_energy(b_pros, nf, levels)
    energy = dy.shape_notes(energy, plan.t0, plan, style.dynamics, np.random.default_rng(seed))
    native = kb.decode(enc, A, f0_dec, energy, seed=seed % (2 ** 31))
    out = {"plan": plan, "con": con, "nat_m": nat_m, "native": native, "ps": ps}
    cache.save("tts", line["id"], key, out)
    return out


def _lowpass(y: np.ndarray, hz: float, sr: int = wv.FS) -> np.ndarray:
    sos = butter(4, hz, "lp", fs=sr, output="sos")
    return sosfiltfilt(sos, y).astype(np.float32)


def world_stage(r: dict, style: SungStyle, seed: int, detune: float) -> np.ndarray:
    """Formant-preserving transpose to the target contour + timbre styling (24 kHz)."""
    con = r["con"]
    f0_native = np.where(con.voiced, ct.midi_to_hz(r["nat_m"]), 0.0)
    _, sp, ap = wv.analyze(r["native"], f0_native)
    return world_render(sp, ap, con, r["plan"], style, seed, detune)


def world_render(sp: np.ndarray, ap: np.ndarray, con, plan, style: SungStyle, seed: int,
                 detune: float) -> np.ndarray:
    """Style a WORLD analysis (envelope `sp`, aperiodicity `ap`, 5 ms frames from plan.t0)
    and synthesise it on the target contour (24 kHz). Shared with diffsinger_backend."""
    n = sp.shape[0]
    sp = wv.formant_warp(sp, style.formant)
    if style.tilt_db_oct:
        sp = wv.tilt(sp, style.tilt_db_oct, pivot_hz=1000.0, lo_hz=1000.0)
    if style.breath:
        ap = wv.breathy(ap, style.breath, style.breath_from)
    f0t = wv.fit(con.target_hz, n)

    if style.choir_voices > 1:
        # one performance, several singers: own vibrato/drift, small detune and delay each
        ys = []
        for k in range(style.choir_voices):
            if k == 0:
                f0k = f0t
            else:
                ck = ct.design(plan, style.expr, seed + 7919 * k,
                               detune_cents=detune + (7.0 if k % 2 else -7.0))
                f0k = wv.fit(ck.target_hz, n)
            yk = wv.synthesize(f0k, sp, ap)
            d = int(0.011 * k * wv.FS)
            ys.append(np.concatenate([np.zeros(d, np.float32), yk])[: len(yk)])
        y = np.sum(ys, axis=0) / np.sqrt(len(ys))
    else:
        y = wv.synthesize(f0t, sp, ap)

    if style.unvoiced_db:
        # per-sample gain from the planned voicing (5 ms frames), smoothed over ~10 ms
        g_fr = np.where(wv.fit(con.voiced.astype(float), n) > 0.5, 1.0, 10 ** (style.unvoiced_db / 20))
        g = np.interp(np.arange(len(y)), np.arange(n) * wv.HOP, g_fr)
        k = int(0.010 * wv.FS)
        y = y * np.convolve(g, np.ones(k) / k, mode="same")
    if style.vocoder_db is not None:
        voc = wv.vocoder_layer(f0t, sp, len(y), seed=seed)
        rv, ry = np.sqrt(np.mean(voc ** 2) + 1e-12), np.sqrt(np.mean(y ** 2) + 1e-12)
        y = y + voc * (ry / rv) * 10 ** (style.vocoder_db / 20)
    if style.lowpass_hz:
        y = _lowpass(y, style.lowpass_hz)
    return y.astype(np.float32)


def render_sung(line: dict, voices: dict) -> LineRender:
    style = sung_style(line)
    blend = voices[line["voice"]]["blend"]
    seed = stable_seed(line["id"])
    src = line
    if line.get("double_of") and line["style"] == "human":
        src = jitter_line(line, seed)
    r = sing_native(src, blend, style, seed)
    detune = float(line.get("detune_cents") or 0.0)
    y = add_air(to48k(world_stage(r, style, seed, detune)), seed=seed)
    return finish_sung(line, y, r["plan"], r["con"], style, seed, r["ps"])


def finish_sung(line: dict, y: np.ndarray, plan, con, style: SungStyle, seed: int,
                phonemes: str) -> LineRender:
    """48 kHz line audio starting at plan.t0 -> gated, levelled, delayed LineRender with its
    timing entry and QA data. Shared with diffsinger_backend."""
    detune = float(line.get("detune_cents") or 0.0)
    # gate the edges, set the level, apply the double's gain and delay
    sylls = plan.syllables
    t_on = min(s.start for s in sylls) - plan.t0
    t_off = max(s.end for s in sylls) - plan.t0
    y = edge_gate(y, SR_OUT, t_on, t_off + 0.02, fade_in=0.02, fade_out=0.06)
    y = set_level(y, style.level_dbfs + float(line.get("gain_db") or 0.0))
    delay = float(line.get("delay_ms") or 0.0) / 1000.0
    start = plan.t0 + delay
    if line["style"] == "human" and not line.get("double_of"):
        # a quiet breath in before the phrase (ends ~50 ms before the first consonant)
        dur, gap, pad = 0.28, 0.05, 0.40
        y = np.concatenate([np.zeros(int(pad * SR_OUT), np.float32), y])
        start -= pad
        b = inhale(dur, SR_OUT, seed) * np.sqrt(np.mean(y ** 2) * len(y) / max(1, np.count_nonzero(y)))
        i1 = int((pad + t_on - gap) * SR_OUT)
        i0 = i1 - len(b)
        y[max(0, i0):i1] += (b[max(0, -i0):] * 10 ** (-24 / 20)).astype(np.float32)

    timing = {
        "id": line["id"], "speaker": line["speaker"], "section": line["section"],
        "mode": line["mode"], "style": line["style"], "bus": line["bus"],
        "display": bool(line.get("display")), "text": line["text"],
        "start": round(min(s.start for s in sylls) + delay, 4),
        "end": round(max(s.end for s in sylls) + delay, 4),
        "syllables": [{"text": s.text, "start": round(s.start + delay, 4),
                       "end": round(s.end + delay, 4),
                       "vowel": round(s.vowel_start + delay, 4)} for s in sylls],
        "words": [{"text": w["text"], "start": round(w["start"] + delay, 4),
                   "end": round(w["end"] + delay, 4)} for w in plan.words],
    }
    if line.get("double_of"):
        timing["double_of"] = line["double_of"]
    qa = {"frames_t": con.t + delay, "score_midi": con.score_midi + detune / 100.0,
          "vowel": con.vowel & con.voiced, "phonemes": phonemes}
    return LineRender(line["id"], y, start, timing, qa)
