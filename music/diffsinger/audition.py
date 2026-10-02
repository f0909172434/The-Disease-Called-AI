#!/usr/bin/env python3
"""
Audition sung lines through the DiffSinger backend and measure them.

    python3 music/diffsinger/audition.py --lines V1_1,C1_2 --mp3 /tmp/him.mp3
    DIFFSINGER_COLOR_HANAMI=nectar python3 music/diffsinger/audition.py --lines PO_1 --mp3 x.mp3

Renders the lines exactly as render_vocals.py --sung-backend diffsinger would (same caches),
writes one MP3 with the lines in order (0.8 s gaps, -21 LUFS, 160 kbit/s) and a metrics
table (Markdown + JSON next to the MP3):

  wer        faster-whisper (medium.en) on the line alone, as in vocal_qa.json
  pitch      median |cents| of the sung vowels vs the score (Harvest), as in vocal_qa.json
  octave     % of vowel frames whose F0 is an octave (900-1500 cents) away from the score
  subharm    % of vowel frames with energy between the harmonics (k+1/2)·F0 within 12 dB of
             the harmonics (cracks, fry, period doubling)
  dropout    % of vowel frames the tracker finds unvoiced, and runs >= 30 ms (n)
  rtf        DiffSinger render seconds per second of audio (when rendered fresh)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VOCAL = os.path.normpath(os.path.join(HERE, "..", "vocal"))
for p in (HERE, VOCAL):
    if p not in sys.path:
        sys.path.insert(0, p)


def crack_metrics(audio48: np.ndarray, start: float, q: dict) -> dict:
    import pyworld as pw
    import soxr
    from scipy.signal import stft
    fs = 24000
    x = soxr.resample(audio48, 48000, fs).astype(np.float64)
    f0, t = pw.harvest(x, fs, f0_floor=60, f0_ceil=1100, frame_period=5.0)
    ft = q["frames_t"]
    vow = q["vowel"] & ~np.isnan(q["score_midi"])
    tt = ft[vow] - start
    keep = (tt >= 0) & (tt < t[-1])
    tt = tt[keep]
    score = q["score_midi"][vow][keep]
    if len(tt) == 0:
        return {}
    idx = np.clip(np.round(tt / 0.005).astype(int), 0, len(f0) - 1)
    fv = f0[idx]
    voiced = fv > 0
    target = 440.0 * 2 ** ((score - 69) / 12)
    cents = np.full(len(fv), np.nan)
    cents[voiced] = 1200 * np.log2(fv[voiced] / target[voiced])
    octave = np.abs(cents) > 900
    # sub-harmonic energy at the score pitch
    nper = 2048
    _, st, Z = stft(x, fs, nperseg=nper, noverlap=nper - 120, boundary="even")
    A = np.abs(Z)
    fbin = fs / nper
    sub = np.zeros(len(tt), bool)
    for i, (ti, f) in enumerate(zip(tt, target)):
        j = min(A.shape[1] - 1, int(round(ti / 0.005)))
        h = [A[min(A.shape[0] - 1, int(round(k * f / fbin))), j] for k in range(1, 6)]
        s = [A[min(A.shape[0] - 1, int(round((k + 0.5) * f / fbin))), j] for k in range(1, 5)]
        if np.mean(h) > 1e-6:
            sub[i] = 20 * np.log10(np.mean(s) / np.mean(h) + 1e-9) > -12.0
    # dropout runs
    runs, cur = 0, 0
    for v in voiced:
        cur = cur + 1 if not v else 0
        if cur == 6:                                   # 6 frames = 30 ms
            runs += 1
    return {"octave_pct": round(100 * float(octave.mean()), 2),
            "subharm_pct": round(100 * float(sub.mean()), 2),
            "dropout_pct": round(100 * float((~voiced).mean()), 2), "dropout_runs": runs,
            "frames": int(len(tt))}


def lufs_normalize(x: np.ndarray, sr: int, target: float = -21.0) -> np.ndarray:
    import pyloudnorm as pyln
    meter = pyln.Meter(sr)
    loud = meter.integrated_loudness(x)
    y = x * 10 ** ((target - loud) / 20)
    peak = np.abs(y).max()
    return y / peak * 0.98 if peak > 0.98 else y


def write_mp3(path: str, x: np.ndarray, sr: int = 48000) -> None:
    import soundfile as sf
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        sf.write(tmp.name, x.astype(np.float32), sr, subtype="FLOAT")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame",
                        "-b:a", "160k", path], check=True)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--lines", required=True)
    ap.add_argument("--mp3", required=True)
    ap.add_argument("--title", default="")
    ap.add_argument("--qa-model", default="medium.en")
    ap.add_argument("--no-wer", action="store_true")
    ap.add_argument("--cache-dir", help="render cache (default music/build/cache)")
    a = ap.parse_args(argv)
    import cache
    if a.cache_dir:
        cache.CACHE_DIR = a.cache_dir
    import diffsinger_backend as dsb
    import qa
    import soxr
    with open(os.path.join(VOCAL, "..", "build", "vocals.json")) as fh:
        vocals = json.load(fh)
    L = {l["id"]: l for l in vocals["lines"]}
    lines = [L[i] for i in a.lines.split(",")]
    t = time.time()
    st = dsb.prepare(lines, vocals["voices"])
    t_ds = time.time() - t
    rows, chunks = [], []
    gap = np.zeros(int(0.8 * 48000), np.float32)
    for line in lines:
        r = dsb.render_sung(line, vocals["voices"])
        row = {"id": line["id"], "voice": line["voice"], "style": line["style"],
               "banks": " + ".join(f"{b} {w:.2f}" for b, w in dsb.bank_weights(vocals["voices"][line["voice"]]["blend"])),
               "text": line["text"]}
        if not a.no_wer:
            hyp = qa.transcribe(soxr.resample(r.audio, 48000, 16000), a.qa_model)
            row["transcript"], row["wer"] = hyp, round(qa.wer(line["text"], hyp), 3)
        x24 = soxr.resample(r.audio, 48000, 24000)
        err, n = qa.pitch_error_cents(x24, 24000, r.start, r.qa["frames_t"], r.qa["score_midi"], r.qa["vowel"])
        row["pitch_cents"] = None if np.isnan(err) else round(float(err), 1)
        row["timing_ms"] = qa.timing_offset_ms(r.audio, 48000, r.start, r.timing)
        row.update(crack_metrics(r.audio, r.start, r.qa))
        rows.append(row)
        chunks += [r.audio, gap]
    mix = lufs_normalize(np.concatenate(chunks[:-1]).astype(np.float64), 48000)
    os.makedirs(os.path.dirname(os.path.abspath(a.mp3)), exist_ok=True)
    write_mp3(a.mp3, mix)
    meta = {"title": a.title, "diffsinger_stage": st, "diffsinger_seconds": round(t_ds, 1),
            "config": dsb.config().__dict__,
            "colors": {k: os.environ.get(f"DIFFSINGER_COLOR_{k.upper()}") for k in ("hanami", "tiger")}}
    if st.get("audio_seconds"):
        meta["rtf"] = round(t_ds / st["audio_seconds"], 2)
    base = os.path.splitext(a.mp3)[0]
    with open(base + ".json", "w") as fh:
        json.dump({"meta": meta, "lines": rows}, fh, ensure_ascii=False, indent=1)
    cols = ["id", "voice", "style", "banks", "wer", "pitch_cents", "octave_pct", "subharm_pct",
            "dropout_pct", "dropout_runs", "timing_ms", "transcript"]
    md = [f"### {a.title or os.path.basename(a.mp3)}", "",
          f"DiffSinger stage: {st}, {t_ds:.1f} s" + (f", RTF {meta['rtf']}" if "rtf" in meta else ""), "",
          "| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    for r in rows:
        md.append("| " + " | ".join(str(r.get(c, "")) for c in cols) + " |")
    with open(base + ".md", "w") as fh:
        fh.write("\n".join(md) + "\n")
    print("\n".join(md))


if __name__ == "__main__":
    main()
