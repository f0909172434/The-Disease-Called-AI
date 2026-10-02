"""
Phonology layer: misaki/Kokoro phoneme symbols -> phone classes -> score syllables.

Kokoro's English front end (misaki) writes one *character* per model token. Diphthongs are
single capital letters (A = eɪ, I = aɪ, O = oʊ, W = aʊ, Y = ɔɪ) and stress marks sit directly
before the vowel they stress, so a vowel nucleus is easy to find: [stress] + vowel.

This module knows nothing about time. It answers three questions:
  * what kind of sound is this symbol (vowel / plosive / fricative / ... / voiced?)
  * how does a word's phoneme string split into the syllables the score asks for
    (onset-maximal, using legal English onsets, reconciling vowel-count mismatches)
  * which words need a pronunciation override for singing.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# ----------------------------------------------------------------------------- symbol classes

VOWELS = set("AIOWYQaeiouæɑɐɒɔəɛɜɪʊʌᵊɚɨᵻ")
DIPHTHONGS = {"A": "eɪ", "I": "aɪ", "O": "oʊ", "W": "aʊ", "Y": "ɔɪ", "Q": "əʊ"}
REDUCED = set("əᵊɐɪᵻɨ")          # vowels that may be merged away when the score has fewer syllables
STRESS = set("ˈˌ")
LENGTH = "ː"
PAUSES = set(",.!?;:—…")
SPACE = " "

PLOSIVES = set("pbtdkɡʔ")
FLAPS = set("Tɾ")
FRICATIVES = set("fvszθðʃʒhç")
AFFRICATES = set("ʧʤ")
NASALS = set("mnŋ")
LIQUIDS = set("lɹ")
GLIDES = set("wj")
UNVOICED = set("ptkfsθʃʧhçʔ")

# Legal English onset clusters (IPA as misaki writes it). Single consonants are always legal
# except ŋ. Used for onset-maximal syllabification: "sˈɛvən" -> sɛ | vən, "dˈɑktəɹ" -> dɑk | təɹ.
LEGAL_ONSETS = {
    "pl", "pɹ", "tɹ", "kl", "kɹ", "bl", "bɹ", "dɹ", "ɡl", "ɡɹ", "fl", "fɹ", "θɹ", "ʃɹ",
    "sp", "st", "sk", "sm", "sn", "sl", "sw", "sf", "tw", "dw", "kw", "ɡw", "θw",
    "pj", "bj", "kj", "ɡj", "fj", "vj", "mj", "hj", "nj", "lj",
    "spl", "spɹ", "stɹ", "skɹ", "skw", "spj", "skj",
}

# Pronunciation overrides for *sung* English (keys: lower-cased `say` word). misaki's
# dictionary forms are fine for speech but give 3 vowels for "every"/"really" and 2 for
# "real"; singers use the contracted forms that match the score's syllable counts.
SUNG_OVERRIDES = {
    "every": "ˈɛvɹi",        # misaki: ˈɛvəɹi   (ev-ry, 2 syllables)
    "really": "ɹˈɪli",       # misaki: ɹˈiᵊli   (real-ly, 2 syllables)
    "real": "ɹˈil",          # misaki: ɹˈiᵊl    (1 syllable)
}
# Overrides applied to spoken lines too (none needed so far; kept for the report/QA loop).
SPOKEN_OVERRIDES: dict[str, str] = {}


def kind(sym: str) -> str:
    """Coarse articulatory class of one misaki symbol."""
    if sym in VOWELS:
        return "vowel"
    if sym in STRESS:
        return "stress"
    if sym == LENGTH:
        return "length"
    if sym in PLOSIVES:
        return "plosive"
    if sym in FLAPS:
        return "flap"
    if sym in FRICATIVES:
        return "fricative"
    if sym in AFFRICATES:
        return "affricate"
    if sym in NASALS:
        return "nasal"
    if sym in LIQUIDS:
        return "liquid"
    if sym in GLIDES:
        return "glide"
    if sym == SPACE:
        return "space"
    if sym in PAUSES:
        return "pause"
    return "other"


def is_voiced(sym: str) -> bool:
    """True if the vocal folds vibrate (vowels, nasals, liquids, voiced obstruents)."""
    k = kind(sym)
    if k in ("vowel", "stress", "length", "nasal", "liquid", "glide", "flap"):
        return True
    if k in ("plosive", "fricative", "affricate"):
        return sym not in UNVOICED
    return False


# Sung consonant duration limits (seconds) per class: (min, max). Singers lengthen weak
# consonants for diction but never let them eat the vowel.
CONS_LIMITS = {
    "plosive": (0.045, 0.100),
    "flap": (0.030, 0.060),
    "fricative": (0.055, 0.120),
    "affricate": (0.065, 0.120),
    "nasal": (0.040, 0.110),
    "liquid": (0.040, 0.100),
    "glide": (0.035, 0.090),
    "other": (0.030, 0.080),
    "vowel": (0.040, 0.120),      # a vowel demoted to a consonant-like slot (count mismatch)
    "length": (0.0, 0.0),
}


# ----------------------------------------------------------------------------- syllables

@dataclass
class SylParts:
    """One score syllable carved out of a word's phoneme string (indices into that string)."""
    onset: list[int] = field(default_factory=list)     # consonants before the nucleus
    nucleus: list[int] = field(default_factory=list)   # [stress] vowel [length] (+ merged vowels)
    coda: list[int] = field(default_factory=list)      # consonants after the nucleus
    shares_prev_nucleus: bool = False                  # score has more syllables than vowels


def _choose_nuclei(ps: str, vowel_idx: list[int], n_target: int) -> list[int]:
    """Pick which vowels act as syllable nuclei when misaki's vowel count != score count.

    Too many vowels: drop reduced vowels first (schwas in hiatus like 'iᵊ'), preferring ones
    that sit right next to another vowel. The dropped vowels later behave like short
    consonant-ish segments inside the onset/coda of a neighbouring syllable."""
    keep = list(vowel_idx)
    while len(keep) > n_target:
        def cost(v):
            stressed = v > 0 and ps[v - 1] in STRESS
            reduced = ps[v] in REDUCED
            pos = keep.index(v)
            gap = min([abs(v - o) for o in keep if o != v] or [99])   # adjacency to another vowel
            return (stressed, not reduced, gap, -pos)
        keep.remove(min(keep, key=cost))
    return keep


def _split_cluster(cluster: str) -> int:
    """Return how many consonants of an intervocalic cluster go to the *next* onset
    (longest legal onset suffix, onset maximal)."""
    cons = [c for c in cluster if c not in STRESS and c != LENGTH]
    for n in range(len(cons), 0, -1):
        tail = "".join(cons[-n:])
        if n == 1:
            return 1 if tail != "ŋ" else 0
        if tail in LEGAL_ONSETS:
            return n
    return 0


def syllabify(ps: str, n_target: int) -> list[SylParts]:
    """Split one word's phoneme string into `n_target` syllables.

    Every character index of `ps` ends up in exactly one SylParts list. If the score wants
    more syllables than there are vowels, the last nucleus is shared by the extra syllables
    (they become a melisma on that vowel)."""
    vowel_idx = [i for i, c in enumerate(ps) if c in VOWELS]
    if not vowel_idx:                      # e.g. a stray consonant-only token: one blob
        return [SylParts(nucleus=list(range(len(ps))))] + \
               [SylParts(shares_prev_nucleus=True) for _ in range(n_target - 1)]
    nuclei = _choose_nuclei(ps, vowel_idx, n_target) if len(vowel_idx) > n_target else vowel_idx

    # nucleus spans: optional stress mark before, optional length mark after
    spans = []
    for v in nuclei:
        a = v - 1 if v > 0 and ps[v - 1] in STRESS else v
        b = v + 1 if v + 1 < len(ps) and ps[v + 1] == LENGTH else v
        spans.append([a, b])

    parts = [SylParts() for _ in nuclei]
    for k, (a, b) in enumerate(spans):
        parts[k].nucleus = list(range(a, b + 1))
    # leading consonants -> first onset; trailing -> last coda
    parts[0].onset = list(range(0, spans[0][0]))
    parts[-1].coda = list(range(spans[-1][1] + 1, len(ps)))
    # intervocalic clusters: onset-maximal split
    for k in range(len(spans) - 1):
        lo, hi = spans[k][1] + 1, spans[k + 1][0]
        idx = list(range(lo, hi))
        cluster = "".join(ps[i] for i in idx)
        # merged (demoted) vowels inside a cluster stay with the preceding syllable
        n_next = _split_cluster(cluster) if not any(ps[i] in VOWELS for i in idx) else \
            len(idx) - 1 - max(j for j, i in enumerate(idx) if ps[i] in VOWELS)
        n_next = min(n_next, len(idx))
        parts[k].coda = idx[:len(idx) - n_next]
        parts[k + 1].onset = idx[len(idx) - n_next:]
    while len(parts) < n_target:           # fewer vowels than score syllables
        parts.append(SylParts(shares_prev_nucleus=True))
    return parts


def word_phonemes(say: str, g2p_ps: str, sung: bool) -> str:
    """Apply the pronunciation override table to one word."""
    table = SUNG_OVERRIDES if sung else SPOKEN_OVERRIDES
    return table.get(say.lower().strip(".,!?;:\"'"), g2p_ps)
