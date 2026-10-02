# him.js — status

"Him", the human lead: an original young AI engineer (late 20s). Painted only through `paint()` / `inkLine()` (flat
`wash` + tapered ink, sparse `hatch` on jacket/shirt shadows, `glow()` for light). No watercolour `fill` on the
character. Global-script style; every global is prefixed `him` / `HIM_`.

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

Model sheet: `output/sheets/char_him_design.jpg` (render: `node render.mjs --soft-gl --loop=him_sheet --sheet=0 --cols=1 --w=1920 --out=out/him_sheet.jpg`).

## API

```js
him(x, y, u, o)                // draws one frame of him; pure function of T (boil seeds per part)
himFeel(name, t, over)         // one emotion, alive (face fields + beat-locked idle body motion)
himEmotions(t, keys, o)        // acted changes: [[t0,'focused'],[t1,'smile',{lookX:.5}],...]; o.take scales takes
himDeskProps(x, y, u, {part})  // desk/monitor ('back', call before him) and keyboard ('front', after); same anchor as desk
himPal(name)                   // 'human' | 'drained' | 'swapped' colour sets
HIM_EMO, HIM_LAST              // emotion table; after a desk draw HIM_LAST.handL/handR = keyboard contact points (screen px)
```

**Size:** standing ≈ 31.5u (soles to hair top); head 4.4u drawn ×1.15 (`HIM_HS`); shoulders ≈ 9u wide.
Medium shot u ≈ 14–20, full figure in frame u ≈ 28–32, close-up: `pose: 'bust'` with u ≈ 40–80 (`cut`: how far
below the collarbones the bust ends, default 4.95u; ~1.1 for a head-and-collar close-up).

**Anchors:** `stand` = ground point between the feet · `bust` = notch between the collarbones (everything ~4.9u below
is cut away with a painted wavy edge) · `desk` = floor point under the front edge of the chair seat (seat top −7.2u,
hips (−1.6, −8.5)u, keyboard top ≈ (7.8, −11.2)u).

**Options:** `view` front|q|side (side/q face screen right; `flip` mirrors), `pose` stand|bust|desk,
`outfit` launch|home, `pal` human|drained|swapped,
face: `eye` (normal|happy|squeeze), `lid`, `low`, `browIn` (+ frown / − worried), `browOut`, `browY`, `irisK`, `dull`,
`mouth` (closed|A|I|U|E|O|smile|grin|frown|flat|tight|gasp|laugh|wail), `blush`, `circles`, `gloom`, `glare` (cyan on
the lenses), `tears`, `sweat`, `lookX/lookY`, `blink` (auto from T when omitted), `squint`, `seed` (blink phase),
body: `dx/dy` (u), `sq`, `lean`, `tilt`, `nod`, `breath`, `aL/aR` (his left/right arm swing), `handL/handR`
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
After the detail pass, measured on this CPU-only box (SwiftShader, load avg ≈ 3): standing figure u = 30 ≈ 140–640
ms/frame (first frame includes warm-up; typical 170–330), desk pose u = 40 incl. chair and props ≈ 150–670 (typical
150–350), bust u = 62 ≈ 155–410. Under heavy load from other renders every engine frame (its own `load` test too)
slows to seconds; judge cost with `--loop=him_perf`, `him_perf_desk`, `him_perf_bust` on a quiet machine. The sheet
(~20 characters) takes ~9–13 s.

## Known weaknesses
- Hands: profile poses are silhouettes with nail/knuckle hints, not fully articulated fingers; fine at bust/desk scale,
  plain in an extreme hand close-up.
- Hair clumps radiate from one crown point, which can read slightly as a starburst on the top of the head.
- Arm angles are free, but there is no foreshortened arm toward the camera (front-view reach is sideways).
- The torso doesn't twist: lean rotates the whole upper body about the hips; the head tilts about the neck.
- Mouth shapes in profile are simplified (open/closed/smile/pucker).
- `swapped` uses the cyan ramp + finer ink + a glow; it is not a separate clean-vector drawing.
- TODO poses above; no back views.
