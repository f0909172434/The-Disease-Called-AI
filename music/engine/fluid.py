"""FluidSynth (GM SoundFont) rendering for the sampled instruments.

Each part is written to its own MIDI file at sample resolution (120 BPM with 24000
ticks per beat = one tick per sample at 48 kHz) and rendered offline with reverb and
chorus disabled -- all space is added at the mix stage.

Timing: FluidSynth starts a note ~100 samples after its event and dispatches events at
64-sample block boundaries (+32 samples on average). Renders are advanced by
FLUID_LATENCY so onsets land within +-0.7 ms of the score grid.
"""
from __future__ import annotations

import os
import subprocess
import tempfile

import mido
import numpy as np
import soundfile as sf

from common import N_TOTAL, SF2, SR, fit_length

FLUID_LATENCY = 132          # samples (measured: ~100 note-on latency + 32 mean block quantisation)
_TPB = 24000                 # ticks per beat at 120 BPM -> 1 tick = 1/48000 s
_TEMPO = 500000              # microseconds per beat (120 BPM)


def _tick(seconds: float) -> int:
    return max(0, int(round(seconds * SR)))


def write_midi(path: str, notes, program: int, *, bend_cents: float = 0.0, channel: int = 0) -> None:
    """notes: iterable of (start_s, dur_s, midi_pitch, velocity 0..1).

    Same-pitch overlaps are trimmed so a late note-off never kills the next strike, and at
    equal ticks note-offs are sent before note-ons.
    """
    notes = sorted((float(s), float(d), int(p), float(v)) for s, d, p, v in notes)
    by_pitch: dict[int, list] = {}
    for s, d, p, v in notes:
        by_pitch.setdefault(p, []).append([s, s + d, v])
    events = []
    for p, lst in by_pitch.items():
        lst.sort()
        for i, (s, e, v) in enumerate(lst):
            if i + 1 < len(lst):
                e = min(e, lst[i + 1][0] - 1.0 / SR)
            e = max(e, s + 0.005)
            vel = int(np.clip(round(v * 127), 1, 127))
            events.append((_tick(s), 1, mido.Message("note_on", note=p, velocity=vel, channel=channel)))
            events.append((_tick(e), 0, mido.Message("note_off", note=p, velocity=0, channel=channel)))
    events.sort(key=lambda e: (e[0], e[1]))
    mid = mido.MidiFile(ticks_per_beat=_TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=_TEMPO, time=0))
    tr.append(mido.Message("program_change", program=program, channel=channel, time=0))
    for cc, val in ((7, 110), (10, 64), (11, 127), (91, 0), (93, 0), (64, 0)):
        tr.append(mido.Message("control_change", control=cc, value=val, channel=channel, time=0))
    bend = int(np.clip(round(bend_cents / 200.0 * 8192), -8192, 8191))
    tr.append(mido.Message("pitchwheel", pitch=bend, channel=channel, time=0))
    last = 0
    for tick, _, msg in events:
        msg.time = tick - last
        last = tick
        tr.append(msg)
    mid.save(path)


def render(notes, program: int, *, bend_cents: float = 0.0, gain: float = 0.5,
           n_total: int = N_TOTAL, advance: int = 0) -> np.ndarray:
    """Render notes with one GM program; returns float stereo of exactly n_total samples.

    `advance` (samples) shifts the result earlier on top of the latency compensation
    (used for slow-attack patches such as strings and choir, which players anticipate).
    """
    if not notes:
        return np.zeros((n_total, 2), dtype=np.float32)
    with tempfile.TemporaryDirectory(prefix="fluid_") as tmp:
        mid_path = os.path.join(tmp, "part.mid")
        wav_path = os.path.join(tmp, "part.wav")
        write_midi(mid_path, notes, program, bend_cents=bend_cents)
        cmd = ["fluidsynth", "-ni", "-q", "-R", "0", "-C", "0", "-g", str(gain), "-r", str(SR),
               "-O", "float", "-T", "wav", "-o", "synth.polyphony=1024",
               "-F", wav_path, SF2, mid_path]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        x, sr = sf.read(wav_path, dtype="float32", always_2d=True)
    assert sr == SR, sr
    shift = FLUID_LATENCY + advance
    x = x[shift:] if shift > 0 else np.pad(x, ((-shift, 0), (0, 0)))
    if x.shape[1] == 1:
        x = np.repeat(x, 2, axis=1)
    return fit_length(x, n_total)
