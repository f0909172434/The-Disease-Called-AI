#!/usr/bin/env python3
"""
Our score (music/build/vocals.json) -> OpenUtau .ustx for DiffSinger banks.

    python3 music/diffsinger/score_to_ustx.py --bank tiger --lines V1_1,C1_3 -o /tmp/v.ustx
    python3 music/diffsinger/score_to_ustx.py --bank hanami --voice ai_0 --timing ours -o x.ustx

One track per (bank, phonemizer), one part per line, placed at the line's song time
(tempo 172, 480 ticks per beat) with `--pre-roll` beats of room before the first note for the
leading consonants and DiffSinger's head padding. Every score syllable is a note carrying its
phonemes explicitly; notes after the first of a syllable are "+~" (vowel held, melisma).

Timing (who decides when the consonants are sung):
  bank   lyric "Sev[s eh]": OpenUtau's DiffSinger English phonemizer, the bank's own duration
         model places the consonants (vowel = note start, the DiffSinger convention).
  ours   lyric "Sev[s@-71 eh@0]": the vocal engine's planner rules (onset anticipation caps,
         legato zones, early release; music/vocal/planner.py) with class-typical consonant
         lengths, rendered through ourender's timed phonemizer ("OUR TIMED").
  A dict of explicit phoneme times (from another bank's duration model) can be given to
  part_for_line(); that is how the her->him morph keeps two banks on one timeline.

Pitch (what the acoustic model is told to sing):
  flat   the notes only (no portamento, no vibrato);
  bank   left to the bank's pitch model (`ourender render --pitch bank`, the piano roll's
         "Load rendered pitch");
  a contour (song-time seconds + MIDI) given to part_for_line() becomes the PITD curve —
         the vocal engine passes its expressive human / hard-tuned AI contour this way.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
import banks as bk  # noqa: E402
import phonemes as phm  # noqa: E402

BPM = 172.0
TPB = 480                                   # OpenUtau ticks per beat
SEC_PER_TICK = 60.0 / BPM / TPB
PITD_STEP = 5                               # OpenUtau curve grid (ticks)
TIMED_PHONEMIZER = "Ourender.TimedPhonemizer"
VOCALS_JSON = os.path.normpath(os.path.join(HERE, "..", "build", "vocals.json"))

# class-typical natural lengths (s) for the planner's "ours" timing (it caps/scales them)
NAT_LEN = {"plosive": 0.065, "flap": 0.030, "fricative": 0.090, "affricate": 0.090,
           "nasal": 0.065, "liquid": 0.060, "glide": 0.050, "vowel": 0.120, "stress": 0.030,
           "length": 0.020, "space": 0.0, "pause": 0.150, "other": 0.050}


def tb2tick(tb: float) -> int:
    return int(round(tb * TPB))


def sec2tick(t: float) -> int:
    return int(round(t / SEC_PER_TICK))


def tick2sec(k: float) -> float:
    return k * SEC_PER_TICK


# ----------------------------------------------------------------------------- specs

@dataclass
class NoteSpec:
    pos: int                    # absolute tick
    dur: int
    tone: int
    lyric: str
    n_phonemes: int = 0         # phonemes this note carries (for voice-colour expressions)


@dataclass
class PartSpec:
    name: str
    track: int
    position: int               # absolute tick
    notes: list[NoteSpec]
    pitd: tuple[list[int], list[int]] | None = None    # absolute ticks, cents
    meta: dict = field(default_factory=dict)

    @property
    def end(self) -> int:
        return max(n.pos + n.dur for n in self.notes)


@dataclass
class TrackSpec:
    name: str
    singer_id: str
    phonemizer: str
    colors: list[str] = field(default_factory=list)
    color_index: int | None = None


# ----------------------------------------------------------------------------- timing ("ours")

def ours_times(line: dict, lp: phm.LinePhonemes, st=None) -> dict[int, list[tuple[float, float]]]:
    """Planner timing for every phoneme: {syllable index: [(start, end) per Ph]} in song
    seconds. Natural lengths are class-typical; the planner caps and scales them exactly as
    for the Kokoro singer, so the vowel lands on the note."""
    import planner as pl
    from phonology import kind
    st = st or pl.TimingStyle()
    frame = 0.025
    nat = np.array([0.1] + [NAT_LEN.get(kind(c), 0.05) for c in lp.ps] + [0.1]) / frame
    plan = pl.plan_sung(line, nat, lp.ps, lp.slots, st)
    out = {}
    for s in lp.syllables:
        out[s.index] = [(min(plan.phones[i + 1].start for i in p.src),
                         max(plan.phones[i + 1].end for i in p.src)) for p in s.phones]
    return out


# ----------------------------------------------------------------------------- parts

def _lyric_text(s: str) -> str:
    t = "".join(c for c in s if c.isalnum() or c in "'")
    return t or "a"


def part_for_line(line: dict, lp: phm.LinePhonemes, bank: bk.Bank, track: int, *,
                  times: dict[int, list[tuple[float, float]]] | None = None,
                  contour: tuple[np.ndarray, np.ndarray] | None = None,
                  transpose: int = 0, pre_roll: float = 1.5, name: str | None = None,
                  dict_source: str = "ours") -> PartSpec:
    """One line as one part. `times` (song seconds per phoneme, see ours_times) switches the
    lyrics to the timed form; `contour` = (t seconds, MIDI) becomes the PITD curve."""
    timed = times is not None
    sylls = lp.syllables
    if dict_source == "bank" and not timed:
        sylls = _bank_dict_syllables(line, lp, bank)
    notes: list[NoteSpec] = []
    prev_end, prev_vowel = None, None
    for s in sylls:
        for k, n in enumerate(s.notes):
            pos, dur = tb2tick(n["tb"]), max(10, tb2tick(n["tb"] + n["d"]) - tb2tick(n["tb"]))
            tone = int(round(n["p"])) + transpose
            adjacent = prev_end is not None and pos == prev_end
            if k == 0 and not s.shares_prev:
                syms = [bank.map_phoneme(p.arpa, timed=timed) for p in s.phones]
                if timed:
                    toks = [f"{sym}@{sec2tick(t0) - pos}" for sym, (t0, _) in zip(syms, times[s.index])]
                else:
                    toks = syms
                lyric = f"{_lyric_text(s.text)}[{' '.join(toks)}]"
                nph = len(syms)
                prev_vowel = next((sym for sym, p in zip(syms, s.phones) if p.is_vowel), None)
            elif adjacent:
                lyric, nph = "+~", 0
            else:                       # held vowel after a rest: sing the vowel again
                v = prev_vowel or bank.map_phoneme("ah", timed=timed)
                lyric, nph = (f"{_lyric_text(s.text)}[{v}@0]" if timed else f"{_lyric_text(s.text)}[{v}]"), 1
            notes.append(NoteSpec(pos, dur, tone, lyric, nph))
            prev_end = pos + dur
    first = min(n.pos for n in notes)
    if timed:
        first = min(first, min(sec2tick(t[0]) for ts in times.values() for t in ts if ts))
    position = max(0, first - int(round(pre_roll * TPB)))
    part = PartSpec(name or line["id"], track, position, notes,
                    meta={"line": line["id"], "bank": bank.key, "singer": bank.singer_id,
                          "timing": "timed" if timed else "bank", "transpose": transpose})
    if contour is not None:
        part.pitd = pitd_curve(part, *contour, transpose=transpose)
    return part


def _bank_dict_syllables(line: dict, lp: phm.LinePhonemes, bank: bk.Bank) -> list[phm.Syl]:
    """Use the bank's own dictionary entry for a word when its vowels match the score's
    syllables one-to-one (tuned pronunciations such as TIGER's [cl] closures)."""
    out = []
    by_word: dict[int, list[phm.Syl]] = {}
    for s in lp.syllables:
        by_word.setdefault(s.word, []).append(s)
    for wi, ss in sorted(by_word.items()):
        word = line["words"][wi]["say"].lower().strip(".,!?;:\"'")
        entry = bank.entries.get(word)
        voiced = [s for s in ss if not s.shares_prev]
        if entry and word not in phm.pho.SUNG_OVERRIDES:
            vowels = {p for p in entry if bank.is_vowel(p)}
            parts = phm.syllabify_arpa([p.split("/")[-1] for p in entry], {v.split("/")[-1] for v in vowels})
            if len(parts) == len(voiced):
                it = iter(parts)
                for s in ss:
                    if s.shares_prev:
                        out.append(s)
                        continue
                    on, v, co = next(it)
                    phones = [phm.Ph(p, [], "onset") for p in on] + [phm.Ph(v, [], "nucleus")] + \
                             [phm.Ph(p, [], "coda") for p in co]
                    out.append(phm.Syl(s.index, s.word, s.text, s.notes, phones, False))
                continue
        out.extend(ss)
    return out


def pitd_curve(part: PartSpec, t: np.ndarray, midi: np.ndarray, transpose: int = 0):
    """PITD (cents relative to the notes, 5-tick grid) so that OpenUtau's pitch curve equals
    `midi` (+ transpose) at song time `t`. OpenUtau's base pitch at tick x is the tone of the
    first note ending after x (flat notes; no pitch points, no vibrato)."""
    xs = np.arange(part.position, part.end + 4 * PITD_STEP, PITD_STEP)
    ends = np.array([n.pos + n.dur for n in part.notes])
    tones = np.array([n.tone for n in part.notes], float)
    idx = np.minimum(np.searchsorted(ends, xs, side="right"), len(tones) - 1)
    base = tones[idx]
    target = np.interp(xs * SEC_PER_TICK, t, midi) + transpose
    ys = np.clip(np.round((target - base) * 100.0), -1200, 1200).astype(int)
    return xs.tolist(), ys.tolist()


# ----------------------------------------------------------------------------- ustx

def project_yaml(tracks: list[TrackSpec], parts: list[PartSpec], name: str = "vocals") -> str:
    import yaml
    doc = {
        "name": name, "comment": "generated by music/diffsinger/score_to_ustx.py",
        "output_dir": "Vocal", "cache_dir": "UCache", "ustx_version": "0.10",
        "bpm": BPM, "beat_per_bar": 4, "beat_unit": 4,
        "time_signatures": [{"bar_position": 0, "beat_per_bar": 4, "beat_unit": 4}],
        "tempos": [{"position": 0, "bpm": BPM}],
        "tracks": [], "voice_parts": [], "wave_parts": [],
    }
    for t in tracks:
        doc["tracks"].append({
            "singer": t.singer_id, "phonemizer": t.phonemizer,
            "renderer_settings": {"renderer": "DIFFSINGER"},
            "track_name": t.name, "track_color": "Blue", "mute": False, "solo": False,
            "volume": 0, "pan": 0, "track_expressions": [],
            "voice_color_names": t.colors or [""],
        })
    for p in parts:
        clr = tracks[p.track].color_index
        notes = []
        for n in sorted(p.notes, key=lambda n: n.pos):
            exps = [{"index": i, "abbr": "clr", "value": clr} for i in range(n.n_phonemes)] \
                if clr is not None else []
            notes.append({
                "position": n.pos - p.position, "duration": n.dur, "tone": n.tone, "lyric": n.lyric,
                "pitch": {"data": [{"x": 0, "y": 0, "shape": "io"}], "snap_first": False},
                "vibrato": {"length": 0, "period": 175, "depth": 25, "in": 10, "out": 10,
                            "shift": 0, "drift": 0, "vol_link": 0},
                "tuning": 0, "phoneme_expressions": exps, "phoneme_overrides": [],
            })
        curves = []
        if p.pitd is not None:
            xs, ys = p.pitd
            curves.append({"xs": [x - p.position for x in xs], "ys": list(ys), "abbr": "pitd"})
        doc["voice_parts"].append({
            "duration": p.end - p.position + TPB, "name": p.name,
            "comment": json.dumps(p.meta, ensure_ascii=False), "track_no": p.track,
            "position": p.position, "notes": notes, "curves": curves, "masked_curves": [],
        })
    return yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, default_flow_style=False, width=1000)


def write_ustx(path: str, tracks: list[TrackSpec], parts: list[PartSpec], name: str = "vocals") -> str:
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(project_yaml(tracks, parts, name))
    return path


def track_for(bank: bk.Bank, timed: bool, name: str | None = None) -> TrackSpec:
    return TrackSpec(name or f"{bank.key}{'-timed' if timed else ''}", bank.singer_id,
                     TIMED_PHONEMIZER if timed else bank.phonemizer, bank.colors,
                     bank.color_index(bank.color))


# ----------------------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--bank", required=True, help="bank profile: " + ", ".join(bk.PROFILES))
    ap.add_argument("--lines", help="comma-separated line ids")
    ap.add_argument("--voice", help="all sung lines of this voice (you, ai_0, ...)")
    ap.add_argument("--timing", choices=["bank", "ours"], default="bank")
    ap.add_argument("--pitch", choices=["flat", "bank"], default="flat",
                    help="flat = notes only; bank = render with `ourender render --pitch bank`")
    ap.add_argument("--dict", choices=["ours", "bank"], default="ours", dest="dict_source")
    ap.add_argument("--transpose", type=int, default=0)
    ap.add_argument("--vocals", default=VOCALS_JSON)
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args(argv)
    with open(a.vocals) as fh:
        vocals = json.load(fh)
    lines = [l for l in vocals["lines"] if l["mode"] == "sung"]
    if a.lines:
        want = a.lines.split(",")
        lines = [l for l in lines if l["id"] in want]
    if a.voice:
        lines = [l for l in lines if l["voice"] == a.voice]
    bank = bk.find(a.bank)
    timed = a.timing == "ours"
    tracks = [track_for(bank, timed)]
    parts = []
    for line in lines:
        lp = phm.line_phonemes(line)
        times = ours_times(line, lp) if timed else None
        parts.append(part_for_line(line, lp, bank, 0, times=times, transpose=a.transpose,
                                   dict_source=a.dict_source))
    write_ustx(a.out, tracks, parts)
    print(f"{a.out}: {len(parts)} parts on {bank.singer_id} ({a.timing} timing, {a.pitch} pitch)")


if __name__ == "__main__":
    main()
