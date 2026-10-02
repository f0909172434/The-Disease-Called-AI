"""Synthesised drum kit.

Every hit is generated from scratch (no samples) with a little seeded variation in
pitch, decay and level so that repeated hits never sound machine-gunned. Hits are
velocity-sensitive in level *and* timbre (harder = brighter / longer), and mono
voices (kick, hats) choke their own tails like a real drum machine.
"""
from __future__ import annotations

import numpy as np

import dsp
from common import SR, rng_for, tb2n


def _t(dur: float) -> np.ndarray:
    return np.arange(int(dur * SR)) / SR


def _sweep(f: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    """Sine with a per-sample frequency array (phase-continuous)."""
    return np.sin(dsp.TWO_PI * (np.cumsum(f) / SR) + phase0)


# ============================================================================ voices
def kick_hit(v: float, rng: np.random.Generator) -> np.ndarray:
    """Electro-rock kick: 165->51 Hz sine sweep with a punch chirp, beater click, saturation."""
    t = _t(0.46)
    j = 1.0 + rng.normal(0.0, 0.012)                      # +-1.2 % tuning drift per hit
    f = 51.0 * j + (165.0 - 51.0) * j * np.exp(-t / 0.038) + 420.0 * np.exp(-t / 0.0022)
    decay = 0.105 * (1.0 + rng.normal(0.0, 0.04)) * (0.85 + 0.15 * v)
    amp = (1.0 - np.exp(-t / 0.0005)) * np.exp(-t / decay)
    amp *= np.clip((0.46 - t) / 0.12, 0.0, 1.0) ** 2         # tail lands softly at ~350-460 ms
    # saturate the body only (asymmetric: adds a 2nd harmonic so the 47 Hz tail
    # still reads on small speakers); the click is added afterwards, unsquashed.
    body = dsp.tanh_sat(1.2 * _sweep(f) * amp, 2.0, bias=0.15)
    nz = dsp.filt(rng.standard_normal(t.size), dsp.butter("bp", (1800.0, 8000.0), 2))
    click = (nz * np.exp(-t / 0.003) * 0.55
             + np.sin(dsp.TWO_PI * 1650.0 * t) * np.exp(-t / 0.002) * 0.35)
    x = body + click * (0.4 + 0.6 * v ** 1.5)               # harder hits are clickier
    return x * v ** 1.1


def snare_hit(v: float, rng: np.random.Generator) -> np.ndarray:
    """Tuned shell (~190 Hz + overtones), band-passed wire noise and a stick transient."""
    t = _t(0.42)
    j = 1.0 + rng.normal(0.0, 0.01)
    f1 = 190.0 * j * (1.0 + 0.22 * np.exp(-t / 0.008))
    f2 = 315.0 * j * (1.0 + 0.18 * np.exp(-t / 0.006))
    tone = (_sweep(f1) * np.exp(-t / 0.075) + 0.5 * _sweep(f2, 1.1) * np.exp(-t / 0.045)
            + 0.18 * np.sin(dsp.TWO_PI * 472.0 * j * t) * np.exp(-t / 0.03))
    wires_tau = (0.08 + 0.06 * v) * (1.0 + rng.normal(0.0, 0.05))
    nz = rng.standard_normal(t.size)
    nz = dsp.eq(nz, [("hp", 1100.0, 2), ("peak", 1900.0, 3.0, 1.0), ("peak", 5200.0, 3.0, 0.9),
                     ("lp", 6500.0 + 7500.0 * v, 2)])
    wires = nz * (1.0 - np.exp(-t / 0.0015)) * np.exp(-t / wires_tau)
    crack = dsp.filt(rng.standard_normal(t.size), dsp.butter("bp", (900.0, 6000.0), 2)) * np.exp(-t / 0.0025)
    x = 1.25 * tone + (0.5 + 0.3 * v) * 0.65 * wires + 0.7 * v * crack
    x = dsp.tanh_sat(0.8 * x, 1.5)
    return x * v ** 1.15


def clap_hit(v: float, rng: np.random.Generator) -> np.ndarray:
    """Four hand-clap bursts ~9.5 ms apart into a short diffuse tail (stereo)."""
    t = _t(0.38)
    env = np.zeros(t.size)
    for k, (dt, g) in enumerate(zip((0.0, 0.0095, 0.0195, 0.0290), (0.75, 0.9, 0.8, 1.0))):
        dt = dt * (1.0 + rng.normal(0.0, 0.06))
        on = t >= dt
        env[on] += g * np.exp(-(t[on] - dt) / 0.0035)
    tail_on = t >= 0.029
    tail = np.zeros(t.size)
    tail[tail_on] = 0.85 * np.exp(-(t[tail_on] - 0.029) / (0.10 + 0.04 * v))
    common = rng.standard_normal(t.size)
    out = np.zeros((t.size, 2))
    for c in range(2):
        side = rng.standard_normal(t.size)
        nz = common * env + (0.6 * common + 0.8 * side) * tail
        out[:, c] = dsp.eq(nz, [("hp", 650.0, 2), ("peak", 1250.0, 6.0, 1.3), ("peak", 2900.0, 3.0, 1.5),
                                ("lp", 9000.0, 2)])
    return dsp.tanh_sat(0.5 * out, 1.3) * v ** 1.1


# 808-style metal: six square oscillators at inharmonic ratios, shifted up into the hat band
_HAT_SQUARES = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * 1.9


def hat_hit(v: float, rng: np.random.Generator, open_: bool = False, dur: float | None = None) -> np.ndarray:
    """High-passed noise + metallic square cluster + an FM shimmer; closed or open."""
    dur = dur or (0.75 if open_ else 0.13)
    t = _t(dur)
    n = t.size
    metal = np.zeros(n)
    for f in _HAT_SQUARES:
        metal += dsp.pulse(f * (1.0 + rng.normal(0.0, 0.003)), 0.5, n, rng.random())
    # FM pair at an inharmonic ratio: dense metallic sidebands (low ones filtered away)
    fm = np.sin(dsp.TWO_PI * 6150.0 * t + 2.6 * np.sin(dsp.TWO_PI * 8690.0 * t + rng.random() * 6.28))
    nz = rng.standard_normal(n)
    x = 0.45 * dsp.eq(metal / 6.0, [("bp", 9500.0, 0.9)]) * 2.2 + 0.25 * fm + 0.6 * nz
    x = dsp.filt(x, np.vstack([dsp.butter("hp", 6800.0, 4), dsp.butter("lp", 11000.0 + 7000.0 * v, 2)]))
    if open_:
        tau = 0.22 * (1.0 + rng.normal(0.0, 0.05))
        env = (1.0 - np.exp(-t / 0.0006)) * np.exp(-t / tau)
    else:
        tau = (0.016 + 0.02 * v) * (1.0 + rng.normal(0.0, 0.06))
        env = (1.0 - np.exp(-t / 0.0004)) * np.exp(-t / tau)
    env *= np.clip((dur - t) / 0.02, 0.0, 1.0)
    return x * env * v ** 1.2 * 0.8


def ride_hit(v: float, rng: np.random.Generator) -> np.ndarray:
    """Ride: bell partials over a washy high noise bed (unused by the current score)."""
    t = _t(1.8)
    bell = sum(a * np.sin(dsp.TWO_PI * 3050.0 * r * t + rng.random() * 6.28) * np.exp(-t / tau)
               for r, a, tau in ((1.0, 1.0, 0.9), (1.48, 0.6, 0.7), (2.12, 0.4, 0.5), (2.87, 0.3, 0.35)))
    wash = dsp.filt(rng.standard_normal(t.size), dsp.butter("hp", 4500.0, 2)) * np.exp(-t / 0.7)
    x = 0.25 * bell + 0.35 * wash
    return x * (1.0 - np.exp(-t / 0.0005)) * v


def crash_hit(v: float, rng: np.random.Generator, dur: float = 3.0) -> np.ndarray:
    """Crash: decorrelated stereo noise wash + 48 inharmonic partials, ~2.5 s decay."""
    t = _t(dur)
    n = t.size
    out = np.zeros((n, 2))
    env_n = (1.0 - np.exp(-t / 0.0008)) * (0.5 * np.exp(-t / 0.05) + 0.5 * np.exp(-t / 0.85))
    for c in range(2):
        nz = dsp.eq(rng.standard_normal(n), [("hp", 450.0, 2), ("peak", 5800.0, 3.0, 0.8),
                                             ("peak", 10500.0, 2.5, 1.0), ("lp", 16000.0, 2)])
        out[:, c] = 0.65 * nz * env_n
    # a dense cloud of inharmonic modes, weighted to the shimmer band; low modes die
    # quickly (otherwise the cymbal turns into a gong)
    fr = np.exp(rng.uniform(np.log(700.0), np.log(12500.0), 110))
    for f in fr:
        tau = 1.9 * min(1.0, (f / 2500.0) ** 0.5) * rng.uniform(0.6, 1.1)
        part = np.sin(dsp.TWO_PI * f * t + rng.random() * 6.28) * np.exp(-t / tau)
        gl, gr = dsp.pan_gains(rng.uniform(-0.8, 0.8))
        out[:, 0] += 0.018 * part * gl
        out[:, 1] += 0.018 * part * gr
    out *= np.clip((dur - t) / 0.5, 0.0, 1.0)[:, None] ** 2
    bright = dsp.biquad("highshelf", 4000.0, 1.0, -4.0 * (1.0 - v))
    return dsp.filt(out, bright) * v ** 1.1


TOM_HZ = {50: 140.0, 47: 108.0, 45: 84.0}        # high / mid / floor (GM note numbers)
TOM_PAN = {50: -0.28, 47: 0.0, 45: 0.28}         # audience view: high left, floor right


def tom_hit(p: int, v: float, rng: np.random.Generator) -> np.ndarray:
    f0 = TOM_HZ.get(p, float(dsp.mtof(p)) * 0.75) * (1.0 + rng.normal(0.0, 0.008))
    t = _t(0.7)
    f = f0 * (1.0 + 0.45 * np.exp(-t / 0.035))
    tau = 0.24 * (110.0 / f0) ** 0.6
    body = _sweep(f) * np.exp(-t / tau) + 0.22 * _sweep(f * 1.58, 0.7) * np.exp(-t / 0.07)
    nz = rng.standard_normal(t.size)
    stick = dsp.filt(nz, dsp.butter("lp", 5000.0, 2)) * np.exp(-t / 0.006) * 0.6 * v
    stick += dsp.filt(nz, dsp.butter("hp", 2500.0, 2)) * np.exp(-t / 0.0015) * 0.45
    x = dsp.tanh_sat(0.85 * ((1.0 - np.exp(-t / 0.0006)) * body + stick), 1.5)
    x *= np.clip((0.7 - t) / 0.15, 0.0, 1.0) ** 2
    return dsp.pan(x * v ** 1.1, TOM_PAN.get(p, 0.0))


# ============================================================================ track renderers
def _hits(notes):
    return sorted(notes, key=lambda nt: nt["tb"])


def _render_mono_choked(notes, n_total, voice, label, choke_ms=4.0, extra_chokes=()):
    """Render a mono voice where each new hit cuts the previous tail (drum-machine choke)."""
    buf = np.zeros(n_total)
    hits = _hits(notes)
    starts = [tb2n(nt["tb"]) for nt in hits]
    cut_points = sorted(set(starts) | {tb2n(tb) for tb in extra_chokes})
    fl = int(choke_ms * 1e-3 * SR)
    for i, nt in enumerate(hits):
        s = starts[i]
        x = voice(nt.get("v", 0.8), rng_for(label, i))
        later = [c for c in cut_points if c > s]
        if later and later[0] - s < x.size:
            k = later[0] - s
            x = dsp.fade(x[: k + fl], 0, fl)
        dsp.place(buf, s, x)
    return buf


def _stereo(x):
    return np.stack([x, x], axis=1) * 0.7071      # centred mono at the -3 dB pan law


def render_kick(notes, n_total, name="kick"):
    return _stereo(_render_mono_choked(notes, n_total, kick_hit, name))


def render_snare(notes, n_total, name="snare"):
    buf = np.zeros(n_total)
    for i, nt in enumerate(_hits(notes)):
        dsp.place(buf, tb2n(nt["tb"]), snare_hit(nt.get("v", 0.8), rng_for(name, i)))
    return _stereo(buf)


def render_clap(notes, n_total, name="clap"):
    buf = np.zeros((n_total, 2))
    for i, nt in enumerate(_hits(notes)):
        dsp.place(buf, tb2n(nt["tb"]), clap_hit(nt.get("v", 0.8), rng_for(name, i)))
    return buf


def render_hats(closed, opened, n_total, name_c="hat", name_o="ohat"):
    """Closed and open hats share one 'pedal': any new hat chokes a ringing open hat."""
    c_buf = np.zeros(n_total)
    for i, nt in enumerate(_hits(closed)):
        dsp.place(c_buf, tb2n(nt["tb"]), hat_hit(nt.get("v", 0.6), rng_for(name_c, i), False))
    o_buf = np.zeros(n_total)
    all_starts = sorted({tb2n(nt["tb"]) for nt in list(closed) + list(opened)})
    fl = int(0.008 * SR)
    for i, nt in enumerate(_hits(opened)):
        s = tb2n(nt["tb"])
        x = hat_hit(nt.get("v", 0.6), rng_for(name_o, i), True)
        later = [c for c in all_starts if c > s]
        if later and later[0] - s < x.size:
            x = dsp.fade(x[: later[0] - s + fl], 0, fl)
        dsp.place(o_buf, s, x)
    return _stereo(c_buf), _stereo(o_buf)


def render_ride(notes, n_total, name="ride"):
    buf = np.zeros(n_total)
    for i, nt in enumerate(_hits(notes)):
        dsp.place(buf, tb2n(nt["tb"]), ride_hit(nt.get("v", 0.7), rng_for(name, i)))
    return _stereo(buf)


def render_crash(notes, n_total, name="crash"):
    buf = np.zeros((n_total, 2))
    for i, nt in enumerate(_hits(notes)):
        dsp.place(buf, tb2n(nt["tb"]), crash_hit(nt.get("v", 0.9), rng_for(name, i)))
    return buf


def render_toms(notes, n_total, name="toms"):
    buf = np.zeros((n_total, 2))
    for i, nt in enumerate(_hits(notes)):
        dsp.place(buf, tb2n(nt["tb"]), tom_hit(int(nt.get("p", 47)), nt.get("v", 0.8), rng_for(name, i)))
    return buf
