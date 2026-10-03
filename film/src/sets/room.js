// room.js: HIS ROOM (STORYBOARD §2 set 1, §7.2): one painted 3-wall panorama in world coordinates that every room shot
// frames with the 2D camera (camBegin), in 8 lighting variants. Static parts are cached in tiles (setTiles: 3 boil
// drawings, only the tiles a framing sees get painted); light, the screen and the snow are drawn live.
//
//   camBegin(...SET_ROOM.cam.desk);            // or any cx, cy, zoom
//   setRoom('night', { t });                   // the painted room + its live light (o.lights: false to skip)
//   him(...);                                  // characters, in world px (him standing in the room: u ≈ 31)
//   setRoomScreen(S => setChatScreen(S, t, {...}));   // what is on the monitor (default: her dim glow)
//   camEnd();
//
// Each variant bakes its light's falloff (SET_ROOM_SHADE: glazes darkening away from the screen / the window).
// Variants: 'night' (S00–S01), 'morning' (02A–02B), 'day' (02C–02E), 'dusk' (02F–S03, o.p 0..1 fades dusk → small
// hours), 'drained' (S06: desaturated, grey snow), 'black503' (S07), 'scan' (11A: the beam), 'dawn' (12C).
// World: 4660 × 2622, floor line y 2020, ceiling line y 520, corners at x 1700 and 3000 (left wall: bed, window, alarm
// clock; centre: desk, monitor, chair; right: wardrobe, photo ledge, frosted door). 1 m ≈ 560 px.

const SET_ROOM = {
  W: 4660, H: 2622, FL: 2020, CL: 520, A: 1700, B: 3000,
  bed: [370, 2046], night: [210, 2038], clock: [210, 1730], win: [620, 780, 660, 616], desk: [2350, 2046], monitor: [2330, 1590],
  screen: { x: 2132, y: 1204, w: 396, h: 246 }, keyboard: [2350, 1606], chair: [2690, 2084], robe: [3290, 2036],
  ledge: [3630, 4140, 1240], photos: [3702, 3802, 3898, 3992, 4088], door: [4380, 2030], lamp: [2350, 520],
  // framings [cx, cy, zoom] for camBegin(...)
  cam: {
    full: [2330, 1311, 1920 / 4660], bedWall: [880, 1430, .78], bed: [930, 1640, 1.15], window: [950, 1150, 1.2], clock: [300, 1660, 2.6],
    desk: [2350, 1500, .9], deskClose: [2350, 1450, 1.5], monitor: [2330, 1327, 2.4], keyboard: [2350, 1590, 3], chair: [2600, 1700, 1.2],
    rightWall: [3800, 1420, .72], photos: [3895, 1170, 2.2], door: [4380, 1450, .85], floor: [1500, 1804, 1]
  }
};

// ---------- palettes ----------
const SET_ROOM_SPEC = {
  day: { tint: '#FFE6BE', tintK: .06 },
  morning: { dark: .5, shadow: '#1C1828', tint: '#4E4258', tintK: .18, desat: .15 },
  night: { dark: .74, shadow: '#0A0D22', tint: '#2A3374', tintK: .26, desat: .35 },
  dusk: { dark: .42, shadow: '#1A1028', tint: '#8A4E72', tintK: .2, desat: .1 },
  drained: { desat: .68, dark: .2, shadow: '#262832', tint: '#8E95A6', tintK: .14, keep: ['photo', 'photoLt', 'photoDk', 'sil', 'silDk', 'clock', 'clockDk'], keepSpec: { desat: .1, dark: .1 } },
  black503: { dark: .93, shadow: '#05060A', desat: .5 },
  scan: { dark: .8, shadow: '#070B16', tint: '#1B2550', tintK: .22, desat: .5 },
  dawn: { dark: .26, shadow: '#2A2E44', tint: '#AAB2C8', tintK: .2, desat: .25 }
};
const SET_ROOM_SKY = {   // what the window shows: [sky, skyLt]
  day: ['#C7DCEA', '#F1F4F2'], morning: ['#F0B978', '#FFE0A8'], night: ['#121838', '#1E2858'], dusk: ['#D9806A', '#F4B484'],
  drained: ['#9EA3AE', '#C2C5CC'], black503: ['#07080D', '#0B0D14'], scan: ['#0B1028', '#151D3E'], dawn: ['#F6D8B0', SET_C.dawn]
};
function setRoomPal(v = 'day') {
  if (SET_PAL_CACHE['room ' + v]) return SET_PAL_CACHE['room ' + v];
  const sp = SET_ROOM_SPEC[v] || SET_ROOM_SPEC.day, [sky, skyLt] = SET_ROOM_SKY[v] || SET_ROOM_SKY.day;
  const P = setPalFrom(SET_BASE, sp, { sky, skyLt, name: v });
  P.screenOff = v === 'black503' ? '#06070C' : '#141628';
  if (v === 'night' || v === 'scan') P.ink = '#0B0C1C';
  P.unread = SET_C.unread; P.gold = setTone(SET_C.gold, sp);
  return (SET_PAL_CACHE['room ' + v] = P);
}
// per-variant defaults of what is baked into the cache (override with setRoom(v, { covers, door, blinds, photos, ... }))
const SET_ROOM_DEF = {
  day: { covers: 'rumpled' }, morning: { covers: 'lump' }, night: { covers: 'rumpled' }, dusk: { covers: 'rumpled' },
  drained: { covers: 'rumpled', snow: true }, black503: { covers: 'rumpled', photos: 'fallen', snow: true },
  scan: { covers: 'flat', door: .9, photos: 'fallen', snow: true }, dawn: { covers: 'flat', door: .9, blinds: .55, photos: 'fallen', snow: true }
};
function setRoomCfg(v, o = {}) {
  const d = SET_ROOM_DEF[v] || {};
  return { covers: o.covers ?? d.covers ?? 'rumpled', door: o.door ?? d.door ?? 0, blinds: o.blinds ?? d.blinds ?? 0, photos: o.photos ?? d.photos ?? 'up',
    snow: o.snow ?? d.snow ?? false, chair: o.chair ?? true, clock: o.clock ?? true, pillow: o.pillow ?? true };
}

// ---------- the painted room (static: cached) ----------
// Long straight edges are drawn in pieces no longer than a frame (p5.brush drops long strokes under zoom).
function setLongLine(x0, x1, y, sw, col, br = 'ink', wav = 0, seed = 0) {
  for (let a = x0; a < x1; a += 1400) { const b = Math.min(x1, a + 1400), P = []; for (let i = 0; i <= 6; i++) { const x = lerp(a, b, i / 6); P.push([x, y + wav * Math.sin(x * .013 + seed)]); } setL(P, sw, col, br, .5); }
}
function setRoomItems(v, cfg) {
  const P = setRoomPal(v), R = SET_ROOM, FL = R.FL, CL = R.CL, I = [];
  const add = (id, bb, draw) => I.push({ id, bb, draw });
  add('ceiling', [-5000, -5000, 9700, CL + 20], () => {
    setP(setClipBox(-5000, -3000, 9700, CL + 4), { wash: P.ceil, ink: null });
    setP(setClipBox(-5000, CL - 70, 9700, CL + 4), { wash: P.ceilDk, washOp: 140, ink: null });
    setLongLine(-5000, 9700, CL, 1, P.ink, 'ink', 2);
    setLongLine(-5000, 9700, CL + 18, .5, P.wallSh, 'inkfine', 1.5, 2);
  });
  const walls = [['wallL', -5000, R.A], ['wallC', R.A, R.B], ['wallR', R.B, 9700]];
  walls.forEach(([k, x0, x1], wi) => add('wall' + wi, [x0, CL, x1, FL], () => {
    setP(setClipBox(x0, CL, x1, FL), { wash: P[k], ink: null });
    const a = Math.max(x0, -600), b = Math.min(x1, 5200);
    const nb = wi === 1 ? 3 : 4;
    for (let i = 0; i < nb; i++) {
      const cx = lerp(a, b, (i + .5) / nb) + (hash(i * 3.7 + wi) - .5) * 200, cy = lerp(CL + 250, FL - 300, hash(i * 5.3 + wi * 2));
      boilSeed('room bloom' + wi + i);
      setP(ellPts(cx, cy, 280 + 160 * hash(i + wi * 9), 220 + 140 * hash(i * 2 + wi), 20, 14), { fill: i % 2 ? P.wallSh : mixCol(P[k], P.skirt, .6), fillOp: 85, bleed: .25, tex: .75, ink: null });
    }
    setP(setClipBox(x0, CL, x1, CL + 120), { wash: P.wallSh, washOp: 60, ink: null });
  }));
  for (const cx of [R.A, R.B]) add('corner' + cx, [cx - 260, CL, cx + 120, FL], () => {
    setP(setBox(cx - 240, CL, cx, FL), { fill: P.wallSh, fillOp: 70, bleed: .2, tex: .4, ink: null });
    setP(setBox(cx, CL, cx + 70, FL), { wash: P.wallSh, washOp: 80, ink: null });
    setL([[cx, CL], [cx + 2, (CL + FL) / 2], [cx, FL]], 1, P.ink, 'ink', .2);
  });
  add('skirting', [-5000, FL - 50, 9700, FL + 10], () => { setP(setClipBox(-5000, FL - 34, 9700, FL), { wash: P.skirt, ink: null }); setLongLine(-5000, 9700, FL - 34, .6, P.ink, 'inkfine'); setLongLine(-5000, 9700, FL, 1, P.ink, 'ink', 1, 5); });
  add('floor', [-5000, FL, 9700, 6000], () => {
    setP(setClipBox(-5000, FL, 9700, 6000), { wash: P.floor, ink: null });
    setP(setClipBox(-5000, FL, 9700, FL + 40), { wash: P.floorDk, washOp: 140, ink: null });
    for (let i = 0; i < 4; i++) { boilSeed('room floorbloom' + i); setP(ellPts(500 + i * 1250, FL + 260 + 120 * hash(i), 700, 170, 18, 12), { fill: i % 2 ? P.floorDk : P.floorLt, fillOp: 60, bleed: .2, tex: .7, ink: null }); }
    const ys = [26, 62, 108, 166, 238, 326, 432, 560, 700];
    ys.forEach((dy, i) => { boilSeed('room plank' + i); setLongLine(-5000, 9700, FL + dy, .45 + i * .06, P.floorDk, 'inkfine', 1.5, i); });
    for (let i = 0; i < 70; i++) { const row = i % 8, x = -400 + 5400 * hash(i * 7.31), y0 = FL + ys[row], y1 = FL + ys[row + 1]; boilSeed('room seam' + i); setL([[x, y0 + 2], [x + (y1 - y0) * .05, y1 - 2]], .4 + row * .05, P.floorDk, 'inkfine', 0); }
  });
  add('rug', [480, FL + 60, 1460, FL + 260], () => {
    setP(ellPts(970, FL + 160, 470, 82, 30, 3), { wash: P.rug, ink: P.ink, sw: .8 });
    setP(ellPts(970, FL + 160, 400, 58, 28, 2), { wash: null, ink: P.rugLt, sw: .6 });
    setP(ellPts(1000, FL + 175, 330, 40, 24, 2), { fill: P.rugDk, fillOp: 70, bleed: .15, ink: null });
  });
  const [wx, wy, ww, wh] = R.win;
  add('window', [wx - 80, wy - 60, wx + ww + 80, wy + wh + 70], () => setBlinds(wx, wy, ww, wh, { pal: P, open: cfg.blinds, key: 'room' }));
  add('nightstand', [80, 1700, 340, FL + 40], () => setNightstand(...R.night, 1, { pal: P }));
  if (cfg.clock) add('clock', [140, 1600, 280, 1740], () => setClock(...R.clock, 1, { pal: P, time: 7, t: 0 }));
  add('bed', [R.bed[0] - 20, R.bed[1] - 640, R.bed[0] + 1160, R.bed[1] + 10], () => setBed(...R.bed, 1, { pal: P, covers: cfg.covers, pillow: cfg.pillow }));
  add('lamp', [2250, CL - 10, 2450, 720], () => {
    setL([[2350, CL], [2350, 610]], .7, P.ink, 'ink', 0);
    setP([[2290, 700], [2300, 640], [2350, 612], [2400, 640], [2410, 700], [2350, 712]], { wash: P.sheet, ink: P.ink, sw: .8, curv: .4 });
    setP([[2300, 690], [2400, 690], [2410, 700], [2350, 712], [2290, 700]], { wash: P.sheetSh, washOp: 160, ink: null });
  });
  add('shelf', [1960, 760, 2640, 1030], () => {
    setP(setBox(1980, 1000, 2620, 1024, .6), { wash: P.woodLt, ink: P.ink, sw: .9 });
    for (const bx of [2020, 2580]) setP([[bx - 6, 1024], [bx + 6, 1024], [bx + 6, 1080], [bx - 6, 1060]], { wash: P.woodDk, ink: P.ink, sw: .6 });
    let x = 2010; const cols = [P.book1, P.book2, P.book3, P.book4, P.book5, P.book2, P.book1, P.book3, P.book5];
    cols.forEach((c, i) => { const w = 26 + 18 * hash(i * 2.1), h = 150 + 70 * hash(i * 3.3), lean = i === 8 ? .25 : 0; boilSeed('room book' + i);
      setP(setTf([[0, 0], [w, 0], [w, -h], [0, -h]], x, 1000, 1, lean), { wash: c, ink: P.ink, sw: .6 }); setL([[x + 5, 1000 - h * .82], [x + w - 5, 1000 - h * .82]], .4, mixCol(c, P.skirt, .5), 'inkfine', 0); x += w + 3 + (i === 7 ? 20 : 0); });
    boilSeed('room plant');
    setP([[2470, 1000], [2530, 1000], [2540, 940], [2460, 940]], { wash: P.pot, ink: P.ink, sw: .7 });
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .45; setP(ribbon([[2500, 945], [2500 + Math.cos(a) * 40, 945 + Math.sin(a) * 46], [2500 + Math.cos(a) * 66, 945 + Math.sin(a) * 82]], 14, 3), { wash: i % 2 ? P.plant : P.plantDk, ink: P.ink, sw: .5 }); }
  });
  add('corkboard', [2640, 1020, 2960, 1360], () => {   // pinned notes: paper and scribbles, never letters
    setP(setBox(2660, 1040, 2940, 1330, .8), { wash: P.woodLt, ink: P.ink, sw: .9 });
    setP(setBox(2676, 1056, 2924, 1314), { wash: mixCol(P.rug, P.woodLt, .55), ink: null });
    const notes = [[2700, 1080, 90, 80, P.page, -.06], [2805, 1070, 100, 120, P.photoLt, .05], [2700, 1180, 110, 100, P.page, .04], [2830, 1210, 80, 80, P.photo, -.08]];
    notes.forEach(([nx, ny, nw, nh, c, r], i) => { boilSeed('room note' + i);
      setP(setTf([[0, 0], [nw, 0], [nw, nh], [0, nh]], nx, ny, 1, r), { wash: c, ink: P.ink, sw: .5 });
      for (let j = 0; j < 3; j++) setL(setTf([[12, 22 + j * 18], [nw - 18 - 14 * hash(i + j), 24 + j * 18]], nx, ny, 1, r), .45, i === 1 ? P.sil : P.scrib, 'inkfine', .4);
      setP(ellPts(...setTf([[nw / 2, 8]], nx, ny, 1, r)[0], 6, 6, 8), { wash: i % 2 ? P.clock : P.book2, ink: null }); });
  });
  add('painting', [110, 1160, 350, 1460], () => {     // a small warm landscape over the nightstand
    setP(setBox(130, 1180, 330, 1440, .6), { wash: P.frame, ink: P.ink, sw: .8 });
    setP(setBox(146, 1196, 314, 1424), { wash: P.photoLt, ink: null });
    setP(ellPts(270, 1260, 26, 26, 14), { wash: P.photoDk, ink: null });
    setP([[146, 1424], [146, 1330], [200, 1300], [250, 1340], [314, 1310], [314, 1424]], { wash: P.plant, ink: null, curv: .4 });
    setP([[146, 1424], [146, 1380], [230, 1360], [314, 1395], [314, 1424]], { wash: P.plantDk, ink: null, curv: .4 });
  });
  add('desk', [1940, 1540, 2760, FL + 40], () => {
    setDesk(...R.desk, 1, { pal: P });
    setL([[2420, 1640], [2440, 1800], [2470, 1960], [2520, FL - 20]], .9, P.chairDk, 'ink', .6);
    setMug(2080, 1600, 1, { pal: P, pens: true });
    setP(ellPts(2540, 1604, 22, 9, 12), { wash: P.key, ink: P.ink, sw: .6 });
  });
  add('monitor', [2110, 1180, 2550, 1600], () => setMonitor(...R.monitor, 1, { pal: P }));
  add('keyboard', [2200, 1580, 2500, 1630], () => setKeyboard(...R.keyboard, 1, { pal: P }));
  if (cfg.chair) add('chair', [2510, 1500, 2860, FL + 90], () => setChair(...R.chair, 1, { pal: P, turn: .35 }));
  add('wardrobe', [3000, 880, 3580, FL + 40], () => setWardrobe(...R.robe, 1, { pal: P }));
  add('ledge', [R.ledge[0] - 20, 1080, R.ledge[1] + 20, 1300], () => {
    setP(setBox(R.ledge[0], R.ledge[2], R.ledge[1], R.ledge[2] + 22, .6), { wash: P.woodLt, ink: P.ink, sw: .8 });
    setP(setBox(R.ledge[0], R.ledge[2] + 22, R.ledge[1], R.ledge[2] + 44), { wash: P.wallSh, washOp: 90, ink: null });
    if (cfg.photos !== 'none') R.photos.forEach((px, i) => setPhotoFrame(px, R.ledge[2], 1, { pal: P, i, grey: cfg.photos === 'fallen' ? 1 : 0, rot: cfg.photos === 'fallen' ? 1.25 + .12 * hash(i) : 0, key: 'room' + i }));
  });
  add('door', [4120, 820, 4640, FL + 30], () => {
    setDoor(...R.door, 1, { pal: P, open: cfg.door });
    setP(rrPts(4080, 1330, 30, 46, 5), { wash: P.doorFrame, ink: P.ink, sw: .5 });
  });
  const sh = SET_ROOM_SHADE[v];
  if (sh) add('shade', [-1e5, -1e5, 1e5, 1e5], (x0, y0, x1, y1) => setShadeRings(sh).forEach(([rx, ry], i) => setShadeGlaze(sh.c[0], sh.c[1], rx, ry, sh.col, sh.op, x0, y0, x1, y1, i * 1.7 + 3)));
  if (cfg.snow) add('snow', [-400, FL - 10, 5200, 2700], () => {
    // the unread notifications that piled up on the floor (S06 on): drifts against the walls and the bed, fixed by hash
    const L = [];
    for (let i = 0; i < 120; i++) {
      const h1 = hash(i * 1.37 + .2), h2 = hash(i * 2.91 + 1.1), drift = i % 3 === 0 ? 300 + 1100 * h1 : -200 + 5000 * h1;
      const y = FL + 18 + 520 * Math.pow(h2, 1.6); L.push([drift, y, .8 + .9 * (y - FL) / 520, (hash(i * 4.4) - .5) * 1.6]);
    }
    setFlakes(L, { pal: P, op: 235 });
  });
  const si = I.findIndex(it => it.id === 'shade'); if (si >= 0) I.push(I.splice(si, 1)[0]);   // the falloff glazes go over everything
  return I;
}
// The light's falloff, baked into the tiles: glazes of a shadow colour, each one everywhere OUTSIDE a wobbly ellipse round
// the variant's light source (the monitor at night, the window by day), so the room darkens step by step away from it.
const SET_ROOM_SHADE = {   // c: the light; the glazes' ellipses grow from r0 to r1 in n steps (geometric), op each
  night: { c: [2330, 1420], r0: [520, 400], r1: [2500, 1700], n: 8, op: 30, col: '#04061A' },
  scan: { c: [2330, 1420], r0: [480, 370], r1: [2000, 1400], n: 7, op: 28, col: '#020309' },
  morning: { c: [1000, 1480], r0: [600, 480], r1: [2700, 1850], n: 8, op: 25, col: '#120F20' },
  dusk: { c: [950, 1200], r0: [800, 640], r1: [2700, 1850], n: 7, op: 22, col: '#1A0E26' },
  dawn: { c: [1350, 1250], r0: [1000, 760], r1: [3000, 2000], n: 6, op: 19, col: '#262A40' },
  day: { c: [950, 1150], r0: [1500, 1100], r1: [3000, 2000], n: 4, op: 15, col: '#5E4A3A' },
  drained: { c: [2330, 1400], r0: [1700, 1250], r1: [3200, 2100], n: 4, op: 15, col: '#30323C' }
};
const setShadeRings = sh => Array.from({ length: sh.n }, (_, i) => { const k = sh.n > 1 ? i / (sh.n - 1) : 0; return [sh.r0[0] * Math.pow(sh.r1[0] / sh.r0[0], k), sh.r0[1] * Math.pow(sh.r1[1] / sh.r0[1], k)]; });
function setShadeGlaze(cx, cy, rx, ry, col, op, x0, y0, x1, y1, seed = 0) {
  if (SET_MODE === 'line') return;
  const m = 90, X0 = x0 - m, Y0 = y0 - m, X1 = x1 + m, Y1 = y1 + m, w = a => 1 + .06 * Math.sin(3 * a + seed) + .035 * Math.sin(5 * a + 2.3 * seed);
  const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < .85;
  if (inside(X0, Y0) && inside(X1, Y0) && inside(X0, Y1) && inside(X1, Y1)) return;      // the tile is all lit
  boilSeed('room shade ' + seed);
  if (cx + rx * 1.1 < X0 || cx - rx * 1.1 > X1 || cy + ry * 1.1 < Y0 || cy - ry * 1.1 > Y1) { paint(setBox(X0, Y0, X1, Y1), { wash: col, washOp: op, ink: null }); return; }
  const bx0 = Math.min(X0, cx - rx * 1.2), by0 = Math.min(Y0, cy - ry * 1.2), bx1 = Math.max(X1, cx + rx * 1.2), by1 = Math.max(Y1, cy + ry * 1.2), hole = [];
  for (let i = 0; i <= 72; i++) { const a = Math.PI - i / 72 * TAU, k = w(a); hole.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  paint([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1], [bx0, cy], ...hole, [bx0, cy + .5]], { wash: col, washOp: op, ink: null });   // a slit polygon: everything but the hole
}
// Paint the room under the active camera (its tiles), plus its live light. o: t, res (fix the cache resolution for
// a camera move), lights (false: none; call setRoomLights yourself, e.g. after the characters), p (dusk 0..1 → small
// hours), and the baked state: covers 'flat'|'rumpled'|'lump'|'none', door 0..1, blinds 0..1, photos 'up'|'fallen'|'none',
// snow, chair, clock, pillow (false: leave that prop out of the cache and draw it live).
function setRoom(v = 'night', o = {}) {
  const cfg = setRoomCfg(v, o), key = `setroom ${v} ${cfg.covers} d${cfg.door} b${cfg.blinds} ${cfg.photos} ${cfg.snow ? 's' : ''}${cfg.chair ? 'c' : ''}${cfg.clock ? 'k' : ''}${cfg.pillow ? 'p' : ''}`;
  const items = setRoomItems(v, cfg);
  const draw = (x0, y0, x1, y1) => { for (const it of items) if (setHit(it.bb, x0, y0, x1, y1)) { boilSeed('room ' + it.id); it.draw(x0, y0, x1, y1); } };
  if (v === 'dusk') {   // dusk → small hours: the night painting fades in over the dusk one (2 boil drawings each, so the
    // two tile sets of a close framing stay inside the page's 24-layer cache)
    setTiles(key, draw, { ...o, variants: 2 });
    if ((o.p || 0) > 0) {
      const cfgN = setRoomCfg('night', { ...cfg, ...o }), itemsN = setRoomItems('night', cfgN);
      setTiles(key.replace('dusk', 'night'), (x0, y0, x1, y1) => { for (const it of itemsN) if (setHit(it.bb, x0, y0, x1, y1)) { boilSeed('room ' + it.id); it.draw(x0, y0, x1, y1); } }, { ...o, alpha: clamp(o.p), variants: 2 });
    }
  } else setTiles(key, draw, o);
  if (o.lights !== false) setRoomLights(v, o);
  return cfg;
}
// The room's light for a variant (live, additive). o.t, o.screen 0..1 (monitor brightness, default per variant),
// o.p (dusk → small hours), o.beam (scan: the beam's angle in radians, 0 = right, π = left; default sweeps with t),
// o.beamK, o.coverGlow 0..1 (morning: the cyan glow inside the lump of covers), o.lump (x of the lump), o.stripes 0..1.
function setRoomLights(v, o = {}) {
  const R = SET_ROOM, sc = R.screen, mx = sc.x + sc.w / 2, my = sc.y + sc.h / 2, t = o.t ?? T, [wx, wy, ww, wh] = R.win;
  const scr = o.screen ?? { night: 1, morning: 0, day: .3, dusk: .7, drained: .8, black503: 0, scan: 0, dawn: .3 }[v] ?? .5;
  if (scr > 0) {
    const col = o.screenCol || (v === 'dawn' ? SET_C.amber : SET_C.cyan);   // 12C: her amber line is all that is on it
    glow(mx, my, sc.w * 1.6, col, .8 * scr); glow(mx, my + 120, 1300, col, (v === 'night' ? .5 : .25) * scr);
    if (v === 'night' || v === 'drained') { glow(mx, my - 60, 760, col, .3 * scr); glow(R.desk[0], R.FL - 470, 640, col, .3 * scr); }   // her light on the wall and the desk top
    glow(R.keyboard[0], R.keyboard[1], 260, col, .45 * scr); glow(mx, R.FL + 60, 520, col, .18 * scr);
  }
  const BG = setBlindsGeom(wx, wy, ww, wh, o.blinds ?? (SET_ROOM_DEF[v] || {}).blinds ?? 0), gaps = BG.gaps;
  if (v === 'morning' || (v === 'day' && (o.stripes ?? 1))) {   // 02A: thin warm light leaking between the slats, and falling on the bed
    const k = (o.stripes ?? 1) * (v === 'day' ? .45 : 1), col = '#FFC27A';
    gaps.forEach((gy, i) => { if (i % 2) return; setShaft([wx + 10, gy], [wx + ww - 10, gy], 7, col, .55 * k); });
    for (let i = 0; i < 7; i++) { const sx = wx + 120 + i * 80, sy = 1640 + (i % 3) * 18; setShaft([sx, sy], [sx + 230, sy + 60], 12, col, .4 * k); }
    glow(wx + ww / 2, wy + wh / 2, 420, col, .2 * k);
  }
  if (v === 'day') glow(wx + ww / 2, wy + wh / 2, 900, '#FFF2D8', .3);
  if (v === 'dusk') { const p = clamp(o.p || 0); glow(wx + ww / 2, wy + wh * .55, 640, '#FF9A6A', .5 * (1 - p)); glow(wx + ww / 2, wy + wh / 2, 1000, '#B07ACC', .28 * (1 - p)); glow(mx, my, 900, SET_C.cyan, .35 * p); }
  if ((o.coverGlow ?? (v === 'morning' ? 1 : 0)) > 0) {   // the screen under the duvet: the only sun in town
    const k = o.coverGlow ?? 1, lx = R.bed[0] + (o.lump ?? 640);
    glow(lx, R.bed[1] - 420, 460, SET_C.cyan, .75 * k); glow(lx, R.bed[1] - 380, 240, SET_C.cyanW, .5 * k);
  }
  if (v === 'scan') {      // 11A: her small amber light sweeps the dark room like a lighthouse
    const ang = o.beam ?? (Math.PI / 2 + .9 * Math.sin(t * .9)), k = o.beamK ?? 1;
    setCone(mx, my, ang, 2900, .3, SET_C.amber, .55 * k); setCone(mx, my, ang, 1600, .16, '#FFD9A8', .35 * k);
    glow(mx, my, 260, SET_C.amber, .7 * k);
  }
  const door = o.door ?? (SET_ROOM_DEF[v] || {}).door ?? 0;
  if (door > 0 && v !== 'black503') {   // warm light from outside through the gap
    const gx = R.door[0] - 204 + 150 * door;
    glow(gx, R.door[1] - 600, 420, SET_C.amber, .45); setShaft([gx, R.door[1] - 1140], [gx, R.door[1] - 10], 150 * door, '#FFD9A0', .5);
    setShaft([gx - 40, R.door[1] + 10], [gx - 520, R.door[1] + 260], 160, '#FFD9A0', .3);
  }
  if (v === 'dawn') {      // 12C: the real morning light, paler and yellower than her amber, through the raised blinds
    const k = o.stripes ?? 1, col = SET_C.dawn, oy = BG.openY;
    glow(wx + ww / 2, (oy + wy + wh) / 2, 560, col, .5 * k);
    for (let i = 0; i < 6; i++) { const y0 = oy + 30 + i * (wy + wh - oy - 40) / 6; setShaft([wx + ww + 40, y0], [2860, y0 + 330 + i * 18], 40, col, .28 * k); }
    for (let i = 0; i < 6; i++) { const y0 = oy + 50 + i * (wy + wh - oy - 40) / 6; setShaft([wx + 60, y0 + 200], [wx + 520, y0 + 520], 30, col, .3 * k); }
  }
}
// What the monitor shows, drawn live in its rect: fn(S) (e.g. S => setChatScreen(S, t, {...})), or kind 'glow' (her dim
// light: a glass and a few glowing bars), 'off'. o.k brightness for 'glow', o.col.
function setRoomScreen(fn = 'glow', o = {}) {
  const sc = SET_ROOM.screen, S = setScr(sc.x, sc.y, sc.w, sc.h);
  if (typeof fn === 'function') return fn(S);
  if (fn === 'off') return S;
  const k = o.k ?? 1;
  setScreenGlass(S, 'night', { bright: .4 * k, key: 'room' });
  boilSeed('roomscreen bars');
  for (let i = 0; i < 4; i++) setP(rrPts(S.X(i % 2 ? .45 : .1), S.Y(.18 + i * .17), S.w * (i % 2 ? .42 : .34), S.h * .07, S.h * .03), { wash: i % 2 ? '#3A2E36' : (o.col || SET_C.cyan), washOp: 230 * k, ink: null });
  return S;
}
// Grey snow falling live (S06): n flakes drifting down across the framing, settling on the floor. o.t, o.n (≤ 40).
function setRoomSnow(o = {}) {
  const t = o.t ?? T, n = Math.min(40, o.n ?? 24), P = setRoomPal('drained'), cam = CAM || { cx: W / 2, cy: H / 2, zoom: 1 };
  const x0 = cam.cx - W / 2 / cam.zoom, w = W / cam.zoom, y0 = cam.cy - H / 2 / cam.zoom, h = H / cam.zoom;
  const L = [];
  for (let i = 0; i < n; i++) {
    const sp = 60 + 50 * hash(i * 3.3), ph = hash(i * 1.9), k = frac(ph + t * sp / h), x = x0 + w * hash(i * 7.7) + 30 * Math.sin(t * .8 + i), y = y0 + k * h;
    L.push([x, y, .7 + .5 * hash(i), Math.sin(t * 1.3 + i) * .7, 220 * Math.sin(k * Math.PI)]);
  }
  boilSeed('roomsnow'); setFlakes(L, { pal: P });
}
// A ripple spreading over the grey snow on the floor (06A: each phone buzz). age s, r0 px.
function setSnowRipple(x, y, age, r0 = 60) {
  if (age < 0 || age > 1.2) return;
  const k = age / 1.2, r = r0 + 420 * easeOut(k);
  boilSeed('snowripple' + Math.floor(age * 12));
  setP(ellPts(x, y, r, r * .22, 30), { wash: null, ink: '#C9CCD3', sw: 1.2 * (1 - k) + .2 });
  if (k < .6) setP(ellPts(x, y, r * .7, r * .15, 26), { wash: null, ink: '#A8ACB5', sw: .8 * (1 - k / .6) });
}

// ---------- top-down surfaces (insert shots) ----------
// setSurface(kind, v, o): a frame-sized top-down painting, world 0..1920 × 0..1080 (frame it with
// camBegin(960, 540, zoom)). kind 'desk' (01A, 02D: wood top, the keyboard's edge along the top) | 'bed' (03B, 06F, 06G:
// sheet, pillow at the top, the duvet's edge at the bottom). v = room variant (palette). o.res as setTiles.
function setSurface(kind = 'desk', v = 'night', o = {}) {
  const P = setRoomPal(v);
  setTiles(`setsurface ${kind} ${v}`, () => {
    if (kind === 'desk') {
      boilSeed('surf desk'); setP(setBox(-200, -200, 2120, 1280), { wash: P.wood, ink: null });
      for (let i = 0; i < 6; i++) { boilSeed('surf deskbloom' + i); setP(ellPts(200 + i * 330, 300 + 500 * hash(i), 380, 160, 18, 10), { fill: i % 2 ? P.woodDk : P.woodLt, fillOp: 70, bleed: .2, tex: .8, ink: null }); }
      for (let i = 0; i < 26; i++) { boilSeed('surf grain' + i); const y = -40 + i * 46 + 10 * hash(i); setL([[-200, y], [400, y + 8 * Math.sin(i)], [1000, y - 6], [1500, y + 5], [2120, y]], .5, P.woodDk, 'inkfine', .5); }
      for (let i = 0; i < 4; i++) { boilSeed('surf knot' + i); const kx = 300 + 1400 * hash(i * 9.1), ky = 200 + 700 * hash(i * 4.2); setP(ellPts(kx, ky, 40, 14, 14), { wash: null, ink: P.woodDk, sw: .6 }); }
      boilSeed('surf kb');      // the keyboard's near edge along the top of the frame
      setP([[260, -60], [1660, -60], [1640, 150], [280, 150]], { wash: P.key, ink: P.ink, sw: 1.4 });
      for (let r = 0; r < 3; r++) for (let i = 0; i < 16; i++) { const x = 300 + i * 84 + r * 20, y = -20 + r * 56; setP(rrPts(x, y, 70, 44, 8), { wash: mixCol(P.key, '#FFFFFF', .2), ink: P.keyDk, sw: .6 }); }
      setP([[280, 150], [1640, 150], [1640, 168], [280, 168]], { wash: P.shadow, washOp: 120, ink: null });
      boilSeed('surf ring'); setP(ellPts(1650, 820, 110, 106, 26), { wash: null, ink: P.woodDk, sw: .7 });
    } else {
      boilSeed('surf bed'); setP(setBox(-200, -200, 2120, 1280), { wash: P.sheet, ink: null });
      for (let i = 0; i < 5; i++) { boilSeed('surf bedbloom' + i); setP(ellPts(300 + i * 360, 500 + 300 * hash(i), 420, 200, 20, 12), { fill: P.sheetSh, fillOp: 60, bleed: .25, tex: .5, ink: null }); }
      for (let i = 0; i < 9; i++) { boilSeed('surf fold' + i); const x = 120 + 1700 * hash(i * 3.1), y = 260 + 600 * hash(i * 5.9); setL([[x, y], [x + 120, y + 30 * Math.sin(i)], [x + 260, y - 10]], .7, P.sheetSh, 'inkfine', .6); }
      boilSeed('surf pillow');
      setP([[260, -80], [1660, -80], [1700, 120], [1660, 300], [960, 330], [260, 300], [220, 120]], { wash: P.pillow, ink: P.ink, sw: 1.4, curv: .4 });
      setP([[300, 230], [960, 280], [1620, 230], [1650, 290], [960, 320], [270, 290]], { wash: P.pillowSh, washOp: 170, ink: null, curv: .4 });
      boilSeed('surf duvet');
      setP([[-200, 840], [500, 800], [1000, 860], [1500, 790], [2120, 830], [2120, 1280], [-200, 1280]], { wash: P.cover, ink: P.ink, sw: 1.4, curv: .4 });
      setP([[-200, 840], [500, 800], [1000, 860], [1500, 790], [2120, 830], [2120, 900], [-200, 900]], { wash: P.coverLt, washOp: 200, ink: null, curv: .4 });
      for (let i = 0; i < 5; i++) setL([[i * 420 + 60, 900], [i * 420 + 120, 1000], [i * 420 + 90, 1120]], .9, P.coverDk, 'inkfine', .6);
    }
  }, o);
}
