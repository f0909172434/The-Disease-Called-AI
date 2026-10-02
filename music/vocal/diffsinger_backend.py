"""
DiffSinger backend for sung lines:  render_vocals.py --sung-backend diffsinger
(or VOCAL_SUNG_BACKEND=diffsinger). Spoken and whispered lines stay on Kokoro.

    voices   the Kokoro blend of each voice is read as a her/him mix (af_* = her, am_*/bm_* =
             him): her = Hoshino Hanami (Lotte V), him = TIGER (tigermeat). you / ai_him ->
             TIGER, ai_0 -> Hanami, ai_1 / ai_2 -> both, blended 15 % / 50 % him in WORLD.
    pass 1   timing: the primary bank's own duration model places the consonants (OpenUtau's
             DiffSinger phonemizer, vowel = note start) — or, with VOCAL_DS_TIMING=ours, the
             planner's rules. The plan (planner.SungPlan) is rebuilt from those phoneme times,
             so vocal_timing.json reports where the consonants and vowels really are.
    contour  contour.design() on that plan, per style (human expression / AI hard-tune /
             choir), detune and doubles exactly as for Kokoro; given to DiffSinger as the
             PITD curve (VOCAL_DS_PITCH=bank lets the bank's pitch model sing instead).
    pass 2   the primary bank renders every line (one ourender batch, sharded over
             VOCAL_DS_PROCS processes); pass 3: the secondary bank of a her->him line sings
             the same phonemes on the primary's phoneme timeline and pitch (an octave down
             when the line lies above the bank's range — only its envelope is used).
    styling  human lead/doubles: DiffSinger's audio as it is (its breath and vibrato are the
             point). AI, AI-as-him, choir and every blended line: WORLD analysis driven by the
             F0 the model was given, envelope/aperiodicity blended her->him (log-envelope
             interpolation after aligning formant scales by the blend weight), then
             singer.world_render (hard-tune contour, +3 % formants, vocoder layer, choir).
             Gates, levels, inhale, timing entry and QA data: singer.finish_sung.

Caches (music/build/cache/): ds_<line> = the DiffSinger stage (keyed by the line, its
banks' fingerprints, the renderer build and these sources); dsline_<line> = the finished
line (adds the WORLD/styling sources). OpenUtau's tensor cache (music/diffsinger/oudata)
makes a re-render of the same input bit-identical (the diffusion sampler is otherwise random).
"""
from __future__ import annotations

import concurrent.futures as cf
import os
import shutil
import sys
import tempfile
from dataclasses import asdict, dataclass

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DS_DIR = os.path.normpath(os.path.join(HERE, "..", "diffsinger"))
BUILD = os.path.normpath(os.path.join(HERE, "..", "build"))
for p in (HERE, DS_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

import banks as bk  # noqa: E402  (music/diffsinger)
import cache  # noqa: E402
import contour as ct  # noqa: E402
import phonemes as phm  # noqa: E402  (music/diffsinger)
import planner as pl  # noqa: E402
import runner  # noqa: E402  (music/diffsinger)
import score_to_ustx as su  # noqa: E402  (music/diffsinger)
import world_voice as wv  # noqa: E402
from phonology import kind  # noqa: E402
from styles import sung_style  # noqa: E402

DS_SOURCES = ["diffsinger_backend.py", "contour.py", "planner.py", "phonology.py", "styles.py",
              "../diffsinger/phonemes.py", "../diffsinger/score_to_ustx.py",
              "../diffsinger/banks.py", "../diffsinger/runner.py"]
LINE_SOURCES = DS_SOURCES + ["singer.py", "world_voice.py", "lineaudio.py"]
DS_VERSION = 1
FAMILY_BANK = {"her": os.environ.get("DIFFSINGER_HER", "hanami"),
               "him": os.environ.get("DIFFSINGER_HIM", "tiger")}


@dataclass(frozen=True)
class Config:
    timing: str = "bank"        # bank (duration model) | ours (planner rules)
    pitch: str = "score"        # score (our contour as PITD) | bank (pitch model)
    steps: int = 20             # diffusion steps (OpenUtau's "DiffSinger render speedup")
    warp: bool = True           # align formant scales before blending her->him
    procs: int = 2              # parallel ourender processes


def config() -> Config:
    e = os.environ.get
    return Config(timing=e("VOCAL_DS_TIMING", "bank"), pitch=e("VOCAL_DS_PITCH", "score"),
                  steps=int(e("VOCAL_DS_STEPS", "20")), warp=e("VOCAL_DS_WARP", "1") != "0",
                  procs=max(1, int(e("VOCAL_DS_PROCS", "2"))))


# ----------------------------------------------------------------------------- voices -> banks

def bank_weights(blend: dict[str, float]) -> list[tuple[str, float]]:
    """Kokoro blend -> [(bank key, weight)], primary (heaviest) first. Kokoro voice names
    are <lang><gender>_<name>: af_heart = her, am_michael / bm_george = him."""
    tot = sum(blend.values()) or 1.0
    him = sum(w for k, w in blend.items() if len(k) > 1 and k[1] == "m") / tot
    out = [(FAMILY_BANK["her"], 1.0 - him), (FAMILY_BANK["him"], him)]
    out = [(b, round(w, 4)) for b, w in out if w > 1e-3]
    return sorted(out, key=lambda x: -x[1])


def source_line(line: dict) -> dict:
    """What is actually sung: a human double is a second take (jittered landings)."""
    from singer import jitter_line, stable_seed
    if line.get("double_of") and line["style"] == "human":
        return jitter_line(line, stable_seed(line["id"]))
    return line


def ds_key(line: dict, voices: dict, cfg: Config) -> str:
    weights = bank_weights(voices[line["voice"]]["blend"])
    fps = [bk.find(b).fingerprint() for b, _ in weights]
    style = sung_style(line)
    return cache.key("ds", source_line(line), weights, asdict(cfg), DS_VERSION, fps,
                     runner.build_id(), style.timing, style.expr, line.get("detune_cents"),
                     sources=DS_SOURCES)


def line_key(line: dict, voices: dict) -> str:
    cfg = config()
    return cache.key("dsline", line, voices[line["voice"]], ds_key(line, voices, cfg),
                     sources=LINE_SOURCES)


def check_ready(lines: list[dict], voices: dict) -> list[str]:
    """Problems that stop the backend (missing build / banks), as messages."""
    probs = []
    if not runner.available():
        probs.append(f"ourender is not built ({runner.BIN}): run music/diffsinger/setup.sh")
    need = {b for l in lines for b, _ in bank_weights(voices[l["voice"]]["blend"])}
    for b in sorted(need):
        try:
            bk.find(b)
        except FileNotFoundError as e:
            probs.append(str(e))
    return probs


# ----------------------------------------------------------------------------- plan from times

def plan_from_times(line: dict, lp: phm.LinePhonemes, times: dict[int, list[tuple[float, float]]],
                    st: pl.TimingStyle) -> pl.SungPlan:
    """A planner.SungPlan whose phones sit where DiffSinger sang them: every misaki character
    of the line takes the time of the ARPAbet phoneme it became (stress / length marks and
    the 'ɹ' of an r-coloured vowel are zero-length at its edges); spaces and pauses fill the
    gaps. Syllable/word times then follow exactly as in planner.plan_sung."""
    ps = lp.ps
    phones = [pl.Phone("<", "bos", "edge")]
    for c in ps:
        phones.append(pl.Phone(c, kind(c), "gap"))      # word characters get roles below
    phones.append(pl.Phone(">", "eos", "edge"))
    for sl in lp.slots:
        for role, idx in (("onset", sl.onset), ("nucleus", sl.nucleus), ("coda", sl.coda)):
            for i in idx:
                phones[i + 1].role, phones[i + 1].syl, phones[i + 1].word = role, sl.syl, sl.word
    span: dict[int, tuple[float, float]] = {}
    for s in lp.syllables:
        for ph, (a, b) in zip(s.phones, times.get(s.index, [])):
            main = next((i for i in ph.src if ps[i] not in phm.SKIP), ph.src[0] if ph.src else None)
            for i in ph.src:
                span[i] = (a, a) if i < main else (a, b) if i == main else (b, b)
    # lay out in order; characters without a phoneme (dropped vowels) and gaps fill in
    known = sorted(span)
    first_t = min(a for a, _ in span.values())
    t = first_t
    for i, c in enumerate(ps):
        p = phones[i + 1]
        if i in span:
            p.start, p.end = span[i]
        else:
            nxt = next((span[j][0] for j in known if j > i), None)
            p.start = t
            p.end = max(t, nxt) if (p.role == "gap" and nxt is not None) else t
        p.start = max(p.start, t)
        p.end = max(p.end, p.start)
        t = p.end
    t0 = first_t - st.pre_pad
    phones[0].start, phones[0].end = t0, first_t
    t_last = phones[-2].end if len(phones) > 2 else first_t
    phones[-1].start, phones[-1].end = t_last, t_last + st.post_pad

    sylls = []
    for sl in lp.slots:
        s = line["syllables"][sl.syl]
        notes = [pl.Note(pl.tb2s(n["tb"]), pl.tb2s(n["tb"] + n["d"]), float(n["p"])) for n in s["notes"]]
        sy = pl.Syllable(sl.syl, s["text"], sl.word, notes, shares_prev=sl.shares_prev,
                         onset=[i + 1 for i in sl.onset], nucleus=[i + 1 for i in sl.nucleus],
                         coda=[i + 1 for i in sl.coda])
        ids = sy.onset + sy.nucleus + sy.coda
        timed = [phones[i] for i in ids if (i - 1) in span]
        if timed and not sl.shares_prev:
            sy.start, sy.end = min(p.start for p in timed), max(p.end for p in timed)
            nuc = [phones[i] for i in sy.nucleus if (i - 1) in span and phones[i].sym in pl.VOWELS]
            sy.vowel_start = nuc[0].start if nuc else notes[0].start
            cod = [phones[i] for i in sy.coda if (i - 1) in span]
            sy.vowel_end = cod[0].start if cod else (nuc[-1].end if nuc else sy.end)
        else:
            sy.start = sy.vowel_start = notes[0].start
            sy.end = sy.vowel_end = notes[-1].end
        sylls.append(sy)
    sylls.sort(key=lambda s: s.notes[0].start)
    for k, s in enumerate(sylls):            # melisma-shared syllables split the held vowel
        if s.shares_prev and k > 0:
            prev = sylls[k - 1]
            s.start, s.end = s.notes[0].start, max(prev.end, s.notes[0].start)
            s.vowel_start, s.vowel_end = s.notes[0].start, max(prev.vowel_end, s.notes[0].start)
            prev.end = prev.vowel_end = s.start
    words = []
    for wi, w in enumerate(line["words"]):
        ss = [s for s in sylls if s.word == wi]
        words.append({"text": w["text"], "syl": w["syl"], "start": min(s.start for s in ss),
                      "end": max(s.end for s in ss)})
    return pl.SungPlan(line["id"], ps, phones, sorted(sylls, key=lambda s: s.index), words,
                       t0=t0, t_end=phones[-1].end)


def times_from_render(part: su.PartSpec, info: dict, lp: phm.LinePhonemes, bank: bk.Bank,
                      timed: bool) -> dict[int, list[tuple[float, float]]]:
    """Map ourender's phoneme list (in order) back onto our syllables' phonemes."""
    got = info["phonemes"]
    exp = [(s, bank.map_phoneme(p.arpa, timed=timed)) for s in lp.syllables if not s.shares_prev
           for p in s.phones]
    out: dict[int, list[tuple[float, float]]] = {s.index: [] for s in lp.syllables}
    gi = 0
    for s, sym in exp:
        # skip phonemes we did not ask for as a syllable's own (a vowel re-sung after a rest)
        while gi < len(got) and got[gi]["phoneme"] != sym and len(got) - gi > len(exp) - sum(map(len, out.values())):
            gi += 1
        if gi >= len(got) or got[gi]["phoneme"] != sym:
            raise RuntimeError(f"{part.name}: rendered phonemes differ from the hints: "
                               f"{[g['phoneme'] for g in got]} vs {[e[1] for e in exp]}")
        out[s.index].append((got[gi]["start_ms"] / 1000.0, got[gi]["end_ms"] / 1000.0))
        gi += 1
    return out


# ----------------------------------------------------------------------------- batch stage

def _shard(parts: list[su.PartSpec], n: int) -> list[list[su.PartSpec]]:
    """Balance parts over n processes by length."""
    bins = [[] for _ in range(max(1, min(n, len(parts))))]
    load = [0] * len(bins)
    for p in sorted(parts, key=lambda p: -(p.end - p.position)):
        i = int(np.argmin(load))
        bins[i].append(p)
        load[i] += p.end - p.position
    return [b for b in bins if b]


def _run_batch(command: str, tracks, parts, work: str, tag: str, cfg: Config, pitch="ustx",
               log=print) -> dict[str, dict]:
    """Write the parts as one ustx per process, run ourender, return {part name: info}."""
    shards = _shard(parts, cfg.procs)
    jobs = []
    for k, ps in enumerate(shards):
        proj = su.write_ustx(os.path.join(work, f"{tag}_{k}.ustx"), tracks, ps, name=tag)
        jobs.append((proj, os.path.join(work, f"{tag}_{k}"), ps))
    with cf.ThreadPoolExecutor(len(jobs)) as ex:
        futs = [ex.submit(runner.run, command, proj, out, pitch=pitch, steps=cfg.steps, log=log)
                for proj, out, _ in jobs]
        summaries = [f.result() for f in futs]
    out = {}
    for (proj, d, ps), _ in zip(jobs, summaries):
        for p in ps:
            out[p.name] = runner.load_part(d, p.name, audio=command == "render")
    return out


def prepare(lines: list[dict], voices: dict, log=print) -> dict:
    """Run the DiffSinger stage for every sung line whose cache entry is missing (batched)."""
    cfg = config()
    lines = [l for l in lines if l["mode"] == "sung"]
    todo = []
    for line in lines:
        k = ds_key(line, voices, cfg)
        if cache.load("ds", line["id"], k) is None:
            todo.append((line, k))
    stats = {"lines": len(lines), "rendered": len(todo)}
    if not todo:
        return stats
    probs = check_ready([l for l, _ in todo], voices)
    if probs:
        raise RuntimeError("DiffSinger backend not ready:\n  " + "\n  ".join(probs))
    os.makedirs(os.path.join(BUILD, "tmp"), exist_ok=True)
    work = tempfile.mkdtemp(prefix="diffsinger_", dir=os.path.join(BUILD, "tmp"))
    try:
        stats.update(_prepare(todo, voices, cfg, work, log))
    finally:
        if not os.environ.get("VOCAL_DS_KEEP"):
            shutil.rmtree(work, ignore_errors=True)
        else:
            log(f"kept DiffSinger work dir {work}")
    return stats


def _prepare(todo, voices, cfg: Config, work: str, log) -> dict:
    from singer import stable_seed
    jobs = []
    banks: dict[str, bk.Bank] = {}
    for line, key in todo:
        src = source_line(line)
        style = sung_style(line)
        weights = bank_weights(voices[line["voice"]]["blend"])
        for b, _ in weights:
            banks.setdefault(b, bk.find(b))
        jobs.append({"line": line, "src": src, "key": key, "style": style, "weights": weights,
                     "seed": stable_seed(line["id"]), "lp": phm.line_phonemes(src, style.timing)})
    timed = cfg.timing == "ours"
    prim_tracks, prim_index = [], {}
    for b in sorted({j["weights"][0][0] for j in jobs}):
        prim_index[b] = len(prim_tracks)
        prim_tracks.append(su.track_for(banks[b], timed))

    # ---- pass 1: where the phonemes go
    if timed:
        for j in jobs:
            j["times"] = su.ours_times(j["src"], j["lp"], j["style"].timing)
    else:
        parts = []
        for j in jobs:
            b = j["weights"][0][0]
            j["part1"] = su.part_for_line(j["src"], j["lp"], banks[b], prim_index[b],
                                          name=f"{j['line']['id']}__{b}")
            parts.append(j["part1"])
        infos = _run_batch("phonemize", prim_tracks, parts, work, "timing", cfg, log=log)
        for j in jobs:
            b = j["weights"][0][0]
            j["times"] = times_from_render(j["part1"], infos[j["part1"].name], j["lp"], banks[b], False)

    # ---- plan + contour
    for j in jobs:
        j["plan"] = plan_from_times(j["src"], j["lp"], j["times"], j["style"].timing)
        j["con"] = ct.design(j["plan"], j["style"].expr, j["seed"],
                             detune_cents=float(j["line"].get("detune_cents") or 0.0))

    # ---- pass 2: primary banks
    parts = []
    for j in jobs:
        b = j["weights"][0][0]
        contour = (j["con"].t, j["con"].target_midi) if cfg.pitch == "score" else None
        j["part2"] = su.part_for_line(j["src"], j["lp"], banks[b], prim_index[b],
                                      times=j["times"] if timed else None, contour=contour,
                                      name=f"{j['line']['id']}__{b}")
        parts.append(j["part2"])
    infos = _run_batch("render", prim_tracks, parts, work, "primary", cfg,
                       pitch="bank" if cfg.pitch == "bank" else "ustx", log=log)
    audio_s = 0.0
    for j in jobs:
        info = infos[j["part2"].name]
        b = j["weights"][0][0]
        t2 = times_from_render(j["part2"], info, j["lp"], banks[b], timed)
        drift = max((abs(a[0] - c[0]) for k in t2 for a, c in zip(t2[k], j["times"].get(k, []))), default=0.0)
        if drift > 0.002:                      # cannot happen unless the phonemizer changed
            log(f"warning: {j['line']['id']}: render timing moved {drift * 1000:.1f} ms; using it")
            j["times"] = t2
            j["plan"] = plan_from_times(j["src"], j["lp"], t2, j["style"].timing)
        j["renders"] = [_render_entry(b, j["weights"][0][1], info, 0)]
        audio_s += len(info["audio"]) / runner.SR

    # ---- pass 3: secondary banks of blended lines, on the primary's timeline and pitch
    sec = [j for j in jobs if len(j["weights"]) > 1]
    if sec:
        sec_tracks, sec_index, parts = [], {}, []
        for j in sec:
            b2 = j["weights"][1][0]
            if b2 not in sec_index:
                sec_index[b2] = len(sec_tracks)
                sec_tracks.append(su.track_for(banks[b2], True))
            r0 = j["renders"][0]
            j["transpose2"] = _range_shift(j["src"], banks[b2])
            j["part3"] = su.part_for_line(j["src"], j["lp"], banks[b2], sec_index[b2], times=j["times"],
                                          contour=(r0["f0_t"], r0["f0_midi"]),
                                          transpose=j["transpose2"], name=f"{j['line']['id']}__{b2}")
            parts.append(j["part3"])
        infos = _run_batch("render", sec_tracks, parts, work, "secondary", cfg, log=log)
        for j in sec:
            b2, w2 = j["weights"][1]
            info = infos[j["part3"].name]
            j["renders"].append(_render_entry(b2, w2, info, j["transpose2"]))
            audio_s += len(info["audio"]) / runner.SR

    for j in jobs:
        entry = {"plan": j["plan"], "con": j["con"], "ps": j["lp"].ps, "renders": j["renders"],
                 "phonemes": " ".join(f"[{' '.join(p.arpa for p in s.phones)}]" for s in j["lp"].syllables)}
        cache.save("ds", j["line"]["id"], j["key"], entry)
    return {"audio_seconds": round(audio_s, 1)}


def _render_entry(bank: str, weight: float, info: dict, transpose: int) -> dict:
    t, m = runner.f0_curve(info)
    return {"bank": bank, "weight": weight, "audio": info["audio"].astype(np.float32),
            "start": info["start_ms"] / 1000.0, "f0_t": t, "f0_midi": m, "transpose": transpose}


def _range_shift(line: dict, bank: bk.Bank) -> int:
    """Octaves to move a line into a bank's range when it only lends its envelope."""
    ps = [n["p"] for s in line["syllables"] for n in s["notes"]]
    med = float(np.median(ps))
    lo, hi = bank.profile.range_midi
    shift = 0
    while med + shift > hi and shift > -24:
        shift -= 12
    while med + shift < lo and shift < 24:
        shift += 12
    return shift


# ----------------------------------------------------------------------------- WORLD blend

def formant_ratio(sp_a: np.ndarray, sp_b: np.ndarray, lo: float = 250.0, hi: float = 5000.0) -> float:
    """r such that envelope A(f) ~ B(f / r) (A's formants r times higher), from the mean
    log envelopes with the spectral tilt removed; searched over 0.9..1.35."""
    from scipy.ndimage import uniform_filter1d
    f = wv.freq_axis(sp_a)
    df = f[1] - f[0]

    def shape(sp):
        L = np.mean(np.log(sp + 1e-12), axis=0)
        return L - uniform_filter1d(L, max(3, int(900.0 / df)))

    A, B = shape(sp_a), shape(sp_b)
    band = (f > lo) & (f < hi)
    best, best_r = -2.0, 1.0
    for r in np.linspace(0.9, 1.35, 46):
        Bw = np.interp(f / r, f, B)
        c = np.corrcoef(A[band], Bw[band])[0, 1]
        if c > best:
            best, best_r = c, float(r)
    return best_r


def blend_envelopes(sp_a, ap_a, sp_b, ap_b, w: float, voiced: np.ndarray | None = None,
                    warp: bool = True) -> tuple[np.ndarray, np.ndarray, float]:
    """Morph A (weight 1-w) toward B (weight w): formant scales aligned to the blend point
    (A warped by r^-w, B by r^(1-w)), log envelopes and aperiodicities interpolated."""
    n = min(len(sp_a), len(sp_b))
    sp_a, ap_a, sp_b, ap_b = sp_a[:n], ap_a[:n], sp_b[:n], ap_b[:n]
    r = 1.0
    if warp:
        v = voiced[:n] if voiced is not None and voiced[:n].any() else slice(None)
        r = formant_ratio(sp_a[v], sp_b[v])
        sp_a = wv.formant_warp(sp_a, r ** (-w))
        sp_b = wv.formant_warp(sp_b, r ** (1.0 - w))
    sp = np.exp((1.0 - w) * np.log(sp_a + 1e-16) + w * np.log(sp_b + 1e-16))
    ap = np.clip((1.0 - w) * ap_a + w * ap_b, 0.0, 1.0)
    return sp, ap, r


def _segment(r: dict, t0: float, t1: float, sr: int) -> np.ndarray:
    """The render's audio over song time [t0, t1) at `sr`."""
    import soxr
    x = r["audio"]
    i0 = int(round((t0 - r["start"]) * runner.SR))
    i1 = int(round((t1 - r["start"]) * runner.SR))
    y = np.zeros(i1 - i0, np.float32)
    a, b = max(0, i0), min(len(x), i1)
    if b > a:
        y[a - i0:b - i0] = x[a:b]
    return y if sr == runner.SR else soxr.resample(y, runner.SR, sr, quality="VHQ").astype(np.float32)


def render_sung(line: dict, voices: dict) -> "LineRender":
    from lineaudio import add_air, to48k
    from singer import finish_sung, stable_seed, world_render
    cfg = config()
    key = ds_key(line, voices, cfg)
    e = cache.load("ds", line["id"], key)
    if e is None:                                   # not prepared in batch: do this one now
        prepare([line], voices)
        e = cache.load("ds", line["id"], key)
        if e is None:
            raise RuntimeError(f"{line['id']}: DiffSinger stage produced nothing (cache disabled?)")
    style = sung_style(line)
    seed = stable_seed(line["id"])
    detune = float(line.get("detune_cents") or 0.0)
    plan, con, renders = e["plan"], e["con"], e["renders"]
    t0, t1 = plan.t0, plan.t0 + (len(con.t) - 1) * ct.FP + ct.FP
    world = line["style"] != "human" or style.choir_voices > 1 or len(renders) > 1
    if not world:
        y = _segment(renders[0], t0, t1, 48000)
    else:
        analyses = []
        for r in renders:
            x = _segment(r, t0, t1, wv.FS)
            f0_m = np.interp(con.t, r["f0_t"], r["f0_midi"])      # what the model was told
            f0 = np.where(con.voiced, ct.midi_to_hz(f0_m), 0.0)
            _, sp, ap = wv.analyze(x, f0)
            analyses.append((sp, ap))
        sp, ap = analyses[0]
        if len(analyses) > 1:
            n = sp.shape[0]
            sp, ap, _ = blend_envelopes(sp, ap, *analyses[1], renders[1]["weight"],
                                        voiced=wv.fit(con.voiced.astype(float), n) > 0.5, warp=cfg.warp)
        y = add_air(to48k(world_render(sp, ap, con, plan, style, seed, detune)), seed=seed)
    return finish_sung(line, y, plan, con, style, seed, e["phonemes"])
