# him.js — status

"Him", the human lead: an original young AI engineer (late 20s). Painted only through `paint()` / `inkLine()` (flat
`wash` + tapered ink, sparse `hatch` on jacket/shirt shadows, `glow()` for light). No watercolour `fill` on the
character. Global-script style; every global is prefixed `him` / `HIM_`.

v7 (round 7, user direction change: SLIM build; the muscular v3–v6 build and its photo reference are retired):
- proportions: a lean young engineer, ~7 heads with the hair (~7.8 to the skull): `HIM_HS` .92 (was 1.24), longer legs
  (thigh 7.45u + shin 7.25u), the hair's top volume pressed down to about half (`HIM_HAIRK` in `himHead`, only above
  the hairline — the face, glasses, bangs and their locks are unchanged). Standing ≈ 31.5u (soles to hair top).
- torso: shapes are still authored in the old wide frame; `himBreath` now scales x about a centre line by a
  height-dependent factor (`HIM_SLIM`: average shoulders, a lean chest, a gently suppressed waist, slim hips) instead
  of the old `HIM_BUILD` widening. Slender neck (`HIM_NECKW`, ~1.9u wide), the head sitting on it (`HIM_NECKDN`), a
  low trapezius (`HIM_TRAP` .1). Shoulders ≈ 8u across the sleeve heads.
- blazer fits a little loose: no chest / pec shading, no X of stress folds, no strain lines — one soft pull from the
  button, long gentle drape folds at the sides and below the button; the home shirt hangs loose with soft drape folds.
- arms: lean (`HIM_ARM` is a gentle, nearly straight taper; jacket sleeve ≈ 1.9u wide), hanging close to the body;
  soft folds (sleeve-head seam, drape from the armpit, bunching inside the elbow); in front / 3/4 the outer contour runs
  over the sleeve head so it continues the shoulder line (`cap`). The 3/4 far arm is still drawn over the far side of
  the torso and under the chest / lapel / collar (one shoulder form), with a soft inner contour.
- legs: slim straight trousers (`HIM_LEG`), hem breaking on the shoe; contrapposto kept (subtle hip tilt).
- hands: the v5 articulated hands at a normal size (`himHand` scale 1.55, was 1.72); dress shoes a touch narrower.
- kept from earlier rounds: the original anime face, thin rectangular glasses, short black hair with bangs, royal-blue
  blazer over a white open-collar shirt (no tie), leather shoes, wristband, contrapposto, separated fingers, the
  watercolour treatment and all views / poses / expressions / palettes.

History (superseded where v7 differs): v6 masculine hips / shorter neck / one-form 3/4 shoulder; v5 trouser legs from
profile tables with IK and a hem break, contrapposto, articulated relaxed hand, leather dress shoes; v4 tapering arms
from profile tables, neck/traps, lapels; v3 palette, hair, glasses and outfit from a user photo (its muscular build and
the photo comparison sheet are retired in v7):
- palette: blazer #2B48A3 / #1C3486 / #0F2160, shirt #F6F5F2 with cool #C9CEDD shadows, hair #22212D / #14141C,
  skin #F2C8B0 / #D99E88; leather shoes #2E211C / #17100D with a #7E625A shine
- watercolour (`wc` option of the kit's shape()): each big mass gets a second translucent wash offset and shrunk (soft
  wet edge), a pigment-pooling ring inside its edge, a lighter bloom on base washes, fine-pencil granulation in shadow
  masses, blazer blue bleeding onto the shirt along the lapels, and (`HIM_WCFILL`, on by default) a real p5.brush
  watercolour `fill` on one interior blazer mass (≈ +100 ms per figure).

Detail pass (v2, after review "detail too low"): anime-illustration detail at bust/desk scale, with levels of detail
so small figures stay cheap (`K.det` from ~13 px per head-unit, `K.det2` from ~26 px):
- eyes: tapered heavy upper lash with wing + two lash flicks, double-eyelid crease, lower lash hints, inner corner;
  iris in three washes (dark top, mid, light bottom crescent) + pupil + two highlights + rim line; lid shadow on the white
- face: brows as tapered strokes with hair strokes, nose-bridge/side shadow + cast shadow + nostril, mouth line with
  lower-lip shadow and philtrum, hatched bang shadow on the forehead, jaw underside, soft cheek warmth, ear helix /
  antihelix / concha / lobe
- glasses: top rim with a highlight edge, nose pads, lens glare streak, faint frame shadow on the cheek
- hair: dark base → mid mass → ~26–30 clumps radiating from the crown (tone variation + strand lines), bangs with thin
  sub-strands and highlight streaks, angel ring (glossy band + fine strokes), flyaways
- clothes: lapel lit edge + pick-stitching, buttons with highlight/holes, pocket flaps with shadow, breast welt,
  armpit/shoulder/elbow/cuff folds, lit edges on panels and sleeves, collar shadow + shirt wrinkles, hatched trouser
  shadow + pressed crease highlight, shoe highlights, a 13-bar barcode with a name stripe on the band
- hands: profile silhouettes get a fingernail and knuckle creases; open/press hands get nails per finger
- line hierarchy: silhouettes/contours in 'ink', every thin inner stroke automatically in 'inkfine'; light HB hatch in
  shadows (jacket, shirt, trousers, forehead)

Model sheet: `output/sheets/char_him_design.jpg` (main panel: standing front and 3/4; then the face at 2×, expressions,
palettes, small side/home/reach/desk figures).
Old model sheet (render: `node render.mjs --soft-gl --loop=him_sheet --sheet=0 --cols=1 --w=1920 --out=out/him_sheet.jpg`).

## API

```js
him(x, y, u, o)                // draws one frame of him; pure function of T (boil seeds per part)
himFeel(name, t, over)         // one emotion, alive (face fields + beat-locked idle body motion)
himEmotions(t, keys, o)        // acted changes: [[t0,'focused'],[t1,'smile',{lookX:.5}],...]; o.take scales takes
himDeskProps(x, y, u, {part})  // desk/monitor ('back', call before him) and keyboard ('front', after); same anchor as desk
himPal(name)                   // 'human' | 'drained' | 'swapped' colour sets
HIM_EMO, HIM_LAST              // emotion table; after a desk draw HIM_LAST.handL/handR = keyboard contact points (screen px)
```

**Size (v7, slim):** standing ≈ 31.5u (soles to hair top), ~7 heads; head 4.4u drawn ×.92 (`HIM_HS`); shoulders ≈ 8u
across the sleeve heads; hips ≈ 15.6u above the soles. Standing poses use contrapposto (`contra: 0` for a symmetric
stance). Medium shot u ≈ 18–24, full figure in frame u ≈ 29–32, close-up: `pose: 'bust'` with u ≈ 45–90 (`cut`: how far
below the collarbones the bust ends, default 4.95u; ~1.1 for a head-and-collar close-up).

**Anchors:** `stand` = ground point between the feet · `bust` = notch between the collarbones (everything ~4.9u below
is cut away with a painted wavy edge) · `desk` = floor point under the front edge of the chair seat (seat top −7.2u,
hips (−1.6, −8.5)u, keyboard top ≈ (7.8, −11.2)u).

**Options:** `view` front|q|side (side/q face screen right; `flip` mirrors), `pose` stand|bust|desk,
`outfit` launch|home, `pal` human|drained|swapped,
face: `eye` (normal|happy|squeeze), `lid`, `low`, `browIn` (+ frown / − worried), `browOut`, `browY`, `irisK`, `dull`,
`mouth` (closed|A|I|U|E|O|smile|grin|frown|flat|tight|gasp|laugh|wail), `blush`, `circles`, `gloom`, `glare` (cyan on
the lenses), `tears`, `sweat`, `lookX/lookY`, `blink` (auto from T when omitted), `squint`, `seed` (blink phase),
body: `dx/dy` (u), `sq`, `lean`, `tilt`, `nod`, `breath`, `contra` (0..1 weight shift, default 1), `aL/aR` (his left/right arm swing), `handL/handR`
(relax|type|fist|open|press), `reach` 0..1 (raises his right arm, opens the hand), `screen` (monitor rim light),
desk: `type` (finger tapping), `chair: false`; `boilKey` (stable id when characters come and go).

The hospital wristband is always on his LEFT wrist (front: screen right; q/side facing right: far arm; flipped: near arm).
In the standing profile the far arm is hidden behind the body unless `aL` swings it out.

## Emotions (`HIM_EMO`)
focused, smile, tired (heavy lids, dark circles, head droop), anxious (worried brows, small irises, sweat, darting
eyes), panic (tiny irises, gasp, gloom, shake), blank (dull eyes, cyan screen glare on the glasses, nearly still,
no blinks), cry (tears, wail, sobbing on the beat), laugh (^ ^ eyes, bounce), plus neutral. `himEmotions` adds the
squint-swap, anticipation dip, a take (squash + hop, scaled for a human) and backOut settle, like clawd's `emotions()`.
Loops: `LOOPS.him_sheet` (model sheet), `LOOPS.him_emotions` (6 s, all emotions acted), `LOOPS.him_hands`,
`LOOPS.him_perf`, `LOOPS.him_perf_desk` (timing), `LOOPS.him_test`.

## Views / poses
| pose | front | q (3/4) | side | notes |
|---|---|---|---|---|
| stand | done | done | done | launch + home outfits; `reach` option (best in side/q) |
| bust | done | done | done | close-ups / expressions |
| desk | — | — | done | profile, typing, chair + `himDeskProps` |
| bed (lying, phone above face) | TODO | | | |
| knees (sitting hugging knees) | TODO | | | |
| curl (panic, curled on the floor) | TODO | | | |
| reach (hand to glass) | partial | partial | partial | `reach` raises the arm; no dedicated foreshortened hand-to-camera drawing |
| back / qback views | TODO | | | |

## Cost
v7: cheaper than v4 — same box, same load (avg ≈ 8.6), `--bench` standing front u = 30: 2.87 s/frame (v7) vs 3.32 s
(v4), an empty frame ≈ 0.77 s at that load.
v5/v6: A/B against v4 on the same (heavily loaded) box with `--bench`: standing front u = 30 2.32 s/frame (v5), 2.07 s
(v6) vs 2.30 s (v4), with an empty frame costing 0.67–0.73 s at that load — i.e. the new hands, legs, shoes, neck and
shoulder are cost-neutral; the v4 figures below (measured at normal load) still apply.
v4, measured on this CPU-only box (SwiftShader, load avg ≈ 4–5), excluding the first warm-up frame: standing front
u = 30 ≈ 460–660 ms/frame (incl. the real fill), 3/4 ≈ 250–520, bust u = 62 ≈ 220–345, desk u = 40 with chair and props
≈ 200–345. All under the 800 ms budget. `--stills` at u = 55 reports ~10 s (page warm-up + PNG encoding, not drawing).
Timing loops: `him_perf` (3/4), `him_perf_front`, `him_perf_fill` (front without the fill), `him_perf_bust`,
`him_perf_desk`; `him_prof` toggles `HIM_PROF.nohatch` / `nowc`. The sheet (~25 characters) takes ~9–13 s.

## Known weaknesses
- Hands: the relaxed hand is articulated (v5); 'type' and 'fist' are still profile silhouettes with nail/knuckle hints
  (fine at desk scale, plain in an extreme close-up); 'open'/'press' fingers are simple tubes.
- Contrapposto always puts the weight on his right leg (mirror with `flip` for the other side); no walk cycle yet.
- Hair clumps radiate from one crown point, which can read slightly as a starburst on the top of the head (v7 presses
  the top volume down, which softens it).
- The slim torso is the old wide drawing narrowed by `HIM_SLIM`; lapel and pocket proportions follow from that warp
  rather than being redrawn for a slim cut.
- Strongly bent arms (desk, reach) reuse the hanging-arm profile; no dedicated foreshortened or flexed-arm drawings.
- Arm angles are free, but there is no foreshortened arm toward the camera (front-view reach is sideways).
- The torso doesn't twist: lean rotates the whole upper body about the hips; the head tilts about the neck.
- Mouth shapes in profile are simplified (open/closed/smile/pucker).
- `swapped` uses the cyan ramp + finer ink + a glow; it is not a separate clean-vector drawing.
- TODO poses above; no back views.
