# music/engine — status

**Done.** Full render → mix → master → QA pipeline, deterministic (all randomness seeded).
- `render_instruments.py`: every arrangement track + FX type → `build/stems/tracks/*.flac` (24-bit, peak-normalised, scale in `manifest.json`) + dry analysis stems `stems/{kick,snare,hat,musicbox}.wav`.
- `mix.py`: channel strips (loudness-normalised, faders = arrangement `gain_db` + `TRIMS`/`RIDES`), kick-sidechain, per-bus synthetic-IR reverbs/delays, automation (lowpass log-interpolated, bitcrush), transport FX (stutter = band only; rewind + tape stop also on vocals), silence = hard mute incl. tails, outro tail fade, vocal chains + measured riding, master (glue → EQ → soft clip → true-peak limiter, gain-searched to −11 LUFS).
- Outputs: `build/master.wav` (+ identical `.flac`), `stems/{drums,bass,music,fx,vocals}.wav` (post-fader, float32), `build/qa/` (loudness_report.json, track_balance.json, full + per-section spectrograms, loudness timeline).
- Modules: common, dsp (numba biquads/SVF/comp/limiter/BS.1770), drums, synths, guitar, fluid, fx, qa.

**Current master (2026-10-02: score −2 st re-rendered, DiffSinger vocals — TIGER/Hanami):** −11.01 LUFS
integrated (pyloudnorm −11.05), −1.32 dBTP, LRA 5.75 LU, limiter max GR 1.94 dB, 0 clipped, 215.000 s.
Sections: choruses −9.2…−9.7, verses −12.2/−12.7, bridge −12.9, intro −17.4 LUFS. VIR: verses −0.6/+0.1,
choruses −1.1/−0.9/−0.5 LU. Vocal faders: you +4.3, ai +4.2 dB (Kokoro stems: +5.7/+6.0).
Vocal chains for the DiffSinger voices: `human` de-ess split 5.5 → 5.0 kHz (male sibilants, −0.7 dB on
the sibilant peaks); `ai` presence +3 → +2, air +4 → +2.5, exciter −13 → −16 dB (Hanami has real air to
16 kHz; sibilant peaks vs voice −13.7 → −14.2 dB; his stem −19.3 dB).

**Previous master (with the 14:02 Kokoro vox stems):** −11.02 LUFS integrated (pyloudnorm −11.06), −1.32 dBTP,
LRA 6.1 LU, limiter max GR 2.0 dB, 0 clipped samples, exactly 215.000 s. Sections: choruses −9.2…−9.7,
verses −12.1/−12.5, bridge −13.0, intro −16.9 LUFS. VIR (vocals vs band): verses ≈0, choruses −0.1…−1.1 LU.

**Times (4 CPUs):** render ≈ 65 s (4 workers), mix ≈ 4.5 min incl. vocals + plots; peak RAM ≈ 3.2 GB.

**Commands**
```
python3 music/engine/render_instruments.py            # [--only guitar,fx:impact] [--jobs N]
python3 music/engine/mix.py                           # [--no-vocals] [--no-plots] [--vox-dir DIR]
```

**When the vocals are re-rendered** (male human, female AI): just re-run `mix.py` (no re-render needed).
Riding is measured per line from `vocal_timing.json`, so new levels are absorbed automatically. Then check
`qa/loudness_report.json` → `vir_lu` (target ≈0 verses / ≈−1 choruses) and `vocals.*_fader_db`.
Consider `VOCAL_STYLES["human"]["hp"]` 100 → 80 Hz for a low male voice and re-check sibilance (de-esser
bands at 5.5/6.5 kHz suit the female AI).

**Remains / ideas:** listen-through by a human; mix runtime is dominated by page faults on big temporaries
(could move channel strips to float32); stems are float32 WAV (~83 MB each).

**Arrangement flags (not edited):** silence lane spans 4 bars (tb 320–336) vs "2 小節" in 01_concept;
outage breaths at tb 320.5/322.4 overlap "Hello…?"/"Are you there?"; B_AI2 (~3 s) has only 7 beats before
the tb 423 rewind (its tail is rewound away); composer faders needed large trims under loudness
normalisation (guitar +5.7, saws +6.8, kick −3 dB); `ride` track empty, `ecg_beep` unused.
