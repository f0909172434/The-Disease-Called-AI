# ai.js — "her", the AI (whale-maid girl): status

Sheets:
- `output/sheets/char_ai_design.jpg`: the views, 8 expressions, and the palettes with a glitch sample.
- `output/sheets/char_ai_vs_ref.jpg`: review only. Reference and painted versions side by side, chibi and full at the same scale, plus both faces.
- `output/sheets/char_ai_face.jpg`: an older 2× face of the procedural full head (predates the lock-built hair).

To rebuild the sheet: `cd film && node render.mjs --soft-gl --loop=ai_sheet --sheet=1 --cols=1 --w=1920 --out=out/ai_sheet.jpg`.

To rebuild the comparison: render the loops `ai_cmp_chibi`, `ai_cmp_full` and `ai_cmp_fullface` at `--sheet=0.4 --w=1920` to `out/<loop>.jpg`, then run `python3 src/chars/ai_vs_ref.py`.

## One head for every view
The hair and the face are no longer measured silhouettes. One head is shared by every form and view: the chibi (front, q), the full form (front, q, side) and the curtsy pose.
- **Head units**: the cranium is a unit sphere at the head centre (x right, y down, z toward the viewer). A view is a yaw (`AI_YAW`: front 0, q .42, side π/2). Locks, features and fins are 3D points turned by the yaw (`hd.pj`), so a turned view is the same design, not a remap.
- **Placement**: each form maps head units onto its body with `H(a, b)`. `Hh` is the same mapping for hanging hair, where the head's tilt fades out down the locks (`aiHangW`), so long hair hangs instead of swinging with the head.
  - Chibi: cranium 2.545u, centre 7.19u up, fitted to the measured eyes, chin and crown of the chibi reference.
  - Curtsy: centre, size and the drawn tilt (−.34) fitted to the measured eyes and mouth of the full reference.
  - Full front/q/side: `AI_FORM.full`.
- **Passes**: `aiHairBack` paints before the body. `aiHeadFront` paints after it.
  - `aiHairBack`: a dark mass for the gaps between locks (lighter lower down), then the back locks, back to front. Locks hidden behind the body in front views are skipped.
  - `aiHeadFront`: the far fin (turned views), the skull's hair (`aiCap`), the face, the near back locks, the bangs, then the `hd.onBand` hook (the headdress), the fuller side locks, the fins, the slim cheek locks, the shine band, flyaways, and brows (only when she acts).

### Hair from locks
- **A lock** (`aiLock`): a tapered, pointed ribbon along a spine.
  - It gets 2–3 washes, navy at the root and lighter toward the tip by depth (the dip-dye). Each later wash starts in a pointed tongue, so the gradient has no seam.
  - It is inked down both sides but never across the root, so it grows out of the hair above it. The edge toward the silhouette gets the heavier line.
- **Hanging locks** (`aiHang`, `aiLocks`): `nb` back locks per side, at azimuths from her side round to the back, plus three face-framing locks per side.
  - Their spines follow the hair's width profile `AI_HAIR[form].R` (it hugs the skull, then flares below the ears).
  - They wave in and out along sinusoids. Neighbours have nearby phases, so the mass waves together.
  - Tips hook outward. Lengths, widths and spreads vary per lock.
  - `sweepL` / `sweepR` / `lenL` / `lenR` drift and lengthen one side; the curtsy uses them for the hair flowing to the screen-left.
- **Bangs** (`AI_BANGS`): eleven pointed locks with an outward bow and a slight S-curve, laid over the sphere of the head:
  - two side-swept locks per side, whose inner edges frame the forehead windows;
  - a central cluster, with the longest lock falling between the eyes;
  - `AI_STRANDS`: thin strands that cross the gaps.

  Each bang is washed and inked in turn. Then the whole fringe gets one root-shade glaze and one tip glaze.
- **Shine and flyaways**: `AI_SHINE` is a broken band of light strokes across the crown (one big piece). `aiFlyaways` adds a few stray hairs.
- **The face** (`aiFace`): a real face shape from `AI_FACE[form].fw`, its cross-section down the face, so the jaw swings toward the far side in q.
  - The cheek and chin are outlined, with a soft shadow down the far cheek.
  - The bangs cast a soft shadow, clipped to the face (`aiBangShadow`).
  - The reference eyes (`aiEyeR`) and mouth (`aiMouthR`) are used in every form. Their size and foreshortening come from the yaw. The profile uses `AI_PROFILE`.
- **Measured pieces kept**: the chibi's fins, frill, band, bow and ahoge, and the curtsy's fins, band, bow and ahoge. These go through the same mapping. In q they sit near the ear plane.

## Reference fidelity
- **Chibi** (`AI_RC`): the body, fins, headdress, ahoge, tail and mouth are measured on `ai_character_reference.webp`. The silhouettes come from colour segmentation simplified with RDP, and the landmarks come from a pixel grid. The hair and the face use the shared head (above).
- **Full**: `pose: 'curtsy'` (`AI_RF` / `AI_RFP`) uses the measured apron, tail, hands and shoes from `ai_character_reference_full.png`, plus landmarks read off a grid for the rest.
  - The lifted overskirt (`skirtL`, `hemL`, `grip`, `gather`) is gathered in her fist. Its hem curves up to the left, and fold valleys and ridges fan out from the grip.
  - The dark lining and two tiers of petticoat ruffles show under it.
  - The front opening shows the pinstriped underskirt, with gold edging, bows and hem embroidery. The right half hangs straight.
  - The upper sleeves are puffed (gathered at the shoulder and the elbow, with creases).
- **Palette**: sampled with k-means per region.
- Frames are painted only with p5.brush (`paint` / `inkLine` / `glow`). The bitmaps are only measured; they are never drawn into a frame.

## API
`ai(x, y, u, o)`: (x, y) is the ground point between her feet. She hovers `float` u above it (default .25, plus a bob) and is 10u tall.
- `form`: `chibi` or `full`. `view`: `front` / `q` / `side` (side is full only). `pose: 'curtsy'` is full only. `flip` mirrors.
- `pal`: `default` / `glow` / `amber`. `pal2` + `palK` cross-fade between them.
- Face: `eyes` (normal, wide, soft, sad, heart, blank, perfect, happy, closed), `mouth` (smile, cat, open, A, I, U, E, O, frown, wobble, flat, perfect), `lookX/Y`, `blink`, `lid`, `brow`, `blush`, `tilt`.
- Body: `fin`, `flap`, `ahoge`, `tail`/`tailK`, `hairLag` (sways the hanging locks), plus arm options `aL/aR/eL/eR/hand*`. On the chibi, `eL/eR` < ~1.8 lowers the fists.
- Effects: `glitch` 0..1, `clip`, `emote`, `wcFill` (accepted, no effect: see Watercolour).
- Emotion helpers: `AI_EMO` (smile, gentle, eager, worried, heart, blank, sad, perfect), `aiFeel`, `aiEmotions`, `aiTalk`.
- Loops: `ai_sheet`, `ai_emotions` (6 s), `ai_faces`, `ai_cmp_*`.

## Watercolour
`aiWC()` builds each body shape from five layers:
1. a flat wash;
2. a shrunken, offset darker glaze (pooling);
3. a pale lift;
4. a wet-edge ring in the `marker` brush;
5. ink.

Granulation is sparse `charcoal` hatch, used on the skirt shadow and one curtsy fold only. The hair is layered washes with tongues, plus glazes over the fringe.

No real `fill:` is used. `aiPaint` never passed `fill` through, so the "one real fill per figure" of earlier versions drew nothing; that dead call has been removed.

## Cost per figure
**What it costs**: p5.brush runs a blend pass every time the paint colour (or wash ↔ stroke) changes, and the frame time follows the number of those changes much more than the number of shapes. So the hair keeps each lock to about four colours. The fringe's glazes, the strands and the curtsy's folds are painted one colour group at a time.

Blend counts:

| Figure | Old version | Now |
|---|---|---|
| Chibi | 262 | ~330 |
| Curtsy | 327 | ~375 |
| Full front | 464 | ~380 |

Measured on CPU SwiftShader, with another agent rendering at the same time (load 5–9 on 4 cores). Times are medians over 7 frames.

| Figure | Old version | Now |
|---|---|---|
| Chibi, u = 60 | 350–440 ms | 450–640 ms |
| Curtsy, u = 95 | 500–550 ms | 590–750 ms |
| Full front, u = 95 | 420–680 ms | 440–570 ms |
| Full side, u = 95 | 230–380 ms | 380–560 ms |

## Known weaknesses / TODO
- At small sizes (u < 30) the chibi's wavy locks read as a ribbed texture. A cheaper lock style for thumbnails would help, and save time.
- **Curtsy is a single fixed pose.** The head, arms and fins act, but the body does not re-pose. Its petticoat is two scalloped tiers; the reference has softer ruffles.
- **Procedural full front/q/side** share the head and the palette, but the body is not measured. In profile the hair falls as a plain curtain.
- **Chibi 3/4**: the body is a remap of the front view. The far fin only peeks out behind the skull.
- **No back views** (the head model could do one: yaw π).
