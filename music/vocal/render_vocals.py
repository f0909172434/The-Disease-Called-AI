#!/usr/bin/env python3
"""
病名為AI / The Disease Called AI — vocal engine.

    python3 music/vocal/render_vocals.py            # everything: stems, timing, QA, plots
    python3 music/vocal/render_vocals.py --lines V1_1,C1_3 --no-stems   # audition lines

Reads music/build/vocals.json (compiled from music/score/song.py) and writes
    music/build/stems/vox_{you,ai,bg,spoken}.wav   48 kHz stereo 24-bit, 215.000 s, dry
    music/build/vocal_timing.json                  per line / syllable / word times
    music/build/vocal_qa.json                      Whisper WER + pitch accuracy per line
    music/build/qa_vocal/*.png                     spectrogram + F0 diagnostics

Method (details in each module):
  1. phonology/planner  misaki G2P per word (+ sung pronunciation overrides), onset-maximal
                        syllabification matched to the score's syllables, and a time map:
                        vowels land on the beat, onsets anticipate it, codas sit at the end
                        of the note, consonants keep Kokoro's natural lengths (compressed
                        when notes are short).
  2. kokoro_backend     Kokoro-82M sings that map directly: score durations through a
                        fractional alignment matrix, a designed energy curve, and the melody
                        as the F0 that drives its neural source-filter decoder — squeezed
                        into the voice's clean range (the decoder breaks above ~D4/G3).
  3. world_voice        WORLD re-synthesis puts the exact target contour back (formant-
                        preserving transpose) and styles the timbre: breath, +3 % formants,
                        brightness, vocoder layer, choir spread, whisper.
  4. speaker            spoken lines keep Kokoro's natural prosody, start on `tb`, F0 shaped
                        per style (calm AI, trembling panic), cut with a glitch at `cut_tb`.
  5. stems / qa         buses, pans, levels; faster-whisper WER and Harvest pitch error.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import multiprocessing as mp
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
BUILD = os.path.normpath(os.path.join(HERE, "..", "build"))
VOCALS_JSON = os.path.join(BUILD, "vocals.json")

ENGINE_SOURCES = ["kokoro_backend.py", "phonology.py", "planner.py", "contour.py",
                  "dynamics.py", "styles.py", "singer.py", "speaker.py", "world_voice.py",
                  "lineaudio.py"]
PLOT_LINES = ["V1_1", "C1_3", "P1_3", "B_L1", "B_YES_h3", "F_5", "T_4", "PO_1", "E5_THERE",
              "IN_YOU", "B_AI3", "C2_5_ai"]


# ----------------------------------------------------------------------------- workers

def _worker_init():
    os.environ["OMP_NUM_THREADS"] = "1"
    import torch
    torch.set_num_threads(1)


def render_line(job):
    """Render one line (cached on its inputs + the engine source)."""
    line, voices = job
    import cache
    k = cache.key("line", line, voices[line["voice"]], sources=ENGINE_SOURCES)
    hit = cache.load("line", line["id"], k)
    if hit is not None:
        return hit, 0.0
    t = time.time()
    if line["mode"] == "sung":
        from singer import render_sung
        r = render_sung(line, voices)
    else:
        from speaker import render_spoken
        r = render_spoken(line, voices)
    cache.save("line", line["id"], k, r)
    return r, time.time() - t


# ----------------------------------------------------------------------------- QA

def is_exempt(line: dict) -> bool:
    """Short chops ('always — always —') are on screen; Whisper WER is not meaningful."""
    words = {w["text"].lower() for w in line.get("words", [])} or set(line["text"].lower().split())
    return words <= {"always", "always —", "—"}


def run_qa(renders, lines, model: str, plots: list[str], qa_dir: str) -> dict:
    import cache
    import qa
    import soxr
    os.makedirs(qa_dir, exist_ok=True)
    out, timbre = [], {}
    for r in renders:
        line = lines[r.id]
        k = cache.key("qa", hashlib.sha1(r.audio.tobytes()).hexdigest(), round(r.start, 4), model,
                      line["text"], sources=["qa.py"])
        hit = cache.load("qa", r.id, k)
        if hit is None:
            x16 = soxr.resample(r.audio, 48000, 16000)
            hyp = qa.transcribe(x16, model)
            row = {"id": r.id, "mode": line["mode"], "style": line["style"], "bus": line["bus"],
                   "display": bool(line.get("display")), "double_of": line.get("double_of"),
                   "text": line["text"], "transcript": hyp, "wer": round(qa.wer(line["text"], hyp), 3),
                   "exempt": is_exempt(line)}
            if line["mode"] == "sung":
                x24 = soxr.resample(r.audio, 48000, 24000)
                err, n = qa.pitch_error_cents(x24, 24000, r.start, r.qa["frames_t"],
                                              r.qa["score_midi"], r.qa["vowel"])
                row["pitch_err_cents"] = None if np.isnan(err) else round(err, 1)
                row["pitch_frames"] = n
                row["pitch_target_cents"] = 15.0 if line["style"] in ("ai", "ai_him") else 35.0
                row["timing_offset_ms"] = qa.timing_offset_ms(r.audio, 48000, r.start, r.timing)
            cache.save("qa", r.id, k, row)
            hit = row
        out.append(hit)
        if line["mode"] == "sung" and not line.get("double_of") or line["id"].endswith("_ai"):
            timbre.setdefault(line["voice"], []).append(qa.timbre_vector(r.audio, 48000))
        if r.id in plots:
            qa.plot_line(r.audio, 48000, r.start, r.timing, r.qa,
                         f"{r.id} [{line['style']}/{line['voice']}]  “{line['text']}”  "
                         f"→ “{hit['transcript']}” (WER {hit['wer']:.2f})",
                         os.path.join(qa_dir, f"{r.id}.png"))
    res = summarize(out)
    # the AI's voice should drift toward his: ai_0 -> ai_1 -> ai_2 -> ai_him (sung lines)
    res["summary"]["timbre_distance_to_you"] = qa.drift_report(timbre)
    return res


def summarize(rows: list[dict]) -> dict:
    def stats(rs, key="wer"):
        v = [r[key] for r in rs if r.get(key) is not None]
        if not v:
            return None
        worst = max(rs, key=lambda r: r.get(key) if r.get(key) is not None else -1)
        return {"n": len(v), "mean": round(float(np.mean(v)), 3), "median": round(float(np.median(v)), 3),
                "worst": round(float(max(v)), 3), "worst_id": worst["id"]}

    sung_lead = [r for r in rows if r["mode"] == "sung" and not r["double_of"] and not r["exempt"]]
    sung_dbl = [r for r in rows if r["mode"] == "sung" and r["double_of"]]
    spoken = [r for r in rows if r["mode"] != "sung" and not r["exempt"]]
    fails = []
    for r in rows:
        lim = 0.35 if r["mode"] == "sung" else 0.15
        if not r["exempt"] and not r["double_of"] and r["wer"] > lim:
            fails.append({"id": r["id"], "check": "wer", "value": r["wer"], "limit": lim})
        pe = r.get("pitch_err_cents")
        if pe is not None and pe >= r["pitch_target_cents"]:
            fails.append({"id": r["id"], "check": "pitch", "value": pe, "limit": r["pitch_target_cents"]})
    pitch = {}
    for grp, styles in (("ai", ("ai", "ai_him")), ("human", ("human",)), ("choir", ("choir",))):
        pitch[grp] = stats([r for r in rows if r.get("style") in styles and r["mode"] == "sung"],
                           "pitch_err_cents")
    offs = [abs(r["timing_offset_ms"]) for r in rows if r.get("timing_offset_ms") is not None]
    timing = {"n": len(offs), "mean_abs_ms": round(float(np.mean(offs)), 1),
              "max_abs_ms": round(float(np.max(offs)), 1)} if offs else None
    return {"summary": {"sung_leads": stats(sung_lead), "sung_doubles": stats(sung_dbl),
                        "timing_offset": timing,
                        "spoken": stats(spoken), "pitch_cents": pitch, "failing": fails,
                        "targets": {"sung_wer": 0.35, "spoken_wer": 0.15,
                                    "pitch_ai_cents": 15, "pitch_human_cents": 35}},
            "lines": rows}


# ----------------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--lines", help="comma-separated line ids (default: all)")
    ap.add_argument("--jobs", type=int, default=max(1, min(4, os.cpu_count() or 1)))
    ap.add_argument("--no-qa", action="store_true")
    ap.add_argument("--no-stems", action="store_true", help="skip stems/timing (auditions)")
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--qa-model", default="medium.en")
    ap.add_argument("--plots", default=",".join(PLOT_LINES))
    ap.add_argument("--wav-dir", help="also write each line as a WAV here (auditions)")
    args = ap.parse_args()

    import cache
    cache.ENABLED = not args.no_cache
    t_all = time.time()
    with open(VOCALS_JSON) as fh:
        vocals = json.load(fh)
    voices, all_lines = vocals["voices"], vocals["lines"]
    lines = {l["id"]: l for l in all_lines}
    sel = all_lines if not args.lines else [lines[i] for i in args.lines.split(",")]
    partial = len(sel) != len(all_lines)

    # longest lines first for load balance
    def cost(l):
        return sum(n["d"] for s in l.get("syllables", []) for n in s["notes"]) or 4.0
    jobs = [(l, voices) for l in sorted(sel, key=cost, reverse=True)]
    t = time.time()
    if args.jobs > 1 and len(jobs) > 1:
        ctx = mp.get_context("spawn")
        with ctx.Pool(args.jobs, initializer=_worker_init) as pool:
            results = list(pool.imap_unordered(render_line, jobs, chunksize=1))
    else:
        results = [render_line(j) for j in jobs]
    by_id = {r.id: r for r, _ in results}
    renders = [by_id[l["id"]] for l in sel]
    fresh = sum(1 for _, dt in results if dt > 0)
    print(f"rendered {len(renders)} lines ({fresh} fresh) in {time.time() - t:.1f} s")

    if args.wav_dir:
        import soundfile as sf
        os.makedirs(args.wav_dir, exist_ok=True)
        for r in renders:
            sf.write(os.path.join(args.wav_dir, f"{r.id}.wav"), r.audio, 48000)

    if not partial and not args.no_stems:
        import stems
        t = time.time()
        info = stems.write(stems.mix(renders, lines), os.path.join(BUILD, "stems"))
        timing = {"meta": {"bpm": 172, "sr": 48000, "duration": stems.DURATION,
                           "units": "seconds", "generator": "music/vocal/render_vocals.py",
                           "notes": "start = consonant onset, end = release; syllable 'vowel' = "
                                    "vowel landing (the note's beat)"},
                  "lines": [r.timing for r in renders]}
        with open(os.path.join(BUILD, "vocal_timing.json"), "w") as fh:
            json.dump(timing, fh, ensure_ascii=False, indent=1)
        print(f"stems + timing written in {time.time() - t:.1f} s:",
              {b: v["peak_dbfs"] for b, v in info.items()})

    if not args.no_qa:
        t = time.time()
        qa_res = run_qa(renders, lines, args.qa_model, args.plots.split(","),
                        os.path.join(BUILD, "qa_vocal"))
        qa_res["meta"] = {"whisper": f"faster-whisper {args.qa_model} (CPU int8, beam 5, no prompt)",
                          "pitch": "Harvest F0 vs score over voiced vowel frames, median |cents|",
                          "render_seconds": round(time.time() - t_all, 1)}
        if not partial:
            with open(os.path.join(BUILD, "vocal_qa.json"), "w") as fh:
                json.dump(qa_res, fh, ensure_ascii=False, indent=1)
        s = qa_res["summary"]
        print(f"QA ({time.time() - t:.0f} s): sung leads {s['sung_leads']}\n  spoken {s['spoken']}\n"
              f"  doubles {s['sung_doubles']}\n  pitch {s['pitch_cents']}\n  failing {s['failing']}")
        for row in qa_res["lines"]:
            pe = row.get("pitch_err_cents")
            print(f"  {row['id']:12s} WER {row['wer']:.2f}{' (exempt)' if row['exempt'] else ''}"
                  f"{'' if pe is None else f'  pitch {pe:5.1f}c'}  “{row['transcript']}”")
    print(f"total {time.time() - t_all:.1f} s")


if __name__ == "__main__":
    main()
