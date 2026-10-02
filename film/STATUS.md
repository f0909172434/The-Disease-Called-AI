# Film engine: status

## Done
- p5.js + p5.brush engine (from ClaudeAnimationBase, MIT) is the production renderer; the Three.js engine in
  `visuals/` is retired (fonts, placeholder timeline and font builder moved here).
- 24 fps final (`PROJECT.fps`), 215 s; boil stays 12 drawings/s.
- `src/data.js`: song data loaded synchronously at page load (analysis timeline or placeholder, arrangement,
  events, vocals + vocal timing) with pure-of-t helpers (`section`, `beat`, `bar`, `tAt`, `events`, `since`,
  `evPulse`, `env`, `LYRICS`, `lyricLine`, `sylIndex`, `vox`, …). `analysis/*.py` now write `film/data/`.
- `src/lyrics.js`: bilingual karaoke overlay per style guide §5 (fonts §2), per-shot `lyricMode`/`lyricStyle`,
  drawn after the paint and under the grain; local woff2 fonts via FontFace.
- `cachedLayer()` for static watercolour layers (3 boil variants), pixel-identical to painting directly.
- `render.mjs --video`: parallel Chromium processes over resumable 1 s H.264 chunks, concat, master.wav mux;
  `--bench`, `--serve`, `--inject`, `--lyrics`, `--nocache`; old review modes kept. `tools/check_determinism.mjs`.
- Determinism fixes: Chrome's canvas readback noise and per-process GPU/CPU choice for 2D canvases made the same
  t differ by ±1 between workers (now disabled by flags in `tools/harness.mjs`); p5.brush fills painted into a
  `p5.Framebuffer` are nondeterministic, so cached layers are painted on the main canvas and copied out.

## Measured (1920×1080, SwiftShader, 4 cores shared with two other agents' renders, load average ≈ 10)
Throwaway test shot around C1_1 (55–60 s): a cached room (5 watercolour fills + 6 ink lines) under a moving
camera, a live washed ball, a glow and the karaoke overlay.
- uncached (`--nocache`): 15.3 s/frame (first frame 21.9 s)
- cached: median 1.72 s/frame over 29 frames (min 1.07); each of the 3 variants costs ~21.6 s once per page
- `--video --from=55 --to=60 --workers=3`: 120 frames in 4.4 min = 2.22 s/frame wall, including 9 variant paints;
  H.264 High yuv420p 24 fps, 5.000 s; a re-run reuses the chunks (3 s)
- empty frame (paper + grain + JPEG capture): ~1.0 s at this load, ~0.45 s on a quiet box
- `check_determinism.mjs` on 9 times of the test shot: identical across processes and render orders.

## Next / known
- No shots yet: `studio.html` has no scene scripts, so the film renders the placeholder. Scenes go in
  `src/scenes/*.js` (README_ENGINE.md › Shots), characters in `src/chars/`.
- `data/timeline.json` (real analysis) doesn't exist yet: run `python3 analysis/analyze.py` once
  `music/build/master.wav` and stems exist; until then beats/envelopes come from the placeholder.
- `music/build/vocals.json` / `vocal_timing.json` still carry the older `ai_her` style names (treated as AI, as
  `ai_him` will be) and disagree on one line's text (B_AI2: "Please —"); re-render the vocals to sync them.
- Lyric colours come from the style guide's dark world; on paper they rely on the ink outline and the bottom band
  (`LYRIC_CFG` in `src/lyrics.js`); worth an art-direction pass once real shots exist.
- Budget: at ~1.5–2.5 s/frame/worker, 5160 frames ≈ 45–70 min with 3 workers on a quiet 4-core box; keep heavy
  fills in `cachedLayer` and per-frame paint to washes, ink and a few fills. `--gpu-angle` for a GPU run.
