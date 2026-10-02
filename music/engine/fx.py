"""Story sound effects (docs/06_tech_spec.md §2.2), each designed for its moment in the film.

Every generator takes the event dict (tb, d, params), its index among events of the same
type and a context dict (currently the arrangement's `silence` spans), and returns
(audio_stereo, offset_samples): audio is placed at tb + offset. All randomness is seeded
from the event, so a re-render is bit-identical.

The transport effects `glitch_stutter` and `tape_stop` manipulate the music itself and
are realised in mix.py; `rewind` gets its whoosh + UI click here and its reversed music
in mix.py.
"""
from __future__ import annotations

import numpy as np

import dsp
import drums
from common import BEAT, SR, rng_for


def _t(dur: float) -> np.ndarray:
    return np.arange(max(1, int(dur * SR))) / SR


def _sweep(f: np.ndarray, phase0: float = 0.0) -> np.ndarray:
    return np.sin(dsp.TWO_PI * np.cumsum(f) / SR + phase0)


def _mono(x: np.ndarray, p: float = 0.0) -> np.ndarray:
    return dsp.pan(x, p)


# ============================================================================ body / human
def _in_outage(ev, ctx, margin_tb: float = 1.0) -> bool:
    """Does the event fall inside the server-outage silence (the arrangement's silence lane)?"""
    return any(a - margin_tb <= ev["tb"] <= b + margin_tb for a, b in ctx.get("silence", []))


def heartbeat(ev, k, ctx):
    """Lub-dub: two muffled chest thumps (dub = params.dub beats later, softer, higher).

    A slow, heavy pulse in the intro; at 172 BPM in the outage the thumps are tighter.
    Saturation adds harmonics around 100-250 Hz so it reads on laptop speakers too.
    """
    p = ev.get("params", {})
    v = float(p.get("v", 0.8))
    racing = ev.get("d", 1.0) <= 0.5
    rng = rng_for("heartbeat", k)

    def thump(f_hi, f_lo, tau, amp):
        t = _t(0.34)
        f = f_lo + (f_hi - f_lo) * np.exp(-t / 0.035)
        body = _sweep(f) * (1.0 - np.exp(-t / 0.004)) * np.exp(-t / tau)
        thud = dsp.filt(rng.standard_normal(t.size), dsp.butter("lp", 110.0, 4)) * np.exp(-t / (0.6 * tau))
        x = body + 0.5 * thud / (np.abs(thud).max() + 1e-9)
        return dsp.tanh_sat(1.3 * x, 2.2) * amp

    lub = thump(68.0, 44.0, 0.060 if racing else 0.075, 1.0)
    dub = thump(80.0, 52.0, 0.045 if racing else 0.060, 0.72)
    off = int(float(p.get("dub", 0.3)) * BEAT * SR)
    x = np.zeros(off + dub.size)
    x[: lub.size] += lub
    x[off: off + dub.size] += dub
    x = dsp.eq(x, [("lp", 650.0, 2), ("peak", 140.0, 2.5, 1.0)])
    return _mono(x * v), 0


def breath(ev, k, ctx):
    """Shaped noise breaths. Breaths in the outage silence tremble (7.5 Hz shake) and
    alternate gasp-in / shaky-out; elsewhere a single held inhale (before the whisper)."""
    p = ev.get("params", {})
    v = float(p.get("v", 0.5))
    rng = rng_for("breath", k)
    dur = ev.get("d", 1.0) * BEAT
    t = _t(dur)
    u = t / dur
    trembling = _in_outage(ev, ctx)
    inhale = (k % 2 == 1) if trembling else True
    nz = dsp.pink(t.size, rng, 2, slope_db=-3.0)
    # an open-throat 'haa' rather than hiss: formant peaks, dark top
    vowel = dsp.eq(nz, [("hp", 280.0, 2), ("peak", 650.0, 7.0, 2.2), ("peak", 1150.0, 6.0, 2.5),
                        ("peak", 2450.0, 4.0, 3.0), ("lp", 4200.0, 4)])
    if inhale:
        env = np.clip(u / 0.85, 0, 1) ** 1.6 * np.clip((1.0 - u) / 0.15, 0, 1)
    else:
        env = np.clip(u / 0.08, 0, 1) * (1.0 - u) ** 1.3
    if trembling:
        env *= 1.0 + 0.4 * np.sin(dsp.TWO_PI * 7.5 * t + rng.random() * 6.28)
    x = vowel * env[:, None] * 0.12
    return dsp.width(x, 0.4) * v, 0


# ============================================================================ keyboard / UI
_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]


def _key_x(ch: str) -> float:
    """Horizontal key position 0..10 on a laptop keyboard (for subtle stereo placement)."""
    for r, row in enumerate(_ROWS):
        if ch.lower() in row:
            return row.index(ch.lower()) + 0.25 * r + 0.5
    return {" ": 5.0, "⌫": 10.0, "⏎": 10.2, "?": 9.6}.get(ch, 5.0)


def typing_click(ev, k, ctx):
    """Mechanical keyboard strokes: switch click + bottom-out 'thock' + softer release.

    Each of her keys is a little different (seeded per keystroke, placed across the
    stereo field by key position); backspace is softer and rattles a stabiliser, enter
    is heavy. The AI's keystrokes are identical copies, dead centre: perfect, uncanny.
    """
    p = ev.get("params", {})
    ch = p.get("ch", "a")
    ai = p.get("who", "you") == "ai"
    kind = {"⏎": "enter", "⌫": "back", " ": "space"}.get(ch, "key")
    rng = rng_for("typing-ai", kind) if ai else rng_for("typing", k, ch)
    base = {"key": (560.0, 0.010, 1.0, False), "space": (210.0, 0.018, 1.05, True),
            "back": (330.0, 0.012, 0.62, True), "enter": (190.0, 0.024, 1.4, True)}[kind]
    f_body, tau, level, stab = base
    if not ai:
        f_body *= rng.uniform(0.82, 1.18)
        level *= 10 ** (rng.normal(0.0, 1.4) / 20.0)
    f_click = 4600.0 if ai else rng.uniform(3800.0, 5600.0)
    if kind == "back":
        f_click *= 0.75                                       # darker, softer
    hold = max(ev.get("d", 0.1) * BEAT, 0.06)

    def stroke(t, f_b, tb, fc, g_click, g_body):
        nz = rng.standard_normal(t.size)
        click = dsp.filt(nz, dsp.butter("bp", (fc * 0.7, min(fc * 1.6, 20000.0)), 2)) * np.exp(-t / 0.0015)
        tick = np.sin(dsp.TWO_PI * (6800.0 if ai else 6400.0) * t) * np.exp(-t / 0.0006)
        thock = np.sin(dsp.TWO_PI * f_b * t) * np.exp(-t / tb)
        thud = dsp.filt(nz, dsp.butter("lp", 260.0, 2)) * np.exp(-t / 0.006)
        return g_click * (click + (0.5 if ai else 0.3) * tick) + g_body * (thock + 1.6 * thud)

    t = _t(hold + 0.09)
    x = stroke(t, f_body, tau, f_click, 0.9, 0.7)
    if stab:                                                   # stabiliser bar: delayed clack + metal ring
        d = int(0.0035 * SR)
        t2 = t[: t.size - d]
        x[d:] += 0.35 * stroke(t2, f_body * 1.4, tau * 0.6, f_click * 1.1, 0.5, 0.3)
        x[d:] += 0.06 * np.sin(dsp.TWO_PI * 2400.0 * t2) * np.exp(-t2 / 0.008)
    if kind == "enter":                                        # the heavy one: a little desk thump
        x += 0.35 * np.sin(dsp.TWO_PI * 95.0 * t) * np.exp(-t / 0.03)
    r0 = int(hold * SR)                                        # key release (upstroke)
    tr = t[: t.size - r0]
    x[r0:] += 0.33 * stroke(tr, f_body * 1.3, tau * 0.5, f_click * 1.15, 0.6, 0.35)
    x = dsp.fade(x, 0, int(0.01 * SR))
    pan_pos = 0.0 if ai else (_key_x(ch) - 5.0) / 5.0 * 0.25
    return _mono(x * level * 0.5, pan_pos), 0


def notification_ping(ev, k, ctx):
    """Soft two-tone chime A5 -> E6 (consonant with Dm, C and A, the chords it lands on)."""
    v = float(ev.get("params", {}).get("v", 0.8))
    x = np.zeros(int(0.9 * SR))
    for dt, f, g in ((0.0, 880.0, 0.85), (0.085, 1318.51, 1.0)):
        t = _t(0.8)
        mod = 0.6 * np.exp(-t / 0.05) * np.sin(dsp.TWO_PI * 2.0 * f * t)
        tone = np.sin(dsp.TWO_PI * f * t + mod) + 0.12 * np.sin(dsp.TWO_PI * 2.0 * f * t)
        tone *= (1.0 - np.exp(-t / 0.0015)) * np.exp(-t / 0.28)
        s = int(dt * SR)
        x[s: s + t.size] += g * tone[: x.size - s]
    return _mono(0.35 * x * v, 0.1), 0


def phone_vibrate(ev, k, ctx):
    """A phone buzzing face-down on the floor: ~150 Hz motor + surface rattle."""
    rng = rng_for("vibrate", k)
    dur = ev.get("d", 0.6) * BEAT
    t = _t(dur + 0.04)
    f = 150.0 * (1.0 + rng.normal(0.0, 0.01)) - 35.0 * np.exp(-t / 0.025)   # motor spin-up
    ph = dsp.TWO_PI * np.cumsum(f) / SR
    buzz = np.tanh(3.0 * np.sin(ph)) + 0.3 * np.sin(2.0 * ph)
    gate = 0.5 + 0.5 * np.sign(np.sin(ph))                                   # rattle on each excursion
    rattle = dsp.eq(rng.standard_normal(t.size) * gate, [("bp", 1800.0, 0.8)])
    x = dsp.filt(0.6 * buzz, dsp.butter("lp", 2500.0, 2)) + 0.45 * rattle
    env = np.clip(t / 0.012, 0, 1) * np.clip((dur + 0.03 - t) / 0.03, 0, 1)
    return _mono(0.5 * x * env, -0.15), 0


def error_buzz(ev, k, ctx):
    """The low 'denied' buzz the moment the server dies: beating minor-second saws."""
    v = float(ev.get("params", {}).get("v", 0.9))
    dur = ev.get("d", 0.6) * BEAT
    t = _t(dur + 0.03)
    x = dsp.saw(np.full(t.size, 98.0)) + dsp.saw(np.full(t.size, 103.8), phase0=0.3) \
        + 0.5 * dsp.pulse(np.full(t.size, 49.0), 0.5)
    x = dsp.tanh_sat(0.5 * dsp.filt(x, dsp.butter("lp", 2200.0, 2)), 2.0)
    env = np.clip(t / 0.003, 0, 1) * (0.8 + 0.2 * np.exp(-t / 0.1)) * np.clip((dur + 0.025 - t) / 0.025, 0, 1)
    click = np.zeros(t.size)
    click[:48] = np.hanning(48) * np.sign(np.sin(np.arange(48) * 1.9))
    return _mono((0.55 * x * env + 0.3 * click) * v), 0


def retry_stab(ev, k, ctx):
    """'Retry': a harsh digital click + a short bit-crushed stab (D with a tritone: error)."""
    v = float(ev.get("params", {}).get("v", 0.85))
    rng = rng_for("retry", k)
    t = _t(0.11)
    chord = sum(dsp.pulse(np.full(t.size, f), 0.5, phase0=rng.random()) for f in (587.33, 830.61, 1174.66))
    stab = chord / 3.0 * np.exp(-t / 0.024) * (1.0 - np.exp(-t / 0.0005))
    # crush: sample-and-hold (8 kHz falling to 4.8 kHz) at 5 bits -- harsher as she panics
    hold = 6 + min(4, k // 3)
    held = np.repeat(stab[::hold], hold)[: t.size]
    q = 2.0 / 2 ** 5
    crushed = np.round(held / q) * q
    click = np.zeros(t.size)
    n_c = int(0.0025 * SR)
    click[:n_c] = np.sign(np.sin(dsp.TWO_PI * 2900.0 * t[:n_c])) * np.exp(-t[:n_c] / 0.0008)
    x = 0.55 * crushed + 0.6 * click
    x = dsp.filt(x, dsp.butter("hp", 250.0, 2))
    return _mono(x * v, (0.12 if k % 2 else -0.12)), 0


def rewind(ev, k, ctx):
    """'Regenerate': a mouse click, then the tape-rewind whoosh (music reversal is in mix.py)."""
    rng = rng_for("rewind", k)
    dur = ev.get("d", 1.0) * BEAT
    t = _t(dur + 0.05)
    u = np.clip(t / dur, 0, 1)
    # mouse click: press + release 55 ms later
    click = np.zeros(t.size)
    for off, g in ((0, 1.0), (int(0.055 * SR), 0.5)):
        tc = t[: t.size - off]
        nz = rng.standard_normal(tc.size)
        c = dsp.filt(nz, dsp.butter("bp", (1800.0, 6000.0), 2)) * np.exp(-tc / 0.001) \
            + 0.5 * np.sin(dsp.TWO_PI * 950.0 * tc) * np.exp(-tc / 0.004)
        click[off:] += g * c
    # whoosh: band-passed noise sweeping up then down, plus a chirping tape squeal
    fc = 600.0 * (5000.0 / 600.0) ** np.sin(np.pi * u) ** 1.2
    nz = rng.standard_normal((t.size, 2))
    whoosh = dsp.svf(nz, fc, 1.6, "bp") * (np.sin(np.pi * u) ** 0.8)[:, None]
    squeal_f = 2000.0 + 4500.0 * np.sin(np.pi * u) * (1.0 + 0.05 * np.sin(dsp.TWO_PI * 23.0 * t))
    squeal = _sweep(squeal_f) * np.sin(np.pi * u) ** 2 * 0.08
    x = 0.25 * whoosh + squeal[:, None] * 0.7 + 0.3 * click[:, None]
    return x, 0


# ============================================================================ slot machine
def slot_spin(ev, k, ctx):
    """Reels spinning: a fast ratchet (~26 clicks/s, slowing a touch) over a whirr."""
    rng = rng_for("slot_spin", k)
    dur = ev.get("d", 4.0) * BEAT
    t = _t(dur + 0.1)
    rate = 26.0 - 6.0 * np.clip(t / dur, 0, 1) ** 2
    ph = np.cumsum(rate) / SR
    ticks = np.flatnonzero(np.diff(np.floor(ph)) > 0)
    out = np.zeros((t.size, 2))
    tt = _t(0.03)
    pans = (-0.35, 0.0, 0.35)
    for i, s in enumerate(ticks):
        nz = rng.standard_normal(tt.size)
        tick = dsp.filt(nz, dsp.butter("bp", (3200.0, 7000.0), 2)) * np.exp(-tt / 0.0018)
        ping = np.sin(dsp.TWO_PI * 1900.0 * rng.uniform(0.97, 1.03) * tt) * np.exp(-tt / 0.006)
        x = (tick + 0.3 * ping) * rng.uniform(0.7, 1.0)
        dsp.place(out, int(s), dsp.pan(x, pans[i % 3]))
    whirr = dsp.eq(rng.standard_normal(t.size), [("bp", 600.0, 1.5)]) * (0.6 + 0.4 * np.sin(dsp.TWO_PI * ph))
    out += 0.12 * whirr[:, None]
    env = np.clip(t / 0.03, 0, 1) * np.clip((dur + 0.08 - t) / 0.08, 0, 1)
    return 0.45 * out * env[:, None], 0


def lever_pull(ev, k, ctx):
    """The lever: ratchet ticks, then a metal clank and a low mechanical thud ('ka-CHUNK')."""
    rng = rng_for("lever", k)
    t = _t(0.3)
    x = np.zeros(t.size)
    for off in (0.0, 0.009, 0.017):                           # ratchet
        s = int(off * SR)
        tc = t[: t.size - s]
        x[s:] += 0.3 * dsp.filt(rng.standard_normal(tc.size), dsp.butter("bp", (3000.0, 6500.0), 2)) * np.exp(-tc / 0.0012)
    s = int(0.022 * SR)                                       # the clunk lands
    tc = t[: t.size - s]
    thud = np.sin(dsp.TWO_PI * np.cumsum(70.0 + 50.0 * np.exp(-tc / 0.02)) / SR) * np.exp(-tc / 0.05)
    thud += 0.5 * dsp.filt(rng.standard_normal(tc.size), dsp.butter("lp", 300.0, 2)) * np.exp(-tc / 0.015)
    clank = sum(a * np.sin(dsp.TWO_PI * f * (1.0 + rng.normal(0.0, 0.01)) * tc + rng.random() * 6.28) * np.exp(-tc / tau)
                for f, tau, a in ((640.0, 0.06, 1.0), (1010.0, 0.045, 0.8), (1630.0, 0.035, 0.6),
                                  (2440.0, 0.025, 0.45), (3150.0, 0.018, 0.3)))
    x[s:] += 0.7 * thud + 0.25 * clank
    return _mono(0.6 * x, -0.1), 0


def jackpot_bell(ev, k, ctx):
    """Jackpot: bright FM bells, one per reel (A5, D6, F#6 = D major, the false heaven),
    with a sparkling shimmer tail; reels sit left, centre, right."""
    p = ev.get("params", {})
    reel = int(p.get("reel", k)) % 3
    rng = rng_for("jackpot", reel)
    f = (880.0, 1174.66, 1479.98)[reel]
    dur = ev.get("d", 2.0) * BEAT + 1.6
    t = _t(dur)

    def bell(fc, ratio, i0, i1, tau, amp):
        idx = i1 + (i0 - i1) * np.exp(-t / 0.25)
        return amp * np.sin(dsp.TWO_PI * fc * t + idx * np.sin(dsp.TWO_PI * fc * ratio * t)) \
            * (1.0 - np.exp(-t / 0.0008)) * np.exp(-t / tau)

    x = bell(f, 3.5, 5.0, 0.6, 1.1, 1.0) + bell(2.0 * f, 1.4, 2.0, 0.2, 0.7, 0.4)
    out = dsp.pan(x, (-0.35, 0.0, 0.35)[reel])
    tg = _t(0.12)
    for _ in range(36):                                       # shimmer grains, thinning out
        s = int(abs(rng.exponential(0.45)) * SR)
        if s + tg.size >= t.size:
            continue
        fg = f * rng.choice([2, 3, 4, 5, 6]) * rng.uniform(0.995, 1.005)
        g = np.sin(dsp.TWO_PI * fg * tg) * np.exp(-tg / rng.uniform(0.03, 0.08)) * rng.uniform(0.04, 0.12)
        dsp.place(out, s, dsp.pan(g, rng.uniform(-0.8, 0.8)))
    return 0.4 * out, 0


# ============================================================================ builds / hits
def riser(ev, k, ctx):
    """Noise riser: a band-pass sweeping 250 Hz -> 9 kHz plus a rising detuned saw chord,
    widening as it climbs, stopping dead on the downbeat (tb + d)."""
    v = float(ev.get("params", {}).get("v", 0.7))
    rng = rng_for("riser", k)
    dur = ev["d"] * BEAT
    t = _t(dur)
    u = t / dur
    common = rng.standard_normal(t.size)
    nz = np.stack([common * (1 - 0.7 * u) + rng.standard_normal(t.size) * 0.9 * u,
                   common * (1 - 0.7 * u) + rng.standard_normal(t.size) * 0.9 * u], axis=1)
    fc = 250.0 * (9000.0 / 250.0) ** (u ** 1.2)
    noise = dsp.svf(nz, fc, 2.5, "bp")
    f = 146.83 * 2.0 ** (1.5 * u ** 1.5)
    tone = sum(dsp.saw(f * dsp.cents(c), phase0=rng.random()) for c in (-12.0, 0.0, 12.0, 1200.0))
    tone = dsp.svf(tone, np.minimum(3.0 * f + 500.0, 12000.0), 0.8, "lp", poles=4) / 4.0
    amp = u ** 2.2
    x = (noise * 1.2 + 0.35 * tone[:, None]) * amp[:, None]
    x = dsp.fade(x, int(0.006 * SR), int(0.004 * SR))
    return x * v, 0


def downlifter(ev, k, ctx):
    """Falling noise + falling tone + a sub drop: the power-down after a chorus."""
    v = float(ev.get("params", {}).get("v", 0.8))
    rng = rng_for("downlifter", k)
    dur = ev["d"] * BEAT
    t = _t(dur)
    u = t / dur
    nz = rng.standard_normal((t.size, 2))
    fc = 9000.0 * (180.0 / 9000.0) ** (u ** 0.8)
    noise = dsp.svf(nz, fc, 2.0, "bp") * ((1.0 - u) ** 1.6)[:, None]
    tone = _sweep(880.0 * (110.0 / 880.0) ** u) * (1.0 - u) ** 2 * 0.3
    sub = _sweep(70.0 * 0.5 ** u) * (1.0 - u) ** 1.5 * 0.4
    x = noise * 1.1 + (tone + sub)[:, None]
    return dsp.fade(x, int(0.01 * SR), int(0.02 * SR)) * v, 0


def impact(ev, k, ctx):
    """Cinematic hit: sub drop (75 -> 32 Hz) + boom + wide noise burst + crack."""
    v = float(ev.get("params", {}).get("v", 1.0))
    rng = rng_for("impact", k)
    dur = max(ev.get("d", 4.0) * BEAT, 1.0) + 1.0
    t = _t(dur)
    sub = _sweep(34.0 + 41.0 * np.exp(-t / 0.15)) * (1.0 - np.exp(-t / 0.002)) * np.exp(-t / 0.45)
    boom = _sweep(55.0 + 70.0 * np.exp(-t / 0.03)) * np.exp(-t / 0.12)
    nz = rng.standard_normal((t.size, 2))
    fc = 400.0 + 7600.0 * np.exp(-t / 0.2)
    noise = dsp.svf(nz, fc, 0.7, "lp") * ((1.0 - np.exp(-t / 0.001)) * np.exp(-t / 0.35))[:, None]
    noise = dsp.filt(noise, dsp.butter("hp", 100.0, 2))
    crack = dsp.filt(nz, dsp.butter("hp", 2000.0, 2)) * np.exp(-t / 0.008)[:, None]
    low = dsp.tanh_sat(0.6 * sub + 0.6 * boom, 1.3)
    x = low[:, None] * 0.7071 + 0.5 * noise + 0.35 * crack
    x = dsp.filt(x, dsp.butter("hp", 30.0, 2))
    x *= np.clip((dur - t) / 0.4, 0, 1)[:, None]
    return x * v, 0


def reverse_cymbal(ev, k, ctx):
    """A reversed crash swelling for d beats, cut dead on the downbeat."""
    rng = rng_for("reverse_cymbal", k)
    dur = ev["d"] * BEAT
    crash = drums.crash_hit(1.0, rng, dur=max(dur + 0.4, 2.0))
    rev = crash[::-1]
    rev = rev[-int(dur * SR):]
    u = np.linspace(0.0, 1.0, rev.shape[0])
    rev = dsp.svf(rev, 1500.0 * (16000.0 / 1500.0) ** u, 0.7, "lp") * (u ** 1.2)[:, None]
    return dsp.fade(rev, int(0.01 * SR), int(0.003 * SR)) * 0.9, 0


# ============================================================================ the end
def flatline(ev, k, ctx):
    """ECG flatline: a pure sine at params.hz over a faint mains hum, fading over d."""
    p = ev.get("params", {})
    hz = float(p.get("hz", 987.77))
    v = float(p.get("v", 0.5))
    dur = ev["d"] * BEAT
    t = _t(dur)
    tone = np.sin(dsp.TWO_PI * hz * t) + 0.01 * np.sin(dsp.TWO_PI * 2 * hz * t)
    hum = 0.02 * (np.sin(dsp.TWO_PI * 60.0 * t) + 0.5 * np.sin(dsp.TWO_PI * 120.0 * t)
                  + 0.25 * np.sin(dsp.TWO_PI * 180.0 * t))
    u = t / dur
    env = np.clip(t / 0.004, 0, 1) * np.where(u < 0.35, 1.0, 0.5 + 0.5 * np.cos(np.pi * (u - 0.35) / 0.65))
    return _mono(0.3 * (tone + hum) * env * v), 0


def ecg_beep(ev, k, ctx):
    """Single monitor beep (not used by the current score)."""
    hz = float(ev.get("params", {}).get("hz", 987.77))
    t = _t(0.09)
    x = np.sin(dsp.TWO_PI * hz * t)
    return _mono(dsp.fade(0.3 * x, int(0.002 * SR), int(0.01 * SR))), 0


def room_tone(ev, k, ctx):
    """The empty room after the song: very quiet, dark, slowly breathing air."""
    v = float(ev.get("params", {}).get("v", 0.12))
    rng = rng_for("room_tone", k)
    dur = ev["d"] * BEAT
    t = _t(dur)
    x = dsp.pink(t.size, rng, 2, slope_db=-4.5)
    x = dsp.eq(x, [("hp", 40.0, 2), ("lp", 900.0, 2)])
    x /= np.sqrt(np.mean(x ** 2)) + 1e-12
    drift = 10 ** ((1.0 * np.sin(dsp.TWO_PI * 0.08 * t + rng.random() * 6.28)) / 20.0)
    x = x * drift[:, None] * v * 0.25
    return dsp.fade(x, int(2.0 * SR), int(0.3 * SR)), 0


GENERATORS = {
    "heartbeat": heartbeat, "breath": breath, "typing_click": typing_click,
    "notification_ping": notification_ping, "phone_vibrate": phone_vibrate, "error_buzz": error_buzz,
    "retry_stab": retry_stab, "rewind": rewind, "slot_spin": slot_spin, "lever_pull": lever_pull,
    "jackpot_bell": jackpot_bell, "riser": riser, "downlifter": downlifter, "impact": impact,
    "reverse_cymbal": reverse_cymbal, "flatline": flatline, "ecg_beep": ecg_beep, "room_tone": room_tone,
}
MIX_STAGE = {"glitch_stutter", "tape_stop"}        # realised on the music buses in mix.py


def render_type(events, n_total, typ: str, context: dict | None = None):
    """Render all events of one FX type into one stereo stem."""
    from common import tb2n
    gen = GENERATORS[typ]
    buf = np.zeros((n_total, 2))
    for k, ev in enumerate(sorted(events, key=lambda e: e["tb"])):
        x, off = gen(ev, k, context or {})
        dsp.place(buf, tb2n(ev["tb"]) + off, x)
    return buf
