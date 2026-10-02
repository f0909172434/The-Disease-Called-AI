// Heroine rig — Pen: drawing wrapper around a CanvasRenderingContext2D whose transform maps the
// view's reference units to pixels. Adds boil jitter, tapered ink lines, cel-shade clipping,
// gradients and the painterly fill finish (watercolour edge pooling).
import { splinePath, sampleSpline, taperPath, boilPts, ribbon, profileFn, brush } from './geom.js';
import { rgba, mix } from './palettes.js';

export class Pen {
  /**
   * @param {CanvasRenderingContext2D} c   context, transform already set to reference units
   * @param {object} o  { pal, boil (ref units), boilSeed, painterly (0..1), lineScale, scale (px per unit) }
   */
  constructor(c, o = {}) {
    this.c = c;
    this.pal = o.pal;
    this.boil = o.boil || 0;
    this.boilSeed = o.boilSeed || 0;
    this.painterly = o.painterly || 0;
    this.lineScale = o.lineScale ?? 1;
    this.scale = o.scale || 1;
    this.lineAlpha = 1;
  }

  /** boil-jittered copy of a point list (amp multiplier k, e.g. 0.5 for small features) */
  pts(list, id, k = 1) {
    return this.boil ? boilPts(list, this.boil * k, this.boilSeed, id) : list;
  }

  /** smooth closed/open Path2D through points (boiled when id given) */
  curve(list, { closed = true, tension = 1, id = null, k = 1 } = {}) {
    return splinePath(id != null ? this.pts(list, id, k) : list, { closed, tension });
  }

  fill(path, color, alpha = 1) {
    const c = this.c;
    if (alpha !== 1) c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fill(path);
    if (alpha !== 1) c.globalAlpha = 1;
  }

  /** fill + watercolour edge pooling (darker rim inside the shape) when painterly > 0 */
  wash(path, color, { pool = 1, poolColor = null, alpha = 1 } = {}) {
    this.fill(path, color, alpha);
    const p = this.painterly * pool;
    if (p <= 0.01) return;
    const c = this.c;
    c.save();
    c.clip(path);
    c.strokeStyle = poolColor || mix(color, '#000000', 0.22);
    c.lineJoin = 'round';
    const widths = [9, 5, 2.4];
    const alphas = [0.10, 0.14, 0.22];
    for (let i = 0; i < 3; i++) {
      c.globalAlpha = alphas[i] * p * alpha;
      c.lineWidth = widths[i];
      c.stroke(path);
    }
    c.restore();
  }

  /** run fn with the canvas clipped to path */
  clip(path, fn) {
    const c = this.c;
    c.save();
    c.clip(path);
    fn();
    c.restore();
  }

  /**
   * tapered ink line along a smooth curve through pts.
   * w: number (max width) or profile keys/function; opts: color, id (boil), tension, alpha, k (boil mult), brush opts
   */
  line(pts, w, color, { id = null, tension = 1, alpha = 1, k = 0.6, start = 0.1, end = 0.0, attack = 0.2, release = 0.35, closed = false, step = 1.5 } = {}) {
    // dense polylines (e.g. ribbon sides) already inherit boil from their jittered control points
    const list = id != null && pts.length <= 32 ? this.pts(pts, id, k) : pts;
    const poly = sampleSpline(list, { closed, tension, step });
    if (closed && poly.length) poly.push(poly[0]);
    const wf = typeof w === 'number' ? brush(w * this.lineScale, { start, end, attack, release }) : scaleProfile(profileFn(w), this.lineScale);
    const path = taperPath(poly, wf);
    this.fill(path, color, alpha * this.lineAlpha);
    return path;
  }

  /** ribbon (clump/lock) outline path through spine with width profile */
  ribbon(spine, width, { id = null, k = 1, step = 2 } = {}) {
    const s = id != null ? this.pts(spine, id, k) : spine;
    return ribbon(s, width, { step });
  }

  linear(x0, y0, x1, y1, stops) {
    const g = this.c.createLinearGradient(x0, y0, x1, y1);
    for (const [o, col, a = 1] of stops) g.addColorStop(o, a === 1 ? col : rgba(col, a));
    return g;
  }

  radial(x, y, r0, r1, stops, x1 = x, y1 = y) {
    const g = this.c.createRadialGradient(x, y, r0, x1, y1, r1);
    for (const [o, col, a = 1] of stops) g.addColorStop(o, a === 1 ? col : rgba(col, a));
    return g;
  }

  /** soft radial blob (blush, glow); color may be css; scaleY squashes */
  blob(x, y, r, color, alpha = 1, { sy = 1, rot = 0, inner = 0 } = {}) {
    const c = this.c;
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.scale(1, sy);
    c.fillStyle = this.radial(0, 0, r * inner, r, [[0, color, alpha], [1, color, 0]]);
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

function scaleProfile(fn, s) { return s === 1 ? fn : (u, a, b) => fn(u, a, b) * s; }
