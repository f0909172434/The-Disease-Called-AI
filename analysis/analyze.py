"""Blind audio analysis → visuals/data/timeline.json

The MV is cut to what this script *hears*, not to what the score says. It treats the
mastered song as an unknown file: it estimates the tempo, tracks beats and downbeats,
finds structural boundaries and extracts per-frame energy envelopes. Only afterwards
does it compare its findings with the score's ground truth and report the error.

Story events (keystrokes, retry clicks…) and lyric syllable times come from the score /
vocal renderer, because they are known exactly and are not musical features.

    python3 analysis/analyze.py [--fps 60]
"""
from __future__ import annotations

import argparse
import json
import os

import librosa
import numpy as np
import soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BUILD = os.path.join(ROOT, "music", "build")
STEMS = os.path.join(BUILD, "stems")
OUT = os.path.join(ROOT, "visuals", "data", "timeline.json")
FIG = os.path.join(ROOT, "docs", "analysis.png")
REPORT = os.path.join(ROOT, "analysis", "report.json")

SR = 22050
HOP = 256                      # 11.6 ms analysis hop


def load_mono(path, sr=SR):
    y, file_sr = sf.read(path, dtype="float32", always_2d=True)
    y = y.mean(axis=1)
    if file_sr != sr:
        y = librosa.resample(y, orig_sr=file_sr, target_sr=sr)
    return y


# ----------------------------------------------------------------------------- tempo & beats

def backbeat_beat_period(kick_on, snare_on):
    """Musicological octave rule: in rock/pop the snare marks the backbeat (2 and 4).

    Take the most common interval between snare hits; if kicks sit near the midpoints
    between consecutive snares, the snare interval spans two felt beats.
    Returns (beat_period_seconds, evidence) or (None, evidence).
    """
    sn = np.asarray(snare_on)
    kk = np.asarray(kick_on)
    if len(sn) < 16 or len(kk) < 16:
        return None, {}
    iois = np.diff(sn)
    iois = iois[(iois > 0.2) & (iois < 2.0)]
    hist, edges = np.histogram(iois, bins=np.arange(0.2, 2.0, 0.01))
    mode = float(edges[np.argmax(hist)] + 0.005)
    mids, hits = 0, 0
    for a, b in zip(sn[:-1], sn[1:]):
        if abs((b - a) - mode) < 0.04:
            mids += 1
            m = (a + b) / 2
            hits += np.any(np.abs(kk - m) < 0.15 * mode)
    frac = hits / max(1, mids)
    period = mode / 2 if frac > 0.5 else mode
    return period, {"snare_ioi_mode_s": round(mode, 4), "kick_between_snares": round(float(frac), 3)}


def estimate_tempo(onset_env, loud, backbeat_period=None):
    """Global tempo with an explicit metrical-level (octave) decision.

    Tempo estimates are ambiguous by factors of two, and this song deliberately has
    half-time verses. Strategy: take the strongest tempogram peak in 60–240 BPM, refine
    it with a phase-searched comb, then climb metrical levels: track beats at the slower
    candidate and compare onset strength *between* beats with onset strength *on* beats.
    If the in-between positions are nearly as strong (snares on 2 and 4 of the faster
    grid), the faster level is the felt beat. The test only looks at the loud, full-band
    passages (`loud` frame mask), where the drum groove defines the pulse.
    """
    tg = librosa.feature.tempogram(onset_envelope=onset_env, sr=SR, hop_length=HOP)
    ac = tg.mean(axis=1)
    bpms = librosa.tempo_frequencies(tg.shape[0], sr=SR, hop_length=HOP)
    mask = (bpms >= 60) & (bpms <= 240)
    peak = float(bpms[mask][np.argmax(ac[mask])])

    def refine(center):
        best_bpm, best_val = center, -1.0
        frames = np.arange(len(onset_env))
        for bpm in np.linspace(center * 0.98, center * 1.02, 161):
            period = 60.0 / bpm * SR / HOP
            for phase in np.linspace(0, period, 32, endpoint=False):
                v = np.interp(np.arange(phase, len(onset_env) - 1, period), frames, onset_env).mean()
                if v > best_val:
                    best_bpm, best_val = float(bpm), v
        return best_bpm

    def between_ratio(bpm):
        _, bf = librosa.beat.beat_track(onset_envelope=onset_env, sr=SR, hop_length=HOP,
                                        bpm=bpm, tightness=400, trim=False)
        if len(bf) < 8:
            return 0.0
        mids = ((bf[:-1] + bf[1:]) / 2).astype(int)
        on, mid = bf[:-1][loud[bf[:-1]]], mids[loud[mids]]
        if len(on) < 8 or len(mid) < 8:
            on, mid = bf, mids
        return float(onset_env[mid].mean() / (onset_env[on].mean() + 1e-9))

    level = refine(peak)
    while level / 2 >= 60:          # start from the slowest plausible level
        level /= 2
    ladder = []
    while level * 2 <= 240:
        r = between_ratio(level)
        ladder.append({"bpm": round(level, 3), "between_on_ratio": round(r, 3)})
        if r < 0.6:
            break
        level *= 2
    method = "metrical ladder"
    if backbeat_period:                       # drum stems available: the backbeat decides
        target = 60.0 / backbeat_period
        octaves = [level * f for f in (0.25, 0.5, 1, 2, 4) if 50 <= level * f <= 260]
        level = min(octaves, key=lambda c: abs(np.log2(c / target)))
        method = "backbeat rule (drum stems)"
    level = refine(level)
    return {"tempogram_peak": round(peak, 2), "metrical_ladder": ladder, "octave_method": method,
            "refined": round(level, 3)}, tg, bpms


def snap_to_onsets(beats, onsets, window=0.06):
    """The beat tracker works on a coarse, slightly late detection function. Snap each beat
    to the nearest drum attack within ±60 ms; beats with no drum nearby (breakdowns) get the
    median correction so the grid stays continuous."""
    onsets = np.sort(np.asarray(onsets))
    if len(onsets) == 0:
        return beats, {"snapped": 0}
    out, shifts = beats.copy(), []
    idx = np.searchsorted(onsets, beats)
    matched = np.zeros(len(beats), bool)
    for i, t in enumerate(beats):
        cands = onsets[max(0, idx[i] - 1): idx[i] + 1]
        if len(cands):
            j = np.argmin(np.abs(cands - t))
            if abs(cands[j] - t) <= window:
                out[i] = cands[j]
                shifts.append(cands[j] - t)
                matched[i] = True
    med = float(np.median(shifts)) if shifts else 0.0
    out[~matched] += med
    return out, {"snapped": int(matched.sum()), "of": len(beats), "median_shift_ms": round(med * 1000, 2)}


def downbeat_phase(beat_times, low_env_fn):
    """Which of the 4 beat phases carries the most low-frequency (kick) energy."""
    scores = []
    for ph in range(4):
        sel = beat_times[ph::4]
        scores.append(float(np.mean([low_env_fn(t) for t in sel])) if len(sel) else 0.0)
    return int(np.argmax(scores)), scores


def structure_boundaries(y, n_segments=14):
    """Agglomerative segmentation on beat-synchronous chroma+MFCC (blind)."""
    chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=512)
    mfcc = librosa.feature.mfcc(y=y, sr=SR, hop_length=512, n_mfcc=13)
    feats = np.vstack([librosa.util.normalize(chroma, axis=0), librosa.util.normalize(mfcc, axis=1)])
    bounds = librosa.segment.agglomerative(feats, n_segments)
    return librosa.frames_to_time(bounds, sr=SR, hop_length=512)


# ----------------------------------------------------------------------------- envelopes

def follower(x, fps, attack=0.005, release=0.12):
    """Peak envelope follower: fast attack, smooth release (what the eye wants)."""
    a = np.exp(-1.0 / max(1e-6, attack * fps))
    r = np.exp(-1.0 / max(1e-6, release * fps))
    out = np.zeros_like(x)
    v = 0.0
    for i, s in enumerate(x):
        v = a * v + (1 - a) * s if s > v else r * v + (1 - r) * s
        out[i] = v
    return out


def norm01(x, pct=99.5):
    hi = np.percentile(x, pct)
    return np.clip(x / (hi + 1e-9), 0, 1)


def frame_rms(y, sr, fps, n_frames):
    hop = sr / fps
    out = np.zeros(n_frames, dtype=np.float32)
    win = int(hop * 2)
    for i in range(n_frames):
        c = int(i * hop)
        seg = y[max(0, c - win // 2): c + win // 2]
        out[i] = np.sqrt(np.mean(seg ** 2)) if len(seg) else 0.0
    return out


def band_envelopes(y, fps, n_frames):
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=HOP)) ** 2
    freqs = librosa.fft_frequencies(sr=SR, n_fft=2048)
    t = librosa.frames_to_time(np.arange(S.shape[1]), sr=SR, hop_length=HOP)
    tf = np.arange(n_frames) / fps
    out = {}
    for name, lo, hi in (("low", 20, 150), ("mid", 150, 2500), ("high", 2500, 11000)):
        band = np.sqrt(S[(freqs >= lo) & (freqs < hi)].sum(axis=0))
        out[name] = np.interp(tf, t, band)
    return out


def stem_onsets(path, delta=0.08, backtrack=True):
    if not os.path.exists(path):
        return []
    y = load_mono(path)
    if np.max(np.abs(y)) < 1e-5:
        return []
    env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=128)
    # backtrack: move each detection back to the start of its attack (visual hits must not lag)
    on = librosa.onset.onset_detect(onset_envelope=env, sr=SR, hop_length=128, delta=delta,
                                    backtrack=backtrack,
                                    units="time")
    return [round(float(t), 4) for t in on]


# ----------------------------------------------------------------------------- main

def main():
    global STEMS, OUT, FIG, REPORT
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--master", default=os.path.join(BUILD, "master.wav"))
    ap.add_argument("--stems", default=STEMS)
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--fig", default=FIG)
    ap.add_argument("--report", default=REPORT)
    args = ap.parse_args()
    fps = args.fps
    STEMS, OUT, FIG, REPORT = args.stems, args.out, args.fig, args.report

    arrangement = json.load(open(os.path.join(BUILD, "arrangement.json")))
    vocals = json.load(open(os.path.join(BUILD, "vocals.json")))
    events = json.load(open(os.path.join(BUILD, "events.json")))
    timing_path = os.path.join(BUILD, "vocal_timing.json")
    timing = json.load(open(timing_path)) if os.path.exists(timing_path) else {"lines": []}
    duration = float(arrangement["meta"]["end_time"])
    n_frames = int(round(duration * fps)) + 1
    score_bpm = float(arrangement["meta"]["bpm"])

    print("loading master…")
    y = load_mono(args.master)

    # --- blind tempo / beats --------------------------------------------------------------
    onset_env = librosa.onset.onset_strength(y=y, sr=SR, hop_length=HOP, aggregate=np.median)
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=HOP)[0][:len(onset_env)]
    rms = np.pad(rms, (0, len(onset_env) - len(rms)), mode="edge")
    loud = rms > np.percentile(rms, 60)
    bb_period, bb_evidence = backbeat_beat_period(stem_onsets(os.path.join(STEMS, "kick.wav")),
                                                  stem_onsets(os.path.join(STEMS, "snare.wav")))
    tempo, tg, tg_bpms = estimate_tempo(onset_env, loud, bb_period)
    tempo["backbeat"] = bb_evidence
    bpm = tempo["refined"]
    _, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=SR, hop_length=HOP,
                                             bpm=bpm, tightness=400, trim=False)
    beats = librosa.frames_to_time(beat_frames, sr=SR, hop_length=HOP)
    beats, snap_info = snap_to_onsets(beats, stem_onsets(os.path.join(STEMS, "kick.wav")) +
                                      stem_onsets(os.path.join(STEMS, "snare.wav")))

    S_low = band_envelopes(y, 200, int(duration * 200) + 1)["low"]
    low_fn = lambda t: S_low[min(len(S_low) - 1, int(t * 200))]  # noqa: E731
    phase, phase_scores = downbeat_phase(beats, low_fn)
    downbeats = beats[phase::4]

    # --- compare with the score (ground truth) ---------------------------------------------
    grid_beat = 60.0 / score_bpm
    silence = events.get("silence", [])
    drum_sections = [(s["start"], s["end"]) for s in arrangement["sections"]
                     if s["name"] not in ("INTRO", "OUTRO", "ENDCARD", "BRIDGE")]

    def in_drums(t):
        return any(a <= t < b for a, b in drum_sections) and not any(a <= t < b for a, b in silence)

    errs = [abs(t - round(t / grid_beat) * grid_beat) for t in beats if in_drums(t)]
    beat_mae_ms = float(np.mean(errs) * 1000) if errs else None
    bar_errs = [abs(t - round(t / (4 * grid_beat)) * 4 * grid_beat) for t in downbeats if in_drums(t)]
    downbeat_hit = float(np.mean([e < 0.06 for e in bar_errs])) if bar_errs else None

    print("structure…")
    blind_bounds = structure_boundaries(y)
    score_bounds = [s["start"] for s in arrangement["sections"]][1:]
    bound_err = [float(np.min(np.abs(np.array(blind_bounds) - b))) for b in score_bounds]

    # --- envelopes ---------------------------------------------------------------------------
    print("envelopes…")
    env = {}
    master48, sr48 = sf.read(args.master, dtype="float32", always_2d=True)
    env["rms"] = norm01(follower(frame_rms(master48.mean(axis=1), sr48, fps, n_frames), fps, 0.01, 0.15))
    for name, curve in band_envelopes(y, fps, n_frames).items():
        env[name] = norm01(follower(curve, fps, 0.005, 0.12 if name != "low" else 0.18))
    stem_map = {"kick": "kick.wav", "snare": "snare.wav", "bass": "bass.wav", "hat": "hat.wav",
                "vox_you": "vox_you.wav", "vox_ai": "vox_ai.wav", "vox_spoken": "vox_spoken.wav",
                "musicbox": "musicbox.wav"}
    for name, fn in stem_map.items():
        p = os.path.join(STEMS, fn)
        if os.path.exists(p):
            a, asr = sf.read(p, dtype="float32", always_2d=True)
            rel = {"kick": 0.10, "snare": 0.12, "hat": 0.06}.get(name, 0.15)
            env[name] = norm01(follower(frame_rms(a.mean(axis=1), asr, fps, n_frames), fps, 0.003, rel))
        else:
            env[name] = np.zeros(n_frames)
    if os.path.exists(os.path.join(STEMS, "vox_bg.wav")):  # backing parts feed the singer they double
        a, asr = sf.read(os.path.join(STEMS, "vox_bg.wav"), dtype="float32", always_2d=True)
        bg = norm01(follower(frame_rms(a.mean(axis=1), asr, fps, n_frames), fps, 0.003, 0.15))
        env["vox_you"] = np.maximum(env["vox_you"], 0.6 * bg)

    print("onsets…")
    onsets = {k: stem_onsets(os.path.join(STEMS, f"{k}.wav")) for k in ("kick", "snare", "hat", "musicbox")}

    # --- lyrics (display lines) ----------------------------------------------------------------
    tmap = {ln["id"]: ln for ln in timing.get("lines", [])}
    lyrics = []
    for ln in vocals["lines"]:
        if not ln.get("display"):
            continue
        tm = tmap.get(ln["id"])
        item = {"id": ln["id"], "section": ln["section"], "speaker": ln["speaker"], "mode": ln["mode"],
                "style": ln["style"], "text": ln["text"], "zh": ln["zh"]}
        if tm:
            item.update(start=round(tm["start"], 4), end=round(tm["end"], 4),
                        syllables=[{"text": s["text"], "start": round(s["start"], 4), "end": round(s["end"], 4)}
                                   for s in tm.get("syllables", [])],
                        words=[{"text": w["text"], "start": round(w["start"], 4), "end": round(w["end"], 4)}
                               for w in tm.get("words", [])])
        elif ln["mode"] == "sung":   # fall back to the score
            syl = [{"text": s["text"], "start": round(s["notes"][0]["tb"] * grid_beat, 4),
                    "end": round((s["notes"][-1]["tb"] + s["notes"][-1]["d"]) * grid_beat, 4)}
                   for s in ln["syllables"]]
            item.update(start=syl[0]["start"], end=syl[-1]["end"], syllables=syl)
        else:
            st = ln["tb"] * grid_beat
            item.update(start=round(st, 4), end=round(st + 0.12 * len(ln["text"]), 4), syllables=[])
        lyrics.append(item)
    lyrics.sort(key=lambda x: x["start"])
    onsets["vox_you"] = sorted(s["start"] for L in lyrics if L["speaker"] in ("you", "both") for s in L.get("syllables", []))
    onsets["vox_ai"] = sorted(s["start"] for L in lyrics if L["speaker"] in ("ai", "both") for s in L.get("syllables", []))

    # --- write -----------------------------------------------------------------------------------
    sections = [{"id": s["id"], "name": s["name"], "start": s["start"], "end": s["end"]}
                for s in arrangement["sections"]]
    timeline = {
        "fps": fps, "duration": duration,
        "bpm": {"detected": bpm, "score": score_bpm, "beat_mae_ms": None if beat_mae_ms is None else round(beat_mae_ms, 2),
                "downbeat_hit_rate": downbeat_hit, "tempo_search": tempo},
        "beats": [round(float(t), 4) for t in beats],
        "downbeats": [round(float(t), 4) for t in downbeats],
        "grid": {"beat": grid_beat, "bar": 4 * grid_beat},
        "sections": sections,
        "onsets": onsets,
        "events": events,
        "env": {k: [round(float(v), 3) for v in arr] for k, arr in env.items()},
        "lyrics": lyrics,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(timeline, f, ensure_ascii=False, separators=(",", ":"))
    report = {"tempo": tempo, "detected_bpm": bpm, "score_bpm": score_bpm,
              "bpm_error": round(abs(bpm - score_bpm), 3), "beat_mae_ms": beat_mae_ms,
              "downbeat_phase_scores": phase_scores, "downbeat_hit_rate": downbeat_hit,
              "n_beats": len(beats), "beat_snap": snap_info, "structure_boundary_error_s": dict(zip([s["name"] for s in arrangement["sections"]][1:], [round(e, 3) for e in bound_err])),
              "onset_counts": {k: len(v) for k, v in onsets.items()}}
    with open(REPORT, "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    print(json.dumps({k: report[k] for k in ("detected_bpm", "score_bpm", "beat_mae_ms", "downbeat_hit_rate")}))

    plot(y, onset_env, beats, downbeats, tg, tg_bpms, bpm, arrangement["sections"], blind_bounds, env, fps, duration)


def plot(y, onset_env, beats, downbeats, tg, tg_bpms, bpm, sections, blind_bounds, env, fps, duration):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib import font_manager

    cjk = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
    if os.path.exists(cjk):
        font_manager.fontManager.addfont(cjk)
        plt.rcParams["font.family"] = ["Noto Sans CJK TC", "DejaVu Sans"]

    bg, fg, cyan, amber, mag = "#05060A", "#C9D1D9", "#7FE9FF", "#FFB070", "#FF2E63"
    plt.rcParams.update({"font.size": 9, "text.color": fg, "axes.labelcolor": fg, "xtick.color": fg,
                         "ytick.color": fg, "axes.edgecolor": "#30363d"})
    fig, axes = plt.subplots(5, 1, figsize=(16, 13), sharex=True, facecolor=bg,
                             gridspec_kw={"height_ratios": [1.1, 1.6, 1.0, 1.2, 1.0]})
    for ax in axes:
        ax.set_facecolor(bg)
    block = 256                                    # peak envelope per block, so transients show
    nb = len(y) // block
    peaks = np.abs(y[:nb * block]).reshape(nb, block).max(axis=1)
    t = (np.arange(nb) + 0.5) * block / SR
    axes[0].fill_between(t, peaks, -peaks, color=cyan, lw=0, alpha=0.85)
    for s in sections:
        axes[0].axvline(s["start"], color=amber, lw=0.8, alpha=0.7)
        axes[0].text(s["start"] + 0.5, 0.95 * peaks.max(), s["name"], color=amber, fontsize=7, va="top")
    axes[0].set_ylabel("waveform")
    axes[0].set_title(f"病名為AI — blind analysis   detected tempo {bpm:.2f} BPM   ({len(beats)} beats)",
                      color=fg, fontsize=12, loc="left")
    M = librosa.power_to_db(librosa.feature.melspectrogram(y=y, sr=SR, hop_length=512, n_mels=128), ref=np.max)
    axes[1].imshow(M, aspect="auto", origin="lower", cmap="magma",
                   extent=[0, len(y) / SR, 0, 128], vmin=-80, vmax=0)
    axes[1].set_ylabel("mel spectrogram")
    ot = librosa.frames_to_time(np.arange(len(onset_env)), sr=SR, hop_length=HOP)
    axes[2].plot(ot, onset_env / onset_env.max(), color=cyan, lw=0.4)
    axes[2].vlines(beats, 0, 0.25, color=amber, lw=0.4)
    axes[2].vlines(downbeats, 0, 0.5, color=mag, lw=0.7)
    for b in blind_bounds:
        axes[2].axvline(b, color="#ffffff", lw=0.6, ls=":", alpha=0.6)
    axes[2].set_ylabel("onsets · beats · bars")
    tt = librosa.frames_to_time(np.arange(tg.shape[1]), sr=SR, hop_length=HOP)
    sel = (tg_bpms >= 50) & (tg_bpms <= 260)
    axes[3].pcolormesh(tt, tg_bpms[sel], tg[sel], shading="auto", cmap="mako" if "mako" in plt.colormaps() else "viridis")
    axes[3].axhline(bpm, color=amber, lw=0.8, ls="--")
    axes[3].set_ylabel("tempogram (BPM)")
    tf = np.arange(len(env["rms"])) / fps
    for name, col in (("low", mag), ("mid", amber), ("high", cyan)):
        axes[4].plot(tf, env[name], color=col, lw=0.5, label=name)
    axes[4].legend(loc="upper right", facecolor=bg, edgecolor="#30363d", labelcolor=fg)
    axes[4].set_ylabel("band envelopes")
    axes[4].set_xlabel("seconds")
    axes[4].set_xlim(0, duration)
    fig.tight_layout()
    fig.savefig(FIG, dpi=110, facecolor=bg)
    print("figure →", FIG)


if __name__ == "__main__":
    main()
