#!/usr/bin/env python3
"""Mix and master: dry stems (+ vocals when present) -> release master, bus stems, QA.

    python3 music/engine/mix.py [--vox-dir DIR] [--no-vocals] [--no-plots]

Signal flow
-----------
  tracks/<t>.wav --loudness-normalise--> channel strip (fader = arrangement gain_db + trim,
      EQ, pan, kick-sidechain duck) --> drums | bass | music bus      (+ sends)
  tracks/fx_<type>.wav --> FX channel strip --> fx bus                (+ sends)
  stems/vox_*.wav --> vocal chains (HP, de-ess, comp, presence/air, exciter, AI doubler),
      measured riding against the band --> vocals bus                (+ sends)
  sends --> room / plate / hall / fx-hall convolution reverbs, tempo delays; every bus
      gets its own returns, so the bus stems sum to the pre-master mix.
  drums/bass/music: bus dynamics -> automation (music_lowpass_hz, bitcrush) ->
      transport FX (glitch_stutter, rewind, tape_stop; the last two also on vocals) ->
      silence gate (hard mute incl. tails) + outro tail fade; music ducks ~2 dB under
      the lead vocal.
  master: sum -> subsonic HP -> glue comp -> tonal EQ -> soft clip -> true-peak
      limiter, gain searched so integrated loudness = -11.0 LUFS; TP <= -1.0 dBTP.

Buses are rendered one at a time (each bus's sends become returns and are freed before
the next), stems are kept as float32, so the whole mix peaks at ~3 GB of RAM.

Writes music/build/master.wav (24-bit, exactly 215.000 s) + master.flac,
music/build/stems/{drums,bass,music,fx[,vocals]}.wav (post-fader bus stems) and
music/build/qa/ (loudness report JSON, spectrograms, loudness timeline, track balance).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import dsp  # noqa: E402
import qa  # noqa: E402
from common import (BEAT, BUILD, N_TOTAL, QA_DIR, SR, STEMS, TRACK_DIR, VOCAL_TIMING,  # noqa: E402
                    VOCALS_JSON, lane, load_arrangement, read_wav, sections, tb2n, write_wav)

# ============================================================================ the console
REF_LUFS = -20.0          # every dry stem is loudness-normalised to this before its fader
TARGET_LUFS = -11.0       # master integrated loudness
LIMIT_TP = -1.3           # limiter ceiling: 0.3 dB under the -1.0 dBTP gate (dither, codecs)

# Channel strips by track name (falls back to the instrument id). trim is added to the
# arrangement's gain_db; duck = kick-sidechain depth (dB) with its release (ms);
# sends are in dB relative to the post-fader channel.
CHANNELS = {
    "kick": dict(eq=[("hp", 32, 2), ("peak", 90, 2.0, 1.0), ("peak", 380, -3.0, 1.2),
                     ("peak", 3600, 2.0, 1.0)]),
    "snare": dict(eq=[("hp", 90, 2), ("peak", 200, 1.5, 1.2), ("peak", 900, -1.5, 1.5),
                      ("highshelf", 6000, 1.5)], sends={"room": -13, "plate": -24}),
    "clap": dict(eq=[("hp", 300, 2)], sends={"room": -12, "plate": -20}),
    "hat_closed": dict(eq=[("hp", 500, 2)], sends={"room": -26}),
    "hat_open": dict(eq=[("hp", 500, 2)], sends={"room": -22}),
    "ride": dict(eq=[("hp", 400, 2)], sends={"room": -24}),
    "crash": dict(eq=[("hp", 350, 2), ("highshelf", 9000, -1.0)], sends={"room": -20}),
    "toms": dict(eq=[("hp", 60, 2), ("peak", 4000, 2.0, 1.0)], sends={"room": -12}),
    "bass_synth": dict(eq=[("hp", 30, 2), ("peak", 250, -2.0, 1.0), ("peak", 900, 2.5, 1.0)],
                       duck=(6.0, 90)),
    "guitar_power": dict(eq=[("hp", 100, 2), ("peak", 160, -2.0, 1.0), ("peak", 3000, -1.0, 1.2)],
                         duck=(1.5, 120), sends={"room": -24, "hall": -26}),
    "saw_chords": dict(eq=[("hp", 180, 2), ("peak", 400, -2.0, 1.0)], duck=(6.0, 170),
                       sends={"hall": -16, "plate": -22}),
    "saw_lead": dict(eq=[("hp", 150, 2)], sends={"delay_d8": -14, "plate": -18, "hall": -20}),
    "lead_square": dict(eq=[("hp", 300, 2)], sends={"delay_d8": -12, "plate": -18}),
    "piano": dict(eq=[("hp", 80, 2), ("peak", 300, -1.5, 1.0), ("highshelf", 8000, 1.5)],
                  sends={"plate": -16, "hall": -18}),
    "pluck": dict(eq=[("hp", 150, 2)], sends={"delay_d8": -12, "hall": -18}),
    "strings": dict(eq=[("hp", 120, 2), ("peak", 3000, 1.0, 1.0)], duck=(2.0, 200), sends={"hall": -10}),
    "choir": dict(eq=[("hp", 150, 2), ("highshelf", 8000, 2.0)], sends={"hall": -8}),
    "music_box": dict(eq=[("hp", 300, 2), ("highshelf", 6000, 2.0)], sends={"hall": -6, "delay_d8": -14}),
    "pad_warm": dict(eq=[("hp", 120, 2)], duck=(4.0, 200), sends={"hall": -12}),
}
# Per-track fader trims (dB) on top of the arrangement's gain_db, set from the meter
# bridge (qa/track_balance.json): in the choruses the double-tracked guitars lead the
# band, bass ~2 LU under them, kick/snare ~3 LU under, supersaws/strings filling behind.
TRIMS = {"kick": -3.0, "snare": -1.4, "toms": 1.0, "crash": 2.0, "bass": 0.7, "guitar": 5.7,
         "saw_chords": 6.8, "saw_lead": 5.0, "square": 4.0, "strings": 5.0, "choir": 3.0,
         "piano": 5.0, "pluck": 4.0, "pad": 4.0, "musicbox": 6.0}
# Section fader rides (dB): the sustained bass would otherwise dominate the sparse sections.
RIDES = {"bass": {"S02": -1.5, "S06": -1.5, "S09": -3.0},
         "guitar": {"S08": 2.0}}      # chorus 2 guitars are mostly palm-muted chugs

# Story FX channels: level is relative to REF_LUFS (each FX-type stem is normalised).
FX_CHANNELS = {
    "heartbeat": dict(level=-4.5, sends={"room": -30}),
    "typing_click": dict(level=-4.0, sends={"room": -20}),
    "breath": dict(level=-8.0, sends={"room": -22}),
    "riser": dict(level=-2.0, sends={"hall": -14}),
    "downlifter": dict(level=-8.0, sends={"hall": -12}),
    "impact": dict(level=-3.0, sends={"fxhall": -8}),
    "reverse_cymbal": dict(level=-9.0, sends={"hall": -16}),
    "notification_ping": dict(level=-6.0, sends={"plate": -12}),
    "phone_vibrate": dict(level=-3.0, sends={"room": -20}),
    "error_buzz": dict(level=-1.0, sends={"room": -16}),
    "retry_stab": dict(level=-5.0, sends={"room": -14, "plate": -20}),
    "rewind": dict(level=-2.0, sends={"plate": -16}),
    "slot_spin": dict(level=-6.0, sends={"room": -18}),
    "lever_pull": dict(level=-4.0, sends={"room": -14}),
    "jackpot_bell": dict(level=-3.0, sends={"fxhall": -10, "plate": -14}),
    "flatline": dict(level=-8.0, sends={"hall": -20}),
    "ecg_beep": dict(level=-8.0, sends={"hall": -20}),
    "room_tone": dict(level=-36.0),
}

REVERBS = {   # synthesised IRs (dsp.make_ir) and how each return is EQ'd
    "room": dict(ir=dict(t60=0.75, predelay_ms=6, hf_ratio=0.55, lf_ratio=1.0, buildup_ms=3,
                         early=[(7, 0.6, -0.5), (11, 0.5, 0.6), (17, 0.4, -0.2), (23, 0.35, 0.3),
                                (31, 0.25, -0.7), (41, 0.2, 0.8)], seed=11),
                 ret=[("hp", 180, 2), ("lp", 9000, 2)]),
    "plate": dict(ir=dict(t60=1.6, predelay_ms=30, hf_ratio=0.75, lf_ratio=0.9, buildup_ms=2, seed=12),
                  ret=[("hp", 220, 2), ("lp", 10000, 2)]),
    "hall": dict(ir=dict(t60=2.6, predelay_ms=22, hf_ratio=0.45, lf_ratio=1.1, buildup_ms=18, seed=13),
                 ret=[("hp", 160, 2), ("lp", 8000, 2)]),
    "fxhall": dict(ir=dict(t60=3.6, predelay_ms=15, hf_ratio=0.4, lf_ratio=1.15, buildup_ms=25, seed=14),
                   ret=[("hp", 90, 2), ("lp", 7000, 2)]),
}
DELAYS = {
    "delay_d8": dict(time=0.75 * BEAT, feedback=0.35, hp=350, lp=4500),     # dotted eighth, ping-pong
    "delay_8": dict(time=0.5 * BEAT, feedback=0.28, hp=400, lp=5000),       # vocal eighth throws
}

# ---------------------------------------------------------------- vocals
VOCAL_STEMS = ("vox_you", "vox_ai", "vox_bg", "vox_spoken")
VOCAL_STYLES = {
    # hp, mud cut, de-ess band, comp ratio, presence @3.5k, air @10k, exciter, doubler (dB or None)
    "human": dict(hp=100, mud=-2.0, deess=5500, ratio=3.5, presence=2.0, air=2.5, excite=-17.0, double=None),
    "ai": dict(hp=110, mud=-2.5, deess=5500, ratio=4.0, presence=3.0, air=4.0, excite=-13.0, double=-9.0),
    "bg": dict(hp=150, mud=-3.0, deess=5500, ratio=4.0, presence=1.0, air=3.0, excite=-16.0, double=-6.0),
    "spoken_human": dict(hp=80, mud=-1.5, deess=5500, ratio=3.0, presence=1.5, air=1.5, excite=-20.0, double=None),
    "spoken_ai": dict(hp=110, mud=-2.0, deess=5500, ratio=3.5, presence=2.5, air=3.5, excite=-14.0, double=-12.0),
}
VOCAL_SENDS = {   # per style: reverb / delay sends (dB); delay_8 only in the chorus sections
    "human": {"plate": -15, "delay_8": -17},
    "ai": {"plate": -10, "hall": -18, "delay_8": -14},
    "bg": {"plate": -10, "hall": -16},
    "spoken_human": {"room": -21},
    "spoken_ai": {"plate": -14, "room": -24},
}
DELAY_THROW_SECTIONS = {"S04", "S05", "S08", "S10", "S11"}
# Vocal-to-instrumental loudness targets (LU) for the riding: the *dry lead* line against
# the un-ducked band in the same window. Backing parts, reverb/delay returns and the 2 dB
# music duck add roughly +3 LU on top, so the finished vocal bus lands near 0 LU against
# the band in the choruses and ~+1 LU in the verses (reported per section as "vir_lu").
VIR_TARGET = {"S02": -1.5, "S03": -2.0, "S04": -2.5, "S05": -3.0, "S06": -1.5, "S07": -2.0, "S08": -3.5,
              "S09": -1.0, "S10": -3.5, "S11": -3.0}    # S08/S10 carry composed AI doubles / unison
SPOKEN_OVER_MUSIC_VIR = 0.0     # spoken lines over the band sit clearly on top of it
SPOKEN_QUIET_LUFS = -21.0       # ... and in near-silence (intro, outage) they lead, ~2-3 LU
WHISPER_QUIET_LUFS = -23.0      # over the heartbeat (which sits at ~-23 LUFS pre-master there)
SPOKEN_RIDE_RANGE = 9.0         # spoken rides stay within +-9 dB of the stem's median ride
BG_TRIM = -1.0                  # backing parts relative to the lead fader
MUSIC_DUCK_DB = 2.0             # music bus dips this much under the lead vocal
TRANSPORT_ON_VOCALS = {"tape_stop", "rewind"}   # the tape/the conversation itself; stutters spare words
# Mix automation of my own: after the final hit (tb 559) the band rings half a beat, then
# its tails fade so the ECG flatline sits alone "across the dark" (restored before the
# end-card music-box note). (start_tb, fade_s, restore_tb)
TAIL_FADES = [(560.5, 1.5, 600.0)]


# ============================================================================ helpers
def channel(name: str, inst: str) -> dict:
    ch = dict(CHANNELS.get(name) or CHANNELS.get(inst) or {})
    ch.setdefault("eq", [])
    ch.setdefault("sends", {})
    ch["trim"] = TRIMS.get(name, 0.0)
    return ch


class Sends:
    """Send accumulators: one stereo float32 buffer per (bus, effect)."""

    def __init__(self):
        self.buf: dict[tuple[str, str], np.ndarray] = {}

    def add(self, bus: str, fx_name: str, x: np.ndarray, gain_db: float, mask: np.ndarray | None = None):
        key = (bus, fx_name)
        if key not in self.buf:
            self.buf[key] = np.zeros((N_TOTAL, 2), dtype=np.float32)
        g = float(dsp.db2a(gain_db))
        self.buf[key] += g * x if mask is None else x * (g * mask)[:, None]

    def returns(self, bus: str, irs: dict) -> np.ndarray | None:
        """Run this bus's sends through their reverbs/delays (and free them)."""
        wet = None
        for key in [k for k in self.buf if k[0] == bus]:
            x = self.buf.pop(key)
            if not np.any(x):
                continue
            name = key[1]
            if name in REVERBS:
                w = dsp.eq(dsp.convolve(x, irs[name]), REVERBS[name]["ret"])
            else:
                d = DELAYS[name]
                w = dsp.feedback_delay(x, d["time"], d["feedback"], hp=d["hp"], lp=d["lp"], pingpong=True)
            wet = w if wet is None else wet + w
        return wet


def smooth_mask(m: np.ndarray, ramp_s: float) -> np.ndarray:
    """Moving-average a 0/1 mask into ramps of ramp_s (O(n) box filter)."""
    return uniform_filter1d(m.astype(np.float64), max(1, int(ramp_s * SR)), mode="nearest")


def section_mask(secs, ids: set[str], ramp_s: float = 0.08) -> np.ndarray:
    m = np.zeros(N_TOTAL)
    for s in secs:
        if s.id in ids:
            m[int(s.start * SR): int(s.end * SR)] = 1.0
    return smooth_mask(m, ramp_s)


def window_lufs(power100: np.ndarray, t0: float, t1: float) -> float:
    a, b = int(t0 * 10), max(int(t0 * 10) + 1, int(t1 * 10))
    p = power100[a:b]
    return float(dsp.lufs_from_power(p.mean())) if p.size else -120.0


def ramp_env(points, n=N_TOTAL, ramp_s=0.3) -> np.ndarray:
    """Stepped gain (dB) from [(t, gain_db), ...]: each new value is reached exactly at t
    after a linear ramp of ramp_s (shortened if the previous step is closer)."""
    pts = sorted(points)
    if not pts:
        return np.zeros(n)
    xs, ys = [0.0], [pts[0][1]]
    for (t_prev, g_prev), (t, g) in zip(pts, pts[1:]):
        xs += [max(t - ramp_s, t_prev, xs[-1]), max(t, xs[-1] + 1e-6)]
        ys += [g_prev, g]
    return np.interp(np.arange(n) / SR, xs, ys)


# ============================================================================ buses
def drum_bus(x: np.ndarray) -> np.ndarray:
    """NY-style parallel compression for body + 2:1 glue."""
    thr = dsp.level_percentile_db(x, 95, 20) - 14.0
    crushed, _ = dsp.compressor(x, thr, 8.0, 1.0, 70.0, knee_db=6.0)
    act = np.abs(x).max(axis=1) > 1e-5
    mk = np.sqrt(np.mean(x[act] ** 2) / (np.mean(crushed[act] ** 2) + 1e-20)) if act.any() else 1.0
    x = x + dsp.db2a(-9.0) * mk * crushed
    thr = dsp.level_percentile_db(x, 95, 20) - 4.0
    x, _ = dsp.compressor(x, thr, 2.0, 10.0, 120.0, knee_db=6.0, rms_ms=5.0)
    return x


def bass_bus(x: np.ndarray) -> np.ndarray:
    x = dsp.mono_below(x, 120.0)
    thr = dsp.level_percentile_db(x, 90, 30) - 3.0
    x, _ = dsp.compressor(x, thr, 3.0, 5.0, 80.0, knee_db=6.0, rms_ms=5.0)
    return x


def music_bus(x: np.ndarray) -> np.ndarray:
    thr = dsp.level_percentile_db(x, 95, 50) - 2.0
    x, _ = dsp.compressor(x, thr, 1.5, 20.0, 200.0, knee_db=8.0, rms_ms=20.0)
    return x


def apply_automation(x: np.ndarray, lp_hz: np.ndarray, crush: np.ndarray) -> np.ndarray:
    """music_lowpass_hz (24 dB/oct, log-interpolated, transparent when fully open) + bitcrush."""
    wet = np.clip((19500.0 - lp_hz) / 4500.0, 0.0, 1.0)
    act = np.flatnonzero(wet > 0)
    if act.size:
        breaks = np.flatnonzero(np.diff(act) > SR)          # separate closed regions
        starts = np.concatenate([[act[0]], act[breaks + 1]])
        ends = np.concatenate([act[breaks], [act[-1]]])
        for a, b in zip(starts, ends):
            a0, b1 = max(0, a - SR // 2), min(N_TOTAL, b + SR // 2)
            y = dsp.svf(x[a0:b1].astype(np.float64), lp_hz[a0:b1], 0.7071, "lp", poles=4)
            w = wet[a0:b1, None]
            x[a0:b1] = (1.0 - w) * x[a0:b1] + w * y
    act = np.flatnonzero(crush > 0)
    if act.size:
        a0, b1 = max(0, act[0] - 64), min(N_TOTAL, act[-1] + 64)
        x[a0:b1] = dsp.bitcrush(x[a0:b1].astype(np.float64), crush[a0:b1])
    return x


# ============================================================================ transport FX
def _xfade(n: int) -> np.ndarray:
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def glitch_stutter(bufs: list[np.ndarray], ev: dict) -> None:
    """Retrigger the last 1/16-note slice before tb for d beats (beat-repeat)."""
    t0 = tb2n(ev["tb"])
    n = tb2n(ev["tb"] + ev["d"]) - t0
    sl = t0 - tb2n(ev["tb"] - 0.25)
    level = min(1.0, 0.6 + 0.5 * float(ev.get("params", {}).get("v", 0.8)))
    f = int(0.0015 * SR)
    win = np.ones(sl)
    win[:f] = _xfade(f)
    win[-f:] = _xfade(f)[::-1]
    edge = np.ones(n)
    edge[:f] = _xfade(f)
    edge[-f:] = _xfade(f)[::-1]
    for x in bufs:
        rep = np.tile(x[t0 - sl: t0] * win[:, None], (int(np.ceil(n / sl)), 1))[:n]
        x[t0: t0 + n] = x[t0: t0 + n] * (1.0 - edge[:, None]) + level * rep * edge[:, None]


def rewind(bufs: list[np.ndarray], ev: dict, back_beats: float = 1.5) -> None:
    """'Regenerate': the previous ~1.5 beats play backwards (tape speed swells up and down)."""
    t0 = tb2n(ev["tb"])
    n = tb2n(ev["tb"] + ev["d"]) - t0
    back = t0 - tb2n(ev["tb"] - back_beats)
    u = (np.arange(n) + 0.5) / n
    speed = np.sin(np.pi * u) ** 0.6 + 0.12
    speed *= back / speed.sum()
    pos = back - np.cumsum(speed)                     # read backwards through the source window
    amp = (speed / speed.max()) ** 0.5               # a tape heard at speed: level follows speed
    f = int(0.004 * SR)
    edge = np.ones(n)
    edge[:f] = _xfade(f)
    edge[-f:] = _xfade(f)[::-1]
    for x in bufs:
        src = x[t0 - back - 2: t0 + 2].astype(np.float64)
        y = np.stack([dsp.read_cubic(np.ascontiguousarray(src[:, c]), pos + 2) for c in range(2)], axis=1)
        x[t0: t0 + n] = x[t0: t0 + n] * (1.0 - edge[:, None]) + (y * amp[:, None]) * edge[:, None]


def tape_stop(bufs: list[np.ndarray], ev: dict, restart: int) -> None:
    """The tape slows to a halt over d beats (pitch and level fall), then stays stopped
    until `restart` (the next bar line)."""
    t0 = tb2n(ev["tb"])
    n = tb2n(ev["tb"] + ev["d"]) - t0
    u = np.arange(n) / n
    speed = (1.0 - u) ** 1.25
    pos = np.cumsum(speed) - speed[0]
    amp = speed ** 0.7
    f = int(0.003 * SR)
    for x in bufs:
        src = x[t0: t0 + n + 4].astype(np.float64)
        y = np.stack([dsp.read_cubic(np.ascontiguousarray(src[:, c]), pos + 0.0) for c in range(2)], axis=1)
        x[t0: t0 + n] = y * amp[:, None]
        e = t0 + n
        if restart > e:
            x[e:restart] = 0.0
            k = min(f, N_TOTAL - restart)
            x[restart: restart + k] *= _xfade(k)[:, None]


def apply_transport(fx_events, instrumental: list[np.ndarray], vocals: list[np.ndarray]) -> list[str]:
    order = {"glitch_stutter": 0, "rewind": 1, "tape_stop": 2}
    done = []
    for ev in sorted((e for e in fx_events if e["type"] in order), key=lambda e: (e["tb"], order[e["type"]])):
        bufs = instrumental + (vocals if ev["type"] in TRANSPORT_ON_VOCALS else [])
        if ev["type"] == "glitch_stutter":
            glitch_stutter(bufs, ev)
        elif ev["type"] == "rewind":
            rewind(bufs, ev)
        else:
            end_tb = ev["tb"] + ev["d"]
            restart = tb2n(np.ceil(end_tb / 4.0 - 1e-9) * 4.0)
            tape_stop(bufs, ev, restart)
        done.append(f"{ev['type']}@{ev['tb']}")
    return done


def tail_fade_gain(fades) -> np.ndarray:
    g = np.ones(N_TOTAL)
    for start_tb, fade_s, restore_tb in fades:
        s, e, r = tb2n(start_tb), tb2n(start_tb) + int(fade_s * SR), tb2n(restore_tb)
        g[s:e] = 0.5 + 0.5 * np.cos(np.pi * np.arange(e - s) / (e - s))
        g[e:r] = 0.0
    return g


def silence_gate(spans) -> np.ndarray:
    """Hard mute with 5 ms ramps: fully silent from tb0, back to unity exactly at tb1."""
    g = np.ones(N_TOTAL)
    r = int(0.005 * SR)
    for a, b in spans:
        s, e = tb2n(a), tb2n(b)
        g[s - r: s] = np.minimum(g[s - r: s], np.linspace(1.0, 0.0, r))
        g[s: e - r] = 0.0
        g[e - r: e] = np.minimum(g[e - r: e], np.linspace(0.0, 1.0, r))
    return g


# ============================================================================ vocals
def deess(x: np.ndarray, f: float, ratio: float = 5.0, thresh_rel_db: float = -14.0,
          max_db: float = 9.0) -> np.ndarray:
    """Split-band de-esser: the band above f is turned down while it dominates the voice
    (relative detection, so it works the same at any vocal level)."""
    lo = dsp.filt0(x, dsp.butter("lp", f, 4))
    hi = x - lo
    e_hi = dsp.envelope(hi, 0.5, 40.0)
    e_all = dsp.envelope(x, 0.5, 40.0)
    rel = dsp.a2db(e_hi) - dsp.a2db(e_all)
    gr = np.clip((rel - thresh_rel_db) * (1.0 - 1.0 / ratio), 0.0, max_db)
    gr *= dsp.a2db(e_all) > -60.0
    gr = dsp._follow(gr, dsp.coef(1.0), dsp.coef(50.0))
    return lo + hi * dsp.db2a(-gr)[:, None]


def exciter(x: np.ndarray, level_db: float) -> np.ndarray:
    """Generate 'air' above the synthesis band (~12 kHz) from the 3.5 kHz+ content."""
    band = dsp.filt(x, dsp.butter("hp", 3500.0, 2))
    ref = dsp.db2a(dsp.level_percentile_db(band, 95, 20))
    h = dsp.oversample(lambda u: np.tanh(3.0 * u / ref) * ref, band, 2)
    h = dsp.filt(h, dsp.butter("hp", 9000.0, 4))
    return dsp.db2a(level_db) * h


def vocal_chain(x: np.ndarray, style: str) -> np.ndarray:
    """HP -> mud cut -> de-ess -> 3-4:1 comp -> presence/air -> 2nd (gentle) de-ess ->
    exciter (air above the 12 kHz synthesis band) -> optional doubler (AI width)."""
    s = VOCAL_STYLES[style]
    x = dsp.filt(x, dsp.butter("hp", s["hp"], 4))
    x = dsp.eq(x, [("peak", 300.0, s["mud"], 1.0)])
    x = deess(x, s["deess"])
    thr = dsp.level_percentile_db(x, 85, 30) - 2.0
    x, _ = dsp.compressor(x, thr, s["ratio"], 6.0, 90.0, knee_db=6.0, rms_ms=3.0)
    x = dsp.eq(x, [("peak", 3500.0, s["presence"], 0.9), ("highshelf", 10000.0, s["air"], 0.8)])
    x = deess(x, s["deess"] + 1000.0, ratio=3.0, thresh_rel_db=-12.0, max_db=5.0)
    x = x + exciter(x, s["excite"])
    if s["double"] is not None:
        x = x + dsp.db2a(s["double"]) * dsp.doubler(x)
    return x


def vocal_lines(secs) -> list[dict]:
    """Every vocal line with its stem, speaker, section and time window (s).

    Uses the vocal engine's measured vocal_timing.json when available, else the score."""
    with open(VOCALS_JSON, encoding="utf-8") as f:
        vj = json.load(f)
    timing = {}
    if os.path.exists(VOCAL_TIMING):
        with open(VOCAL_TIMING, encoding="utf-8") as f:
            timing = {ln["id"]: (ln["start"], ln["end"]) for ln in json.load(f).get("lines", [])}
    stem_of = {"you": "vox_you", "ai": "vox_ai", "bg": "vox_bg", "spoken": "vox_spoken"}
    out = []
    for ln in vj["lines"]:
        if ln["id"] in timing:
            t0, t1 = timing[ln["id"]]
        elif ln.get("mode") == "sung":
            notes = [n for s in ln["syllables"] for n in s["notes"]]
            t0 = min(n["tb"] for n in notes) * BEAT - 0.06
            t1 = max(n["tb"] + n["d"] for n in notes) * BEAT + 0.15
        else:
            t0 = ln["tb"] * BEAT
            t1 = t0 + 0.3 + 0.065 * len(ln.get("say", ln["text"])) / float(ln.get("speed") or 1.0)
            if ln.get("cut_tb"):
                t1 = min(t1, ln["cut_tb"] * BEAT)
        out.append(dict(id=ln["id"], stem=stem_of.get(ln.get("bus"), "vox_spoken"), speaker=ln["speaker"],
                        mode=ln.get("mode", "sung"), section=ln.get("section"), t0=float(t0), t1=float(t1),
                        primary="double_of" not in ln))
    return out


def mix_vocals(vox_dir: str, secs, inst_power: np.ndarray, sends: Sends):
    """Process, ride and sum the vocal stems. Returns (vocal_bus, lead_for_ducking, info)."""
    present = {s: os.path.join(vox_dir, f"{s}.wav") for s in VOCAL_STEMS
               if os.path.exists(os.path.join(vox_dir, f"{s}.wav"))}
    if not present:
        return None, None, {"vocals": "absent"}
    lines = vocal_lines(secs)
    chorus = section_mask(secs, DELAY_THROW_SECTIONS)
    bus = np.zeros((N_TOTAL, 2), dtype=np.float32)
    lead = np.zeros((N_TOTAL, 2), dtype=np.float32)
    info: dict = {"vocals": sorted(present)}
    gains: dict[str, float] = {}

    def desired(power, ln):
        """Fader (dB) that puts this line at its target against the band."""
        v = window_lufs(power, ln["t0"], ln["t1"])
        if v < -70:
            return None
        inst = window_lufs(inst_power, ln["t0"], ln["t1"])
        if ln["stem"] == "vox_spoken":
            # quiet or over the band? judged where the line starts (a line may run into a downbeat)
            if window_lufs(inst_power, ln["t0"], min(ln["t1"], ln["t0"] + 0.5)) > -45.0:
                return inst + SPOKEN_OVER_MUSIC_VIR - v
            return (WHISPER_QUIET_LUFS if ln["mode"] == "whisper" else SPOKEN_QUIET_LUFS) - v
        if inst < -45.0:
            return SPOKEN_QUIET_LUFS + 2.0 - v
        return inst + VIR_TARGET.get(ln["section"], 1.0) - v

    order = [s for s in ("vox_you", "vox_ai", "vox_spoken", "vox_bg") if s in present]
    for stem in order:
        raw = read_wav(present[stem]).astype(np.float64)
        if not np.any(raw):
            continue
        if stem == "vox_spoken":
            # one stem, two characters: route each line through the human or the AI chain
            hum, ai = vocal_chain(raw, "spoken_human"), vocal_chain(raw, "spoken_ai")
            m_ai = np.zeros(N_TOTAL)
            for ln in lines:
                if ln["stem"] == stem and ln["speaker"] == "ai":
                    m_ai[max(0, int((ln["t0"] - 0.05) * SR)): int((ln["t1"] + 0.6) * SR)] = 1.0
            m_ai = smooth_mask(m_ai, 0.03)
            x = hum * (1.0 - m_ai[:, None]) + ai * m_ai[:, None]
            power = dsp.k_weighted_power(x)
            # spoken lines are ridden individually (close in the outage, on top over the band)
            pts = []
            for ln in sorted((l for l in lines if l["stem"] == stem), key=lambda l: l["t0"]):
                g = desired(power, ln)
                if g is not None:
                    pts.append((ln["t0"] - 0.02, float(g)))
            if pts:
                med = float(np.median([g for _, g in pts]))
                pts = [(t, float(np.clip(g, med - SPOKEN_RIDE_RANGE, med + SPOKEN_RIDE_RANGE))) for t, g in pts]
            g_env = ramp_env(pts, ramp_s=0.15)
            x = x * dsp.db2a(g_env)[:, None]
            info["spoken_line_gains_db"] = {f"{t:.2f}s": round(g, 1) for t, g in pts}
            for name, db in VOCAL_SENDS["spoken_human"].items():
                sends.add("vocals", name, x, db, mask=1.0 - m_ai)
            for name, db in VOCAL_SENDS["spoken_ai"].items():
                sends.add("vocals", name, x, db, mask=m_ai)
            bus += x
            continue
        style = {"vox_you": "human", "vox_ai": "ai", "vox_bg": "bg"}[stem]
        x = vocal_chain(raw, style)
        power = dsp.k_weighted_power(x)
        if stem == "vox_bg":
            g_env = np.full(N_TOTAL, gains.get("vox_you", 0.0) + BG_TRIM)
        else:
            own = [ln for ln in lines if ln["stem"] == stem and ln["primary"]]
            want = [(ln, desired(power, ln)) for ln in own]
            want = [(ln, g) for ln, g in want if g is not None]
            static = float(np.median([g for _, g in want])) if want else 0.0
            gains[stem] = static
            # gentle section rides around the static fader (+-3 dB), ramping in before each section
            pts = [(0.0, static)]
            for s in secs:
                gs = [g for ln, g in want if ln["section"] == s.id]
                off = float(np.clip(np.median(gs) - static, -3.0, 3.0)) if gs else 0.0
                pts.append((s.start, static + off))
            g_env = ramp_env(pts, ramp_s=0.3)
            info[f"{stem}_fader_db"] = round(static, 2)
        x = x * dsp.db2a(g_env)[:, None]
        for name, db in VOCAL_SENDS[style].items():
            sends.add("vocals", name, x, db, mask=chorus if name == "delay_8" else None)
        bus += x
        if stem in ("vox_you", "vox_ai"):
            lead += x
    return bus, lead, info


def music_duck_env(lead: np.ndarray) -> np.ndarray:
    """~2 dB dip of the music bus while the lead vocal sings (smooth, program-dependent)."""
    env = dsp.a2db(dsp.envelope(lead, 15.0, 250.0))
    act = env[env > env.max() - 50]
    ref = np.percentile(act, 60) if act.size else -60.0
    p = np.clip((env - (ref - 18.0)) / 10.0, 0.0, 1.0)
    p = dsp._follow(p, dsp.coef(30.0), dsp.coef(300.0))
    return dsp.db2a(-MUSIC_DUCK_DB * p)


# ============================================================================ master
def soft_clip(x: np.ndarray, ceiling_db: float, knee_db: float = 3.0) -> np.ndarray:
    """Oversampled soft clipper: transparent below the knee, tanh-rounded up to the ceiling.

    Only the regions that get near the knee are oversampled and shaped (cross-faded in
    over 256 samples); everywhere else the signal passes untouched."""
    c = dsp.db2a(ceiling_db)
    t = c * dsp.db2a(-knee_db)

    def shape(u):
        a = np.abs(u)
        over = a > t
        y = u.copy()
        y[over] = np.sign(u[over]) * (t + (c - t) * np.tanh((a[over] - t) / (c - t)))
        return y

    hot = np.flatnonzero(dsp.absmax_ch(x) > 0.7 * t)
    if hot.size == 0:
        return x
    n, margin, xf = x.shape[0], 1024, 256
    br = np.flatnonzero(np.diff(hot) > 2 * margin)
    starts = np.maximum(0, hot[np.r_[0, br + 1]] - margin)
    ends = np.minimum(n, hot[np.r_[br, hot.size - 1]] + margin)
    y = x.copy()
    ramp = _xfade(xf)
    for a, b in zip(starts, ends):
        seg = dsp.oversample(shape, x[a:b], 4)
        w = np.ones(b - a)
        k = min(xf, (b - a) // 2)
        w[:k] = ramp[:k]
        w[b - a - k:] = ramp[:k][::-1]
        y[a:b] = x[a:b] * (1.0 - w[:, None]) + seg * w[:, None]
    return y


def master_chain(mix: np.ndarray, gain_lane_db: np.ndarray):
    x = mix.astype(np.float64) * dsp.db2a(gain_lane_db)[:, None]
    x = dsp.filt(x, dsp.butter("hp", 24.0, 2))                       # subsonic
    thr = dsp.level_percentile_db(x, 90, 50) + 0.5
    x, glue_gr = dsp.compressor(x, thr, 2.0, 30.0, 200.0, knee_db=6.0, rms_ms=20.0)
    x = dsp.eq(x, [("lowshelf", 110.0, -0.5, 0.8), ("peak", 2500.0, 0.5, 0.7), ("highshelf", 12000.0, 0.5, 0.8)])
    gain = TARGET_LUFS - dsp.integrated_lufs(x) + 0.5
    lim_ceiling = LIMIT_TP
    prev = None
    for it in range(8):
        y = soft_clip(x * dsp.db2a(gain), lim_ceiling + 1.5)
        y, lim_gain = dsp.limiter(y, lim_ceiling, lookahead_ms=1.5, release_ms=90.0)
        lv = dsp.integrated_lufs(y)
        print(f"    master pass {it + 1}: gain {gain:+.2f} dB -> {lv:.2f} LUFS, "
              f"limiter max GR {-lim_gain.min():.2f} dB")
        if abs(lv - TARGET_LUFS) > 0.05:
            slope = 0.9 if prev is None else float(np.clip((lv - prev[1]) / (gain - prev[0] + 1e-9), 0.5, 1.0))
            prev = (gain, lv)
            gain += (TARGET_LUFS - lv) / slope
            continue
        tp = dsp.true_peak_db(y)
        if tp <= LIMIT_TP + 0.05:
            break
        lim_ceiling -= (tp - LIMIT_TP) + 0.02          # a peak slipped past the 4x detector: tighten
    info = {"master_gain_db": round(gain, 2), "glue_gr_max_db": round(float(glue_gr.max()), 2),
            "glue_gr_mean_db": round(float(glue_gr.mean()), 2),
            "limiter_gr_max_db": round(float(-lim_gain.min()), 2),
            "limiter_gr_mean_db": round(float(-lim_gain.mean()), 3),
            "limiter_time_over_1db_pct": round(float(np.mean(lim_gain < -1.0) * 100), 2)}
    return y, lim_gain, info


def write_master(y: np.ndarray) -> np.ndarray:
    """TPDF-dither to 24 bit, write WAV + FLAC (identical samples), return what was written."""
    rng = np.random.default_rng(215)
    lsb = 1.0 / (1 << 23)
    y = y + (rng.random(y.shape) - rng.random(y.shape)) * lsb
    q = np.clip(np.round(y * (1 << 23)), -(1 << 23), (1 << 23) - 1).astype(np.int32)
    wav = os.path.join(BUILD, "master.wav")
    sf.write(wav, q << 8, SR, subtype="PCM_24")
    sf.write(os.path.join(BUILD, "master.flac"), q << 8, SR, subtype="PCM_24", format="FLAC")
    back, _ = sf.read(wav, dtype="float64", always_2d=True)
    return back


# ============================================================================ main
BUS_DYNAMICS = {"drums": drum_bus, "bass": bass_bus, "music": music_bus}


def mix_channels(bus: str, arr: dict, manifest: dict, secs, sends: Sends, meters: dict, ducks: dict,
                 kick_hits) -> np.ndarray:
    """Sum every channel routed to `bus` (instrument tracks, or the FX types for 'fx')."""
    acc = np.zeros((N_TOTAL, 2))
    if bus == "fx":
        for name, m in sorted(manifest.items()):
            if not name.startswith("fx_") or m.get("lufs") is None:
                continue
            ch = FX_CHANNELS.get(name[3:], dict(level=-10.0))
            x = dsp.eq(read_wav(os.path.join(TRACK_DIR, f"{name}.wav")), ch.get("eq", []))
            x *= dsp.db2a(REF_LUFS - m["lufs"] + ch["level"])
            acc += x
            for s_name, db in ch.get("sends", {}).items():
                sends.add(bus, s_name, x, db)
            meters[name] = dsp.k_weighted_power(x)
        return acc
    for name, tr in arr["tracks"].items():
        m = manifest.get(name)
        routed = tr["bus"] if tr["bus"] in ("drums", "bass", "music") else "music"
        if routed != bus or not m or m.get("lufs") is None:
            continue
        ch = channel(name, tr["instrument"])
        x = dsp.eq(read_wav(os.path.join(TRACK_DIR, f"{name}.wav")), ch["eq"])
        fader = REF_LUFS - m["lufs"] + float(tr.get("gain_db", 0.0)) + ch["trim"]
        x *= dsp.db2a(fader)
        if name in RIDES:
            pts = [(0.0, 0.0)] + [(sc.start, RIDES[name].get(sc.id, 0.0)) for sc in secs]
            x *= dsp.db2a(ramp_env(pts, ramp_s=0.25))[:, None]
        x = dsp.pan(x, float(tr.get("pan", 0.0)))
        if "duck" in ch:
            if ch["duck"] not in ducks:
                ducks[ch["duck"]] = dsp.kick_duck_env(kick_hits, N_TOTAL, ch["duck"][0], release_ms=ch["duck"][1])
            x *= ducks[ch["duck"]][:, None]
        acc += x
        for s_name, db in ch["sends"].items():
            sends.add(bus, s_name, x, db)
        meters[name] = dsp.k_weighted_power(x)
        print(f"  {name:12s} -> {bus:5s} fader {fader:+6.1f} dB")
    return acc


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--vox-dir", default=STEMS, help="where vox_{you,ai,bg,spoken}.wav live")
    ap.add_argument("--no-vocals", action="store_true")
    ap.add_argument("--no-plots", action="store_true")
    args = ap.parse_args()
    t_start = time.time()

    arr = load_arrangement()
    secs = sections(arr)
    with open(os.path.join(TRACK_DIR, "manifest.json")) as f:
        manifest = {e["stem"]: e for e in json.load(f)["stems"]}
    kick_hits = [(tb2n(n["tb"]), float(n.get("v", 1.0))) for t in arr["tracks"].values()
                 if t["instrument"] == "kick" for n in t["notes"]]
    au = arr.get("automation", {})
    irs = {k: dsp.make_ir(**v["ir"]) for k, v in REVERBS.items()}
    sends, meters, ducks = Sends(), {}, {}
    stems: dict[str, np.ndarray] = {}                     # finished buses, float32

    # ---- instrument + FX buses, one at a time (sends -> returns -> freed): low memory
    inst_dry = np.zeros((N_TOTAL, 2), dtype=np.float32)   # the band the vocals are ridden against
    for bus in ("drums", "bass", "music", "fx"):
        print(f"bus {bus}")
        x = mix_channels(bus, arr, manifest, secs, sends, meters, ducks, kick_hits)
        if bus in BUS_DYNAMICS:
            x = BUS_DYNAMICS[bus](x)
            inst_dry += x
        wet = sends.returns(bus, irs)
        if wet is not None:
            x += wet
        stems[bus] = x.astype(np.float32)
        del x, wet
    ducks.clear()

    # ---- vocals (ridden against the band), with their own returns
    lead = None
    vinfo: dict = {"vocals": "disabled"}
    if not args.no_vocals:
        inst_power = dsp.k_weighted_power(inst_dry)
        vox, lead, vinfo = mix_vocals(args.vox_dir, secs, inst_power, sends)
        if vox is not None:
            wet = sends.returns("vocals", irs)
            stems["vocals"] = (vox + wet if wet is not None else vox).astype(np.float32)
            del vox, wet
    del inst_dry
    print(f"vocals: {vinfo.get('vocals')}")

    # ---- automation, transport FX, silence (instrumental buses incl. their tails)
    print("automation / transport / silence")
    lp_hz = lane(au.get("music_lowpass_hz", []), log=True, default=20000.0)
    crush = lane(au.get("bitcrush", []), default=0.0)
    for b in ("drums", "bass", "music"):
        stems[b] = apply_automation(stems[b].astype(np.float64), lp_hz, crush).astype(np.float32)
    del lp_hz, crush
    done = apply_transport(arr["fx"], [stems["drums"], stems["bass"], stems["music"]],
                           [stems["vocals"]] if "vocals" in stems else [])
    gate = silence_gate(au.get("silence", [])) * tail_fade_gain(TAIL_FADES)
    for b in ("drums", "bass", "music"):
        stems[b] *= gate[:, None]
    if lead is not None and np.any(lead):
        stems["music"] *= music_duck_env(lead)[:, None]
    del lead, gate

    # ---- bus stems (post-fader, pre-master) + their meters, then the mix
    for b, x in stems.items():
        write_wav(os.path.join(STEMS, f"{b}.wav"), x)
    if "vocals" not in stems and os.path.exists(os.path.join(STEMS, "vocals.wav")):
        os.remove(os.path.join(STEMS, "vocals.wav"))
    bus_power = {b: dsp.k_weighted_power(x) for b, x in stems.items()}
    inst_power = dsp.k_weighted_power(stems["drums"] + stems["bass"] + stems["music"])
    mix = np.zeros((N_TOTAL, 2))
    for b in list(stems):
        mix += stems.pop(b)
    print(f"pre-master: {dsp.integrated_lufs(mix):.2f} LUFS, peak {dsp.a2db(np.abs(mix).max()):.2f} dBFS")

    # ---- master
    print("master")
    y, lim_gain, minfo = master_chain(mix, lane(au.get("master_gain_db", []), default=0.0))
    del mix
    final = write_master(y[:N_TOTAL])
    del y
    assert final.shape[0] == N_TOTAL

    # ---- QA
    print("qa")
    os.makedirs(QA_DIR, exist_ok=True)
    extra = {"render": {"mix_seconds": round(time.time() - t_start, 1), "transport_fx": done},
             "mix": minfo, "vocals": vinfo}
    if "vocals" in bus_power:
        extra["vir_lu"] = {sc.id: round(window_lufs(bus_power["vocals"], sc.start, sc.end)
                                        - window_lufs(inst_power, sc.start, sc.end), 1)
                           for sc in secs if window_lufs(bus_power["vocals"], sc.start, sc.end) > -60}
    rep = qa.report(final, secs, bus_power=bus_power, extra=extra,
                    path=os.path.join(QA_DIR, "loudness_report.json"))
    write_track_balance(meters, inst_power, secs)
    if not args.no_plots:
        qa.write_spectrograms(final, secs)
        qa.loudness_timeline(final, os.path.join(QA_DIR, "loudness_timeline.png"), secs, gain_db=lim_gain)
    print(f"master: {rep['integrated_lufs']:.2f} LUFS integrated, {rep['true_peak_dbtp']:.2f} dBTP, "
          f"LRA {rep['loudness_range_lu']:.1f} LU, {rep['duration_s']:.3f} s; gates {rep['gates']}")
    print(f"done in {time.time() - t_start:.1f} s")


def write_track_balance(meters: dict, inst_power: np.ndarray, secs) -> None:
    """Per section: each channel's loudness relative to the band (LU) -- the meter bridge
    used to set the faders."""
    res = {}
    for s in secs:
        ref = window_lufs(inst_power, s.start, s.end)
        row = {"instrumental_lufs": round(ref, 1)}
        for name, p in meters.items():
            v = window_lufs(p, s.start, s.end)
            if v > -70:
                row[name] = round(v - ref, 1)
        res[s.id] = row
    with open(os.path.join(QA_DIR, "track_balance.json"), "w") as f:
        json.dump(res, f, indent=1)


if __name__ == "__main__":
    main()
