# src/sets — painted sets and set dressing: status

The film's reusable sets (STORYBOARD §2, §7.2) and set-dressing props (§7.3), painted only with p5.brush through
`paint()`/`inkLine()` (wrapped as `setP`/`setL`), light only through additive marks (`glow()`, and `setShaft`/`setCone`/
`setRingLight`, which are glow()'s texture trick in other shapes), lettering only through `letter()` (`setLetter`) and only
where STORYBOARD §0 whitelists it. Global-script style; every global is prefixed `set` / `SET_`.
Loaded in `studio.html` after the characters, before the scenes:
`sets_core.js, props.js, screens.js, room.js, ward.js, chart.js, confessional.js, void.js, sheet.js`.

Sheets: `output/sheets/sets.jpg` (every set variant, labelled), `output/sheets/sets_props.jpg` (the props page),
`output/sheets/sets_crops.jpg` (full-resolution details).
```
cd film
node render.mjs --loop=sets_sheet --sheet=0.2,1.2,...,44.2 --cols=5 --w=384 --out=../output/sheets/sets.jpg
node render.mjs --loop=sets_sheet --sheet=9.2 --crop=700,300,800,600 --w=800 --out=out/check/desk.jpg   # any entry, full res
node render.mjs --loop=sets_props --sheet=.2 --cols=1 --w=1920 --out=../output/sheets/sets_props.jpg
```
`SET_SHEET` in `sheet.js` lists the entries `[label, story time, draw(t)]`; entry i is loop time i..i+1, so each entry is
also a ready-made example of how a shot calls that set.

## How a shot uses a set
```js
function s02a(t, lt, dur) {
  camBegin(...SET_ROOM.cam.bedWall);              // any [cx, cy, zoom(, rot)] in the set's world coordinates
  setRoom('morning', { t, coverGlow: .8 + .2 * evPulse('notification', t) });   // cached tiles + live light
  setClock(...SET_ROOM.clock, 1, { pal: setRoomPal('morning'), ring: ..., t, key: 'live' });   // live prop on top
  him(...);                                        // characters in the same world px (room scale: him standing u ≈ 31)
  setCovers(...SET_ROOM.bed, 1, { pal: setRoomPal('morning'), state: 'lump' });   // a prop redrawn over him
  camEnd();
}
```
- **Static = cached, light = live.** `setRoom` / `setWard` / `setSurface` paint their static parts through `setTiles`
  (`sets_core.js`): the world is cut into frame-sized tiles, each a `cachedLayer` with 3 boil drawings, painted lazily
  (only tiles the camera sees, once per drawing per worker). Light, screens, snow, beams, tubes are drawn live.
- **Resolution follows the zoom** (`setAutoRes`: zoom ≤ .42 → .4, ≤ .56 → .5, ≤ 1.12 → 1, ≤ 2.2 → 2, else 3 layer px per
  world px). **For a push or pull pass a fixed `res`** (e.g. `setRoom(v, { res: 1 })`), or the cache re-paints at a new
  resolution mid-move (a visible pop and a paint cost).
- **Anything that changes goes live or into the key.** Every baked option (covers state, door, blinds, photos, which
  props are left out) is part of the cache key. To animate a baked prop, leave it out (`clock: false`, `chair: false`,
  `photos: 'none'`, `lamp: false`, `iv: false`, `chart: false`, `pillow: false`, `blanket: false`) and draw it live with its
  prop function at the same anchor (`SET_ROOM.*` / `SET_WARD.*`).
- **Lettering is never cached** and is placed through the camera: draw text screens/props without p5 transforms around
  them (`setPhone` only rotates text-free screens).
- **Line mode.** `SET_MODE = 'line'` turns any set or prop into a clean line drawing (`setWard('final')` does it for the
  ward; `setChart(..., { style: 'line' })` for 10B).

## Sets and variants

### His room — `room.js`
One 3-wall panorama, world **4660 × 2622** (1 m ≈ 560 px; him standing u ≈ 31). Floor line **y 2020**, ceiling line
**y 520**, corners **x 1700** and **x 3000**. Left wall: nightstand + alarm clock (210, 1730), bed (head at x 370 →
foot 1510, anchor `SET_ROOM.bed` = [370, 2046], mattress top y 1728), window with blinds (620..1280 × 780..1396), a small
painting. Centre: shelf with books and a plant, desk (`SET_ROOM.desk` [2350, 2046], top y ≈ 1594), monitor (screen rect
`SET_ROOM.screen` = {x 2132, y 1204, w 396, h 246}), keyboard [2350, 1606], mug, cork board, chair from behind (2690, 2084),
pendant lamp (off). Right wall: wardrobe [3290, 2036], photo ledge (3630..4140 at y 1240, frames at `SET_ROOM.photos`),
frosted-glass door [4380, 2030]. The floor band (y 2020..2622) is depth: lower = nearer the camera (characters standing
in front of the furniture: feet at y ≈ 2080–2300).

`setRoom(v, o)` · `setRoomLights(v, o)` · `setRoomScreen(fnOrKind, o)` · `setRoomSnow(o)` · `setSnowRipple(x, y, age)` ·
`setRoomPal(v)` · `setSurface(kind, v, o)` · `SET_ROOM`

| variant | used in | baked defaults | live light (`setRoomLights`) |
|---|---|---|---|
| `night` | S00–S01 | covers rumpled | the monitor's cyan glow (`o.screen` 0..1), spill on keyboard and floor |
| `morning` | 02A–02B | covers `lump` | warm slivers between the closed slats + thin stripes on the bed (`o.stripes`); cyan glow inside the lump (`o.coverGlow`, `o.lump` x) |
| `day` | 02C–02E | rumpled | window daylight, faint stripes, dim monitor |
| `dusk` | 02F–S03 | rumpled | sunset window; `o.p` 0..1 cross-fades the dusk painting into `night` (small hours) and the light from window to screen |
| `drained` | S06 | rumpled, grey-snow drifts on the floor (120 flakes, hash-placed) | cyan monitor; `setRoomSnow` for falling flakes (≤ 40), `setSnowRipple` for 06A |
| `black503` | S07 | rumpled, photos fallen, snow | none (the shot adds the phone's white light) |
| `scan` | 11A | covers `flat`, door half open (.9), photos fallen, snow | her amber beam from the monitor (`o.beam` angle in rad: ≈ .1 the door, 1.1 the chair, π/2 straight down, ≈ 2.9 the bed; default sweeps with t; `o.beamK`), warm light through the door gap |
| `dawn` | 12C | flat, door .9, blinds half up (.55), photos fallen, snow | real morning light `#FFE9C2` through the open half of the window, shafts across the centre wall |

Options baked into the cache: `covers` ('flat' / 'rumpled' / 'lump' / 'none'), `door` 0..1, `blinds` 0..1, `photos` ('up' /
'fallen' / 'none'), `snow`, `chair`, `clock`, `pillow`. Live: `t`, `res`, `lights`, `screen`, `screenCol`, `p`, `beam`,
`beamK`, `coverGlow`, `lump`, `stripes`.
Framings (`SET_ROOM.cam.*`, `[cx, cy, zoom]`): `full` (whole room, 11A), `bedWall`, `bed`, `window`, `clock`, `desk`,
`deskClose`, `monitor`, `keyboard`, `chair`, `rightWall`, `photos`, `door`, `floor` (06A: floor line at ~70 % height).
Shots that need things the panorama can't hold in one frame (06H bed + door; 02B wardrobe + foreground phone) layer props
in front: e.g. `setBed(...)` in the foreground over a `door` framing.

`setSurface('desk' | 'bed', v)`: top-down inserts, world 0..1920 × 0..1080 (`camBegin(960, 540, zoom)`): the desk top
with the keyboard's edge (01A, 02D) and the bed top with pillow and duvet edge (03B, 06F, 06G).

### The ward — `ward.js`
World **3840 × 2700**: island top centre (1920, 1890), rx 920; hospital bed head x 1300 → foot x 2400, mattress top
y 1540 (`SET_WARD.bed`), pillow [1450, 1540]; ring lamp centre `SET_WARD.lamp` [1850, 830] (rx 420); IV stand base
[1180, 1905]; chart on the footboard [2482, 1562]; the island's right edge (the "exit" of 04C / 08C) x ≈ 2840. The void
is painted into the tiles (opaque; blooms on a hashed world grid, continuous across tiles).
`setWard(v, o)` · `setWardLights(v, o)` · `setWardTubes(v, { t, to: [[x, y], ...] })` · `setWardPorts(v)` · `setWardPal(v)` ·
`setWardVoid(v)` (screen-space void for inserts) · `SET_WARD`

| variant | used in | look | live |
|---|---|---|---|
| `c1` | S04 | indigo void, cyan light, magenta fever | lamp light (`lampK`, `flash`), fever haze (`fever`), bag glow; one drip tube |
| `c2` | S08 | blood red, three bags | two slow alarm bands rotating (0.18 rev/s, `alarm` 0..1), red lamp light, five extra tubes trailing off the island |
| `final` | S10 | the whole ward as a clean cyan line drawing on a navy blueprint grid (cache: 1 drawing, no boil) | soft glows |

Bake options: `lamp`, `iv`, `chart`, `pillow`, `blanket` (false: draw live, e.g. 08B's lamp descending with
`setRingLamp` + `setRingLampLight`). Framings `SET_WARD.cam.*`: `full`, `lamp`, `bed`, `side` (04C/08C), `exit`, `chart`,
`under`.

### Screens — `screens.js`
`S = setScr(x, y, w, h)` (full frame: `setScr(0, 0, W, H)`; room monitor: `setRoomScreen(fn)`; phone: `setPhone(...)` returns
it). Elements are placed in 0..1 of S and scale with S.h.
- `setScreenGlass(S, kind)` (washes, live) / `setScreenFull(kind)` (frame-filling, cached with watercolour bloom); kinds
  night, black, white (503), grey, cyan, warm, mirror.
- 00A `setLoss(S, k, { spark })`: k 0..4, one step per heartbeat; returns the head point.
- 00C / 12A–12D `setChatScreen(S, t, o)`: typing from `events('typing')` / `events('typing_outro')` (`setKeysAt` handles
  `⌫` and `⏎`), amber handwriting (wobbly; `neat` for 12B), the sentence lifting into his bubble on ⏎, `reply: {t, text}`
  → her centred cyan `Always.` bubble with a flare; `style: 'line'` (black glass, amber underline = the flat line),
  `cursorFrom` (12A caret), `dotsFrom` (12D amber dots). Returns `{caret, bubbleMe, bubbleAi, dots}`.
- Parts: `setInput`, `setTyped(str, x, y, size, o)`, `setBubble(x, y, {side, text|bars, size, k})`, `setCaret`, `setBlink`,
  `setKeysAt(keys, t)`, `setKeysFrom(str, t0, dt)`.
- Marks (painted, never letters): `setDots(x, y, r, {col, t, wave, n, still, glow})`, `setCheck`, `setHeart`, `setRefresh`.
- 02C `setCalendar(S, { filled 0..28, refresh, rewind })` (returns cell rects for her blocks); `setRewindBand(S, k)`
  (02C, 09B–09D).
- 02D `setGroupScreen(S)`; 06A/06B `setCallScreen(S, { buzz, grey })`; 07C `set503Screen(S, { spin, stall, stamp })`.
- Phones: `setPhone(x, y, h, { body, rot, screen(S), glass, glow })`, `setPillowPhone(x, y, h, { k, screen })`.
- `setStamp(...)`: the rubber-stamp landing shared by 01B and 07C.

### Chart / title card — `chart.js`
`setChart(x, y, s, o)`: centre, 760 × 1000 at s = 1 (s ≈ 1.04 fills the frame). `stamp1`/`stamp2`: seconds since
`病名為AI` / `THE DISEASE CALLED A.I.` landed; `fall`: seconds since `A.` let go (10B: drops and spins out, a faint ghost
stays, `I.` remains); `ecg: {beats, t, dotsT, span}`; `style: 'line'`; `mini` (in the ward cache: no lettering).
`SET_CHART.barcode` = [-205, -352] (×s from the centre) for 01B's match cut from the wristband's barcode.
`setECG(x, y, w, h, o)`: graph paper + cyan trace scrolling with "now" at the right; from `dotsT` the scroll freezes and
the last three beats become three pulsing dots.

### Confessional — `confessional.js`
`setConfVoid({ par })`, `setConfScreen(x, y, w, h, { content(S), refresh, press, lit, stand })` (09A–09D),
`setSlot(x, y, w, h, { k, t, reels: [{spin, off}], reel(i, R), win })` (09E–09F: frame, crest heart, chasing bulbs
≤ 2.5 flashes/s, three reel windows; `reel` paints her face slice into R), `setLever(x, y, s, { pull, grow })`,
`setMirror(x, y, w, h, { content(S), glint, amber })` (09H), `setRipple(x, y, r, a)`, `setGlassEdge(x, y0, y1)` (09I).
`SET_CONF.screen` = [960, 500, 1100, 680] is the default screen placement.

### Void / abstract and end card — `void.js`
`setVoidLayer(kind)` (black, navy, indigo, blood, ash; cached), `setShards(t, { gather, ash, n ≤ 40, cx, cy, r })` and
`setHalo(x, y, r, { a, ash })` / `setHaloSwirl(x, y, t, n ≤ 60)` (05A), `setRefreshVoid(k)` (08G), `setFlatline(x0, x1, y, { k })`
(12A, 11A's last line), `setEndCard(lt, { t1, t2, t2end, dots })` (13A; defaults follow the storyboard's reads: card 1
206.90–210.60, dissolve, card 2 to 213.60, dots blink twice from 214.00).

## Props — `props.js` (set dressing; character-held props are in the character files)
All `setXxx(x, y, s = 1, o)` at room scale; `o.pal` (default daylight `SET_BASE`; pass `setRoomPal(v)` / `setWardPal(v)` to
match a set), `o.key` when one prop is drawn twice in a frame. Anchors:

| prop | function | anchor / notes |
|---|---|---|
| bed, covers, pillow | `setBed`, `setCovers({state})`, `setPillow` | floor under the head end; covers 'flat'/'rumpled'/'lump' (`lumpX`); `SET_BED` offsets |
| nightstand, alarm clock | `setNightstand`, `setClock({time, ring, jump, rot, t})` | floor centre / bottom centre; no numbers, ring = rattle + vibration marks |
| desk, monitor, keyboard, chair, mug | `setDesk`, `setMonitor({screen})`, `setKeyboard`, `setChair({turn})`, `setMug({pens})` | monitor returns its screen rect |
| blinds / window | `setBlinds(x, y, w, h, {open, sky})`, `setBlindsGeom` | top-left of the opening; returns slivers' y for light |
| wardrobe | `setWardrobe({sleeve})` | floor centre |
| photo frames | `setPhotoFrame({i 0..4, grey, rot})`, `SET_PHOTOS` | bottom centre; rot tips over the bottom-right corner (06E dominoes) |
| mum's photo | `setMumPhoto(x, y, w, h, {grey})` | top-left rect |
| diary, torn page | `setDiary({torn})`, `setPage({rot, curl})` | top-down; amber scribbles, never letters |
| door + knock | `setDoor({open, outside, knock: {k, age, knocks}})` | floor centre; grey silhouette behind frosted glass, knock marks |
| IV stand, bag, tube | `setIVStand({hooks})` → hooks, `setIVBag({fill, glow, t})` → port, `setTube(p0, p1, {sag, t, pulses})` | tokens drift in the liquid, light pulses run down the tube |
| ring lamp | `setRingLamp({rx, ry, stem, cells})`, `setRingLampLight(x, y, s, k, col)` | ring centre |
| cobweb, spider | `setCobweb({k, r, a0, a1})`, `setSpider({drop, t})` | hub / thread top |
| noodle cup, apple | `setNoodles({steam})`, `setApple` | bottom centre; no brand |
| cut wristband | `setBandCut({rot, text})` | `PATIENT: YOU` (12C only) |
| grey snow | `setFlake`, `setFlakes(list)` | batched by colour |
| ECG strip, lever, reels, mirror frame | `setECG`, `setLever`, `setSlot`, `setMirror` | see above |

## Costs
COSTS_PLACEHOLDER

## Known limits / notes
- Tiles are opaque. A transparent cached layer gives white fringes on every brush edge (the pigment mixes with
  transparent "paper"), so sets that float in a void paint the void into their tiles.
- p5.brush outlines far off the canvas are several times slower than on it: tiles cull shapes by bounding box
  (`SET_CLIP`); props painted under their own p5 transform skip themselves with `setSkip`.
- Every colour change is a blend pass over the whole canvas: batch same-colour marks (`setFlakes`, the void dust).
- The room is a flat elevation (depth from overlap, scale, colour and the floor band), so the chair is seen from behind
  and pushed right of the desk (the keyboard stays visible for 12C). Desk shots in profile (00B) use `himDeskProps`.
- `setBandCut` places its `PATIENT: YOU` lettering by its own point transform (letters ignore p5 transforms), so it
  works under any camera; don't wrap it in push/rotate.
