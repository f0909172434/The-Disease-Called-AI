# Vocal engine — status (handover)

**Done.** `python3 music/vocal/render_vocals.py` writes `music/build/stems/vox_{you,ai,bg,spoken}.wav` (48 kHz/24-bit/stereo, 215.000 s, dry), `vocal_timing.json` (every line: line/syllable/word start-end + syllable `vowel` = beat landing), `vocal_qa.json`, `qa_vocal/*.png`. Method: misaki G2P → onset-maximal syllables → planner time map (vowel on the beat, onsets anticipate, codas at note end) → **Kokoro forced singing** (fractional alignment, designed energy curve, melody as NSF F0, squeezed into the voice's clean range, content alignment shifted +2.1 frames = decoder lag) → **WORLD** transpose to the exact target contour + style (human vibrato/scoops/breath/air/inhales; AI 12 ms hard-tune, +3 % formants, vocoder layer; choir ×3; whisper F0=0). Spoken: natural Kokoro prosody, onset on `tb`, F0 reshaped per style, glitch cut at `cut_tb`.

**QA (last full run, faster-whisper medium.en):** sung leads mean WER 0.128 (median 0, n=52), doubles 0.166, spoken 0.000 (n=18). Pitch median |err|: AI 3.3 c (worst 6.8), human 9.8 c (worst 15.5), choir 10.9 c.
Failing (WER > 0.35), all high chorus register: C1_2/C2_2 "made of light" (0.6), C1_4/C2_4 "goodnight"→"good at night" (1.25), C2_6 "design" (0.8). WORLD at the native pitch gets these right → it is the C5–F5 register, not the alignment.

**Commands.** Full: `python3 music/vocal/render_vocals.py` (uncached ≈ 28 min on the shared 4-core box; Kokoro stage cached → ≈ 20 s render + ≈ 10 min QA). Audition: `--lines C1_4,C2_6 --no-stems --wav-dir /tmp/x`. Options: `--no-qa`, `--qa-model small.en`, `--no-cache`, `--jobs N`.
Cache `music/build/cache/`: `tts_*` keyed by line + blend + TTS-side style values + TTS modules (bump `TTS_VERSION` in singer.py/speaker.py if `sing_native`/`speak_native` change); `line_*` by all engine sources; `qa_*` by audio hash.

**Pronunciation overrides** (`phonology.SUNG_OVERRIDES`): every→ˈɛvɹi, really→ɹˈɪli, real→ɹˈil. Sung diction rule (`planner.unreduce`): the/a→ʌ, to→u on notes ≥ 0.3 s.

**Known issues / next steps.**
- `timing_offset_ms` (energy-correlation) is biased (reads ≈ −25 ms). Direct check (voicing onset after s/f/θ): vowels land ≈ +20–25 ms late (decoder coarticulation). Replace the metric; optionally pull fricative→vowel content boundaries ~0.6 frame earlier (`kokoro_backend.content_alignment`).
- `timbre_distance_to_you` (MFCC) is confounded by pitch/lyrics (not monotonic) → replace with a probe: one fixed line rendered by every voice stage.
- Promising but unverified: in `singer.world_stage`, unvoice voiced-stop closures (F0=0) + ap≥0.6 on voiced fricatives (fixed C1_2 0.8→0.2, but flipped C2_6). Whisper is high-variance on single lines; judge by set means.
- "never ever" on a held "nev-" (C1_3/C1_4/C2_3/C2_4) is present even natively (Kokoro level).
- Rejected: explicit diphthong offglide tokens; un-reducing de-/re- schwas (both add phantom syllables).

**Casting change (male human, female AI morphing into him).**
- Voices: the engine only reads `vocals.json["voices"][line.voice]["blend"]` → change the blends in `music/score/song.py` (`VOICES`); nothing to change in the engine.
- **Add every new Kokoro voice to `styles.VOICE_RANGE`** (clean native MIDI range; measured: af_heart 50–63, am_michael 43–55, af_nicole 45–56). Blends interpolate automatically. Re-measure ranges for new voices (non-harmonic-energy test vs forced F0).
- Transpose: prefer the score (`song.py` `sung(..., transpose=-12)`); the engine follows the notes. If an engine-side per-voice transpose is wanted, apply it to note pitches in `planner.plan_sung` (where `Note(...)` is built) so contour, QA `score_midi` and timing stay consistent.
- A −12 st male lead needs far less WORLD up-shift → the high-register WER failures above should largely disappear.
