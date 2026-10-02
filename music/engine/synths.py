"""Synthesised melodic instruments: bass, supersaw (chords + lead), square lead, pluck, pad.

Two rendering styles:
* mono lines (bass, leads) build per-sample pitch/gate/velocity control arrays and run
  phase-continuous oscillators through an ADSR state machine, so retriggers and glides
  never click;
* polyphonic parts (chords, pads, plucks) render note by note (notes that share a start
  and length are grouped into one chord with a shared filter).
Sparse tracks are rendered segment by segment to avoid synthesising silence.
"""
from __future__ import annotations

import numpy as np
from numba import njit

import dsp
from common import BEAT, SR, rng_for, tb2n


# ============================================================================ control helpers
def segments(notes, n_total, pre=0.02, post=1.5, merge=2.0):
    """Contiguous active regions [s0, s1) in samples (with release tails)."""
    iv = sorted((tb2n(nt["tb"]), tb2n(nt["tb"] + nt["d"])) for nt in notes)
    segs: list[list[int]] = []
    for a, b in iv:
        a, b = a - int(pre * SR), b + int(post * SR)
        if segs and a <= segs[-1][1] + int(merge * SR):
            segs[-1][1] = max(segs[-1][1], b)
        else:
            segs.append([a, b])
    return [(max(0, a), min(n_total, b)) for a, b in segs if min(n_total, b) > max(0, a)]


def mono_controls(notes, s0, s1, glide_ms=0.0):
    """Pitch (MIDI, glided), gate, trigger and held velocity arrays for a mono line."""
    n = s1 - s0
    notes = sorted(notes, key=lambda nt: nt["tb"])
    pitch = np.full(n, float(notes[0]["p"]))
    vel = np.full(n, float(notes[0].get("v", 0.8)))
    gate = np.zeros(n, dtype=np.bool_)
    trig = np.zeros(n, dtype=np.bool_)
    for i, nt in enumerate(notes):
        a = tb2n(nt["tb"]) - s0
        b = tb2n(nt["tb"] + nt["d"]) - s0
        nxt = tb2n(notes[i + 1]["tb"]) - s0 if i + 1 < len(notes) else n
        a = max(0, a)
        pitch[a:nxt] = nt["p"]
        vel[a:nxt] = nt.get("v", 0.8)
        gate[a:max(a + 1, min(b, nxt))] = True
        if a < n:
            trig[a] = True
    if glide_ms > 0:
        c = dsp.coef(glide_ms)
        pitch = _glide(pitch, c)
    return pitch, gate, trig, vel


@njit(cache=True)
def _glide(p, c):
    y = np.empty_like(p)
    s = p[0]
    for i in range(p.shape[0]):
        s = c * s + (1.0 - c) * p[i]
        y[i] = s
    return y


@njit(cache=True)
def _adsr(gate, trig, a_n, d_c, s, r_c):
    """Linear attack from the current level, exponential decay/release."""
    n = gate.shape[0]
    env = np.empty(n)
    lvl = 0.0
    stage = 0
    for i in range(n):
        if trig[i]:
            stage = 1
        elif (not gate[i]) and stage != 0:
            stage = 3
        if stage == 1:
            lvl += 1.0 / a_n
            if lvl >= 1.0:
                lvl = 1.0
                stage = 2
        elif stage == 2:
            lvl = s + (lvl - s) * d_c
        elif stage == 3:
            lvl *= r_c
            if lvl < 1e-7:
                lvl = 0.0
                stage = 0
        env[i] = lvl
    return env


@njit(cache=True)
def _trig_decay(trig, a_c, d_c):
    """Filter envelope: ~0.5 ms rise on each trigger, then exponential fall."""
    n = trig.shape[0]
    out = np.empty(n)
    lvl = 0.0
    rising = False
    for i in range(n):
        if trig[i]:
            rising = True
        if rising:
            lvl = 1.0 - (1.0 - lvl) * a_c
            if lvl > 0.98:
                rising = False
        else:
            lvl *= d_c
        out[i] = lvl
    return out


def adsr(gate, trig, attack_ms, decay_ms, sustain, release_ms):
    return _adsr(gate, trig, max(1.0, attack_ms * 1e-3 * SR), dsp.coef(decay_ms), sustain,
                 dsp.coef(release_ms))


def trig_env(trig, decay_ms):
    return _trig_decay(trig, dsp.coef(0.4), dsp.coef(decay_ms))


def note_env(n_on: int, n_total: int, attack_s: float, release_s: float, decay_tau: float | None = None,
             sustain: float = 1.0):
    """Per-note envelope: linear attack, optional decay to sustain, exponential release after n_on."""
    t = np.arange(n_total) / SR
    a = np.clip(t / max(attack_s, 1e-4), 0.0, 1.0)
    if decay_tau:
        a = a * (sustain + (1.0 - sustain) * np.exp(-np.maximum(t - attack_s, 0.0) / decay_tau))
    rel = np.ones(n_total)
    k = np.arange(n_total) >= n_on
    rel[k] = np.exp(-(t[k] - n_on / SR) / max(release_s / 4.6, 1e-4))     # -40 dB at release_s
    return a * rel


def chords_of(notes):
    """Group notes sharing (tb, d) into chords: [(tb, d, [notes...])]."""
    groups: dict[tuple, list] = {}
    for nt in notes:
        groups.setdefault((round(nt["tb"], 4), round(nt["d"], 4)), []).append(nt)
    return [(k[0], k[1], v) for k, v in sorted(groups.items())]


def _mono_out(x):
    return np.stack([x, x], axis=1) * 0.7071


# ============================================================================ bass
def render_bass(notes, n_total, name="bass"):
    """Mono bass: clean sub sine under a saw that is envelope-filtered and driven.

    The saw layer is high-passed so the sub alone owns everything below ~90 Hz (tight,
    phase-stable low end); the drive gives the upper harmonics that make the line
    audible on small speakers. Kick sidechain is applied at the mix stage.
    """
    out = np.zeros(n_total)
    for s0, s1 in segments(notes, n_total, post=0.5):
        seg = [nt for nt in notes if s0 <= tb2n(nt["tb"]) < s1]
        pitch, gate, trig, vel = mono_controls(seg, s0, s1)
        f = dsp.mtof(pitch)
        amp = adsr(gate, trig, 1.5, 260.0, 0.78, 28.0) * (0.35 + 0.65 * vel)
        fenv = trig_env(trig, 95.0)
        sub = dsp.sine(f)
        osc = dsp.saw(f, phase0=0.37) + 0.45 * dsp.saw(f * dsp.cents(9.0), phase0=0.81)
        fc = 140.0 + 1.6 * f + (450.0 + 2300.0 * vel) * fenv
        grit = dsp.svf(osc, fc, 0.95, "lp", poles=4)
        grit = dsp.tanh_sat(0.9 * grit, 2.6, bias=0.1)
        grit = dsp.filt(grit, dsp.butter("hp", 95.0, 2))
        x = (0.8 * sub + 0.6 * grit) * amp
        out[s0:s1] += dsp.tanh_sat(x, 1.3)
    return _mono_out(out)


# ============================================================================ supersaw
_DET = np.array([-1.0, -0.62, -0.28, 0.0, 0.29, 0.6, 1.0])     # JP-8000-like spacing
_PAN = np.array([-0.95, 0.62, -0.3, 0.0, 0.3, -0.62, 0.95])     # alternate sides, outer voices widest
_LVL = np.array([0.78, 0.8, 0.85, 1.0, 0.85, 0.8, 0.78])


def supersaw_stack(f, n, rng, spread_cents=18.0, width=1.0):
    """Seven detuned saws (+-spread), seeded free-running phases, spread across the field."""
    out = np.zeros((n, 2))
    for k in range(7):
        det = _DET[k] * spread_cents * (1.0 + rng.normal(0.0, 0.06))
        s = dsp.saw(f * dsp.cents(det), n, rng.random())
        gl, gr = dsp.pan_gains(_PAN[k] * width)
        out[:, 0] += s * gl * _LVL[k]
        out[:, 1] += s * gr * _LVL[k]
    return out / 4.0


def render_supersaw_chords(notes, n_total, name="saw_chords"):
    """Wide supersaw chords with a bright attack that settles (LP envelope)."""
    out = np.zeros((n_total, 2))
    for ci, (tb, d, chord) in enumerate(chords_of(notes)):
        rng = rng_for(name, ci)
        s = tb2n(tb)
        n_on = int(d * BEAT * SR)
        n = n_on + int(0.35 * SR)
        v = float(np.mean([nt.get("v", 0.8) for nt in chord]))
        x = sum(supersaw_stack(dsp.mtof(nt["p"]), n, rng) for nt in chord)
        t = np.arange(n) / SR
        fc = 3000.0 + (8500.0 * (0.65 + 0.35 * v) - 3000.0) * np.exp(-t / 0.32)
        x = dsp.svf(x, fc, 0.85, "lp", poles=4)
        env = note_env(n_on, n, 0.010, 0.30)
        x = x * env[:, None] * (0.25 + 0.75 * v)
        dsp.place(out, s, x)
    return dsp.filt(out, dsp.butter("hp", 110.0, 2))


def split_lines(notes):
    """Split a part with stacked doubles into mono lines (top voice = line 0)."""
    by_start: dict[float, list] = {}
    for nt in notes:
        by_start.setdefault(round(nt["tb"], 4), []).append(nt)
    lines: list[list] = []
    for tb in sorted(by_start):
        stack = sorted(by_start[tb], key=lambda nt: -nt["p"])
        for k, nt in enumerate(stack):
            while len(lines) <= k:
                lines.append([])
            lines[k].append(nt)
    return lines


def render_supersaw_lead(notes, n_total, name="saw_lead"):
    """The riff: brighter supersaw, each voice line with a slight portamento."""
    out = np.zeros((n_total, 2))
    for li, line in enumerate(split_lines(notes)):
        for si, (s0, s1) in enumerate(segments(line, n_total, post=0.6)):
            seg = [nt for nt in line if s0 <= tb2n(nt["tb"]) < s1]
            rng = rng_for(name, li, si)
            pitch, gate, trig, vel = mono_controls(seg, s0, s1, glide_ms=22.0)
            f = dsp.mtof(pitch)
            x = supersaw_stack(f, s1 - s0, rng, spread_cents=16.0)
            fenv = trig_env(trig, 220.0)
            fc = 5200.0 + 7000.0 * fenv * (0.6 + 0.4 * vel)
            x = dsp.svf(x, fc, 0.8, "lp", poles=4)
            amp = adsr(gate, trig, 3.0, 400.0, 0.85, 90.0) * (0.3 + 0.7 * vel)
            out[s0:s1] += x * amp[:, None]
    return dsp.filt(out, dsp.butter("hp", 140.0, 2))


# ============================================================================ square lead
def render_square(notes, n_total, name="square"):
    """Machine lead: band-limited pulse with slow PWM, tiny glide, plucky envelope."""
    out = np.zeros(n_total)
    for s0, s1 in segments(notes, n_total, post=0.4):
        seg = [nt for nt in notes if s0 <= tb2n(nt["tb"]) < s1]
        pitch, gate, trig, vel = mono_controls(seg, s0, s1, glide_ms=9.0)
        f = dsp.mtof(pitch)
        t = (np.arange(s1 - s0) + s0) / SR
        pw = 0.5 + 0.11 * np.sin(dsp.TWO_PI * 0.7 * t)          # slow pulse-width drift
        x = 0.5 * dsp.pulse(f, pw)
        fenv = trig_env(trig, 120.0)
        fc = np.minimum(15000.0, 2.2 * f + 5500.0 * fenv * vel + 1500.0)
        x = dsp.svf(x, fc, 0.75, "lp", poles=2)
        amp = adsr(gate, trig, 2.0, 110.0, 0.6, 45.0) * (0.3 + 0.7 * vel)
        out[s0:s1] += x * amp
    return _mono_out(out)


# ============================================================================ pluck
def render_pluck(notes, n_total, name="pluck"):
    """Synth pluck for the arps: two detuned saws through a snapping 24 dB low-pass."""
    out = np.zeros((n_total, 2))
    for i, nt in enumerate(sorted(notes, key=lambda nt: nt["tb"])):
        rng = rng_for(name, i)
        f = float(dsp.mtof(nt["p"]))
        v = nt.get("v", 0.7)
        n_on = int(nt["d"] * BEAT * SR)
        n = n_on + int(0.25 * SR)
        t = np.arange(n) / SR
        x = dsp.saw(np.full(n, f * dsp.cents(-6)), phase0=rng.random()) \
            + dsp.saw(np.full(n, f * dsp.cents(6)), phase0=rng.random())
        fc = 180.0 + 1.3 * f + (2200.0 + 4200.0 * v) * np.exp(-t / 0.10)
        x = dsp.svf(x, fc, 1.1, "lp", poles=4)
        env = (1.0 - np.exp(-t / 0.0008)) * np.exp(-t / 0.42)
        env *= note_env(n_on, n, 0.0005, 0.12)
        dsp.place(out, tb2n(nt["tb"]), dsp.pan(0.5 * x * env * v, rng.uniform(-0.15, 0.15)))
    return out


# ============================================================================ pad
def render_pad(notes, n_total, name="pad"):
    """Warm analog pad: per-channel detuned saw trios (natural chorus), slow attack, dark LP."""
    out = np.zeros((n_total, 2))
    for ci, (tb, d, chord) in enumerate(chords_of(notes)):
        rng = rng_for(name, ci)
        n_on = int(d * BEAT * SR)
        n = n_on + int(1.4 * SR)
        t = np.arange(n) / SR
        v = float(np.mean([nt.get("v", 0.5) for nt in chord]))
        x = np.zeros((n, 2))
        for nt in chord:
            f = float(dsp.mtof(nt["p"]))
            for c, dets in enumerate(((-8.0, 3.0, 11.0), (-11.0, -3.0, 8.0))):
                for det in dets:
                    x[:, c] += dsp.saw(np.full(n, f * dsp.cents(det)), phase0=rng.random())
        lfo = 1.0 + 0.15 * np.sin(dsp.TWO_PI * 0.13 * (t + tb2n(tb) / SR) + rng.random() * 6.28)
        fc = 1350.0 * (0.8 + 0.5 * v) * lfo
        x = dsp.svf(x, fc, 0.75, "lp", poles=4)
        attack = min(0.9, 0.4 * d * BEAT)
        env = note_env(n_on, n, attack, 1.3)
        env = 0.5 - 0.5 * np.cos(np.pi * np.clip(env, 0, 1))      # S-curve: smooth swell
        x = dsp.tanh_sat(0.12 * x * env[:, None], 1.3)
        dsp.place(out, tb2n(tb), x * v)
    return dsp.filt(out, dsp.butter("hp", 90.0, 2))
