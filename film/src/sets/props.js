// props.js: set-dressing props (STORYBOARD §7.3), painted with p5.brush through setP()/setL() (sets_core.js), so every
// prop also draws as a clean line drawing when SET_MODE = 'line'. Character-held props (phone in hand, thermometer,
// spoon, capsules, headphones, sticker, stethoscope, cuffs, strings) live in the character files.
//
// Every prop: setXxx(x, y, s = 1, o = {}). s = 1 is ROOM SCALE (1 m ≈ 560 px; him standing ≈ u 31). The anchor is named
// on each function (usually the floor/surface point under the prop's centre). o.pal = a palette object (setRoomPal(v),
// setWardPal(v), or anything with the same keys; default the daylight room); o.key = a boil key when the same prop is
// drawn twice in a frame. Props never move by themselves: pass the animated fields (o.ring, o.rot, o.k, ...) from t.

// the room's daylight colours (room.js tones them per variant)
const SET_BASE = {
  wallL: '#CDB89A', wallC: '#D9C7A7', wallR: '#D3BF9F', wallSh: '#A48F74', ceil: '#B3A086', ceilDk: '#968369', skirt: '#E7DAC2',
  floor: '#8E6C4F', floorDk: '#6A4E38', floorLt: '#A9855F', rug: '#9B5E4A', rugDk: '#7A4436', rugLt: '#C98A63',
  wood: '#B9875A', woodDk: '#8A5F3C', woodLt: '#D4A878', bedWood: '#A57B56',
  sheet: '#ECE4D4', sheetSh: '#C9BFAE', cover: '#7E8FB8', coverDk: '#5C6C98', coverLt: '#A6B4D6', pillow: '#F1E9D9', pillowSh: '#CEC3B0',
  metal: '#A3A0AE', metalDk: '#5E5B6A', metalLt: '#D2D0DA', bezel: '#3A3646', bezelLt: '#5A5566', screenOff: '#1A1C2E',
  key: '#D8D2C8', keyDk: '#8A8494', chair: '#4B4658', chairLt: '#6E6880', chairDk: '#2E2A38',
  robe: '#B08A62', robeDk: '#86643F', robeLt: '#CBA67C', door: '#CDBB9C', doorDk: '#A08C6E', doorFrame: '#E4D8C2',
  glass: '#C9D3D5', glassDk: '#9EA9AF', outside: '#FFD9A0',
  frame: '#6B4E3A', frameLt: '#94704F', photo: '#F2C38A', photoLt: '#F8DDB0', photoDk: '#DA8C50', sil: '#B2602F', silDk: '#874120',
  clock: '#D9573F', clockDk: '#A63A2A', clockFace: '#F4ECDC', blind: '#E4D9C3', blindSh: '#B5A58A', winFrame: '#EDE4D2',
  sky: '#BCD1E0', skyLt: '#E6ECEE',
  book1: '#7C4A3A', book2: '#3F5A6E', book3: '#C9A25C', book4: '#5E6E4A', book5: '#8A5A78', plant: '#5E8A55', plantDk: '#3E6440', pot: '#C46E4E',
  mug: '#E8C9A0', mugDk: '#B89670', cup: '#F1E6D2', cupBand: '#C8463A', noodle: '#F0D9A0', apple: '#C8323A', appleDk: '#8E1E2A', leaf: '#6C9A4E',
  diary: '#7A4A34', diaryDk: '#55301F', page: '#F4ECDA', pageSh: '#D9CDB4', scrib: '#C9783A', band: '#FCF9F3', bandSh: '#D8D4DE', code: '#2B2233',
  web: '#E6E2DA', spider: '#2E2733',
  ink: '#2B2233', inkSoft: '#5A4650', shadow: '#3A2E35', snow: '#8E929C', snowDk: '#6B7280', snowLt: '#B9BCC4',
  // ward / hospital things (setWardPal overrides these)
  ivMetal: '#B9C2CF', ivMetalDk: '#7C8798', bag: '#D7EEF2', liquid: '#7FE9FF', token: '#E8FDFF', tube: '#BFEFF7',
  lampBody: '#C9D2DE', lampDk: '#7D8A9E', lampCell: '#E8FDFF', board: '#8A6A4C', boardDk: '#634830', clip: '#B9BCC4'
};
const setPalDay = () => SET_PAL_CACHE.day || (SET_PAL_CACHE.day = { ...SET_BASE, name: 'day' });
const SET_PAL_CACHE = {};
const setPalOf = o => o.pal || setPalDay();

// ---------------------------------------------------------------- bed, covers, pillow, nightstand, clock
// Bed in side elevation (we see its long side). Anchor: floor point under the HEAD end (outer face of the headboard);
// the bed runs +1140 px to the right (o.flip: to the left). Mattress top at y - 318. o.covers 'flat'|'rumpled'|'lump'|
// 'none', o.pillow (default true). Exposes SET_BED (offsets at s = 1) for placing him on it.
const SET_BED = { len: 1140, top: -318, head: 56, foot: 1090, pillow: [218, -318] };
function setBed(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), f = o.flip ? -1 : 1, X = (px, py) => [x + px * s * f, y + py * s], M = Q => Q.map(([a, b]) => X(a, b));
  const kk = o.key || '';
  boilSeed('setbed shadow' + kk);
  setP(M([[50, -180], [1100, -180], [1120, -6], [30, -6]]), { wash: P.shadow, washOp: 150, ink: null });
  boilSeed('setbed rail' + kk);
  setP(M(setBox(40, -262, 1102, -176, 1.2)), { wash: P.bedWood, ink: P.ink, sw: sw * .9 });
  setL(M([[52, -252], [1092, -253]]), sw * .5, P.woodLt, 'inkfine', .5);
  boilSeed('setbed mattress' + kk);
  setP(M(rrPts(48, -322, 1050, 74, 22, 1.2)), { wash: P.sheet, ink: P.ink, sw: sw * .8 });
  setP(M([[60, -270], [1090, -270], [1088, -254], [62, -254]]), { wash: P.sheetSh, washOp: 200, ink: null });
  boilSeed('setbed ends' + kk);
  setP(M([[0, 0], [0, -560], [8, -590], [28, -602], [48, -590], [56, -560], [56, 0]]), { wash: P.bedWood, ink: P.ink, sw: sw, curv: .15 });
  setL(M([[14, -540], [14, -40]]), sw * .45, P.woodLt, 'inkfine', 0);
  setP(M([[1090, 0], [1090, -400], [1098, -418], [1115, -426], [1132, -418], [1140, -400], [1140, 0]]), { wash: P.bedWood, ink: P.ink, sw: sw, curv: .15 });
  setL(M([[1126, -390], [1126, -30]]), sw * .45, P.woodDk, 'inkfine', 0);
  if (o.pillow !== false) setPillow(...X(218, -318), s, { ...o, flip: o.flip, key: 'bed' + kk });
  if (o.covers && o.covers !== 'none') setCovers(x, y, s, { ...o, state: o.covers, key: 'bed' + kk });
}
// The duvet over the bed, same anchor as setBed. state 'flat' (11A: nobody in it), 'rumpled', 'lump' (someone curled
// up under it: 02A; lumpX moves the mound, default 640). Draw it again over a character to tuck him in.
function setCovers(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), f = o.flip ? -1 : 1, X = (px, py) => [x + px * s * f, y + py * s], M = Q => Q.map(([a, b]) => X(a, b));
  const st = o.state || 'flat', kk = 'setcovers' + (o.key || ''), lx = o.lumpX ?? 640;
  const top = []; const n = 22;
  for (let i = 0; i <= n; i++) {
    const px = lerp(360, 1104, i / n);
    let py = -334 - 6 * Math.sin(i * 1.3);
    if (st === 'rumpled') py -= 22 * Math.pow(Math.sin(i * .9 + 1), 2) + 10 * hash(i + 3);
    if (st === 'lump') { const d = (px - lx) / 300; py -= 230 * Math.exp(-d * d * 1.6) + 50 * Math.exp(-(((px - lx - 260) / 140) ** 2)); }
    top.push([px, py]);
  }
  const hem = []; for (let i = n; i >= 0; i--) { const px = lerp(352, 1110, i / n); hem.push([px + 6 * Math.sin(i * 2.1), -196 + 14 * Math.sin(i * 1.7 + .5) + 8 * hash(i * 1.3)]); }
  boilSeed(kk);
  const body = M([[340, -300], ...top, [1112, -300], ...hem]);
  setP(body, { wash: P.cover, ink: P.ink, sw: sw * .9, curv: .35 });
  if (SET_MODE !== 'line') setP(M([[360, -250], [1100, -250], [1104, -205], ...hem.slice(1, -1), [356, -205]]), { fill: P.coverDk, fillOp: 120, bleed: .12, tex: .5, ink: null });
  // the turned-down edge at the head end
  setP(M([[330, -342], [420, -350], [430, -196], [344, -200]]), { wash: P.coverLt, ink: P.ink, sw: sw * .7, curv: .2 });
  setL(M([[360, -344], [372, -205]]), sw * .4, P.coverDk, 'inkfine', .4);
  // folds
  const folds = st === 'lump' ? [[lx - 140, -300, lx - 190, -205], [lx + 40, -330, lx + 10, -210], [lx + 200, -300, lx + 250, -205], [lx - 40, -420, lx - 120, -330]]
    : st === 'rumpled' ? [[520, -330, 500, -210], [700, -340, 740, -205], [880, -330, 860, -215], [990, -320, 1030, -210]] : [[600, -320, 590, -215], [900, -318, 915, -212]];
  folds.forEach(([a, b, c, d], i) => setL(M([[a, b], [(a + c) / 2 + 12 * (i % 2 ? 1 : -1), (b + d) / 2], [c, d]]), sw * .55, P.coverDk, 'inkfine', .6));
  setL(M(top.slice(2, -2).map(([a, b]) => [a, b + 16])), sw * .4, P.coverLt, 'inkfine', .5);
}
// Anchor: the middle of the pillow's resting edge (on the mattress).
function setPillow(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), f = o.flip ? -1 : 1, M = Q => Q.map(([a, b]) => [x + a * s * f, y + b * s]);
  boilSeed('setpillow' + (o.key || ''));
  setP(M([[-150, 2], [-158, -30], [-140, -70], [-80, -86], [0, -80], [90, -88], [146, -72], [158, -34], [148, 2], [60, 8], [-60, 8]]), { wash: P.pillow, ink: P.ink, sw: sw * .8, curv: .5 });
  setP(M([[-130, -6], [-138, -30], [130, -26], [128, -4], [0, 4]]), { wash: P.pillowSh, washOp: 190, ink: null, curv: .5 });
  setL(M([[-60, -62], [-30, -48], [10, -56]]), sw * .45, P.pillowSh, 'inkfine', .6);
  if (o.dent) setL(M([[-80, -40], [0, -30], [70, -42]]), sw * .5, P.pillowSh, 'inkfine', .6);
}
// Anchor: floor point under the centre. 230 × 308.
function setNightstand(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setnightstand' + (o.key || ''));
  setP(M([[-100, -12], [100, -12], [108, 0], [-108, 0]]), { wash: P.shadow, washOp: 130, ink: null });
  setP(M(setBox(-104, -292, 104, -6, 1)), { wash: P.wood, ink: P.ink, sw });
  setP(M(setBox(-118, -308, 118, -290, .8)), { wash: P.woodLt, ink: P.ink, sw: sw * .9 });
  setP(M(setBox(-86, -262, 86, -166, .8)), { wash: P.woodDk, washOp: 120, ink: P.ink, sw: sw * .6 });
  setP(M(ellPts(0, -214, 9, 8, 10)), { wash: P.metal, ink: P.ink, sw: sw * .5 });
  setL(M([[-86, -140], [86, -140]]), sw * .5, P.woodDk, 'inkfine', 0);
}
// A twin-bell alarm clock with hands and no numbers. Anchor: bottom centre (on the surface). o.time hours (default 7),
// o.ring 0..1 (rattles, vibration marks), o.jump px (hop), o.rot.
function setClock(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), ring = o.ring || 0, t = o.t ?? T;
  const sh = ring * .12 * Math.sin(t * TAU * 14), dy = -(o.jump || 0), a = (o.rot || 0) + sh;
  push(); translate(x, y + dy * s); rotate(a); scale(s);
  const lw = sw / s;
  boilSeed('setclock' + (o.key || ''));
  setP([[-30, -6], [-38, 2], [-24, 4]], { wash: P.clockDk, ink: P.ink, sw: lw * .6 });
  setP([[30, -6], [38, 2], [24, 4]], { wash: P.clockDk, ink: P.ink, sw: lw * .6 });
  for (const sd of [-1, 1]) {
    const bx = sd * 34, by = -104;
    setP(ellPts(bx, by, 22, 15, 14, 0, sd * .5).map(([px, py]) => [px, py - 4]), { wash: P.clock, ink: P.ink, sw: lw * .7 });
    setL([[bx * .55, by + 18], [bx * .8, by + 4]], lw * .6, P.ink, 'ink', 0);
  }
  setL([[0, -110 - ring * 6 * Math.sin(t * TAU * 18)], [0, -96]], lw * .7, P.ink, 'ink', 0);
  setP(ellPts(0, -56, 50, 50, 26, .8), { wash: P.clock, ink: P.ink, sw: lw });
  setP(ellPts(0, -56, 39, 39, 24, .5), { wash: P.clockFace, ink: P.ink, sw: lw * .6 });
  for (let i = 0; i < 12; i++) { const q = i / 12 * TAU, r0 = i % 3 ? 33 : 30; setL([[Math.cos(q) * r0, -56 + Math.sin(q) * r0], [Math.cos(q) * 36, -56 + Math.sin(q) * 36]], lw * (i % 3 ? .35 : .6), P.ink, 'inkfine', 0); }
  const hr = o.time ?? 7, ha = (hr / 12) * TAU - Math.PI / 2, ma = (frac(hr) * TAU) - Math.PI / 2;
  setL([[0, -56], [Math.cos(ha) * 20, -56 + Math.sin(ha) * 20]], lw * 1.1, P.ink, 'ink', 0);
  setL([[0, -56], [Math.cos(ma) * 30, -56 + Math.sin(ma) * 30]], lw * .8, P.ink, 'ink', 0);
  pop();
  if (ring > .05) {   // painted vibration marks either side
    boilSeed('setclockring' + (o.key || '') + Math.floor(t * 12));
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const r = (66 + i * 16) * s, cx = x, cy = y + (dy - 60) * s, q0 = (sd > 0 ? -.45 : Math.PI - .45) + i * .05;
      const arc = []; for (let k = 0; k <= 5; k++) { const q = q0 + k / 5 * .9; arc.push([cx + Math.cos(q) * r, cy + Math.sin(q) * r * .9]); }
      setL(arc, sw * .7 * ring, P.ink, 'ink', .5);
    }
  }
}

// ---------------------------------------------------------------- desk, monitor, keyboard, chair, mug, shelf
// Desk in front elevation with its top drawn as a thin band seen from a little above. Anchor: floor point under the
// middle of the front edge. 780 wide; top band y -460..-420. Returns { top: surface y (back), front: surface y (front) }.
function setDesk(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setdesk' + (o.key || ''));
  setP(M([[-380, -16], [380, -16], [400, 0], [-400, 0]]), { wash: P.shadow, washOp: 120, ink: null });
  setP(M([[-372, -380], [372, -380], [372, -6], [-372, -6]]), { wash: P.shadow, washOp: 110, ink: null });
  setP(M(setBox(-372, -380, -342, 0, .8)), { wash: P.woodDk, ink: P.ink, sw });
  setP(M(setBox(190, -380, 372, -4, .8)), { wash: P.wood, ink: P.ink, sw });
  for (const yy of [-300, -200]) setL(M([[198, yy], [364, yy]]), sw * .6, P.woodDk, 'inkfine', 0);
  for (const yy of [-340, -250, -150]) setP(M(setBox(268, yy - 4, 294, yy + 4)), { wash: P.metal, ink: null });
  setP(M([[-392, -462], [392, -462], [398, -420], [-398, -420]]), { wash: P.woodLt, ink: P.ink, sw });
  setP(M(setBox(-398, -420, 398, -384, .8)), { wash: P.wood, ink: P.ink, sw });
  setL(M([[-380, -446], [-100, -448], [200, -445], [380, -447]]), sw * .4, P.wood, 'inkfine', .5);
  return { top: y - 452 * s, front: y - 428 * s };
}
// Monitor seen from the front. Anchor: bottom centre of the stand base. Returns the screen rect {x, y, w, h}.
// o.screen: 'off' (dark glass, default) or a function(S) that paints the screen content (see screens.js setScr).
function setMonitor(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setmonitor' + (o.key || ''));
  setP(M(ellPts(0, -8, 74, 12, 18)), { wash: P.bezelLt, ink: P.ink, sw: sw * .8 });
  setP(M(setBox(-17, -128, 17, -10, .5)), { wash: P.bezelLt, ink: P.ink, sw: sw * .8 });
  setP(M(rrPts(-212, -400, 424, 276, 10, .8)), { wash: P.bezel, ink: P.ink, sw });
  const scr = { x: x - 198 * s, y: y - 386 * s, w: 396 * s, h: 246 * s };
  if (typeof o.screen === 'function') o.screen(setScr(scr.x, scr.y, scr.w, scr.h));
  else { boilSeed('setmonitor glass' + (o.key || '')); setP(setBox(scr.x, scr.y, scr.x + scr.w, scr.y + scr.h), { wash: P.screenOff, ink: null }); }
  setL(M([[-196, -398], [196, -398]]), sw * .4, P.bezelLt, 'inkfine', 0);
  return scr;
}
// Keyboard lying on the desk, seen from a little above. Anchor: centre. 270 × 26.
function setKeyboard(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setkeyboard' + (o.key || ''));
  setP(M([[-128, -13], [128, -13], [136, 12], [-136, 12]]), { wash: P.key, ink: P.ink, sw: sw * .8 });
  for (let r = 0; r < 3; r++) {
    const yy = -7 + r * 7, w0 = 120 + r * 3;
    for (let i = 0; i < 12; i++) { const xx = -w0 + i * (2 * w0 / 12) + 3; setL(M([[xx, yy], [xx + 2 * w0 / 12 - 6, yy]]), sw * .45, P.keyDk, 'inkfine', 0); }
  }
  setL(M([[-50, 8.5], [50, 8.5]]), sw * .5, P.keyDk, 'inkfine', 0);
}
// Office chair from behind, turned a little (3/4 back). Anchor: floor point under the gas lift. o.turn -1..1.
function setChair(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), tn = o.turn ?? .35, M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setchair' + (o.key || ''));
  setP(M(ellPts(0, -4, 150, 16, 18)), { wash: P.shadow, washOp: 120, ink: null });
  for (const [ex, ey] of [[-128, -16], [-58, 6], [74, 4], [132, -14]]) {
    setP(M(ribbon([[0, -46], [ex * .6, ey - 22], [ex, ey - 8]], 14, 9)), { wash: P.chairDk, ink: P.ink, sw: sw * .6 });
    setP(M(ellPts(ex, ey, 13, 11, 10)), { wash: P.chairDk, ink: P.ink, sw: sw * .6 });
  }
  setP(M(setBox(-11, -206, 11, -40, .5)), { wash: P.metal, ink: P.ink, sw: sw * .7 });
  setP(M(ellPts(0, -214, 152, 34, 22, .8)), { wash: P.chair, ink: P.ink, sw });
  setP(M([[-148, -214], [148, -214], [150, -196], [0, -182], [-150, -196]]), { wash: P.chairDk, washOp: 220, ink: null, curv: .4 });
  setP(M(setBox(-14 + tn * 10, -282, 14 + tn * 10, -218, .5)), { wash: P.chairDk, ink: P.ink, sw: sw * .7 });
  // backrest: the back panel and, turned, its side thickness
  const bk = [[-122, -560], [118, -568], [128, -300], [-126, -292]].map(([a, b]) => [a + tn * 18, b]);
  if (tn) setP(M(tn > 0 ? [[bk[1][0], bk[1][1]], [bk[1][0] + 26 * tn, bk[1][1] + 14], [bk[2][0] + 26 * tn, bk[2][1] - 8], [bk[2][0], bk[2][1]]]
    : [[bk[0][0], bk[0][1]], [bk[0][0] + 26 * tn, bk[0][1] + 14], [bk[3][0] + 26 * tn, bk[3][1] - 8], [bk[3][0], bk[3][1]]]), { wash: P.chairDk, ink: P.ink, sw: sw * .8 });
  setP(M(bk), { wash: P.chair, ink: P.ink, sw, curv: .35 });
  setP(M([[-96 + tn * 18, -520], [92 + tn * 18, -526], [98 + tn * 18, -340], [-98 + tn * 18, -334]]), { wash: P.chairLt, washOp: 110, ink: null, curv: .4 });
  setL(M([[-90 + tn * 18, -430], [94 + tn * 18, -434]]), sw * .45, P.chairDk, 'inkfine', .4);
  // the near armrest
  setP(M([[-150, -232], [-140, -330], [-96, -330], [-100, -318], [-128, -316], [-134, -232]]), { wash: P.chairDk, ink: P.ink, sw: sw * .7 });
}
// A mug (o.pens: with pens in it). Anchor: bottom centre.
function setMug(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setmug' + (o.key || ''));
  if (o.pens) for (const [dx, h, c] of [[-14, 120, P.book2], [4, 140, P.clock], [18, 110, P.book3]]) setP(M(setBox(dx - 4, -h, dx + 4, -40)), { wash: c, ink: P.ink, sw: sw * .5 });
  setP(M([[-32, -78], [32, -78], [29, -4], [-29, -4]]), { wash: P.mug, ink: P.ink, sw: sw * .8 });
  setP(M(ellPts(44, -44, 16, 20, 12)), { wash: null, ink: P.ink, sw: sw * .8 });
  setL(M([[16, -70], [18, -10]]), sw * .5, P.mugDk, 'inkfine', 0);
}

// ---------------------------------------------------------------- window and blinds
// A window with venetian blinds. (x, y) = top-left of the opening, w × h (room: 660 × 616). o.open 0 (closed: thin
// slivers of sky between the slats) .. 1 (fully raised); o.sky / o.skyLt = what is outside (default from the palette).
// Returns { gaps: [y of each sliver], openY: y where the lowered slats end, x, w } for the light shafts.
function setBlinds(x, y, w, h, o = {}) {
  const P = setPalOf(o), sw = setSW(o.s || 1), open = clamp(o.open || 0), kk = 'setblinds' + (o.key || '');
  boilSeed(kk + ' frame');
  setP(setBox(x - 34, y - 34, x + w + 34, y + h + 18, 1), { wash: P.winFrame, ink: P.ink, sw });
  setP(setBox(x - 54, y + h + 10, x + w + 54, y + h + 40, .8), { wash: P.winFrame, ink: P.ink, sw });
  setP(setBox(x - 50, y + h + 36, x + w + 50, y + h + 50, .5), { wash: P.wallSh, washOp: 120, ink: null });
  boilSeed(kk + ' glass');
  setP(setBox(x, y, x + w, y + h), { wash: o.sky || P.sky, ink: null });
  if (SET_MODE !== 'line') setP(setBox(x + w * .1, y + h * .05, x + w * .9, y + h * .6), { fill: o.skyLt || P.skyLt, fillOp: 140, bleed: .25, tex: .3, ink: null });
  setL([[x + w / 2, y], [x + w / 2, y + h]], sw * 1.6, P.winFrame, 'ink', 0);
  setL([[x, y + h * .52], [x + w, y + h * .52]], sw * 1.4, P.winFrame, 'ink', 0);
  // slats: lowered ones from the headrail down to openY, raised ones bunched in a stack under the headrail
  const rail = 26, pitch = 22, slat = 18, avail = h - rail, nAll = Math.floor(avail / pitch), nDown = Math.round(nAll * (1 - open));
  const stack = (nAll - nDown) * 4.2, y0 = y + rail + stack, gaps = [];
  boilSeed(kk + ' slats');
  if (stack > 1) { setP(setBox(x - 6, y + rail - 2, x + w + 6, y0 + 2), { wash: P.blind, ink: P.ink, sw: sw * .7 }); for (let i = 1; i < (nAll - nDown); i += 2) setL([[x - 4, y + rail + i * 4.2], [x + w + 4, y + rail + i * 4.2]], sw * .3, P.blindSh, 'inkfine', 0); }
  for (let i = 0; i < nDown; i++) {
    const sy = y0 + i * pitch;
    setP([[x - 6, sy], [x + w + 6, sy], [x + w + 6, sy + slat], [x - 6, sy + slat]], { wash: P.blind, ink: null });
    setL([[x - 6, sy + slat], [x + w * .5, sy + slat + .6], [x + w + 6, sy + slat]], sw * .45, P.blindSh, 'inkfine', .5);
    gaps.push(sy + slat + 2);
  }
  const openY = y0 + nDown * pitch;
  if (nDown) setP(setBox(x - 8, openY - 4, x + w + 8, openY + 6, .5), { wash: P.blindSh, ink: P.ink, sw: sw * .6 });
  setP(setBox(x - 10, y - 4, x + w + 10, y + rail, .6), { wash: P.winFrame, ink: P.ink, sw: sw * .8 });
  for (const cx of [x + w * .18, x + w * .82]) setL([[cx, y + rail], [cx, openY]], sw * .35, P.blindSh, 'inkfine', 0);
  setL([[x + w - 14, y + rail], [x + w - 12, y + h * .78], [x + w - 13, openY + h * .4 * open + 30]], sw * .5, P.inkSoft, 'inkfine', .3);
  return { gaps, openY, x, y, w, h };
}

// ---------------------------------------------------------------- wardrobe, photo frames, door
// Anchor: floor point under the centre. 540 × 1140. o.sleeve (default true): a shirt cuff caught in the doors.
function setWardrobe(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setwardrobe' + (o.key || ''));
  setP(M([[-262, -14], [262, -14], [280, 0], [-280, 0]]), { wash: P.shadow, washOp: 130, ink: null });
  setP(M(setBox(-262, -1110, 262, -30, 1)), { wash: P.robe, ink: P.ink, sw });
  if (SET_MODE !== 'line') setP(M(setBox(-250, -1000, 250, -60)), { fill: P.robeDk, fillOp: 70, bleed: .15, tex: .6, ink: null });
  setP(M(setBox(-282, -1144, 282, -1106, .8)), { wash: P.robeLt, ink: P.ink, sw });
  setP(M(setBox(-262, -34, 262, -8, .6)), { wash: P.robeDk, ink: P.ink, sw: sw * .8 });
  setL(M([[0, -1104], [0, -36]]), sw * 1.1, P.robeDk, 'ink', 0);
  for (const sd of [-1, 1]) {
    setP(M([[sd * 30, -1060], [sd * 228, -1060], [sd * 228, -600], [sd * 30, -600]]), { wash: null, ink: P.robeDk, sw: sw * .6 });
    setP(M([[sd * 30, -560], [sd * 228, -560], [sd * 228, -84], [sd * 30, -84]]), { wash: null, ink: P.robeDk, sw: sw * .6 });
    setP(M(rrPts(sd * 16 - 5, -640, 10, 90, 4)), { wash: P.metal, ink: P.ink, sw: sw * .5 });
  }
  if (o.sleeve !== false) {
    setP(M([[-4, -470], [22, -478], [40, -430], [30, -380], [10, -386], [16, -428], [-2, -440]]), { wash: P.cover, ink: P.ink, sw: sw * .6, curv: .3 });
    setP(M([[26, -392], [40, -398], [44, -376], [30, -372]]), { wash: P.sheet, ink: P.ink, sw: sw * .5 });
  }
}
// One standing photo frame with a warm party snapshot (friends' amber silhouettes). Anchor: bottom centre (on the
// ledge). o.i 0..4 picks the photo; o.grey 0..1 fades it to grey; o.rot tips it over its bottom-right corner (06E dominoes).
const SET_PHOTOS = [   // [w, h, heads: [x, y, r] in frame units (0..1)]
  [84, 108, [[.3, .5, .12], [.55, .45, .13], [.78, .55, .11]]],
  [100, 80, [[.25, .55, .12], [.45, .5, .12], [.65, .52, .13], [.85, .58, .1]]],
  [76, 100, [[.4, .45, .16], [.7, .52, .13]]],
  [96, 112, [[.22, .52, .1], [.42, .46, .12], [.6, .5, .11], [.8, .45, .12]]],
  [80, 96, [[.5, .45, .17]]]
];
function setPhotoFrame(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), [fw, fh, heads] = SET_PHOTOS[(o.i || 0) % 5], g = clamp(o.grey || 0);
  const G = c => g ? mixCol(c, setDesat(mixCol(c, '#8C8F98', .35), 1), g) : c;
  push(); translate(x + fw / 2 * s, y); rotate(o.rot || 0); translate(-fw / 2 * s, 0); scale(s);
  const lw = sw / s, X0 = 0, Y0 = -fh;
  boilSeed('setphoto' + (o.i || 0) + (o.key || ''));
  if (!o.rot) setP([[fw * .2, 0], [fw * 1.02, 0], [fw * 1.1, -6], [fw * .3, -5]], { wash: P.shadow, washOp: 110, ink: null });
  setP(setBox(X0, Y0, fw, 0, .4), { wash: G(P.frame), ink: P.ink, sw: lw * .8 });
  const ix = 9, iy = 9, pw = fw - 18, ph = fh - 18, PX = u => ix + u * pw, PY = v => Y0 + iy + v * ph;
  setP(setBox(ix, Y0 + iy, ix + pw, Y0 + iy + ph), { wash: G(P.photo), ink: null });
  setP([[ix, PY(.55)], [ix + pw, PY(.4)], [ix + pw, Y0 + iy], [ix, Y0 + iy]], { wash: G(P.photoLt), washOp: 170, ink: null });
  for (const [hx, hy, hr] of heads) {   // a friend: head + shoulders, one raising an arm
    setP(ellPts(PX(hx), PY(hy), hr * pw, hr * pw * 1.1, 14), { wash: G(P.sil), ink: null });
    setP([[PX(hx - hr * 2.1), PY(1)], [PX(hx - hr * 1.6), PY(hy + hr * 1.6)], [PX(hx), PY(hy + hr * 1.25)], [PX(hx + hr * 1.6), PY(hy + hr * 1.6)], [PX(hx + hr * 2.1), PY(1)]], { wash: G(P.silDk), ink: null, curv: .4 });
  }
  const [ax, ay, ar] = heads[heads.length - 1];
  setL([[PX(ax + ar * 1.2), PY(ay + ar * 1.6)], [PX(ax + ar * 1.9), PY(ay - ar * .3)], [PX(ax + ar * 1.6), PY(ay - ar * 1.5)]], lw * 1.4, G(P.silDk), 'ink', .5);
  for (let i = 0; i < 5; i++) setP(ellPts(PX(hash(i * 3.3 + (o.i || 0))), PY(hash(i * 5.1 + 2) * .4), 1.6, 1.6, 6), { wash: G(i % 2 ? P.clock : P.gold || '#FFD36E'), ink: null });
  setP([[ix - 1, Y0 + iy - 1], [ix + pw + 1, Y0 + iy - 1], [ix + pw + 1, Y0 + iy + ph + 1], [ix - 1, Y0 + iy + ph + 1]], { wash: null, ink: G(P.frameLt), sw: lw * .4 });
  pop();
}
// Mum's hand-painted photo (warm, the last real warmth in 06A). (x, y) top-left, w × h. o.grey 0..1.
function setMumPhoto(x, y, w, h, o = {}) {
  const P = setPalOf(o), g = clamp(o.grey || 0), G = c => g ? mixCol(c, setDesat(mixCol(c, '#8C8F98', .3), 1), g) : c, sw = setSW(h / 300);
  const X = u => x + u * w, Y = v => y + v * h, kk = 'setmum' + (o.key || '');
  boilSeed(kk);
  setP(setBox(x, y, x + w, y + h), { wash: G('#F4C890'), ink: null });
  setP([[x, Y(.7)], [x + w, Y(.45)], [x + w, y], [x, y]], { wash: G('#F9DDB0'), washOp: 200, ink: null });
  if (SET_MODE !== 'line') setP([[X(.05), Y(.1)], [X(.5), Y(.05)], [X(.4), Y(.5)]], { fill: G('#E9A86A'), fillOp: 90, bleed: .2, ink: null });
  // shoulders (cardigan), neck, head, hair (a low bun), a smile
  setP([[X(.08), Y(1)], [X(.14), Y(.8)], [X(.34), Y(.7)], [X(.5), Y(.74)], [X(.66), Y(.7)], [X(.86), Y(.8)], [X(.92), Y(1)]], { wash: G('#B5533C'), ink: G('#6A2E22'), sw: sw * .6, curv: .4 });
  setP([[X(.42), Y(.6)], [X(.58), Y(.6)], [X(.57), Y(.74)], [X(.5), Y(.77)], [X(.43), Y(.74)]], { wash: G('#E8B08C'), ink: null });
  setP([[X(.36), Y(.72)], [X(.5), Y(.8)], [X(.64), Y(.72)], [X(.6), Y(.9)], [X(.4), Y(.9)]], { wash: G('#F1E2C8'), ink: null, curv: .3 });
  setP(ellPts(X(.5), Y(.42), w * .16, h * .19, 22), { wash: G('#F0C09C'), ink: G('#7A4430'), sw: sw * .5 });
  setP([[X(.33), Y(.42)], [X(.34), Y(.26)], [X(.44), Y(.2)], [X(.56), Y(.2)], [X(.66), Y(.27)], [X(.68), Y(.42)], [X(.63), Y(.34)], [X(.52), Y(.29)], [X(.4), Y(.31)], [X(.36), Y(.4)]], { wash: G('#5A3426'), ink: null, curv: .4 });
  setP(ellPts(X(.66), Y(.22), w * .07, h * .06, 12), { wash: G('#5A3426'), ink: null });
  for (const ex of [.44, .56]) setL([[X(ex - .03), Y(.42)], [X(ex), Y(.4)], [X(ex + .03), Y(.42)]], sw * .5, G('#5A3426'), 'inkfine', .5);
  setL([[X(.45), Y(.5)], [X(.5), Y(.525)], [X(.55), Y(.5)]], sw * .6, G('#A0503C'), 'inkfine', .6);
  setP(ellPts(X(.42), Y(.47), w * .025, h * .018, 8), { wash: G('#F09A84'), washOp: 140, ink: null });
  setP(ellPts(X(.58), Y(.47), w * .025, h * .018, 8), { wash: G('#F09A84'), washOp: 140, ink: null });
  setP(ellPts(X(.66), Y(.5), w * .012, h * .012, 6), { wash: G('#FFD36E'), ink: null });
}
// Door with a frosted-glass panel. Anchor: floor point under the centre. 410 × 1150 (+ frame).
// o.open 0..1 (1 = half open: the leaf turns away, a warm gap of the outside shows on the left), o.outside colour,
// o.knock { k: 0..1 the friend's grey silhouette behind the glass, age: s since the last knock, knocks: count }.
function setDoor(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]), op = clamp(o.open || 0), kk = 'setdoor' + (o.key || '');
  boilSeed(kk + ' frame');
  setP(M(setBox(-238, -1196, 238, 4, 1)), { wash: P.doorFrame, ink: P.ink, sw });
  setP(M(setBox(-206, -1164, 206, 0)), { wash: op > 0 ? (o.outside || P.outside) : P.doorDk, ink: P.ink, sw: sw * .7 });
  if (op > 0 && SET_MODE !== 'line') setP(M([[-206, -1164], [-206 + 300 * op, -1164], [-206 + 300 * op, 0], [-206, 0]]), { fill: '#FFF1D6', fillOp: 120, bleed: .1, ink: null });
  // the leaf: hinged on the right, it narrows (and shows its edge) as it opens
  const lx = -204 + 330 * op, rx = 204, ew = 18 * op;
  boilSeed(kk + ' leaf');
  if (op > 0) setP(M([[lx - ew, -1166], [lx, -1162], [lx, 0], [lx - ew, 2]]), { wash: P.doorDk, ink: P.ink, sw: sw * .7 });
  setP(M([[lx, -1162], [rx, -1162], [rx, 0], [lx, 0]]), { wash: P.door, ink: P.ink, sw });
  const gx0 = lerp(lx, rx, .17), gx1 = lerp(lx, rx, .83);
  setP(M(setBox(gx0, -1080, gx1, -520, .5)), { wash: P.glass, ink: P.ink, sw: sw * .8 });
  if (SET_MODE !== 'line') setP(M(setBox(gx0 + 10, -1060, gx1 - 10, -540)), { fill: P.glassDk, fillOp: 90, bleed: .3, tex: .8, ink: null });
  for (const [a, b] of [[-440, -250], [-210, -40]]) setP(M(setBox(gx0, a, gx1, b, .5)), { wash: null, ink: P.doorDk, sw: sw * .6 });
  const hx = lerp(lx, rx, .07);
  setP(M([[hx - 6, -600], [hx + 6, -600], [hx + 6, -540], [hx - 6, -540]]), { wash: P.metal, ink: P.ink, sw: sw * .5 });
  setP(M([[hx - 4, -578], [hx + 46 * (1 - op), -580], [hx + 46 * (1 - op), -566], [hx - 4, -564]]), { wash: P.metal, ink: P.ink, sw: sw * .5 });
  const kn = o.knock;
  if (kn && kn.k > 0 && SET_MODE !== 'line') {    // the friend outside, a grey blur behind the frosted glass
    const kx = (gx0 + gx1) / 2, a = 150 * clamp(kn.k), bob = kn.age < .3 ? -10 * Math.sin(kn.age / .3 * Math.PI) : 0;
    boilSeed(kk + ' knock');
    setP(M(ellPts(kx - 10, -880, 62, 74, 18, 3)), { wash: P.unread || '#6B7280', washOp: a, ink: null });
    setP(M([[kx - 150, -540], [kx - 120, -730], [kx - 10, -790], [kx + 110, -730], [kx + 140, -540]]), { wash: P.unread || '#6B7280', washOp: a * .9, ink: null, curv: .4 });
    setP(M(ellPts(kx + 88, -760 + bob, 26, 30, 12, 2)), { wash: P.unread || '#6B7280', washOp: a, ink: null });
  }
  if (kn && kn.age != null && kn.age < .4) {      // knock marks beside the glass, a few frames each
    const kx = gx1 + 30, k2 = 1 - kn.age / .4;
    boilSeed(kk + ' marks' + (kn.knocks || 0));
    for (let i = 0; i < 3; i++) { const r = 26 + i * 18; setL(M([[kx + r * .5, -800 - r * .7], [kx + r * .9, -770], [kx + r * .5, -740 + r * .7]]), sw * 1.1 * k2, P.ink, 'ink', .6); }
  }
}

// ---------------------------------------------------------------- diary, page, noodles, apple, cobweb, spider, band
// The diary lying open, seen from above. Anchor: centre of the spine. 520 × 340. o.torn = pages torn out (ragged stubs).
function setDiary(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]), kk = 'setdiary' + (o.key || '');
  boilSeed(kk);
  setP(M([[-270, -180], [270, -180], [276, 182], [-276, 182]]), { wash: P.diary, ink: P.ink, sw });
  for (const sd of [-1, 1]) {
    setP(M([[sd * 4, -166], [sd * 254, -170], [sd * 258, 166], [sd * 4, 170]]), { wash: P.page, ink: P.ink, sw: sw * .7 });
    setP(M([[sd * 4, -166], [sd * 40, -167], [sd * 40, 168], [sd * 4, 170]]), { wash: P.pageSh, washOp: 140, ink: null });
    for (let i = 0; i < 9; i++) {   // the handwriting: amber scribble lines, never letters
      const yy = -130 + i * 32, x0 = sd * 44, x1 = sd * (220 - 50 * hash(i * 2.3 + sd)), pts = [];
      for (let k = 0; k <= 10; k++) pts.push([lerp(x0, x1, k / 10), yy + 5 * Math.sin(k * 2.7 + i) + 2 * hash(k + i * 11)]);
      setL(M(pts), sw * .55, P.scrib, 'inkfine', .6);
    }
  }
  for (let i = 0; i < (o.torn || 0); i++) setL(M([[6 + i * 3, -160], [10 + i * 3, -60], [5 + i * 3, 40], [9 + i * 3, 164]]), sw * .5, P.pageSh, 'inkfine', .3);
  setL(M([[0, -176], [0, 176]]), sw, P.diaryDk, 'ink', 0);
  setP(M([[-6, 160], [6, 160], [8, 236], [0, 226], [-8, 236]]), { wash: P.clock, ink: P.ink, sw: sw * .5 });
}
// One torn page in flight. Anchor: centre. o.rot, o.curl -1..1 (bends it), o.k 0..1 (fade). 250 × 330.
function setPage(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), c = o.curl || 0;
  push(); translate(x, y); rotate(o.rot || 0); scale(s);
  const lw = sw / s, bend = (px, py) => [px + c * 40 * Math.pow(py / 165, 2), py - c * 20 * Math.pow(px / 125, 2)];
  boilSeed('setpage' + (o.key || ''));
  const out = [[-125, -165], [125, -165], [125, 165], [-125, 165]], rag = [];
  for (let i = 0; i <= 12; i++) rag.push([-125 - 6 * hash(i * 1.7 + (o.seed || 0)), lerp(165, -165, i / 12)]);
  setP([out[0], out[1], out[2], ...rag].map(([a, b]) => bend(a, b)), { wash: P.page, washOp: 255 * (o.k ?? 1), ink: P.ink, sw: lw * .7 });
  for (let i = 0; i < 8; i++) { const yy = -125 + i * 34, pts = []; for (let k = 0; k <= 8; k++) pts.push(bend(lerp(-100, 100 - 40 * hash(i + (o.seed || 0)), k / 8), yy + 4 * Math.sin(k * 2.9 + i))); setL(pts, lw * .5, P.scrib, 'inkfine', .6); }
  pop();
}
// Cup noodles (no brand): Anchor: bottom centre. 150 × 170. o.steam 0..1.
function setNoodles(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]), t = o.t ?? T;
  boilSeed('setnoodles' + (o.key || ''));
  setP(M([[-76, -170], [76, -170], [56, 0], [-56, 0]]), { wash: P.cup, ink: P.ink, sw });
  setP(M([[-70, -128], [70, -128], [66, -96], [-66, -96]]), { wash: P.cupBand, ink: null });
  setL(M([[-60, -112], [-30, -118], [0, -108], [30, -118], [60, -112]]), sw * .6, P.cup, 'inkfine', .6);
  setP(M(ellPts(0, -170, 76, 14, 18)), { wash: P.noodle, ink: P.ink, sw: sw * .8 });
  for (let i = 0; i < 4; i++) setL(M([[-56 + i * 30, -172], [-44 + i * 30, -166], [-34 + i * 30, -174]]), sw * .5, mixCol(P.noodle, P.ink, .3), 'inkfine', .6);
  setP(M([[10, -176], [60, -184], [96, -232], [44, -226]]), { wash: P.cup, ink: P.ink, sw: sw * .7 });
  setL(M([[-22, -168], [-60, -268]]), sw * 1.4, P.woodLt, 'ink', 0);
  setL(M([[-8, -168], [-34, -274]]), sw * 1.4, P.woodLt, 'ink', 0);
  if ((o.steam ?? 1) > 0) for (let i = 0; i < 3; i++) {
    const ph = t * .9 + i * .33, k = frac(ph), pts = [];
    for (let j = 0; j <= 6; j++) pts.push([(-30 + i * 30) + 12 * Math.sin(j * 1.2 + ph * 4), -190 - j * 22 - k * 30]);
    boilSeed('setsteam' + i); setL(M(pts), sw * .6 * (o.steam ?? 1) * Math.sin(k * Math.PI), P.sheet, 'inkfine', .7);
  }
}
// An apple. Anchor: bottom centre. ~110 across.
function setApple(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]);
  boilSeed('setapple' + (o.key || ''));
  setP(M([[0, -88], [26, -100], [52, -88], [60, -50], [44, -10], [18, 2], [0, -6], [-18, 2], [-44, -10], [-60, -50], [-52, -88], [-26, -100]]), { wash: P.apple, ink: P.ink, sw, curv: .5 });
  setP(M([[20, -84], [46, -74], [52, -46], [38, -16], [28, -40], [32, -70]]), { wash: P.appleDk, washOp: 150, ink: null, curv: .5 });
  setP(M(ellPts(-30, -70, 10, 16, 10, 0, .5)), { wash: '#F6C9B8', washOp: 170, ink: null });
  setL(M([[0, -92], [4, -120]]), sw * 1.2, P.woodDk, 'ink', .3);
  setP(M([[4, -114], [28, -132], [44, -122], [22, -108]]), { wash: P.leaf, ink: P.ink, sw: sw * .6, curv: .5 });
}
// A cobweb spun across a corner. Anchor: the hub. r = radius (px at s = 1: 120); o.k 0..1 grows it (spokes, then the
// spiral); o.a0/o.a1 the angular span (default a quarter-corner, opening down-right).
function setCobweb(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), k = clamp(o.k ?? 1), r = (o.r || 120) * s, a0 = o.a0 ?? -.2, a1 = o.a1 ?? Math.PI * .7, n = 7;
  boilSeed('setcobweb' + (o.key || ''));
  for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)), kk = clamp(k * 3 - i * .25); if (kk <= 0) continue; setL([[x, y], [x + Math.cos(a) * r * kk, y + Math.sin(a) * r * kk]], sw * .35, P.web, 'inkfine', 0); }
  const turns = Math.floor(clamp(k * 1.6 - .5) * 9);
  for (let ring = 1; ring <= turns; ring++) {
    const rr = r * ring / 10, pts = [];
    for (let i = 0; i < n; i++) { const a = lerp(a0, a1, i / (n - 1)); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); if (i < n - 1) { const am = lerp(a0, a1, (i + .5) / (n - 1)); pts.push([x + Math.cos(am) * rr * .9, y + Math.sin(am) * rr * .9]); } }
    setL(pts, sw * .3, P.web, 'inkfine', .5);
  }
}
// A tiny spider on its thread. Anchor: the top of the thread; o.drop = thread length px (at s = 1), o.t legs.
function setSpider(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), d = (o.drop ?? 60) * s, t = o.t ?? T, by = y + d;
  boilSeed('setspider' + (o.key || ''));
  setL([[x, y], [x + .5 * s, by - 8 * s]], sw * .3, P.web, 'inkfine', 0);
  for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
    const a = (i - 1.5) * .45 + Math.sin(t * 7 + i + sd) * .08, L = (16 + (i === 1 || i === 2 ? 4 : 0)) * s;
    setL([[x + sd * 4 * s, by + (i - 1.5) * 2 * s], [x + sd * L * .6, by - 8 * s + a * 14 * s], [x + sd * L, by + 4 * s + a * 18 * s]], sw * .35, P.spider, 'inkfine', .3);
  }
  setP(ellPts(x, by - 6 * s, 5 * s, 5 * s, 10), { wash: P.spider, ink: null, line: true });
  setP(ellPts(x, by + 5 * s, 7 * s, 9 * s, 12), { wash: P.spider, ink: null, line: true });
}
// The patient wristband, cut open and laid on the keyboard, `PATIENT: YOU` facing up (12C; text allowed there only).
// Anchor: centre of the label. ~420 × 40 at s = 1. o.text (default true), o.rot.
function setBandCut(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s);
  push(); translate(x, y); rotate(o.rot ?? -.06); scale(s);
  const lw = sw / s;
  boilSeed('setbandcut' + (o.key || ''));
  const top = [], bot = [];
  for (let i = 0; i <= 14; i++) { const px = lerp(-210, 210, i / 14), cy = 8 * Math.sin(px / 70) + (Math.abs(px) > 160 ? -(Math.abs(px) - 160) * .35 : 0); top.push([px, cy - 17]); bot.push([px, cy + 17]); }
  setP([...top, [216, top[14][1] + 10], ...bot.slice().reverse(), [-216, bot[0][1] - 12]], { wash: P.band, ink: P.ink, sw: lw * .7 });
  setP(bot.slice(2, 13).map(([a, b]) => [a, b - 7]).concat(bot.slice(2, 13).reverse()), { wash: P.bandSh, washOp: 180, ink: null });
  for (let i = 0; i < 16; i++) { const bx = -150 + i * 4.6 + (hash(i * 3.7) - .5) * 1.5; setL([[bx, -10], [bx, 10]], lw * (hash(i * 1.9) > .6 ? .55 : .3), P.code, 'inkfine', 0); }
  setP([[-200, -14], [-188, -15], [-186, 14], [-198, 15]], { wash: P.bandSh, ink: null });
  pop();
  if (o.text !== false) { const c = Math.cos(o.rot ?? -.06), si = Math.sin(o.rot ?? -.06), tx = 40 * s, ty = 1 * s;
    setLetter('PATIENT: YOU', x + tx * c - ty * si, y + tx * si + ty * c, 19 * s, P.code, { font: fontCSS('ui', 19 * s, { weight: 800 }), rot: o.rot ?? -.06, seed: 41, j: .3 }); }
}
// A grey unread-notification "snowflake": a little card with a dot and a bar (no text). Anchor: centre.
function setFlake(x, y, s = 1, rot = 0, o = {}) {
  const P = setPalOf(o);
  push(); translate(x, y); rotate(rot); scale(s);
  setP(rrPts(-22, -9, 44, 18, 6), { wash: o.col || P.snow, washOp: o.op ?? 255, ink: null });
  setP(ellPts(-12, 0, 4, 4, 8), { wash: o.dk || P.snowDk, ink: null });
  setP(setBox(-5, -2, 15, 2), { wash: o.lt || P.snowLt, ink: null });
  pop();
}

// ---------------------------------------------------------------- the ward's hospital things
// IV stand. Anchor: floor point under the pole. ~900 tall. o.hooks (2 or 4). Returns the hook points.
function setIVStand(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]), hooks = o.hooks || 2;
  boilSeed('setivstand' + (o.key || ''));
  setP(M(ellPts(0, -4, 110, 12, 14)), { wash: P.shadow, washOp: 110, ink: null });
  for (const [ex, ey] of [[-104, -10], [-30, 4], [44, 4], [108, -10]]) { setL(M([[0, -40], [ex, ey - 8]]), sw * 1.6, P.ivMetalDk, 'ink', 0); setP(M(ellPts(ex, ey - 4, 9, 8, 8)), { wash: P.ivMetalDk, ink: P.ink, sw: sw * .4 }); }
  setP(M(setBox(-7, -900, 7, -40, .3)), { wash: P.ivMetal, ink: P.ink, sw: sw * .7 });
  setP(M(setBox(-10, -560, 10, -520, .3)), { wash: P.ivMetalDk, ink: P.ink, sw: sw * .5 });
  const span = hooks > 2 ? 230 : 160, H = [];
  setP(M(setBox(-span / 2, -906, span / 2, -894, .3)), { wash: P.ivMetal, ink: P.ink, sw: sw * .6 });
  for (let i = 0; i < hooks; i++) {
    const hx = lerp(-span / 2 + 6, span / 2 - 6, hooks > 1 ? i / (hooks - 1) : .5);
    setL(M([[hx, -900], [hx, -872], [hx + 8, -866], [hx + 12, -874]]), sw * .6, P.ivMetalDk, 'ink', .5);
    H.push([x + hx * s, y - 868 * s]);
  }
  return H;
}
// An IV bag with glowing tokens in it. Anchor: the hook. o.fill 0..1 (liquid level), o.t (tokens drift), o.glow 0..1.
// Returns the drip port point (where the tube starts).
function setIVBag(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), M = Q => Q.map(([a, b]) => [x + a * s, y + b * s]), lv = o.fill ?? .75, t = o.t ?? T, kk = 'setivbag' + (o.key || '');
  boilSeed(kk);
  setP(M([[-14, 4], [14, 4], [12, 26], [-12, 26]]), { wash: P.bag, ink: P.ink, sw: sw * .5 });
  setP(M(ellPts(0, 12, 5, 5, 8)), { wash: P.shadow, ink: null });
  const bag = [[-58, 26], [58, 26], [64, 60], [64, 160], [50, 190], [12, 200], [-12, 200], [-50, 190], [-64, 160], [-64, 60]];
  setP(M(bag), { wash: P.bag, washOp: SET_MODE === 'line' ? 0 : 200, ink: P.ink, sw: sw * .7, curv: .4 });
  const ly = lerp(196, 40, lv);
  setP(M([[-63, ly], [-20, ly - 5], [20, ly + 4], [63, ly - 2], [64, 160], [50, 190], [12, 199], [-12, 199], [-50, 190], [-64, 160]]), { wash: P.liquid, washOp: 210, ink: null, curv: .4 });
  setL(M([[-63, ly], [-20, ly - 5], [20, ly + 4], [63, ly - 2]]), sw * .5, P.token, 'inkfine', .5);
  for (let i = 0; i < 9; i++) {   // the tokens: small glyph blocks drifting up through the liquid
    const tx = -44 + 88 * hash(i * 2.7 + (o.seed || 0)), ty = lerp(188, ly + 12, frac(hash(i * 5.3) + t * (.08 + .05 * hash(i)))), r = 5 + 3 * hash(i * 9.1);
    boilSeed(kk + 'tok' + i);
    setP(M(starPts(tx, ty, r, .62, i % 2 ? 4 : 3, t * .5 + i)), { wash: P.token, ink: null, line: true });
  }
  setP(M(setBox(-7, 200, 7, 222, .3)), { wash: P.bag, ink: P.ink, sw: sw * .5 });
  setP(M(rrPts(-10, 222, 20, 40, 6)), { wash: P.bag, washOp: 200, ink: P.ink, sw: sw * .5 });
  if (o.glow) glow(x, y + 120 * s, 150 * s, P.liquid, o.glow);
  return [x, y + 262 * s];
}
// A drip tube from p0 to p1 with light pulses running down it. o.sag (px), o.t, o.pulses (count), o.col, o.glow.
function setTube(p0, p1, o = {}) {
  const P = setPalOf(o), sag = o.sag ?? 120, pts = setSag(p0, p1, sag, 14), sw = o.sw ?? 1, t = o.t ?? T;
  boilSeed('settube' + (o.key || ''));
  setL(pts, sw * 1.6, P.tube, 'ink', .5);
  setL(pts, sw * .5, o.col || P.liquid, 'inkfine', .5);
  const n = o.pulses ?? 3;
  for (let i = 0; i < n; i++) {
    const k = frac(t * (o.speed ?? .45) + i / n), q = Math.min(13, Math.floor(k * 14)), f = k * 14 - q;
    const pt = [lerp(pts[q][0], pts[q + 1][0], f), lerp(pts[q][1], pts[q + 1][1], f)];
    glow(pt[0], pt[1], (o.r ?? 26) * sw, o.col || P.liquid, (o.glow ?? .7) * Math.sin(k * Math.PI));
  }
  return pts;
}
// The giant ring surgical lamp. Anchor: the ring's centre. rx × ry (default 420 × 105 at s = 1), seen a little from
// below. o.stem (default true: two rods up into the dark), o.cells (lamp cells on the front arc). Light is live:
// setRingLampLight(x, y, s, k, col).
function setRingLamp(x, y, s = 1, o = {}) {
  const P = setPalOf(o), sw = setSW(s), rx = (o.rx || 420) * s, ry = (o.ry || 105) * s, th = (o.th || 34) * s, kk = 'setlamp' + (o.key || '');
  const arc = (a0, a1, r1, r2, n = 22) => { const A = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); A.push([x + Math.cos(a) * r1, y + Math.sin(a) * r2]); } return A; };
  boilSeed(kk);
  if (o.stem !== false) for (const sd of [-1, 1]) setP(setBox(x + sd * rx * .32 - 6 * s, y - ry - 1400 * s, x + sd * rx * .32 + 6 * s, y - ry * .7), { wash: P.lampDk, ink: P.ink, sw: sw * .6 });
  // back half (far side, upper arc), then the front half thicker and lit
  const back = arc(Math.PI, TAU, rx, ry), backIn = arc(TAU, Math.PI, rx - th, ry - th * .35);
  setP([...back, ...backIn], { wash: P.lampDk, ink: P.ink, sw: sw * .8 });
  const front = arc(0, Math.PI, rx, ry + th * .4), frontIn = arc(Math.PI, 0, rx - th, ry - th * .35);
  setP([...front, ...frontIn], { wash: P.lampBody, ink: P.ink, sw });
  if (o.cells !== false) for (let i = 0; i < 11; i++) { const a = lerp(.18, Math.PI - .18, i / 10); setP(ellPts(x + Math.cos(a) * (rx - th * .5), y + Math.sin(a) * (ry + th * .05), 12 * s, 7 * s, 10), { wash: P.lampCell, ink: P.ink, sw: sw * .4 }); }
}
function setRingLampLight(x, y, s = 1, k = 1, col = SET_C.cyan, o = {}) {
  if (k <= 0) return;
  const rx = (o.rx || 420) * s, ry = (o.ry || 105) * s;
  setRingLight(x, y + 8 * s, rx * 1.02, ry * 1.25, col, .9 * k);
  for (let i = 0; i < 7; i++) { const a = lerp(.3, Math.PI - .3, i / 6); glow(x + Math.cos(a) * rx * .93, y + Math.sin(a) * ry * 1.05, 70 * s, col, .55 * k); }
  glow(x, y + ry * 2.4, rx * 1.3, col, .35 * k);   // the pool of light it throws down
}
