"""Shared helpers for rendered lines: result type, resampling, levels, gates, the glitch cut."""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import numpy as np
import soxr

SR_OUT = 48000


@dataclass
class LineRender:
    id: str
    audio: np.ndarray              # mono float32 @ 48 kHz; audio[0] is at song time `start`
    start: float
    timing: dict                   # vocal_timing.json entry
    qa: dict = field(default_factory=dict)   # data for the pitch QA (sung lines)

    @property
    def end(self) -> float:
        return self.start + len(self.audio) / SR_OUT


def to48k(x: np.ndarray, sr: int = 24000) -> np.ndarray:
    return soxr.resample(x.astype(np.float32), sr, SR_OUT, quality="VHQ").astype(np.float32)


def active_rms_db(x: np.ndarray, sr: int = SR_OUT, floor_db: float = 30.0) -> float:
    """RMS over the 'singing' part: 20 ms windows within `floor_db` of the loudest one."""
    n = int(0.02 * sr)
    if len(x) < n:
        return -120.0
    w = x[: len(x) // n * n].reshape(-1, n)
    r = np.sqrt((w ** 2).mean(1) + 1e-12)
    rdb = 20 * np.log10(r)
    act = rdb > rdb.max() - floor_db
    return float(10 * np.log10(np.mean(r[act] ** 2) + 1e-12))


def set_level(x: np.ndarray, target_dbfs: float, ceiling_dbfs: float = -3.0) -> np.ndarray:
    """Scale to a target active RMS, then catch plosive/attack peaks above the ceiling with
    a look-ahead limiter (gain dips over ~1 ms, recovers over ~50 ms: inaudible on voice)."""
    g = 10 ** ((target_dbfs - active_rms_db(x)) / 20)
    return peak_limit(x * g, ceiling_dbfs)


def peak_limit(x: np.ndarray, ceiling_dbfs: float = -3.0, sr: int = SR_OUT,
               release: float = 0.05, lookahead: float = 0.0015) -> np.ndarray:
    from scipy.ndimage import minimum_filter1d, uniform_filter1d
    c = 10 ** (ceiling_dbfs / 20)
    need = np.minimum(1.0, c / (np.abs(x) + 1e-12))
    if need.min() >= 1.0:
        return x.astype(np.float32)
    la = max(1, int(lookahead * sr))
    need = minimum_filter1d(need, size=2 * la + 1)        # the dip starts before the peak
    a = np.exp(-1.0 / (release * sr))
    env = np.empty_like(need)
    e = 1.0
    for i, r in enumerate(need):                          # instant attack, smooth release
        e = r if r < e else 1.0 - (1.0 - e) * a
        env[i] = e
    env = uniform_filter1d(env, size=la)                  # round off the attack corners
    return (x * env).astype(np.float32)


def edge_gate(x: np.ndarray, sr: int, t_on: float, t_off: float, fade_in: float = 0.015,
              fade_out: float = 0.04) -> np.ndarray:
    """Silence everything before t_on - fade_in and after t_off + fade_out (seconds from the
    start of x), with raised-cosine ramps. Removes vocoder/WORLD noise floors at the edges."""
    t = np.arange(len(x)) / sr
    g = np.ones(len(x))
    a = (t < t_on)
    g[a] = 0.5 - 0.5 * np.cos(np.pi * np.clip((t[a] - (t_on - fade_in)) / fade_in, 0, 1))
    b = (t > t_off)
    g[b] = 0.5 + 0.5 * np.cos(np.pi * np.clip((t[b] - t_off) / fade_out, 0, 1))
    return (x * g).astype(np.float32)


def glitch_cut(x: np.ndarray, sr: int, t_cut: float, fade: float = 0.010, seed: int = 0) -> np.ndarray:
    """The AI is interrupted: hard stop at t_cut with a 10 ms digital stutter + fade
    (a 2.5 ms grain repeated with sample-and-hold decimation, as in a dropped buffer)."""
    rng = np.random.default_rng(seed)
    y = x.copy()
    c = int(round(t_cut * sr))
    n = int(round(fade * sr))
    if c <= n or c > len(y):
        return y
    g = int(0.0025 * sr)
    grain = y[c - n - g: c - n].copy()
    held = np.repeat(grain[::4], 4)[:g]                  # sample-and-hold (crushed)
    tail = np.tile(held, n // g + 1)[:n]
    tail *= np.linspace(1.0, 0.0, n) ** 1.5 * (1 + 0.3 * rng.standard_normal(n).clip(-1, 1))
    y[c - n: c] = tail
    y[c:] = 0.0
    return y


def pan_stereo(x: np.ndarray, pan: float) -> np.ndarray:
    """Balance pan: centre = unity on both sides, +-0.3 attenuates the far side to 0.7."""
    left = min(1.0, 1.0 - pan)
    right = min(1.0, 1.0 + pan)
    return np.stack([x * left, x * right], axis=1)


def ortho_syllables(word: str, n: int) -> list[str]:
    """Split a written word into n syllables (display only): vowel groups, VC|CV rule."""
    if n <= 1 or len(word) < 2:
        return [word]
    low = word.lower()
    groups = [list(m.span()) for m in re.finditer(r"[aeiouy]+", low)]
    if len(groups) > n and low.endswith("e") and groups[-1][0] == len(low) - 1:
        groups = groups[:-1]                                  # silent final e
    while len(groups) > n:                                    # merge the closest pair
        k = min(range(len(groups) - 1), key=lambda i: groups[i + 1][0] - groups[i][1])
        groups[k][1] = groups[k + 1][1]
        del groups[k + 1]
    if len(groups) < n:
        step = len(word) / n
        cuts = [round(step * i) for i in range(1, n)]
    else:
        cuts = []
        for k in range(n - 1):
            a, b = groups[k][1], groups[k + 1][0]
            cuts.append(a if b - a <= 1 else a + 1)
    parts, prev = [], 0
    for c in cuts + [len(word)]:
        parts.append(word[prev:c])
        prev = c
    return [p for p in parts if p] or [word]


def inhale(duration: float, sr: int = SR_OUT, seed: int = 0) -> np.ndarray:
    """A soft singer's breath in: band-shaped noise (vocal-tract-ish resonances around
    1.2 / 2.6 kHz, little low end), rising then falling quickly. Peak-normalised to 1."""
    from scipy.signal import butter, sosfiltfilt
    rng = np.random.default_rng(seed)
    n = int(duration * sr)
    x = rng.standard_normal(n + 2048)
    y = np.zeros_like(x)
    for lo, hi, g in ((700, 1700, 1.0), (2000, 3300, 0.7), (4000, 7500, 0.35)):
        y += g * sosfiltfilt(butter(2, [lo, hi], "bp", fs=sr, output="sos"), x)
    y = y[1024:1024 + n]
    u = np.linspace(0, 1, n)
    env = np.where(u < 0.7, np.sin(0.5 * np.pi * u / 0.7) ** 2, np.cos(0.5 * np.pi * (u - 0.7) / 0.3) ** 2)
    y *= env
    return (y / (np.abs(y).max() + 1e-9)).astype(np.float32)


def add_air(y: np.ndarray, sr: int = SR_OUT, rel_db: float = -14.0, seed: int = 0) -> np.ndarray:
    """Band replication for the 24 kHz renders: real voices carry breath/sibilance 'air' up
    to ~18 kHz. Noise in 11.5-18 kHz follows the envelope of the 6-11.5 kHz band and sits
    `rel_db` below it, so sibilants and breathy notes get their top end back."""
    from scipy.signal import butter, sosfiltfilt
    rng = np.random.default_rng(seed)
    hi = sosfiltfilt(butter(4, [6000, 11500], "bp", fs=sr, output="sos"), y)
    env = np.abs(hi)
    k = int(0.002 * sr)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    noise = sosfiltfilt(butter(4, [11500, 18000], "bp", fs=sr, output="sos"),
                        rng.standard_normal(len(y)))
    air = noise * env
    g = np.sqrt(np.mean(hi ** 2) / (np.mean(air ** 2) + 1e-20)) * 10 ** (rel_db / 20)
    return (y + g * air).astype(np.float32)
