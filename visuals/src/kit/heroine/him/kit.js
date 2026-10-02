// "Him" drawing kit: param resolution, pen setup and the small set of ink/paint helpers every view
// uses. All helpers are pure functions of their inputs (boil comes from pen.boilSeed + ids).
import { Pen } from '../draw.js';
import { splinePath, sampleSpline, ribbon, taperPath, profileFn, brush, clamp, lerp } from '../geom.js';
import { mix, rgba } from '../palettes.js';
import { HIM_PALETTES, paled } from './palettes.js';

export const DEFAULTS = Object.freeze({
  t: 0, blink: 0, gaze: { x: 0, y: 0 }, mouth: { open: 0, vowel: 'A' }, expr: { focused: 1 },
  tears: 0, blush: 0, headTilt: 0, breath: 0, hairSway: 0, palette: 'human', boilSeed: 0,
  outfit: 'launch', glow: 0, look: null,
});

/** fill in defaults (shallow + gaze/mouth objects) */
export function resolve(p = {}) {
  const r = { ...DEFAULTS, ...p };
  r.gaze = { ...DEFAULTS.gaze, ...(p.gaze || {}) };
  r.mouth = { ...DEFAULTS.mouth, ...(p.mouth || {}) };
  r.expr = p.expr || DEFAULTS.expr;
  return r;
}

/** expression scalar blend: table[name] = {key: value}; returns summed weighted values */
export function blendExpr(table, expr) {
  const out = {};
  for (const [name, w] of Object.entries(expr || {})) {
    const e = table[name];
    if (!e || !w) continue;
    for (const [k, v] of Object.entries(e)) out[k] = (out[k] || 0) + v * w;
  }
  return out;
}

/** build the Pen for a view. unit = boil multiplier for this view's reference scale */
export function makePen(ctx, p, unit = 1, extraPale = 0) {
  const base = HIM_PALETTES[p.palette] || HIM_PALETTES.human;
  const look = { ...base.look, ...(p.look || {}) };
  const pal = paled(base, clamp(look.pale + extraPale));
  const pen = new Pen(ctx, { pal, boil: look.boil * unit, boilSeed: p.boilSeed | 0, painterly: look.painterly, lineScale: look.lineScale });
  pen.look = look;
  pen.unit = unit;
  return pen;
}

/** closed smooth shape through pts, filled with watercolour wash. Returns the Path2D */
export function paint(pen, pts, color, { id = null, k = 1, pool = 1, alpha = 1, tension = 1, wash = true } = {}) {
  const path = pen.curve(pts, { closed: true, id, k, tension });
  if (wash) pen.wash(path, color, { pool, alpha });
  else pen.fill(path, color, alpha);
  return path;
}

/** plain closed path (boiled) without drawing */
export function shapePath(pen, pts, { id = null, k = 1, tension = 1 } = {}) {
  return pen.curve(pts, { closed: true, id, k, tension });
}

/** cel shade: fill `pts` (closed) clipped to `clipPath` */
export function shade(pen, clipPath, pts, color, { id = null, k = 1, alpha = 1, pool = 0.6, tension = 1 } = {}) {
  pen.clip(clipPath, () => {
    const path = pen.curve(pts, { closed: true, id, k, tension });
    pen.wash(path, color, { pool, alpha });
  });
}

/**
 * tapered ink line. w = max width (ref units). In vector mode (swapped palette) every line becomes
 * a constant-width interface-cyan stroke with a soft glow.
 */
export function ink(pen, pts, w, color, o = {}) {
  const lk = pen.look;
  if (lk.vector) {
    if (o.skipVector) return null;
    const vw = Math.max(1.1, Math.min(w * 0.5, 3.2)) * (o.vk ?? 1);
    const c = pen.c;
    c.save();
    if (lk.glow) { c.shadowColor = rgba(pen.pal.vglow, 0.75); c.shadowBlur = 7 * lk.glow * (pen.scale || 1); }
    const path = pen.line(pts, () => vw, o.vcol || pen.pal.vline, { ...o, start: 1, end: 1 });
    c.restore();
    return path;
  }
  return pen.line(pts, w, color, o);
}

/** ink along a dense polyline with an explicit width profile keys/function */
export function inkProfile(pen, poly, prof, color, o = {}) {
  const lk = pen.look;
  if (lk.vector) {
    const vw = o.vw ?? 1.6;
    const c = pen.c;
    c.save();
    if (lk.glow) { c.shadowColor = rgba(pen.pal.vglow, 0.75); c.shadowBlur = 7 * lk.glow * (pen.scale || 1); }
    const path = taperPath(poly, () => vw);
    pen.fill(path, o.vcol || pen.pal.vline, o.alpha ?? 1);
    c.restore();
    return path;
  }
  const f = profileFn(prof);
  const path = taperPath(poly, (u) => f(u) * pen.lineScale);
  pen.fill(path, color, (o.alpha ?? 1) * pen.lineAlpha);
  return path;
}

/** hair clump / lock: ribbon fill + inked sides. Returns the ribbon */
export function clump(pen, spine, width, o = {}) {
  const { id, fill, line, lw = 3, shadeCol = null, shadeSide = 1, shadeW = 0.45, k = 1, lineAlpha = 1,
    rootFade = 0.3, sides = 'both', tipLine = true } = o;
  const r = pen.ribbon(spine, width, { id, k, step: 2 });
  pen.wash(r.path, fill, { pool: 0.8 });
  if (shadeCol) {
    // shade strip: a narrower ribbon offset toward one side
    const n = r.left.length;
    const side = shadeSide > 0 ? r.right : r.left;
    const inner = r.spine.map((p, i) => [lerp(side[i][0], p[0], 2 * shadeW), lerp(side[i][1], p[1], 2 * shadeW)]);
    const poly = side.concat(inner.slice().reverse());
    const path = new Path2D();
    path.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
    path.closePath();
    pen.clip(r.path, () => pen.wash(path, shadeCol, { pool: 0.4 }));
    void n;
  }
  if (line) {
    const prof = (u) => lw * (u < rootFade ? lerp(0.0, 1, smoothU(u / rootFade)) : 1) * (u > 0.85 ? lerp(1, 0.35, (u - 0.85) / 0.15) : 1);
    if (sides === 'both' || sides === 'left') inkProfile(pen, r.left, prof, line, { alpha: lineAlpha });
    if (sides === 'both' || sides === 'right') inkProfile(pen, r.right, prof, line, { alpha: lineAlpha });
  }
  return r;
}

function smoothU(u) { u = clamp(u); return u * u * (3 - 2 * u); }

/** transform helper: local -> view with scale s, rotation rot about (0,0) then translate (x,y) */
export function T(x, y, s = 1, rot = 0) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (pt) => {
    const q = pt.slice();
    const px = pt[0] * s, py = pt[1] * s;
    q[0] = x + px * c - py * sn;
    q[1] = y + px * sn + py * c;
    return q;
  };
}
export const tp = (f, list) => list.map(f);

/** soft glow ellipse (screen light, blush) */
export function glow(pen, x, y, r, color, a, sy = 1, rot = 0) { pen.blob(x, y, r, color, a, { sy, rot }); }

/** deterministic paper grain tile (canvas) used to texture painted layers */
let GRAIN = null;
export function grainTile(doc = (typeof document !== 'undefined' ? document : null)) {
  if (GRAIN || !doc) return GRAIN;
  const S = 256;
  const cv = doc.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const img = c.createImageData(S, S);
  // value noise at two scales + fine speckle (hash based, deterministic)
  const h = (x, y, s) => {
    let n = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const vn = (x, y, cell, s) => {
    const gx = x / cell, gy = y / cell;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
    const W = S / cell;
    const g = (i, j) => h(((i % W) + W) % W, ((j % W) + W) % W, s);
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return lerp(lerp(g(x0, y0), g(x0 + 1, y0), u), lerp(g(x0, y0 + 1), g(x0 + 1, y0 + 1), u), v);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = vn(x, y, 32, 1) * 0.45 + vn(x, y, 8, 2) * 0.35 + h(x, y, 3) * 0.2;
      const i = (y * S + x) * 4;
      const d = Math.round(clamp((v - 0.5) * 1.6 + 0.5) * 255);
      img.data[i] = 64; img.data[i + 1] = 44; img.data[i + 2] = 36; img.data[i + 3] = 255 - d;
    }
  }
  c.putImageData(img, 0, 0);
  GRAIN = cv;
  return GRAIN;
}

export { mix, rgba, sampleSpline, splinePath, ribbon, brush, clamp, lerp };
