# Heroine rig — status (session handoff)

**State: foundation only. No character art drawn yet.** `Heroine.js` was not created. Nothing imports this folder, so the engine is unaffected.

## Files (all pass `node --check`)
- `geom.js`: splines through control points `[x,y,flag(1=corner),tension]` (`splineSegs/splinePath/sampleSpline`), `taperPath` (variable-width ink drawn as a filled outline), `ribbon` (hair clump or lock from a spine plus a width profile), `profileFn/brush` width profiles, `xf/mixPts/blendPts/mirrorX` (transform, blend, mirror), `boilPts` (seeded jitter), `vnoise/sway` (deterministic noise).
- `draw.js`: `Pen(ctx,{pal,boil,boilSeed,painterly,lineScale})`. Methods: `curve`, `fill`, `wash` (fill plus watercolour edge pooling), `line` (tapered ink), `ribbon`, `clip`, `linear/radial`, `blob`. Boil jitters control points only; dense polylines inherit it.
- `palettes.js`: `HUMAN / SWAPPED / PERFECTED`, each with `look` defaults (boil, painterly, lineScale, underEye, symmetric, glowIris). Swapped and perfected set boil=0 and painterly=0. Also `mix`, `rgba`, `desat`, `drained` (desaturate).
- Preview: `node tools/heroine_capture.mjs [--out f.jpg] [--query ...]` captures `tools/heroine_preview.html`. It reuses `tools/harness.mjs` (SwiftShader Chromium). It currently renders palettes plus primitives with boil and painterly on/off into `output/sheets/heroine_design.jpg`.

## Planned design (not implemented)
- Each view module (`views/*.js`) exports a reference size (1000 units square for busts) and layer draw functions. Stack: back props → backHair → farLimbs → body → face → features (eyes/brows/mouth) → frontHair → overHair (brows seen through bangs) → nearLimbs.
- Each layer has its own canvas and bounding rect, and is redrawn only when its quantized param key changes.
- Boil: cache 3 variants of the static layers and cycle them by `floor(t*12)%3`. Dynamic layers (features, swaying hair) redraw every frame.
- Painterly: per-shape `wash` pooling, plus a per-layer paper-grain and granulation multiply (a cached pattern masked by the layer's alpha).
- Rim light and screen wash: computed in a Three layer shader from alpha taps toward the light, so changing side, colour or intensity costs nothing. Canvas compose is used only for sheets and particles.
- Params: blink, gaze{x,y}, mouth{open, vowel A/I/U/E/O}, expression weights (tired/smile/anxious/sad/blank/cry/closed/wide), tears, cheekPuff, drain, headTilt (head-layer rotation), breath (layer offsets), hairSway/hairFloat (displaced clump spines), glitch/scanline uniforms.
- `sampleParticles(N)`: seeded CDF sampling of the composed alpha.
- "Take": a pure function `expressionTake(from,to,t,t0)` that blinks, squashes, then pops into the new expression with easeOutBack.
- Poses (storyboard v2): desk, profile, front, bed_top, knees, curl (hands go in nearLimbs, above frontHair), reach, eye.

## Remaining
Everything visual: all views, eyes and mouths, hair, the rig and layer cache, `Heroine.js` (Three planes plus shader), particles, the design sheet. Per-frame cost has not been measured. Budget target ≤ 60 ms; hair sway can step at 12 fps.

## Recast (male human + female "whale maid" AI)
- Reusable as is: geom, Pen, boil, painterly, the palette-mode mechanism, the layer, rig and particle plan, and the expression and take system.
- Planned face, eye, mouth and hair systems are style-generic. The AI girl's wavy hair and gradient tips fit `ribbon` clumps.
- Specific to the old heroine: the palette contents (hoodie, wristband, cursor hairpin, amber eyes) and the view list. A male rig needs new face proportions.
