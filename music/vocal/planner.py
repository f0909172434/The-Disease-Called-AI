"""
Score -> time map for sung lines.

For every Kokoro input token (BOS, each phoneme character, EOS) the planner decides a start
and end time in *song seconds*. Rules (singer's practice, see docs/06_tech_spec.md §3):

  * the vowel nucleus of a syllable lands exactly on the syllable's first note;
  * onset consonants are sung *before* the note (anticipation, capped ~90-140 ms);
  * coda consonants sit at the end of the note; before a rest the singer releases a little
    early, in legato the coda and the next onset share a zone carved out of the vowel;
  * a syllable over several notes (melisma) keeps one vowel, the pitch contour glides;
  * consonants keep their natural (Kokoro-predicted) length, lengthened a little for
    diction and compressed when the note is too short to leave the vowel its share;
  * rests are rendered by a pause token (',') that Kokoro already knows as silence.

Everything downstream (alignment matrix, F0 contour, vocal_timing.json) reads this map, so
the karaoke timing *is* the rendering timing.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

import numpy as np

import kokoro_backend as kb
from phonology import (SylParts, kind, is_voiced, syllabify, word_phonemes, CONS_LIMITS,
                       VOWELS, STRESS)

BPM = 172
BEAT = 60.0 / BPM


def tb2s(tb: float) -> float:
    return tb * BEAT


@dataclass
class Note:
    start: float
    end: float
    pitch: float          # MIDI


@dataclass
class Phone:
    sym: str
    kind: str             # phonology.kind(), or 'bos' / 'eos'
    role: str             # onset | nucleus | coda | gap | edge
    syl: int = -1
    word: int = -1
    nat: float = 0.0      # natural duration (s) from Kokoro's duration predictor
    start: float = 0.0
    end: float = 0.0

    @property
    def voiced(self) -> bool:
        return self.role in ("onset", "nucleus", "coda") and is_voiced(self.sym)


@dataclass
class Syllable:
    index: int
    text: str
    word: int
    notes: list[Note]
    onset: list[int] = field(default_factory=list)      # indices into SungPlan.phones
    nucleus: list[int] = field(default_factory=list)
    coda: list[int] = field(default_factory=list)
    shares_prev: bool = False
    start: float = 0.0     # consonant onset
    end: float = 0.0       # release
    vowel_start: float = 0.0
    vowel_end: float = 0.0


@dataclass
class SungPlan:
    line_id: str
    ps: str
    phones: list[Phone]
    syllables: list[Syllable]
    words: list[dict]
    t0: float = 0.0
    t_end: float = 0.0

    def bounds_frames(self) -> np.ndarray:
        """Token boundaries in (fractional) Kokoro frames relative to t0."""
        b = [(p.start - self.t0) / kb.FRAME for p in self.phones] + \
            [(self.phones[-1].end - self.t0) / kb.FRAME]
        return np.maximum.accumulate(np.asarray(b, np.float64))

    @property
    def n_frames(self) -> int:
        return int(np.ceil((self.t_end - self.t0) / kb.FRAME - 1e-9))


# ----------------------------------------------------------------------------- G2P per word

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def phoneme_words(say_words: list[str], sung: bool) -> list[str]:
    """Phonemes for each score word. G2P runs on the whole line (so 'the' before a vowel
    becomes ði etc.), then tokens are matched back to words; unmatched words fall back to
    single-word G2P. Overrides from phonology.SUNG_OVERRIDES are applied last."""
    toks = [t for t in kb.g2p(" ".join(say_words)) if t.phonemes and _norm(t.text)]
    out, ti = [], 0
    for w in say_words:
        target, acc, ps, tj = _norm(w), "", "", ti
        while tj < len(toks) and len(acc) < len(target):
            acc += _norm(toks[tj].text)
            ps += toks[tj].phonemes
            tj += 1
        if acc == target and ps:
            ti = tj
        else:                                    # tokenisation disagreed: G2P the word alone
            ps = "".join(t.phonemes or "" for t in kb.g2p(w))
        ps = "".join(c for c in ps if c in kb.vocab() and c not in " ")
        out.append(word_phonemes(w, ps, sung))
    return out


# ----------------------------------------------------------------------------- planning

@dataclass
class TimingStyle:
    """Articulation parameters (seconds)."""
    cons_scale: float = 1.12      # sung consonants vs spoken
    lead_cap: tuple = (0.090, 0.120, 0.140)   # max onset anticipation for 1 / 2 / 3+ consonants
    min_vowel_frac: float = 0.50  # vowel keeps at least this share of its note ...
    cluster_relief: float = 0.05  # ... minus this per consonant beyond 2 in the legato zone
    release: float = 0.035        # early release before a rest
    release_frac: float = 0.10
    min_rest: float = 0.075       # shorter gaps are sung legato
    pre_pad: float = 0.10         # silence rendered before the first onset
    post_pad: float = 0.16        # tail after the last release
    stress_max: float = 0.05      # stress-mark token = vowel attack
    hiatus_gap: float = 0.025     # word-boundary separation between two vowels (legato)
    unreduce_min: float = 0.30    # function-word schwas this long are sung as full vowels


@dataclass
class SylSlot:
    """A score syllable's phonemes as indices into the line's phoneme string."""
    word: int
    syl: int
    onset: list[int]
    nucleus: list[int]
    coda: list[int]
    shares_prev: bool = False


def prepare_line(line: dict, wps: list[str], st: TimingStyle):
    """Syllabify every word and join the words into one phoneme string (', ' where a rest
    separates two words, ' ' otherwise). Returns (ps, slots).

    Diphthongs stay single tokens even on long notes: an explicit offglide token (A -> Aɪ,
    I -> aɪ) was tried and makes Whisper hear an extra syllable ("voice" -> "boy-est",
    "tonight" -> "to nigh it"); Kokoro already glides inside the stretched token."""
    syl = line["syllables"]
    ps, slots = "", []
    for wi, (w, wp) in enumerate(zip(line["words"], wps)):
        if wi > 0:
            prev_last = syl[line["words"][wi - 1]["syl"][-1]]["notes"][-1]
            nxt_first = syl[w["syl"][0]]["notes"][0]
            gap = tb2s(nxt_first["tb"]) - tb2s(prev_last["tb"] + prev_last["d"])
            ps += ", " if gap >= st.min_rest else " "
        base = len(ps)
        parts = syllabify(wp, len(w["syl"]))
        wp = unreduce(wp, parts, w, syl, st)
        for part, si in zip(parts, w["syl"]):
            slots.append(SylSlot(wi, si, [base + i for i in part.onset],
                                 [base + i for i in part.nucleus],
                                 [base + i for i in part.coda], part.shares_prev_nucleus))
        ps += wp
    return ps, slots


def unreduce(wp: str, parts, word: dict, syl: list, st: TimingStyle) -> str:
    """Singers' diction for function words held a beat or more: "the" -> thuh, "a" -> uh,
    "to" -> too (a long reduced schwa there sounds like a hesitation). Prefix schwas
    (de-, re-, be-) stay reduced: both "dee-sign" and "dih-sign" were tried and Whisper
    hears them as separate words ("decent sign", "reggae quest")."""
    chars = list(wp)
    for part, si in zip(parts, word["syl"]):
        notes = syl[si]["notes"]
        dur = tb2s(notes[-1]["tb"] + notes[-1]["d"]) - tb2s(notes[0]["tb"])
        if dur < st.unreduce_min or len(word["syl"]) > 1:
            continue
        w = word["text"].lower()
        for i in part.nucleus:
            if chars[i] in ("ə", "ɐ"):
                if w in ("the", "a"):
                    chars[i] = "ʌ"
                elif w == "to":
                    chars[i] = "u"
    return "".join(chars)


def _sung_len(p: Phone, scale: float) -> float:
    lo, hi = CONS_LIMITS.get(p.kind, CONS_LIMITS["other"])
    return float(np.clip(p.nat * scale, lo, hi))


def plan_sung(line: dict, natdur_frames: np.ndarray, ps: str, slots: list[SylSlot],
              st: TimingStyle) -> SungPlan:
    """Assign song-time start/end to every token of `ps` (plus BOS/EOS)."""
    nat = np.asarray(natdur_frames) * kb.FRAME
    phones = [Phone("<", "bos", "edge", nat=nat[0])]
    for i, c in enumerate(ps):
        k = kind(c)
        phones.append(Phone(c, k, "gap" if k in ("space", "pause") else "?", nat=nat[i + 1]))
    phones.append(Phone(">", "eos", "edge", nat=nat[-1]))

    # --- syllables and their phones
    sylls: list[Syllable] = []
    for sl in slots:
        s = line["syllables"][sl.syl]
        notes = [Note(tb2s(n["tb"]), tb2s(n["tb"] + n["d"]), float(n["p"])) for n in s["notes"]]
        sy = Syllable(sl.syl, s["text"], sl.word, notes, shares_prev=sl.shares_prev)
        for role, idx in (("onset", sl.onset), ("nucleus", sl.nucleus), ("coda", sl.coda)):
            ids = [i + 1 for i in idx]
            for pid in ids:
                phones[pid].role, phones[pid].syl, phones[pid].word = role, sl.syl, sl.word
            setattr(sy, role, ids)
        sylls.append(sy)
    sylls.sort(key=lambda s: s.notes[0].start)

    # Timing units: a syllable that shares the previous nucleus (score has more syllables than
    # the word has vowels) is folded into the previous unit as extra melisma notes.
    units: list[Syllable] = []
    for s in sylls:
        if s.shares_prev and units:
            units[-1] = Syllable(units[-1].index, units[-1].text, units[-1].word,
                                 units[-1].notes + s.notes, units[-1].onset, units[-1].nucleus,
                                 units[-1].coda)
        else:
            units.append(s)

    def lead_cap(n):
        return st.lead_cap[min(n, len(st.lead_cap)) - 1] if n else 0.0

    def cons_lens(ids):
        return np.array([_sung_len(phones[i], st.cons_scale) for i in ids], np.float64)

    # --- per-unit consonant lengths (capped onsets)
    on_len = []
    for u in units:
        L = cons_lens(u.onset)
        cap = lead_cap(len(u.onset))
        if L.sum() > cap:
            L *= cap / L.sum()
        on_len.append(L)
    co_len = [cons_lens(u.coda) for u in units]

    # --- place boundaries
    V = [u.notes[0].start for u in units]
    E = [u.notes[-1].end for u in units]
    nuc_end = [0.0] * len(units)
    coda_start = [0.0] * len(units)
    onset_start = [V[i] - on_len[i].sum() for i in range(len(units))]
    for i, u in enumerate(units):
        last = i == len(units) - 1
        gap = None if last else V[i + 1] - E[i]
        if not last and gap < st.min_rest:
            # legato: coda(i) + onset(i+1) share a zone carved from the end of note i
            span = V[i + 1] - V[i]
            # heavy clusters ("blinds | stay": n d z s t) may take more of the note, the way
            # singers shorten the vowel rather than smear five consonants
            n_cons = len(co_len[i]) + len(on_len[i + 1])
            frac = st.min_vowel_frac - st.cluster_relief * max(0, min(n_cons, 5) - 2)
            avail = span * (1.0 - frac)
            need = co_len[i].sum() + on_len[i + 1].sum()
            if need > avail:
                f = avail / need
                co_len[i] *= f
                on_len[i + 1] *= f
            onset_start[i + 1] = V[i + 1] - on_len[i + 1].sum()
            coda_start[i] = onset_start[i + 1] - co_len[i].sum()
            if not len(co_len[i]) and not len(on_len[i + 1]) and u.word != units[i + 1].word:
                # vowel meets vowel across a word boundary ("only | ever"): a short glottal
                # separation keeps the two words apart instead of one smeared diphthong
                coda_start[i] -= min(st.hiatus_gap, 0.2 * span)
            nuc_end[i] = coda_start[i]
        else:
            # before a rest (or line end): release early, coda inside the note
            rel = min(st.release, st.release_frac * (E[i] - V[i]))
            end = E[i] - rel
            avail = (end - V[i]) * (1.0 - st.min_vowel_frac)
            if co_len[i].sum() > avail:
                co_len[i] *= avail / co_len[i].sum()
            coda_start[i] = end - co_len[i].sum()
            nuc_end[i] = coda_start[i]
            if not last:
                # the next onset may not start before this release (+20 ms of air)
                room = V[i + 1] - (end + 0.02)
                if on_len[i + 1].sum() > room > 0:
                    on_len[i + 1] *= room / on_len[i + 1].sum()
                onset_start[i + 1] = V[i + 1] - on_len[i + 1].sum()

    # --- write phone times
    def lay(ids, t, lens):
        for pid, L in zip(ids, lens):
            phones[pid].start, phones[pid].end = t, t + L
            t += L
        return t

    for i, u in enumerate(units):
        lay(u.onset, onset_start[i], on_len[i])
        # nucleus: stress mark = short attack, main vowel = the body; vowels merged in from
        # a syllable-count mismatch keep a small natural share
        span = nuc_end[i] - V[i]
        main = [p for p in u.nucleus if phones[p].sym in VOWELS]
        main_v = main[0] if main else u.nucleus[-1]
        lens = []
        for pid in u.nucleus:
            ph = phones[pid]
            if ph.sym in STRESS:
                lens.append(min(ph.nat, st.stress_max, 0.25 * span))
            elif pid == main_v:
                lens.append(None)
            else:
                lens.append(min(ph.nat, 0.15 * span))
        rest = span - sum(x for x in lens if x is not None)
        lens = [rest if x is None else x for x in lens]
        lay(u.nucleus, V[i], lens)
        lay(u.coda, coda_start[i], co_len[i])

    # gaps, BOS, EOS: fill the holes so that tokens tile the timeline
    first = units[0]
    t_first = phones[first.onset[0]].start if first.onset else V[0]
    t0 = t_first - st.pre_pad
    phones[0].start, phones[0].end = t0, t_first
    last_u = units[-1]
    t_last = phones[last_u.coda[-1]].end if last_u.coda else nuc_end[-1]
    phones[-1].start, phones[-1].end = t_last, t_last + st.post_pad
    # gap tokens take whatever lies between the previous token's end and the next start
    for k in range(1, len(phones) - 1):
        if phones[k].role == "gap":
            prev_end = phones[k - 1].end
            nxt = next(p for p in phones[k + 1:] if p.role != "gap")
            phones[k].start, phones[k].end = prev_end, max(prev_end, nxt.start)
    # enforce tiling (tiny float overlaps from compression)
    for k in range(1, len(phones)):
        if phones[k].start < phones[k - 1].end - 1e-9 or phones[k].start > phones[k - 1].end + 1e-9:
            phones[k].start = phones[k - 1].end
        phones[k].end = max(phones[k].end, phones[k].start)

    # --- syllable / word timing (from the phones actually laid out)
    for u_i, u in enumerate(units):
        ids = u.onset + u.nucleus + u.coda
        u.start = phones[ids[0]].start
        u.end = phones[ids[-1]].end
        u.vowel_start, u.vowel_end = V[u_i], nuc_end[u_i]
    by_index = {u.index: u for u in units}
    for s in sylls:
        if s.index in by_index:
            u = by_index[s.index]
            s.start, s.end, s.vowel_start, s.vowel_end = u.start, u.end, u.vowel_start, u.vowel_end
    for k, s in enumerate(sylls):            # melisma-shared syllables split the vowel
        if s.shares_prev and k > 0:
            prev = sylls[k - 1]
            s.start, s.end = s.notes[0].start, prev.end
            s.vowel_start, s.vowel_end = s.notes[0].start, prev.vowel_end
            prev.end = prev.vowel_end = s.start

    words = []
    for wi, w in enumerate(line["words"]):
        ss = [s for s in sylls if s.word == wi]
        words.append({"text": w["text"], "syl": w["syl"], "start": min(s.start for s in ss),
                      "end": max(s.end for s in ss)})
    plan = SungPlan(line["id"], ps, phones, sorted(sylls, key=lambda s: s.index), words,
                    t0=t0, t_end=phones[-1].end)
    return plan
