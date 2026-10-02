# him.js — status

"Him", the human lead: an original young AI engineer (late 20s). Painted only through `paint()` / `inkLine()` (flat
`wash` + tapered ink, sparse `hatch` on jacket/shirt shadows, `glow()` for light). No watercolour `fill` on the
character. Global-script style; every global is prefixed `him` / `HIM_`.

v6 (round 6: masculine silhouette; v5 hands, shoes and contrapposto kept):
- hips: male pelvis — hip joints narrowed (front ±1.45u, 3/4 −1.12/+1.3), hip width ≈ the blazer's waist; the trouser
  leg's outer contour runs almost straight from hip to knee, the quad mass sits on the inner / front side (`HIM_LEG`),
  a small taper at the knee; jacket skirts and the untucked home shirt hang nearly straight from the waist; the
  contrapposto keeps the weight shift but only tilts the hips subtly (front .045 rad, shift .22u).
- neck: ~20 % shorter — the head sits `HIM_NECKDN` (.3u) lower and the neck drawing is compressed to follow it
  (`himNeckY`); the collar / trapezius line is raised near the neck (`HIM_TRAP` in `himBreath`, fading out toward the
  shoulder tips) so the head sits on the shoulders; shirt collars raised so their points sit just under the jaw shadow.
- 3/4 far shoulder: the far arm (joint raised to (3.85, −9.15), deltoid bulk on its outer side) is drawn over the far
  side of the torso and under the chest / lapel / collar, so its deltoid continues the shoulder line as one form; a far
  shoulder seam runs on into the sleeve-head seam; its inner contour against the chest is a soft fold (`soft`).

v5 (art-direction round 5: lower body, hands, shoes; arms/traps/lapels from v4 unchanged):
- legs: trouser legs from profile tables like the arms (`HIM_LEG`: quad mass widest just below the jacket hem → taper into
  the knee → a slight calf → narrow ankle), two-bone IK (`himIK`), a pressed crease, folds behind the knee and a break of
  2–3 folds where the hem lands on the shoe; the hem drapes over the shoe (drawn after it: riding up over the instep in
  front, dropping toward the heel in profile). Legs ~5% shorter (thigh 6.8u + shin 6.6u; hips ≈ 14.2u above the soles).
  The jacket skirt / untucked home shirt flare a little so the hips never poke out at the sides.
- contrapposto in every standing view (`o.contra`, default 1; 0 = the old symmetric stance): weight on his right leg,
  which slants in so the foot sits under his centre of gravity; hips tilt up on that side and shift over it (front .07
  rad, 3/4 .06), shoulders counter-tilt; the relaxed left foot goes out to the side and a little forward, heel lifted,
  the knee bending forward (front/3/4: it drops and turns in slightly; profile: it bends forward).
- hands: the relaxed hand is built from parts — back of the hand with the webbing, four gently curled fingers (little
  furthest back and highest, middle longest, index slightly apart), each outlined so ink separates them, a crease at the
  middle joint, the thumb in front along the index with its nail, nails on the index (and middle at `det2`), knuckles;
  tendons at `det2`. (Also fixed a double-reversed tube side in `himFinger` that drew a stray diagonal in open hands.)
- shoes: dark brown-black leather dress shoes with the suit (front, 3/4 and profile drawings: toe box with a shine and a
  specular spot, toe-cap seam, laces under the hem, slim sole, heel), toes turned out a little in front; longer shoes
  in profile (~4u); sneakers stay with `home`.
- head: `HIM_HS` 1.24 (was 1.15). Against the reference at equal head size our shoulders are still narrower than his, so
  the head reads anime-large rather than small; no further increase.
- every small panel (side, home, home side, reach, desk) goes through the same arm/leg/hand/shoe code; checked at u ≈ 21–24.

v4 (art-direction pass on anatomy): arms are tapering forms built from a profile table (`HIM_ARM`: deltoid cap →
widest mid upper arm → narrow elbow → forearm swell → narrow wrist; outer/inner sides asymmetric) with a sleeve-head
seam, tension folds from the armpit across the bicep, elbow folds, a crescent highlight on the deltoid; the neck is a
cylinder flaring into sloping traps with sternocleidomastoid lines, jaw shadow and the blazer collar standing around it;
lapels curve over the pecs with a shadow under the chest and an X of stress folds at the button; hands 1.4× (≈ the
face's length) with curled fingers behind, knuckles, thumb and nail; thicker thighs; rounder shoes. The single real
watercolour fill now sits on an interior chest mass (its bleed stayed outside the waist before).

v3 (user reference, 2026-10-02): build, hair, glasses, outfit and colours follow the user's reference image (kept out
of the repo; comparison in `output/sheets/char_him_vs_ref.jpg`, git-ignored). The face stays our original anime
construction (only general traits: square jaw, straight thick brows, serious look).
- build: `HIM_BUILD` widens the torso from the waist up (front ×1.45, 3/4 ×1.42, profile depth ×1.18) → massive
  deltoids/chest, tapered waist; thick neck (now visible above the open collar), high trapezius; sleeves, forearms,
  thighs and hands scaled up; strain lines across the biceps, gloss on the shoulder caps
- palette sampled from the reference: blazer #2B48A3 / #1C3486 / #0F2160, shirt #F6F5F2 with cool #C9CEDD shadows,
  hair #22212D / #14141C, skin #F2C8B0 / #D99E88
- hair: heavier, longer pointed bangs over the brows, more volume on top, tighter sides; thinner metal half-rim frames
- watercolour (`wc` option of the kit's shape()): each big mass gets a second translucent wash offset and shrunk (soft
  wet edge), a pigment-pooling ring inside its edge, a lighter bloom on base washes, fine-pencil granulation in shadow
  masses, blazer blue bleeding onto the shirt along the lapels, and (`HIM_WCFILL`, on by default) a real p5.brush
  watercolour `fill` on the biggest blazer shadow mass. Fill cost: ≈ +100 ms per figure (front u = 30: 193–323 ms
  without, 284–477 ms with), so it stays on; the speech/podium pose was dropped at the user's request.

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
palettes, small side/home/reach/desk figures). Comparison: `LOOPS.him_vs_ref` / `him_vs_ref_q` at the reference's scale.
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

**Size:** standing ≈ 32.7u (soles to hair top); head 4.4u drawn ×1.24 (`HIM_HS`); shoulders ≈ 13u wide (deltoids); hips ≈ 14.2u
above the soles. Standing poses use contrapposto (`contra: 0` for a symmetric stance).
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
- Hair clumps radiate from one crown point, which can read slightly as a starburst on the top of the head; the top
  is spikier than the reference's rounder messy volume.
- Strongly bent arms (desk, reach) reuse the hanging-arm profile; no dedicated foreshortened or flexed-arm drawings.
- Arm angles are free, but there is no foreshortened arm toward the camera (front-view reach is sideways).
- The torso doesn't twist: lean rotates the whole upper body about the hips; the head tilts about the neck.
- Mouth shapes in profile are simplified (open/closed/smile/pucker).
- `swapped` uses the cyan ramp + finer ink + a glow; it is not a separate clean-vector drawing.
- TODO poses above; no back views.
