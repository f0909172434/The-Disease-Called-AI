# music/diffsinger — headless DiffSinger singing

The song's sung lines are rendered by two DiffSinger voicebanks through **OpenUtau.Core**
(MIT, built from source, CPU ONNX Runtime) driven headlessly, then styled and mixed by the
vocal engine (`music/vocal`). Spoken and whispered lines stay on Kokoro.

| voice (vocals.json) | singer | how |
|---|---|---|
| `you` (him, human) | **TIGER v106** (tigermeat), mode `01 Fresh` | DiffSinger audio as sung |
| `ai_0` (her) | **Hoshino Hanami ~AI❤dol~ v1.0** (Lotte V), mode `03 Nectar (Soft)` | + AI styling |
| `ai_1` / `ai_2` (her → him, 15 % / 50 %) | Hanami + TIGER on one timeline | envelope blend + AI styling |
| `ai_him` (the AI in his voice) | TIGER | + AI styling |

## Setup

```sh
music/diffsinger/setup.sh              # .NET 10 SDK (apt) if missing, OpenUtau @ pinned commit, build
music/diffsinger/fetch_voicebanks.sh   # TIGER + Hanami -> voicebanks/ (git-ignored)
music/diffsinger/fetch_voicebanks.sh --from DIR   # zips already downloaded (e.g. voicebanks/_zips)
```

* `setup.sh` clones `stakira/OpenUtau` at commit `ec7ba52` into `vendor/` (git-ignored) and
  publishes `bin/ourender`. `ourender/cpu-onnxruntime.targets` swaps OpenUtau.Core's Linux
  CUDA package (`Microsoft.ML.OnnxRuntime.Gpu.Linux`) for the CPU one
  (`Microsoft.ML.OnnxRuntime` 1.24.4) at build time; no OpenUtau file is edited. Build: 36 s
  from a fresh checkout (restore + compile OpenUtau.Core), 4 s incremental; `bin/` is 83 MB.
* `fetch_voicebanks.sh` downloads from the official sources — TIGER: GitHub release `v106`
  of `spicytigermeat/tiger_diffsinger` (`TIGER_DS_v106_PACK.zip`); Hanami: the MediaFire link
  in Lotte V's release post (lottev.moe, 2024-09). If those hosts are blocked, download the
  zips by hand and pass `--from DIR`. TIGER's pack has the voice library as a zip inside; its
  OpenUtau plugin DLLs go to `voicebanks/_extras/` (not used: lyrics carry explicit phonemes).
* The system Python is untouched (the pipeline uses numpy/scipy/pyworld/soxr/misaki/
  faster-whisper as before). Tests need nothing else.

## Render

```sh
python3 music/vocal/render_vocals.py                       # everything (DiffSinger is the default)
python3 music/vocal/render_vocals.py --lines C1_2,B_L1 --no-stems --wav-dir /tmp/x
python3 music/vocal/render_vocals.py --sung-backend kokoro # the old Kokoro singer
python3 music/diffsinger/audition.py --lines V1_1,C1_2 --mp3 /tmp/him.mp3   # + WER/pitch/crack table
```

Options (environment): `DIFFSINGER_COLOR_HANAMI` / `DIFFSINGER_COLOR_TIGER` (voice mode,
substring of the subbank name: `root`, `fragrance`, `nectar`; `fresh`, `disco`, `electric`,
`vinyl`, `mystic`, `glam`, `royal`), `VOCAL_DS_TIMING` (`bank` | `ours`), `VOCAL_DS_PITCH`
(`score` | `bank`), `VOCAL_DS_STEPS` (20), `VOCAL_DS_STYLING` (`filter` | `world`),
`VOCAL_DS_WARP` (1), `VOCAL_DS_PROCS` (1), `VOCAL_DS_KEEP=1` (keep the ustx/WAV work dir in
`music/build/tmp/`), `DIFFSINGER_HER` / `DIFFSINGER_HIM` (bank keys), `DIFFSINGER_VOICEBANKS`,
`OURENDER`, `OURENDER_DATA`.

Pieces that also work on their own:

```sh
python3 music/diffsinger/score_to_ustx.py --bank tiger --lines V1_1,C1_3 -o /tmp/v.ustx [--timing ours]
music/diffsinger/bin/ourender phonemize --project /tmp/v.ustx --out /tmp/v      # timing JSON
music/diffsinger/bin/ourender render    --project /tmp/v.ustx --out /tmp/v [--pitch bank] [--steps N]
music/diffsinger/bin/ourender singers                                             # what OpenUtau sees
```

A generated `.ustx` opens in the OpenUtau GUI as a normal project (timed lyrics need
`ourender.dll` in OpenUtau's Plugins folder).

## How it works

1. **Phonemes** (`phonemes.py`): the vocal engine's own pronunciation — misaki G2P on the
   whole line (as Kokoro does), the sung overrides and diction rules, the onset-maximal
   syllabifier matched to the score's syllables — converted to ARPAbet per score syllable
   (one vowel per note; DiffSinger starts a note at every vowel). `banks.py` maps them 1:1
   onto each bank's inventory read from its files (Hanami's English has no `dx`/`ax`:
   → `d`/`ah`), never splitting or dropping, so two banks stay phoneme-aligned.
2. **ustx** (`score_to_ustx.py`): one part per line at its song time (172 BPM, 480 tpb,
   1.5 beats pre-roll), one note per syllable with `text[ph ph ...]`, `+~` for melismas,
   flat notes plus a PITD curve that makes OpenUtau's pitch equal our contour exactly.
3. **Pass 1 — timing**: `ourender phonemize` runs OpenUtau's DiffSinger English phonemizer
   with the bank's duration model (vowel on the note, consonants placed by the model).
   `VOCAL_DS_TIMING=ours` uses the planner's rules instead, sent as `text[ph@ticks ...]` to
   ourender's timed phonemizer (`OUR TIMED`). The engine's `SungPlan` is rebuilt from these
   phoneme times, so `vocal_timing.json` (consonant start, vowel = landing) is measured.
4. **Contour**: `contour.design()` on that plan (human scoops/vibrato, AI hard-tune, choir,
   detune, jittered doubles) becomes the PITD (`VOCAL_DS_PITCH=bank`: the bank's pitch model
   via OpenUtau's "Load rendered pitch").
5. **Pass 2 / 3 — render**: one ourender batch for all lines' primary bank; then the
   secondary bank of a her→him line sings the same phonemes on the primary's timeline and
   pitch (an octave lower when the line lies above the bank's range; only its envelope is used).
6. **Styling** (`music/vocal/diffsinger_backend.py`): human lines are DiffSinger's audio as
   sung. AI/blend lines: WORLD envelopes of both renders (analysis F0 = what the model was
   given), formant scales aligned by the blend weight (her ≈ 1.2–1.3 × his) and log-envelopes
   interpolated; the AI style (+3 % formants, +1.5 dB/oct) is applied as a **time-varying
   envelope filter on DiffSinger's own audio** plus the vocoder layer — a WORLD re-synthesis
   cost intelligibility (copy-synthesis alone: "every word I say" → "everyone else",
   "always" → "Alice" in Whisper); the filter keeps the raw render's transcript. Choir lines
   (three detuned singers) and bank-pitch mode re-synthesise with WORLD as before.
7. Gates, levels, inhale, timing entry and QA data: `singer.finish_sung`, then stems/QA
   unchanged.

**Caches.** `music/build/cache/ds_<line>` (DiffSinger stage: line, bank fingerprints incl.
voice mode, renderer build, sources) and `dsline_<line>` (finished line). OpenUtau's tensor
cache lives in `oudata/` (git-ignored).

**Determinism / threads.** Phonemizer, duration/pitch models and vocoders are
deterministic; the diffusion sampler draws noise inside the ONNX graph (two uncached renders
differ). OpenUtau's tensor cache stores every model output by its inputs, so the first render
of an input is reused bit-exactly afterwards (ourender drops OpenUtau's 16-bit phrase WAV
cache so a re-render equals the first). ONNX Runtime uses its default CPU pool (one intra-op
thread per core); OpenUtau serialises DiffSinger phrases, so run one ourender at a time with
a whole batch — two parallel processes were slower on 4 cores (RTF 4.9 vs 4.4).

## Measured (4-core CPU)

* Render speed, 20 steps (both banks use reflow with max depth 0.6): TIGER ≈ 4.6 s, Hanami
  ≈ 4.8 s per second of audio; phonemize ≈ 5–11 s per batch; cached re-render ≈ 0.15 s/s.
  10 steps was not faster end-to-end and cost intelligibility on one line.
* Test lines (faster-whisper medium.en WER, median |pitch error| vs score, % of vowel frames
  with octave jumps / sub-harmonics / voicing drop-outs ≥ 60 ms from attack and release):
  TIGER V1_1 0 / 8.1 c, C1_2 0.8 ("If we were made of life") / 5.8 c, C1_4 0 / 7.6 c,
  F_1 0 / 10.1 c, cracks 0–2.4 %; Hanami (as cast, blends included) pitch 0.5–3.8 c,
  cracks: Nectar 0–0.9 %, Root ≤ 5.1 %, Fragrance ≤ 8.6 % → Nectar is the default.

## Tests

```sh
python3 -m unittest discover -s music/diffsinger/tests -v
```

Unit tests (phonemes, bank mapping/scan, ustx/PITD round trip, planner timing, plan from
phoneme times, formant-aligned blend) run anywhere. The smoke test renders through ourender
with a freely licensed stand-in bank when `DIFFSINGER_TEST_VOICEBANKS` points at a folder
with `opencpopJPN/` (MIT, Hugging Face dataset `mitsudate/DiffSinger_opencpop_JPN`) and
`Dependencies/nsf_hifigan/` (OpenVPI PC-NSF-HiFiGAN 2025.02, CC BY-NC-SA 4.0, HF mirror
`Nevertree/PC-NSF-HIFIGAN`, exported to ONNX with OpenVPI DiffSinger's
`deployment/modules/nsf_hifigan.py`) — see `tests/testbank.py`.

## Credits and licences

* **TIGER (tigermeat)** — DiffSinger voice library TIGER v106 by tigermeat
  (tigermeat.xyz). CC BY-NC-ND 4.0 + Commons Clause: non-commercial, credit required, no
  redistribution or derivatives of the models; character usage ToS in the repo.
* **Hoshino Hanami ~AI❤dol~ (Lotte V)** — DiffSinger voicebank v1.0 by Lotte V / Team
  L❤VE (lottev.moe). Terms of Use and licences ship in the bank folder (`Terms of Use.pdf`,
  `__License/`); re-uploading is forbidden.
* This project's release is non-commercial and credits both. **Never commit or share
  `voicebanks/`** (git-ignored); `fetch_voicebanks.sh` reinstalls from the official sources.
* OpenUtau (stakira and contributors, MIT); ONNX Runtime (Microsoft, MIT).
