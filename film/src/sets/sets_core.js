// sets_core.js: the shared kit for the film's painted sets (src/sets/*). Global-script style; every global is prefixed
// set / SET_. Painted only through paint() / inkLine() (p5.brush) and glow()-style additive light; lettering only through
// letter(). See src/sets/STATUS.md for the API of every set, variant and prop, the world coordinates and the costs.
//
//   setTone(hex, spec)        recolour one colour for a lighting variant (darken, tint, desaturate)
//   setP(pts, o) / setL(...)  paint() / inkLine() that follow SET_MODE: 'paint' (watercolour sets) or 'line' (the
//                             final chorus' clean cyan line drawing: only outlines, in one clean pen, no washes)
//   setTiles(key, draw, o)    a static world-space set cached in frame-sized tiles (cachedLayer, 3 boil variants),
//                             painted lazily (only the tiles the camera sees), at a resolution chosen from the zoom
//   setScreenLayer(key, draw) a static frame-sized background in SCREEN space (voids, papers), cached
//   setShaft / setCone / setRingLight   additive light marks (glow()'s texture trick, other shapes): light shafts
//                             through blinds, the scanning beam, alarm bands, halo rings
//   setLetter(...)            letter() with a held-cel boil (a tiny jitter that changes 12 times a second)
//   setKeysAt(keys, t)        typing state from typing events ({t, ch}; ch '⌫' backspace, '⏎' enter)

const SET_C = {   // STORYBOARD §2 palette (no pure black, no pure white)
  paper: '#F3EBDC', ink: '#2B2233', amber: '#FFB070', skin: '#FFD9B8', ember: '#FF6A3D', cyan: '#7FE9FF', cyanW: '#E8FDFF',
  deep: '#1B6FFF', void: '#05060A', navy: '#070B16', fever: '#FF2E63', blood: '#B0002A', gold: '#FFD36E', unread: '#6B7280',
  dawn: '#FFE9C2', white503: '#F4F4F2'
};

// ---------- colour ----------
const setHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const setRGB = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const setLum = h => { const [r, g, b] = setHex(h); return (.3 * r + .59 * g + .11 * b) / 255; };
function setDesat(h, k) { const [r, g, b] = setHex(h), l = .3 * r + .59 * g + .11 * b; return setRGB(lerp(r, l, k), lerp(g, l, k), lerp(b, l, k)); }
// spec: { dark: 0..1 (toward a deep shadow colour), tint: hex, tintK, desat: 0..1, lift: 0..1 (toward paper) }
function setTone(h, sp) {
  if (!sp) return h;
  let c = h;
  if (sp.desat) c = setDesat(c, sp.desat);
  if (sp.dark) c = mixCol(c, sp.shadow || '#0B0D1A', sp.dark);
  if (sp.tint) c = mixCol(c, sp.tint, sp.tintK ?? .3);
  if (sp.lift) c = mixCol(c, sp.liftCol || SET_C.paper, sp.lift);
  return c;
}
// a palette object: every key of base toned with spec; keys listed in sp.keep get spec.keepSpec instead (e.g. the warm
// photos that stay warm in the drained room until 06E)
function setPalFrom(base, sp, extra = {}) {
  const c = {};
  for (const k in base) c[k] = setTone(base[k], sp.keep && sp.keep.includes(k) ? sp.keepSpec : sp);
  return Object.assign(c, extra);
}

// ---------- painting (paint mode / line mode) ----------
// SET_MODE 'line' turns every set and prop into a clean line drawing: shapes with an outline (or o.line) are drawn as
// thin even outlines in SET_LINE.col, washes, fills and hatching are dropped; inkLines keep their path.
let SET_MODE = 'paint';
const SET_LINE = { col: '#7FE9FF', sw: 1, br: 'setclean' };
let SET_BRUSHES = false;
function setBrushes() {
  if (SET_BRUSHES) return; SET_BRUSHES = true;
  brush.add('setclean', { type: 'default', weight: 2.4, scatter: .02, sharpness: .95, grain: 1, opacity: 235, spacing: .12, pressure: [1, 1], rotate: 'natural', noise: 0 });
}
function setP(pts, o = {}) {
  if (SET_MODE === 'line') {
    if (o.ink === null && !o.line) return;
    setBrushes();
    paint(pts, { ink: o.lineCol || SET_LINE.col, sw: (o.lineSw ?? 1) * SET_LINE.sw, br: SET_LINE.br, curv: o.curv });
    return;
  }
  setBrushes();
  paint(pts, o);
}
function setL(pts, sw = 1, col = PAL.ink, br = 'ink', curv = .5, o = {}) {
  if (SET_MODE === 'line') { if (o.skipLine) return; setBrushes(); inkLine(pts, (o.lineSw ?? .8) * SET_LINE.sw, o.lineCol || SET_LINE.col, SET_LINE.br, curv); return; }
  inkLine(pts, sw, col, br, curv);
}
// outline weight for a prop drawn at scale s (outlines are in world units: keep them from ballooning in close-ups)
const setSW = s => clamp(.35 + .65 * Math.sqrt(s), .3, 2.4);
// transform a point list: offset (x, y), scale s, optional rotation a about (x, y), optional mirror
function setTf(P, x, y, s = 1, a = 0, flip = false) {
  const c = Math.cos(a), si = Math.sin(a), f = flip ? -1 : 1;
  return P.map(([px, py]) => { const X = px * s * f, Y = py * s; return [x + X * c - Y * si, y + X * si + Y * c]; });
}
// a wobbly hand-drawn rectangle outline as points (corners slightly soft), j = jitter
const setBox = (x0, y0, x1, y1, j = 0) => rectPts(x0, y0, x1 - x0, y1 - y0, j);
// catenary-ish sag curve between two points
function setSag(p0, p1, sag, n = 10) {
  const P = []; for (let i = 0; i <= n; i++) { const k = i / n; P.push([lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k) + sag * 4 * k * (1 - k)]); } return P;
}

// ---------- additive light marks (like glow(): real light under the paper grain) ----------
const SET_TEX = {};
function setTex(name) {
  if (SET_TEX[name]) return SET_TEX[name];
  const S = name === 'cone' ? [512, 256] : name === 'bar' ? [64, 256] : [256, 256];
  const g = createGraphics(S[0], S[1]); g.pixelDensity(1); const c = g.drawingContext;
  if (name === 'bar') {          // soft vertical bar: gaussian across, faded ends
    const id = c.createImageData(S[0], S[1]), d = id.data;
    for (let y = 0; y < S[1]; y++) for (let x = 0; x < S[0]; x++) {
      const u = (x + .5) / S[0] * 2 - 1, v = (y + .5) / S[1], a = Math.exp(-u * u * 4.5) * Math.min(1, v / .12, (1 - v) / .12);
      const i = (y * S[0] + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255 * clamp(a);
    }
    c.putImageData(id, 0, 0);
  } else if (name === 'cone') {  // wedge from the apex at the left middle, opening right (half-angle = atan(.5))
    const id = c.createImageData(S[0], S[1]), d = id.data;
    for (let y = 0; y < S[1]; y++) for (let x = 0; x < S[0]; x++) {
      const px = (x + .5) / S[0], py = ((y + .5) / S[1] - .5), half = .5 * px + .004, e = Math.abs(py) / half;
      const a = e >= 1 ? 0 : (1 - e * e) * (1 - e * e) * Math.pow(1 - px, .7) * Math.min(1, px / .03);
      const i = (y * S[0] + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255 * clamp(a);
    }
    c.putImageData(id, 0, 0);
  } else if (name === 'ring') {  // thin bright annulus with a soft falloff both ways
    const id = c.createImageData(S[0], S[1]), d = id.data;
    for (let y = 0; y < S[1]; y++) for (let x = 0; x < S[0]; x++) {
      const r = Math.hypot((x + .5) / S[0] * 2 - 1, (y + .5) / S[1] * 2 - 1), q = (r - .82) / .1, a = Math.exp(-q * q) + .25 * Math.exp(-(((r - .82) / .3) ** 2));
      const i = (y * S[0] + x) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 255 * clamp(a * (r < 1 ? 1 : 0));
    }
    c.putImageData(id, 0, 0);
  }
  return (SET_TEX[name] = g);
}
function setAdd(tex, x, y, w, h, ang, col, a, ox = .5) {
  if (a <= 0.003 || w < 1 || h < 1) return;
  flushBrush();
  const c = color(col);
  push(); translate(x, y); rotate(ang); blendMode(ADD); tint(red(c), green(c), blue(c), 150 * clamp(a));
  image(tex, -w * ox, -h / 2, w, h); noTint(); blendMode(BLEND); pop();
}
// a soft shaft of light from p0 to p1, wid wide (light through blinds, a slit under a door)
function setShaft(p0, p1, wid, col = SET_C.dawn, a = .6) {
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);   // the bar texture runs along its y axis
  setAdd(setTex('bar'), (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, wid, L, Math.atan2(dy, dx) - Math.PI / 2, col, a);
}
// a cone of light from the apex (x, y) toward angle ang, len long, spread = half-width at the far end / len
function setCone(x, y, ang, len, spread = .35, col = SET_C.amber, a = .6) { setAdd(setTex('cone'), x, y, len, len * spread * 2, ang, col, a, 0); }
// an elliptical ring of light (the ring lamp, halos, ripples)
function setRingLight(x, y, rx, ry, col = SET_C.cyan, a = .8, ang = 0) { setAdd(setTex('ring'), x, y, rx * 2 / .92, ry * 2 / .92, ang, col, a); }

// ---------- cached sets ----------
// Resolution of a world-space set's cache for a camera zoom: layer pixels per world pixel. Below ~.55 a whole-room view
// is painted at half resolution (one tile), up to 1.1 at 1:1, then 2× and 3× for close framings.
const setAutoRes = z => z <= .56 ? .5 : z <= 1.12 ? 1 : z <= 2.2 ? 2 : 3;
// setTiles(key, draw, o): a static world-space layer drawn under the current camera, cached in frame-sized tiles.
//   draw(x0, y0, x1, y1, res): paints everything that touches that world rectangle (world coordinates; cull by it).
//   o.res: fix the resolution for a shot (default setAutoRes(zoom): fix it for a push or pull, or the detail pops).
//   o.variants: boil drawings (default 3). o.cam: the camera to frame for (default the active one).
// Each tile is its own cachedLayer, so only tiles the camera sees get painted (once per boil variant per worker).
// Every element must seed itself (boilSeed per element) so a shape crossing a tile seam paints identically in both.
let SET_TILE_STATS = { tiles: 0 };
function setTiles(key, draw, o = {}) {
  const cam = o.cam || CAM || { cx: W / 2, cy: H / 2, zoom: 1, rot: 0 };
  const res = o.res ?? setAutoRes(cam.zoom), tw = W / res, th = H / res;
  const hw = W / 2 / cam.zoom, hh = H / 2 / cam.zoom, c = Math.abs(Math.cos(cam.rot || 0)), s = Math.abs(Math.sin(cam.rot || 0));
  const ex = hw * c + hh * s + 2, ey = hw * s + hh * c + 2;
  const x0 = cam.cx - ex, x1 = cam.cx + ex, y0 = cam.cy - ey, y1 = cam.cy + ey;
  let n = 0;
  for (let j = Math.floor(y0 / th); j * th < y1; j++) for (let i = Math.floor(x0 / tw); i * tw < x1; i++) {
    const wx = i * tw, wy = j * th;
    push(); translate(wx, wy); scale(1 / res);
    cachedLayer(`${key}@${res}:${i},${j}`, o.variants ?? 3, () => { scale(res); translate(-wx, -wy); draw(wx, wy, wx + tw, wy + th, res); });
    pop(); n++;
  }
  SET_TILE_STATS.tiles = n;
}
// bounding-box test for culling inside a tile's draw (m = margin for bleeds and strokes)
const setHit = (bb, x0, y0, x1, y1, m = 70) => bb[2] >= x0 - m && bb[0] <= x1 + m && bb[3] >= y0 - m && bb[1] <= y1 + m;
// a static frame-sized background in screen space (voids, papers), cached; draw() paints in screen pixels.
// par = [dx, dy] parallax offset in px: the layer is drawn 6 % larger so a small offset never shows an edge.
function setScreenLayer(key, draw, o = {}) {
  push(); resetMatrix(); translate(-W / 2, -H / 2);
  const p = o.par || [0, 0], k = o.par ? 1.06 : 1;
  translate(W / 2 + clamp(p[0], -50, 50), H / 2 + clamp(p[1], -28, 28)); scale(k); translate(-W / 2, -H / 2);
  cachedLayer(key, o.variants ?? 3, draw, { paper: o.paper !== false });
  pop();
}

// ---------- lettering ----------
// letter() with a held-cel boil: the position and angle shift a hair 12 times a second, like the painted lines.
// o: font (CSS, e.g. fontCSS('human', 40)), align, alpha, rot, ink (false by default), seed, j (jitter px, default .6)
function setLetter(txt, x, y, size, col, o = {}) {
  const sd = (o.seed || 0) * 7.31 + BOILN * 1.37, j = o.j ?? .6, s = size / 40;
  letter(txt, x + (hash(sd) - .5) * 2 * j * s, y + (hash(sd + 3.1) - .5) * 2 * j * s, size, col,
    { ink: false, ...o, rot: (o.rot || 0) + (hash(sd + 7.7) - .5) * .006 });
}
// text width in px for a CSS font (to place a caret, a gap or a bubble around lettering)
let SET_MEAS = null;
function setTextW(txt, font) {
  if (!SET_MEAS) SET_MEAS = document.createElement('canvas').getContext('2d');
  SET_MEAS.font = font; return SET_MEAS.measureText(txt).width;
}

// ---------- typing ----------
// keys: [{t, ch}] (events('typing') / events('typing_outro'), or setKeysFrom); returns the state at t:
// { text, n (chars shown), last (time of the last key), sent (time of ⏎ or null), age (t - last), keys (keys pressed) }
function setKeysAt(keys, t) {
  let text = '', last = -Infinity, sent = null, k = 0;
  for (const e of keys) {
    if (e.t > t) break;
    k++; last = e.t;
    if (e.ch === '⌫') text = text.slice(0, -1);
    else if (e.ch === '⏎') { sent = e.t; }
    else if (sent == null) text += e.ch;
  }
  return { text, n: text.length, last, sent, age: t - last, keys: k };
}
// keys from a string at an even pace: setKeysFrom('are yuo⌫⌫⌫you there?⏎', t0, .1)
function setKeysFrom(str, t0, dt = .1) { return Array.from(str).map((ch, i) => ({ t: t0 + i * dt, ch })); }

// ---------- painted marks (never letters): ✓ ♥ ↻ and the three dots ----------
function setCheck(x, y, s, col = SET_C.cyan, o = {}) {
  boilSeed('setcheck' + (o.key || ''));
  const P = setTf([[-.55, .02], [-.18, .42], [.6, -.5]], x, y, s, o.rot || 0);
  setP(ribbon(P, .2 * s, .14 * s), { wash: col, ink: o.ink === undefined ? null : o.ink, sw: setSW(s / 60) });
  if (o.glow) glow(x, y, s * 1.8, col, o.glow);
}
function setHeartPts(x, y, r, n = 26) {
  const P = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, sx = 16 * Math.pow(Math.sin(a), 3), sy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); P.push([x + sx * r / 16, y - sy * r / 16]); } return P;
}
function setHeart(x, y, s, col = SET_C.fever, o = {}) {
  boilSeed('setheart' + (o.key || ''));
  setP(setHeartPts(x, y, s * .5 * (1 + jit(.015))), { wash: col, ink: o.ink === undefined ? null : o.ink, sw: setSW(s / 60), curv: .2 });
  if (o.glow) glow(x, y, s * 1.6, col, o.glow);
}
// ↻: an open arc with an arrowhead, rot turns it (08G spins it once)
function setRefresh(x, y, s, col = SET_C.cyan, o = {}) {
  boilSeed('setrefresh' + (o.key || ''));
  const r = s * .42, a0 = -Math.PI * .35 + (o.rot || 0), a1 = a0 + Math.PI * 1.55, P = [];
  for (let i = 0; i <= 14; i++) { const a = lerp(a0, a1, i / 14); P.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  setP(ribbon(P, s * .11, s * .13), { wash: col, ink: null });
  const e = P[P.length - 1], tA = a1 + Math.PI / 2, n = [Math.cos(tA), Math.sin(tA)], q = [Math.cos(a1), Math.sin(a1)], h = s * .2;
  setP([[e[0] + n[0] * h * 1.1, e[1] + n[1] * h * 1.1], [e[0] + q[0] * h, e[1] + q[1] * h], [e[0] - q[0] * h, e[1] - q[1] * h]], { wash: col, ink: null, line: true });
  if (o.glow) glow(x, y, s * 1.4, col, o.glow);
}
// • • •: three smooth capsule dots. o: col, gap (centre spacing in r), t (for the eighth-note wave), wave (0..1 how much
// they take turns brightening), n (how many are still there, fractional = the last one popping out), still (frozen
// grey dots), glow (0..1), key.
function setDots(x, y, r, o = {}) {
  const col = o.col || SET_C.cyan, gap = (o.gap ?? 3.1) * r, n = o.n ?? 3, t = o.t ?? T, wave = o.wave ?? 1;
  for (let i = 0; i < 3; i++) {
    const vis = clamp(n - i); if (vis <= 0) continue;
    const ph = o.still ? 0 : Math.pow(.5 + .5 * Math.cos((bpOf(t) * 2 / 3 - i / 3) * TAU), 3), lift = o.still ? 0 : -.35 * r * ph * wave;
    const rr = r * (vis < 1 ? backOut(vis) : 1) * (1 + .12 * ph * wave), cx = x + (i - 1) * gap, cy = y + lift;
    boilSeed('setdots' + (o.key || '') + i);
    setP(ellPts(cx, cy, rr, rr * .92, 18, r * .02), { wash: o.still ? col : mixCol(col, '#FFFFFF', .12 * ph * wave), ink: o.ink ?? null, sw: setSW(r / 25), line: true });
    if (o.glow) glow(cx, cy, rr * 3.2, col, o.glow * (.6 + .4 * ph * wave) * vis);
  }
}
// a blinking caret (painted bar); on = 0..1
function setCaret(x, y, h, col = SET_C.amber, on = 1, o = {}) {
  if (on <= 0) return;
  boilSeed('setcaret' + (o.key || ''));
  setP(setBox(x - h * .045, y - h * .5, x + h * .045, y + h * .5), { wash: col, washOp: 255 * on, ink: null, line: true });
  if (o.glow) glow(x, y, h * 1.2, col, o.glow * on);
}
const setBlink = (t, rate = 1.06) => frac(t * rate) < .55 ? 1 : 0;
