#!/usr/bin/env python3
"""Render every instrument track and story-FX type of the arrangement to dry stems.

    python3 music/engine/render_instruments.py [--jobs 4] [--only kick,guitar,fx:impact]

Reads   music/build/arrangement.json   (compiled from music/score/song.py)
Writes  music/build/stems/tracks/<track>.wav     one dry, full-length stem per track
        music/build/stems/tracks/fx_<type>.wav   one stem per FX type
        music/build/stems/tracks/manifest.json   levels + render times (read by mix.py)
        music/build/stems/{kick,snare,hat,musicbox}.wav   dry analysis stems for the
                                                          blind onset analysis (§5)

All stems are 48 kHz stereo float32 and exactly 215.000 s long. Rendering is fully
deterministic (every random draw is seeded from the track/event identity), and jobs run
in parallel worker processes.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from multiprocessing import Pool

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dsp  # noqa: E402
import drums  # noqa: E402
import fluid  # noqa: E402
import fx  # noqa: E402
import guitar  # noqa: E402
import synths  # noqa: E402
from common import (BEAT, N_TOTAL, SR, STEMS, TRACK_DIR, load_arrangement,  # noqa: E402
                    read_wav, write_wav)

# GM program and onset advance (samples) for the sampled instruments. Strings and choir
# are nudged early: their slow attacks otherwise read as late (players anticipate).
FLUID = {
    "piano": (0, 0),
    "strings": (48, int(0.025 * SR)),
    "choir": (52, int(0.040 * SR)),
    "music_box": (10, 0),
}
CELESTA_DB = -8.0            # soft celesta (GM 8) layer doubling the music box

SYNTH = {
    "kick": drums.render_kick,
    "snare": drums.render_snare,
    "clap": drums.render_clap,
    "ride": drums.render_ride,
    "crash": drums.render_crash,
    "toms": drums.render_toms,
    "bass_synth": synths.render_bass,
    "guitar_power": guitar.render_guitar,
    "lead_square": synths.render_square,
    "pluck": synths.render_pluck,
    "pad_warm": synths.render_pad,
}

# rough relative cost, so the slowest jobs start first
COST = {"guitar_power": 30, "supersaw": 6, "pad_warm": 6, "bass_synth": 6, "hats": 5, "fx:room_tone": 3}


def _fluid_notes(notes):
    return [(n["tb"] * BEAT, n["d"] * BEAT, int(n["p"]), float(n.get("v", 0.8))) for n in notes]


def render_track(name: str, tr: dict) -> np.ndarray:
    inst, notes = tr["instrument"], tr["notes"]
    if inst == "supersaw":
        # one instrument id, two roles: stacked chords vs. the (doubled) riff line
        is_lead = "lead" in name or max((len([m for m in notes if m["tb"] == n["tb"]]) for n in notes),
                                        default=1) <= 2
        fn = synths.render_supersaw_lead if is_lead else synths.render_supersaw_chords
        return fn(notes, N_TOTAL, name)
    if inst in SYNTH:
        return SYNTH[inst](notes, N_TOTAL, name)
    if inst in FLUID:
        prog, adv = FLUID[inst]
        x = fluid.render(_fluid_notes(notes), prog, advance=adv)
        if inst == "music_box":
            x = x + dsp.db2a(CELESTA_DB) * fluid.render(_fluid_notes(notes), 8, advance=adv)
        return x
    raise ValueError(f"unknown instrument {inst!r} on track {name!r}")


def run_job(job):
    """Worker: render one job, write its stem(s), return their manifest entries."""
    kind, name, payload = job
    t0 = time.time()
    outs: list[tuple[str, np.ndarray, dict]] = []
    if kind == "track":
        outs.append((name, render_track(name, payload), payload))
    elif kind == "hats":
        c, o = payload                       # (name, track) or None for each side of the pedal
        cx, ox = drums.render_hats(c[1]["notes"] if c else [], o[1]["notes"] if o else [], N_TOTAL,
                                   c[0] if c else "hat", o[0] if o else "ohat")
        for side, x in ((c, cx), (o, ox)):
            if side:
                outs.append((side[0], x, side[1]))
    elif kind == "fx":
        events, context = payload
        outs.append((f"fx_{name}", fx.render_type(events, N_TOTAL, name, context), {"bus": "fx", "type": name}))
    dt = time.time() - t0
    entries = []
    for stem, x, meta in outs:
        x = dsp.ftz(np.asarray(x, dtype=np.float32), 1e-30)
        path = os.path.join(TRACK_DIR, f"{stem}.wav")
        write_wav(path, x)
        pk = float(np.abs(x).max())
        entries.append({
            "stem": stem, "file": os.path.relpath(path, STEMS), "kind": kind,
            "instrument": meta.get("instrument", meta.get("type")), "bus": meta.get("bus", "fx"),
            "peak_dbfs": round(float(dsp.a2db(pk)), 2) if pk > 0 else None,
            "lufs": round(dsp.integrated_lufs(x), 2) if pk > 0 else None,
            "seconds": round(dt / len(outs), 2),
        })
    return entries


def build_jobs(arr: dict, only: set[str] | None):
    tracks = arr["tracks"]
    jobs = []
    closed = [(n, t) for n, t in tracks.items() if t["instrument"] == "hat_closed"]
    opened = [(n, t) for n, t in tracks.items() if t["instrument"] == "hat_open"]
    for i in range(max(len(closed), len(opened))):      # closed + open hats share one pedal (choke)
        c = closed[i] if i < len(closed) else None
        o = opened[i] if i < len(opened) else None
        jobs.append(("hats", "+".join(x[0] for x in (c, o) if x), (c, o)))
    for n, t in tracks.items():
        if t["instrument"] not in ("hat_closed", "hat_open"):
            jobs.append(("track", n, t))
    by_type: dict[str, list] = {}
    for ev in arr["fx"]:
        by_type.setdefault(ev["type"], []).append(ev)
    for typ, evs in sorted(by_type.items()):
        if typ in fx.MIX_STAGE:
            continue
        if typ not in fx.GENERATORS:
            print(f"  ! no generator for FX type {typ!r} -- skipped")
            continue
        jobs.append(("fx", typ, (evs, {"silence": arr.get("automation", {}).get("silence", [])})))
    if only:
        jobs = [j for j in jobs if j[1] in only or f"{j[0]}:{j[1]}" in only
                or (j[0] == "hats" and set(j[1].split("+")) & only)]

    def cost(j):
        if j[0] == "track":
            return COST.get(j[2]["instrument"], 1) * (len(j[2]["notes"]) > 0)
        if j[0] == "hats":
            return COST["hats"]
        return COST.get(f"fx:{j[1]}", 1)
    return sorted(jobs, key=cost, reverse=True)


def write_analysis_stems(arr: dict) -> None:
    """Dry per-instrument stems the blind analysis step reads for onsets (§5)."""
    groups = {"kick": ["kick"], "snare": ["snare"], "hat": ["hat_closed", "hat_open"], "musicbox": ["music_box"]}
    for out, insts in groups.items():
        names = [n for n, t in arr["tracks"].items() if t["instrument"] in insts]
        acc = np.zeros((N_TOTAL, 2), dtype=np.float32)
        for n in names:
            p = os.path.join(TRACK_DIR, f"{n}.wav")
            if os.path.exists(p):
                acc += read_wav(p)
        write_wav(os.path.join(STEMS, f"{out}.wav"), acc)


def default_jobs() -> int:
    """Up to 4 workers, but no more than available memory allows (~1.5 GB per worker)."""
    try:
        with open("/proc/meminfo") as f:
            avail_gb = next(int(ln.split()[1]) for ln in f if ln.startswith("MemAvailable")) / 1e6
    except (OSError, StopIteration):
        avail_gb = 8.0
    return max(1, min(4, os.cpu_count() or 1, int(avail_gb // 1.5)))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--jobs", type=int, default=default_jobs())
    ap.add_argument("--only", default="", help="comma list of track names / fx:<type> to re-render")
    args = ap.parse_args()
    only = {s.strip() for s in args.only.split(",") if s.strip()} or None

    arr = load_arrangement()
    os.makedirs(TRACK_DIR, exist_ok=True)
    jobs = build_jobs(arr, only)
    print(f"rendering {len(jobs)} jobs on {args.jobs} processes -> {os.path.relpath(TRACK_DIR)}")
    t0 = time.time()
    man_path = os.path.join(TRACK_DIR, "manifest.json")
    manifest = {}
    if only and os.path.exists(man_path):
        with open(man_path) as f:
            manifest = {e["stem"]: e for e in json.load(f)["stems"]}
    with Pool(args.jobs) as pool:
        for entries in pool.imap_unordered(run_job, jobs):
            for e in entries:
                manifest[e["stem"]] = e
                lv = f"{e['lufs']:6.1f} LUFS  peak {e['peak_dbfs']:5.1f} dBFS" if e["lufs"] is not None else "(silent)"
                print(f"  {e['stem']:22s} {e['seconds']:6.1f} s   {lv}")
    write_analysis_stems(arr)
    total = time.time() - t0
    with open(man_path, "w") as f:
        json.dump({"sr": SR, "samples": N_TOTAL, "render_seconds": round(total, 1),
                   "stems": sorted(manifest.values(), key=lambda e: e["stem"])}, f, indent=1)
    print(f"done in {total:.1f} s; analysis stems kick/snare/hat/musicbox.wav written to {os.path.relpath(STEMS)}")


if __name__ == "__main__":
    main()
