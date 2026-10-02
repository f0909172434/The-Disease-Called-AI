// "Him" front head: face, ears, eyes, brows, nose, mouth, glasses, hair. Head-local coordinates:
// origin = midpoint between the eyes on the eye line, +y down, 1 unit = 1 bust reference unit
// (skull top -215, chin +180, half width 148). `H` = { x, y, s, rot, px, py } places the head:
// view = (x, y) + R(rot) * (local - pivot) * s + pivot * s ; pivot defaults to the neck (0, 140).
import { P, clamp, lerp, sway, mirrorX } from '../geom.js';
import { paint, shade, ink, clump, inkProfile, shapePath, blendExpr, mix, rgba, sampleSpline } from './kit.js';

// ------------------------------------------------------------------ expressions
// browIn/browOut: brow end offsets (+ = down). worry: inner ends up into a tent. lid: upper lid
// closure (+ heavy, − wide). low: lower lid raise (squint). iris/pupil: size delta. shine: highlight
// delta. curve: mouth corners (+ smile). open: mouth open floor. under: dark circles. pale: pallor.
export const EXPR = {
  neutral: {},
  focused: { browIn: 5, browOut: -1, lid: 0.14, low: 0.18, curve: -0.15, furrow: 0.5 },
  smile: { browIn: -5, browOut: 1, lid: 0.12, low: 0.55, curve: 1, cheek: 1, shine: 0.1 },
  tired: { browIn: -3, browOut: 5, worry: 0.25, lid: 0.46, low: 0.05, under: 1, pale: 0.4, shine: -0.55, curve: -0.35, open: 0.06, iris: -0.02 },
  anxious: { browIn: -10, browOut: 5, worry: 1, lid: -0.12, low: 0.12, iris: -0.1, pupil: -0.15, curve: -0.7, sweat: 1, pale: 0.25, wobble: 1, under: 0.35 },
  panic: { browIn: -14, browOut: 8, worry: 1.3, lid: -0.42, low: -0.08, iris: -0.28, pupil: -0.45, open: 0.7, curve: -1, sweat: 1.6, pale: 0.6, gloom: 1, shine: -0.3, teeth: 1, under: 0.5 },
  blank: { browIn: -1, browOut: 3, lid: 0.3, shine: -1, dull: 1, screen: 1, open: 0.05, pale: 0.3, under: 0.6, iris: 0.03 },
};

export function exprVals(p) {
  const e = blendExpr(EXPR, p.expr);
  const g = (k) => e[k] || 0;
  return {
    browIn: g('browIn'), browOut: g('browOut'), worry: g('worry'), lid: g('lid'), low: g('low'),
    iris: g('iris'), pupil: g('pupil'), shine: clamp(1 + g('shine'), 0, 1.2), curve: g('curve'), open: g('open'),
    under: clamp(g('under')), pale: clamp(g('pale')), sweat: g('sweat'), gloom: clamp(g('gloom')), dull: clamp(g('dull')),
    screen: clamp(g('screen')), cheek: clamp(g('cheek')), teeth: clamp(g('teeth')), wobble: g('wobble'), furrow: g('furrow'),
  };
}

// ------------------------------------------------------------------ transform

export function headXf(H) {
  const { x, y, s = 1, rot = 0, px = 0, py = 140 } = H;
  const c = Math.cos(rot), sn = Math.sin(rot);
  const f = (pt) => {
    const q = pt.slice();
    const lx = pt[0] - px, ly = pt[1] - py;
    q[0] = x + (lx * c - ly * sn + px) * s;
    q[1] = y + (lx * sn + ly * c + py) * s;
    return q;
  };
  f.list = (l) => l.map(f);
  f.s = s;
  f.rot = rot;
  return f;
}

const R = (pts) => pts.map((q) => P(q[0], q[1], q[2] || 0, q[3] ?? 1));
const M = (pts) => mirrorX(pts, 0); // mirror local x

// ------------------------------------------------------------------ static geometry (right half / right side, x > 0)

// face silhouette, right half from the crown down to the chin
const FACE_R = [[0, -228], [70, -218], [122, -188], [142, -140], [148, -75], [149, -12], [146, 42], [138, 86], [119, 124, 0, 0.9], [84, 153], [42, 172], [0, 179]];
const FACE = R([...FACE_R, ...M(FACE_R).reverse().slice(1, -1)]);

const EAR_R = R([[141, -16], [156, -26], [170, -19], [176, 6], [172, 38], [161, 62], [146, 76], [137, 70]]);
const EAR_IN_R = [[151, -9], [164, -8], [168, 14], [163, 40], [153, 54]];

// upper lid (inner -> outer) neutral / wide, lower lid (inner -> outer)
const UP0 = [[44, 5], [51, -6], [66, -16], [90, -21], [113, -18], [129, -9], [137, 2]];
const UPW = [[44, 3], [50, -12], [65, -26], [90, -31], [114, -28], [130, -17], [138, 0]];
const LO0 = [[44, 5], [56, 10], [72, 12.5], [92, 13.5], [112, 12], [128, 8], [137, 2]];
const LOS = [[44, 4], [56, 3], [72, 0], [92, -1], [112, 0], [128, 1], [137, 1]]; // smile squint (raised, arched)

// ------------------------------------------------------------------ head geometry for params

export function headGeom(p) {
  const ex = exprVals(p);
  const t = p.t || 0;
  // eye lids
  const low = clamp(ex.low, -0.3, 1);
  const lower = LO0.map((q, i) => {
    const s = LOS[i];
    const lo = low >= 0 ? [lerp(q[0], s[0], low), lerp(q[1], s[1], low)] : [q[0], q[1] - low * 6 * Math.sin((i / 6) * Math.PI)];
    return lo;
  });
  const lidRaw = ex.lid;
  const close = clamp(Math.max(0, lidRaw) + clamp(p.blink) * (1 - Math.max(0, lidRaw)));
  let upper;
  if (lidRaw < 0 && close <= 0.001) upper = UP0.map((q, i) => [lerp(q[0], UPW[i][0], -lidRaw), lerp(q[1], UPW[i][1], -lidRaw)]);
  else {
    const base = lidRaw < 0 ? UP0.map((q, i) => [lerp(q[0], UPW[i][0], -lidRaw), lerp(q[1], UPW[i][1], -lidRaw)]) : UP0;
    // closed target: just above the lower lid, slightly drooping arc
    upper = base.map((q, i) => {
      const l = lower[i];
      const target = [l[0], l[1] - 1.5 + Math.sin((i / 6) * Math.PI) * 1.5];
      const u = close;
      // lids close from the middle a little faster (eased), corners stay put
      return [lerp(q[0], target[0], u), lerp(q[1], target[1], u * (0.92 + 0.08 * Math.sin((i / 6) * Math.PI)))];
    });
  }
  // brows (right side), inner -> outer
  const wob = ex.wobble ? Math.sin(t * 23) * 0.8 * ex.wobble : 0;
  const bi = ex.browIn, bo = ex.browOut, w = ex.worry;
  const brow = [
    [30 + w * 3, -50 + bi - w * 10 + wob],
    [60, -58 + bi * 0.6 - w * 9],
    [100, -62 + (bi + bo) * 0.35 - w * 3],
    [138, -55 + bo],
  ];
  return { ex, upper, lower, close, brow };
}

// ------------------------------------------------------------------ layers

/** behind the head: back hair mass */
export function drawBackHair(pen, p, H) {
  const X = headXf(H);
  const pal = pen.pal;
  const sw = hairSwayFn(p);
  const back = R([[-148, 96], [-170, 52], [-184, -30], [-182, -120], [-156, -198], [-96, -248], [0, -264], [96, -250], [158, -200],
    [184, -120], [188, -30], [176, 50], [152, 96], [96, 112], [0, 116], [-96, 112]]);
  paint(pen, X.list(back), pal.hairShade, { id: 'bh', pool: 0.5 });
  // nape spikes peeking beside the neck
  for (const [i, s] of [[0, 1], [1, -1]]) {
    const sp = R([[s * 128, 40], [s * 150, 82], [s * 140, 122]]);
    clump(pen, X.list(swayList(sp, sw, 3 + i, 0.4)), [[0, 34 * X.s], [0.5, 24 * X.s], [1, 0]], { id: 'nape' + i, fill: pal.hairShade, line: pal.hairLine, lw: 2.6 * X.s });
  }
}

/** face skin + ears + skin shading (no features) */
export function drawFace(pen, p, H, { neckShadow = true } = {}) {
  const X = headXf(H);
  const pal = pen.pal;
  const s = X.s;
  // ears (behind face)
  for (const side of [1, -1]) {
    const ear = side > 0 ? EAR_R : M(EAR_R);
    const ep = paint(pen, X.list(ear), pal.skin, { id: 'ear' + side, k: 0.5 });
    const inner = side > 0 ? EAR_IN_R : M(EAR_IN_R);
    shade(pen, ep, X.list(R([[inner[0][0] - side * 2, inner[0][1]], ...inner.slice(1), [side * 142, 50], [side * 142, -5]])), pal.skinShade, { id: 'earsh' + side, k: 0.5 });
    ink(pen, X.list(ear.slice(0, 7)), 3.6 * s, pal.skinLine, { id: 'ear' + side, k: 0.5, start: 0.3, end: 0.4 });
    ink(pen, X.list(R(inner)), 2.2 * s, pal.skinLineSoft, { id: 'earin' + side, k: 0.5, start: 0.2 });
    ink(pen, X.list(R([[side * 147, 18], [side * 154, 26], [side * 152, 34]])), 1.8 * s, pal.skinLineSoft, { id: 'trag' + side, k: 0.4 });
  }
  const face = X.list(FACE);
  const fp = paint(pen, face, pal.skin, { id: 'face', pool: 0.8 });
  // shading: right side cheek/jaw crescent
  shade(pen, fp, X.list(R([[150, -120], [151, -10], [147, 46], [139, 90], [120, 127], [86, 156], [44, 175], [20, 182], [60, 156],
    [100, 124], [118, 88], [126, 40], [130, -10], [134, -80]])), pal.skinShade, { id: 'cheekSh' });
  // left jaw underside rim
  shade(pen, fp, X.list(R([[-150, 40], [-140, 92], [-120, 128], [-86, 156], [-44, 176], [0, 184], [-40, 168], [-82, 147], [-112, 118], [-132, 84], [-142, 40]])), pal.skinShade, { id: 'jawL', alpha: 0.75 });
  // forehead shadow cast by the bangs
  pen.clip(fp, () => {
    for (const b of bangs(p)) {
      const sh = b.spine.map((q) => [q[0] + 7, q[1] + 15]);
      const r = pen.ribbon(X.list(R(sh)), b.wf(X.s * 1.08), { id: 'bsh' + b.i, step: 3 });
      pen.fill(r.path, pal.skinShade, 1);
    }
    // under the hair cap generally
    const cap = X.list(R([[-160, -60], [-150, -150], [-80, -190], [0, -196], [80, -190], [150, -150], [160, -60], [130, -110], [60, -150], [0, -160], [-60, -150], [-130, -110]]));
    pen.fill(pen.curve(cap, { closed: true, id: 'capsh' }), pal.skinShade, 1);
  });
  // face contour (two tapered strokes meeting at the chin)
  const right = FACE_R.slice(4);
  ink(pen, X.list(R(right)), 5.2 * s, pal.skinLine, { id: 'jawR', start: 0.25, end: 0.55, attack: 0.25, release: 0.15 });
  ink(pen, X.list(R(M(right))), 5.2 * s, pal.skinLine, { id: 'jawL', start: 0.25, end: 0.55, attack: 0.25, release: 0.15 });
  void neckShadow;
}

/** eyes, brows (under hair), nose, mouth, under-eye, blush */
export function drawFeatures(pen, p, H) {
  const X = headXf(H);
  const pal = pen.pal;
  const s = X.s;
  const G = headGeom(p);
  const ex = G.ex;
  // dark circles / tired bags
  const under = clamp(ex.under + (pen.look.underEye || 0));
  for (const side of [1, -1]) {
    const m = (l) => (side > 0 ? l : M(l));
    if (under > 0.01) {
      const crescent = R(m([[50, 12], [70, 22], [94, 27], [118, 22], [134, 8], [128, 20], [110, 34], [90, 39], [68, 34]]));
      pen.blob(...X([side * 92, 26]).slice(0, 2), 44 * s, pal.underEye, 0.35 * under, { sy: 0.38 });
      paint(pen, X.list(crescent), pal.underEye, { id: 'uc' + side, alpha: 0.32 * under, pool: 0.6 });
      ink(pen, X.list(R(m([[62, 27], [88, 34], [114, 28]]))), 2 * s, pal.skinLineSoft, { id: 'bag' + side, alpha: 0.75 * under, start: 0.2 });
    }
    drawEye(pen, p, X, G, side);
  }
  // brows under hair (full strength; overHair repeats them faintly)
  drawBrows(pen, X, G, 1);
  // furrow between brows (focused / anxious)
  const fur = clamp(ex.furrow + ex.worry * 0.6);
  if (fur > 0.05) {
    ink(pen, X.list(R([[-10, -52], [-7, -40], [-9, -30]])), 2 * s, pal.skinLineSoft, { id: 'fur1', alpha: fur });
    ink(pen, X.list(R([[10, -52], [8, -41], [10, -31]])), 2 * s, pal.skinLineSoft, { id: 'fur2', alpha: fur * 0.8 });
  }
  // nose: shaded right flank + small hooked tip
  const face = shapePath(pen, X.list(FACE), { id: 'face' });
  shade(pen, face, X.list(R([[7, -6], [15, 30], [19, 62], [15, 76], [5, 79], [11, 58], [9, 26]])), pal.skinShade, { id: 'noseSh', pool: 0.4 });
  ink(pen, X.list(R([[12, 36], [16, 60], [15, 72]])), 2.0 * s, pal.skinLineSoft, { id: 'noseB', start: 0.05, alpha: 0.8 });
  ink(pen, X.list(R([[15, 70], [9, 78], [-2, 80], [-9, 77]])), 3.2 * s, pal.skinLine, { id: 'noseT', start: 0.3, end: 0.1 });
  pen.blob(...X([-4, 72]).slice(0, 2), 6 * s, pal.skinLight, 0.8);
  // mouth
  drawMouth(pen, p, X, ex);
  // blush (param + smile cheeks)
  const bl = clamp((p.blush || 0) + ex.cheek * 0.35);
  if (bl > 0.01) {
    for (const side of [1, -1]) {
      pen.blob(...X([side * 92, 52]).slice(0, 2), 34 * s, pal.blush, 0.45 * bl, { sy: 0.5 });
      for (let i = 0; i < 3; i++) ink(pen, X.list(R([[side * (78 + i * 11), 46], [side * (72 + i * 11), 58]])), 1.8 * s, pal.blush, { id: 'bh' + side + i, alpha: bl, k: 0.4 });
    }
  }
}

function drawEye(pen, p, X, G, side) {
  const pal = pen.pal;
  const s = X.s;
  const ex = G.ex;
  const m = (l) => (side > 0 ? l : M(l));
  const up = R(m(G.upper)), lo = R(m(G.lower));
  const id = 'eye' + side;
  const close = G.close;
  // crease (double lid) — sits higher when the eye is wide, droops when tired
  const cr = R(m([[60, -27 + ex.lid * 6], [90, -32 + ex.lid * 7 - Math.min(0, ex.lid) * 4], [124, -24 + ex.lid * 6]]));
  ink(pen, X.list(cr), 2.0 * s, pal.skinLineSoft, { id: id + 'cr', k: 0.4, alpha: 0.85, start: 0.1 });
  if (ex.under > 0.3) ink(pen, X.list(R(m([[70, -36 + ex.lid * 8], [96, -40 + ex.lid * 8], [120, -32 + ex.lid * 6]]))), 1.6 * s, pal.skinLineSoft, { id: id + 'cr2', k: 0.4, alpha: 0.5 * ex.under });
  if (close < 0.97) {
    // eye opening = upper lid (inner->outer) + lower lid (outer->inner)
    const open = X.list([...up, ...lo.slice().reverse().slice(1, -1)].map((q, i) => P(q[0], q[1], i === 0 || i === up.length - 1 ? 1 : 0)));
    const op = pen.curve(open, { closed: true, id, k: 0.3 });
    pen.fill(op, pal.sclera);
    pen.clip(op, () => {
      // lid shadow on the sclera
      const shadowBand = X.list(R([...up.map((q) => [q[0], q[1] - 4]), ...up.slice().reverse().map((q) => [q[0], q[1] + 9])]));
      pen.fill(pen.curve(shadowBand, { closed: true, id: id + 'sb', k: 0.3 }), pal.scleraShade);
      // iris
      const gx = clamp(p.gaze.x, -1, 1) * 15 * side * side, gy = clamp(p.gaze.y, -1, 1) * 7;
      const icx = side * 89 + gx, icy = -1 + gy;
      const rx = 19.5 * (1 + ex.iris), ry = 23 * (1 + ex.iris);
      const C = X([icx, icy]);
      const c = pen.c;
      c.save();
      c.translate(C[0], C[1]);
      c.rotate(X.rot);
      c.scale(s, s);
      // iris body
      const dull = ex.dull;
      const i1 = mix(pal.iris1, '#55525A', dull * 0.6), i2 = mix(pal.iris2, '#6E6A70', dull * 0.6), i3 = mix(pal.iris3, '#8A8488', dull * 0.7);
      c.fillStyle = pen.linear(0, -ry, 0, ry, [[0, pal.iris0], [0.38, i1], [0.78, i2], [1, i3]]);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.fill();
      // lower glow crescent
      c.globalAlpha = 0.55 * (1 - dull * 0.7);
      c.fillStyle = i3;
      c.beginPath(); c.ellipse(0, ry * 0.42, rx * 0.72, ry * 0.42, 0, 0, Math.PI); c.fill();
      c.globalAlpha = 1;
      // pupil
      const pr = 1 + ex.pupil + dull * 0.12;
      c.fillStyle = pal.pupil;
      c.beginPath(); c.ellipse(0, -2, 8.5 * pr, 11.5 * pr, 0, 0, Math.PI * 2); c.fill();
      // top shadow from the lid
      c.fillStyle = rgba(pal.iris0, 0.75);
      c.beginPath(); c.ellipse(0, -ry * 0.62, rx * 1.05, ry * 0.5, 0, 0, Math.PI * 2); c.fill();
      // rim
      c.lineWidth = 2.4;
      c.strokeStyle = pal.irisRim;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); c.stroke();
      // highlights
      const sh = ex.shine * (pen.look.vector ? 0.7 : 1);
      if (sh > 0.02) {
        c.globalAlpha = Math.min(1, sh);
        c.fillStyle = '#FFFFFF';
        c.beginPath(); c.ellipse(-rx * 0.38 * side, -ry * 0.36, 5.6, 6.6, -0.4 * side, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(rx * 0.4 * side, ry * 0.38, 2.6, 2.6, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
      c.restore();
    });
    // lower lid line (outer two thirds)
    ink(pen, X.list(lo.slice(2).map((q) => [q[0], q[1] + 0.5])), 2.4 * s, pal.lashLower, { id: id + 'lo', k: 0.3, start: 0.05, end: 0.6, attack: 0.6, release: 0.1, alpha: 0.9 });
  }
  // upper lash line: thick, heavier toward the outer corner, small tail past the corner
  const tail = side > 0 ? [[143, 7]] : [[-143, 7]];
  const lash = X.list(R([...up, ...tail]));
  const prof = (u) => (u < 0.12 ? lerp(1.5, 3.5, u / 0.12) : u < 0.8 ? lerp(3.5, 7.4, (u - 0.12) / 0.68) : lerp(7.4, 1.2, (u - 0.8) / 0.2)) * s;
  const lp = sampleSpline(pen.pts(lash, id + 'lash', 0.3), { step: 1.2 });
  inkProfile(pen, lp, prof, pal.lash, {});
  // inner corner tick
  ink(pen, X.list(R(m([[46, 4], [41, 8]]))), 2 * s, pal.lash, { id: id + 'ic', k: 0.2 });
}

export function drawBrows(pen, X, G, alpha = 1, { only = null } = {}) {
  const pal = pen.pal;
  const s = X.s;
  for (const side of [1, -1]) {
    if (only && only !== side) continue;
    const b = side > 0 ? G.brow : M(G.brow);
    const pts = X.list(R(b));
    const lp = sampleSpline(pen.pts(pts, 'brow' + side, 0.4), { step: 1.5 });
    inkProfile(pen, lp, (u) => (u < 0.08 ? lerp(6, 9.5, u / 0.08) : u < 0.55 ? lerp(9.5, 7.5, (u - 0.08) / 0.47) : lerp(7.5, 1.2, (u - 0.55) / 0.45)) * s, pal.brow, { alpha });
  }
}

function drawMouth(pen, p, X, ex) {
  const pal = pen.pal;
  const s = X.s;
  const cv = ex.curve;
  const userOpen = clamp(p.mouth.open);
  const open = Math.max(userOpen, ex.open);
  const vowel = userOpen >= ex.open ? p.mouth.vowel || 'A' : ex.teeth > 0.5 ? 'E' : 'A';
  const wob = ex.wobble ? Math.sin((p.t || 0) * 19) * 1.2 * ex.wobble : 0;
  const cy = 122;
  if (open < 0.04) {
    const pts = R([[-25, cy - cv * 5 + Math.max(0, -cv) * 0], [-11, cy + 1 + wob * 0.5], [9, cy + 1.5 - wob * 0.5], [24, cy - cv * 5.5]]);
    ink(pen, X.list(pts), 3.4 * s, pal.mouthLine, { id: 'mouth', start: 0.35, end: 0.25, k: 0.4 });
    if (cv > 0.4) ink(pen, X.list(R([[24, cy - cv * 5.5], [28, cy - cv * 7.5]])), 1.6 * s, pal.mouthLine, { id: 'mc', alpha: 0.6 });
    // lower lip shadow
    ink(pen, X.list(R([[-8, cy + 15], [2, cy + 16.5], [10, cy + 14.5]])), 2 * s, pal.skinLineSoft, { id: 'lip', alpha: 0.7, k: 0.4 });
    return;
  }
  const V = { A: [44, 34, 1], I: [52, 13, 0], U: [24, 18, 0], E: [48, 22, 1], O: [30, 30, 0] }[vowel] || [44, 34, 1];
  let w = V[0] * (0.7 + 0.3 * open), h = V[1] * open;
  if (ex.teeth > 0.5 && userOpen < ex.open) { w = 54; h = 26 * open + 4; }
  const hw = w / 2;
  const c0 = cy - 2;
  const cc = cv * 6;
  const top = [[-hw, c0 - cc], [-hw * 0.5, c0 - 2], [0, c0 - 1], [hw * 0.5, c0 - 2], [hw, c0 - cc]];
  const bot = [[hw, c0 - cc], [hw * 0.62, c0 + h * 0.8], [0, c0 + h + wob], [-hw * 0.62, c0 + h * 0.8], [-hw, c0 - cc]];
  const shape = R([...top.map((q, i) => (i === 0 || i === 4 ? [q[0], q[1], 1] : q)), ...bot.slice(1, -1)]);
  const mp = paint(pen, X.list(shape), pal.mouthIn, { id: 'mouthO', k: 0.4, pool: 0.3 });
  pen.clip(mp, () => {
    if (vowel === 'A' || vowel === 'O' || vowel === 'U') {
      pen.blob(...X([0, c0 + h * 0.95]).slice(0, 2), hw * 0.75 * s, pal.tongue, 1, { sy: 0.55 });
    }
    if (vowel === 'I' || vowel === 'E' || ex.teeth > 0.5) {
      paint(pen, X.list(R([[-hw, c0 - 6], [hw, c0 - 6], [hw * 0.8, c0 + Math.min(7, h * 0.4)], [-hw * 0.8, c0 + Math.min(7, h * 0.4)]])), pal.teeth, { id: 'teethU', wash: false });
      if (vowel === 'I' || ex.teeth > 0.5) paint(pen, X.list(R([[-hw * 0.8, c0 + h + 4], [hw * 0.8, c0 + h + 4], [hw * 0.6, c0 + h - Math.min(6, h * 0.3)], [-hw * 0.6, c0 + h - Math.min(6, h * 0.3)]])), pal.teeth, { id: 'teethL', wash: false });
    }
  });
  ink(pen, X.list(R(top)), 3.4 * s, pal.mouthLine, { id: 'mouthT', start: 0.4, end: 0.4, k: 0.4 });
  ink(pen, X.list(R(bot.slice(1, -1))), 2.2 * s, pal.mouthLine, { id: 'mouthB', start: 0.3, end: 0.3, k: 0.4, alpha: 0.85 });
  ink(pen, X.list(R([[-8, c0 + h + 13], [8, c0 + h + 13]])), 1.8 * s, pal.skinLineSoft, { id: 'lip2', alpha: 0.6 });
}

// ------------------------------------------------------------------ hair

function hairSwayFn(p) {
  const a = (p.hairSway || 0);
  const t = p.t || 0;
  return (seed) => a * sway(t, 31 + seed * 7, 0.9);
}
function swayList(pts, sw, seed, amp = 1) {
  const d = sw(seed) * 9 * amp;
  if (!d) return pts;
  const n = pts.length - 1;
  return pts.map((q, i) => { const u = i / n; const r = q.slice(); r[0] += d * u * u; r[1] += Math.abs(d) * 0.15 * u * u; return r; });
}

// bang clumps (root -> tip), root width, order back -> front
const BANGS = [
  { sp: [[-126, -178], [-150, -118], [-163, -50], [-152, 22]], w: 46 },
  { sp: [[120, -186], [149, -124], [162, -54], [153, 18]], w: 44 },
  { sp: [[-96, -204], [-118, -142], [-125, -84], [-110, -30]], w: 52 },
  { sp: [[86, -208], [110, -146], [124, -86], [117, -38]], w: 50 },
  { sp: [[-60, -220], [-80, -150], [-84, -96], [-66, -44]], w: 50 },
  { sp: [[46, -222], [66, -152], [80, -94], [79, -28]], w: 50 },
  { sp: [[8, -228], [12, -160], [24, -104], [43, -58]], w: 46 },
  { sp: [[-28, -226], [-38, -150], [-36, -70], [-14, 6]], w: 44 },
  // thin wisps
  { sp: [[-46, -170], [-56, -110], [-50, -50]], w: 14, thin: true },
  { sp: [[96, -168], [102, -100], [97, -16]], w: 12, thin: true },
];

function bangs(p) {
  const sw = hairSwayFn(p);
  return BANGS.map((b, i) => ({
    i, thin: !!b.thin,
    spine: swayList(b.sp, sw, i, b.thin ? 1.3 : 1),
    wf: (s = 1) => (b.thin ? [[0, b.w * s], [0.5, b.w * 0.7 * s], [1, 0]] : [[0, b.w * s], [0.3, b.w * 1.04 * s], [0.62, b.w * 0.66 * s], [1, 0]]),
  }));
}

// silhouette tufts (root -> tip)
const TUFTS = [
  { sp: [[-112, -208], [-150, -236], [-192, -232]], w: 44 },
  { sp: [[-48, -240], [-70, -278], [-104, -294]], w: 46 },
  { sp: [[18, -250], [44, -288], [80, -298]], w: 48 },
  { sp: [[100, -226], [146, -244], [184, -232]], w: 42 },
  { sp: [[148, -150], [184, -142], [208, -116]], w: 34 },
  { sp: [[-150, -136], [-184, -118], [-204, -88]], w: 34 },
  { sp: [[160, -64], [180, -34], [182, 4]], w: 26 },
  { sp: [[-160, -64], [-182, -32], [-186, 6]], w: 26 },
];

const CAP = R([[-152, 6], [-170, -60], [-176, -122], [-160, -178], [-126, -222], [-74, -252], [-14, -264], [46, -261], [100, -246],
  [144, -212], [170, -164], [180, -108], [176, -48], [160, 8], [132, -110], [64, -164], [0, -178], [-64, -166], [-134, -112]]);

export function drawFrontHair(pen, p, H) {
  const X = headXf(H);
  const pal = pen.pal;
  const s = X.s;
  const sw = hairSwayFn(p);
  // tufts first (roots hidden under the cap)
  TUFTS.forEach((t, i) => {
    const sp = X.list(R(swayList(t.sp, sw, 20 + i, 0.6)));
    clump(pen, sp, [[0, t.w * s], [0.45, t.w * 0.72 * s], [1, 0]], { id: 'tuft' + i, fill: pal.hair, line: pal.hairLine, lw: 3.4 * s, shadeCol: pal.hairShade, shadeSide: i % 2 ? -1 : 1, rootFade: 0.35 });
  });
  // cap
  const cap = X.list(CAP);
  const cp = paint(pen, cap, pal.hair, { id: 'cap', pool: 0.7 });
  // cap shading: darker toward the sides and lower edge
  shade(pen, cp, X.list(R([[60, -262], [130, -232], [176, -170], [184, -60], [162, 10], [120, -100], [120, -170]])), pal.hairShade, { id: 'capR', alpha: 0.9 });
  ink(pen, X.list(R([[-152, 6], [-170, -60], [-176, -122], [-160, -178], [-126, -222], [-74, -252], [-14, -264], [46, -261], [100, -246], [144, -212], [170, -164], [180, -108], [176, -48], [160, 8]])), 4.6 * s, pal.hairLine, { id: 'cap', start: 0.2, end: 0.2 });
  // inner strand lines on the cap (flow from the crown)
  const flows = [[[-20, -258], [-60, -232], [-110, -190]], [[30, -255], [70, -232], [120, -196]], [[-90, -238], [-130, -206], [-156, -160]], [[90, -244], [140, -206], [164, -150]]];
  flows.forEach((f, i) => ink(pen, X.list(R(f)), 2.4 * s, pal.hairLine, { id: 'flow' + i, start: 0.1, end: 0, alpha: 0.8 }));
  // bangs
  const B = bangs(p);
  const union = new Path2D();
  union.addPath(cp);
  for (const b of B) {
    const r = clump(pen, X.list(R(b.spine)), b.wf(s), {
      id: 'bang' + b.i, fill: b.thin ? pal.hairMid : pal.hair, line: pal.hairLine, lw: (b.thin ? 2.2 : 3.4) * s,
      shadeCol: b.thin ? null : pal.hairShade, shadeSide: b.spine[b.spine.length - 1][0] > b.spine[0][0] ? 1 : -1, shadeW: 0.4, rootFade: 0.42,
    });
    union.addPath(r.path);
  }
  // sheen: one jagged ring across the crown + per-clump slivers
  pen.clip(union, () => {
    const ring = R([[-162, -150], [-120, -200], [-60, -226], [0, -232], [60, -228], [120, -204], [166, -156],
      [160, -132], [150, -148], [138, -126], [120, -170], [100, -150], [82, -186], [60, -160], [40, -196], [18, -168], [-4, -200], [-24, -170], [-46, -196], [-70, -160], [-90, -188], [-112, -150], [-126, -174], [-144, -128], [-156, -140]]);
    paint(pen, X.list(ring.map((q) => P(q[0], q[1], 1))), pal.hairSheen, { id: 'sheen', alpha: 0.85, pool: 0.3, tension: 0.4 });
    for (let i = 0; i < 6; i++) {
      const x0 = -120 + i * 46;
      const yy = -212 + Math.abs(x0) * 0.18;
      ink(pen, X.list(R([[x0 - 10, yy - 4], [x0 + 2, yy + 6], [x0 + 6, yy + 22]])), 3.2 * s, pal.hairSheenHi, { id: 'shi' + i, alpha: 0.75, start: 0.2 });
    }
  });
}

/** over the hair: brows seen through the bangs + glasses */
export function drawOverHair(pen, p, H) {
  const X = headXf(H);
  const G = headGeom(p);
  // brows through hair (anime convention) — faint
  if (!pen.look.vector) drawBrows(pen, X, G, 0.5);
  drawGlasses(pen, p, X, G.ex);
}

export function drawGlasses(pen, p, X, ex) {
  const pal = pen.pal;
  const s = X.s;
  const scr = clamp(ex.screen + (p.glow || 0));
  for (const side of [1, -1]) {
    const m = (l) => (side > 0 ? l : M(l));
    const lens = R(m([[30, -33, 1, 0.6], [92, -37], [152, -32, 1, 0.7], [156, -8], [150, 20, 0, 0.8], [118, 28], [64, 27], [36, 20, 0, 0.8], [29, -6]]));
    const L = X.list(lens);
    const lp = pen.curve(L, { closed: true, id: 'lens' + side, k: 0.3 });
    // lens tint + glare
    pen.clip(lp, () => {
      pen.fill(lp, pal.lensTint, pen.look.vector ? 0.08 : 0.16);
      const g1 = X.list(R(m([[40, 26], [64, 26], [118, -36], [96, -36]])));
      const g2 = X.list(R(m([[74, 26], [84, 26], [138, -36], [128, -36]])));
      pen.fill(polyP(g1), '#FFFFFF', 0.22 * (1 - scr));
      pen.fill(polyP(g2), '#FFFFFF', 0.16 * (1 - scr));
      if (scr > 0.01) {
        // monitor reflection: cyan panel with text rows
        const c0 = X([side * 92, -6]);
        pen.fill(lp, pal.screen, 0.55 * scr);
        pen.blob(c0[0], c0[1], 70 * s, pal.screenCore, 0.55 * scr, { sy: 0.55 });
        for (let r = 0; r < 4; r++) {
          const y = -22 + r * 11;
          const x0 = side * (44 + (r % 2) * 10), x1 = side * (128 - (r % 3) * 18);
          ink(pen, X.list(R([[x0, y], [x1, y + 1]])), 2.6 * s, pal.screenCore, { id: 'scr' + side + r, alpha: 0.7 * scr, start: 1, end: 1 });
        }
      }
    });
    // lower edge: nylon wire (thin, faint)
    ink(pen, X.list(R(m([[154, -6], [150, 20], [118, 28], [64, 27], [36, 20], [29, -6]]))), 1.6 * s, pal.lensEdge, { id: 'wire' + side, alpha: 0.75, start: 0.4, end: 0.4, k: 0.3 });
    // top rim: thick silver bar following the brow, wraps a little down both sides
    const rim = X.list(R(m([[28, -14], [30, -32], [92, -37], [152, -32], [157, -12]])));
    ink(pen, rim, 8.6 * s, pal.frameLine, { id: 'rim' + side, k: 0.3, start: 0.35, end: 0.4, attack: 0.18, release: 0.15 });
    ink(pen, rim, 6.2 * s, pal.frame, { id: 'rim' + side, k: 0.3, start: 0.35, end: 0.4, attack: 0.18, release: 0.15, skipVector: true });
    ink(pen, X.list(R(m([[40, -36], [92, -39.5], [140, -35.5]]))), 2 * s, pal.frameHi, { id: 'rimhi' + side, k: 0.3, alpha: 0.9, skipVector: true });
    // temple arm toward the ear
    ink(pen, X.list(R(m([[154, -30], [166, -24], [174, -20]]))), 5 * s, pal.frameShade, { id: 'temple' + side, k: 0.3, start: 1, end: 0.6 });
    // nose pad
    ink(pen, X.list(R(m([[24, -18], [19, -4]]))), 2.2 * s, pal.frameShade, { id: 'pad' + side, alpha: 0.8 });
  }
  // bridge
  const br = X.list(R([[-31, -30], [-14, -36], [0, -37], [14, -36], [31, -30]]));
  ink(pen, br, 5.4 * s, pal.frameLine, { id: 'bridge', start: 0.8, end: 0.8, k: 0.3 });
  ink(pen, br, 3.2 * s, pal.frame, { id: 'bridge', start: 0.8, end: 0.8, k: 0.3, skipVector: true });
}

function polyP(l) {
  const p = new Path2D();
  p.moveTo(l[0][0], l[0][1]);
  for (let i = 1; i < l.length; i++) p.lineTo(l[i][0], l[i][1]);
  p.closePath();
  return p;
}

/** sweat, gloom, screen light on the face */
export function drawFaceFx(pen, p, H) {
  const X = headXf(H);
  const pal = pen.pal;
  const s = X.s;
  const ex = headGeom(p).ex;
  const face = shapePath(pen, X.list(FACE), { id: 'face' });
  if (ex.gloom > 0.01 && !pen.look.vector) {
    pen.clip(face, () => {
      const a = X([0, -160]), b = X([0, 40]);
      pen.fill(face, pen.linear(a[0], a[1], b[0], b[1], [[0, pal.gloom, 0.55 * ex.gloom], [1, pal.gloom, 0]]));
      for (let i = 0; i < 7; i++) {
        const x = -96 + i * 32;
        ink(pen, X.list(R([[x, -150], [x + 1, -100 + (i % 3) * 10]])), 2.2 * s, pal.gloom, { id: 'gl' + i, alpha: 0.7 * ex.gloom, start: 1, end: 0 });
      }
    });
  }
  if (ex.screen > 0.01 || p.glow) {
    const a = clamp(ex.screen + (p.glow || 0));
    pen.clip(face, () => {
      const g = X([0, 60]);
      pen.blob(g[0], g[1], 220 * s, pal.screen, 0.22 * a, { sy: 0.9 });
    });
  }
  if (ex.sweat > 0.05) {
    const drops = [[-150, -70, 1], [158, -30, 0.8], [-128, 40, 0.6]];
    drops.forEach(([x, y, k], i) => {
      if (ex.sweat < (i + 0.5) * 0.5) return;
      const sz = 13 * k;
      const d = X.list(R([[x, y - sz * 1.6, 1], [x + sz * 0.75, y], [x, y + sz * 0.8], [x - sz * 0.75, y]]));
      paint(pen, d, pal.sweat, { id: 'sw' + i, alpha: 0.9, k: 0.3 });
      ink(pen, d.concat([d[0]]), 2.2 * s, pal.sweatLine, { id: 'swl' + i, k: 0.3, start: 0.5, end: 0.5 });
      pen.blob(...X([x - sz * 0.25, y]).slice(0, 2), sz * 0.25 * s, '#FFFFFF', 0.9);
    });
  }
  if (p.tears > 0.01) {
    for (const side of [1, -1]) {
      const t = X.list(R([[side * 96, 16], [side * 100, 50 + 40 * p.tears], [side * 96, 70 + 60 * p.tears]]));
      ink(pen, t, 6 * s, pal.tear, { id: 'tear' + side, alpha: 0.8 * p.tears, start: 0.6, end: 0.2 });
    }
  }
}

export { FACE };
