"""
Kokoro-82M as a *controllable* singer.

Kokoro (StyleTTS2 + iSTFTNet) predicts, per phoneme token, a duration; expands the token
features with a hard alignment matrix; predicts an F0 curve and an energy curve (N) at
80 Hz; and renders audio with a neural source-filter decoder whose harmonic source is a
sine bank driven directly by that F0 curve. All three are explicit tensors, so we can:

  * replace the predicted durations with score durations — through a *fractional*
    alignment matrix, so token boundaries land between the 25 ms frames;
  * replace the predicted F0 with a melody contour;
  * keep the predicted energy curve (it carries the natural articulation).

The decoder only follows forced F0 cleanly inside the voice's natural range (af_heart is
clean up to ~D4, the michael/nicole blends to ~G3; above that it starts hallucinating
speech-range energy), so the singer renders a range-compressed copy of the melody here
and the WORLD stage (world_voice.py) puts the exact target pitch back on top.
"""
from __future__ import annotations

import os
import warnings
from dataclasses import dataclass

import numpy as np
import torch

warnings.filterwarnings("ignore")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

REPO = "hexgrad/Kokoro-82M"
SR = 24000            # Kokoro output rate
FRAME = 0.025         # one duration frame = 600 samples
F0_RATE = 80          # F0 / energy curves run at 2x the frame rate (12.5 ms)
HOP = SR // 40        # 600 samples per duration frame

_model = None
_pipe = None
_packs: dict[str, torch.Tensor] = {}


def _load():
    global _model, _pipe
    if _model is None:
        from loguru import logger
        logger.remove()                        # kokoro logs every call at DEBUG/INFO
        from kokoro import KModel, KPipeline
        torch.set_grad_enabled(False)
        torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
        _model = KModel(repo_id=REPO).eval()
        _pipe = KPipeline(lang_code="a", repo_id=REPO, model=_model)
    return _model, _pipe


def g2p(text: str):
    """misaki G2P -> list of MTokens (text, phonemes, whitespace)."""
    _, pipe = _load()
    _, tokens = pipe.g2p(text)
    return tokens


def vocab() -> dict:
    return _load()[0].vocab


def voice_pack(blend: dict[str, float]) -> torch.Tensor:
    """Weighted sum of Kokoro voice packs (510 x 1 x 256 style tensors)."""
    key = ",".join(f"{k}:{v:.4f}" for k, v in sorted(blend.items()))
    if key not in _packs:
        _, pipe = _load()
        total = sum(blend.values())
        pack = sum(pipe.load_single_voice(name) * (w / total) for name, w in blend.items())
        _packs[key] = pack.float()
    return _packs[key]


@dataclass
class Encoded:
    """Everything the decoder needs that does not depend on timing."""
    ps: str
    ids: list[int]
    d: torch.Tensor          # prosody-encoder features per token
    t_en: torch.Tensor       # text-encoder (content) features per token
    ref_s: torch.Tensor      # 256-d style vector (128 decoder + 128 prosody)
    natdur: np.ndarray       # natural duration per token incl. BOS/EOS, in frames (speed 1)


def encode(ps: str, pack: torch.Tensor) -> Encoded:
    """Run the timing-independent half of Kokoro on a phoneme string."""
    model, _ = _load()
    voc = model.vocab
    missing = [c for c in ps if c not in voc]
    if missing:
        raise ValueError(f"symbols not in Kokoro vocab: {missing} in {ps!r}")
    ids = [0] + [voc[c] for c in ps] + [0]
    input_ids = torch.LongTensor([ids])
    lengths = torch.LongTensor([len(ids)])
    mask = torch.zeros(1, len(ids), dtype=torch.bool)
    ref_s = pack[len(ps) - 1]
    bert = model.bert(input_ids, attention_mask=(~mask).int())
    d_en = model.bert_encoder(bert).transpose(-1, -2)
    d = model.predictor.text_encoder(d_en, ref_s[:, 128:], lengths, mask)
    x, _ = model.predictor.lstm(d)
    natdur = torch.sigmoid(model.predictor.duration_proj(x)).sum(-1).squeeze(0).numpy()
    t_en = model.text_encoder(input_ids, lengths, mask)
    return Encoded(ps, ids, d, t_en, ref_s, natdur.astype(np.float64))


def alignment(bounds: np.ndarray, n_frames: int) -> np.ndarray:
    """Fractional token->frame alignment. Token k covers [bounds[k], bounds[k+1]) in frames;
    each frame is the overlap-weighted mix of the tokens it contains (columns sum to 1).
    Zero-length tokens are skipped (they still shape their neighbours via the encoders)."""
    n = len(bounds) - 1
    A = np.zeros((n, n_frames), np.float32)
    for k in range(n):
        a, b = bounds[k], bounds[k + 1]
        if b <= a:
            continue
        for j in range(max(int(np.floor(a)), 0), min(int(np.ceil(b)), n_frames)):
            A[k, j] = max(0.0, min(b, j + 1) - max(a, j))
    col = A.sum(0, keepdims=True)
    empty = col[0] == 0
    if empty.any():                      # frames beyond the last token: hold the edge token
        A[-1, empty] = 1.0
        col = A.sum(0, keepdims=True)
    return A / col


# The aligner Kokoro was trained with lags the audio by ~2-3 frames, so its decoder renders
# frame j from the *content* (text features) a couple of frames ahead, while F0 and energy
# describe frame j itself. Natural synthesis is self-consistent (the prosody predictor leads
# its alignment by the same amount). With forced timing we keep F0/energy on the intended
# timeline and shift the content alignment later by CONTENT_LAG. Measured: a 2-frame /s/ next
# to silence only becomes a sibilant (HF up ~18 dB) and vowels gain ~9 dB with this shift;
# beyond ~2.25 frames the fricative noise spills into the next vowel's attack.
CONTENT_LAG = 2.1


def content_alignment(bounds: np.ndarray, lag: float = CONTENT_LAG) -> tuple[np.ndarray, int]:
    """Alignment for the decoder's content features: token bounds (frames, intended timeline)
    shifted later by `lag`; BOS absorbs the shift, EOS runs to the end. Returns (A, n_frames);
    the F0/energy curves must be built for the same n_frames on the intended timeline."""
    n = int(np.ceil(bounds[-1] + lag)) + 1
    b = np.asarray(bounds, np.float64) + lag
    b[0], b[-1] = 0.0, float(n)
    return alignment(b, n), n


def prosody(enc: Encoded, A: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Kokoro's own F0 and energy curves (80 Hz) for a given alignment."""
    model, _ = _load()
    aln = torch.from_numpy(A)[None]
    en = enc.d.transpose(-1, -2) @ aln
    f0, n = model.predictor.F0Ntrain(en, enc.ref_s[:, 128:])
    return f0.squeeze(0).numpy().astype(np.float64), n.squeeze(0).numpy().astype(np.float64)


def decode(enc: Encoded, A: np.ndarray, f0: np.ndarray, energy: np.ndarray,
           seed: int = 0) -> np.ndarray:
    """Render audio for an alignment, an F0 curve (Hz, 0 = unvoiced) and an energy curve,
    both at 80 Hz (2 values per duration frame). Returns float32 audio at 24 kHz."""
    model, _ = _load()
    torch.manual_seed(seed)                       # the NSF source draws random phase/noise
    aln = torch.from_numpy(A)[None]
    asr = enc.t_en @ aln
    f0_t = torch.from_numpy(f0.astype(np.float32))[None]
    n_t = torch.from_numpy(energy.astype(np.float32))[None]
    audio = model.decoder(asr, f0_t, n_t, enc.ref_s[:, :128])
    return audio.squeeze().numpy().astype(np.float32)


def frames_to_bounds(durs_frames: np.ndarray) -> np.ndarray:
    return np.concatenate([[0.0], np.cumsum(durs_frames)])
