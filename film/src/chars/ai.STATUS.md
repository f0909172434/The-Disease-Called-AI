# ai.js — "her", the AI (whale-maid girl): status

Sheets:
- `output/sheets/char_ai_design.jpg`: the views, 8 expressions, and the palettes with a glitch sample.
- `output/sheets/char_ai_vs_ref.jpg`: review only. Reference and painted versions side by side, chibi and full at the same scale, plus both faces.
- `output/sheets/char_ai_face.jpg`: an older 2× face of the procedural full head.

To rebuild the sheet: `cd film && node render.mjs --soft-gl --loop=ai_sheet --sheet=1 --cols=1 --w=1920 --out=out/ai_sheet.jpg`.

To rebuild the comparison: render the loops `ai_cmp_chibi`, `ai_cmp_full` and `ai_cmp_fullface` at `--sheet=0.4 --w=1920` to `out/<loop>.jpg`, then run `python3 src/chars/ai_vs_ref.py`.

## Reference fidelity
- **Chibi** (`AI_RC`): its control points are measured on `ai_character_reference.webp`:
  - The silhouettes came from colour segmentation (PIL/scipy) and were simplified with RDP: hair mass with its negative spaces, the light-blue tip regions and dark lock gaps, face/bangs skin, frill, apron, bib, bow tie, hands, shoes, whale and ahoge.
  - Landmarks were read off a pixel grid: eyes, blush, cuffs, gold buttons, skirt bows, sprigs, bow, fins, tail root, and the lock and bang lines.
- **Full**: `pose: 'curtsy'` (`AI_RF` / `AI_RFP`) uses the measured face, apron, tail, hands, shoes and hair outline from `ai_character_reference_full.png`, plus grid-read landmarks for the dress, the pinstriped panel, the petticoat, the arms, the ribbons, the embroidery and the head pieces. This pose is the sheet's main full view.
- **Palette**: sampled with k-means per region. The hair is slightly brighter than the reference.
- Frames are painted only with p5.brush (`paint` / `inkLine` / `glow`). The bitmap is only measured; it is never drawn into a frame.

## API
`ai(x, y, u, o)`: (x, y) is the ground point between her feet. She hovers `float` u above it (default .25, plus a bob) and is 10u tall.
- `form`: `chibi` or `full`. `view`: `front` / `q` / `side` (side is full only). `pose: 'curtsy'` is full only. `flip` mirrors.
- `pal`: `default` / `glow` / `amber`. `pal2` + `palK` cross-fade between them.
- Face: `eyes` (normal, wide, soft, sad, heart, blank, perfect, happy, closed), `mouth` (smile, cat, open, A, I, U, E, O, frown, wobble, flat, perfect), `lookX/Y`, `blink`, `lid`, `brow`, `blush`, `tilt`.
- Body: `fin`, `flap`, `ahoge`, `tail`/`tailK`, `hairLag`, plus arm options `aL/aR/eL/eR/hand*`. On the chibi, `eL/eR` < ~1.8 lowers the fists.
- Effects: `glitch` 0..1, `clip`, `emote`, `wcFill: false` (skips the real watercolour fills).
- Emotion helpers: `AI_EMO` (smile, gentle, eager, worried, heart, blank, sad, perfect), `aiFeel`, `aiEmotions`, `aiTalk`.
- Loops: `ai_sheet`, `ai_emotions` (6 s), `ai_faces`, `ai_face`, `ai_glitch`, `ai_cmp_*`.

## Watercolour
`aiWC()` builds each shape from:
1. a flat wash;
2. a shrunken, offset darker glaze (pooling);
3. a pale lift;
4. a wet-edge ring in the `marker` brush;
5. ink.

Granulation is sparse `charcoal` hatch, used on the dark hair gaps and the skirt shadow only. Lock-shaped tongues soften the hair gradient seam.

A real `fill:` costs about 100–130 ms per shape at character scale. It is used once per figure, only at u > 30: on the hair-gradient band, and on the dress shadow in the curtsy pose.

## Cost per figure
Measured on CPU SwiftShader, with another agent rendering at the same time. The first frame of each run is about 2× slower.
- Chibi, u = 60: 230–420 ms.
- Curtsy, u = 95: 350–550 ms.
- Procedural full front, u = 95: 330–480 ms.

## Known weaknesses / TODO
- **Curtsy is a single fixed pose.** The head, arms and fins act, but the body does not re-pose.
  - Its face at close-up size is weaker than the chibi's: the measured skin shape is small, so use the chibi for face close-ups.
  - Its petticoat is a simple scalloped band; the reference has soft layered ruffles.
- **Procedural full front/q/side** share the palette, panel and ribbons, but not the measured shapes. The side view is the weakest.
- **Chibi 3/4** is a remap of the front view: features shift, but the far fin is reduced.
- **No back views.**
