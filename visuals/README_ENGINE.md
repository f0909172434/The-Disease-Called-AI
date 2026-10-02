# 病名為AI — visual engine

Deterministic Three.js (r170, vendored in `vendor/`, no network at render time) music-video engine.
`index.html` exposes `window.__mv = { ready, renderFrame(t), captureFrame(t, q), duration, fps }`.
The same `t` always gives the same image, in any render order and in any process.

## Preview
Serve `visuals/` with any static server (e.g. `npx http-server visuals -p 8080`) and open:
- `index.html?t=6.6` one frame · `?play=1` real-time preview (Space, arrows, Home; `&audio=path.wav`)
- `?gallery=1&t=2.2` kit gallery (12 tiles) · `&tile=6` one tile full-frame · `?hud=1` debug HUD
- `?w=960&h=540` size · `?fps=30` · `?timeline=data/x.json` (default: `data/timeline.json`, else
  `data/timeline.placeholder.json` from `analysis/make_placeholder_timeline.py`)

## Render / check (from the repo root)
```
node visuals/render.mjs --fps 30 --from 0 --to 215 --out output/video_noaudio.mp4 --workers 2 [--scale 1]
node visuals/render.mjs --from 4 --bench 60                 # s/frame without encoding
node visuals/contact_sheet.mjs --times 0.35,2.3,5.62,6.4 --cols 4 --tile 640 --out output/sheets/S00.jpg
node visuals/contact_sheet.mjs --times 2.2,6.6 --cols 1 --tile 1920 --query gallery=1 --out output/sheets/kit_gallery.jpg
node visuals/tools/check_determinism.mjs [--times a,b,c] [--query gallery=1]   # exits 1 on any pixel diff
```
Render chunks live in `<out>.chunks/` and are resumable (re-run skips finished chunks; `--clean` removes them).
Chromium: playwright-core with `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (SwiftShader). Never `playwright install`.

## Scene API (`src/scenes/*.js`, registered in `src/scenes/index.js`)
A scene is `{ id, init(ctx), update(t, ctx), render?(ctx), lyricMode, lyricStyle?(line,t), transitionIn, post?, hud?, clearColor? }`.
Start/end come from the timeline sections; the director overlaps scenes for composite transitions
(`zoomThrough`, `crossfade`) and applies post transitions (`cut`, `whiteFlash`, `blackFlash`, `dipToBlack`, `glitchCut`).
`S00_intro.js` is the reference scene; `placeholder.js` (`makePlaceholder`) is used for S01–S13.
`ctx` gives: `THREE, renderer, W, H, u (=H/1080), audio, text, post (ctx.post.p = this frame's post params,
reset to the section preset before update), lyrics, kit, ease, cam, palette/C/col/rgba, rng/hash01/noise1/fbm1,
makeRT, renderScene, renderToTarget`.
**S00 currently uses the particle `Silhouette`; during integration it will be switched to the new 2D anime
character rigs (`kit/Heroine.js` etc., built by the character engineer).**

## Kit API (`src/kit/`, exported from `src/kit/index.js`; each file header documents all states)
Every component is a THREE.Object3D: `new X(ctx, opts)`, then call `x.update(t, states)` EVERY frame.
States you do not pass are reset to defaults (no carry-over). Main ones:
- `Ring(ctx,{radius})` pulse, speak, colorMix, breakSegments, thumbsMode, brightness · `irisText(str)` · `samplePoints(n)`
- `Silhouette(ctx)` warmth, innerGlow, jitter, gridify, dissolve, morph, colorSwap, mouthOpen, eyeClosed, screenLight… · `dissolveTo(xyz)` · `eyeWorldPosition()` (fallback character)
- `Eye(ctx)` pupil, lidOpen, reflection, reveal · `setReflection(tex)`
- `ChatUI(ctx,{width,height,planeHeight,theme,depth})` · `setScript({header,messages,input,regenerate})` · `update(t,{opacity,brightness})`. `depth` (px) turns bubbles/input/panel into glass slabs.
- `GlassSlab(ctx,{color})` width, height, radius([tl,tr,br,bl]), thickness, bevel, body, edge, sheen, clip, opacity — thick glass with bevel highlights, edge-lit sides
- `TypingDots(ctx,{radius,spacing,slab})` phase, glow, freeze, vanish[3], fog, slabOpacity
- `TypedText(ctx,events,style)` · `ScreenCursor` · `BubbleOutline(ctx,{w,h,r,tail,depth})` + `updateGlass(t)` · `KineticText` (slam/type/decode/glitch/split/drop/pulse)
- `Room` · `CityWindows` · `HUD(ctx,{layout})` (bpm,temp,dosage,clock,session,ECG on kicks) · `GlowLines`
- `DustParticles` · `FeverStream` · `TokenConfetti` · `NotificationSnow`

## Conventions
- Determinism: everything is a pure function of `t`. No `Math.random`, `Date`, `performance.now`, rAF
  timing (only `preview.js` reads clocks). Use `core/rng.js` (seeded) and closed-form motion.
- Pose the camera FIRST in `update` (DOF / screen-space sizes read it). Pass all animated states every frame.
- Canvas caches: the cache key must contain exactly the values drawn (quantize both, or key on exact `t`).
- GLSL: no implicit-derivative texture sampling inside non-uniform branches (use `textureLod/textureGrad`).
- Onset sync via `ctx.audio`: `pulse('kick',t,decay)`, `since/until/nextOnset`, `onsetsIn`, `events('typing')`,
  `beat(t)`, `bar(t)`, `time(bar, beat)` (docs notation), `section(t)`, `env('vox_ai',t)`.
- `lyricMode`: `karaoke` | `subtitle-only` | `hidden` (style guide §5). Colors only from `core/palette.js` (`C`, `col`, `POST_PRESETS`).
- Black level: bloom = tight mip falloff + toe (`bloomToe`), so dark areas stay at VOID; keep big dark areas.
- Perf (SwiftShader): avoid InstancedBufferGeometry (use `core/geom.js expandInstanced`), Float32 RTs, hide
  invisible objects (`visible=false`), no MSAA, keep point counts ≲150k; target ≤0.6 s/frame.
