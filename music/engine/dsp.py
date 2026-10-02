"""DSP toolkit: filters, oscillators, envelopes, dynamics, space, transport and meters.

Conventions
-----------
* Audio is float, shape (n,) for mono or (n, 2) for stereo, at common.SR.
* Static filters are RBJ-cookbook / Butterworth biquads run by a numba TDF-II cascade
  with a built-in -360 dBFS denormal guard (silences never slow the recursion down);
  filters whose cut-off moves per sample use a topology-preserving (Zavalishin/Simper)
  state-variable filter, stable under audio-rate modulation.
* Loudness follows ITU-R BS.1770-4 / EBU R128 (K-weighting, gating, LRA); true peak is
  measured with polyphase oversampling.
* Oscillators are phase accumulators in float64 with PolyBLEP band-limiting, so
  glides and vibrato are just a per-sample frequency array.
"""
from __future__ import annotations

import numpy as np
from numba import njit
from scipy import signal

from common import SR

TWO_PI = 2.0 * np.pi


# ============================================================================ conversions
def db2a(db):
    return 10.0 ** (np.asarray(db, dtype=np.float64) / 20.0)


def a2db(a, floor: float = 1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(a), floor))


def mtof(p):
    return 440.0 * 2.0 ** ((np.asarray(p, dtype=np.float64) - 69.0) / 12.0)


def cents(c):
    return 2.0 ** (np.asarray(c, dtype=np.float64) / 1200.0)


def absmax_ch(x: np.ndarray) -> np.ndarray:
    """Per-sample max |x| over channels (fast: avoids numpy's slow short-axis reduction)."""
    if x.ndim == 1:
        return np.abs(x)
    a = np.abs(x[:, 0])
    for c in range(1, x.shape[1]):
        np.maximum(a, np.abs(x[:, c]), out=a)
    return a


# ============================================================================ static filters
def biquad(kind: str, f: float, q: float = 0.7071, gain_db: float = 0.0) -> np.ndarray:
    """One RBJ-cookbook biquad as an sos row. kind: lp hp bp peak lowshelf highshelf notch."""
    f = float(np.clip(f, 5.0, 0.499 * SR))
    w0 = TWO_PI * f / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    A = 10.0 ** (gain_db / 40.0)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bp":                      # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind in ("lowshelf", "highshelf"):
        # q is used as the shelf slope S (1.0 = steepest without overshoot)
        al = sw / 2.0 * np.sqrt((A + 1 / A) * (1 / q - 1) + 2)
        sa = 2 * np.sqrt(A) * al
        if kind == "lowshelf":
            b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw),
                 A * ((A + 1) - (A - 1) * cw - sa)]
            a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw),
                 (A + 1) + (A - 1) * cw - sa]
        else:
            b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw),
                 A * ((A + 1) + (A - 1) * cw - sa)]
            a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw),
                 (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.asarray(b) / a[0]
    a = np.asarray(a) / a[0]
    return np.array([[b[0], b[1], b[2], 1.0, a[1], a[2]]])


def butter(kind: str, f, order: int = 2) -> np.ndarray:
    """Butterworth sos ('lp', 'hp', 'bp' with f=(lo, hi))."""
    btype = {"lp": "lowpass", "hp": "highpass", "bp": "bandpass"}[kind]
    return signal.butter(order, f, btype=btype, fs=SR, output="sos")


def eq_chain(specs) -> np.ndarray | None:
    """Build one sos array from a list of specs.

    ('hp', f[, order]) / ('lp', f[, order])  -> Butterworth
    ('peak', f, gain_db, q) / ('lowshelf'|'highshelf', f, gain_db[, slope]) / ('bp'|'notch', f, q)
    """
    rows = []
    for s in specs:
        kind = s[0]
        if kind in ("hp", "lp"):
            rows.append(butter(kind, s[1], s[2] if len(s) > 2 else 2))
        elif kind == "peak":
            rows.append(biquad("peak", s[1], s[3] if len(s) > 3 else 1.0, s[2]))
        elif kind in ("lowshelf", "highshelf"):
            rows.append(biquad(kind, s[1], s[3] if len(s) > 3 else 1.0, s[2]))
        elif kind in ("bp", "notch"):
            rows.append(biquad(kind, s[1], s[2] if len(s) > 2 else 1.0))
        else:
            raise ValueError(kind)
    return np.vstack(rows) if rows else None


_GUARD = np.random.default_rng(7).choice([-1e-18, 1e-18], 1 << 16)


def denormal_guard(x: np.ndarray) -> np.ndarray:
    """Add a fixed +-1e-18 (-360 dBFS) pattern so IIR states never decay into the
    denormal range during silences (which would slow the recursion ~100x)."""
    if x.shape[0] < 4096:
        return x
    g = np.resize(_GUARD, x.shape[0])
    return x + (g if x.ndim == 1 else g[:, None])


@njit(cache=True)
def _sos_cascade(x, sos):
    """Transposed direct-form II biquad cascade over (n, channels) audio.

    A -360 dBFS alternating dither is injected at every section input, so filter states
    never decay into the denormal range in silences (no slow-down, inaudible)."""
    n, nch = x.shape
    k = sos.shape[0]
    y = np.empty_like(x)
    z1 = np.zeros((k, nch))
    z2 = np.zeros((k, nch))
    g = 1e-18
    for i in range(n):
        g = -g
        for c in range(nch):
            v = x[i, c]
            for s in range(k):
                v += g
                out = sos[s, 0] * v + z1[s, c]
                z1[s, c] = sos[s, 1] * v - sos[s, 4] * out + z2[s, c]
                z2[s, c] = sos[s, 2] * v - sos[s, 5] * out
                v = out
            y[i, c] = v
    return y


def filt(x: np.ndarray, sos) -> np.ndarray:
    """Causal sos filtering along time (mono or stereo), denormal-safe."""
    if sos is None:
        return x
    x = np.asarray(x)
    xx = np.ascontiguousarray(x.reshape(x.shape[0], -1), dtype=np.float64)
    y = _sos_cascade(xx, np.ascontiguousarray(sos, dtype=np.float64))
    return y.reshape(x.shape)


def filt0(x: np.ndarray, sos) -> np.ndarray:
    """Zero-phase sos filtering (offline only: used for crossovers that must sum flat)."""
    if sos is None:
        return x
    return signal.sosfiltfilt(sos, denormal_guard(np.asarray(x, dtype=np.float64)), axis=0)


def eq(x: np.ndarray, specs) -> np.ndarray:
    return filt(x, eq_chain(specs))


# ============================================================================ time-varying SVF
@njit(cache=True)
def _svf_tv(x, g, k, mode):
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    guard = 1e-18
    for i in range(n):
        gi = g[i]
        ki = k[i]
        a1 = 1.0 / (1.0 + gi * (gi + ki))
        a2 = gi * a1
        a3 = gi * a2
        guard = -guard                   # -360 dBFS alternating dither: no denormal states
        v3 = x[i] + guard - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = ki * v1               # unity-peak band-pass
        else:
            y[i] = x[i] - ki * v1 - v2
    return y


def svf(x: np.ndarray, fc, q=0.7071, mode: str = "lp", poles: int = 2) -> np.ndarray:
    """Per-sample modulated filter. fc and q may be scalars or arrays of len(x).

    poles=4 cascades two sections with Butterworth Q's (scaled by q/0.7071) for a
    24 dB/oct slope; resonance then lives in the second section.
    """
    n = x.shape[0]
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), (n,))
    g = np.tan(np.pi * np.clip(fc, 10.0, 0.47 * SR) / SR)
    qv = np.broadcast_to(np.asarray(q, dtype=np.float64), (n,))
    m = {"lp": 0, "bp": 1, "hp": 2}[mode]
    stages = [qv] if poles == 2 else [np.full(n, 0.5412), 1.3066 * qv / 0.7071]
    out = np.asarray(x, dtype=np.float64)
    for qs in stages:
        k = 1.0 / np.maximum(qs, 0.05)
        if out.ndim == 1:
            out = _svf_tv(out, g, k, m)
        else:
            out = np.stack([_svf_tv(np.ascontiguousarray(out[:, c]), g, k, m)
                            for c in range(out.shape[1])], axis=1)
    return out


# ============================================================================ oscillators
def phase(f, n: int | None = None, phase0: float = 0.0):
    """Phase in cycles [0, 1) and per-sample increment for a (possibly varying) frequency."""
    f = np.asarray(f, dtype=np.float64)
    if f.ndim == 0:
        f = np.full(n, float(f))
    inc = f / SR
    ph = np.cumsum(inc)
    ph -= inc                            # first sample sits exactly at phase0
    ph += phase0
    return ph - np.floor(ph), inc


def _polyblep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]
    out[m] = x * x + x + x + 1.0
    return out


def saw(f, n=None, phase0=0.0):
    ph, dt = phase(f, n, phase0)
    return 2.0 * ph - 1.0 - _polyblep(ph, dt)


def pulse(f, pw=0.5, n=None, phase0=0.0):
    """Band-limited pulse (difference of two BLEP saws): zero-mean, peak-to-peak 2."""
    ph, dt = phase(f, n, phase0)
    s1 = 2.0 * ph - 1.0 - _polyblep(ph, dt)
    ph2 = ph + pw
    ph2 -= np.floor(ph2)
    s2 = 2.0 * ph2 - 1.0 - _polyblep(ph2, dt)
    return s1 - s2


def sine(f, n=None, phase0=0.0):
    ph, _ = phase(f, n, phase0)
    return np.sin(TWO_PI * ph)


# ============================================================================ noise
def pink(n: int, rng: np.random.Generator, ch: int = 1, slope_db: float = -3.0) -> np.ndarray:
    """Coloured noise by spectral shaping (slope in dB/octave; -3 = pink, -6 = brown)."""
    out = []
    for _ in range(ch):
        X = np.fft.rfft(rng.standard_normal(n))
        fr = np.fft.rfftfreq(n, 1.0 / SR)
        fr[0] = fr[1]
        X *= (fr / 1000.0) ** (slope_db / 6.0206)
        y = np.fft.irfft(X, n)
        out.append(y / (np.std(y) + 1e-12))
    return out[0] if ch == 1 else np.stack(out, axis=1)


# ============================================================================ shaping
def tanh_sat(x, drive: float = 1.0, bias: float = 0.0):
    """Normalised tanh waveshaper; a small bias adds even harmonics (tube-like)."""
    if bias:
        return (np.tanh(drive * x + bias) - np.tanh(bias)) / np.tanh(drive)
    return np.tanh(drive * x) / np.tanh(drive)


def ftz(x: np.ndarray, floor: float = 1e-25) -> np.ndarray:
    """Flush denormal-range values to zero (IIR tails in silences otherwise crawl through
    the denormal range and slow every following multiply down ~100x)."""
    x[np.abs(x) < floor] = 0.0
    return x


def oversample(fn, x: np.ndarray, factor: int = 4) -> np.ndarray:
    """Run a non-linearity at `factor`x the rate to keep its harmonics from aliasing.

    Channels are processed as contiguous float32 vectors (fast polyphase filtering)."""
    def one(v):
        up = signal.resample_poly(ftz(np.array(v, dtype=np.float32)), factor, 1)
        y = np.asarray(fn(up), dtype=np.float32)
        return signal.resample_poly(y, 1, factor)[: v.shape[0]].astype(np.float64)
    if x.ndim == 1:
        return one(x)
    return np.stack([one(x[:, c]) for c in range(x.shape[1])], axis=1)


def fade(x: np.ndarray, fade_in: int = 0, fade_out: int = 0) -> np.ndarray:
    """Raised-cosine fades (in samples), in place on a copy."""
    x = np.array(x, dtype=np.float64, copy=True)
    n = x.shape[0]
    if fade_in > 0:
        k = min(fade_in, n)
        w = 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k)
        x[:k] *= w if x.ndim == 1 else w[:, None]
    if fade_out > 0:
        k = min(fade_out, n)
        w = 0.5 + 0.5 * np.cos(np.pi * (np.arange(k) + 1) / k)
        x[n - k:] *= w if x.ndim == 1 else w[:, None]
    return x


def place(buf: np.ndarray, start: int, sig: np.ndarray) -> None:
    """Add `sig` into `buf` at sample `start`, clipping to the buffer bounds."""
    n = buf.shape[0]
    a = max(start, 0)
    b = min(start + sig.shape[0], n)
    if b <= a:
        return
    seg = sig[a - start: b - start]
    if buf.ndim == 2 and seg.ndim == 1:
        buf[a:b] += seg[:, None]
    else:
        buf[a:b] += seg


# ============================================================================ stereo
def pan_gains(p: float):
    """Constant-power (-3 dB centre) pan law, p in [-1, 1]."""
    th = (np.clip(p, -1, 1) + 1.0) * np.pi / 4.0
    return np.cos(th), np.sin(th)


def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Mono -> stereo with constant power, or balance a stereo signal (centre = unity)."""
    if x.ndim == 1:
        gl, gr = pan_gains(p)
        return np.stack([x * gl, x * gr], axis=1)
    if p == 0:
        return x
    gl = min(1.0, 1.0 - p)
    gr = min(1.0, 1.0 + p)
    return x * np.array([gl, gr])


def width(x: np.ndarray, w: float) -> np.ndarray:
    """Mid/side width: 0 = mono, 1 = unchanged, >1 wider."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1]) * w
    return np.stack([m + s, m - s], axis=1)


def mono_below(x: np.ndarray, f: float = 120.0) -> np.ndarray:
    """Collapse the low end to mono (keeps sub/kick energy centred and phase-safe)."""
    sos = butter("lp", f, 4)
    lo = filt0(x, sos)
    hi = x - lo
    m = lo.mean(axis=1, keepdims=True)
    return hi + m


# ============================================================================ envelopes / dynamics
@njit(cache=True)
def _follow(x, att, rel):
    n = x.shape[0]
    y = np.empty(n)
    e = 0.0
    for i in range(n):
        v = x[i]
        c = att if v > e else rel
        e = c * e + (1.0 - c) * v
        y[i] = e
    return y


def coef(ms: float) -> float:
    """One-pole smoothing coefficient for a time constant in milliseconds."""
    return float(np.exp(-1.0 / (max(ms, 1e-3) * 1e-3 * SR)))


def envelope(x: np.ndarray, attack_ms: float, release_ms: float, rms: bool = False) -> np.ndarray:
    """Peak (or RMS) envelope of a mono/stereo signal (max over channels)."""
    a = absmax_ch(x)
    if rms:
        a = a * a
    e = _follow(a.astype(np.float64), coef(attack_ms), coef(release_ms))
    return np.sqrt(e) if rms else e


@njit(cache=True)
def _gain_computer(det_db, thr, ratio, knee, att, rel):
    n = det_db.shape[0]
    gr = np.empty(n)
    g = 0.0
    slope = 1.0 - 1.0 / ratio
    for i in range(n):
        over = det_db[i] - thr
        if 2.0 * over < -knee:
            target = 0.0
        elif 2.0 * abs(over) <= knee:
            target = slope * (over + knee / 2.0) ** 2 / (2.0 * knee)
        else:
            target = slope * over
        if target > g:
            g = att * g + (1.0 - att) * target
        else:
            g = rel * g + (1.0 - rel) * target
        gr[i] = g
    return gr


def compressor(x, thr_db, ratio, attack_ms, release_ms, knee_db=6.0, makeup_db=0.0,
               sidechain=None, rms_ms: float | None = None, sc_hp: float | None = None):
    """Feed-forward, stereo-linked compressor. Returns (output, gain_reduction_db)."""
    det = x if sidechain is None else sidechain
    if sc_hp:
        det = filt(det, butter("hp", sc_hp, 2))
    a = absmax_ch(det)
    if rms_ms:
        a = np.sqrt(_follow((a * a).astype(np.float64), coef(rms_ms), coef(rms_ms)))
    gr = _gain_computer(a2db(a), float(thr_db), float(ratio), float(knee_db),
                        coef(attack_ms), coef(release_ms))
    g = db2a(makeup_db - gr)
    return (x * (g if x.ndim == 1 else g[:, None])), gr


def level_percentile_db(x: np.ndarray, pct: float, win_ms: float = 50.0) -> float:
    """Percentile of a short-window RMS level over the active part of a signal (dBFS)."""
    m = 0.5 * (x[:, 0] + x[:, 1]) if x.ndim == 2 else x
    w = max(1, int(win_ms * 1e-3 * SR))
    nb = m.shape[0] // w
    r = np.sqrt(np.mean(m[: nb * w].reshape(nb, w) ** 2, axis=1) + 1e-20)
    db = 20 * np.log10(r)
    act = db[db > db.max() - 40]
    return float(np.percentile(act, pct)) if act.size else -120.0


def kick_duck_env(hits, n: int, depth_db: float, attack_ms: float = 2.0, hold_ms: float = 15.0,
                  release_ms: float = 140.0, curve: float = 1.6) -> np.ndarray:
    """A sidechain 'volume shaper' driven by the kick's score positions.

    hits: iterable of (sample_index, velocity). Each hit pulls the gain down to
    -depth_db*velocity (fully ducked exactly on the hit), holds, then swells back with
    a convex power curve (curve > 1 stays ducked through the kick body, then rises:
    the classic pump). Overlapping hits take the deeper duck. Deterministic, latency-free.
    """
    g = np.ones(n)
    a = max(1, int(attack_ms * 1e-3 * SR))
    h = int(hold_ms * 1e-3 * SR)
    r = max(1, int(release_ms * 1e-3 * SR))
    for start, vel in hits:
        dmin = db2a(-depth_db * vel)
        att = 1.0 - (1.0 - dmin) * (np.arange(a) / a)
        rel = dmin + (1.0 - dmin) * (np.arange(r) / r) ** curve
        shape = np.concatenate([att, np.full(h, dmin), rel])
        s0 = start - a                      # fully ducked exactly on the hit
        lo, hi = max(0, s0), min(n, s0 + shape.size)
        if hi > lo:
            g[lo:hi] = np.minimum(g[lo:hi], shape[lo - s0: hi - s0])
    return g


# ============================================================================ limiter
@njit(cache=True)
def _limiter_gain(req, look, rel):
    n = req.shape[0]
    # 1) instant attack, exponential release towards unity, never above the requirement
    h = np.empty(n)
    g = 1.0
    for i in range(n):
        g = g + (1.0 - rel) * (1.0 - g)
        if req[i] < g:
            g = req[i]
        h[i] = g
    # 2) forward-looking sliding minimum over `look` samples (monotonic deque)
    hm = np.empty(n)
    dq = np.empty(n, dtype=np.int64)
    head = 0
    tail = 0
    j = 0
    for i in range(n):
        lim = i + look - 1
        while j <= lim and j < n:
            while tail > head and h[dq[tail - 1]] >= h[j]:
                tail -= 1
            dq[tail] = j
            tail += 1
            j += 1
        while dq[head] < i:
            head += 1
        hm[i] = h[dq[head]]
    # 3) box smoothing over the same window (backward-looking): gain arrives in time,
    #    and at every peak sample the smoothed gain is <= the required gain.
    out = np.empty(n)
    acc = 0.0
    for i in range(n):
        acc += hm[i]
        if i >= look:
            acc -= hm[i - look]
        if i < look - 1:                 # pad the window start with hm[0] (<= every h in it)
            out[i] = (acc + (look - 1 - i) * hm[0]) / look
        else:
            out[i] = acc / look
    return out


_TP_TAPS = 64                                             # taps per polyphase branch
_TP_FIR = (signal.firwin(_TP_TAPS * 4, 0.975 / 4, window=("kaiser", 10.0)) * 4).astype(np.float32)


def _interp_phases(v: np.ndarray) -> list[np.ndarray]:
    """4x interpolation by polyphase FIR: returns the 4 inter-sample phases, each aligned
    so element m sits at time m + (2k+1)/8 samples (between samples m and m+1)."""
    v = np.asarray(v, dtype=np.float32)
    n = v.shape[0]
    # branch k output m sits at time m + (k - D)/4 with D = (4*taps - 1)/2, so an offset
    # of taps/2 puts every branch between samples m and m+1 (m + 1/8 ... m + 7/8).
    shift = _TP_TAPS // 2
    return [signal.oaconvolve(v, _TP_FIR[k::4], mode="full")[shift: shift + n] for k in range(4)]


def true_peak_env(x: np.ndarray, os: int = 4) -> np.ndarray:
    """Per-sample true-peak estimate: max |x| over channels and 4x interpolated points."""
    env = absmax_ch(x).astype(np.float32)
    chans = [x] if x.ndim == 1 else [x[:, c] for c in range(x.shape[1])]
    for v in chans:
        for ph in _interp_phases(v):
            np.maximum(env, np.abs(ph), out=env)
    return env


def true_peak_db(x: np.ndarray, os: int = 8) -> float:
    """True peak in dBTP for reporting: 8x polyphase oversampling per channel (stricter
    than the 4x minimum of ITU-R BS.1770-4)."""
    chans = [x] if x.ndim == 1 else [x[:, c] for c in range(x.shape[1])]
    pk = 0.0
    for v in chans:
        up = signal.resample_poly(np.asarray(v, dtype=np.float64), os, 1, window=("kaiser", 10.0))
        pk = max(pk, float(np.abs(up).max()))
    return float(a2db(pk))


def limiter(x: np.ndarray, ceiling_db: float = -1.0, lookahead_ms: float = 1.5,
            release_ms: float = 90.0, os: int = 4):
    """Look-ahead true-peak brick-wall limiter. Returns (output, gain_db)."""
    ceil = db2a(ceiling_db)
    p = true_peak_env(x, os).astype(np.float64)
    req = np.minimum(1.0, ceil / np.maximum(p, 1e-12))
    look = max(2, int(lookahead_ms * 1e-3 * SR))
    g = _limiter_gain(req.astype(np.float64), look, coef(release_ms))
    return x * g[:, None], a2db(g)


# ============================================================================ space
def make_ir(t60: float, *, predelay_ms: float = 0.0, hf_ratio: float = 0.5, lf_ratio: float = 1.1,
            buildup_ms: float = 4.0, early: list | None = None, seed: int = 1,
            length: float | None = None, hp: float = 60.0, lp: float = 16000.0) -> np.ndarray:
    """Synthesise a stereo reverb impulse response from decaying band-split noise.

    Each octave band decays with its own T60 (lows ~lf_ratio*t60, highs down to
    hf_ratio*t60), the two channels use independent noise (a wide, decorrelated tail),
    `early` adds discrete reflections [(ms, gain, pan)], and the result is energy-
    normalised so send levels mean the same thing for every reverb.
    """
    rng = np.random.default_rng(seed)
    length = length or t60 * 1.15
    n = int(length * SR)
    pd = int(predelay_ms * 1e-3 * SR)
    t = np.arange(n) / SR
    centres = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    ir = np.zeros((n, 2))
    for fcen in centres:
        # T60 curve: lows a touch longer (lf_ratio at 125 Hz), highs progressively
        # shorter (hf_ratio at 16 kHz) -- the air absorption that makes tails sound real.
        octs = np.log2(fcen / 1000.0)
        if octs > 0:
            r = 1.0 + (hf_ratio - 1.0) * min(octs / 4.0, 1.0)
        else:
            r = 1.0 + (lf_ratio - 1.0) * min(-octs / 3.0, 1.0)
        tb60 = max(0.05, t60 * r)
        env = np.exp(-6.907755 * t / tb60)
        lo, hi = fcen / np.sqrt(2), min(fcen * np.sqrt(2), 0.45 * SR)
        sos = butter("bp", (lo, hi), 2)
        for c in range(2):
            ir[:, c] += filt(rng.standard_normal(n), sos) * env
    if buildup_ms > 0:
        ir *= (1.0 - np.exp(-t / (buildup_ms * 1e-3)))[:, None]
    ir = filt(ir, eq_chain([("hp", hp, 2), ("lp", lp, 2)]))
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) + 1e-12
    if early:
        er = np.zeros((n, 2))
        for ms, gain, pn in early:
            k = int(ms * 1e-3 * SR)
            if k < n:
                gl, gr = pan_gains(pn)
                er[k, 0] += gain * gl * 1.414
                er[k, 1] += gain * gr * 1.414
        er = filt(er, eq_chain([("lp", 7000, 2)]))
        ir = ir + er
        ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True)) + 1e-12
    return np.concatenate([np.zeros((pd, 2)), ir], axis=0)


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    """Quasi-stereo convolution: L->irL, R->irR (mono input feeds both)."""
    n = x.shape[0]
    xs = x if x.ndim == 2 else np.stack([x, x], axis=1)
    out = np.empty((n, 2), dtype=np.float32)
    for c in range(2):
        out[:, c] = signal.fftconvolve(xs[:, c].astype(np.float32), ir[:, c].astype(np.float32))[:n]
    return out


def feedback_delay(x: np.ndarray, delay_s: float, feedback: float, *, pingpong: bool = True,
                   hp: float = 300.0, lp: float = 5000.0, floor_db: float = -60.0) -> np.ndarray:
    """Tempo delay with filtered repeats. Ping-pong sends repeat 1 left, 2 right, ..."""
    n = x.shape[0]
    d = int(round(delay_s * SR))
    src = x.mean(axis=1) if (x.ndim == 2 and pingpong) else x
    sos = eq_chain([("hp", hp, 2), ("lp", lp, 2)])
    out = np.zeros((n, 2))
    echo = np.asarray(src, dtype=np.float64)
    k = 0
    g = 1.0
    while g > db2a(floor_db) and (k + 1) * d < n:
        k += 1
        echo = filt(echo, sos)
        echo = np.concatenate([np.zeros((d,) + echo.shape[1:]), echo[:-d]], axis=0)
        e = echo * g
        if pingpong:
            out[:, (k - 1) % 2] += e
        else:
            out += e if e.ndim == 2 else e[:, None]
        g *= feedback
    return out


@njit(cache=True)
def _mod_delay(x, base, depth, rate, phase0, sr):
    n = x.shape[0]
    y = np.zeros(n)
    for i in range(n):
        d = base + depth * np.sin(2.0 * np.pi * rate * i / sr + phase0)
        p = i - d
        k = int(np.floor(p))
        f = p - k
        if k >= 1 and k < n - 2:
            xm1 = x[k - 1]
            x0 = x[k]
            x1 = x[k + 1]
            x2 = x[k + 2]
            y[i] = x0 + 0.5 * f * (x1 - xm1 + f * (2.0 * xm1 - 5.0 * x0 + 4.0 * x1 - x2
                                                    + f * (3.0 * (x0 - x1) + x2 - xm1)))
    return y


def doubler(x: np.ndarray, ms=(9.0, 13.0), depth_ms: float = 1.2, rates=(0.21, 0.27)) -> np.ndarray:
    """Two slowly modulated short delays panned hard L/R (artificial double / widener)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    m = np.ascontiguousarray(m, dtype=np.float64)
    l = _mod_delay(m, ms[0] * 1e-3 * SR, depth_ms * 1e-3 * SR, rates[0], 0.0, float(SR))
    r = _mod_delay(m, ms[1] * 1e-3 * SR, depth_ms * 1e-3 * SR, rates[1], 1.7, float(SR))
    return np.stack([l, r], axis=1)


# ============================================================================ transport
@njit(cache=True)
def read_cubic(x, pos):
    """Catmull-Rom read of mono `x` at fractional positions `pos` (zero outside)."""
    n = x.shape[0]
    m = pos.shape[0]
    y = np.zeros(m)
    for i in range(m):
        p = pos[i]
        k = int(np.floor(p))
        f = p - k
        if k >= 1 and k < n - 2:
            xm1 = x[k - 1]
            x0 = x[k]
            x1 = x[k + 1]
            x2 = x[k + 2]
            y[i] = x0 + 0.5 * f * (x1 - xm1 + f * (2.0 * xm1 - 5.0 * x0 + 4.0 * x1 - x2
                                                    + f * (3.0 * (x0 - x1) + x2 - xm1)))
    return y


@njit(cache=True)
def _bitcrush(x, hold, step, wet):
    n = x.shape[0]
    ch = x.shape[1]
    y = np.empty_like(x)
    held = np.zeros(ch)
    acc = 1e9
    for i in range(n):
        acc += 1.0
        if acc >= hold[i]:
            acc -= hold[i]
            if acc > hold[i]:
                acc = 0.0
            for c in range(ch):
                held[c] = x[i, c]
        w = wet[i]
        for c in range(ch):
            if w <= 0.0:
                y[i, c] = x[i, c]
            else:
                v = held[c]
                s = step[i]
                if s > 0.0:
                    v = np.floor(v / s + 0.5) * s
                y[i, c] = w * v + (1.0 - w) * x[i, c]
    return y


def bitcrush(x: np.ndarray, amount: np.ndarray) -> np.ndarray:
    """Sample-rate + bit-depth reduction driven by a 0..1 lane (0 is bit-transparent)."""
    a = np.clip(amount, 0.0, 1.0)
    if not np.any(a > 0):
        return x
    hold = 1.0 + 15.0 * a ** 1.5                 # 48 kHz -> 3 kHz effective rate
    bits = 16.0 - 12.0 * a                       # 16 -> 4 bits
    step = np.where(a > 0, 2.0 / 2.0 ** bits, 0.0)
    wet = np.clip(a * 4.0, 0.0, 1.0)
    return _bitcrush(np.ascontiguousarray(x, dtype=np.float64), hold, step, wet)


# ============================================================================ loudness (BS.1770-4)
_K1 = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285,
                 1.0, -1.69065929318241, 0.73248077421585]])
_K2 = np.array([[1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])
K_SOS = np.vstack([_K1, _K2])                     # exact coefficients for 48 kHz


def k_weighted_power(x: np.ndarray, hop: int = SR // 10) -> np.ndarray:
    """Mean-square of the K-weighted signal per 100 ms hop, summed over channels."""
    xs = x if x.ndim == 2 else x[:, None]
    y = filt(xs, K_SOS)
    nb = y.shape[0] // hop
    ms = np.mean((y[: nb * hop] ** 2).reshape(nb, hop, y.shape[1]), axis=1)
    return ms.sum(axis=1)


def _blocks(power100: np.ndarray, k: int) -> np.ndarray:
    """Mean power over k consecutive 100 ms hops (400 ms -> momentary, 3 s -> short-term)."""
    if power100.size < k:
        return np.array([power100.mean()]) if power100.size else np.array([0.0])
    c = np.cumsum(np.concatenate([[0.0], power100]))
    return (c[k:] - c[:-k]) / k


def lufs_from_power(p: np.ndarray) -> np.ndarray:
    return -0.691 + 10.0 * np.log10(np.maximum(p, 1e-20))


def integrated_lufs(x: np.ndarray | None = None, power100: np.ndarray | None = None) -> float:
    """Gated integrated loudness (400 ms blocks, 75 % overlap, -70 LUFS / -10 LU gates)."""
    if power100 is None:
        power100 = k_weighted_power(x)
    blk = _blocks(power100, 4)
    l = lufs_from_power(blk)
    blk = blk[l > -70.0]
    if blk.size == 0:
        return -120.0
    rel = lufs_from_power(blk.mean()) - 10.0
    blk2 = blk[lufs_from_power(blk) > rel]
    return float(lufs_from_power(blk2.mean())) if blk2.size else -120.0


def short_term_lufs(x: np.ndarray | None = None, power100: np.ndarray | None = None) -> np.ndarray:
    """Short-term (3 s) loudness every 100 ms (value i covers hops i-29..i)."""
    if power100 is None:
        power100 = k_weighted_power(x)
    st = lufs_from_power(_blocks(power100, 30))
    return np.concatenate([np.full(29, st[0]), st])


def momentary_lufs(x: np.ndarray | None = None, power100: np.ndarray | None = None) -> np.ndarray:
    if power100 is None:
        power100 = k_weighted_power(x)
    m = lufs_from_power(_blocks(power100, 4))
    return np.concatenate([np.full(3, m[0]), m])


def loudness_range(x: np.ndarray | None = None, power100: np.ndarray | None = None) -> float:
    """EBU Tech 3342 LRA from short-term loudness (-70 abs gate, -20 LU relative gate)."""
    if power100 is None:
        power100 = k_weighted_power(x)
    st_p = _blocks(power100, 30)
    st = lufs_from_power(st_p)
    keep = st > -70
    if not np.any(keep):
        return 0.0
    rel = lufs_from_power(st_p[keep].mean()) - 20.0
    v = st[keep & (st > rel)]
    if v.size < 2:
        return 0.0
    return float(np.percentile(v, 95) - np.percentile(v, 10))
