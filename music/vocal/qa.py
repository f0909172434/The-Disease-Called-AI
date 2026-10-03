"""
Vocal QA: Whisper intelligibility (WER) and pitch accuracy, plus diagnostic plots.

  WER    faster-whisper (CPU, int8) transcribes every rendered line in isolation; the
         transcript and the reference (`text` of the line) are normalised (case,
         punctuation, digits -> words, "a.m."/"A.I." -> "am"/"ai") and compared with a
         word-level Levenshtein distance.
  pitch  Harvest F0 of the *final* rendered line vs the score's note pitch, over voiced
         frames inside sung vowels; median |error| in cents.
"""
from __future__ import annotations

import os
import re

import numpy as np

_whisper = {}


def whisper_model(name: str = "medium.en"):
    if name not in _whisper:
        from faster_whisper import WhisperModel
        _whisper[name] = WhisperModel(name, device="cpu", compute_type="int8",
                                      cpu_threads=max(1, min(4, os.cpu_count() or 1)))
    return _whisper[name]


def transcribe(audio16k: np.ndarray, model: str = "medium.en") -> str:
    """Transcribe one line (16 kHz mono). No prompt: the lyrics must be heard, not guessed.
    A line is at most ~10 words, so decoding is capped at 64 tokens: held notes can send
    Whisper into "good-d-d-d-d..." loops that would otherwise run to the 448-token limit at
    every fallback temperature."""
    pad = np.zeros(8000, np.float32)
    x = np.concatenate([pad, audio16k.astype(np.float32), pad])
    segs, _ = whisper_model(model).transcribe(
        x, language="en", beam_size=5, vad_filter=False, condition_on_previous_text=False,
        without_timestamps=True, max_new_tokens=64, temperature=[0.0, 0.2, 0.4])
    return " ".join(s.text.strip() for s in segs).strip()


# ----------------------------------------------------------------------------- WER

_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen " \
        "fourteen fifteen sixteen seventeen eighteen nineteen".split()


def _num_words(m: re.Match) -> str:
    n = int(m.group(0))
    if n < 20:
        return _ONES[n]
    try:
        from num2words import num2words
        return num2words(n).replace("-", " ").replace(",", "")
    except Exception:
        return m.group(0)


def normalize(text: str) -> list[str]:
    """Lower-case word list. Sung elongations that Whisper spells out ("yesssss",
    "good-d-d-d-bye") are collapsed: they are one held phoneme, not extra words."""
    t = text.lower()
    t = t.replace("’", "'").replace("…", " ").replace("—", " ").replace("–", " ")
    t = re.sub(r"([a-z])\1{2,}", r"\1", t)                  # yesssss -> yes
    t = re.sub(r"([a-z]+)(?:-\1)+\b", r"\1", t)             # d-d-d -> d, al-al -> al
    t = re.sub(r"(?<=[a-z])-(?=[a-z])", "", t)               # good-bye -> goodbye
    t = re.sub(r"\b([a-z])\.([a-z])\.?", r"\1\2", t)       # a.m. -> am, a.i. -> ai
    t = re.sub(r"(\d+)([a-z]+)", r"\1 \2", t)              # 7am -> 7 am
    t = re.sub(r"\d+", _num_words, t)
    t = re.sub(r"[^a-z' ]+", " ", t)
    t = re.sub(r"(?<![a-z])'|'(?![a-z])", " ", t)          # quotes, not apostrophes
    return t.split()


def wer(ref: str, hyp: str) -> float:
    r, h = normalize(ref), normalize(hyp)
    if not r:
        return 0.0 if not h else 1.0
    d = np.arange(len(h) + 1, dtype=np.int32)
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev, d[j] = d[j], cur
    return float(d[len(h)]) / len(r)


# Mis-hearings that must never ship, whatever the WER: a listener can hear what Whisper
# hears (C1_5 "painless yes" was transcribed "penis, yes" at WER 0.17). A transcript word in
# this list that the lyric does not contain fails the line, doubles and exempt lines included,
# and audition.py --retake never keeps such a take.
UNWANTED = set("""
penis penises dick cock cocks ass arse asshole butt boob boobs tits nipple nipples vagina
pussy sex sexy naked nude porn orgasm horny fuck fucking fucked shit shitty bitch whore slut
cunt rape raped nazi nazis hitler
""".split())


def unwanted_words(ref: str, hyp: str) -> list[str]:
    """Transcript words from UNWANTED that the reference text does not contain."""
    r = set(normalize(ref))
    return sorted({w for w in normalize(hyp) if w in UNWANTED and w not in r})


# ----------------------------------------------------------------------------- pitch

def pitch_error_cents(audio: np.ndarray, fs: int, t_start: float, frames_t: np.ndarray,
                      score_midi: np.ndarray, vowel_mask: np.ndarray) -> tuple[float, int]:
    """Median |cents| between Harvest F0 of `audio` (which starts at song time t_start) and
    the score pitch, over frames that are voiced in the output and inside sung vowels."""
    import pyworld as pw
    f0, t = pw.harvest(audio.astype(np.float64), fs, f0_floor=70.0, f0_ceil=1200.0,
                       frame_period=5.0)
    tt = t_start + t
    ref = np.interp(tt, frames_t, np.nan_to_num(score_midi, nan=-1.0), left=-1, right=-1)
    inside = np.interp(tt, frames_t, vowel_mask.astype(float), left=0, right=0) > 0.5
    ok = (f0 > 0) & inside & (ref > 0)
    if ok.sum() < 5:
        return float("nan"), int(ok.sum())
    err = 1200 * np.log2(f0[ok] / (440.0 * 2 ** ((ref[ok] - 69) / 12)))
    return float(np.median(np.abs(err))), int(ok.sum())


# ----------------------------------------------------------------------------- plots

def plot_line(audio: np.ndarray, fs: int, t_start: float, timing: dict, qa_data: dict,
              title: str, out_png: str) -> None:
    """Spectrogram with syllable marks + Harvest F0 against the score."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import pyworld as pw

    x = audio.astype(np.float64)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(15, 7.5), sharex=True,
                                 gridspec_kw={"height_ratios": [1.15, 1]})
    nfft, hop = 1024, 240
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (nfft // 2, nfft // 2)), nfft)[::hop]
    S = 20 * np.log10(np.abs(np.fft.rfft(frames * np.hanning(nfft), axis=1)).T + 1e-7)
    fmax = 10000
    nb = int(fmax / (fs / nfft))
    a1.imshow(S[:nb], origin="lower", aspect="auto", cmap="magma", vmin=S.max() - 90, vmax=S.max(),
              extent=[t_start, t_start + len(x) / fs, 0, fmax])
    for s in timing.get("syllables", []):
        a1.axvline(s["start"], color="#5ff", lw=0.6)
        if "vowel" in s:
            a1.axvline(s["vowel"], color="w", lw=0.8, ls="--")
        a1.text(s.get("vowel", s["start"]), fmax * 0.93, s["text"], color="w", fontsize=9)
    a1.set_ylabel("Hz")
    a1.set_title(title)
    f0, t = pw.harvest(x, fs, f0_floor=70.0, f0_ceil=1200.0, frame_period=5.0)
    m = np.where(f0 > 0, 69 + 12 * np.log2(np.maximum(f0, 1) / 440), np.nan)
    a2.plot(t_start + t, m, ".", ms=2.5, color="#1f77b4", label="output F0 (Harvest)")
    if "score_midi" in qa_data:
        a2.plot(qa_data["frames_t"], qa_data["score_midi"], "-", color="#d62728", lw=2.5,
                alpha=0.45, label="score")
        v = qa_data["score_midi"][np.isfinite(qa_data["score_midi"])]
        if len(v):
            a2.set_ylim(v.min() - 4, v.max() + 4)
    a2.set_ylabel("MIDI")
    a2.set_xlabel("song time (s)")
    a2.grid(alpha=0.3)
    a2.legend(loc="upper right")
    fig.tight_layout()
    fig.savefig(out_png, dpi=72)
    plt.close(fig)


# ----------------------------------------------------------------------------- timbre drift

def timbre_vector(audio: np.ndarray, fs: int) -> np.ndarray:
    """Mean MFCC 1-19 over the loud frames of a line (a crude speaker/timbre fingerprint)."""
    import librosa
    m = librosa.feature.mfcc(y=audio.astype(np.float32), sr=fs, n_mfcc=20, n_fft=2048,
                             hop_length=512)
    e = m[0]
    keep = e > e.max() - 25
    return m[1:, keep].mean(1)


def drift_report(vectors: dict[str, list[np.ndarray]], ref: str = "you") -> dict:
    """Euclidean distance of each voice's mean timbre vector to the reference voice."""
    if ref not in vectors:
        return {}
    r = np.mean(vectors[ref], axis=0)
    return {v: round(float(np.linalg.norm(np.mean(x, axis=0) - r)), 2)
            for v, x in sorted(vectors.items())}


# ----------------------------------------------------------------------------- timing

def timing_offset_ms(audio: np.ndarray, fs: int, t_start: float, timing: dict,
                     max_lag: float = 0.06, step: float = 0.0025) -> float | None:
    """Lag (ms) that best aligns the output loudness with the reported syllable timing
    (indicator: 0.5 on consonants, 1 on vowels, 0 in gaps). ~0 means vocal_timing.json
    describes the audio; positive = audio late."""
    sy = timing.get("syllables", [])
    if len(sy) < 2 or "vowel" not in sy[0]:
        return None
    hop = int(step * fs)
    n = len(audio) // hop
    env = np.sqrt(np.mean(audio[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-10)
    db = 20 * np.log10(env)
    db = np.clip(db - (db.max() - 40), 0, None)
    t = t_start + (np.arange(n) + 0.5) * step

    def indicator(shift):
        ind = np.zeros(n)
        for s in sy:
            ind[(t >= s["start"] + shift) & (t < s["vowel"] + shift)] = 0.5
            ind[(t >= s["vowel"] + shift) & (t < s["end"] + shift)] = 1.0
        return ind

    best, best_c = 0.0, -2.0
    for lag in np.arange(-max_lag, max_lag + 1e-9, step):
        ind = indicator(lag)
        if ind.std() == 0:
            continue
        c = np.corrcoef(ind, db)[0, 1]
        if c > best_c:
            best, best_c = lag, c
    return round(1000 * best, 1)
