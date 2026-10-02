// AI character — maid outfit pieces shared by the views (head-local units unless noted).
import { P, xf, mirrorX, splinePath, sampleSpline, polyPath, clamp, lerp, TAU } from '../geom.js';
import { mix, rgba } from '../palettes.js';
import { ellipsePts } from './util.js';

/** fill + outline helper for a closed control-point shape */
export function shape(pen, pts, fill, line, lw = 1.6, o = {}) {
  const path = pen.curve(pts, { closed: true, id: o.id, k: o.k ?? 0.6, tension: o.tension ?? 1 });
  if (fill) pen.wash(path, fill, { pool: o.pool ?? 0.7, poolColor: o.poolColor });
  if (line && lw) pen.line(pts.concat([pts[0]]), [[0, lw * 0.8], [0.5, lw], [1, lw * 0.8]], line, { id: o.id ? o.id + 'o' : null, k: o.k ?? 0.6, tension: o.tension ?? 1, alpha: o.alpha ?? 1 });
  return path;
}

/** open outline stroke */
export function stroke(pen, pts, lw, color, o = {}) {
  return pen.line(pts, o.prof || [[0, lw * (o.s ?? 0.35)], [0.2, lw], [0.8, lw], [1, lw * (o.e ?? 0.35)]], color, { id: o.id, k: o.k ?? 0.5, alpha: o.alpha ?? 1, tension: o.tension ?? 1 });
}

/** ruffle strip along a polyline: scallops on the `side` (+1 left normal / -1 right normal) */
export function ruffle(pen, base, { depth = 10, count = 8, side = 1, fill, shade, line, lw = 1.3, id = 'rf', shadeAlpha = 0.9 } = {}) {
  const pal = pen.pal;
  const poly = sampleSpline(base, { step: 1.5 });
  const n = poly.length;
  const L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const total = L[n - 1];
  const outer = [];
  const norm = (i) => {
    const a = poly[Math.max(0, i - 1)], b = poly[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l * side, dx / l * side];
  };
  for (let i = 0; i < n; i++) {
    const u = L[i] / total;
    const ph = (u * count) % 1;
    const d = depth * (0.55 + 0.45 * Math.pow(Math.sin(ph * Math.PI), 0.7));
    const nn = norm(i);
    outer.push([poly[i][0] + nn[0] * d, poly[i][1] + nn[1] * d]);
  }
  const path = polyPath(outer.concat(poly.slice().reverse()));
  pen.fill(path, fill || pal.apron);
  // fold shading: a thin wedge per scallop
  pen.clip(path, () => {
    for (let s = 0; s < count; s++) {
      const u = (s + 0.78) / count;
      const i = Math.min(n - 1, Math.floor(u * (n - 1)));
      const j = Math.min(n - 1, i + Math.max(2, Math.floor(n / count * 0.22)));
      const nn = norm(i);
      pen.fill(polyPath([poly[i], [poly[i][0] + nn[0] * depth * 1.3, poly[i][1] + nn[1] * depth * 1.3], [poly[j][0] + nn[0] * depth * 1.3, poly[j][1] + nn[1] * depth * 1.3], poly[j]]), shade || pal.apronShade, shadeAlpha);
    }
  });
  pen.line(outer, [[0, lw * 0.5], [0.05, lw], [0.95, lw], [1, lw * 0.5]], line || pal.apronLine, { step: 1.5 });
  // folds: short lines from valleys inward
  for (let s = 1; s < count; s++) {
    const i = Math.min(n - 1, Math.floor((s / count) * (n - 1)));
    const nn = norm(i);
    pen.line([[poly[i][0] + nn[0] * depth * 0.55, poly[i][1] + nn[1] * depth * 0.55], [poly[i][0] + nn[0] * depth * 0.05, poly[i][1] + nn[1] * depth * 0.05]], [[0, lw * 0.9], [1, 0.1]], line || pal.apronLine, { alpha: 0.75 });
  }
  return path;
}

/** gem (diamond) at x,y size r */
export function gem(pen, x, y, r, rot = 0) {
  const pal = pen.pal;
  const T = (l) => xf(l, { rot }).map((q) => [q[0] + x, q[1] + y]);
  const outer = T([[0, -r * 1.15], [r * 0.85, 0], [0, r * 1.15], [-r * 0.85, 0]]);
  const set = T([[0, -r * 1.45], [r * 1.1, 0], [0, r * 1.45], [-r * 1.1, 0]]);
  pen.fill(polyPath(set), pal.gemSet);
  pen.fill(polyPath(outer), pal.gem);
  pen.fill(polyPath(T([[0, -r * 1.15], [r * 0.85, 0], [0, 0]])), pal.gemCore, 0.8);
  pen.fill(polyPath(T([[0, r * 1.15], [-r * 0.85, 0], [0, 0]])), pal.gemDeep, 0.55);
  pen.fill(polyPath(T([[-r * 0.15, -r * 0.55], [r * 0.15, -r * 0.7], [r * 0.25, -r * 0.35]])), '#FFFFFF', 0.9);
  const c = pen.c;
  c.save(); c.strokeStyle = pal.goldShade; c.lineWidth = Math.max(0.6, r * 0.14); c.stroke(polyPath(set)); c.restore();
}

/** navy bow tie with gem; centre x,y, scale k */
export function bowTie(pen, x, y, k = 1, id = 'bt') {
  const pal = pen.pal;
  const T = (l) => l.map((q) => [x + q[0] * k, y + q[1] * k, q[2] || 0, q[3] ?? 1]);
  // tails
  for (const sd of [-1, 1]) {
    const tl = T([P(sd * 3, 4), P(sd * 10, 18), P(sd * 15, 40, 1), P(sd * 8, 36), P(sd * 3, 42, 1), P(sd * 1, 8)]);
    const tp = pen.curve(tl, { id: id + 't' + sd, k: 0.3, tension: 0.8 });
    pen.fill(tp, pal.tieShade);
    pen.line(tl.concat([tl[0]]), 1.2, pal.tieLine, { tension: 0.8, start: 0.7, end: 0.7, attack: 0.1, release: 0.1 });
  }
  for (const sd of [-1, 1]) {
    const lp = T([P(0, -2, 1), P(sd * 10, -12), P(sd * 26, -15), P(sd * 33, -5), P(sd * 30, 9), P(sd * 14, 9), P(0, 3, 1)]);
    const path = pen.curve(lp, { id: id + 'l' + sd, k: 0.3 });
    pen.fill(path, pal.tie);
    pen.clip(path, () => {
      pen.fill(pen.curve(T([P(0, 1), P(sd * 14, 4), P(sd * 30, 5), P(sd * 30, 12), P(sd * 10, 12)]), { tension: 0.8 }), pal.tieShade, 0.9);
      pen.fill(pen.curve(T([P(sd * 8, -7), P(sd * 20, -12), P(sd * 27, -10), P(sd * 17, -8)]), { tension: 0.8 }), pal.dressLight, 0.9);
    });
    pen.line(lp.concat([lp[0]]), [[0, 1.0], [0.5, 1.6], [1, 1.0]], pal.tieLine, {});
    pen.line(T([P(sd * 5, -1), P(sd * 16, 0), P(sd * 25, -3)]), [[0, 0], [0.5, 1.0], [1, 0]], pal.tieLine, { alpha: 0.7 });
  }
  const knot = T([P(-6, -7), P(6, -7), P(7, 6), P(-7, 6)]);
  pen.fill(pen.curve(knot, { tension: 0.6 }), pal.tie);
  gem(pen, x, y - 0.5 * k, 4.6 * k);
}

/** small generic whale motif (apron embroidery); centre x,y, size k (body length ~ 34k) */
export function whaleMotif(pen, x, y, k = 1, o = {}) {
  const pal = pen.pal;
  const col = o.color || pal.motif;
  const T = (l) => l.map((q) => [x + q[0] * k, y + q[1] * k, q[2] || 0, q[3] ?? 1]);
  const body = T([P(-16, 2), P(-10, -8), P(2, -10), P(13, -6), P(18, 2), P(14, 8), P(2, 10), P(-8, 8), P(-15, 6, 1), P(-21, 9), P(-26, 4, 1), P(-21, 0), P(-24, -6, 1), P(-18, -2)]);
  const bp = pen.curve(body, { tension: 0.9 });
  pen.fill(bp, col);
  // belly
  pen.clip(bp, () => pen.fill(pen.curve(T([P(-12, 6), P(0, 4), P(14, 3), P(18, 6), P(10, 14), P(-8, 12)]), { tension: 0.9 }), o.belly || pal.motifLight, 0.9));
  // eye + smile
  const e = new Path2D(); const q = T([[9, -2]])[0]; e.arc(q[0], q[1], 1.3 * k, 0, TAU);
  pen.fill(e, '#FFFFFF');
  // spout
  for (const sd of [-1, 1]) pen.line(T([[2, -12], [2 + sd * 3, -18], [2 + sd * 7, -19]]), [[0, 1.0 * k], [1, 0.2]], col, {});
  pen.line(T([[2, -11], [2, -18]]), [[0, 1.1 * k], [1, 0.3]], col, {});
}
