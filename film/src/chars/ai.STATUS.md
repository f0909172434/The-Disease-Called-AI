# ai.js — "her", the AI (whale-maid girl): status

Files (loaded in this order by `studio.html`; every global starts with `ai` / `AI_`):
- `ai.js`: the figure (`ai()`), the head, hair, face, bodies, palettes, emotions, the model-sheet loops.
- `ai_pose.js`: her frame ↔ world (`aiToW`, `aiFromW`, `AI_LAST`), the arm IK and chibi arm rig, `pose: 'sit'`, the actions (`aiAct`, `aiClimb`, `aiDescend`).
- `ai_props.js`: the props she holds, and `aiProp()` for one on its own.
- `ai_fx.js`: `AI_PAL.mirror`, ripple, puppet strings, dissolve, the lamp beam, the giant's hands, shards, slot reels, rewind, and `LOOPS.ai_poses`.

Sheets:
- `output/sheets/char_ai_poses_1.jpg` … `_6.jpg`: every mode, action, prop and effect of §7.1, labelled, one 1920×1080 page each (1 chibi actions · 2 climb, thumbnails, silhouette · 3 close-ups, sit, lie, dissolve · 4 props, descend, strings, glass · 5 giant, shards, reels, rewind · 6 the same modes at shot scale: 08A giant face + hands, 06C cup, 09H, 10G, climb grab).
- `output/sheets/char_ai_design.jpg`: the views, 8 expressions, and the palettes with a glitch sample.
- `output/sheets/char_ai_vs_ref.jpg`: review only. Reference and painted versions side by side, chibi and full at the same scale, plus both faces.
- `output/sheets/char_ai_face.jpg`: an older 2× face of the procedural full head (predates the lock-built hair).

To rebuild the sheet: `cd film && node render.mjs --soft-gl --loop=ai_sheet --sheet=1 --cols=1 --w=1920 --out=out/ai_sheet.jpg`.

To rebuild the pose sheets: `cd film && node render.mjs --soft-gl --loop=ai_poses --stills=0.5,1.5,2.5,3.5,4.5,5.5 --out=out/aip`, then save `out/aip/t<n>_50.png` as `output/sheets/char_ai_poses_<n+1>.jpg` (page 5 takes ~50–100 s: it paints the shard and reel caches).

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
  - Each is an S-wave: it swings in and out 2–3 times along its length (`wl`, `amp`, growing toward the tip by `wp`) and twists a little sideways, so neighbouring locks overlap and cross. The phase step from lock to lock (`phj`) is larger on the chibi (more crossing) and small on the full form (big coherent waves).
  - The full form's width profile flares out past the shoulders to the hips. Pointed tips hook outward and up. Lengths, widths and spreads vary per lock.
  - `sweepL` / `sweepR` / `lenL` / `lenR` drift and lengthen one side; the curtsy uses them for the hair flowing to the screen-left.
- **Bangs** (`AI_BANGS`): six wide, soft locks fan out from a part left of centre. Each one bows outward with a slight S-curve over the sphere of the head. Their sides stay full, and the tips are pointed.
  - A big side-swept lock each way; their inner edges frame the forehead.
  - One more lock each side inside those.
  - A lock right of the part.
  - The lock falling between the eyes, plus one long thin strand (`AI_STRANDS`).

  Only the free lower ends are inked, so the fringe reads as a few masses. Each bang is washed, given its piece of the shine, and inked in turn. Then the fringe gets a root-shade glaze and a tip glaze.

  The bangs cast a darker, soft shadow on the forehead (`aiBangShadow`).
- **Shine and flyaways**: the shine is a light-blue ring band arcing down at the sides with the head (`AI_SHINE`). Each bang carries its own inset piece, so the locks break the band into segments. The two most central pieces get a thin white core. `aiFlyaways` adds a few stray hairs. The skull's hair (`aiCap`) is a full, round crown (`crown`: width, height).
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
`ai(x, y, u, o)`: she is 10u tall. (x, y) is her anchor, which depends on the pose (see `pose`).
- `form`: `chibi` or `full`. `view`: `front` / `q` / `side` (side is full only). `flip` mirrors.
- `pose`:
  - `stand` (default): (x, y) is the ground point between her feet. She hovers `float` u above it (default .25, plus a bob).
  - `curtsy`: the reference pose (full only), same anchor as `stand`.
  - `bust`: the close-up, head and shoulders only, cheap (no legs, skirt, tail, apron below the cut). Full and chibi, every view and palette. (x, y) is the collarbone notch. `cut` = how far below the notch she is cut off (u; default 2.1 full, 1.45 chibi). The eyes sit .67u above the notch, the mouth .35u, the head centre .98u (full form).
  - `sit`: on a bed edge or a chair (full, `front` / `q`; `side` falls back to `q`). (x, y) is the seat point under her hips (the bed's front edge); the feet rest 3.05u below it. The hands rest on her lap unless an arm has a reach (`sitRest: false` keeps the emotion's arm angles). `AI_LAST.lap` is where his head goes.
  - `lie`: a `bust` rolled onto its side on a pillow (06F), body under the covers. Default `roll` −1.0, view `q`, the hair spread on the pillow (`AI_LIE_HAIR`). Same anchor as `bust`.
- `cut` (bust, lie), `roll` (rad, the whole figure about her anchor; lie only by default), `yaw` (rad added to the head's turn: the head shake), `rot` (lean), `sq` (squash), `dx` / `dy` (u), `headDx` / `headDy` (u), `tilt`.
- `pal`: `default` / `glow` / `amber` / `mirror` (low-contrast silver-grey, 09H). `pal2` + `palK` cross-fade between them.
- Face: `eyes` (normal, wide, soft, sad, heart, blank, perfect, happy, closed), `mouth` (smile, cat, open, A, I, U, E, O, frown, wobble, flat, perfect), `lookX/Y`, `blink`, `lid`, `brow`, `blush`.
- Body: `fin`, `flap`, `ahoge`, `tail`/`tailK`, `hairLag` (sways the hanging locks), `hair` (overrides the hair settings: `sweepL` / `sweepR` / `lenL` / `lenR` …).
- Arms (both forms):
  - angles `aL/aR/eL/eR`; on the chibi, `eL/eR` < ~1.8 lowers the fists.
  - a reach: `reachL` / `reachR` = the palm's target in her local u (x right, y up is negative, from her anchor), or `reachLW` / `reachRW` in world px. The full form solves a two-bone IK (elbows down); the chibi switches that arm to a rig (puff, sleeve, gold cuff, hand) that may stretch up to `armStretch` (default 1.9) × its length. A chibi hand raised above the shoulder is painted over the hair.
  - `handL` / `handR`: full form `relax | open | fist | grip | flat | point | pinch | edge` (edge: a flat palm seen edge-on, pressed to glass in profile); chibi `fist | open | flat | point`. `handAL` / `handAR` = the hand's angle (rad, screen; 0 = right, −π/2 = up). `handK` / `handKL` / `handKR` scale the hand (the shadow puppet's wave uses 1.9).
  - `propL` / `propR`: what the hand holds (see Props).
- `layer` (full, `q`): `'far'` paints only what is behind her body (back hair, tail, far arm), `'near'` the rest. Call `ai()` twice with the same options and `boilKey`, and paint him between the passes: her far hand goes behind his head, the near one over it (cup, cover). For `stroke` (her hand on top of his head on her lap) paint him first and her in one pass.
- Size modes: `lod: 'thumb' | 'full'` (default `thumb` for the chibi under u 20: 5 wide calm locks per side, two washes, no glazes, flyaways, nose, bow sprigs or white shine core, a one-wash eye). `giant: true` for the giant shots drawn at a huge u (never with a camera zoom): the line cap grows with √(u/145) and the boil wobble stops growing at u 260 (`AI_GIANT_JU`). `swMax` sets the line cap directly.
- Effects:
  - `glitch` 0..1, `clip` [x0, y0, x1, y1] (world px; with `roll` it is in her rolled frame), `emote` (sweat, hearts, sparkle, note, gloom; `emoteK`, `emoteAge`).
  - `silhouette`: one colour, no lines (02A's shadow puppet); `silOp`.
  - `dissolve` 0..1 (+ `dissolveTo` [wx, wy]): washes thin out, outlines break into pieces, light motes fly to the point (06F, into the phone).
  - `ripple` { c (her local u; default her face), age (s), amp (u, .14), wl (u, .9), speed (u/s, 2.6), decay }: a ring displacing every shape (09H). Paint the rings on the glass with `aiRipple(x, y, r, k, o)`.
  - `strings` { to: { wristL, wristR, head } (world px, where each string goes up to), col, sag, w } or { lines: [{ from: 'handR' | 'wristL' | 'head' | [x, y] (her u), to: [wx, wy], sag }] } (10C on her, 10D held by her; amber `col` for the swap). Works with `pose: 'curtsy'`.
  - `draw(u, H)`: a hook painted in her frame after her (H maps head units to her px).
  - `wcFill` (accepted, no effect: see Watercolour).
- After every call `AI_LAST` holds her contact points in world px: `head`, `crown`, `eyeL`, `eyeR`, `mouth`, `chin`, `throat`, `notch`, `handL` / `handR` (palm centre, where a prop sits), `wristL` / `wristR`, `prop`, `lap` and `knee` (sit), plus `u`, `flip`. Scenes attach props, light and him to them.
- `AI_NOGLOW = true` turns her glows off (for painting her into a transparent cached layer).
- Emotion helpers: `AI_EMO` (smile, gentle, eager, worried, heart, blank, sad, perfect), `aiFeel`, `aiEmotions`, `aiTalk`.
- Loops: `ai_sheet`, `ai_poses` (6 pages), `ai_emotions` (6 s), `ai_faces`, `ai_cmp_*`.

### Actions (`ai_pose.js`)
`aiAct(name, t, t0, o)` returns options to spread into `ai()` after `aiFeel` / `aiEmotions`. It eases in over ~.2 s from t0 with a small overshoot. `o.side: 'L'` mirrors it to the other hand; `o.form: 'full'` gives the full-form version where there is one; `o.at` / `o.dir` / `o.prop` / `o.w` as listed.
- Chibi (and full where noted): `wave` (one hand by the face, the other on the chest; `o.high`: out past the hair with a big hand, for the silhouette; full), `point` (`o.dir` rad), `nod` (on the beat), `shake` (a sweet "no", head yaw), `carry` (a block on the raised palm), `push` (the block shoved aside), `hold` (a prop in both hands: `o.prop` = page / block / phone…; full), `clap` (on the beat; full), `salute`, `stetho` (the light stethoscope: earpieces in, the chestpiece held down), `catch` (`o.prop`).
- Full form, around him (`o.at` = his head centre in world px, `o.r` = his head's half-width): `cover` (his ears), `cup` (his face), `stroke` (his hair, his head on her lap). On herself: `throat` (her palm across the base of her throat, 10G), `glass` (palm up to the glass, `o.at` in her u; `o.view: 'side'` gives the edge-on palm for 09I).
- `aiClimb(t, t0, dur)`: out of a screen edge (chibi): peek, both hands grab the edge beside her face, pull up, hop on. Give `ai()` `clip` = [x0, y0, x1, edgeY] and anchor her at the edge.
- `aiDescend(t, t0, t1, h)`: down from the lamp, landing in the curtsy dip at t1; `.beam` 0..1 for `aiBeam(x, y, u, k, o)` (the light column).
- `aiRewindT(t, tPress, dur, back)`: the time to evaluate her acting at, so it plays backward after a press; `aiScanBands(x, y, w, h, k, t)` paints the rewind's scan bands.

### Props (`ai_props.js`)
In a hand: `propR: 'thermometer'` or `propR: { kind: 'spoon', cap: 'check' }` (with a reach or an action). On their own: `aiProp(kind, x, y, u, o)` paints one at a world point (`o.ang`, `o.flip`, `o.pal`, `o.boilKey`) and returns its contact points in world px. Kinds:
- `thermometer` { level 0..1 } · `spoon` { cap: 'check' | 'heart' } · `capsule` { mark } · `sticker` { peel 0..1 } (held with `hand: 'pinch'`)
- `phone` { screen: 'type' | 'glow' | 'dark' | 'back', k (typing 0..1), thumbs: true (two thumbs tapping on eighth notes; t), draw(rect, at, h, w) (paint your own screen), size, glow (light strength; .3 in a hand, .6 alone) }
- `cord` { from: [wx, wy] } (the lamp's pull cord to her hooked finger) · `stetho` · `page` { k 0..1: the diary page folding into a filed glowing block } · `block` { check, size (u), at: 'top' | 'side' | 'mid' }
- `ivstand` (standalone only: pole, bag of glowing tokens, drip; `o.tube`: the line's world points; returns `grip`, `bag`, `drip`, `top`).

### The giant and the cached effects (`ai_fx.js`)
- The giant's face is `ai()` with `pose: 'bust'`, `giant: true` and a big u (u 300 for 08A's face over the frame, u 900 for 08D's eye / 08E's mouth), cropped with `clip`. `blink: 0` keeps the eye open; drive the mouth with `aiTalk` / the same visemes as his.
- `aiGiantHand(x, y, s, o)`: the hand at its real size (wrist at x, y; s = wrist to middle fingertip, px). `o.kind`: `open` / `palm` (the wall he runs into) / `cup` (palm up, holding the bed island) / `finger` (the one he hugs) / `two` (combing); `o.ang`, `o.back` (nails), `o.flip`, `o.sleeve`, `o.curl`, `o.u` (her unit for line weights), `o.part`: `back` / `front` (paint the cup's palm, then what it holds, then its fingers). Returns `tip`, `tips`, `palm` in world px.
- `aiShards(t, o)` (07B): her figure painted once into a `cachedLayer` (3 boil drawings), cut into `n` strips × `cols` and moved with masks: never painted N times. `o.pose` = her options at the moment she breaks; `t0` tear, `t1` fall.
- `aiReels(t, o)` (09E / 09F): her close-up for each symbol face cached once, three masked columns scrolling and stopping one by one with a bounce (`stops`, `spin`, `faces`, `final`); once all three stop, the final face is painted live (`over` adds options).

## STORYBOARD §7.1 (她): done / left
Audited by rendering every item (`LOOPS.ai_poses`, plus full-res crops at shot scale). "Done" means it renders, keeps the approved head (face, six wide bangs, arced crown shine, S-wave locks, outfit) and its contacts were checked at full resolution.

| Pri | Item | Shots | State | How |
|---|---|---|---|---|
| 1 | Close-up mode (head + shoulders, cheap) | 05A, 09B/C/D/F/H, 10G, giant face | done | `pose: 'bust'`, `cut`; every palette, view and `giant` |
| 1 | Chibi actions: climb out of the screen, wave, point, nod, shake, hold a block, clap, salute, stethoscope, catch a page | 00C, 01A, 02B/C/E/F/G, 03B, 06G | done | `aiAct`, `aiClimb` + `clip`, chibi arm rig, props `block` / `page` / `stetho` |
| 1 | Thumbnail chibi (u < 20) and silhouette | 00D, 02A | done | `lod: 'thumb'` (automatic under u 20), `silhouette`, `aiAct('wave', …, { high: true })` |
| 2 | Sitting on the bed edge: cover his ears, cup his face, his head on her lap | 06A, 06C, 06D, 10E | done | `pose: 'sit'` (front, q), `aiAct` cover / cup / stroke, `AI_LAST.lap`, `layer: 'far' / 'near'` |
| 2 | Lying on her side, dissolving into the phone | 06F | done (head and shoulders on the pillow; the body is under the covers) | `pose: 'lie'`, `dissolve`, `dissolveTo` |
| 2 | Props: thermometer, spoon, sticker, phone with thumbs typing, IV stand, lamp cord | 04B–04E, 06B, 06D | done | `propL/R`, `aiProp`, hand kinds `pinch` / `grip` / `point` |
| 2 | Giant: cropped face (u ≈ 300+), giant hands (holding the bed, the palm wall, the lowered finger, combing), the unblinking eye, the syncing mouth | 08A, 08C–08F | done | `giant: true` busts, `aiGiantHand` (cup / palm / finger / two / open, `part` back / front) |
| 2 | Descending from the lamp + curtsy | 04A | done | `aiDescend` + `aiBeam` + `pose: 'curtsy'` |
| 3 | Torn into shards that fall | 07B | done | `aiShards` (one cached layer, masks) |
| 3 | Slot reels | 09E, 09F | done | `aiReels` (cached faces, three masked columns) |
| 3 | Rewind, `mirror` palette, the ripple from his reflection into her | 09B–09D, 09H | done (her side; his reflection is `him.js`) | `aiRewindT`, `aiScanBands`, `AI_PAL.mirror`, `ripple` + `aiRipple` |
| 3 | Palm on the glass (side); hand on her throat | 09I, 10G | done | `aiAct('glass', …, { view: 'side' })` (hand `edge`), `aiAct('throat')` |
| 3 | Puppet: strings on her wrists and head, curtsy on the strings; pulling the strings herself | 10C, 10D | done | `strings` (`to` / `lines`), `pal: 'amber'` |

Fixed in this pass (found by the audit): the climb's hands grabbed the edge over her eyes (now beside the face, coming in during the pull); the silhouette's wave was a bump in the hair (now out past it with a bigger hand); the throat hand covered her mouth (her neck is short: it now lies across its base); a held phone's and the cord bead's light washed the fingers white on paper; the profile palm on glass showed the whole palm (now edge-on); cup / cover painted her far hand over his face (now two passes); the giant's boil moved each shape ~6 px a drawing at u 900 (capped); the lie roll was a head tilt (−.45 → −1.0, shorter hair on the pillow).

Left / limits:
- No full-body lying pose (06F only needs the head on the pillow). No back view.
- The full form's arms are plain tubes: a reach longer than ~1.8u from the shoulder goes straight and stiff (06C: put his head within ~1.7u of her shoulder).
- In 3/4 the near arm crosses her chest to reach him; for a target at her face height it crosses her chin (06A: his head lower than hers, or use `yaw`).
- With `roll` (lie), `clip` is in her rolled frame, not the world's.
- The giant's cupped hands read a little like claws; the profile puff sleeve reads as a ring in the low-contrast `mirror` palette.
- The full-form IK places the wrist for a hand of normal size: with `handK` ≠ 1 the palm is not exactly on the target.

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
- Between u 20 and 30 the full chibi's wavy locks still read a little ribbed (`lod: 'thumb'` is automatic only under u 20; pass it up to ~u 30 if a shot needs it).
- **Curtsy is a single fixed pose.** The head, arms and fins act, but the body does not re-pose. Its petticoat is two scalloped tiers; the reference has softer ruffles.
- **Procedural full front/q/side** share the head and the palette, but the body is not measured. In profile the hair falls as a plain curtain.
- **Chibi 3/4**: the body is a remap of the front view. The far fin only peeks out behind the skull.
- **No back views** (the head model could do one: yaw π).
- The new modes' limits are listed under §7.1 above.
