"""Power-chord rhythm guitar, double-tracked.

Each side (L/R) is an independent performance:
  1. a synthesised DI -- root/fifth/octave strings as detuned band-limited saws with a
     pick transient, a few cents of pitch overshoot at the attack and a string-brightness
     envelope (palm mutes: darker, shorter, softer);
  2. a guitar-amp chain: tight pre-EQ with a mid push (overdrive-pedal style), two
     oversampled tube-like gain stages, then a 4x12-ish cabinet curve
     (HP ~90 Hz, low resonance, mid scoop, presence peak, LP ~5.5 kHz);
  3. a FluidSynth GM 30 "Distortion Guitar" layer of the same take for a real pick attack.
The takes differ in timing (R trails L by ~8-15 ms, plus per-note jitter), tuning (a few
cents) and phases, and are panned hard left/right.
"""
from __future__ import annotations

import numpy as np
from scipy import signal

import dsp
import fluid
from common import BEAT, SR, rng_for, tb2n
from synths import segments

SIDES = {   # timing offset (s), detune (cents), pan, level
    "L": dict(offset=-0.004, detune=-3.0, pan=-0.92, level=1.0),
    "R": dict(offset=+0.007, detune=+4.0, pan=+0.92, level=1.07),
}
CAB = [("hp", 90.0, 4), ("peak", 115.0, 2.0, 1.1), ("peak", 450.0, -3.0, 0.9), ("peak", 1600.0, 1.5, 1.0),
       ("peak", 2700.0, 1.0, 1.2), ("peak", 3800.0, -3.0, 1.4), ("lp", 5500.0, 4)]
_INTERSTAGE = signal.butter(2, 9000.0, fs=4 * SR, output="sos")


def _strike(pitches, art, v, n_on, rng, detune):
    """DI signal of one strum (mono)."""
    open_ = art != "mute"
    n = n_on + int((0.06 if open_ else 0.012) * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, p in enumerate(pitches):
        f0 = float(dsp.mtof(p)) * dsp.cents(detune + rng.normal(0.0, 1.5))
        f = f0 * (1.0 + 0.0055 * np.exp(-t / 0.028))          # pick overshoot, settles in ~30 ms
        lvl = (1.0, 0.85, 0.6)[min(k, 2)]
        x += lvl * (dsp.saw(f, phase0=rng.random())
                    + 0.6 * dsp.saw(f * dsp.cents(4.0 + rng.normal(0.0, 1.0)), phase0=rng.random()))
    if open_:
        fc = 2200.0 + 4500.0 * np.exp(-t / 0.20)
        env = (1.0 - np.exp(-t / 0.0015)) * (0.72 + 0.28 * np.exp(-t / 0.35))
    else:
        fc = 450.0 + 900.0 * np.exp(-t / 0.035)
        env = (1.0 - np.exp(-t / 0.0008)) * np.exp(-t / 0.075)
    x = dsp.svf(x, fc, 0.7, "lp")
    rel = np.ones(n)
    k = np.arange(n) >= n_on
    rel[k] = np.exp(-(t[k] - n_on / SR) / (0.012 if open_ else 0.003))
    pick = dsp.filt(rng.standard_normal(n), dsp.butter("hp", 1800.0, 2)) * np.exp(-t / 0.0025)
    x = (x / 4.2) * env * rel + pick * (0.30 if open_ else 0.16)
    return x * (0.4 + 0.6 * v)


def _amp(di: np.ndarray, gain: float) -> np.ndarray:
    """Pre-EQ -> two oversampled gain stages (the cabinet is applied by the caller)."""
    x = dsp.eq(di, [("hp", 130.0, 2), ("peak", 850.0, 5.0, 0.8)])

    def stages(u):
        u = np.tanh(np.float32(gain) * u + np.float32(0.1)) - np.float32(np.tanh(0.1))  # asymmetric: even harmonics
        u = dsp.filt(u, _INTERSTAGE).astype(np.float32)                                # tame fizz between stages
        return np.tanh(np.float32(2.5) * u)

    return dsp.oversample(stages, x, 4)


def _side(notes, n_total, side: str, name: str):
    cfg = SIDES[side]
    rng = rng_for(name, side)
    jit = {i: float(np.clip(rng.normal(0.0, 0.002), -0.005, 0.005)) for i in range(len(notes))}
    di_open = np.zeros(n_total)
    di_mute = np.zeros(n_total)
    fs_open, fs_mute = [], []
    for i, nt in enumerate(notes):
        art = nt.get("art", "open")
        pitches = nt.get("chord") or [nt["p"], nt["p"] + 7, nt["p"] + 12]
        t0 = nt["tb"] * BEAT + cfg["offset"] + jit[i]
        dur = nt["d"] * BEAT * (1.0 if art != "mute" else 0.85)
        x = _strike(pitches, art, nt.get("v", 0.8), int(dur * SR), rng_for(name, side, i), cfg["detune"])
        dsp.place(di_open if art != "mute" else di_mute, int(round(t0 * SR)), x)
        for p in pitches:
            if art != "mute":
                fs_open.append((t0, dur, p, nt.get("v", 0.8)))
            else:
                fs_mute.append((t0, dur * 0.55, p, nt.get("v", 0.8) * 0.8))
    # FluidSynth layer (mono patch): mutes darker and lower
    fo = fluid.render(fs_open, 30, bend_cents=cfg["detune"]).mean(axis=1)
    fm = fluid.render(fs_mute, 30, bend_cents=cfg["detune"]).mean(axis=1)
    # amp chains only where the guitar plays; one cabinet pass for both layers (it is linear)
    lp_mute = dsp.butter("lp", 1700.0, 4)
    parts = []
    for s0, s1 in segments(notes, n_total, pre=0.05, post=0.6):
        amp = _amp(di_open[s0:s1], 14.0) + 0.65 * _amp(di_mute[s0:s1], 9.0)
        fs = fo[s0:s1] + 0.6 * dsp.filt(fm[s0:s1], lp_mute)
        parts.append((s0, s1, amp, fs))
    # balance by RMS over the whole take (keeps section dynamics): the synthesised amp
    # leads, the sampled guitar adds its pick attack
    ra = np.sqrt(np.mean(np.concatenate([p[2] for p in parts]) ** 2)) + 1e-9
    rf = np.sqrt(np.mean(np.concatenate([p[3] for p in parts]) ** 2)) + 1e-9
    mono = np.zeros(n_total)
    for s0, s1, amp, fs in parts:
        mono[s0:s1] = dsp.eq(amp / ra + 0.6 * fs / rf, CAB)
    return dsp.pan(mono * cfg["level"], cfg["pan"])


def render_guitar(notes, n_total, name="guitar"):
    notes = sorted(notes, key=lambda nt: nt["tb"])
    out = _side(notes, n_total, "L", name) + _side(notes, n_total, "R", name)
    return out * 0.25
