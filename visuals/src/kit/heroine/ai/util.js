// Shared helpers for the AI character: look/expression resolution, hair colour ramp, clump drawing.
import { sampleSpline, ribbon, polyPath, profileFn, clamp, lerp, sway } from '../geom.js';
import { mix, rgba } from '../palettes.js';
import { AI_PALETTES } from './palette.js';

export const DEFAULTS = Object.freeze({
  t: 0, blink: 0, gaze: { x: 0, y: 0 }, mouth: null, expr: { smile: 0.0 }, tears: 0, blush: null,
  headTilt: 0, breath: 0, hairSway: 0.35, palette: 'human', boilSeed: 0, uncanny: 0, turn: 0,
});

/** palette object for p.palette (falls back to human) */
export function palOf(p) { return AI_PALETTES[(p && p.palette) || 'human'] || AI_PALETTES.human; }

/** look = palette look defaults overridden by p.look */
export function lookOf(pen, p) {
  const base = (pen && pen.pal && pen.pal.look) || palOf(p).look;
  return p && p.look ? { ...base, ...p.look } : base;
}

const EXPRS = ['smile', 'gentle', 'worried', 'heart', 'blank'];

/** expression weights, clamped; `neutral` = leftover */
export function exprOf(p) {
  const e = (p && p.expr) || {};
  const out = {};
  let s = 0;
  for (const k of EXPRS) { out[k] = clamp(e[k] || 0); s += out[k]; }
  if (s > 1) for (const k of EXPRS) out[k] /= s;
  out.neutral = Math.max(0, 1 - Math.min(1, s));
  return out;
}

// ------------------------------------------------------------------ hair colour ramp

/** hair colour at head-local height y (len = y where the light tips are reached) */
export function hairAt(pal, y, len = 520) {
  const u = clamp((y + 120) / (len + 120));
  const st = [[0, pal.hairRoot], [0.22, pal.hair], [0.45, pal.hairMid], [0.68, pal.hair2], [0.86, pal.hairTip], [1, pal.hairTipHi]];
  for (let i = 1; i < st.length; i++) {
    if (u <= st[i][0]) return mix(st[i - 1][1], st[i][1], (u - st[i - 1][0]) / (st[i][0] - st[i - 1][0]));
  }
  return st[st.length - 1][1];
}

/** vertical linear gradient for a hair shape spanning y0..y1 (head-local) */
export function hairGrad(pen, y0, y1, len, { lift = 0 } = {}) {
  const pal = pen.pal;
  const stops = [];
  for (let i = 0; i <= 5; i++) {
    const u = i / 5;
    let col = hairAt(pal, lerp(y0, y1, u), len);
    if (lift) col = mix(col, pal.hairTipHi, lift * u * u);
    stops.push([u, col]);
  }
  return pen.linear(0, y0, 0, y1, stops);
}

export function yRange(poly) {
  let a = Infinity, b = -Infinity;
  for (const q of poly) { if (q[1] < a) a = q[1]; if (q[1] > b) b = q[1]; }
  return [a, b];
}

/** displace a spine by hair sway (grows with distance from root) */
export function swaySpine(spine, p, seed, amp = 1) {
  const a = (p.hairSway ?? 0) * amp;
  if (!a) return spine;
  const t = p.t || 0;
  const n = spine.length;
  const sx = sway(t, seed, 0.6) * 9 * a, sy = sway(t, seed + 7, 0.5) * 3 * a;
  return spine.map((q, i) => {
    const u = i / (n - 1);
    const k = u * u;
    const r = q.slice();
    r[0] += sx * k;
    r[1] += sy * k;
    return r;
  });
}

/**
 * Hair clump: gradient fill + cel shade stripe + optional sheen streak + tapered side outlines.
 * o: { id, len, line, lw, shade (0..1 stripe fraction), shadeSide ('l'|'r'), sheen, lift, fill, noLine, k }
 */
export function clump(pen, spine, width, o = {}) {
  const pal = pen.pal;
  const r = pen.ribbon(spine, width, { id: o.id, k: o.k ?? 0.7, step: o.step ?? 2.5 });
  const [y0, y1] = yRange(r.spine);
  pen.wash(r.path, o.fill || hairGrad(pen, y0 - 4, y1 + 2, o.len ?? 520, { lift: o.lift || 0 }), { pool: 0.6, poolColor: pal.hairShade });
  const n = r.left.length;
  // cel shade stripe on one side
  if (o.shade) {
    const A = o.shadeSide === 'l' ? r.left : r.right, B = o.shadeSide === 'l' ? r.right : r.left;
    const f = profileFn(typeof o.shade === 'number' ? [[0, o.shade], [0.55, o.shade * 0.8], [0.92, o.shade * 0.35], [1, 0]] : o.shade);
    const inner = [];
    for (let i = n - 1; i >= 0; i--) {
      const u = i / (n - 1), w = f(u);
      inner.push([lerp(A[i][0], B[i][0], w), lerp(A[i][1], B[i][1], w)]);
    }
    const sp = polyPath(A.concat(inner));
    pen.fill(sp, o.shadeColor || pal.hairShade, o.shadeAlpha ?? 0.42);
  }
  if (o.sheen) {
    const [u0, u1, f0] = o.sheen; // arc range + offset fraction from the lit side
    const A = o.shadeSide === 'l' ? r.right : r.left, B = o.shadeSide === 'l' ? r.left : r.right;
    const i0 = Math.floor(u0 * (n - 1)), i1 = Math.floor(u1 * (n - 1));
    const out = [], back = [];
    for (let i = i0; i <= i1; i++) {
      const u = (i - i0) / Math.max(1, i1 - i0);
      const w = Math.sin(u * Math.PI) * f0;
      out.push([lerp(A[i][0], B[i][0], 0.12), lerp(A[i][1], B[i][1], 0.12)]);
      back.unshift([lerp(A[i][0], B[i][0], 0.12 + w), lerp(A[i][1], B[i][1], 0.12 + w)]);
    }
    pen.fill(polyPath(out.concat(back)), o.sheenColor || pal.hairSheen, o.sheenAlpha ?? 0.55);
  }
  if (!o.noLine) {
    const lw = (o.lw ?? 1.5);
    const prof = [[0, 0], [0.12, lw * 0.6], [0.35, lw], [0.85, lw * 0.9], [1, lw * 0.35]];
    const col = o.line || pal.hairLine;
    if (o.sides !== 'r') pen.line(r.left, prof, col, {});
    if (o.sides !== 'l') pen.line(r.right, prof, col, {});
  }
  return r;
}

/** inner strand line inside a clump: polyline subset of the ribbon between left/right at fraction f */
export function strand(pen, r, f, u0, u1, w, color, alpha = 1) {
  const n = r.left.length;
  const i0 = Math.floor(u0 * (n - 1)), i1 = Math.floor(u1 * (n - 1));
  const pts = [];
  for (let i = i0; i <= i1; i += 2) pts.push([lerp(r.left[i][0], r.right[i][0], f), lerp(r.left[i][1], r.right[i][1], f)]);
  if (pts.length < 2) return;
  pen.line(pts, [[0, 0], [0.3, w], [0.75, w * 0.8], [1, 0]], color, { alpha });
}

/** sample an ellipse as a closed point list */
export function ellipsePts(cx, cy, rx, ry, n = 24, rot = 0) {
  const out = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

/** heart shape path centred at (x,y), size r */
export function heartPath(x, y, r, path = new Path2D()) {
  path.moveTo(x, y + r * 0.95);
  path.bezierCurveTo(x - r * 0.25, y + r * 0.7, x - r * 1.05, y + r * 0.25, x - r * 1.0, y - r * 0.25);
  path.bezierCurveTo(x - r * 0.95, y - r * 0.85, x - r * 0.2, y - r * 0.95, x, y - r * 0.45);
  path.bezierCurveTo(x + r * 0.2, y - r * 0.95, x + r * 0.95, y - r * 0.85, x + r * 1.0, y - r * 0.25);
  path.bezierCurveTo(x + r * 1.05, y + r * 0.25, x + r * 0.25, y + r * 0.7, x, y + r * 0.95);
  path.closePath();
  return path;
}

/** 4-point sparkle path */
export function sparklePath(x, y, r, path = new Path2D()) {
  const k = r * 0.22;
  path.moveTo(x, y - r);
  path.quadraticCurveTo(x + k, y - k, x + r, y);
  path.quadraticCurveTo(x + k, y + k, x, y + r);
  path.quadraticCurveTo(x - k, y + k, x - r, y);
  path.quadraticCurveTo(x - k, y - k, x, y - r);
  path.closePath();
  return path;
}

export { rgba, mix, sampleSpline, ribbon };
