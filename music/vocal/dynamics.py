"""
Energy curve (Kokoro's "N" input) for forced-timing renders.

Kokoro's own energy predictor is trained on aligner output that lags the audio by ~3 frames,
and on long stretched tokens it drifts (onsets wander with the leading silence, sustained
vowels die ~200 ms early). Fed with an energy curve that is aligned to the tokens, the
decoder follows the planned timing to within ~10 ms. So we *design* N:

  consonants  = per-symbol level, calibrated as the median lag-corrected N of each symbol
                in natural-speed Kokoro renders of all lyric lines (af_heart)
  vowels      = a sung, projected level (singers sustain at full voice), stress-weighted
  silences    = -9.5 (Kokoro's silence level)
  dynamics    = per-style note shaping (swell, release ramps, slow wander)

N is a compressed loudness scale: ~2.5 dB per unit around 8, and higher N also means a
cleaner, more harmonic voice (less decoder noise), which suits sustained singing.
"""
from __future__ import annotations

import numpy as np
from scipy.ndimage import gaussian_filter1d

from phonology import PLOSIVES, REDUCED, STRESS, UNVOICED, VOWELS

SILENCE = -9.5

# median N per consonant in natural renders (lag-corrected by 5 samples @ 80 Hz)
CONSONANT_LEVELS = {
    "n": 7.3, "m": 7.3, "ŋ": 6.9, "l": 7.2, "ɹ": 7.0, "w": 6.3, "j": 5.3, "T": 7.0, "ɾ": 7.0,
    "d": 6.0, "s": 6.0, "z": 6.1, "ʃ": 6.2, "ʒ": 6.0, "ʤ": 5.9, "ð": 5.2, "ʧ": 4.8, "h": 5.4,
    "v": 5.7, "ɡ": 4.6, "t": 4.5, "b": 3.8, "k": 3.3, "f": 2.7, "p": 1.7, "θ": 1.3, "ʔ": 3.0,
}


def token_levels(symbols: list[str], roles: list[str], vowel_level: float = 8.6,
                 cons_boost: float = 0.5, onset_boost: float = 0.8) -> np.ndarray:
    """Target N per token. Vowels: projected level, a little lower when unstressed/reduced.
    Unvoiced onset obstruents get an extra lift: singers over-articulate them for diction."""
    lv = np.empty(len(symbols))
    for i, (s, r) in enumerate(zip(symbols, roles)):
        if r in ("edge", "gap") or s in ",.!?;:—…":
            lv[i] = SILENCE
        elif s in STRESS:
            lv[i] = vowel_level
        elif s in VOWELS:
            stressed = i > 0 and symbols[i - 1] in STRESS
            lv[i] = vowel_level - (0.0 if stressed else 0.25 if s not in REDUCED else 0.45)
        else:
            lv[i] = CONSONANT_LEVELS.get(s, 5.5) + cons_boost
            if r == "onset" and s in UNVOICED:
                lv[i] += onset_boost
            if r == "coda" and s in PLOSIVES:
                # "feed me": a stop before another consonant is held, not exploded (a loud
                # release reads as an extra syllable, "feed-ed")
                j = next((j for j in range(i + 1, len(symbols)) if roles[j] != "gap"), None)
                if j is not None and roles[j] in ("onset", "coda") and symbols[j] not in VOWELS:
                    lv[i] -= 1.5
    return lv


def design_energy(bounds: np.ndarray, n_frames: int, levels: np.ndarray,
                  smooth: float = 0.9) -> np.ndarray:
    """Token-aligned N curve at 80 Hz (bounds: token boundaries in frames)."""
    tc = (np.arange(2 * n_frames) + 0.5) / 2.0              # sample centres in frames
    k = np.clip(np.searchsorted(bounds, tc, side="right") - 1, 0, len(levels) - 1)
    n = levels[k]
    return gaussian_filter1d(n, smooth) if smooth else n


def shape_notes(n: np.ndarray, t0: float, plan, style: str, rng: np.random.Generator,
                rate: int = 80) -> np.ndarray:
    """Musical dynamics on top of the token levels (in N units, ~2.5 dB each near 8)."""
    t = t0 + (np.arange(len(n)) + 0.5) / rate
    out = n.copy()
    voiced = n > SILENCE + 1.0
    for s in plan.syllables:
        a, b = s.vowel_start, s.vowel_end
        dur = b - a
        if dur <= 0.05:
            continue
        w = (t >= a) & (t < b)
        u = (t[w] - a) / dur
        if style in ("human", "choir"):                   # the AI stays flat and gated
            # messa di voce: small swell into the middle of long notes, ease off at the end
            depth = 0.35 if dur > 0.4 else 0.15
            out[w] += depth * np.sin(np.pi * np.clip(u * 1.1, 0, 1)) - 0.25 * u ** 3
    # phrase releases: energy ramps down over the last ~60 ms before silence
    edge = np.where(voiced[:-1] & ~voiced[1:])[0]
    for e in edge:
        lo = max(0, e - int(0.06 * rate))
        out[lo:e + 1] -= np.linspace(0, 1.6 if style != "ai" else 0.6, e + 1 - lo)
    if style in ("human", "choir"):
        wander = gaussian_filter1d(rng.standard_normal(len(n)), 0.25 * rate)
        out += 0.18 * wander / (wander.std() + 1e-9) * voiced
    return out
