// ward.js: THE WARD, the chorus room (STORYBOARD §2 set 2, §7.2): a hospital-bed island floating in a void, a giant ring
// surgical lamp over it, an IV stand with glowing token bags, the chart clipboard on the footboard. Three variants:
//   'c1'    S04: indigo void, cyan light, magenta fever
//   'c2'    S08: blood red, slow rotating alarm-light bands, several IV tubes (she is giant; she stays cyan)
//   'final' S10: the whole ward drawn as a clean cyan line drawing on navy (no washes, no boil)
//
//   camBegin(...SET_WARD.cam.full);
//   setWard('c1', { t });            // the void + the island (cached, opaque world tiles) + live light
//   setWardTubes('c1', { t, to: [[x, y]] });   // drip tubes to his arm (live; default to the pillow)
//   him(...); ai(...);
//   camEnd();
// World: 3840 × 2700. Island top centre (1920, 1890), rx 920; bed head x 1300 → foot x 2400, mattress top y 1540
// (room scale: him u ≈ 31); ring lamp centre (1850, 830); IV stand base (1180, 1905); chart on the footboard (2482, 1562).
// The island's right edge (x ≈ 2840) is the "exit" of 04C / 08C.

const SET_WARD = {
  W: 3840, H: 2700, island: [1920, 1890, 920, 110], bed: { x0: 1300, x1: 2400, top: 1540, floor: 1905 }, pillow: [1450, 1540],
  lamp: [1850, 830], iv: [1180, 1905], chart: [2482, 1562], exit: 2840,
  cam: { full: [1920, 1400, .55], lamp: [1850, 820, 1], bed: [1850, 1560, 1], side: [1990, 1560, .74], exit: [2600, 1700, .9], chart: [2482, 1560, 3.2], under: [1920, 2250, .7] }
};
const SET_WARD_PALS = {
  c1: { island: '#2E3A6E', islandTop: '#3E4D86', islandDk: '#151B44', tile: '#5868A4', metal: '#8C9CC8', metalDk: '#4A5888', metalLt: '#C6D0EC',
    sheet: '#C8D4F0', sheetSh: '#8E9CC8', blanket: '#5266B0', blanketDk: '#36468A', blanketLt: '#7A8CD0', pillow: '#DCE4F6', pillowSh: '#A6B2D6',
    ink: '#0C0F28', inkSoft: '#3A4478', shadow: '#0A0C22', cable: '#24306A', voidA: '#121738', voidB: '#2F3C7A', voidC: '#3A2A6A', voidD: '#0E3A5A',
    ivMetal: '#9AAAD0', ivMetalDk: '#5A6898', bag: '#BDEFF7', liquid: '#7FE9FF', token: '#E8FDFF', tube: '#A8E8F4',
    lampBody: '#C9D4EC', lampDk: '#5A6898', lampCell: '#E8FDFF', board: '#6E5A8A', boardDk: '#4A3A66', clip: '#B9C2DC', page: '#E6E8F2', pageSh: '#B4BAD4',
    light: SET_C.cyan, lamp: SET_C.cyan, fever: SET_C.fever },
  c2: { island: '#4A0E1E', islandTop: '#6A1628', islandDk: '#24040E', tile: '#8A2A3E', metal: '#B07A88', metalDk: '#6A2A3A', metalLt: '#E0B4BE',
    sheet: '#E8C2CA', sheetSh: '#B07A88', blanket: '#8A1A30', blanketDk: '#5A0A1E', blanketLt: '#B03A50', pillow: '#F0D2D8', pillowSh: '#C2909A',
    ink: '#1A0408', inkSoft: '#5A1A28', shadow: '#14020A', cable: '#5A0A1E', voidA: '#1E030A', voidB: '#5A0A1E', voidC: '#B0002A', voidD: '#3A0A2A',
    ivMetal: '#C8A0A8', ivMetalDk: '#7A3A48', bag: '#BDEFF7', liquid: '#7FE9FF', token: '#E8FDFF', tube: '#A8E8F4',
    lampBody: '#DCBCC4', lampDk: '#6A2A3A', lampCell: '#FFE0E6', board: '#6A2A2A', boardDk: '#4A1414', clip: '#D0B4BA', page: '#F0DCD8', pageSh: '#C8A8A8',
    light: SET_C.cyan, lamp: '#FF8095', fever: SET_C.fever, alarm: '#FF2E63' },
  final: { voidA: '#070B16', voidB: '#0B1430', line: SET_C.cyan, light: SET_C.cyan, lamp: SET_C.cyan, liquid: SET_C.cyan, tube: '#7FE9FF', token: SET_C.cyanW }
};
function setWardPal(v = 'c1') {
  const k = 'ward ' + v;
  if (SET_PAL_CACHE[k]) return SET_PAL_CACHE[k];
  return (SET_PAL_CACHE[k] = { ...SET_BASE, ...SET_WARD_PALS.c1, ...SET_WARD_PALS[v], name: v });
}

// ---------- the void as a screen-space background (for inserts like 10B's chart; setWard paints its own in world space) ----------
function setWardVoid(v = 'c1', o = {}) {
  const P = setWardPal(v), cam = CAM || { cx: 1920, cy: 1400 };
  setScreenLayer('setwardvoid ' + v, () => {
    boilSeed('wv bg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: P.voidA, ink: null });
    if (v === 'final') {      // blueprint navy with a faint grid
      paint(ellPts(W / 2, H * .55, W * .5, H * .45, 30, 10), { wash: P.voidB, washOp: 120, ink: null });
      for (let i = 0; i <= 16; i++) { boilSeed('wv gx' + i); inkLine([[i * 120, -20], [i * 120, H + 20]], .35, '#123060', 'inkfine', 0); }
      for (let j = 0; j <= 9; j++) { boilSeed('wv gy' + j); inkLine([[-20, j * 120], [W + 20, j * 120]], .35, '#123060', 'inkfine', 0); }
      return;
    }
    const bl = [[.25, .3, .38, .3, P.voidB, 120], [.75, .25, .3, .26, P.voidC, 90], [.5, .8, .5, .3, P.voidB, 90], [.85, .7, .25, .25, P.voidD, 90], [.12, .75, .22, .3, P.voidC, 70], [.5, .45, .3, .25, P.voidD, 60]];
    bl.forEach(([x, y, rx, ry, c, op], i) => { boilSeed('wv bloom' + i); paint(ellPts(W * x, H * y, W * rx, H * ry, 24, 30), { fill: c, fillOp: op, bleed: .3, tex: .6, ink: null }); });
    for (let i = 0; i < 90; i++) { boilSeed('wv dust' + i); const r = .8 + 2.4 * hash(i * 4.3); paint(ellPts(W * hash(i * 3.17), H * hash(i * 7.91), r, r, 6), { wash: i % 4 ? P.voidB : P.tube, washOp: 90 + 100 * hash(i), ink: null }); }
  }, { par: [-(cam.cx - 1920) * .05 * (cam.zoom || 1), -(cam.cy - 1400) * .05 * (cam.zoom || 1)], variants: v === 'final' ? 1 : 3 });
}

// ---------- the island and the hospital things (world space, cached) ----------
function setHospBed(P, o = {}) {
  const B = SET_WARD.bed, sw = 1, x0 = B.x0, x1 = B.x1, top = B.top, fl = B.floor;
  boilSeed('hosp shadow'); setP(ellPts((x0 + x1) / 2, fl + 4, (x1 - x0) / 2 + 40, 22, 22), { wash: P.shadow, washOp: 150, ink: null });
  for (const wx of [x0 + 70, x1 - 70]) {      // casters and legs
    boilSeed('hosp leg' + wx);
    setP(setBox(wx - 9, top + 150, wx + 9, fl - 34), { wash: P.metal, ink: P.ink, sw: sw * .8 });
    setP([[wx - 16, fl - 36], [wx + 16, fl - 36], [wx + 10, fl - 18], [wx - 10, fl - 18]], { wash: P.metalDk, ink: P.ink, sw: sw * .6 });
    setP(ellPts(wx + 4, fl - 14, 15, 15, 12), { wash: P.metalDk, ink: P.ink, sw: sw * .7 });
  }
  boilSeed('hosp frame');
  setP(setBox(x0 + 10, top + 140, x1 - 10, top + 172, .6), { wash: P.metalDk, ink: P.ink, sw });
  setP(setBox(x0 + 4, top + 60, x1 - 4, top + 92, .6), { wash: P.metal, ink: P.ink, sw });
  setL([[x0 + 60, top + 92], [x0 + 260, top + 140]], sw * 1.2, P.metalDk, 'ink', 0);
  setL([[x1 - 60, top + 92], [x1 - 260, top + 140]], sw * 1.2, P.metalDk, 'ink', 0);
  boilSeed('hosp mattress');
  setP(rrPts(x0 + 14, top, x1 - x0 - 28, 64, 20, 1), { wash: P.sheet, ink: P.ink, sw: sw * .9 });
  setP([[x0 + 24, top + 40], [x1 - 24, top + 40], [x1 - 26, top + 58], [x0 + 26, top + 58]], { wash: P.sheetSh, washOp: 180, ink: null });
  boilSeed('hosp head');       // tubular head- and footboards
  setP([[x0 - 30, top + 92], [x0 - 30, top - 210], [x0 - 18, top - 236], [x0 + 6, top - 244], [x0 + 22, top - 232], [x0 + 26, top - 210], [x0 + 26, top + 92]], { wash: P.metalLt, ink: P.ink, sw, curv: .2 });
  setP(setBox(x0 - 18, top - 200, x0 + 14, top + 40), { wash: P.metal, ink: P.ink, sw: sw * .6 });
  setP([[x1 - 22, top + 92], [x1 - 22, top - 90], [x1 - 10, top - 112], [x1 + 14, top - 120], [x1 + 30, top - 108], [x1 + 34, top - 90], [x1 + 34, top + 92]], { wash: P.metalLt, ink: P.ink, sw, curv: .2 });
  setP(setBox(x1 - 10, top - 80, x1 + 22, top + 40), { wash: P.metal, ink: P.ink, sw: sw * .6 });
  if (o.pillow !== false) { boilSeed('hosp pillow'); setPillow(SET_WARD.pillow[0], top + 4, .85, { pal: P, key: 'ward' }); }
  if (o.blanket !== false) {
    boilSeed('hosp blanket');
    const bx0 = x0 + 430, top2 = [], hem = [];
    for (let i = 0; i <= 12; i++) { const x = lerp(bx0, x1 - 14, i / 12); top2.push([x, top - 12 - 6 * Math.sin(i * 1.4)]); }
    for (let i = 12; i >= 0; i--) { const x = lerp(bx0 - 6, x1 - 8, i / 12); hem.push([x + 5 * Math.sin(i * 2.3), top + 128 + 10 * Math.sin(i * 1.9)]); }
    setP([[bx0 - 10, top + 20], ...top2, [x1 - 10, top + 40], ...hem], { wash: P.blanket, ink: P.ink, sw: sw * .9, curv: .3 });
    setP([[bx0 - 14, top - 18], [bx0 + 70, top - 22], [bx0 + 76, top + 128], [bx0 - 8, top + 124]], { wash: P.blanketLt, ink: P.ink, sw: sw * .7, curv: .2 });
    for (let i = 0; i < 4; i++) setL([[bx0 + 180 + i * 130, top + 10], [bx0 + 170 + i * 130, top + 70], [bx0 + 190 + i * 130, top + 122]], .6, P.blanketDk, 'inkfine', .6);
  }
}
// The void painted into the world tiles (opaque tiles: brush edges on a transparent layer fringe white): a flat ground,
// watercolour blooms on a hashed 1400 × 1100 world grid (continuous across tiles), dust; 'final' gets a blueprint grid.
function setWardVoidTile(P, v, x0, y0, x1, y1) {
  paint(setBox(x0 - 30, y0 - 30, x1 + 30, y1 + 30), { wash: P.voidA, ink: null });
  if (v === 'final') {
    for (let gx = Math.ceil(x0 / 240) * 240; gx < x1; gx += 240) { boilSeed('wv gx' + gx); setL([[gx, y0], [gx, y1]], .45, '#123060', 'inkfine', 0, { lineCol: '#163A6E', lineSw: .45 }); }
    for (let gy = Math.ceil(y0 / 240) * 240; gy < y1; gy += 240) { boilSeed('wv gy' + gy); setL([[x0, gy], [x1, gy]], .45, '#123060', 'inkfine', 0, { lineCol: '#163A6E', lineSw: .45 }); }
    return;
  }
  const CW = 2400, CH = 1800, cols = [P.voidB, P.voidC, P.voidB, P.voidD];
  for (let gy = Math.floor((y0 - 900) / CH); gy * CH < y1 + 900; gy++) for (let gx = Math.floor((x0 - 900) / CW); gx * CW < x1 + 900; gx++) {
    const h = hash(gx * 13.7 + gy * 71.3), cx = gx * CW + 500 + 1400 * h, cy = gy * CH + 400 + 1000 * hash(h * 91 + gx), rx = 760 + 480 * hash(h * 37), ry = 560 + 340 * hash(h * 53);
    if (cx + rx < x0 - 60 || cx - rx > x1 + 60 || cy + ry < y0 - 60 || cy - ry > y1 + 60) continue;
    boilSeed('wv bloom' + gx + ',' + gy);
    paint(ellPts(cx, cy, rx, ry, 24, 30), { fill: cols[Math.floor(h * 4)], fillOp: 70 + 50 * hash(h * 7), bleed: .3, tex: .6, ink: null });
  }
  for (let k = 0; k < 2; k++) for (let gy = Math.floor(y0 / 500); gy * 500 < y1; gy++) for (let gx = Math.floor(x0 / 500); gx * 500 < x1; gx++) {   // dust, one colour at a time
    const h = hash(gx * 3.1 + gy * 17.9 + k * 5.3), x = gx * 500 + 500 * h, y = gy * 500 + 500 * hash(h * 13), r = .8 + 2.6 * hash(h * 29);
    boilSeed('wv dust' + gx + ',' + gy + k); paint(ellPts(x, y, r, r, 6), { wash: k ? P.tube : P.voidB, washOp: 160, ink: null });
  }
}
function setWardItems(v, cfg) {
  const P = setWardPal(v), I = [], add = (id, bb, draw) => I.push({ id, bb, draw }), [icx, icy, irx, iry] = SET_WARD.island;
  add('void', [-1e5, -1e5, 1e5, 1e5], (x0, y0, x1, y1) => setWardVoidTile(P, v, x0, y0, x1, y1));
  add('island', [icx - irx - 60, icy - iry - 40, icx + irx + 60, 2700], () => {
    // the underside: a tapering mass dissolving into the void, with cables hanging off it
    const und = [[icx - irx, icy + 40]]; for (let i = 0; i <= 10; i++) { const k = i / 10, x = lerp(icx - irx, icx + irx, k); und.push([x, icy + 70 + 520 * Math.pow(Math.sin(k * Math.PI), 1.3) + 60 * hash(i * 3.3)]); } und.push([icx + irx, icy + 40]);
    setP(und, { wash: P.islandDk, ink: null, curv: .4 });
    if (SET_MODE !== 'line') { setP(und.map(([x, y]) => [lerp(x, icx, .2), lerp(y, icy + 200, .3)]), { fill: P.voidA, fillOp: 140, bleed: .3, tex: .5, ink: null }); }
    else for (let i = 1; i < 10; i += 2) setL([und[i], [lerp(und[i][0], icx, .3), und[i][1] + 120]], .6, null, 'inkfine', .3);
    for (let i = 0; i < 7; i++) { const cx = icx - irx * .8 + irx * 1.6 * hash(i * 2.9), cy = icy + 90 + 260 * Math.sin(clamp((cx - icx + irx) / (2 * irx)) * Math.PI) * hash(i), L = 200 + 400 * hash(i * 5.1);
      boilSeed('island cable' + i); setL(setSag([cx, cy], [cx + 60 * (hash(i) - .5) * 2, cy + L], 40, 6), 1, P.cable, 'ink', .5); }
    // the edge band and the top
    const front = ellPts(icx, icy, irx, iry, 40).filter(p => p[1] >= icy - 1).sort((a, b) => a[0] - b[0]);
    setP([...front, ...front.slice().reverse().map(([x, y]) => [x, y + 64])], { wash: P.island, ink: P.ink, sw: 1.1 });
    setP(ellPts(icx, icy, irx, iry, 48, 1.5), { wash: P.islandTop, ink: P.ink, sw: 1.1 });
    for (const k of [.78, .55]) setP(ellPts(icx, icy + iry * .08, irx * k, iry * k, 40), { wash: null, ink: P.tile, sw: .6, line: true, lineSw: .5 });
    for (let i = -4; i <= 4; i++) { const x = icx + i * irx * .21, h = iry * Math.sqrt(Math.max(0, 1 - (i * .21) ** 2)); setL([[x, icy - h * .92], [x + i * 6, icy + h * .92]], .5, P.tile, 'inkfine', 0, { lineSw: .4 }); }
  });
  add('bed', [SET_WARD.bed.x0 - 60, SET_WARD.bed.top - 260, SET_WARD.bed.x1 + 60, SET_WARD.bed.floor + 30], () => setHospBed(P, cfg));
  if (cfg.chart) add('chart', [2380, 1420, 2580, 1680], () => {
    const [cx, cy] = SET_WARD.chart;
    setL([[2412, 1428], [2440, 1440], [cx, cy - 76]], .8, P.metalDk, 'ink', .4);
    setChart(cx, cy, .16, { pal: P, mini: true, style: SET_MODE, ecg: { t: 2 } });   // fixed t: cached content must not follow the frame
  });
  if (cfg.iv) add('iv', [1040, 960, 1320, 1930], () => {
    const H = setIVStand(...SET_WARD.iv, 1, { pal: P, hooks: v === 'c2' ? 4 : 2 });
    (v === 'c2' ? [0, 1, 3] : [0]).forEach((h, i) => setIVBag(H[h][0], H[h][1], v === 'c2' ? .85 : 1, { pal: P, key: 'ward' + i, t: 0, seed: i, fill: .8 - .15 * i }));
  });
  if (cfg.lamp) add('lamp', [1300, -800, 2400, 1000], () => setRingLamp(...SET_WARD.lamp, 1, { pal: P }));
  return I;
}
// The IV bags' drip ports (where tubes start), per variant.
function setWardPorts(v) {
  const [x, y] = SET_WARD.iv, hooks = v === 'c2' ? 4 : 2, span = hooks > 2 ? 230 : 160, hx = i => x + lerp(-span / 2 + 6, span / 2 - 6, i / (hooks - 1));
  return (v === 'c2' ? [0, 1, 3] : [0]).map(h => [hx(h), y - 868 + 262 * (v === 'c2' ? .85 : 1)]);
}
// Paint the ward under the active camera. o: t, res, lights (false: none), and what
// is baked: lamp / iv / chart (false: leave it out and draw it live, e.g. the lamp descending in 08B), pillow, blanket.
function setWard(v = 'c1', o = {}) {
  const cfg = { lamp: o.lamp ?? true, iv: o.iv ?? true, chart: o.chart ?? true, pillow: o.pillow ?? true, blanket: o.blanket ?? true };
  const key = `setward ${v} ${cfg.lamp ? 'l' : ''}${cfg.iv ? 'i' : ''}${cfg.chart ? 'c' : ''}${cfg.pillow ? 'p' : ''}${cfg.blanket ? 'b' : ''}`, items = setWardItems(v, cfg);
  const draw = (x0, y0, x1, y1) => {
    const m = SET_MODE; if (v === 'final') { SET_MODE = 'line'; SET_LINE.col = SET_C.cyan; SET_LINE.sw = 1; }
    for (const it of items) if (setHit(it.bb, x0, y0, x1, y1)) { boilSeed('ward ' + it.id); it.draw(x0, y0, x1, y1); }
    SET_MODE = m;
  };
  setTiles(key, draw, { ...o, variants: v === 'final' ? 1 : 3 });
  if (o.lights !== false) setWardLights(v, { ...o, cfg });
}
// Live light: the lamp (o.lamp 0..1+, o.flash adds a burst), fever (c1: magenta haze round the bed, o.fever 0..1),
// the IV bags' glow, c2's rotating alarm bands (o.alarm 0..1, o.t), final: the line drawing's soft glow.
function setWardLights(v, o = {}) {
  const P = setWardPal(v), t = o.t ?? T, [lx, ly] = SET_WARD.lamp, B = SET_WARD.bed, cfg = o.cfg || { lamp: true, iv: true };
  const lk = (o.lampK ?? 1) + (o.flash || 0);
  if (cfg.lamp !== false) {
    setRingLampLight(lx, ly, 1, lk * (v === 'final' ? .6 : 1), P.lamp);
    if (v !== 'final') { glow(lx, B.top + 10, 640, P.lamp, .24 * lk); glow(lx, SET_WARD.island[1], 900, P.lamp, .12 * lk); }   // a surgical lamp: its pool lands on the bed and the island
  }
  if (v === 'c1') { const f = o.fever ?? .6; glow((B.x0 + B.x1) / 2 - 150, B.top - 60, 520, P.fever, .35 * f); glow(B.x0 + 200, B.top - 160, 300, P.fever, .3 * f * (.7 + .3 * pulse(t, 3))); }
  if (cfg.iv !== false) setWardPorts(v).forEach(([px, py]) => glow(px, py - 140, 150, P.liquid, .55));
  if (v === 'c2' && (o.alarm ?? 1) > 0) {
    const a = t * TAU * .18, k = o.alarm ?? 1, cx = 1920, cy = 380;
    for (let i = 0; i < 2; i++) { const ang = a + i * Math.PI; setCone(cx, cy, ang, 3000, .22, P.alarm, .32 * k); setCone(cx, cy, ang, 1800, .1, '#FF9AB0', .2 * k); }
    glow(cx, cy, 160, P.alarm, .8 * k);
    glow(1920, 1900, 1400, P.alarm, .18 * k * (.6 + .4 * Math.cos(a * 2)));
  }
  if (v === 'final') { glow((B.x0 + B.x1) / 2, B.top, 900, SET_C.cyan, .18); glow(SET_WARD.island[0], SET_WARD.island[1], 1100, SET_C.deep, .2); }
}
// The drip tubes (live). o.to: target points (his arm), default the pillow; c1: one tube; c2: every bag drips, extra
// tubes trail off across the island and down into the void. o.t, o.sag.
function setWardTubes(v, o = {}) {
  const P = setWardPal(v), ports = setWardPorts(v), to = o.to || [[SET_WARD.pillow[0] + 120, SET_WARD.bed.top - 10]], t = o.t ?? T;
  const m = SET_MODE; if (v === 'final') { SET_MODE = 'line'; SET_LINE.col = SET_C.cyan; }
  ports.forEach((p, i) => setTube(p, to[i % to.length], { pal: P, t: t + i * .4, sag: o.sag ?? 140 + i * 30, key: 'wt' + i, glow: v === 'final' ? .5 : .7 }));
  if (v === 'c2') [[2300, 2200], [2900, 1960], [2600, 2600], [700, 2500]].forEach((q, i) => setTube(ports[i % ports.length], q, { pal: P, t: t + i * .3, sag: 300 + 60 * i, key: 'wtx' + i, pulses: 2 }));
  SET_MODE = m;
}
