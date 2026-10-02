"""Mix rendered lines into the four dry vocal stems (48 kHz, stereo, 24-bit, 215.000 s)."""
from __future__ import annotations

import os

import numpy as np
import soundfile as sf

from lineaudio import LineRender, SR_OUT, pan_stereo

DURATION = 215.0
N_SAMPLES = int(round(DURATION * SR_OUT))
BUSES = ("you", "ai", "bg", "spoken")

# doubles / harmonies sit off-centre; leads stay in the middle
PAN_BY_SUFFIX = {"_dbl": -0.3, "_ai": 0.3, "_h3": 0.3, "_h6": -0.3}


def pan_for(line: dict) -> float:
    if not line.get("double_of"):
        return 0.0
    for suf, p in PAN_BY_SUFFIX.items():
        if line["id"].endswith(suf):
            return p
    return 0.3 if sum(map(ord, line["id"])) % 2 else -0.3


def mix(renders: list[LineRender], lines: dict[str, dict]) -> dict[str, np.ndarray]:
    stems = {b: np.zeros((N_SAMPLES, 2), np.float64) for b in BUSES}
    for r in renders:
        line = lines[r.id]
        st = stems[line["bus"]]
        x = pan_stereo(r.audio.astype(np.float64), pan_for(line))
        i0 = int(round(r.start * SR_OUT))
        a, b = max(0, i0), min(N_SAMPLES, i0 + len(x))
        if b > a:
            st[a:b] += x[a - i0: b - i0]
    return stems


def write(stems: dict[str, np.ndarray], out_dir: str) -> dict[str, dict]:
    os.makedirs(out_dir, exist_ok=True)
    info = {}
    for bus, x in stems.items():
        peak = float(np.abs(x).max())
        if peak > 0.99:                       # safety only; lines are levelled well below
            x = x * (0.99 / peak)
        path = os.path.join(out_dir, f"vox_{bus}.wav")
        sf.write(path, x.astype(np.float32), SR_OUT, subtype="PCM_24")
        info[bus] = {"path": os.path.relpath(path, os.path.join(out_dir, "..", "..", "..")),
                     "peak_dbfs": round(20 * np.log10(peak + 1e-12), 2),
                     "samples": int(len(x)), "seconds": len(x) / SR_OUT}
    return info
