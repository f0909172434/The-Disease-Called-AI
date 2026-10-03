# 病名為AI: film engine

The production renderer for the 215 s music video: p5.js 2.3 + p5.brush (vendored in `vendor/`), hand-painted
look, 1920×1080, **24 fps** (linework boils at 12 drawings/s). Adapted from ClaudeAnimationBase (MIT, see
`docs/ClaudeAnimationBase.LICENSE`); `docs/ANIMATION_GUIDE.upstream.md` is the upstream guide (painting, motion
helpers, review rules). Every frame is a pure function of `t`: frames render in parallel and out of order.

## Commands (from `film/`)
```
node render.mjs --serve                                   # scrub studio.html in a browser (?t=55.8 ?loop=x ?lyrics=hidden ?nocache)
node render.mjs --sheet=55.9,56.6,58.3 --cols=3 --out=out/check/a.jpg      # contact sheet
node render.mjs --strip=55.8:56.3 --out=out/check/strip.jpg                # every frame of a stretch
node render.mjs --sheet=56.2 --crop=100,860,1100,220 --w=1100 --out=out/check/lyr.jpg   # full-res crop
node render.mjs --bench=24 --from=55                      # s/frame, one worker, real capture path
node render.mjs --video [--from=0 --to=215] [--workers=3] # → ../output/video.mp4 (+ music/build/master.wav if present)
node tools/check_determinism.mjs [--times=a,b | --range=a:b:step]          # exit 1 if any frame differs
```
`--video` runs N separate Chromium processes (own SwiftShader GPU process each) over 1 s chunks, each encoded
straight to H.264 (High, yuv420p, CRF 16) in `out/chunks/1920x1080_24fps/`; re-runs skip finished chunks
(`--redo` re-renders the chunks in `--from/--to` after a shot changed, `--clean` drops all), then stream-copy
concat and AAC mux of the matching stretch of the master (`--no-audio`, `--audio=`). The old review/loop modes
(`--stills --png --frames --encode --clip --loop=name --crop-at`) are unchanged. GL: `--soft-gl` (SwiftShader) is
the default on Linux without `/dev/dri` or `/dev/nvidia*`; `--gpu-angle=vulkan|gl-egl` for an NVIDIA box
(`gpu_probe.mjs`), `--hw-gl` for the platform default. `--inject=a.js` adds throwaway scripts (test shots) to the
page without touching `studio.html`; `--lyrics=hidden|karaoke|subtitle-only` overrides the overlay.
The page is served from the repo root by a local server (`--file` loads it from file:// instead).

## Rendering on Colab GPU
`tools/colab_render.ipynb` renders the whole film on a Colab GPU (L4/A100 best, T4 works) and uploads the MP4 to a release of
`f0909172434/voicebank-cache`; `tools/fetch_colab_render.sh <tag>` brings it back. In Colab: runtime GPU, add the Secret `GH_TOKEN`
(fine-grained PAT, only that repo, Contents: Read and write, notebook access on), Run all. Parameters (cell 1): `BRANCH`, optional
`COMMIT` pin, `FROM`/`TO` (s), `WORKERS` (0 = auto from vCPU/RAM/VRAM, max 6), `CRF` (12), `USE_DRIVE`.
- **Setup**: shallow clone (prints the sha) · Node 22 (puppeteer-core 25 needs >= 22.12) + `npm ci` · Chrome for Testing via
  `@puppeteer/browsers` · ffmpeg (Colab's 4.4 has no `-fps_mode`, which the chunk encoder uses; a newer static build is installed if a
  smoke test of the real options fails) · only if Colab lacks them, the NVIDIA EGL/Vulkan libraries for the exact driver version
  (apt `libnvidia-gl-<major>` when it matches, else NVIDIA's own `.run`, unpacked).
- **GPU probe**: `node render.mjs --probe-gl --gpu-angle=vulkan|gl-egl [--chrome-flags=...]` launches Chrome through the normal
  `launch()`, prints one `PROBE_GL {json}` line (WebGL2 renderer, vendor, GPU devices) and exits 0 (WebGL2 draws) or 2. The notebook
  keeps the first candidate whose renderer says NVIDIA and stops otherwise: with no GPU path Chrome hands out SwiftShader or Mesa
  llvmpipe (`gl-egl` on a CPU-only box "works" as llvmpipe), so the bench and the render also stop if the page's `GL:` line is not NVIDIA.
- **Render**: bench (24 frames, s/frame and an estimate) · chunks dir linked into `MyDrive/disease_called_ai/chunks_<sha>` ·
  `--video --no-audio` (re-run up to twice if it crashes) · ffprobe check (codec, 1920x1080, fps, frame count, duration) · upload
  `video_<sha7>.mp4` + `render_log.json` to release `mv-render-<sha7>` (same-named assets replaced; over GitHub's 2 GiB a video goes up
  as `.part001`, `.part002`, ...). After a disconnect set `COMMIT` to the printed sha and Run all: finished chunks come back from Drive.
- The release repo is public, so a release is world-readable; `DRAFT_RELEASE = True` (advanced parameters) makes a draft, which the
  fetch script then needs `GH_TOKEN` in the environment to find.
```
tools/fetch_colab_render.sh mv-render-<sha7> [--list]      # -> output/colab/ (rejoins parts, checks sha256 against render_log.json)
python3 tools/assemble.py --video output/colab/video_<sha7>.mp4   # mux music/build/master.wav, encode the deliverables
```

## Data (`src/data.js`, loaded before the first frame; all helpers are pure functions of t)
Sources: `data/timeline.json` (`analysis/analyze.py`, blind analysis of the master) or else
`data/timeline.placeholder.json` (`analysis/make_placeholder_timeline.py`); `../music/build/arrangement.json`
(exact sections, fx cues, silence), `events.json` (story events), `vocals.json` + `vocal_timing.json` (lyrics:
EN + 中文, speaker, style, line/syllable/word times). `window.mvInfo()` lists what was found.
- `section(t)` → `{id, name, start, end, i}`, `sectionP(t)`, `sectionById('S04')`
- `beat(t)` (beat time, follows the analysed beats pinned to the score grid), `bar(t)`, `barN(t)`, `beatInBar(t)`,
  `tAt(bar, beat)` (docs notation → s). Constant-grid helpers from core (`bpOf`, `beatN`, `pulse`) still work.
- `events(name)` → `[{t, ...}]`: typing, typing_outro, heartbeat, retry, regenerate, lever, jackpot, notification,
  phone, glitch, silence (`{t, end}`), and any arrangement fx type (impact, riser, rewind, tape_stop, …).
  `eventsIn`, `lastEvent`, `nextEvent`, `since`, `until`, `evPulse(name, t, decay)`, `evCount`, `inSilence(t)`.
- `env(name, t)` (rms low mid high kick snare bass vox_you vox_ai heart), `onsets(name)`, `onsetPulse`.
- `LYRICS` lines `{id, speaker, style, ai, text, zh, start, end, syllables[{text,start,end}], words}`;
  `lyricLine(t)`, `lyricsAt(t)`, `lyricById(id)`, `sylIndex(line, t)`, `vox('you'|'ai', t)` (mouth flaps).
  Any style starting with `ai` (`ai_him` = the AI singing in his voice) is the AI.

## Shots
```js
// src/scenes/s04_chorus1.js, added to studio.html after the character scripts
(() => {
  function ward(v) { /* static set: fills, washes, ink; called once per boil variant */ }
  function chorus(t, lt, dur) {
    camBegin(960 + 30 * Math.sin(lt * .4), 540, 1.05);
    cachedLayer('ward_day', 3, ward);            // painted once per variant, then one image per frame
    him(…); ai(…);                                // the characters (src/chars)
    camEnd();
  }
  shots([[section('S04').start, chorus, { lyricMode: 'karaoke' }]]);
})();
```
Third element (or `fn.lyricMode` / `fn.lyricStyle`): `lyricMode` `'karaoke'` (default) | `'subtitle-only'`
(中文 only, the EN is in the picture) | `'hidden'` | `(t, lt) => mode`; `lyricStyle(line, t)` →
`{font: 'human'|'ai', color, zhColor, label, cursor, align: 'center', band, outline}` (e.g. the final-chorus swap).
Loops (model sheets) default to hidden.

## Lyrics overlay (`src/lyrics.js`, style guide §2/§5)
Drawn on the 2D compositor after the painted frame and before the paper grain. EN 46 px at 0.865H, 中文 36 px at
0.925H, 8 % margins; YOU (him) = Cormorant Garamond Italic + Noto Serif TC in `HUMAN_SKIN`, ±0.5 px jitter, fades
in 0.12 s from 0.25 s early; AI = JetBrains Mono (+2 % tracking) + Noto Sans TC in `AI_CYAN`/`AI_WHITE`, instant,
block cursor that blinks once the line is done. Karaoke: unsung syllables 40 %, up to 100 % in 0.06 s with a glow;
out 0.35 s after the line; an older overlapping line moves up 46 px and fades; label `you` / `assistant` /
`you + assistant`; bottom-22 % VOID band. On paper the light colours get a thin ink outline (`LYRIC_CFG.outline`).
Fonts: subset woff2 in `assets/fonts` (`tools/build_fonts.py`, OFL), loaded with FontFace, no network;
`fontCSS(role, size)` gives the CSS font for `letter(..., {font})`.

## Caching: `cachedLayer(key, variants = 3, drawFn, {w, h, x, y, paper})`
A watercolour `fill:` costs seconds per call on this CPU. `cachedLayer` paints a **static** layer once per boil
variant (`BOILN % variants`, so 3 drawings cycled at 12/s) and keeps it as a framebuffer; every later frame draws
one image (under the current camera). The variant's content depends only on `(key, v)`, so frames stay pure: put
anything that changes into the key. Bigger-than-frame layers (`w`, `h`) are painted in frame-sized tiles for pans.
The layer is painted on the main canvas and copied out, because p5.brush fills drawn into a `p5.Framebuffer` come
out different every time. LRU of 24 layers per page (~8 MB each). `?nocache` / `--nocache` paints every frame.
Measured (test shot: 5-fill room + live wash/glow + lyrics, 1080p, SwiftShader, box shared with two other renders):
**15.3 s/frame uncached → 1.7 s/frame cached (median)**; each variant costs ~20 s once per worker.

## Review loop
Sheets for the shape of a shot, strips for motion and boil (pairs of frames share a drawing; a cached layer
cycles 3 drawings), crops for faces and lyrics, then `check_determinism.mjs` over the shot's times before a
`--video` run. Chrome is launched with `--disable-features=CanvasNoise,CanvasInterventions` and
`--disable-accelerated-2d-canvas`: without them the same t gave ±1-level differences between worker processes.
