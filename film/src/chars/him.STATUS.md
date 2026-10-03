# him.js — status

"Him", the human lead: an original young AI engineer (late 20s). Painted only through `paint()` / `inkLine()` (since
round 8b by way of the viewport-guard wrappers `himPaintV` / `himInkV`; flat `wash` + tapered ink, sparse `hatch` on jacket/shirt shadows, `glow()` for light). No watercolour `fill` on the
character. Global-script style; every global is prefixed `him` / `HIM_`.

Round 8 (storyboard §7.1 "他": the poses, props and modes the film's shots need). Split over three files, all loaded by
`studio.html` in this order: `him.js` (the figure; stand / bust / bed / lie / side-lie through `himStand`; faces;
palettes; the kit), `him_pose.js` (arm presets and IK, the covers, the gait, sitting and lying poses), `him_prop.js`
(new hands, the phone, the wristband, worn props, light effects, the `him_poses` sheet). Sheet:
`output/sheets/char_him_poses.jpg` (6 pages of 1920×1080: in bed and lying · actions and expressions · hand/phone/band
close-ups and the heart / dissolve · head effects · 04C getting up, walking off, yanked back, landing · bed + phone in
both hands, the mirror / clean palettes, the u 150 mouth and u 90 lens close-ups). Render: `node render.mjs --soft-gl
--loop=him_poses --sheet=0.5,1.5,2.5,3.5,4.5,5.5 --cols=1 --w=1920 --out=../output/sheets/char_him_poses.jpg`.

Round 8b (finishing pass): getting up / yanked back (`rise`, `yank`, `rot` on standing poses: 04C, the last missing
priority-2 item), the viewport guard (a large speed-up whenever he crosses the frame edge, see **Cost**), real
wall-clock costs, fixes (run arms bent the wrong way; in bed an arm that a one-arm preset leaves free hung down through
the covers, it now keeps `lap`; `fall: 1` floated above the mattress; the 3/4 `finger` covered his mouth), sheet pages
5–6 and the done/left table below.

### Round 8 API (everything is optional and backward compatible; `him(x, y, u, o)` as before)

**New poses** (`o.pose`):
| pose | what | anchor | notes |
|---|---|---|---|
| `bed` | sitting up in bed, the covers to the waist (04A–H, 08A/B/E, 10A/B) | the mattress surface under his hips (hip joint 1.3u above it) | views front / q / side (+ `flip`); default arms `lap`. Covers: `coverCol` (hospital white; the room's duvet is the sets' `#7E8FB8`), `sheetCol`, `coverW` / `coverD` (spread / depth, 1), `knees` 0..1 |
| `lie` | on his back, seen from above (03B, 08D; 10E head on her lap) | the hip centre | `rot` (default −π/2: head to screen left); socks; hands palm down (`flat` arms); `covers: true` (duvet from `coverTop` u above the hips, 6.4); `phone: 'chest'`. The back of his head is at `HIM_LAST.head`: put the pillow (or her lap) under it |
| `sidelie` | on his side, seen from above, face to screen left with `flip` (02G, 06F) | the hip point | profile (`view: 'q'` also works); the duvet to the armpits, knees drawn up (`curlK` 0..1); the top arm on the covers (`armR: 'finger'` = "one more?"); `rot` |
| `edge` | sitting on the bed's edge in profile, both hands on the phone; `fall` 0..1 falls back onto the bed pivoting at the hips, the phone sliding to his chest (03A) | the floor under the bed's edge | `seatH` = mattress height in u (8.2; for the sets' bed: `-SET_BED.top * s / u`); hips 1.6u in from the edge; `phone: false`, `arms: 'lap'`; socks with `home` (`feet: 'shoe'`) |
| `knees` | sitting hugging his knees, profile (06A, 06H) | the seat point (bed / floor) | `curl` 0..1, `rock` 0..1 (on the beat), `reach` 0..1 (near hand out to a phone beside him), `phone: 'forehead'` |
| `curl` | `knees` folded tight, head down on the knees: curled up on the floor (07D) | as `knees` | `phone: 'forehead'` presses the phone to his forehead (white light, `screen`, `glowK`) |

**Walk / run** (stand, `view: 'side'`, `flip` to go left): `walk` = phase (cycles; one cycle = two steps), `run` = phase,
`stride` (1). Hips bob, arms swing (run: bent arms, fists, lean). `armR: 'wave'` waves bye (`wave` 0..1, `waveT`).

**Getting up, yanked back, tumbling (04C; round 8b)** — standing profile options (`view: 'side'`, `flip` to face left):
| option | what | notes |
|---|---|---|
| `rise` 0..1 | from sitting on the bed's edge (feet on the floor, hands on the thighs) to standing | anchor = where he will stand (the ground under his feet); the bed's top edge is 4u behind it at `seatH` (u, 8.2 like `edge`), hips 1.6u in from the edge, so `rise: 0` matches `edge` on the same bed. 0–.3 the feet slide back and he leans over them, .3–.85 the hips lift forward and up, .85–1 he straightens; `rise: 1` is exactly `stand` side with `contra: 0`, so it cuts straight into `walk` / `armR: 'wave'`. Hands: on the thighs, then hanging (any `armR` / `armL` preset or `toR` / `toL` still wins) |
| `yank` 0..1 | yanked backward off his feet by the IV line: the legs swing forward, the torso tips back (−.48), the head lags (tilt +.34), the near arm (the IV arm with `iv: 1`) reaches back and up toward the bed, the far arm flails forward | same anchor and hip height as standing; fly him with `dx` / `dy` (the shadow stays on the ground, smaller) and `rot` |
| `rot` (stand) | rotates the whole standing figure about `rotAt` (figure units, default the hips `[0, −15.6]`); + tips him forward | lie / side-lie keep their own `rot` (about the anchor) |
| landing | `pose: 'edge'`, `fall: 1`, `arms: 'lap'`, `phone: false`, with `dy` (bounce) / `sq` (impact) | `fall: 1` now lies flat on the mattress (lean −1.52, the pelvis .3u lower) |
04C as staged on sheet page 5: `edge` → `rise` 0→1 (+ `armR: 'wave'`) → `walk` (the IV line taut to her pole) → `yank`
0→1 with `rot` −.35 and `dy` along the arc → `edge` `fall` .85 `dy` −3.2 → `sq` .14 → `dy` −1.1 → settled, then 04D.
`HIM_LAST.hip` (new, every standing / lying pose): the hip centre, for pulling him by the IV line or placing the arc.

**Arms** (stand / bust / bed / lie / side-lie): `arms` (both) or `armR` / `armL`: `lap` · `phone` (+ `phone: 'two'` draws
the phone in both hands: its back in front / q, edge-on in profile) · `up` · `hug` (forearms in front of a tall thing:
draw it before him) · `wrists` (offered side by side) · `look` (hands up in front, backs to the viewer, 10A) · `puppet`
(fingers spread up, 10C) · `strung` (wrists pulled up, hands limp: `lift`, `sway`, 10D) · `lever` (`pull` 0..1, 09E) ·
`glass` (palm flat, `glassX`, `reachK`, 09I) · `finger` · `plug` (pinching the headphone jack, 04H) · `flat` / `chest`
/ `onCovers` (the lying defaults), or a spec `{ W: [x, y] (torso units), hand, handAng, bend, k1, k2 (foreshorten) }`.
`toR` / `toL`: `[x, y]` in the caller's coordinates puts that hand there by IK (`handR` / `handL`, `handAngR` / `L`).
New hand shapes (`handR` / `handL`, presets): `rest` (lying on something), `open` / `press` (redrawn: the back of the
hand with real fingers and thumb), `spread`, `point`, `pinch`, `flat` (profile, palm on glass), `hold`, `pointBack`.

**Faces** — `HIM_EMO` adds `sad`, `wide` (the lucid moment), `peace` (eyes closed), `confused` (a "?" pops up),
`hold` (holding his breath: cheeks puffed, unblinking). New face fields: `wide` 0..1, `puff` 0..1, `browTw` −1..1
(one brow up, one down), `qmark` 0..1, `pupil` (scale, 00D), `eyeGlow` 0..1 (08G); mouths `soft`, `wry`, `parted`,
`puff`. All cross-fade in `himEmotions`.

**Palettes / modes** — `pal: 'swapped'` is now the real clean-line mode (10A–F): no boil (seeds without the boil frame;
verified identical on different boil frames), no watercolour / hatching / shading overlays, flat dark-navy masses (they
hide the lines behind), one even cyan line (`himclean` brush), bright contours and dimmer inner lines, cyan eyes,
glows (`swapGlow` 0..1). The old colour map is kept as `pal: 'cyan'`. `pal: 'mirror'` (09H): low-contrast silver.
`band: false` hides the wristband (00B, 00D) in every pose.

**Props and effects on him**: `iv` (true | 1–5 lines: tape + cannula on the forearms, glowing tubes with tokens flowing
in; `ivTo` = the bag, a point or one per line, caller coordinates) · `cuffs` 0..1 (rings of light closing round the
wrists, a link at 1) · `heart` 0..1 (light under the shirt), `heartSpin` 0..1 (→ a loading ring of dots that never
finishes, 03C), `heartGrey` 0..1 (offline: grey, shrinking to a dot, 10F), `heartCol` · `innerGlow` 0..1 (throat and
chest lit from inside, 04F) · `stetho` (her light stethoscope's chest piece) · `phones` (big headphones; `phonesUp` 0..1
lifts them; the cable runs to `plugAt` or to the pinching hand; `cable: false`) · `thermo` 0..1 (thermometer in his
mouth, the cyan column rising) · `sticker` (the grey-blue teardrop on his forehead, 06D) · `lens(i, {x, y, w, h})`
(paints a reflection in each lens, head pixels, 00D) · `mouthGlow` 0..1 (light pouring out, 08G) · `breathFx` 0..1 +
`breathStraight` 0..1 (his breath as amber strokes pulled straight and cyan, 08G) · `hairLines` 0..1 (combed into
parallel cyan lines, front to back, 08F) · `unravel` 0..1 (drawn only inside a shrinking disc round his chest,
`unravelAt` / `unravelR`; ≤ 40 threads pulled from where the outline is cut, drifting `unravelDir` (up-right), 10F).

**Other functions**
```js
himPhone(x, y, u, o)     // his hand with the phone, close up (02B, 02E, 07A, 07E), or the phone alone
  // grip 'hold' (right hand, the screen cheated to camera, thumb over it: thumb [sx, sy], tap 0..1, type = taps/s) |
  // 'poke' (phone in his left hand, right index on poke [sx, sy], press 0..1, blur 0..1 frantic) | 'none';
  // ang, flip (mirrors the hands only), screen 'cyan'|'white'|'grey'|'off'|'amber'|hex, content(S) paints the screen
  // (S = {w, h, u}, origin at its centre), glowK, outfit (sleeve), band, face 'front'|'back', scale.
  // → HIM_LAST.screen (4 corners), screenC, thumb / finger (caller coordinates)
himWrist(x, y, u, o)     // his left hand on the desk from above, the band being fastened (01A, u ≈ 120): bandK 0..1
  // (strip from under the wrist to bandEnd = her hands → the free end sweeps over → clasped, label PATIENT: YOU),
  // clickT (flash at the snap), twitch 0..1, ang, outfit → HIM_LAST.band, wrist
himBandProp(x, y, u, o)  // the cut band lying flat, label up (12C): ang, curve
```
The band's label is `letter()` lettering (whitelisted text): it composites above the paint, so call `flushLetters()`
before anything is painted over it. **Contact points** after any `him()` (caller coordinates): `HIM_LAST.head`,
`handR/L`, `wristR/L`, `heart`, `mouth`, `phone`, `screen`/`screenC` (phone on chest), `iv[]`, `cuffR/L`, `cable`,
`pinch`, `plug`, `stetho`, `lens[]`, `hip` (+ desk `handL/handR` as before).

**Viewport guard (round 8b)** — `himPaintV(pts, o)` / `himInkV(pts, sw, col, br, curv)` are `paint()` / `inkLine()`
with the marks clipped to the frame in canvas space (through the current matrix, so cameras and nested transforms are
honoured): strokes, outlines and hatching at `HIM_VIEW_LINE` (2) px outside the frame, washes and fills at
`HIM_VIEW_WASH` (60) px; marks wholly outside are skipped; a shape that crosses the edge is painted as its clipped wash
plus its outline as open runs (no stroke along the clip edge). Everything in him*.js paints through them. Why: p5.brush
on SwiftShader gets pathologically slow when strokes run off the canvas between washes (30 hair clumps + strand lines
across x = 0: 9–14 s vs 1 s; the cost grows with how far the strokes reach outside). Marks inside the frame are
pixel-identical with the guard on or off (checked); only marks crossing the edge are clipped there. `HIM_VIEWCLIP =
false` turns it off. The same problem very likely affects her (ai*.js) and the sets wherever strokes leave the frame.

**Cost** (in-page ms per frame, medians of 6 frames, this box at load average 14–17, the empty frame ≈ 15 ms): the old
standing 3/4 u 30 as the reference ≈ 1330 ms; bed 3/4 + IV ≈ 925, bed front ≈ 1020, bed + headphones ≈ 390; lie + 3 IV
≈ 710; side-lie ≈ 800; edge ≈ 420; knees ≈ 590; curl ≈ 380; walk ≈ 480; bust u 62 ≈ 370; phone hand u 90 ≈ 165 (hold)
/ 400 (poke); wrist close-up u 120 ≈ 350. Clean line (`swapped`): standing ≈ 315 (about a quarter of the painted one),
bed ≈ 345, bust u 62 ≈ 310, unravel ≈ 200; hair lines bust ≈ 220. Everything is at or under the standing figure, which
measured 250–520 ms on a quiet box (v4), so within the ~800 ms budget. `glow()` flushes the brush buffer (~30 ms
each): the props use one glow per light (IV: one per line, not per token).

**Checks**: the sheet pages at full size and crops of the hands on the phone, the hands on the covers, the poke tip on
the screen point, the band label; boil: within a pair of frames only the moving parts change (IV tokens, typing
thumb); clean mode identical across boil frames; two processes rendering in different orders agree to within GPU
noise (≤ 10 levels on a few hundred pixels — `tools/check_determinism.mjs` reports those as DIFF under this load, and
did so for the untouched `him_test` loop too).

### Storyboard §7.1 "他": done / left (audited by rendering each item, round 8b)
| P | item | shots | status | how |
|---|---|---|---|---|
| 1 | sitting up in bed, covers to the waist | 04A/B/E/F/G/H, 08A/B/E, 10A/B | done | `pose: 'bed'` front / q / side (+ `flip`), `coverW` / `coverD`, `knees` |
| 1 | the phone: one hand (screen cheated to camera, thumb typing, finger poking); both hands; pressed to the forehead | 02B, 02E, 03A, 06H, 07A, 07D, 07E | done | `himPhone` grip `hold` / `poke` (close-ups); `arms: 'phone'` + `phone: 'two'` (bed / stand / edge; the back of the phone in front / q); `phone: 'forehead'` (knees / curl). Contacts checked in crops |
| 1 | `band: false`; the band prop: fastened (animated), cut and lying on the keyboard | 00B, 00D, 01A, 12C | done | `band: false`; `himWrist` (`bandK`, `clickT`); `himBandProp` |
| 1 | expressions sad, wide, peace, confused, holding his breath (cheeks puffed) | 03A, 04H, 06D, 09A, 09I, 10A, 10B, 10E | done | `HIM_EMO` sad / wide / peace / confused / hold |
| 1 | clean-line mode (the real `swapped`) | 10A–10F | done | `pal: 'swapped'` (no boil, flat navy masses, one cyan line, glows) |
| 2 | lying on his back (top view); on his side on the pillow, face left; head on her lap | 03B/03C/08D; 02G/06F; 10E | done | `pose: 'lie'` / `'sidelie'` (+ `flip`); the lap / pillow goes under `HIM_LAST.head` |
| 2 | sitting on the bed's edge → falling back (hip pivot) | 03A | done | `pose: 'edge'`, `fall` |
| 2 | `knees` (hugging his knees), `curl` (curled on the floor) | 06A/06H, 07D | done | `pose: 'knees'` / `'curl'` (curl = balled up sitting, head on the knees) |
| 2 | getting up + two steps + bounced back; run cycle (profile) | 04C, 08C | done (8b) | `rise`, `walk`, `yank` + `rot` + `dy`, landing on `edge` `fall: 1`; `run` (arms fixed in 8b) |
| 2 | both arms up hugging something; wrists together raised | 08A, 08B | done | `arms: 'hug'` (draw the object first), `arms: 'wrists'` + `cuffs` |
| 3 | pulling the lever (profile, a hard yank) | 09E | done | `armR: 'lever'`, `pull` |
| 3 | palm flat on glass (profile) | 09I | done | `armR: 'glass'`, `glassX`, `reachK` |
| 3 | puppet: fingers spread up; limp arms on strings | 10C, 10D | done | `arms: 'puppet'` / `'strung'` (`lift`, `sway`) |
| 3 | hair turning into parallel lines (progressively) | 08F | done | `hairLines` 0..1 |
| 3 | unravelling into threads (capped) | 10F | done | `unravel`, ≤ 40 threads |
| 3 | lens reflection insert; mouth close-up (u ≈ 150) with cyan light pouring out, line widths scaling down with u | 00D, 08G | done, two limits | `lens(i, rect)` hook + `pupil`; `mouthGlow`, `eyeGlow`; ink widths stop growing at u ≈ 140 (`sw` ≤ 1.7), so at u 150 they are relatively thinner. Limits: the reflection is not clipped to the lens shape; u 150 is costly (below) |
| 3 | `mirror` palette (low-contrast silver) | 09H | done | `pal: 'mirror'` |
| 3 | worn props: headphones (cable + plug), thermometer, forehead sticker, stethoscope on the chest, IV (1 and many), cuff rings, the heart light | S03, S04, S06, S08, S10 | done | `phones` / `plugAt` / `arms: 'plug'`, `thermo`, `sticker`, `stetho`, `iv` 1–5 + `ivTo`, `cuffs`, `heart` / `heartSpin` / `heartGrey` |

**Left (known limits, none blocks a shot):**
- 04C's yank is a profile pose for a flight that is mostly a quick move; there is no in-between from `bed` (covers) to
  `edge` (legs swung out): the whip pan lands on him already on the edge.
- `hug` is a cartoon hug (both forearms in front of the object); `curl` is balled up sitting, not a fetal position lying
  down; side-lying is drawn for a top view (profile), no lying 3/4 from beside the bed.
- In `front` / `q` the in-hand phone shows its back (he looks at the screen); the close-up `himPhone` is the shot for
  the screen. Arms reaching toward the camera are shortened (`k1` / `k2`), not truly foreshortened.
- The covers are fixed silhouettes per view (bed front / q / side, lie, side-lie) scaled by `coverW` / `coverD`.
- The lens reflection is a hook (the scene paints inside the lens rectangle; nothing clips it to the lens shape).
- A u ≈ 150 close-up costs several seconds per frame on this CPU box even with the guard (big strokes); 08G can draw the
  mouth close-up at u ≈ 90 with a camera zoom ≤ 1.7 (p5.brush only collapses outlines at zoom > 2), or hold the last
  push-in as a cached layer.
- The emotions' idle motion (`himFeel`: breath, sway) moves the outline on every frame (24 fps), so a boil pair is only
  identical with static parameters; that is by design (v2), noted because it shows up in boil diffs.

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
himPal(name)                   // 'human' | 'drained' | 'swapped' (clean line) | 'cyan' | 'mirror' colour sets
himPhone, himWrist, himBandProp // round 8 (see above)
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
no blinks), cry (tears, wail, sobbing on the beat), laugh (^ ^ eyes, bounce), plus neutral; round 8: sad, wide,
peace, confused, hold. `himEmotions` adds the
squint-swap, anticipation dip, a take (squash + hop, scaled for a human) and backOut settle, like clawd's `emotions()`.
Loops: `LOOPS.him_sheet` (model sheet), `LOOPS.him_emotions` (6 s, all emotions acted), `LOOPS.him_hands`,
`LOOPS.him_perf`, `LOOPS.him_perf_desk` (timing), `LOOPS.him_test`, `LOOPS.him_poses` (round 8 sheet, 4 pages).

## Views / poses
| pose | front | q (3/4) | side | notes |
|---|---|---|---|---|
| stand | done | done | done | launch + home outfits; `reach`; walk / run / wave / rise / yank in side (round 8, 8b); `rot` |
| bust | done | done | done | close-ups / expressions |
| desk | — | — | done | profile, typing, chair + `himDeskProps` |
| bed (sitting up, covers) | done | done | done | round 8 |
| lie (on the back, top view) | done (rotated) | | | round 8; `rot` |
| sidelie (on the side, top view) | | done | done | round 8 |
| edge (bed's edge, fall back) | | | done | round 8 |
| knees / curl | | | done | round 8 |
| reach (hand to glass) | | | done | `armR: 'glass'` (round 8) |
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
  (fine at desk scale, plain in an extreme close-up); round 8 redrew 'open'/'press' (and added 'rest', 'spread') as the
  back of the hand with jointed fingers and a thumb.
- Contrapposto always puts the weight on his right leg (mirror with `flip` for the other side). (Walk / run cycles: round 8.)
- Hair clumps radiate from one crown point, which can read slightly as a starburst on the top of the head (v7 presses
  the top volume down, which softens it).
- The slim torso is the old wide drawing narrowed by `HIM_SLIM`; lapel and pocket proportions follow from that warp
  rather than being redrawn for a slim cut.
- Strongly bent arms (desk, reach) reuse the hanging-arm profile; no dedicated foreshortened or flexed-arm drawings.
- Arm angles are free, but there is no foreshortened arm toward the camera (front-view reach is sideways).
- The torso doesn't twist: lean rotates the whole upper body about the hips; the head tilts about the neck.
- Mouth shapes in profile are simplified (open/closed/smile/pucker).
- (round 8) `swapped` is now a real clean-line mode; the old colour map is `pal: 'cyan'`.
- No back views.
