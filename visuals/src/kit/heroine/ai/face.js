// AI character — face: geometry per style (0 normal .. 1 chibi), yaw warp, skin, eyes, brows, nose,
// mouth, blush. All in HEAD-LOCAL units: x right, y down, eye line y=0, face midline x=0,
// skull half-width ~100, crown ~-135, chin ~+110 (normal) / ~+88 (chibi).
import { P, mixPts, blendPts, mirrorX, splinePath, sampleSpline, polyPath, clamp, lerp, smooth } from '../geom.js';
import { mix, rgba } from '../palettes.js';
import { exprOf, lookOf, ellipsePts, heartPath, sparklePath } from './util.js';

// ------------------------------------------------------------------ geometry

// right half of the face outline, temple -> chin (normal / chibi)
const HALF_N = [P(97, -70), P(98, -24), P(95, 12), P(87, 44), P(70, 72), P(44, 96), P(0, 111, 0, 0.75)];
const HALF_C = [P(98, -70), P(100, -22), P(99, 14), P(93, 42), P(78, 64), P(48, 82), P(0, 90, 0, 0.9)];

function faceLoop(half) {
  const L = mirrorX(half, 0).slice(0, -1);
  const R = half.slice(0, -1).reverse();
  return [P(-72, -118), ...L, half[half.length - 1], ...R, P(72, -118), P(0, -136)];
}

/** head geometry for a style (0 normal .. 1 chibi) and yaw `turn` (rad, + = face turns to screen right) */
export function headGeo(style = 0, turn = 0) {
  const s = clamp(style);
  const sinT = Math.sin(turn);
  const G = {
    s, turn,
    half: mixPts(HALF_N, HALF_C, s),
    eyeX: lerp(44, 47, s), eyeY: lerp(0, 10, s), eyeK: lerp(1, 1.25, s),
    browY: lerp(-44, -41, s),
    nose: [0, lerp(42, 46, s)],
    mouth: [0, lerp(70, 64, s)], mouthK: lerp(1, 1.12, s),
    blush: [lerp(55, 58, s), lerp(36, 48, s)], blushK: lerp(1, 1.15, s),
    chin: lerp(111, 90, s),
    /** yaw warp of a head-local point lying on the front of the head (depth 1) or behind (depth < 0) */
    W(q, depth = 1) {
      if (!turn) return q;
      const R = 104;
      const z = Math.sqrt(Math.max(0, 1 - (q[0] / R) * (q[0] / R)));
      const r = q.slice();
      r[0] = q[0] + R * sinT * z * depth;
      return r;
    },
    /** local x-scale of the warp at x (for ellipses) */
    dW(x, depth = 1) {
      if (!turn) return 1;
      const R = 104;
      const u = clamp(x / R, -0.98, 0.98);
      return 1 - sinT * depth * u / Math.sqrt(1 - u * u);
    },
  };
  G.face = faceLoop(G.half).map((q) => G.W(q));
  // far cheek bump on 3/4 turns (cheekbone silhouette)
  if (turn) {
    const sd = Math.sign(turn), k = Math.abs(sinT);
    G.face = G.face.map((q) => {
      if (Math.sign(q[0]) !== sd || q[1] < -40 || q[1] > 80) return q;
      const r = q.slice();
      r[0] += sd * k * 10 * Math.sin(((q[1] + 40) / 120) * Math.PI);
      return r;
    });
  }
  G.facePath = splinePath(G.face, { closed: true });
  return G;
}

// ------------------------------------------------------------------ expression -> feature state

// eye lids in EYE-LOCAL units (+x = outward / temple side, y down). U: inner -> outer (6),
// L: outer -> inner along the bottom (7, ends equal U's corners).
const EYE = {
  neutral: {
    U: [[-24, -1], [-16, -15], [-3, -22.5], [11, -23], [21, -18.5], [27, -10]],
    L: [[27, -10], [26.5, 4], [19, 18], [6, 24.5], [-8, 22], [-19, 11], [-24, -1]],
  },
  closed: {
    U: [[-24, 5], [-15, 10.5], [-3, 13], [10, 12.5], [20, 9], [27, 3]],
    L: [[27, 3], [24, 6.5], [17, 10.4], [6, 12.8], [-6, 12.9], [-16, 10.6], [-24, 5]],
  },
  smile: {
    U: [[-24, 0], [-16, -14], [-3, -21.5], [11, -22], [21, -17.5], [27, -9]],
    L: [[27, -9], [25, 1], [18, 8], [6, 11], [-8, 10], [-18, 6], [-24, 0]],
  },
  gentle: {
    U: [[-24, 1], [-16, -9], [-3, -14.5], [11, -15.5], [21, -12], [27, -6]],
    L: [[27, -6], [25.5, 4], [18, 13], [6, 16.5], [-8, 15], [-18, 9], [-24, 1]],
  },
  worried: {
    U: [[-24, -5], [-16, -19], [-3, -24.5], [11, -22.5], [21, -16], [27, -7]],
    L: [[27, -7], [26, 5], [19, 18.5], [6, 24.5], [-8, 22.5], [-19, 11], [-24, -5]],
  },
  heart: {
    U: [[-24, -2], [-16, -17], [-3, -25], [11, -25.5], [21, -20.5], [27, -11.5]],
    L: [[27, -11.5], [26.5, 3], [19, 16], [6, 21], [-8, 19], [-19, 9], [-24, -2]],
  },
  blank: {
    U: [[-24, -1], [-16, -16.5], [-3, -24], [11, -24.5], [21, -19.5], [27, -10.5]],
    L: [[27, -10.5], [26.5, 4.5], [19, 18.5], [6, 25], [-8, 22.5], [-19, 11.5], [-24, -1]],
  },
};

// brows (eye-local), inner -> outer
const BROW = {
  neutral: [[-21, -42], [-6, -46], [10, -45.5], [24, -40]],
  smile: [[-21, -45], [-6, -49.5], [10, -49], [24, -43.5]],
  gentle: [[-21, -42], [-6, -45], [10, -44.5], [24, -39.5]],
  worried: [[-21, -50], [-7, -50.5], [9, -46.5], [24, -39]],
  heart: [[-21, -46], [-6, -51], [10, -50.5], [24, -45]],
  blank: [[-21, -43], [-6, -45], [10, -45], [24, -42]],
};

const VOWELS = {
  // hw half width, h height, round 0..1, teeth 0..1
  A: [12.5, 15, 0.42, 0.0],
  I: [15, 6.5, 0.15, 1],
  U: [6.5, 8.5, 1, 0],
  E: [13.5, 10, 0.3, 0.55],
  O: [8.5, 14, 1, 0],
};

// per-expression mouth (when p.mouth is not given): open, vowel, smile
const MOUTH_EXPR = {
  neutral: [0.0, 'A', 0.45],
  smile: [0.62, 'A', 1],
  gentle: [0.0, 'A', 0.85],
  worried: [0.22, 'E', -0.7],
  heart: [0.78, 'A', 1],
  blank: [0.0, 'A', 0.0],
};

/** resolve params into feature state */
export function featureState(p, pen) {
  const x = exprOf(p);
  const look = lookOf(pen, p);
  const ws = ['neutral', 'smile', 'gentle', 'worried', 'heart', 'blank'];
  const w = ws.map((k) => x[k]);
  const lidU = blendPts(ws.map((k) => EYE[k].U), w);
  const lidL = blendPts(ws.map((k) => EYE[k].L), w);
  const blink = clamp(p.blink || 0);
  const close = smooth(blink);
  const U = mixPts(lidU, EYE.closed.U, close);
  const L = mixPts(lidL, EYE.closed.L, close);
  const brow = blendPts(ws.map((k) => BROW[k]), w);
  if (blink) for (const q of brow) q[1] += blink * 2.5;
  // mouth
  let open = 0, smile = 0;
  const vw = { A: 0, I: 0, U: 0, E: 0, O: 0 };
  ws.forEach((k, i) => {
    const m = MOUTH_EXPR[k];
    open += m[0] * w[i]; smile += m[2] * w[i]; vw[m[1]] += w[i];
  });
  if (p.mouth) {
    open = clamp(p.mouth.open ?? 0);
    for (const k in vw) vw[k] = 0;
    vw[p.mouth.vowel || 'A'] = 1;
    if (p.mouth.vowel === 'O' || p.mouth.vowel === 'U') smile *= 0.25;
  }
  const uncanny = clamp(p.uncanny || 0);
  return {
    x, U, L, brow, close, open, smile: smile + uncanny * 0.35, vw,
    gaze: { x: clamp(p.gaze?.x ?? 0, -1, 1), y: clamp(p.gaze?.y ?? 0, -1, 1) },
    heart: x.heart, blank: x.blank, uncanny,
    blush: p.blush ?? (0.55 + x.heart * 0.45 + x.smile * 0.15 + x.worried * 0.1),
    tears: clamp(p.tears || 0),
    glow: look.glowIris || 0,
  };
}

// ------------------------------------------------------------------ skin

export function drawFace(pen, p, G) {
  const pal = pen.pal;
  const F = featureState(p, pen);
  const face = pen.curve(G.face, { id: 'face', k: 0.5 });
  pen.wash(face, pal.skin, { pool: 0.5, poolColor: pal.skinShade2 });
  // cel shade: far/right side of the jaw (light from upper left)
  pen.clip(face, () => {
    const sh = G.half.map((q) => [q[0] + 0, q[1]]);
    const inner = sh.map((q) => [q[0] * 0.86 - 2, q[1] + 2]).reverse();
    const shade = splinePath(sh.concat(inner).map((q) => G.W(q)), { closed: true });
    pen.fill(shade, pal.skinShade, 0.55);
    // soft cheek warmth
    const b = G.blush;
    for (const sd of [-1, 1]) {
      const c = G.W([sd * b[0], b[1] + 2]);
      pen.blob(c[0], c[1], 30 * G.blushK, pal.blush, 0.18 * F.blush, { sy: 0.55 });
    }
  });
  // jaw outline: two tapered strokes temple -> chin
  const half = G.half.slice(1).map((q) => G.W(q));
  const halfL = mirrorX(G.half, 0).slice(1).map((q) => G.W(q));
  const prof = [[0, 0.5], [0.3, 1.9], [0.75, 2.1], [0.93, 1.5], [1, 0.9]];
  pen.line(half, prof, pal.skinLine, { id: 'jawR', k: 0.4 });
  pen.line(halfL, prof, pal.skinLine, { id: 'jawL', k: 0.4 });
}

export function drawBlush(pen, p, G, F) {
  const pal = pen.pal;
  const a = clamp(F.blush, 0, 1.4);
  if (a <= 0.01) return;
  const b = G.blush, K = G.blushK;
  for (const sd of [-1, 1]) {
    const c = G.W([sd * b[0], b[1]]);
    pen.blob(c[0], c[1], 22 * K, pal.blush, 0.55 * a, { sy: 0.5 });
    // hatch lines ///
    for (let i = 0; i < 3; i++) {
      const hx = c[0] + (i - 1) * 7 * K - 1, hy = c[1] + 0.5;
      pen.line([[hx + 3 * K, hy - 4 * K], [hx - 2.5 * K, hy + 4 * K]], [[0, 0.3], [0.4, 1.3], [1, 0.2]], pal.blushLine, { alpha: 0.7 * Math.min(1, a) });
    }
  }
}

// ------------------------------------------------------------------ eyes

function eyeToHead(G, side, list) {
  const ex = side * G.eyeX, ey = G.eyeY, K = G.eyeK;
  return list.map((q) => G.W([ex + side * q[0] * K, ey + q[1] * K, q[2] || 0, q[3] ?? 1]));
}

export function drawEyes(pen, p, G, F) {
  drawEye(pen, p, G, F, -1);
  drawEye(pen, p, G, F, 1);
}

function drawEye(pen, p, G, F, side) {
  const pal = pen.pal, c = pen.c;
  const K = G.eyeK;
  const ex = side * G.eyeX, ey = G.eyeY;
  const sx = G.dW(ex) * K; // horizontal scale incl. 3/4 foreshortening
  const U = eyeToHead(G, side, F.U);
  const L = eyeToHead(G, side, F.L);
  U[0][2] = 1; U[U.length - 1][2] = 1;
  const loop = U.concat(L.slice(1, -1));
  const openAmt = 1 - F.close;
  const id = side < 0 ? 'eL' : 'eR';

  if (openAmt > 0.08) {
    const sclera = pen.curve(loop, { closed: true, id: id + 's', k: 0.25 });
    pen.fill(sclera, pal.sclera);
    pen.clip(sclera, () => {
      // lid shadow on the white
      c.save();
      c.strokeStyle = pal.scleraShade;
      c.lineWidth = 11 * K;
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.stroke(splinePath(U.map((q) => [q[0], q[1] + 2.5 * K])));
      c.restore();
      drawIris(pen, p, G, F, side, U, sx);
    });
  }
  // ---- lash line (thick, tapered, winged)
  const ext = eyeToHead(G, side, [[31, -5 + F.close * 5]]);
  const lash = U.concat(ext);
  const wMax = lerp(5.4, 4.2, F.close) * K;
  pen.line(lash, [[0, 0.7 * K], [0.12, 2.0 * K], [0.5, wMax * 0.8], [0.8, wMax], [0.92, wMax * 0.85], [1, 0.4]], pal.lash, { id: id + 'l', k: 0.25 });
  // outer-corner wedge (mass of lashes)
  const wedgeL = F.close > 0.5 ? [[16, 8], [27, 3], [31, 0], [24, 7]] : [[15, -20.5], [24, -15.5], [31, -5], [25, -8.5], [19, -14]];
  const wedge = eyeToHead(G, side, wedgeL);
  pen.fill(pen.curve(wedge, { closed: true, tension: 0.6, id: id + 'w', k: 0.2 }), pal.lash);
  // lash flicks
  const fl = F.close > 0.5
    ? [[[22, 7], [27, 12], [31, 13]], [[14, 11], [17, 16], [20, 18]]]
    : [[[18, -19.5], [25, -24], [31, -24.5]], [[24.5, -13], [31, -14.5], [35.5, -12.5]]];
  for (let i = 0; i < fl.length; i++) {
    pen.line(eyeToHead(G, side, fl[i]), [[0, 1.8 * K], [0.5, 1.3 * K], [1, 0]], pal.lash, { id: id + 'f' + i, k: 0.2 });
  }
  if (openAmt > 0.08) {
    // lower lash (outer part)
    const lo = eyeToHead(G, side, sampleLower(F.L, 0.06, 0.42));
    pen.line(lo, [[0, 0.3], [0.35, 1.5 * K], [0.75, 1.2 * K], [1, 0]], pal.lashLower, { id: id + 'lo', k: 0.2, alpha: 0.9 * openAmt });
    // inner corner tick
    const ic = eyeToHead(G, side, [[-24, -1], [-21.5, 4.5]]);
    pen.line(ic, [[0, 1.1 * K], [1, 0.2]], pal.lash, { alpha: 0.75 * openAmt });
    // crease
    const cr = eyeToHead(G, side, [[-6, -30.5 + F.close * 8], [8, -31.5 + F.close * 9], [21, -26.5 + F.close * 8]]);
    pen.line(cr, [[0, 0], [0.4, 1.1 * K], [1, 0]], pal.skinLine, { alpha: 0.55, id: id + 'c', k: 0.2 });
  }
}

function sampleLower(Lp, u0, u1) {
  const poly = sampleSpline(Lp, { step: 1 });
  const n = poly.length;
  return poly.slice(Math.floor(u0 * n), Math.floor(u1 * n)).filter((_, i) => i % 3 === 0);
}

function drawIris(pen, p, G, F, side, U, sx) {
  const pal = pen.pal, c = pen.c;
  const K = G.eyeK;
  const ex = side * G.eyeX, ey = G.eyeY;
  const gx = F.gaze.x * 6.5, gy = F.gaze.y * 5;
  const ic = G.W([ex + gx * K, ey + (2.5 + gy) * K]);
  const cx = ic[0], cy = ic[1];
  const rx = 16.6 * sx, ry = 22 * K;
  const blank = F.blank, heart = F.heart, unc = F.uncanny;
  const iris = new Path2D();
  iris.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  // gradient body
  const g = pen.linear(cx, cy - ry, cx, cy + ry, [
    [0, pal.iris0], [0.32, pal.iris1], [0.68, mix(pal.iris2, pal.iris1, blank * 0.6)], [1, mix(pal.iris3, pal.iris1, blank * 0.8)]]);
  pen.fill(iris, g);
  if (blank > 0.5) pen.fill(iris, mix(pal.iris1, '#8A96B8', 0.55), (blank - 0.5) * 1.6);
  pen.clip(iris, () => {
    // lower glow crescent
    pen.blob(cx, cy + ry * 0.62, rx * 0.9, pal.iris3, 0.55 * (1 - blank), { sy: 0.45 });
    // fine streaks
    if (blank < 0.9) {
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.12 + 0.76 * (i / 8));
        const x0 = cx + Math.cos(a) * rx * 0.38, y0 = cy + Math.sin(a) * ry * 0.38;
        const x1 = cx + Math.cos(a) * rx * 0.92, y1 = cy + Math.sin(a) * ry * 0.92;
        pen.line([[x0, y0], [x1, y1]], [[0, 0], [0.5, 0.9 * K], [1, 0]], pal.iris3, { alpha: 0.32 * (1 - blank) });
      }
    }
    // pupil
    const pr = lerp(1, 0.38, unc);
    const pa = (1 - heart * 0.85) * (1 - blank * 0.7);
    if (pa > 0.02) {
      const pp = new Path2D();
      pp.ellipse(cx, cy + 0.5 * K, 7.4 * sx * pr, 10.6 * K * pr, 0, 0, Math.PI * 2);
      pen.fill(pp, pal.pupil, 0.92 * pa);
    }
    if (unc > 0.05) {
      const ring = new Path2D();
      ring.ellipse(cx, cy + 0.5 * K, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
      c.save(); c.strokeStyle = rgba(pal.cyan, 0.7 * unc); c.lineWidth = 1.1 * K; c.stroke(ring); c.restore();
    }
    // top shadow from the lid
    c.save();
    c.strokeStyle = rgba(pal.iris0, 0.75);
    c.lineWidth = 14 * K; c.lineCap = 'round'; c.lineJoin = 'round';
    c.stroke(splinePath(U.map((q) => [q[0], q[1] + 3.5 * K])));
    c.restore();
    // blank: scan lines
    if (blank > 0.05) {
      for (let i = -6; i <= 6; i++) {
        const y = cy + i * 3.4 * K;
        pen.fill(rectPath(cx - rx, y, rx * 2, 1.1 * K), pal.cyanHi, 0.35 * blank);
      }
    }
  });
  // rim
  c.save();
  c.strokeStyle = pal.irisRim;
  c.lineWidth = 1.5 * K;
  c.stroke(iris);
  c.restore();
  // glowing iris (perfected)
  if (F.glow > 0) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    pen.blob(cx, cy + ry * 0.2, rx * 1.25, pal.irisGlow || pal.cyan, 0.35 * F.glow, { sy: 1.2 });
    c.restore();
  }
  // highlights (same screen side on both eyes)
  const hiA = 1 - blank;
  if (hiA <= 0.02) return;
  const h1x = cx - rx * 0.36, h1y = cy - ry * 0.36;
  if (heart > 0.05) {
    // big heart highlight in the centre + small heart
    const hp = heartPath(cx, cy + 1.5 * K, 9.5 * K * (0.7 + 0.3 * heart));
    pen.fill(hp, pal.heartTint, 0.95 * heart);
    const hp2 = heartPath(cx - 0.4 * K, cy + 0.8 * K, 7.2 * K * (0.7 + 0.3 * heart));
    pen.fill(hp2, pal.heart, heart);
    pen.fill(heartPath(cx + rx * 0.45, cy + ry * 0.52, 2.8 * K), pal.heart, heart);
    pen.fill(sparklePath(h1x - 1 * K, h1y - 3 * K, 5.5 * K), pal.heart, heart);
  }
  const nh = 1 - heart;
  if (nh > 0.02) {
    const hl = new Path2D();
    const rr = lerp(1, 0.85, unc);
    hl.ellipse(h1x, h1y, 5.6 * sx * rr, lerp(7, 5.6, unc) * K * rr, lerp(-0.35, 0, unc), 0, Math.PI * 2);
    pen.fill(hl, pal.hiLite, 0.97 * nh * hiA);
    const h2 = new Path2D();
    h2.arc(cx + rx * 0.4, cy + ry * 0.48, 2.5 * K, 0, Math.PI * 2);
    pen.fill(h2, pal.hiLite, 0.9 * nh * hiA);
    const h3 = new Path2D();
    h3.arc(cx - rx * 0.5, cy + ry * 0.42, 1.25 * K, 0, Math.PI * 2);
    pen.fill(h3, pal.hiLite, 0.75 * nh * hiA * (1 - unc));
  }
}

function rectPath(x, y, w, h) { const r = new Path2D(); r.rect(x, y, w, h); return r; }

// ------------------------------------------------------------------ brows, nose, mouth

export function drawBrows(pen, p, G, F, alpha = 1) {
  const pal = pen.pal;
  for (const side of [-1, 1]) {
    const pts = eyeToHead(G, side, F.brow);
    pen.line(pts, [[0, 2.2], [0.3, 2.7], [0.75, 1.6], [1, 0.2]], pal.brow, { alpha, id: 'br' + side, k: 0.3 });
  }
}

export function drawNose(pen, p, G) {
  const pal = pen.pal;
  const n = G.nose;
  const pts = [[n[0] + 2.2, n[1] - 4], [n[0] + 0.6, n[1]], [n[0] - 1.8, n[1] + 1.4]].map((q) => G.W(q));
  pen.line(pts, [[0, 0.2], [0.5, 1.5], [1, 0.4]], pal.skinLineSoft, { alpha: 0.95 });
}

export function mouthShape(F) {
  let hw = 0, h = 0, round = 0, teeth = 0, tw = 0;
  for (const k in F.vw) {
    const w = F.vw[k];
    if (!w) continue;
    const v = VOWELS[k];
    hw += v[0] * w; h += v[1] * w; round += v[2] * w; teeth += v[3] * w; tw += w;
  }
  if (tw) { hw /= tw; h /= tw; round /= tw; teeth /= tw; }
  const o = clamp(F.open);
  const sm = F.smile;
  const hwc = 7 + Math.max(0, sm) * 3.5 + Math.max(0, -sm) * 1.5;
  const HW = lerp(hwc, hw * (1 + Math.max(0, sm) * 0.08), smooth(o * 2.5));
  const H = h * o;
  const ht = H * lerp(0.1, 0.5, round), hb = H - ht;
  const lift = sm * (2.2 + H * 0.12) * (1 - round * 0.6);
  const U = [P(-HW, -lift, 1), P(-HW * 0.55, -ht * 0.92 - lift * 0.3), P(0, -ht), P(HW * 0.55, -ht * 0.92 - lift * 0.3), P(HW, -lift, 1)];
  const Lo = [P(HW, -lift, 1), P(HW * 0.6, hb * 0.82 - lift * 0.15), P(0, hb), P(-HW * 0.6, hb * 0.82 - lift * 0.15), P(-HW, -lift, 1)];
  return { U, Lo, HW, H, ht, hb, teeth, round, lift };
}

export function drawMouth(pen, p, G, F) {
  const pal = pen.pal;
  const M = mouthShape(F);
  const K = G.mouthK;
  const [mx, my] = G.mouth;
  const toH = (list) => list.map((q) => G.W([mx + q[0] * K, my + q[1] * K, q[2] || 0, q[3] ?? 1]));
  const U = toH(M.U), Lo = toH(M.Lo);
  if (M.H > 1.2) {
    const loop = U.concat(Lo.slice(1, -1));
    const mp = pen.curve(loop, { closed: true, id: 'mo', k: 0.2 });
    pen.fill(mp, pal.mouthIn);
    pen.clip(mp, () => {
      const top = G.W([mx, my - M.ht * K]);
      pen.blob(top[0], top[1], M.HW * K * 1.2, pal.mouthDeep, 0.7, { sy: 0.5 });
      // tongue
      const tg = G.W([mx, my + (M.hb * 0.92) * K]);
      const tp = new Path2D();
      tp.ellipse(tg[0], tg[1], M.HW * 0.62 * K, Math.max(2, M.H * 0.42) * K, 0, 0, Math.PI * 2);
      pen.fill(tp, pal.tongue);
      // teeth
      if (M.teeth > 0.05) {
        const tt = G.W([mx, my - M.ht * K]);
        const r = new Path2D();
        r.rect(tt[0] - M.HW * K, tt[1] - 4 * K, M.HW * 2 * K, (4 + Math.min(M.H * 0.3, 4.5)) * K);
        pen.fill(r, pal.teeth, M.teeth);
      }
    });
    pen.line(Lo, [[0, 0.3], [0.5, 1.15], [1, 0.3]], pal.mouthLine, { alpha: 0.7, id: 'mol', k: 0.2 });
  }
  // upper lip line (or closed-mouth line)
  const closed = M.H <= 1.2;
  pen.line(U, [[0, 0.5], [0.2, closed ? 1.6 : 1.5], [0.5, closed ? 1.9 : 1.6], [0.8, closed ? 1.6 : 1.5], [1, 0.5]], pal.mouthLine, { id: 'mou', k: 0.2 });
  // smile corner ticks
  if (F.smile > 0.3 && M.H < 6) {
    for (const sd of [-1, 1]) {
      const cpt = [[sd * (M.HW + 0.6), -M.lift - 0.4], [sd * (M.HW + 2.2), -M.lift - 2.4]];
      pen.line(toH(cpt), [[0, 0.9], [1, 0.2]], pal.mouthLine, { alpha: 0.6 * (F.smile - 0.3) });
    }
  }
}

/** tears (small glossy drops at the lower lids) */
export function drawTears(pen, p, G, F) {
  if (F.tears <= 0.02) return;
  const pal = pen.pal;
  for (const side of [-1, 1]) {
    const q = eyeToHead(G, side, [[-4, 24]])[0];
    const r = 4.5 * G.eyeK * F.tears;
    const d = new Path2D();
    d.moveTo(q[0], q[1] - r);
    d.bezierCurveTo(q[0] + r, q[1] + r * 0.2, q[0] + r * 0.8, q[1] + r * 1.4, q[0], q[1] + r * 1.4);
    d.bezierCurveTo(q[0] - r * 0.8, q[1] + r * 1.4, q[0] - r, q[1] + r * 0.2, q[0], q[1] - r);
    pen.fill(d, pal.iris3, 0.75);
    pen.fill(heartPathDot(q[0] - r * 0.3, q[1] + r * 0.5, r * 0.3), pal.hiLite, 0.9);
  }
}
function heartPathDot(x, y, r) { const d = new Path2D(); d.arc(x, y, r, 0, Math.PI * 2); return d; }
