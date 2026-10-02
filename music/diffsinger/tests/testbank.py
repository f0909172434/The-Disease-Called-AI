"""
A freely licensed DiffSinger bank for smoke tests (no English model of TIGER/Hanami's kind is
redistributable): "opencpopJPN" (MIT, Hugging Face dataset mitsudate/DiffSinger_opencpop_JPN,
an OpenUtau-format acoustic model trained on Opencpop + Japanese data) with the
PC-NSF-HiFiGAN 2025.02 community vocoder (OpenVPI, CC BY-NC-SA 4.0; HF mirror
Nevertree/PC-NSF-HIFIGAN, exported to ONNX locally). It has no duration model, so it is
driven with our timed phonemizer, and its Mandarin/Japanese phonemes stand in for English
(the audio is accented; the test is about the pipeline, not the diction).

Set DIFFSINGER_TEST_VOICEBANKS to a folder that contains opencpopJPN/ and
Dependencies/nsf_hifigan/ (see README.md, "Smoke test").
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import banks as bk  # noqa: E402

TEST_VOICEBANKS = os.environ.get("DIFFSINGER_TEST_VOICEBANKS", "")

ARPA_TO_OPENCPOP = {
    "aa": "a", "ae": "a", "ah": "a", "ao": "o", "aw": "ao", "ax": "e", "ay": "ai", "eh": "E",
    "er": "er", "ey": "ei", "ih": "i", "iy": "i", "ow": "ou", "oy": "ai", "uh": "u", "uw": "u",
    "b": "b", "ch": "ch", "d": "d", "dh": "d", "dx": "d", "f": "f", "g": "g", "hh": "h",
    "jh": "zh", "k": "k", "l": "l", "m": "m", "n": "n", "ng": "N", "p": "p", "r": "r", "s": "s",
    "sh": "sh", "t": "t", "th": "s", "v": "f", "w": "w", "y": "y", "z": "z", "zh": "r", "q": "SP",
}

URL = "https://huggingface.co/datasets/mitsudate/DiffSinger_opencpop_JPN"


def profile(key: str, family: str, rng) -> bk.Profile:
    return bk.Profile(key, r"opencpop", f"opencpopJPN (test as {key})", "mitsudate (MIT)", "MIT",
                      URL, family, rng, phonemizer="Ourender.TimedPhonemizer",
                      phoneme_map=dict(ARPA_TO_OPENCPOP))


def available() -> bool:
    return bool(TEST_VOICEBANKS) and os.path.isdir(os.path.join(TEST_VOICEBANKS, "opencpopJPN"))


def bank(key: str = "opencpop") -> bk.Bank:
    bk.register(profile("opencpop", "her", (50.0, 80.0)))
    return bk.find(key, TEST_VOICEBANKS)


def stand_in_for_real_banks() -> None:
    """Make 'hanami' and 'tiger' resolve to the test bank (the engine asks for those keys).
    'tiger' gets a male-like range so the her->him morph exercises the octave shift."""
    bk.VOICEBANKS = TEST_VOICEBANKS
    bk.register(profile("hanami", "her", (55.0, 81.0)))
    bk.register(profile("tiger", "him", (43.0, 69.0)))
