"""Objective QA for the master: loudness / peak report and spectrograms (docs/06 §8).

Everything here is measurement, so the mix can be judged without ears:
BS.1770-4 integrated / short-term / momentary loudness, LRA, 4x-oversampled true peak,
crest factor, stereo correlation, band balance and per-section / per-bus loudness.
"""
from __future__ import annotations

import json
import os

import numpy as np
from scipy import signal

import dsp
from common import END_TIME, N_TOTAL, QA_DIR, SR

BANDS = [(20, 60, "sub"), (60, 250, "low"), (250, 2000, "mid"), (2000, 6000, "presence"),
         (6000, 12000, "brilliance"), (12000, 20000, "air")]


def band_balance(x: np.ndarray) -> dict:
    """Share of signal power per band, in dB relative to the total."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    if not np.any(m):
        return {}
    f, p = signal.welch(m, SR, nperseg=8192)
    tot = p[(f >= 20) & (f < 20000)].sum() + 1e-30
    return {name: round(float(10 * np.log10(p[(f >= a) & (f < b)].sum() / tot + 1e-12)), 1)
            for a, b, name in BANDS}


def section_stats(x: np.ndarray, power100: np.ndarray, s0: float, s1: float) -> dict:
    a, b = int(s0 * SR), int(min(s1, END_TIME) * SR)
    seg = x[a:b]
    h0, h1 = int(s0 * 10), int(min(s1, END_TIME) * 10)
    p = power100[h0:h1]
    st = dsp.short_term_lufs(power100=power100)[h0:h1]
    rms = np.sqrt(np.mean(seg ** 2)) + 1e-12
    pk = np.abs(seg).max() + 1e-12
    return {
        "lufs": round(dsp.integrated_lufs(power100=p), 2) if p.size >= 4 else None,
        "short_term_max": round(float(st.max()), 2) if st.size else None,
        "true_peak_dbtp": round(dsp.true_peak_db(seg), 2) if seg.size else None,
        "crest_db": round(float(20 * np.log10(pk / rms)), 2),
        "bands_db": band_balance(seg),
    }


def report(master: np.ndarray, sections, bus_power: dict | None = None, extra: dict | None = None,
           path: str | None = None) -> dict:
    """Write the loudness/peak report JSON and return it."""
    p100 = dsp.k_weighted_power(master)
    tp = dsp.true_peak_db(master)
    integ = dsp.integrated_lufs(power100=p100)
    try:
        import pyloudnorm as pyln
        integ_pyln = float(pyln.Meter(SR).integrated_loudness(master.astype(np.float64)))
    except Exception:                                          # pragma: no cover
        integ_pyln = None
    rms = np.sqrt(np.mean(master ** 2))
    corr = float(np.corrcoef(master[:, 0], master[:, 1])[0, 1])
    rep = {
        "file": "music/build/master.wav",
        "duration_s": round(master.shape[0] / SR, 6),
        "samples": int(master.shape[0]),
        "sample_rate": SR,
        "integrated_lufs": round(integ, 2),
        "integrated_lufs_pyloudnorm": round(integ_pyln, 2) if integ_pyln is not None else None,
        "true_peak_dbtp": round(tp, 2),
        "sample_peak_dbfs": round(float(dsp.a2db(np.abs(master).max())), 2),
        "loudness_range_lu": round(dsp.loudness_range(power100=p100), 2),
        "short_term_max_lufs": round(float(dsp.short_term_lufs(power100=p100).max()), 2),
        "momentary_max_lufs": round(float(dsp.momentary_lufs(power100=p100).max()), 2),
        "crest_factor_db": round(float(dsp.a2db(np.abs(master).max() / (rms + 1e-12))), 2),
        "plr_db": round(tp - integ, 2),
        "stereo_correlation": round(corr, 3),
        "dc_offset": [round(float(master[:, c].mean()), 7) for c in range(2)],
        "clipped_samples": int(np.sum(np.abs(master) >= 0.99999)),
        "bands_db": band_balance(master),
        "sections": {},
    }
    for s in sections:
        st = section_stats(master, p100, s.start, s.end)
        st.update({"name": s.name, "start_s": round(s.start, 3), "end_s": round(s.end, 3)})
        if bus_power:
            st["bus_lufs"] = {}
            for name, bp in bus_power.items():
                lv = dsp.integrated_lufs(power100=bp[int(s.start * 10): int(s.end * 10)])
                st["bus_lufs"][name] = round(lv, 1) if lv > -100 else None
        rep["sections"][s.id] = st
    rep["gates"] = {
        "integrated_lufs_-11_pm1": bool(abs(integ + 11.0) <= 1.0),
        "true_peak_le_-1.0_dbtp": bool(tp <= -1.0),
        "no_clipping": rep["clipped_samples"] == 0,
        "duration_215.000s": master.shape[0] == N_TOTAL,
    }
    if extra:
        rep.update(extra)
    if path:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump(rep, f, indent=1, ensure_ascii=False)
    return rep


# ============================================================================ plots
def _plt():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    return plt


def spectrogram(x: np.ndarray, path: str, title: str, t0: float = 0.0, sections=None,
                nfft: int = 4096, range_db: float = 100.0):
    """Log-frequency power spectrogram (dB re a full-scale sine per bin), auto-scaled to
    the loudest bin, optionally with section markers."""
    plt = _plt()
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = nfft // 4 if m.shape[0] < 60 * SR else nfft // 2
    f, t, S = signal.spectrogram(m, SR, window="hann", nperseg=nfft, noverlap=nfft - hop, mode="psd")
    S = 10 * np.log10(S * SR / 2 + 1e-14)              # ~dB re full-scale sine per bin
    vmax = float(np.ceil(np.percentile(S, 99.95) / 5.0) * 5.0)
    fig, ax = plt.subplots(figsize=(16 if m.shape[0] > 60 * SR else 12, 5))
    im = ax.pcolormesh(t + t0, f, S, vmin=vmax - range_db, vmax=vmax, shading="auto", cmap="magma",
                       rasterized=True)
    ax.set_yscale("log")
    ax.set_ylim(25, 20000)
    ax.set_xlabel("time (s)")
    ax.set_ylabel("Hz")
    ax.set_title(title)
    fig.colorbar(im, ax=ax, label="dB")
    if sections:
        for s in sections:
            ax.axvline(s.start, color="cyan", lw=0.6, alpha=0.7)
            ax.text(s.start + 0.3, 16500, s.id, color="cyan", fontsize=7)
    fig.tight_layout()
    fig.savefig(path, dpi=80)
    plt.close(fig)


def loudness_timeline(master: np.ndarray, path: str, sections, gain_db: np.ndarray | None = None,
                      target: float = -11.0):
    plt = _plt()
    p100 = dsp.k_weighted_power(master)
    st = dsp.short_term_lufs(power100=p100)
    mo = dsp.momentary_lufs(power100=p100)
    t = np.arange(st.size) / 10.0
    hop = SR // 10
    nb = master.shape[0] // hop
    tp = dsp.a2db(dsp.true_peak_env(master)[: nb * hop].reshape(nb, hop).max(axis=1))
    fig, ax = plt.subplots(2, 1, figsize=(16, 7), sharex=True,
                           gridspec_kw={"height_ratios": [3, 1.3]})
    ax[0].plot(t, mo, lw=0.5, color="#888", label="momentary")
    ax[0].plot(t, st, lw=1.2, color="#d33", label="short-term")
    ax[0].plot(np.arange(tp.size) / 10.0, tp, lw=0.6, color="#36c", label="true peak (dBTP)")
    ax[0].axhline(target, color="k", ls="--", lw=0.8, label=f"target {target} LUFS integrated")
    ax[0].axhline(-1.0, color="#36c", ls=":", lw=0.8)
    ax[0].set_ylim(-60, 2)
    ax[0].legend(loc="lower right", fontsize=8)
    ax[0].set_ylabel("LUFS / dBTP")
    for s in sections:
        for a in ax:
            a.axvline(s.start, color="#0aa", lw=0.5, alpha=0.6)
        ax[0].text(s.start + 0.3, 0.0, s.id, fontsize=7, color="#077")
    if gain_db is not None:
        g = gain_db[: nb * hop].reshape(nb, hop).min(axis=1)
        ax[1].plot(np.arange(g.size) / 10.0, g, lw=0.6, color="#a50")
        ax[1].set_ylabel("limiter gain dB")
        ax[1].set_ylim(min(-6.0, float(g.min()) - 0.5), 0.5)
    ax[1].set_xlabel("time (s)")
    fig.tight_layout()
    fig.savefig(path, dpi=80)
    plt.close(fig)


def write_spectrograms(master: np.ndarray, sections, out_dir: str = QA_DIR):
    os.makedirs(out_dir, exist_ok=True)
    spectrogram(master, os.path.join(out_dir, "spectrogram_full.png"),
                "The Disease Called AI -- master, full length", sections=sections, nfft=8192)
    for s in sections:
        a, b = int(s.start * SR), int(min(s.end, END_TIME) * SR)
        spectrogram(master[a:b], os.path.join(out_dir, f"spectrogram_{s.id}_{s.name}.png"),
                    f"{s.id} {s.name}  ({s.start:.2f}-{s.end:.2f} s)", t0=s.start, nfft=4096)
