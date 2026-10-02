"""
Pitch contours: score notes -> target F0 (what the listener hears) and native F0 (what
Kokoro is asked to sing, squeezed into the voice's clean range).

Human expression is modelled on how pop singers actually move between notes:
  portamento 45-70 ms across note changes, a scoop from below on phrase attacks, a small
  overshoot after upward leaps, vibrato (~5.3 Hz, +-25-35 cents) fading in after ~180 ms on
  notes >= 0.35 s, slow drift, a little jitter and a soft fall at phrase releases.
The AI is "hard-tuned": exact pitches and 12 ms snaps, nothing else.

All randomness is seeded per line, so renders are reproducible and doubles differ.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.ndimage import gaussian_filter1d

from planner import SungPlan

FP = 0.005                    # WORLD frame period (s)


@dataclass
class Expression:
    port_pre: float = 0.035          # transition starts this long before the new note
    port_post: float = 0.030         # ...and settles this long after it
    scoop_cents: float = 0.0         # attack from below after rests
    scoop_tau: float = 0.045
    overshoot_cents: float = 0.0     # after upward leaps >= 2 semitones
    vib_depth: tuple = (0.0, 0.0)    # cents (peak), random per note
    vib_rate: tuple = (5.3, 5.3)     # Hz, random per note
    vib_delay: float = 0.18
    vib_fade: float = 0.22
    vib_min_note: float = 0.35
    drift_cents: float = 0.0         # std of slow wander
    jitter_cents: float = 0.0        # per-frame noise
    release_fall: float = 0.0        # cents, over the last 70 ms before a rest


HUMAN = Expression(port_pre=0.035, port_post=0.025, scoop_cents=55.0, overshoot_cents=14.0,
                   vib_depth=(25.0, 33.0), vib_rate=(5.1, 5.6), drift_cents=5.0,
                   jitter_cents=2.5, release_fall=28.0)
AI = Expression(port_pre=0.006, port_post=0.006)
CHOIR = Expression(port_pre=0.040, port_post=0.040, scoop_cents=20.0, vib_depth=(14.0, 20.0),
                   vib_rate=(4.8, 5.4), drift_cents=4.0, jitter_cents=2.0, release_fall=15.0)


def _smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


@dataclass
class Contour:
    t: np.ndarray            # frame times (song seconds), FP spacing from plan.t0
    target_midi: np.ndarray  # expressive target pitch (MIDI float, defined everywhere)
    score_midi: np.ndarray   # plain score pitch over note spans, NaN elsewhere (for QA)
    voiced: np.ndarray       # bool per frame
    vowel: np.ndarray        # bool per frame: inside a sung vowel nucleus

    @property
    def target_hz(self) -> np.ndarray:
        return np.where(self.voiced, 440.0 * 2 ** ((self.target_midi - 69) / 12), 0.0)


def voicing_mask(plan: SungPlan, t: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-frame voicing (and vowel membership) from the token covering each frame."""
    starts = np.array([p.start for p in plan.phones])
    idx = np.clip(np.searchsorted(starts, t, side="right") - 1, 0, len(plan.phones) - 1)
    voiced = np.array([plan.phones[i].voiced for i in idx])
    vowel = np.array([plan.phones[i].role == "nucleus" for i in idx])
    # zero-length tokens never cover a frame; tokens shorter than a frame still get one
    return voiced, vowel


def design(plan: SungPlan, ex: Expression, seed: int, detune_cents: float = 0.0,
           min_rest: float = 0.075) -> Contour:
    rng = np.random.default_rng(seed)
    n = int(np.ceil((plan.t_end - plan.t0) / FP)) + 1
    t = plan.t0 + np.arange(n) * FP

    # ---- note track: one segment per note; the first note of a syllable also covers the
    #      syllable's onset consonants (they are sung on the coming pitch after a rest)
    segs = []   # (syllable_start, note_start, note_end, pitch, vowel_end_of_syllable, last_of_syl)
    for s in sorted(plan.syllables, key=lambda s: s.notes[0].start):
        for k, nt in enumerate(s.notes):
            segs.append((s.start if k == 0 else nt.start, nt.start, nt.end, nt.pitch,
                         s.vowel_end, k == len(s.notes) - 1))
    segs.sort(key=lambda x: x[1])
    phrase_start = [True] + [segs[i][1] - segs[i - 1][2] >= min_rest for i in range(1, len(segs))]

    m = np.full(n, segs[0][3])
    score = np.full(n, np.nan)
    for i, (st, ns, ne, p, _, _) in enumerate(segs):
        m[t >= (st - 0.03 if phrase_start[i] else ns)] = p   # step; legato steps are smoothed below
        score[(t >= ns) & (t < ne)] = p

    cents = np.zeros(n)
    for i in range(1, len(segs)):
        if phrase_start[i]:
            continue
        p0, p1, b = segs[i - 1][3], segs[i][3], segs[i][1]
        a, c = b - ex.port_pre, b + ex.port_post
        w = (t >= a) & (t < c)
        m[w] = p0 + (p1 - p0) * _smoothstep((t[w] - a) / (c - a))
        if ex.overshoot_cents and abs(p1 - p0) >= 2:      # damped overshoot after leaps
            u = t - c
            ww = (u >= 0) & (u < 0.15)
            cents[ww] += np.sign(p1 - p0) * ex.overshoot_cents * np.exp(-u[ww] / 0.045) \
                * np.cos(2 * np.pi * u[ww] / 0.22)

    if ex.scoop_cents:                                   # attack from below after rests
        for i, (st, ns, ne, p, _, _) in enumerate(segs):
            if not phrase_start[i]:
                continue
            depth = ex.scoop_cents * rng.uniform(0.7, 1.2)
            u = t - ns
            pre = (t >= st - 0.03) & (u < 0)
            post = (u >= 0) & (u < 0.3)
            cents[pre] -= depth
            cents[post] -= depth * np.exp(-u[post] / ex.scoop_tau)

    if ex.vib_depth[1] > 0:                              # vibrato on sustained vowels
        for st, ns, ne, p, v_end_syl, last in segs:
            v_end = min(ne, v_end_syl) if last else ne
            if v_end - ns < ex.vib_min_note:
                continue
            depth = rng.uniform(*ex.vib_depth)
            rate = rng.uniform(*ex.vib_rate)
            u = t - ns
            w = (u >= ex.vib_delay) & (t < v_end)
            env = _smoothstep((u[w] - ex.vib_delay) / ex.vib_fade) * _smoothstep((v_end - t[w]) / 0.04)
            wobble = 1 + 0.04 * np.sin(2 * np.pi * 0.7 * u[w] + rng.uniform(0, 6))
            ph = 2 * np.pi * np.cumsum(rate * wobble) * FP + rng.uniform(0, 2 * np.pi)
            cents[w] += depth * env * np.sin(ph)

    if ex.release_fall:                                  # soft fall into rests
        for i, (st, ns, ne, p, v_end_syl, last) in enumerate(segs):
            if last and (i == len(segs) - 1 or phrase_start[i + 1]):
                u = t - (v_end_syl - 0.07)
                w = (u >= 0) & (t < v_end_syl + 0.10)
                cents[w] -= ex.release_fall * _smoothstep(u[w] / 0.10)

    if ex.drift_cents:
        drift = gaussian_filter1d(rng.standard_normal(n), sigma=0.12 / FP)
        drift *= ex.drift_cents / (drift.std() + 1e-9)
        cents += drift
    if ex.jitter_cents:
        cents += gaussian_filter1d(rng.standard_normal(n), 1.0) * ex.jitter_cents

    target = m + (cents + detune_cents) / 100.0
    voiced, vowel = voicing_mask(plan, t)
    return Contour(t, target, score, voiced, vowel)


def native_midi(target_midi: np.ndarray, voiced: np.ndarray, lo: float, hi: float) -> np.ndarray:
    """Map the target contour into [lo, hi] (the voice's clean range): transpose down so the
    top fits, and compress intervals if the line is wider than the range."""
    v = target_midi[voiced] if voiced.any() else target_midi
    top, bot = np.percentile(v, 99.5), np.percentile(v, 0.5)
    top_n = min(top, hi)
    alpha = min(1.0, (top_n - lo) / max(top - bot, 1e-6))
    return top_n - alpha * (top - target_midi)


def to_decoder_rate(t: np.ndarray, values: np.ndarray, voiced: np.ndarray, t0: float,
                    n_frames: int, rate: int = 80) -> np.ndarray:
    """Resample a 5 ms curve to Kokoro's 80 Hz F0 grid (value i covers [i, i+1) / rate)."""
    tc = t0 + (np.arange(2 * n_frames) + 0.5) / rate
    out = np.interp(tc, t, values)
    vv = np.interp(tc, t, voiced.astype(float)) > 0.5
    return np.where(vv, out, 0.0)


def midi_to_hz(m):
    return 440.0 * 2 ** ((np.asarray(m) - 69) / 12)
