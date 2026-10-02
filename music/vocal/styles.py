"""
Vocal styles as data. Each style bundles: how the line is phrased (TimingStyle), how the
pitch moves (Expression), how hard the voice is driven (energy), and what the WORLD stage
does to the timbre (breath, formant shift, brightness, vocoder layer, choir spread).

  human            natural: portamento, scoops, vibrato, a little breath
  ai               hard-tuned, no vibrato, +3 % formants, brighter, quiet vocoder layer
  ai_him           the same processing worn on his timbre (the AI singing in his voice)
  choir            soft airy harmony: breathy, darker, three detuned/delayed voices
  human_trembling  (spoken) panic: tremor + jitter + breath
  whisper          (spoken) WORLD resynthesis with F0 = 0: a true whisper
  ai / ai_him_spoken (spoken) natural Kokoro speech, calmer intonation, light AI sheen
"""
from __future__ import annotations

from dataclasses import dataclass, field

from contour import AI, CHOIR, HUMAN, Expression
from planner import TimingStyle

# clean native range (MIDI) of each Kokoro voice; blends interpolate. Above the top the
# decoder starts hallucinating speech-range energy (measured: non-harmonic energy ratio)
VOICE_RANGE = {"af_heart": (50.0, 63.0), "am_michael": (43.0, 55.0), "af_nicole": (45.0, 56.0)}


def voice_range(blend: dict[str, float]) -> tuple[float, float]:
    tot = sum(blend.values())
    lo = sum(VOICE_RANGE.get(k, (48.0, 60.0))[0] * w for k, w in blend.items()) / tot
    hi = sum(VOICE_RANGE.get(k, (48.0, 60.0))[1] * w for k, w in blend.items()) / tot
    return lo, hi


@dataclass
class SungStyle:
    expr: Expression
    timing: TimingStyle = field(default_factory=TimingStyle)
    vowel_level: float = 8.6          # Kokoro energy for sustained vowels
    onset_boost: float = 0.8          # extra energy on unvoiced onsets (diction)
    dynamics: str = "human"           # dynamics.shape_notes flavour
    breath: float = 0.30              # WORLD aperiodicity lift ...
    breath_from: float = 1500.0       # ... above this frequency
    formant: float = 1.0              # spectral-envelope warp ratio
    tilt_db_oct: float = 0.0          # brightness (dB / octave above 1 kHz)
    vocoder_db: float | None = None   # vocoder layer level vs the voice
    choir_voices: int = 1
    lowpass_hz: float | None = None
    unvoiced_db: float = 0.0          # gain on unvoiced frames (consonants) after synthesis
    level_dbfs: float = -22.0         # active RMS of a lead line in the stem


SUNG = {
    "human": SungStyle(HUMAN),
    "ai": SungStyle(AI, TimingStyle(cons_scale=1.0, release=0.015, release_frac=0.05),
                    vowel_level=8.9, onset_boost=0.6, dynamics="ai", breath=0.0,
                    formant=1.03, tilt_db_oct=1.5, vocoder_db=-12.0),
    "choir": SungStyle(CHOIR, TimingStyle(cons_scale=0.9, release=0.06, release_frac=0.15),
                       vowel_level=8.2, onset_boost=0.0, dynamics="choir", breath=0.65,
                       breath_from=900.0, tilt_db_oct=-1.5, choir_voices=3, lowpass_hz=7500.0,
                       unvoiced_db=-9.0),
}
SUNG["ai_him"] = SUNG["ai"]


@dataclass
class SpokenStyle:
    flatten: float = 1.0              # F0 deviation scale around the line median (1 = natural)
    shift_semitones: float = 0.0
    tremor_cents: float = 0.0         # F0 tremor depth
    tremor_hz: float = 6.8
    jitter_cents: float = 0.0
    amp_tremor: float = 0.0           # amplitude tremor depth (0..1)
    whisper: bool = False             # WORLD resynthesis with F0 = 0
    breath_layer_db: float | None = None   # mix in a whispered copy (breathy voice)
    formant: float = 1.0
    tilt_db_oct: float = 0.0
    vocoder_db: float | None = None
    world: bool = False               # pass through WORLD (needed for formant/tilt/vocoder)
    level_dbfs: float = -22.0


SPOKEN = {
    "human": SpokenStyle(),
    "whisper": SpokenStyle(whisper=True, world=True, tilt_db_oct=1.0, level_dbfs=-26.0),
    "human_trembling": SpokenStyle(shift_semitones=1.5, tremor_cents=55.0, tremor_hz=6.6,
                                   jitter_cents=14.0, amp_tremor=0.22, breath_layer_db=-11.0,
                                   level_dbfs=-23.0),
    "ai": SpokenStyle(flatten=0.6, formant=1.02, tilt_db_oct=1.0, vocoder_db=-22.0, world=True),
    "ai_him_spoken": SpokenStyle(flatten=0.7, formant=1.015, tilt_db_oct=0.8, vocoder_db=-24.0,
                                 world=True),
}


def spoken_style(line: dict) -> SpokenStyle:
    if line["mode"] == "whisper":
        return SPOKEN["whisper"]
    return SPOKEN.get(line["style"], SPOKEN["human"])


def sung_style(line: dict) -> SungStyle:
    return SUNG.get(line["style"], SUNG["human"])
