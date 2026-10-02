#!/usr/bin/env python3
"""Generate visuals/data/timeline.placeholder.json from the 172 BPM score grid.

    python3 analysis/make_placeholder_timeline.py [--fps 60] [--out visuals/data/timeline.placeholder.json]

Same schema as the real analysis output (docs/06_tech_spec.md §5) so the visual engine can be
developed before music exists. Everything here is *fake but plausible*:

  * beats / downbeats / sections straight from the grid (tb -> seconds)
  * drum onsets from per-section patterns (four-on-the-floor kicks in choruses, half-time in
    verses, snare rolls into choruses, true silence in the 503 gap, no drums in intro/outro)
  * story events from the storyboard (intro typing with the "yuo" typo, heartbeat lub/dub,
    Retry stabs accelerating 1/4 -> 1/32, Regenerate clicks, lever pulls, outro typing ...)
  * per-frame envelopes synthesized from those onsets (exponential decays), normalized 0..1
  * lyric lines parsed from docs/03_lyrics.md with evenly spaced syllables

Deterministic: no randomness except a fixed-seed numpy Generator for tiny humanization.
"""
from __future__ import annotations

import argparse
import json
import math
import re
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent.parent
LYRICS_MD = REPO / "docs" / "03_lyrics.md"
DEFAULT_OUT = REPO / "visuals" / "data" / "timeline.placeholder.json"

BPM = 172.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
GRID_END_TB = 592
DURATION = 215.0

SECTIONS = [  # id, name, start bar (1-indexed), end bar (exclusive)
    ("S00", "INTRO", 1, 9), ("S01", "RIFF", 9, 17), ("S02", "VERSE1", 17, 33),
    ("S03", "PRE1", 33, 41), ("S04", "CHORUS1", 41, 57), ("S05", "POST", 57, 61),
    ("S06", "VERSE2", 61, 77), ("S07", "PRE2_503", 77, 85), ("S08", "CHORUS2", 85, 101),
    ("S09", "BRIDGE", 101, 121), ("S10", "FINAL", 121, 137), ("S11", "TAG", 137, 141),
    ("S12", "OUTRO", 141, 149), ("S13", "ENDCARD", 149, None),
]

# lyric section headers in docs/03_lyrics.md -> section id
HEADER_TO_SECTION = {
    "INTRO": "S00", "RIFF": "S01", "VERSE 1": "S02", "PRE-CHORUS 1": "S03", "CHORUS 1": "S04",
    "POST-CHORUS": "S05", "VERSE 2": "S06", "PRE-CHORUS 2": "S07", "CHORUS 2": "S08",
    "BRIDGE": "S09", "FINAL CHORUS": "S10", "TAG": "S11", "OUTRO": "S12",
}


def tb(bar: float, beat: float = 1.0) -> float:
    """bar/beat (1-indexed, fractional beats allowed) -> beat time."""
    return (bar - 1) * 4 + (beat - 1)


def sec(tb_: float) -> float:
    return tb_ * BEAT


def r4(x: float) -> float:
    return round(float(x), 4)


# ---------------------------------------------------------------- drums / onsets

def drum_onsets() -> dict[str, list[float]]:
    kick: list[float] = []
    snare: list[float] = []
    hat: list[float] = []

    def bars(a, b):
        return range(a, b)

    for b in bars(9, 17):  # RIFF: driving rock, syncopated kick
        kick += [tb(b, 1), tb(b, 2.5), tb(b, 3)]
        snare += [tb(b, 2), tb(b, 4)]
        hat += [tb(b, 1 + i * 0.5) for i in range(8)]
    for i in range(16):  # b16 snare build (16ths), replaces bar-16 backbeat
        snare.append(tb(16, 1 + i * 0.25))
    for b in list(bars(17, 33)) + list(bars(61, 77)):  # verses: half-time
        kick += [tb(b, 1)] + ([tb(b, 2.5)] if b % 2 == 0 else [])
        snare += [tb(b, 3)]
        hat += [tb(b, 1 + i * 0.5) for i in range(8)]
    for b in bars(33, 39):  # PRE1 building
        kick += [tb(b, 1), tb(b, 3)]
        snare += [tb(b, 3)]
        hat += [tb(b, 1 + i * 0.25) for i in range(16)]
    for b in (39, 40):  # snare roll into chorus: 8ths -> 16ths -> 32nds (stop before b40.4)
        kick += [tb(b, 1), tb(b, 3)]
        step = 0.5 if b == 39 else 0.25
        n = int(4 / step) if b == 39 else 12
        snare += [tb(b, 1 + i * step) for i in range(n)]
        if b == 40:
            snare += [tb(40, 3.5 + i * 0.125) for i in range(4)][:0]
    for b in list(bars(41, 57)) + list(bars(85, 101)) + list(bars(121, 137)):  # choruses
        if b == 100:
            kick += [tb(b, 1), tb(b, 2)]
            snare += [tb(b, 2)]
            continue  # b100.3: hard cut to black
        kick += [tb(b, i) for i in (1, 2, 3, 4)]
        snare += [tb(b, 2), tb(b, 4)]
        hat += [tb(b, 1.5 + i) for i in range(4)]  # open hats on the off-beats
        if b in (56, 136):
            snare += [tb(b, 4 + i * 0.25) for i in range(4)]
    for b in bars(57, 61):  # POST
        kick += [tb(b, i) for i in (1, 2, 3, 4)]
        snare += [tb(b, 2), tb(b, 4)]
        hat += [tb(b, 1 + i * 0.5) for i in range(8)]
    for b in bars(77, 81):  # PRE2 (503 build): glitchy half-time
        kick += [tb(b, 1), tb(b, 3)]
        snare += [tb(b, 3)] + ([tb(b, 4.5)] if b >= 79 else [])
        hat += [tb(b, 1 + i * 0.5) for i in range(8)]
    # b81-84: TRUE SILENCE (no drums); retry stabs are events
    kick += [tb(109, 1)]  # jackpot impact
    for b in bars(111, 119):  # mirror: soft heartbeat kick on 1
        kick += [tb(b, 1)]
    for b in (119, 120):  # snare roll into final chorus
        step = 0.5 if b == 119 else 0.25
        snare += [tb(b, 1 + i * step) for i in range(int(4 / step) if b == 119 else 12)]
        kick += [tb(b, 1)]
    for b in bars(137, 141):  # TAG
        kick += [tb(b, i) for i in (1, 2, 3, 4)]
        snare += [tb(b, 2), tb(b, 4)]
        hat += [tb(b, 1 + i * 0.5) for i in range(8)]
    return {
        "kick": sorted(set(r4(sec(x)) for x in kick)),
        "snare": sorted(set(r4(sec(x)) for x in snare)),
        "hat": sorted(set(r4(sec(x)) for x in hat)),
    }


def musicbox_onsets() -> list[float]:
    out = []
    for b in range(101, 109):  # confessional: sparse quarter notes
        out += [tb(b, 1), tb(b, 3)]
    for b in range(111, 119):  # black mirror: 8th-note music box
        out += [tb(b, 1 + i * 0.5) for i in range(8) if i not in (3, 7)]
    for b in range(1, 9):  # intro: a few lonely notes in bars 5-8
        if b >= 5:
            out += [tb(b, 1), tb(b, 3.5)]
    return sorted(r4(sec(x)) for x in out)


# ---------------------------------------------------------------- events

def events() -> dict[str, list[dict]]:
    ev: dict[str, list[dict]] = {}
    # S00 typing: "are yuo" -> 3x backspace -> "you there?" (b3-b4), Enter just before b5.1
    typing = [
        (2.950, "a"), (3.080, "r"), (3.190, "e"), (3.310, " "), (3.450, "y"), (3.550, "u"), (3.660, "o"),
        (3.990, "\b"), (4.080, "\b"), (4.170, "\b"),
        (4.310, "y"), (4.410, "o"), (4.505, "u"), (4.625, " "), (4.735, "t"), (4.825, "h"), (4.925, "e"),
        (5.020, "r"), (5.110, "e"), (5.300, "?"), (5.470, "\n"),
    ]
    ev["typing"] = [{"t": r4(t), "ch": c, **({"key": "Backspace"} if c == "\b" else {}),
                     **({"key": "Enter"} if c == "\n" else {})} for t, c in typing]
    # S12 outro: the AI types "are you there?" mechanically on 8th notes from b143.2
    s = "are you there?"
    ev["typing_outro"] = [{"t": r4(sec(tb(143, 2) + i * 0.5)), "ch": c} for i, c in enumerate(s)]
    # heartbeat: lub on beats 1 & 3, dub an 8th later (S00); accelerating in the 503 silence
    hb = []
    for b in range(1, 9):
        for beat in (1, 3):
            if b == 8 and beat == 3:
                continue  # last beat of intro is black/silent
            hb.append({"t": r4(sec(tb(b, beat))), "kind": "lub"})
            hb.append({"t": r4(sec(tb(b, beat + 0.5))), "kind": "dub"})
    t = sec(tb(81, 1))
    period = 2 * BEAT
    while t < sec(tb(83, 1)) - 0.05:
        hb.append({"t": r4(t), "kind": "lub"})
        hb.append({"t": r4(t + 0.16), "kind": "dub"})
        period *= 0.9
        t += period
    for b in range(141, 143):  # flatline section: two last weak beats
        hb.append({"t": r4(sec(tb(b, 1))), "kind": "lub"})
        hb.append({"t": r4(sec(tb(b, 1.5))), "kind": "dub"})
    ev["heartbeat"] = sorted(hb, key=lambda e: e["t"])
    # retry: b83-84, quarters -> 8ths -> 16ths -> 32nds, stops before b84.4 ("I'm here.")
    rt = [tb(83, 1), tb(83, 2)] + [tb(83, 3 + i * 0.5) for i in range(4)] \
        + [tb(84, 1 + i * 0.25) for i in range(8)] + [tb(84, 3 + i * 0.125) for i in range(8)]
    ev["retry"] = [{"t": r4(sec(x)), "i": i} for i, x in enumerate(rt)]
    ev["regenerate"] = [{"t": r4(sec(tb(104, 4))), "n": 1}, {"t": r4(sec(tb(106, 4))), "n": 2},
                        {"t": r4(sec(tb(107, 3.5))), "n": 3}]
    lever = [tb(108, 1), tb(108, 2), tb(108, 3), tb(108, 3.5)] + [tb(108, 4 + i * 0.25) for i in range(4)]
    ev["lever"] = [{"t": r4(sec(x)), "i": i} for i, x in enumerate(lever)]
    ev["jackpot"] = [{"t": r4(sec(tb(109, b))), "reel": b - 1, "text": w}
                     for b, w in ((1, "YES"), (2, "I LOVE YOU"), (3, "ONLY YOU"))]
    ev["phone"] = [{"t": r4(sec(tb(b, beat))), "kind": "vibrate"} for b in range(61, 65) for beat in (1, 2, 3, 4)]
    ev["flatline"] = [{"t": r4(sec(tb(141, 1))), "d": r4(2 * BAR)}]
    ev["send"] = [{"t": 5.47, "who": "you"}, {"t": r4(sec(tb(5, 1))), "who": "ai", "text": "Always."}]
    return ev


# ---------------------------------------------------------------- lyrics

VOWELS = set("aeiouyAEIOUY")


DIGRAPHS = ("th", "sh", "ch", "ph", "wh", "ck", "ng", "gh")


def syllabify(word: str) -> list[str]:
    """Rough English syllabification (placeholder quality): vowel groups, silent final e / -ed,
    VC-CV split keeping digraphs together; dotted acronyms (A.I., a.m.) are one syllable per letter."""
    if re.fullmatch(r"(?:[A-Za-z]\.){2,}[,.;:!?\u2014]*", word):
        return re.findall(r"[A-Za-z]", word)
    core = re.sub(r"[^A-Za-z']", "", word)
    if not core:
        return []
    low = core.lower()
    groups = [(m.start(), m.end()) for m in re.finditer(r"[aeiouy]+", low)]
    if low.startswith("y") and groups and groups[0][0] == 0 and len(low) > 1 and low[1] in "aeiou":
        groups = [(m.start(), m.end()) for m in re.finditer(r"[aeiouy]+", low[1:])]
        groups = [(a + 1, b + 1) for a, b in groups]
    if len(groups) > 1 and low.endswith("e") and not low.endswith("le") and groups[-1] == (len(low) - 1, len(low)):
        groups = groups[:-1]
    if len(groups) > 1 and low.endswith("es") and groups[-1][0] == len(low) - 2 and low[-3] not in "sxzcg":
        groups = groups[:-1]
    if len(groups) > 1 and low.endswith("ed") and groups[-1][0] == len(low) - 2 and low[-3] not in "td":
        groups = groups[:-1]
    if len(groups) <= 1:
        return [core]
    cuts = []
    for (a1, b1), (a2, _b2) in zip(groups, groups[1:]):
        cons = a2 - b1
        cluster = low[b1:a2]
        if cons <= 1:
            cuts.append(b1)
        elif cons == 2 and cluster in DIGRAPHS:
            cuts.append(b1)
        elif cons >= 3 and cluster[-2:] in DIGRAPHS:
            cuts.append(a2 - 2)
        else:
            cuts.append(b1 + cons // 2)
    parts, prev = [], 0
    for c in cuts:
        parts.append(core[prev:c])
        prev = c
    parts.append(core[prev:])
    return [p for p in parts if p]


def parse_lyrics_md() -> list[dict]:
    lines, sid = [], None
    for raw in LYRICS_MD.read_text(encoding="utf-8").splitlines():
        h = re.match(r"^###\s*\[([^\]·]+)", raw)
        if h:
            name = h.group(1).strip()
            sid = next((v for k, v in HEADER_TO_SECTION.items() if name.startswith(k)), None)
            continue
        if not sid or not raw.startswith("|"):
            continue
        cells = [c.strip() for c in raw.strip().strip("|").split("|")]
        if len(cells) < 3 or cells[0] in ("", "—") or set(cells[0]) <= set("-"):
            continue
        who, en, zh = cells[0], cells[1], cells[2]
        if who not in ("YOU", "AI", "BOTH", "YOU (+AI)") and not who.startswith("AI"):
            continue
        spoken = en.startswith("*") and en.endswith("*")
        interject = en.startswith("(") and en.endswith(")")
        text = en.strip("*").strip()
        if interject:
            text = text[1:-1]
            zh = zh.strip("（）")
        speaker = {"YOU": "you", "BOTH": "both", "YOU (+AI)": "you"}.get(who, "ai")
        style = "human" if speaker == "you" else ("choir" if speaker == "both" else ("ai_her" if "她" in who else "ai"))
        lines.append({"section": sid, "speaker": speaker, "style": style,
                      "mode": "spoken" if (spoken or interject) else "sung",
                      "text": text, "zh": zh, **({"harmony": ["ai"]} if who == "YOU (+AI)" else {})})
    return lines


# (start tb, duration in beats) for every parsed lyric line, in document order, per section
def lyric_slots() -> dict[str, list[tuple[float, float]]]:
    two_bar = lambda first, n: [(tb(first + 2 * i, 1), 6.5) for i in range(n)]
    v2 = []
    for i in range(4):  # verse 2: (YOU, YOU, AI) x 4 per 4 bars
        b = 61 + 4 * i
        v2 += [(tb(b, 1), 5.5), (tb(b + 1, 3), 5.5), (tb(b + 3, 1), 2.5)]
    v2 = [v2[0], v2[1], v2[2], v2[3], v2[4], v2[5], v2[6], v2[7], v2[8], v2[9], v2[10], v2[11]]
    return {
        "S00": [(13.0, 3.0), (16.0, 2.0)],
        "S02": [(tb(17 + 2 * i, 1), 5.75) for i in range(8)] + [(tb(32, 3), 1.5)],
        "S03": two_bar(33, 4),
        "S04": two_bar(41, 8),
        "S05": [(tb(57, 1), 15.0)],
        "S06": v2,
        "S07": [(tb(77, 1), 7.0), (tb(79, 1), 7.0), (tb(81, 3), 4.0), (tb(83, 1), 6.0), (tb(84, 4), 1.0)],
        "S08": two_bar(85, 8),
        "S09": [(tb(101, 1), 7.0), (tb(103, 1), 6.0), (tb(105, 1), 7.0), (tb(107, 1), 2.4),
                (tb(109, 1), 7.0), (tb(111, 1), 7.0), (tb(113, 1), 7.0), (tb(115, 1), 7.0),
                (tb(117, 1), 7.0), (tb(119, 3), 2.5)],
        "S10": two_bar(121, 8),
        "S11": [(tb(137, 1), 7.0)],
        "S12": [(tb(143, 2), 7.0)],
    }


def build_lyrics() -> list[dict]:
    parsed = parse_lyrics_md()
    slots = lyric_slots()
    used: dict[str, int] = {}
    out = []
    for ln in parsed:
        sid = ln["section"]
        k = used.get(sid, 0)
        used[sid] = k + 1
        if sid not in slots or k >= len(slots[sid]):
            continue
        start_tb, dur_beats = slots[sid][k]
        start, dur = sec(start_tb), dur_beats * BEAT
        syl_txt = [s for w in ln["text"].split() for s in syllabify(w)]
        n = max(1, len(syl_txt))
        step = dur / n
        syllables = []
        for i, s in enumerate(syl_txt):
            a = start + i * step
            syllables.append({"text": s, "start": r4(a), "end": r4(a + step * (0.92 if ln["mode"] == "sung" else 0.8))})
        out.append({"id": f"{sid}_{k + 1}", **ln, "start": r4(start),
                    "end": r4(syllables[-1]["end"] if syllables else start + dur), "syllables": syllables})
    return out


# ---------------------------------------------------------------- envelopes

INTENSITY = [  # (t start, level) piecewise-constant section loudness, ramps handled below
    ("S00", 0.12), ("S01", 0.85), ("S02", 0.55), ("S03", 0.66), ("S04", 0.95), ("S05", 0.82),
    ("S06", 0.50), ("S07", 0.62), ("S08", 1.00), ("S09", 0.38), ("S10", 1.00), ("S11", 0.90),
    ("S12", 0.10), ("S13", 0.0),
]


def decay_env(times: np.ndarray, onsets: list[float], tau: float, attack: float = 0.006,
              weights: list[float] | None = None) -> np.ndarray:
    env = np.zeros_like(times)
    for i, o in enumerate(onsets):
        w = 1.0 if weights is None else weights[i]
        a = np.searchsorted(times, o - attack)
        b = np.searchsorted(times, o + tau * 7)
        dt = times[a:b] - o
        seg = np.where(dt < 0, (dt + attack) / attack, np.exp(-np.maximum(dt, 0) / tau)) * w
        env[a:b] += seg
    return env


def softclip(x: np.ndarray) -> np.ndarray:
    return 1.0 - np.exp(-np.maximum(x, 0) * 1.6)


def vox_env(times: np.ndarray, lyrics: list[dict], speakers: set[str]) -> np.ndarray:
    env = np.zeros_like(times)
    for ln in lyrics:
        if ln["speaker"] not in speakers:
            continue
        for k, s in enumerate(ln["syllables"]):
            a, b = s["start"], s["end"]
            i0, i1 = np.searchsorted(times, a - 0.02), np.searchsorted(times, b + 0.12)
            tt = times[i0:i1]
            att = np.clip((tt - a + 0.02) / 0.04, 0, 1)
            rel = np.clip(1 - (tt - b) / 0.12, 0, 1)
            vib = 0.88 + 0.12 * np.sin((tt - a) * 2 * math.pi * 5.5 + k)
            env[i0:i1] = np.maximum(env[i0:i1], att * rel * vib * (0.75 + 0.25 * ((k * 7) % 5) / 4))
    return env


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    fps = args.fps

    sections = []
    for sid, name, b0, b1 in SECTIONS:
        start = sec(tb(b0))
        end = sec(tb(b1)) if b1 else DURATION
        sections.append({"id": sid, "name": name, "start": r4(start), "end": r4(end),
                         "start_tb": tb(b0), "end_tb": tb(b1) if b1 else round(DURATION / BEAT, 3)})

    beats = [r4(sec(i)) for i in range(GRID_END_TB + 1)]
    downbeats = [r4(sec(i)) for i in range(0, GRID_END_TB + 1, 4)]
    drums = drum_onsets()
    lyrics = build_lyrics()
    ev = events()
    vox_you_on = sorted(s["start"] for ln in lyrics if ln["speaker"] in ("you", "both") for s in ln["syllables"])
    vox_ai_on = sorted(s["start"] for ln in lyrics if ln["speaker"] in ("ai", "both") for s in ln["syllables"])
    onsets = {**drums, "vox_you": vox_you_on, "vox_ai": vox_ai_on, "musicbox": musicbox_onsets()}

    n = int(round(DURATION * fps)) + 1
    times = np.arange(n) / fps
    inten = np.zeros(n)
    for (sid, lvl), s in zip(INTENSITY, sections):
        inten[(times >= s["start"]) & (times < s["end"])] = lvl
    silence = (times >= sec(tb(81))) & (times < sec(tb(85)) - 0.05)  # 503 gap (retry stabs only)
    silence |= (times >= sec(tb(100, 3))) & (times < sec(tb(101)))  # b100.3 cut
    inten[silence] = 0.0
    inten = np.convolve(inten, np.ones(9) / 9, mode="same")  # soften section steps

    kick = softclip(decay_env(times, drums["kick"], 0.11))
    snare = softclip(decay_env(times, drums["snare"], 0.14))
    hat = softclip(decay_env(times, drums["hat"], 0.05) * 0.8)
    hb_t = [e["t"] for e in ev["heartbeat"]]
    hb_w = [1.0 if e["kind"] == "lub" else 0.6 for e in ev["heartbeat"]]
    heart = softclip(decay_env(times, hb_t, 0.09, weights=hb_w))
    retry = softclip(decay_env(times, [e["t"] for e in ev["retry"]], 0.05))
    bass = softclip(decay_env(times, drums["kick"], 0.32) * 0.7 + inten * 0.5)
    vyou = vox_env(times, lyrics, {"you", "both"})
    vai = vox_env(times, lyrics, {"ai", "both"})
    mbox = softclip(decay_env(times, onsets["musicbox"], 0.4) * 0.6)

    low = np.clip(0.65 * kick + 0.45 * bass * (inten > 0.05) + 0.55 * heart, 0, 1)
    mid = np.clip(0.35 * snare + 0.45 * np.maximum(vyou, vai) + 0.3 * inten + 0.3 * mbox + 0.4 * retry, 0, 1)
    high = np.clip(0.55 * hat + 0.25 * snare + 0.15 * inten + 0.5 * retry, 0, 1)
    rms = np.clip(0.55 * inten + 0.2 * kick * inten + 0.12 * snare + 0.15 * np.maximum(vyou, vai)
                  + 0.2 * heart + 0.3 * retry + 0.1 * mbox, 0, 1)

    def arr(x):
        return [round(float(v), 3) for v in x]

    data = {
        "placeholder": True,
        "generated_by": "analysis/make_placeholder_timeline.py",
        "fps": fps, "duration": DURATION,
        "bpm": {"detected": BPM, "score": int(BPM), "beat_mae_ms": 0.0},
        "beats": beats, "downbeats": downbeats,
        "sections": sections,
        "onsets": onsets,
        "events": ev,
        "env": {"rms": arr(rms), "low": arr(low), "mid": arr(mid), "high": arr(high),
                "kick": arr(kick), "snare": arr(snare), "bass": arr(bass),
                "vox_you": arr(vyou), "vox_ai": arr(vai), "heart": arr(heart)},
        "lyrics": lyrics,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {args.out} ({args.out.stat().st_size / 1e6:.2f} MB): {len(lyrics)} lyric lines, "
          f"{len(drums['kick'])} kicks, {len(drums['snare'])} snares, {n} env frames @ {fps} fps")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
