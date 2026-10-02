// Heroine rig — 2D geometry core (no THREE, no DOM except Path2D).
// Smooth splines through control points, dense sampling, tapered (variable-width) strokes built
// as filled outlines, point-list transforms/blending and the seeded "boil" jitter.
//
// Point format: [x, y] or [x, y, flag, tension]. flag 1 = corner (one-sided tangents),
// tension (default 1) scales the tangent length at that point (0 = straight segments).
import { hash01, hashString } from '../../core/rng.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
export const smoother = (u) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };

export function P(x, y, flag = 0, k = 1) { return [x, y, flag, k]; }

// ------------------------------------------------------------------ point lists

/** affine transform of a point list about pivot: { tx, ty, rot (rad), sx, sy, px, py } */
export function xf(pts, { tx = 0, ty = 0, rot = 0, sx = 1, sy = 1, px = 0, py = 0 } = {}) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map((p) => {
    const x = (p[0] - px) * sx, y = (p[1] - py) * sy;
    const q = p.slice();
    q[0] = px + x * c - y * s + tx;
    q[1] = py + x * s + y * c + ty;
    return q;
  });
}

/** blend two point lists of equal length */
export function mixPts(a, b, u) {
  return a.map((p, i) => { const q = p.slice(); q[0] = lerp(p[0], b[i][0], u); q[1] = lerp(p[1], b[i][1], u); return q; });
}

/** blend N point lists with weights (normalized internally) */
export function blendPts(lists, weights) {
  let tw = 0;
  for (const w of weights) tw += w;
  tw = tw || 1;
  return lists[0].map((p, i) => {
    const q = p.slice();
    let x = 0, y = 0;
    for (let k = 0; k < lists.length; k++) { x += lists[k][i][0] * weights[k]; y += lists[k][i][1] * weights[k]; }
    q[0] = x / tw; q[1] = y / tw;
    return q;
  });
}

export function mirrorX(pts, cx) { return pts.map((p) => { const q = p.slice(); q[0] = 2 * cx - p[0]; return q; }); }
export function reverse(pts) { return pts.slice().reverse(); }

/** seeded boil jitter: every point moves by up to `amp` (reference units), stable per (seed, id, i) */
export function boilPts(pts, amp, seed, id) {
  if (!amp) return pts;
  const h = typeof id === 'number' ? id : hashString(String(id));
  return pts.map((p, i) => {
    const q = p.slice();
    q[0] += (hash01(seed, h, i, 1) * 2 - 1) * amp;
    q[1] += (hash01(seed, h, i, 2) * 2 - 1) * amp;
    return q;
  });
}

// ------------------------------------------------------------------ splines

function dir(ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l = Math.hypot(dx, dy) || 1;
  return [dx / l, dy / l];
}

/**
 * Cubic Bezier segments of a smooth curve through pts. Tangent direction from the neighbours,
 * tangent length proportional to each segment's own length (no overshoot on uneven spacing).
 * Returns [[x0,y0, c1x,c1y, c2x,c2y, x1,y1], ...]
 */
export function splineSegs(pts, closed = false, tension = 1) {
  const n = pts.length;
  if (n < 2) return [];
  const T = new Array(n); // [inDir, outDir]
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)];
    const next = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)];
    if (p[2] === 1 || (!closed && (i === 0 || i === n - 1))) {
      T[i] = [dir(prev[0], prev[1], p[0], p[1]), dir(p[0], p[1], next[0], next[1])];
      if (!closed && i === 0) T[i][0] = T[i][1];
      if (!closed && i === n - 1) T[i][1] = T[i][0];
    } else {
      const d = dir(prev[0], prev[1], next[0], next[1]);
      T[i] = [d, d];
    }
  }
  const segs = [];
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ka = (a[3] ?? 1) * tension, kb = (b[3] ?? 1) * tension;
    const da = T[i][1], db = T[(i + 1) % n][0];
    segs.push([a[0], a[1], a[0] + da[0] * L * ka / 3, a[1] + da[1] * L * ka / 3,
      b[0] - db[0] * L * kb / 3, b[1] - db[1] * L * kb / 3, b[0], b[1]]);
  }
  return segs;
}

/** append spline segments to a Path2D (moveTo first unless cont) */
export function segsToPath(segs, path = new Path2D(), { closed = false, cont = false } = {}) {
  if (!segs.length) return path;
  if (!cont) path.moveTo(segs[0][0], segs[0][1]);
  else path.lineTo(segs[0][0], segs[0][1]);
  for (const s of segs) path.bezierCurveTo(s[2], s[3], s[4], s[5], s[6], s[7]);
  if (closed) path.closePath();
  return path;
}

export function splinePath(pts, { closed = false, tension = 1, path } = {}) {
  return segsToPath(splineSegs(pts, closed, tension), path || new Path2D(), { closed });
}

function bez(s, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * s[0] + b * s[2] + c * s[4] + d * s[6], a * s[1] + b * s[3] + c * s[5] + d * s[7]];
}

/** dense polyline of a smooth curve through pts (step in reference units) */
export function sampleSpline(pts, { closed = false, tension = 1, step = 2 } = {}) {
  const segs = splineSegs(pts, closed, tension);
  const out = [];
  for (let k = 0; k < segs.length; k++) {
    const s = segs[k];
    const L = Math.hypot(s[2] - s[0], s[3] - s[1]) + Math.hypot(s[4] - s[2], s[5] - s[3]) + Math.hypot(s[6] - s[4], s[7] - s[5]);
    const n = Math.max(2, Math.ceil(L / step));
    for (let i = (k === 0 ? 0 : 1); i <= n; i++) out.push(bez(s, i / n));
  }
  if (closed && out.length > 1) out.pop();
  return out;
}

/** cumulative arc length of a polyline */
export function arcLengths(poly) {
  const L = new Float32Array(poly.length);
  for (let i = 1; i < poly.length; i++) L[i] = L[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
  return L;
}

/** point at arc-length fraction u along a polyline (+ unit tangent) */
export function pointAt(poly, u, L = arcLengths(poly)) {
  const total = L[L.length - 1];
  const s = clamp(u) * total;
  let i = 1;
  while (i < poly.length - 1 && L[i] < s) i++;
  const s0 = L[i - 1], s1 = L[i];
  const f = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  const a = poly[i - 1], b = poly[i];
  const d = dir(a[0], a[1], b[0], b[1]);
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), tx: d[0], ty: d[1] };
}

/** sub-polyline between arc fractions u0..u1 */
export function subPoly(poly, u0, u1, L = arcLengths(poly)) {
  const total = L[L.length - 1];
  const s0 = u0 * total, s1 = u1 * total;
  const out = [];
  const a = pointAt(poly, u0, L);
  out.push([a.x, a.y]);
  for (let i = 0; i < poly.length; i++) if (L[i] > s0 && L[i] < s1) out.push(poly[i]);
  const b = pointAt(poly, u1, L);
  out.push([b.x, b.y]);
  return out;
}

// ------------------------------------------------------------------ width profiles

/** piecewise-smooth width profile from keys [[u, w], ...] (u ascending 0..1) */
export function profileFn(keys) {
  if (typeof keys === 'function') return keys;
  if (typeof keys === 'number') return () => keys;
  return (u) => {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        return lerp(a[1], b[1], smooth((u - a[0]) / ((b[0] - a[0]) || 1)));
      }
    }
    return keys[keys.length - 1][1];
  };
}

/** standard brush: thin entry, belly, pointed exit. w = max width */
export function brush(w, { start = 0.15, end = 0.0, attack = 0.25, release = 0.35 } = {}) {
  return profileFn([[0, w * start], [attack, w], [1 - release, w], [1, w * end]]);
}

// ------------------------------------------------------------------ tapered strokes

/**
 * Outline polygon (Path2D) of a variable-width stroke along a polyline.
 * width(u, s, total) -> full width at arc fraction u. Round caps where the end width > 0.
 */
export function taperPath(poly, width, path = new Path2D(), { caps = true } = {}) {
  const n = poly.length;
  if (n < 2) return path;
  const wf = profileFn(width);
  const L = arcLengths(poly);
  const total = L[n - 1] || 1;
  const left = new Array(n), right = new Array(n), W = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = poly[Math.max(0, i - 1)], b = poly[Math.min(n - 1, i + 1)];
    const d = dir(a[0], a[1], b[0], b[1]);
    const w = Math.max(0, wf(L[i] / total, L[i], total)) * 0.5;
    W[i] = w;
    left[i] = [poly[i][0] - d[1] * w, poly[i][1] + d[0] * w];
    right[i] = [poly[i][0] + d[1] * w, poly[i][1] - d[0] * w];
  }
  path.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) path.lineTo(left[i][0], left[i][1]);
  if (caps && W[n - 1] > 0.3) {
    const p = poly[n - 1], q = poly[n - 2];
    const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
    path.arc(p[0], p[1], W[n - 1], ang + Math.PI / 2, ang - Math.PI / 2, true);
  }
  for (let i = n - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
  if (caps && W[0] > 0.3) {
    const p = poly[0], q = poly[1];
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    path.arc(p[0], p[1], W[0], ang - Math.PI / 2, ang + Math.PI / 2, true);
  }
  path.closePath();
  return path;
}

/**
 * Closed outline of a "ribbon" (hair clump, lock, finger): spine polyline + width profile, the two
 * sides joined at the ends. Returns { path, left, right } (left/right = side polylines, root->tip).
 */
export function ribbon(spine, width, { step = 2, tension = 1 } = {}) {
  const poly = spine.length > 2 || step ? sampleSpline(spine, { step, tension }) : spine;
  const n = poly.length;
  const wf = profileFn(width);
  const L = arcLengths(poly);
  const total = L[n - 1] || 1;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = poly[Math.max(0, i - 1)], b = poly[Math.min(n - 1, i + 1)];
    const d = dir(a[0], a[1], b[0], b[1]);
    const w = Math.max(0, wf(L[i] / total)) * 0.5;
    left.push([poly[i][0] - d[1] * w, poly[i][1] + d[0] * w]);
    right.push([poly[i][0] + d[1] * w, poly[i][1] - d[0] * w]);
  }
  const path = new Path2D();
  path.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) path.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
  path.closePath();
  return { path, left, right, spine: poly };
}

/** polygon (array of points) -> Path2D */
export function polyPath(poly, closed = true, path = new Path2D()) {
  if (!poly.length) return path;
  path.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
  if (closed) path.closePath();
  return path;
}

/** ellipse Path2D */
export function ellipsePath(cx, cy, rx, ry, rot = 0, path = new Path2D()) {
  path.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  return path;
}

/** bounding box of point lists */
export function bbox(...lists) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const l of lists) for (const p of l) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// ------------------------------------------------------------------ noise (deterministic)

/** smooth 1D value noise in [-1, 1] */
export function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash01(i, seed) * 2 - 1, b = hash01(i + 1, seed) * 2 - 1;
  const u = f * f * f * (f * (f * 6 - 15) + 10);
  return a + (b - a) * u;
}

/** 2-octave sway noise */
export function sway(t, seed, freq = 0.5) {
  return vnoise(t * freq, seed) * 0.7 + vnoise(t * freq * 2.13 + 17.3, seed + 101) * 0.3;
}
