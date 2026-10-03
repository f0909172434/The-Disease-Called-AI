# src/sets — painted sets and set dressing: status

The film's reusable sets (STORYBOARD §2, §7.2) and set-dressing props (§7.3), painted only with p5.brush through
`paint()`/`inkLine()` (wrapped as `setP`/`setL`), light only through additive marks (`glow()`, and `setShaft`/`setCone`/
`setRingLight`, which are glow()'s texture trick in other shapes), lettering only through `letter()` (`setLetter`) and only
where STORYBOARD §0 whitelists it. Flat 2D, no pure black / white, every frame a pure function of `t`. Global-script
style; every global is prefixed `set` / `SET_`. Loaded in `studio.html` after the characters, before the scenes:
`sets_core.js, props.js, screens.js, room.js, ward.js, chart.js, confessional.js, void.js, sheet.js`.

Sheets: `output/sheets/sets.jpg` (all 47 entries of `SET_SHEET`, labelled), `output/sheets/sets_props.jpg` (the props
page), `output/sheets/sets_crops.jpg` (full-resolution details).
```
cd film
node render.mjs --loop=sets_sheet --sheet=0.2,1.2,...,46.2 --cols=5 --w=384 --out=../output/sheets/sets.jpg
node render.mjs --loop=sets_sheet --sheet=9.2 --crop=700,300,800,600 --cols=1 --w=800 --out=out/check/desk.jpg   # full res
node render.mjs --loop=sets_props --sheet=.2 --cols=1 --w=1920 --out=../output/sheets/sets_props.jpg
```
(`--crop` needs `--cols=1`, or the cell is laid out for 3 columns.) `SET_SHEET` in `sheet.js` lists `[label, story t,
draw(t)]`; entry i is loop time i..i+1, so each entry is also a ready-made example of how a shot calls that set.

## Audit (§7.2 sets and variants, §7.3 set dressing) — rendered and checked 2026-10-03

| item | status | where |
|---|---|---|
| room · night / morning / day / dusk→small hours / drained + grey snow / 503 black / scan beam / dawn | done | `setRoom(v)`, sheet 0–13 |
| room top-down inserts (desk top 01A/02D, bed top 03B/06F/06G) | done | `setSurface`, sheet 14–15 |
| ward · C1 / C2 (alarm bands, many tubes) / FINAL line drawing | done | `setWard(v)`, sheet 16–21 |
| screens: loss curve, input box + typing + bubbles, week calendar, ✓ ♥ ↻ • • •, grey group chat, mum calling / grey, 503, outro line + her dots, pillow phone | done | `screens.js`, sheet 22–33 |
| chart / title card + ECG (paper, ward mini, line style with `A.` falling) | done | `chart.js`, sheet 34–35 |
| confessional · screen / slot + lever / black mirror / glass edge | done | `confessional.js`, sheet 36–40 |
| void · shards + halos (+ ash) / black + ↻ / black + flat line; end card | done | `void.js`, sheet 41–46 |
| props: bed, covers, pillow, nightstand, alarm clock, desk, monitor, keyboard, chair, mug, blinds, wardrobe, photo frames ×5, mum's photo, diary, page, frosted door + knock, IV stand / bag / tube, ring lamp, cobweb + spider, noodles, apple, cut band, grey snow, ECG, lever, reels, mirror frame, phones (cyan / friend's grey) | done | `props.js` etc., props page |
| two shirts (02B) | **added this pass** | `setShirt`, sheet 11 |
| ring lamp → two cuff rings (08B) | **added this pass** | `setRingLampCuffs`, sheet 21 |
| gold confetti (09F) | **added this pass** | `setConfetti`, sheet 38 |
| lighthouse cone (11A) | done (the `scan` variant's beam, `o.beam`) | `setRoomLights` |
| thermometer, capsules, spoon, sticker, headphones + plug, stethoscope, cuffs on the wrists, puppet strings, phone in hand, wristband on the wrist | character-held: in `src/chars` (`him_prop.js`, `ai_props.js`, `ai_fx.js`) | — |
| 04H "the ward shatters into brush shards" | not a set piece: `setShards` over a `flash`, or cut the cached frame like `ai_fx.js` does for her | — |

Fixed this pass: zoomed room framings painted nothing in the review sheet (the sheet's `cam` option was read by
`setTiles` as its camera; `setTiles` now also accepts `o.cam` as `[cx, cy, zoom(, rot)]`), and the sheet's monitor content
switched off the room's screen light (`screen` is a number for `setRoom`; the sheet now passes `show`); a hairline of
paper at every tile seam (tiles now overlap by ~1 screen px); close framings could need 9 tiles × 3 drawings > the page's
24-layer cache (resolution steps are now ≤ 15 % apart, so a framing needs at most 2 × 2 tiles); the dusk cross-fade
used 2 × 12 layers in a close framing (dusk now boils with 2 drawings); flat, evenly lit rooms (each variant now bakes
its light's falloff into the tiles, see below); the night monitor's light on the wall and desk; morning's monitor glowed
while switched off (default 0 now); dawn's monitor light is amber (her line), not cyan.

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
- **Resolution follows the zoom** (`setAutoRes`: the largest step of `SET_RES` = .4 … 3 that is ≤ the zoom, so a tile is
  never smaller than the view and a framing needs ≤ 4 tiles = 12 cached layers). **For a push or pull pass a fixed `res`**,
  or the cache re-paints at each step the zoom crosses (a visible pop and ~25 s per tile each). Safe choice: the res of
  the widest framing of the move (`setAutoRes(zoomWide)`); the close end is then upscaled by zoomClose / res (fine up to
  ~1.3×). For a bigger zoom range take a res nearer the middle **and** `variants: 2`: when res > zoom the view spans up
  to 3 × 3 tiles, and 9 × 3 drawings would overflow the cache.
- **Keep a shot inside the cache.** The page keeps 24 layers (LRU). One set framing = tiles × 3; her shards / reels
  (`ai_fx.js`) and `setScreenLayer` backgrounds add their own. Over 24 every frame re-paints (seconds per frame).
- **Anything that changes goes live or into the key.** Every baked option (covers state, door, blinds, photos, which
  props are left out) is part of the cache key. To animate a baked prop, leave it out (`clock: false`, `chair: false`,
  `photos: 'none'`, `lamp: false`, `iv: false`, `chart: false`, `pillow: false`, `blanket: false`) and draw it live with its
  prop function at the same anchor (`SET_ROOM.*` / `SET_WARD.*`).
- **Option names:** `setRoom`'s `screen` is the monitor's light (0..1); what the monitor shows is `setRoomScreen(fn)`. `cam`
  in a set's options is the camera the tiles are chosen for (default: the active one) — don't pass a framing there.
- **Lettering is never cached** and is placed through the camera: draw text screens/props without p5 transforms around
  them (`setPhone` only rotates text-free screens).
- **Line mode.** `SET_MODE = 'line'` turns any set or prop into a clean line drawing (`setWard('final')` does it for the
  ward; `setChart(..., { style: 'line' })` for 10B).

## Sets and variants

### His room — `room.js`
One 3-wall panorama, world **4660 × 2622** (1 m ≈ 560 px; him standing u ≈ 31 → 980 px; her full size u ≈ 82).
Floor line **y 2020**, ceiling line **y 520**, wall corners **x 1700** and **x 3000**. The floor band (y 2020..2622) is
depth: lower = nearer the camera (characters standing in front of the furniture: feet at y ≈ 2080–2300).

`setRoom(v, o)` · `setRoomLights(v, o)` · `setRoomScreen(fnOrKind, o)` · `setRoomSnow(o)` · `setSnowRipple(x, y, age)` ·
`setRoomPal(v)` · `setSurface(kind, v, o)` · `SET_ROOM` · `SET_ROOM_SHADE`

| variant | used in | baked defaults | the light (baked falloff centre → live marks of `setRoomLights`) |
|---|---|---|---|
| `night` | S00–S01 | covers rumpled | monitor → cyan glow on the wall, the desk top, keyboard and floor (`o.screen` 0..1, default 1) |
| `morning` | 02A–02B | covers `lump` | window + bed → warm slivers between the closed slats, thin stripes on the bed (`o.stripes`), cyan glow inside the lump (`o.coverGlow`, `o.lump` x); monitor off (`screen` 0) |
| `day` | 02C–02E | rumpled | window → daylight, faint slat stripes, dim monitor (.3) |
| `dusk` | 02F–S03 | rumpled; 2 boil drawings | window → sunset; `o.p` 0..1 cross-fades the painting into `night` (small hours) and the light from window to screen |
| `drained` | S06 | rumpled, grey-snow drifts on the floor (120 flakes, hash-placed) | monitor (.8) → cyan; `setRoomSnow` falling flakes (≤ 40), `setSnowRipple` for 06A |
| `black503` | S07 | rumpled, photos fallen, snow | none (the shot adds the phone's white light) |
| `scan` | 11A | covers `flat`, door half open (.9), photos fallen, snow | monitor → her amber beam (`o.beam` rad: ≈ .06 the door, .9 the chair, π/2 down, ≈ 2.86 the bed; default sweeps with t; `o.beamK`), warm light through the door gap |
| `dawn` | 12C | flat, door .9, blinds half up (.55), photos fallen, snow | window → real morning light `#FFE9C2` through the open half, shafts across the centre wall; monitor amber (.3) |

Baked options (cache key): `covers` ('flat' / 'rumpled' / 'lump' / 'none'), `door` 0..1, `blinds` 0..1, `photos` ('up' /
'fallen' / 'none'), `snow`, `chair`, `clock`, `pillow`. Live: `t`, `res`, `lights` (false: call `setRoomLights` yourself,
e.g. after the characters), `screen`, `screenCol`, `p`, `beam`, `beamK`, `coverGlow`, `lump`, `stripes`, `door`, `blinds`.
**Falloff:** each variant (but `black503`) bakes glazes of a shadow colour outside growing wobbly ellipses round its light
(`SET_ROOM_SHADE[v]`: `c`, `r0`→`r1`, `n` steps, `op`), so the room darkens step by step away from the screen (night) or
the window (day); characters standing far from the light should be painted a little darker too (`pal` / their own
shading), and lit with a `glow` from the light's side.

`setSurface('desk' | 'bed', v)`: top-down inserts, world 0..1920 × 0..1080 (`camBegin(960, 540, zoom)`): the desk top
with the keyboard's edge along the top (01A, 02D) and the bed top with the pillow along the top and the duvet's edge
along the bottom (03B, 06F, 06G). 02D's time-lapse is a live `setShaft` sweeping across it.

#### Room: world coordinates (anchors in `SET_ROOM`)
| thing | world px |
|---|---|
| nightstand + alarm clock | nightstand floor centre (210, 2038), 95..325 × 1730..2038; clock bottom centre `SET_ROOM.clock` (210, 1730), ~100 × 120 |
| bed | `SET_ROOM.bed` = (370, 2046) floor under the headboard; head x 370 → foot x 1510; mattress top y 1728; pillow (588, 1728); headboard top y 1444, footboard top y 1620 (`SET_BED` offsets) |
| window + blinds | opening `SET_ROOM.win` = 620..1280 × 780..1396 (frame ±34; sill to y 1446); painting 130..330 × 1180..1440 |
| rug | centre (970, 2180), 940 × 164 |
| shelf, cork board, pendant lamp | shelf 1980..2620 at y 1000 (books up to y ≈ 780); cork board 2660..2940 × 1040..1330; lamp (2350, 520..712), off |
| desk | `SET_ROOM.desk` = (2350, 2046) floor centre; 1950..2750; top band y 1584..1626 (surface ≈ y 1594) |
| monitor | stand base (2330, 1590); screen rect `SET_ROOM.screen` = {x 2132, y 1204, w 396, h 246}; keyboard centre (2350, 1606) 270 × 26; mug (2080, 1600) |
| chair (from behind) | `SET_ROOM.chair` = (2690, 2084); backrest 2570..2830 × 1516..1790, seat y ≈ 1870 |
| wardrobe | `SET_ROOM.robe` = (3290, 2036); 3008..3572 × 892..2036; doors' handles y ≈ 1400 |
| photo ledge + frames | ledge 3630..4140 at y 1240; frames' bottom centres x `SET_ROOM.photos` = 3702, 3802, 3898, 3992, 4088 (76–100 wide, 80–112 tall) |
| door | `SET_ROOM.door` = (4380, 2030) floor centre; frame 4142..4618 × 834..2034; frosted glass ≈ 4243..4517 × 950..1510; handle y ≈ 1460; light switch (4080, 1330) |

#### Room: framing guide (`SET_ROOM.cam.*` = `[cx, cy, zoom]`)
Floor line on screen = where y 2020 lands; the lyric band is screen y > 842 (keep faces, hands and key props above 820
while someone sings).

| framing | world rect shown | what reads | floor line | tiles @ res | for |
|---|---|---|---|---|---|
| `full` | 0..4660 × 0..2622 | the whole room; him standing ≈ 400 px | 832 (77 %) | 1 @ .4 | 11A, establishing |
| `bedWall` | −351..2111 × 738..2122 | window + blinds, painting, nightstand + clock, the whole bed, edge of the desk | 1000 | 4 @ .78 | 02A, 03A wide, 06H (him on the bed, left half) |
| `bed` | 95..1765 × 1170..2110 | the bed big, window's lower half | 977 | 4 @ 1.12 | 03A medium (on the bed's edge, falling back) |
| `window` | 150..1750 × 700..1600 | blinds and the head of the bed | — (off frame) | 4 @ 1.12 | 02A slats, 12C blinds |
| `clock` | −69..669 × 1452..1868 | nightstand top, the clock big | — | 4 @ 2.5 | 02A alarm |
| `desk` | 1283..3417 × 900..2100 | shelf, monitor, desk, chair, cork board, wardrobe's edge | 1008 | 4 @ .87 | 12C pull-back end, 11A b137; him at the desk seen from behind |
| `deskClose` | 1710..2990 × 1090..1810 | monitor + keyboard + mug, chair's back | — | 4 @ 1.4 | 12C, desk inserts (00B is a profile shot: `himDeskProps`) |
| `monitor` | 1930..2730 × 1102..1552 | the screen ≈ 950 × 590 px | — | 4 @ 2.25 | 10G's end (the frame closes round her) → 11A pull-back; 12C start |
| `keyboard` | 2030..2670 × 1410..1770 | keyboard + the cut band ≈ 810 px wide | — | 4 @ 3 | 12C band |
| `chair` | 1800..3400 × 1250..2150 | the empty chair, desk | 924 | 2 @ 1.12 | 11A b137, 12C |
| `rightWall` | 2467..5133 × 670..2170 | wardrobe, photo ledge, door | 972 | 4 @ .7 | 02B (him at the wardrobe), 06E wide, 06H door side |
| `photos` | 3459..4331 × 925..1415 | the five frames ≈ 200 px tall | — | 4 @ 2 | 06E dominoes |
| `door` | 3251..5509 × 815..2085 | the whole door, wardrobe's edge | 1024 | 4 @ .78 | 06H, 11A b139 |
| `floor` | 540..2460 × 1264..2344 | low view: floor line at 70 %, bed on the left half | 756 (70 %) | 4 @ 1 | 06A (phone on the floor at screen y ≈ 670–735) |
| sheet 11: `[3250, 1480, .95]` | 2240..4260 × 912..2048 | desk's edge, wardrobe, ledge | 993 | 4 @ .87 | 02B background |
| sheet 13: `[2350, 1560, 2.2]` | 1914..2786 × 1315..1805 | monitor + keyboard + band | — | 4 @ 2 | 12C start |

The panorama can't hold the bed and the door in one close frame (06H): frame `door` and paint `setBed(...)` /
`him` in the foreground over it, or use `rightWall` with him on the floor band in front. Dutch angles: pass `rot` as the
fourth camera value; `setTiles` covers the rotated view.

### The ward — `ward.js`
World **3840 × 2700**, the void painted into the tiles (opaque; blooms on a hashed world grid, continuous across tiles).
`setWard(v, o)` · `setWardLights(v, o)` · `setWardTubes(v, { t, to: [[x, y], ...] })` · `setWardPorts(v)` · `setWardPal(v)` ·
`setWardVoid(v)` (screen-space void for inserts) · `SET_WARD`

| variant | used in | look | live |
|---|---|---|---|
| `c1` | S04 | indigo void, cyan light, magenta fever | lamp light (`lampK`, `flash`), fever haze (`fever`), bag glow; one drip tube |
| `c2` | S08 | blood red, three bags | two slow alarm bands rotating (0.18 rev/s, `alarm` 0..1), red lamp light, five extra tubes trailing off the island |
| `final` | S10 | the whole ward as a clean cyan line drawing on a navy blueprint grid (cache: 1 drawing, no boil) | soft glows |

Bake options: `lamp`, `iv`, `chart`, `pillow`, `blanket` (false: draw live, e.g. 08B's lamp with `setRingLampCuffs`).

| thing | world px |
|---|---|
| island | top centre `SET_WARD.island` (1920, 1890), rx 920, ry 110; underside hangs to y ≈ 2500 |
| hospital bed | `SET_WARD.bed` head x 1300 → foot x 2400, mattress top y 1540, legs to y 1905; headboard top y 1296, footboard top y 1420; pillow `SET_WARD.pillow` (1450, 1540); blanket x 1730..2386 |
| him in bed | `pose: 'bed'` anchored on the mattress (≈ (1560..1700, 1540)), u ≈ 31; drip tubes `setWardTubes(v, { to: [HIM_LAST.iv...] })` |
| ring lamp | centre `SET_WARD.lamp` (1850, 830), rx 420, ry 105, rods up to y ≈ −700; its light (live) lands on the bed and the island |
| IV stand | base `SET_WARD.iv` (1180, 1905), top y 1000; drip ports `setWardPorts(v)` |
| chart | `SET_WARD.chart` (2482, 1562) on the footboard (≈ 122 × 160, no lettering) |
| exit | the island's right edge x ≈ 2840 (04C / 08C) |

| framing (`SET_WARD.cam.*`) | world rect shown | what reads | island top on screen | tiles @ res | for |
|---|---|---|---|---|---|
| `full` | 175..3665 × 418..2382 | lamp, island, bed, IV, void around | 818 | 2 @ .5 | 04A end, 08A wide, 10A |
| `lamp` | 890..2810 × 280..1360 | the ring lamp big, IV bag | — | 4 @ 1 | 04A start, 08B |
| `bed` | 890..2810 × 1020..2100 | bed + IV + chart, him u ≈ 31 sitting | 885 | 4 @ 1 | 04B, 04E, 04G/H, 08E |
| `side` | 693..3287 × 830..2290 | the whole island in profile, exit on the right | 795 | 4 @ .7 | 04C, 08C |
| `exit` | 1533..3667 × 1100..2300 | the island's right edge and the dark beyond | 724 | 4 @ .87 | 08C (her palm rises here) |
| `chart` | 2182..2782 × 1391..1729 | the footboard chart | — | 4 @ 3 | chart insert (no lettering: 10B uses `setChart` big) |
| `under` | 549..3291 × 1479..3021 | the island's underside and cables | 298 | 4 @ .7 | transitions |

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
- Marks (painted, never letters): `setDots(x, y, r, {col, t, wave, n, still, glow})` (07A: `n` 3 → 0), `setCheck`,
  `setHeart`, `setRefresh` (07E, 08G, 09B).
- 02C `setCalendar(S, { filled 0..28, refresh, rewind })` (returns cell rects for her blocks); `setRewindBand(S, k)`
  (02C, 09B–09D).
- 02D `setGroupScreen(S)`; 06A/06B `setCallScreen(S, { buzz, grey })`; 07C `set503Screen(S, { spin, stall, stamp })`.
- Phones: `setPhone(x, y, h, { body, rot, screen(S), glass, glow })` (friend's grey phone: `body: '#8E9099'`),
  `setPillowPhone(x, y, h, { k, screen })` (02G, 06F).
- `setStamp(...)`: the rubber-stamp landing shared by 01B and 07C.

### Chart / title card — `chart.js`
`setChart(x, y, s, o)`: centre, 760 × 1000 at s = 1 (s ≈ 1.04 fills the frame). `stamp1`/`stamp2`: seconds since
`病名為AI` / `THE DISEASE CALLED A.I.` landed; `fall`: seconds since `A.` let go (10B: drops and spins out, a faint ghost
stays, `I.` remains); `ecg: {beats, t, dotsT, span}`; `style: 'line'`; `mini` (in the ward cache: no lettering).
**`cache: true`** paints the static paper (board with its watercolour fill, clip, form, graph paper) once into tiles
together with the background behind it, `bg: 'indigo'` (01B) / `'final'` (10B: the line ward's blueprint grid) / any
`setVoidLayer` kind / `fn(x0, y0, x1, y1)` + `bgKey`; the stamps, trace and dots stay live (0.06 s/frame instead of
1.5–4.6 s live). With `cache`, skip `setVoidLayer` behind it; for 01B's push and 10B's push pass a fixed `res`.
`SET_CHART.barcode` = [-205, -352] (×s from the centre) for 01B's match cut from the wristband's barcode.
`setECG(x, y, w, h, o)`: graph paper + cyan trace scrolling with "now" at the right; from `dotsT` the scroll freezes and
the last three beats become three pulsing dots.

### Confessional — `confessional.js`
`setConfVoid({ par })`, `setConfScreen(x, y, w, h, { content(S), refresh, press, lit, stand })` (09A–09D),
`setSlot(x, y, w, h, { k, t, reels: [{spin, off}], reel(i, R), win, cache })` (09E–09F: frame, crest heart, chasing bulbs
≤ 2.5 flashes/s, three reel windows; `reel` paints her face slice into R; `cache: true` once `k` = 1 bakes the machine
and the void behind it into tiles — then skip `setConfVoid`), `setLever(x, y, s, { pull, grow })`,
`setConfetti(x, y, age, { n ≤ 40, spread, up, s })` (09F: gold streamers and flakes from the burst at 151.40),
`setMirror(x, y, w, h, { content(S), glint, amber })` (09H), `setRipple(x, y, r, a)`, `setGlassEdge(x, y0, y1)` (09I).
`SET_CONF.screen` = [960, 500, 1100, 680] is the default screen placement; the whole set is screen space (`cam.screen`
= [960, 540, 1], `cam.wide` = [960, 560, .72] if a shot wants a camera).

### Void / abstract and end card — `void.js`
`setVoidLayer(kind)` (black, navy, indigo, blood, ash; cached), `setShards(t, { gather, ash, n ≤ 40, cx, cy, r })` and
`setHalo(x, y, r, { a, ash })` / `setHaloSwirl(x, y, t, n ≤ 60)` (05A), `setRefreshVoid(k)` (08G), `setFlatline(x0, x1, y, { k })`
(12A, 11A's last line), `setEndCard(lt, { t1, t2, t2end, dots })` (13A; defaults follow the storyboard's reads: card 1
206.90–210.60, dissolve, card 2 to 213.60, dots blink twice from 214.00).

## Props — `props.js` (set dressing; character-held props are in the character files)
All `setXxx(x, y, s = 1, o)` at room scale; `o.pal` (default daylight `SET_BASE`; pass `setRoomPal(v)` / `setWardPal(v)` to
match a set), `o.key` when one prop is drawn twice in a frame.

| prop | function | anchor / notes |
|---|---|---|
| bed, covers, pillow | `setBed`, `setCovers({state})`, `setPillow` | floor under the head end; covers 'flat'/'rumpled'/'lump' (`lumpX`); `SET_BED` offsets |
| nightstand, alarm clock | `setNightstand`, `setClock({time, ring, jump, rot, t})` | floor centre / bottom centre; no numbers, ring = rattle + vibration marks |
| desk, monitor, keyboard, chair, mug | `setDesk`, `setMonitor({screen})`, `setKeyboard`, `setChair({turn})`, `setMug({pens})` | monitor returns its screen rect |
| blinds / window | `setBlinds(x, y, w, h, {open, sky})`, `setBlindsGeom` | top-left of the opening; returns slivers' y for light |
| wardrobe | `setWardrobe({sleeve})` | floor centre |
| two shirts (02B) | `setShirt(x, y, s, {kind: 'grey' \| 'warm', rot, hanger})` | the hanger's hook (put it in his hand); ~300 × 420; returns the chest point for her ✓ |
| photo frames | `setPhotoFrame({i 0..4, grey, rot})`, `SET_PHOTOS` | bottom centre; rot tips over the bottom-right corner (06E dominoes) |
| mum's photo | `setMumPhoto(x, y, w, h, {grey})` | top-left rect |
| diary, torn page | `setDiary({torn})`, `setPage({rot, curl})` | top-down; amber scribbles, never letters |
| door + knock | `setDoor({open, outside, knock: {k, age, knocks}, knockOnly})` | floor centre; grey silhouette behind frosted glass, knock marks; `knockOnly` paints just those over the room's baked door (06H) |
| IV stand, bag, tube | `setIVStand({hooks})` → hooks, `setIVBag({fill, glow, t})` → port, `setTube(p0, p1, {sag, t, pulses})` | tokens drift in the liquid, light pulses run down the tube |
| ring lamp | `setRingLamp({rx, ry, stem, stemTop, cells, op})`, `setRingLampLight(x, y, s, k, col)` | ring centre |
| lamp → cuffs (08B) | `setRingLampCuffs(k, {from, to: [[x, y], [x, y]], r, col, pal})` | k 0..1: descends and shrinks (0–.45), pinches in two (.45–.6), rings close on the wrists (1; then `him({cuffs: 1})`); returns the ring centres |
| cobweb, spider | `setCobweb({k, r, a0, a1})`, `setSpider({drop, t})` | hub / thread top |
| noodle cup, apple | `setNoodles({steam})`, `setApple` | bottom centre; no brand |
| cut wristband | `setBandCut({rot, text})` | `PATIENT: YOU` (12C only); `himBandProp` in `him_prop.js` is the character team's version |
| grey snow | `setFlake`, `setFlakes(list)` | batched by colour |
| ECG strip, lever, reels, confetti, mirror frame | `setECG`, `setLever`, `setSlot`, `setConfetti`, `setMirror` | see above |

## Costs
Measured 2026-10-03 with `renderSheet` (in-page render + composite; the capture path's JPEG encode and transfer are an
engine-wide constant, not part of the set), 1080p, SwiftShader, **on a heavily shared box** (3 of these renders in
parallel plus other agents' jobs: load average 11 → 25, peaks over 100 on 4 cores), so read every number as an upper
bound, ~2–3× what a quiet worker gets. Per entry of `SET_SHEET`: 8 frames, 3 cold (one per boil drawing) then 5 warm.
**Build** = the cost of painting the cached layers the framing needs, once per boil drawing per worker (3 drawings; 2
for dusk, 1 for the line ward / line chart); **per frame** = median (max) of the warm frames, everything live included
(light, screens, snow, tubes, lettering, the sheet's label). An empty frame measured the same way: 0.02–0.05 s.

| # | entry | build (drawings × s) | per frame, cached: median (max) s |
|---|---|---|---|
| 0 | room · night, full view (1 tile @ .4) | 3 × 31 | 0.09 (0.19) |
| 1 | room · morning, full | 3 × 28 | 0.09 (0.11) |
| 2 | room · day, full | 3 × 26 | 0.12 (0.28) |
| 3 | room · dusk, full | 2 × 32 | 0.12 (0.27) |
| 4 | room · dusk → small hours (p .7; + the night tiles) | 2 × 31 | 0.12 (0.20) |
| 5 | room · drained + live snow, full | 3 × 34 | 0.21 (0.59) |
| 6 | room · 503 black, full | 3 × 30 | 0.08 (0.11) |
| 7 | room · scan beam, full | 3 × 34 | 0.09 (0.25) |
| 8 | room · dawn, full | 3 × 34 | 0.13 (0.14) |
| 9 | room · night, `desk` (4 tiles) + chat screen | 3 × 121 | 0.12 (0.17) |
| 10 | room · morning, `bedWall` (4 tiles) + live clock | 3 × 86 | 0.13 (0.17) |
| 11 | room · morning, wardrobe (4 tiles) + 2 live shirts + ✓ | 3 × 124 | 0.33 (0.41) |
| 12 | room · drained, `rightWall` (4 tiles) + 5 live photo frames + door/knock + snow | 3 × 75 | 0.55 (1.42) ¹ |
| 13 | room · dawn, keyboard (4 tiles @ 2) + chat + band | 3 × 107 | 0.15 (0.27) |
| 14 | surface · desk top + grey phone + cobweb | 3 × 21 | 0.16 (0.48) |
| 15 | surface · bed top + diary + page + pillow phone | 3 × 21 | 0.26 (0.35) |
| 16 | ward · C1, full (2 tiles @ .5) + tube | 3 × 53 | 0.13 (0.20) |
| 17 | ward · C2, full + alarm + 7 tubes | 3 × 51 | 0.26 (0.42) |
| 18 | ward · FINAL line, full | 1 × 16 | 0.14 (0.34) |
| 19 | ward · C1, `bed` (4 tiles @ 1) | 3 × 93 | 0.08 (0.12) |
| 20 | ward · C1, `lamp` (tiles shared with 19) | — | 0.08 (0.12) |
| 21 | ward · C2, lamp → cuffs (4 tiles @ .78) | 3 × 102 | 0.18 (0.32) |
| 22–25 | screens on `setScreenFull('night')`: loss curve, chat (00C), calendar | 3 × 22 (shared layer) | 0.13–0.23 (≤ 0.82) |
| 26 | grey phone, group chat | 3 × 21 | 0.09 (0.26) |
| 27–28 | mum calling / greyed (06A/06B), full-frame phone | 3 × 21 (ash void) | 0.40–0.56 (0.83) ² |
| 29 | 503 | 3 × 21 | 0.08 (0.09) |
| 30–31 | outro line + her dots (12B/12D) | — | 0.14–0.23 (0.45) |
| 32–33 | three dots; ✓ ♥ ↻ + bubbles | 3 × 20 | 0.07–0.17 (0.41) |
| 34 | chart 01B, `cache: true, bg: 'indigo'` | 3 × 26 | 0.06 (0.10) (was 1.5–4.6 s drawn live) |
| 35 | chart 10B, line, `cache: true, bg: 'final'` | 1 × 5 | 0.05 (0.19) |
| 36 | confessional screen + ↻ | 3 × 32 (void) | 0.12 (0.42) |
| 37–38 | slot (09E spinning / 09F jackpot + confetti), `cache: true` | 3 × 21 | 0.17 (0.25) (was 0.36–3.1 s live) |
| 39–40 | black mirror, glass edge | — | 0.09–0.13 (0.17) |
| 41–42 | shards + halo swirl, ash | — (indigo void) | 0.17–0.19 (0.36) |
| 43–44 | black + ↻, flat line | 3 × 25 (black void) | 0.04–0.13 (0.23) |
| 45–46 | end cards | 3 × 32 (paper) | 0.03–0.05 (0.09) |

¹ measured before the door overlay became `knockOnly` (the sheet painted the whole door live over the baked one); the
five live photo frames are the price of 06E's dominoes (one greys and falls per beat, so no single baked state fits);
outside 06E bake them (`photos: 'up'` / `'fallen'`). ² the call screen (mum's painted photo, ripples, buttons) is live
at full-frame size; at the phone's size in 06A it is a fraction of that.
For scale: under the same load the real capture path (`--bench`, JPEG encode + transfer) took 6–8 s for an *empty*
frame, so on this box the machine, not the sets, dominated wall-clock time.

Rules of thumb for planning: a set framing costs **≈ 25–35 s per tile per boil drawing** to build on this box (≈ 10–15 s
quiet): a full room or ward view is 1–2 tiles (≈ 1.5 min for its 3 drawings), a close framing 4 tiles (≈ 4–6 min), once
per worker; a cut to a framing already built in that worker costs nothing. Cached, every set draws in ≤ 0.3 s per frame
(median ≤ 0.26 s under this load) except where a shot keeps detailed props live (photo dominoes, the call screen,
shirts in hand: 0.3–0.6 s); the characters are the real per-frame cost. A push or pull with a fixed `res` builds once;
with auto res it builds again at every step it crosses.

## Known limits / notes
- Tiles are opaque. A transparent cached layer gives white fringes on every brush edge (the pigment mixes with
  transparent "paper"), so sets that float in a void paint the void into their tiles.
- p5.brush outlines far off the canvas are several times slower than on it: tiles cull shapes by bounding box
  (`SET_CLIP`); props painted under their own p5 transform skip themselves with `setSkip`.
- Every colour change is a blend pass over the whole canvas: batch same-colour marks (`setFlakes`, `setConfetti`, the
  void dust).
- The falloff glazes are flat washes with visible (wobbly) edges, as a watercolourist's glazes would be; at close
  framings (zoom ≥ 1) a step can cross a face: light the character, don't fight the glaze.
- The room is a flat elevation (depth from overlap, scale, colour, the falloff and the floor band), so the chair is seen
  from behind and pushed right of the desk (the keyboard stays visible for 12C). Desk shots in profile (00B) use
  `himDeskProps`.
- `setBandCut` places its `PATIENT: YOU` lettering by its own point transform (letters ignore p5 transforms), so it
  works under any camera; don't wrap it in push/rotate.
