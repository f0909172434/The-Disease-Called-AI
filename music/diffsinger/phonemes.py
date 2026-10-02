"""
Lyrics -> ARPAbet phonemes per *score syllable*, for DiffSinger banks.

The pronunciation is the vocal engine's own (music/vocal): misaki G2P on the whole line
(the same en.G2P + espeak fallback Kokoro uses), the sung overrides (every -> ev-ry ...),
the sung diction rule (the/a/to un-reduced on long notes) and the onset-maximal syllabifier
that matches misaki's vowels to the score's syllables (planner.prepare_line). Each syllable's
onset / nucleus / coda characters are then converted to ARPAbet, keeping track of which
misaki characters every ARPAbet phoneme came from (so DiffSinger phoneme times can be mapped
back onto the engine's plan).

DiffSinger's phonemizer starts a new note at every vowel, so a syllable must carry exactly
one vowel (or none: a syllable that shares the previous vowel is a melisma, "+~"). Vowels
that misaki has but the score does not (merged by the syllabifier) become a glide (i/ɪ -> y,
u/ʊ -> w) or are dropped.
"""
from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field

HERE = os.path.dirname(os.path.abspath(__file__))
VOCAL = os.path.normpath(os.path.join(HERE, "..", "vocal"))
if VOCAL not in sys.path:
    sys.path.insert(0, VOCAL)

import phonology as pho  # noqa: E402  (music/vocal)

# ----------------------------------------------------------------------------- symbol tables

# misaki (US) vowel symbol -> ARPAbet
VOWEL_MAP = {
    "A": "ey", "I": "ay", "O": "ow", "W": "aw", "Y": "oy", "Q": "ow",
    "æ": "ae", "ɑ": "aa", "ɒ": "aa", "ɔ": "ao", "ə": "ax", "ɐ": "ax", "ᵊ": "ax", "ɚ": "er",
    "ɛ": "eh", "ɜ": "er", "ɪ": "ih", "ɨ": "ih", "ᵻ": "ih", "ʊ": "uh", "ʌ": "ah",
    "i": "iy", "u": "uw", "e": "eh", "o": "ow", "a": "aa",
}
CONS_MAP = {
    "b": "b", "d": "d", "f": "f", "h": "hh", "j": "y", "k": "k", "l": "l", "m": "m", "n": "n",
    "p": "p", "s": "s", "t": "t", "v": "v", "w": "w", "z": "z", "ɡ": "g", "g": "g", "ŋ": "ng",
    "ɹ": "r", "r": "r", "ʃ": "sh", "ʒ": "zh", "ð": "dh", "θ": "th", "ʤ": "jh", "ʧ": "ch",
    "T": "dx", "ɾ": "dx", "ʔ": "q", "ç": "hh", "x": "k", "ɬ": "l",
}
DEMOTED_GLIDE = {"i": "y", "ɪ": "y", "ᵻ": "y", "u": "w", "ʊ": "w"}
ARPA_VOWELS = {"aa", "ae", "ah", "ao", "aw", "ax", "ay", "eh", "er", "ey", "ih", "iy", "ow",
               "oy", "uh", "uw"}
SKIP = pho.STRESS | {pho.LENGTH}

# misaki stand-in for each ARPAbet phoneme (voicing / class lookups through music/vocal)
ARPA_TO_MISAKI = {v: k for k, v in reversed(list(VOWEL_MAP.items()))}
ARPA_TO_MISAKI.update({v: k for k, v in reversed(list(CONS_MAP.items()))})
ARPA_TO_MISAKI.update({"ax": "ə", "er": "ɜ", "ow": "O", "aa": "ɑ", "ih": "ɪ", "hh": "h", "y": "j",
                       "g": "ɡ", "r": "ɹ", "dx": "T", "cl": "ʔ", "q": "ʔ"})


@dataclass
class Ph:
    """One ARPAbet phoneme and the indices (into the line's misaki string) it came from."""
    arpa: str
    src: list[int] = field(default_factory=list)
    role: str = "onset"            # onset | nucleus | coda

    @property
    def is_vowel(self) -> bool:
        return self.arpa in ARPA_VOWELS


@dataclass
class Syl:
    """A score syllable: its notes (from vocals.json) and its phonemes."""
    index: int                     # index into line["syllables"]
    word: int
    text: str
    notes: list[dict]
    phones: list[Ph]
    shares_prev: bool = False      # melisma on the previous syllable's vowel ("+~")

    @property
    def onset(self) -> list[Ph]:
        return [p for p in self.phones if p.role == "onset"]

    @property
    def nucleus(self) -> Ph | None:
        return next((p for p in self.phones if p.role == "nucleus"), None)

    @property
    def coda(self) -> list[Ph]:
        return [p for p in self.phones if p.role == "coda"]


@dataclass
class LinePhonemes:
    line_id: str
    ps: str                        # misaki phoneme string of the line (planner.prepare_line)
    slots: list                    # planner.SylSlot per syllable (indices into ps)
    syllables: list[Syl]           # in score order


# ----------------------------------------------------------------------------- G2P

_g2p = None


def g2p(text: str):
    """misaki US English G2P exactly as Kokoro builds it (KPipeline lang 'a')."""
    global _g2p
    if _g2p is None:
        import warnings
        warnings.filterwarnings("ignore", category=FutureWarning)
        from misaki import en
        try:
            from misaki import espeak
            fallback = espeak.EspeakFallback(british=False)
        except Exception:                       # pragma: no cover - espeak missing
            fallback = None
        _g2p = en.G2P(trf=False, british=False, fallback=fallback, unk="")
    _, tokens = _g2p(text)
    return tokens


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _keep(c: str) -> bool:
    return pho.kind(c) not in ("other", "space", "pause")


def phoneme_words(say_words: list[str], sung: bool = True) -> list[str]:
    """misaki phonemes per score word: G2P on the whole line (so context-dependent forms
    like 'the' before a vowel come out right), tokens matched back to the words, single-word
    G2P where tokenisation disagrees, overrides last (same logic as planner.phoneme_words)."""
    toks = [t for t in g2p(" ".join(say_words)) if t.phonemes and _norm(t.text)]
    out, ti = [], 0
    for w in say_words:
        target, acc, ps, tj = _norm(w), "", "", ti
        while tj < len(toks) and len(acc) < len(target):
            acc += _norm(toks[tj].text)
            ps += toks[tj].phonemes
            tj += 1
        if acc == target and ps:
            ti = tj
        else:
            ps = "".join(t.phonemes or "" for t in g2p(w))
        ps = "".join(c for c in ps if _keep(c))
        out.append(pho.word_phonemes(w, ps, sung))
    return out


# ----------------------------------------------------------------------------- conversion

def _convert_part(ps: str, onset: list[int], nucleus: list[int], coda: list[int]) -> list[Ph]:
    """One syllable's misaki characters -> ARPAbet (one vowel at most)."""
    out: list[Ph] = []
    for i in onset:
        c = ps[i]
        if c in SKIP:
            continue
        if c in pho.VOWELS:                      # vowel demoted into the onset
            if c in DEMOTED_GLIDE:
                out.append(Ph(DEMOTED_GLIDE[c], [i], "onset"))
            continue
        out.append(Ph(CONS_MAP.get(c, c), [i], "onset"))
    main = [i for i in nucleus if ps[i] in pho.VOWELS]
    coda = list(coda)
    if main:
        v = main[0]
        src = [i for i in nucleus if i <= v and ps[i] in SKIP] + [v] + \
              [i for i in nucleus if i > v and ps[i] == pho.LENGTH]
        arpa = VOWEL_MAP.get(ps[v], "ah")
        # r-coloured vowel: ɜɹ / əɹ inside one syllable -> er
        rest_coda = [i for i in coda if ps[i] not in SKIP]
        if ps[v] in ("ɜ", "ə", "ɚ") and rest_coda and ps[rest_coda[0]] == "ɹ":
            arpa = "er"
            src.append(rest_coda[0])
            coda.remove(rest_coda[0])
        out.append(Ph(arpa, sorted(src), "nucleus"))
        for i in main[1:]:                       # extra vowels merged into this nucleus
            if ps[i] in DEMOTED_GLIDE:
                out.append(Ph(DEMOTED_GLIDE[ps[i]], [i], "coda"))
    for i in coda:
        c = ps[i]
        if c in SKIP:
            continue
        if c in pho.VOWELS:
            if c in DEMOTED_GLIDE:
                out.append(Ph(DEMOTED_GLIDE[c], [i], "coda"))
            continue
        out.append(Ph(CONS_MAP.get(c, c), [i], "coda"))
    return out


def line_phonemes(line: dict, timing_style=None, sung: bool = True) -> LinePhonemes:
    """All score syllables of a sung line with their ARPAbet phonemes."""
    import planner as pl                         # music/vocal (imports torch lazily via kokoro)
    st = timing_style or pl.TimingStyle()
    wps = phoneme_words([w["say"] for w in line["words"]], sung=sung)
    ps, slots = pl.prepare_line(line, wps, st)
    sylls = []
    for sl in slots:
        s = line["syllables"][sl.syl]
        phones = _convert_part(ps, sl.onset, sl.nucleus, sl.coda)
        sylls.append(Syl(sl.syl, sl.word, s["text"], s["notes"], phones,
                         shares_prev=sl.shares_prev or not any(p.is_vowel for p in phones)))
    sylls.sort(key=lambda s: s.index)
    # a "shares_prev" syllable that still has consonants (score has more syllables than
    # vowels inside a word): keep them, they are sung on the held vowel's note
    return LinePhonemes(line["id"], ps, slots, sylls)


# ----------------------------------------------------------------------------- bank dictionaries

# legal English onsets, in ARPAbet (from music/vocal/phonology.LEGAL_ONSETS)
LEGAL_ONSETS_ARPA = {tuple(CONS_MAP[c] for c in o) for o in pho.LEGAL_ONSETS
                     if all(c in CONS_MAP for c in o)}


def syllabify_arpa(phs: list[str], vowels: set[str] = ARPA_VOWELS) -> list[tuple[list[str], str, list[str]]]:
    """Onset-maximal syllabification of an ARPAbet word (for bank dictionary entries).
    Returns [(onset, vowel, coda)] — one per vowel."""
    vi = [i for i, p in enumerate(phs) if p in vowels]
    if not vi:
        return []
    out = []
    for k, v in enumerate(vi):
        out.append([[], phs[v], []])
    out[0][0] = phs[:vi[0]]
    out[-1][2] = phs[vi[-1] + 1:]
    for k in range(len(vi) - 1):
        cl = phs[vi[k] + 1: vi[k + 1]]
        n = 0
        for m in range(len(cl), 0, -1):
            tail = tuple(cl[-m:])
            if m == 1 and tail[0] not in ("ng", "cl") or tail in LEGAL_ONSETS_ARPA:
                n = m
                break
        out[k][2] = cl[:len(cl) - n]
        out[k + 1][0] = cl[len(cl) - n:]
    return [(a, b, c) for a, b, c in out]


def hint_tokens(syl: Syl) -> list[str]:
    return [p.arpa for p in syl.phones]
