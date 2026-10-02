"""Small music-theory toolkit used by song.py.

Nothing here knows about the song itself: note names, chord symbols, voice leading,
diatonic transposition and the compact melody notation used to write the vocal lines.
"""
from __future__ import annotations

import re

BPM = 172
BEAT_SEC = 60.0 / BPM
BAR_BEATS = 4

_PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def midi(name: str) -> int:
    """'D4' -> 62, 'C#5' -> 73, 'Bb1' -> 34."""
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", name)
    if not m:
        raise ValueError(f"bad note name {name!r}")
    pc = _PC[m.group(1)] + {"#": 1, "b": -1, "": 0}[m.group(2)]
    return 12 * (int(m.group(3)) + 1) + pc


def tb(bar: float, beat: float = 1.0) -> float:
    """Bar (1-indexed) and beat (1-indexed) -> beat time from song start."""
    return (bar - 1) * BAR_BEATS + (beat - 1)


def sec(tb_: float) -> float:
    return tb_ * BEAT_SEC


# --------------------------------------------------------------------------- chords

QUALITY = {
    "": (0, 4, 7),
    "m": (0, 3, 7),
    "7": (0, 4, 7, 10),
    "m7": (0, 3, 7, 10),
    "maj7": (0, 4, 7, 11),
    "sus4": (0, 5, 7),
    "7sus4": (0, 5, 7, 10),
    "add9": (0, 4, 7, 14),
    "madd9": (0, 3, 7, 14),
    "m9": (0, 3, 7, 10, 14),
    "5": (0, 7),
}


def parse_chord(sym: str) -> tuple[int, tuple[int, ...]]:
    """'Bbmaj7' -> (10, (0,4,7,11)). Root is a pitch class."""
    m = re.fullmatch(r"([A-G])([#b]?)(.*)", sym)
    if not m:
        raise ValueError(f"bad chord {sym!r}")
    root = (_PC[m.group(1)] + {"#": 1, "b": -1, "": 0}[m.group(2)]) % 12
    return root, QUALITY[m.group(3)]


def chord_pcs(sym: str) -> list[int]:
    root, q = parse_chord(sym)
    return sorted({(root + i) % 12 for i in q})


def root_in_range(sym: str, lo: int, hi: int) -> int:
    """Lowest MIDI note >= lo that is the chord root (wraps so the result is <= hi)."""
    root, _ = parse_chord(sym)
    n = lo + ((root - lo) % 12)
    if n > hi:
        n -= 12
    return n


def voice_chord(sym: str, prev: list[int] | None, lo: int, hi: int, size: int = 4) -> list[int]:
    """Pick `size` chord tones inside [lo, hi] that move as little as possible from `prev`.

    Brute force over all candidate voicings: cheap enough (a few hundred per chord).
    """
    pcs = chord_pcs(sym)
    root, _ = parse_chord(sym)
    pool = [n for n in range(lo, hi + 1) if n % 12 in pcs]
    best, best_cost = None, 1e9

    def rec(start: int, chosen: list[int]):
        nonlocal best, best_cost
        if len(chosen) == size:
            got = {n % 12 for n in chosen}
            if root % 12 not in got or len(got) < min(size, len(pcs)):
                return
            if any(b - a < 3 for a, b in zip(chosen, chosen[1:])):  # avoid muddy seconds
                return
            if prev:
                cost = sum(min(abs(n - p) for p in prev) for n in chosen)
            else:
                cost = abs(sum(chosen) / size - (lo + hi) / 2)
            if cost < best_cost:
                best, best_cost = list(chosen), cost
            return
        for i in range(start, len(pool)):
            rec(i + 1, chosen + [pool[i]])

    rec(0, [])
    if best is None:  # fall back to a plain close-position stack
        r = root_in_range(sym, lo, hi)
        best = [r + i for i in parse_chord(sym)[1]][:size]
    return best


# --------------------------------------------------------------------------- scales

SCALES = {
    "D minor": [2, 4, 5, 7, 9, 10, 0],
    "D major": [2, 4, 6, 7, 9, 11, 1],
    "E minor": [4, 6, 7, 9, 11, 0, 2],
}


def diatonic_shift(p: int, steps: int, scale: str) -> int:
    """Move MIDI note `p` by `steps` scale degrees.

    A chromatic note (e.g. the raised leading tone C# in D minor) is treated as an
    inflection of the scale tone just above it, so a third above C# becomes E, not F.
    """
    pcs = SCALES[scale]
    ladder = [n for n in range(128) if n % 12 in pcs]
    q = p
    while q % 12 not in pcs:
        q += 1
    return ladder[ladder.index(q) + steps] - (q - p)


# --------------------------------------------------------------------------- melody notation

def parse_melody(spec: str, start_tb: float, transpose: int = 0):
    """Parse the compact vocal notation into words and syllables.

    Tokens (durations are in eighth notes):
      ``Sev:D4:1``   a syllable that starts a new word
      ``-en:D4:1``   a syllable continuing the previous word
      ``+:G4:1``     melisma: the previous syllable continues on a new pitch
      ``_:2``        rest
    """
    words: list[dict] = []
    syllables: list[dict] = []
    t = start_tb
    for tok in spec.split():
        parts = tok.split(":")
        if parts[0] == "_":
            t += float(parts[1]) * 0.5
            continue
        text, pitch, dur = parts
        d = float(dur) * 0.5
        note = {"tb": round(t, 4), "d": d, "p": midi(pitch) + transpose}
        if text == "+":
            syllables[-1]["notes"].append(note)
        else:
            cont = text.startswith("-")
            text = text.lstrip("-")
            if not cont:
                words.append({"text": "", "syl": []})
            words[-1]["text"] += text
            words[-1]["syl"].append(len(syllables))
            syllables.append({"text": text, "notes": [note]})
        t += d
    return words, syllables, t - start_tb


def melody_length_eighths(spec: str) -> float:
    total = 0.0
    for tok in spec.split():
        parts = tok.split(":")
        total += float(parts[1] if parts[0] == "_" else parts[2])
    return total
