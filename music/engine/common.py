"""Shared constants, paths, score access and audio I/O for the audio engine.

Everything time-related follows docs/06_tech_spec.md §1: 172 BPM, beat time `tb`,
48 kHz, and a fixed programme length of exactly 215.000 s.
"""
from __future__ import annotations

import json
import os
import zlib
from dataclasses import dataclass

import numpy as np
import soundfile as sf

# ----------------------------------------------------------------------------- paths
ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(ENGINE_DIR, "..", ".."))
BUILD = os.path.join(ROOT, "music", "build")
STEMS = os.path.join(BUILD, "stems")
TRACK_DIR = os.path.join(STEMS, "tracks")        # per-track / per-FX-type dry renders
QA_DIR = os.path.join(BUILD, "qa")
ARRANGEMENT = os.path.join(BUILD, "arrangement.json")
VOCALS_JSON = os.path.join(BUILD, "vocals.json")
VOCAL_TIMING = os.path.join(BUILD, "vocal_timing.json")
SF2 = "/usr/share/sounds/sf2/FluidR3_GM.sf2"

# ----------------------------------------------------------------------------- time
SR = 48000
BPM = 172
BEAT = 60.0 / BPM                       # 0.3488372 s
END_TIME = 215.0
N_TOTAL = int(round(END_TIME * SR))     # 10_320_000 samples, exactly 215.000 s
MASTER_SEED = 20261002                  # every random draw in the engine derives from this


def tb2s(tb: float) -> float:
    """Beat time -> seconds."""
    return tb * BEAT


def tb2n(tb: float) -> int:
    """Beat time -> sample index (rounded to the nearest sample)."""
    return int(round(tb * BEAT * SR))


def s2n(s: float) -> int:
    return int(round(s * SR))


def seed_for(*parts) -> int:
    """A stable seed from any labels (Python's hash() is salted per process; crc32 is not)."""
    key = "|".join(str(p) for p in parts).encode("utf-8")
    return (zlib.crc32(key) ^ MASTER_SEED) & 0x7FFFFFFF


def rng_for(*parts) -> np.random.Generator:
    return np.random.default_rng(seed_for(*parts))


# ----------------------------------------------------------------------------- score
@dataclass
class Section:
    id: str
    name: str
    start_tb: float
    end_tb: float

    @property
    def start(self) -> float:
        return tb2s(self.start_tb)

    @property
    def end(self) -> float:
        return min(END_TIME, tb2s(self.end_tb))


def load_arrangement(path: str = ARRANGEMENT) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def sections(arr: dict) -> list[Section]:
    return [Section(s["id"], s["name"], float(s["start_tb"]), float(s["end_tb"]))
            for s in arr["sections"]]


def lane(points, n: int = N_TOTAL, *, log: bool = False, default: float = 0.0) -> np.ndarray:
    """Render a piecewise-linear automation lane [[tb, value], ...] at audio rate.

    `log=True` interpolates in the log domain (used for filter cut-offs, so a sweep
    moves evenly in musical intervals rather than racing through the top octave).
    Values are held flat before the first and after the last breakpoint.
    """
    if not points:
        return np.full(n, default, dtype=np.float64)
    pts = sorted((float(t), float(v)) for t, v in points)
    xs = np.array([tb2n(t) for t, _ in pts], dtype=np.float64)
    ys = np.array([v for _, v in pts], dtype=np.float64)
    idx = np.arange(n, dtype=np.float64)
    if log:
        return np.exp(np.interp(idx, xs, np.log(np.maximum(ys, 1e-9))))
    return np.interp(idx, xs, ys)


# ----------------------------------------------------------------------------- audio I/O
def to_stereo(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x)
    if x.ndim == 1:
        return np.stack([x, x], axis=1)
    return x


def fit_length(x: np.ndarray, n: int = N_TOTAL) -> np.ndarray:
    """Zero-pad or truncate along time so every stem is exactly the programme length."""
    if x.shape[0] == n:
        return x
    if x.shape[0] > n:
        return x[:n]
    pad = [(0, n - x.shape[0])] + [(0, 0)] * (x.ndim - 1)
    return np.pad(x, pad)


def write_wav(path: str, x: np.ndarray, subtype: str = "FLOAT") -> None:
    """Write a stereo stem. FLOAT keeps headroom above 0 dBFS (stems are pre-master)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, np.asarray(x, dtype=np.float32), SR, subtype=subtype)


def read_wav(path: str, n: int = N_TOTAL) -> np.ndarray:
    """Read a WAV or FLAC as float32 stereo at the engine rate, fitted to the programme length."""
    x, sr = sf.read(path, dtype="float32", always_2d=True)
    if sr != SR:
        from scipy.signal import resample_poly
        g = np.gcd(SR, sr)
        x = resample_poly(x, SR // g, sr // g, axis=0).astype(np.float32)
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    elif x.shape[1] > 2:
        x = x[:, :2]
    return fit_length(x, n)
