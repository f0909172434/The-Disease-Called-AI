"""
WORLD stage: put the exact target pitch on Kokoro's range-compressed render, and the
spectral tools the vocal styles are built from.

Because we *designed* the F0 that Kokoro sang, the analysis does not need a pitch tracker:
CheapTrick (spectral envelope) and D4C (aperiodicity) are driven by the designed native
contour, which removes octave errors and voicing glitches from the chain. The synthesis
then uses the target contour with the same envelope, i.e. a formant-preserving transpose.
"""
from __future__ import annotations

import numpy as np
import pyworld as pw
from scipy.signal import stft, istft

FS = 24000
FP_MS = 5.0
HOP = int(FS * FP_MS / 1000)          # 120 samples


def n_world_frames(n_samples: int) -> int:
    return n_samples // HOP + 1


def fit(curve: np.ndarray, n: int, fill: float = 0.0) -> np.ndarray:
    """Pad / trim a per-frame curve to n frames."""
    if len(curve) >= n:
        return curve[:n].copy()
    return np.concatenate([curve, np.full(n - len(curve), fill)])


def analyze(x: np.ndarray, f0_hz: np.ndarray):
    """Spectral envelope + aperiodicity of `x`, given its (designed) F0 per 5 ms frame."""
    x = x.astype(np.float64)
    n = n_world_frames(len(x))
    f0 = fit(np.asarray(f0_hz, np.float64), n)
    t = np.arange(n) * FP_MS / 1000.0
    sp = pw.cheaptrick(x, f0, t, FS)
    ap = pw.d4c(x, f0, t, FS)
    return f0, sp, ap


def track_f0(x: np.ndarray, fs: int = FS, lo: float = 70.0, hi: float = 1100.0):
    """Independent pitch tracker (Harvest) for QA."""
    f0, t = pw.harvest(x.astype(np.float64), fs, f0_floor=lo, f0_ceil=hi, frame_period=FP_MS)
    return f0, t


def synthesize(f0_hz: np.ndarray, sp: np.ndarray, ap: np.ndarray) -> np.ndarray:
    n = sp.shape[0]
    return pw.synthesize(fit(np.asarray(f0_hz, np.float64), n), np.ascontiguousarray(sp),
                         np.ascontiguousarray(ap), FS, FP_MS).astype(np.float32)


def freq_axis(sp: np.ndarray) -> np.ndarray:
    return np.linspace(0, FS / 2, sp.shape[1])


def formant_warp(sp: np.ndarray, ratio: float) -> np.ndarray:
    """Shift formants by `ratio` (1.03 = +3 %): sp'(f) = sp(f / ratio)."""
    if abs(ratio - 1.0) < 1e-4:
        return sp
    f = freq_axis(sp)
    src = np.clip(f / ratio, 0, f[-1])
    out = np.empty_like(sp)
    for i in range(sp.shape[0]):
        out[i] = np.interp(src, f, sp[i])
    return out


def tilt(sp: np.ndarray, db_per_oct: float, pivot_hz: float = 1000.0,
         lo_hz: float = 0.0) -> np.ndarray:
    """Spectral tilt (brightness) applied to the envelope, above `lo_hz`."""
    f = np.maximum(freq_axis(sp), 1.0)
    g_db = db_per_oct * np.log2(np.maximum(f, max(lo_hz, 1.0)) / pivot_hz)
    g_db = np.where(f < lo_hz, db_per_oct * np.log2(max(lo_hz, 1.0) / pivot_hz), g_db)
    return sp * (10 ** (g_db / 10.0))[None, :]


def breathy(ap: np.ndarray, amount: float, from_hz: float = 2500.0) -> np.ndarray:
    """Raise aperiodicity above `from_hz` (more air in the voice). amount 0..1."""
    f = np.linspace(0, FS / 2, ap.shape[1])
    w = np.clip((f - from_hz) / 3000.0, 0, 1) * amount
    return 1.0 - (1.0 - ap) * (1.0 - w)[None, :]


def vocoder_layer(f0_hz: np.ndarray, sp: np.ndarray, n_samples: int, seed: int = 0,
                  pulse_mix: float = 0.35) -> np.ndarray:
    """Classic vocoder sheen: a band-limited saw (+ a little pulse) at the target pitch,
    whitened, then shaped by the voice's spectral envelope. Silent where unvoiced."""
    n = sp.shape[0]
    f0 = fit(np.asarray(f0_hz, np.float64), n)
    # sample-rate F0 and phase
    tf = np.arange(n) * HOP
    ts = np.arange(n_samples)
    f0s = np.interp(ts, tf, f0)
    voiced = f0s > 0
    f0s = np.where(voiced, f0s, np.interp(ts, ts[voiced], f0s[voiced]) if voiced.any() else 0)
    phase = np.cumsum(f0s / FS) % 1.0
    # PolyBLEP saw + pulse (alias-reduced)
    dt = np.clip(f0s / FS, 1e-6, 0.5)

    def blep(p):
        y = np.zeros_like(p)
        a = p < dt
        y[a] = (p[a] / dt[a]) * 2 - (p[a] / dt[a]) ** 2 - 1
        b = p > 1 - dt
        q = (p[b] - 1) / dt[b]
        y[b] = q * q + 2 * q + 1
        return y

    saw = 2 * phase - 1 - blep(phase)
    p2 = (phase + 0.5) % 1.0
    pulse = saw - (2 * p2 - 1 - blep(p2))           # 50 % pulse from two saws
    car = (1 - pulse_mix) * saw + pulse_mix * 0.5 * pulse
    car *= voiced
    # whiten the carrier and impose the envelope frame by frame (STFT at the WORLD hop)
    nfft = (sp.shape[1] - 1) * 2
    _, _, C = stft(car, FS, nperseg=nfft, noverlap=nfft - HOP, boundary="even", padded=True)
    env_c = np.sqrt(np.maximum(np.abs(C) ** 2, 1e-12))
    from scipy.ndimage import uniform_filter1d
    env_c = uniform_filter1d(env_c, size=9, axis=0) + 1e-6       # smooth carrier spectrum
    m = min(C.shape[1], n)
    E = np.sqrt(sp[:m].T)                                           # (bins, frames)
    Y = C[:, :m] / env_c[:, :m] * E
    _, y = istft(Y, FS, nperseg=nfft, noverlap=nfft - HOP, boundary=True)
    y = y[:n_samples]
    if len(y) < n_samples:
        y = np.pad(y, (0, n_samples - len(y)))
    return y.astype(np.float32)
