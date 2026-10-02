// AI character — hair, whale-fin ears and maid headdress, in HEAD-LOCAL units (see face.js).
// Hair = overlapping ribbon clumps with a height-based blue-black -> light-blue ramp, cel shade
// stripes, an "angel ring" sheen band and tapered side outlines.
import { P, xf, mirrorX, splinePath, sampleSpline, polyPath, clamp, lerp, TAU } from '../geom.js';
import { mix, rgba } from '../palettes.js';
import { clump, strand, hairGrad, hairAt, swaySpine } from './util.js';

// ------------------------------------------------------------------ helpers

/** wavy spine from root to tip: bend (perp. bow), amp/waves/phase (perp. sine growing with u) */
export function wavy(root, tip, { n = 9, bend = 0, amp = 0, waves = 1.5, phase = 0, curl = 0 } = {}) {
  const dx = tip[0] - root[0], dy = tip[1] - root[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    let off = bend * Math.sin(u * Math.PI) + amp * Math.pow(u, 0.8) * Math.sin(phase + u * waves * TAU);
    off += curl * u * u * u;
    out.push([root[0] + dx * u + nx * off, root[1] + dy * u + ny * off]);
  }
  return out;
}

const W = (q, G, d = 1) => G.W(q, d);
const mapW = (list, G, d = 1) => list.map((q) => G.W(q, d));

// ------------------------------------------------------------------ back hair (behind body)

/** back hair mass + outer wavy clumps. o.bottom = lowest y, o.spread = extra width at bottom, o.len ramp */
export function drawBackHair(pen, p, G, o = {}) {
  const pal = pen.pal;
  const bottom = o.bottom ?? 380, spread = o.spread ?? 1, len = o.len ?? 520;
  const t = p.t || 0;
  const sh = -Math.sin(G.turn) * 30; // back hair shifts opposite to the face turn
  const mass = [];
  // silhouette (right side, then mirrored)
  const R = [[0, -153], [62, -142], [104, -108], [118, -50], [128, 20], [142, 100], [158 + 10 * spread, 190], [170 + 26 * spread, 280], [176 + 40 * spread, bottom - 20], [150 + 30 * spread, bottom]];
  const Lm = R.slice(1).map((q) => [-q[0], q[1]]).reverse();
  for (const q of Lm) mass.push(q);
  for (const q of R) mass.push(q);
  const massPath = pen.curve(mass.map((q) => [q[0] + sh * clamp((q[1] + 100) / 300), q[1]]), { closed: true, id: 'bm', k: 1 });
  pen.wash(massPath, hairGrad(pen, -150, bottom, len), { pool: 0.6, poolColor: pal.hairShade });
  pen.fill(massPath, pal.hairInner, 0.55);
  // outer clumps, both sides (back to front)
  const defs = [
    // [root, tip, width, amp, phase, bend]
    [[104, -70], [176 + 40 * spread, bottom - 10], 52, 16, 0.3, 16],
    [[112, -30], [196 + 44 * spread, bottom - 60], 42, 18, 0.9, 20],
    [[96, -20], [148 + 34 * spread, bottom + 10], 46, 14, 0.0, 10],
    [[118, 10], [212 + 46 * spread, bottom - 120], 32, 15, 1.5, 22],
  ];
  let k = 0;
  for (const side of [-1, 1]) {
    for (const d of defs) {
      const ph = d[4] + (side < 0 ? 0.55 : 0);
      let sp = wavy([side * d[0][0], d[0][1]], [side * d[1][0], d[1][1]], { amp: d[3] * side, waves: 1.6, phase: ph, bend: d[5] * side * -1 });
      sp = swaySpine(sp, p, 31 + k, 0.8);
      sp = sp.map((q) => [q[0] + sh * clamp((q[1] + 100) / 300), q[1]]);
      const r = clump(pen, sp, [[0, d[2] * 0.7], [0.25, d[2]], [0.7, d[2] * 0.75], [0.92, d[2] * 0.35], [1, 0]],
        { id: 'bc' + k, len, shade: 0.45, shadeSide: side > 0 ? 'l' : 'r', lw: 1.6, shadeAlpha: 0.38 });
      strand(pen, r, 0.62, 0.2, 0.85, 1.0, pal.hairShade, 0.55);
      k++;
    }
  }
}

// ------------------------------------------------------------------ headdress frill (behind the cap)

const HD = { cx: 0, cy: -40, rx: 112, ry: 106 };

function ellPt(a, rx, ry, cx = HD.cx, cy = HD.cy) { return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; }

export function drawFrill(pen, p, G) {
  const pal = pen.pal;
  const a0 = Math.PI + 0.32, a1 = TAU - 0.32;
  const N = 11;
  const outer = [], inner = [];
  const steps = N * 8;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const a = lerp(a0, a1, u);
    const ph = (u * N) % 1;
    const bump = Math.sin(ph * Math.PI);
    const rr = 26 + 9 * Math.pow(bump, 0.6);
    outer.push(ellPt(a, HD.rx + rr, HD.ry + rr));
  }
  for (let i = steps; i >= 0; i -= 4) inner.push(ellPt(lerp(a0, a1, i / steps), HD.rx - 6, HD.ry - 6));
  const loop = outer.concat(inner).map((q) => W(q, G, 0.4));
  const fp = polyPath(loop);
  pen.fill(fp, pal.apron);
  pen.clip(fp, () => {
    // inner shade band + fold shading in each scallop
    const band = [];
    for (let i = 0; i <= 40; i++) band.push(ellPt(lerp(a0, a1, i / 40), HD.rx + 12, HD.ry + 12));
    const bp = new Path2D();
    const sb = band.map((q) => W(q, G, 0.4));
    bp.moveTo(sb[0][0], sb[0][1]);
    for (const q of sb) bp.lineTo(q[0], q[1]);
    pen.c.save();
    pen.c.strokeStyle = pal.apronShade; pen.c.lineWidth = 22; pen.c.stroke(bp); pen.c.restore();
    for (let s = 0; s < N; s++) {
      const am = lerp(a0, a1, (s + 0.72) / N);
      const q0 = W(ellPt(am, HD.rx, HD.ry), G, 0.4), q1 = W(ellPt(am, HD.rx + 34, HD.ry + 34), G, 0.4);
      const q2 = W(ellPt(am + 0.07, HD.rx + 34, HD.ry + 34), G, 0.4);
      pen.fill(polyPath([q0, q1, q2]), pal.apronShade2, 0.55);
    }
  });
  // outline of scallops + folds
  pen.line(outer.map((q) => W(q, G, 0.4)), [[0, 0.5], [0.1, 1.5], [0.9, 1.5], [1, 0.5]], pal.apronLine, { step: 2 });
  for (let s = 1; s < N; s++) {
    const a = lerp(a0, a1, s / N);
    const q0 = W(ellPt(a, HD.rx + 4, HD.ry + 4), G, 0.4), q1 = W(ellPt(a, HD.rx + 27, HD.ry + 27), G, 0.4);
    pen.line([q0, q1], [[0, 0], [0.6, 1.1], [1, 0.4]], pal.apronLine, { alpha: 0.8 });
  }
}

// ------------------------------------------------------------------ fins (whale ears)

const FIN = {
  shape: [P(-6, -17), P(20, -23), P(48, -18), P(72, -5), P(90, 12), P(99, 27, 1), P(80, 23), P(58, 21), P(34, 22), P(10, 22), P(-6, 17)],
  belly: [P(2, 11), P(28, 10), P(54, 11), P(78, 15), P(99, 27, 1), P(80, 23), P(58, 21), P(34, 22), P(10, 22), P(-6, 17)],
  bellyShade: [P(4, 17), P(30, 16.5), P(56, 17), P(82, 21), P(99, 27, 1), P(80, 24), P(58, 23), P(34, 24), P(10, 24), P(-6, 20)],
  sheen: [P(10, -15), P(34, -17), P(58, -9), P(40, -11), P(20, -11)],
  rib: [P(4, 10), P(28, 9), P(54, 10), P(78, 14), P(96, 25)],
};

export function drawFins(pen, p, G, o = {}) {
  const pal = pen.pal;
  const K = o.k ?? lerp(1, 1.12, G.s);
  const flap = Math.sin((p.t || 0) * 2.1) * 0.03 * (p.hairSway ?? 0);
  for (const side of [-1, 1]) {
    const root = W([side * 90, 0 + G.s * 4], G, -0.3);
    const far = Math.sign(G.turn) === side ? 1 - Math.abs(Math.sin(G.turn)) * 0.9 : 1;
    const tf = (list) => xf(list.map((q) => [q[0] * K * far, q[1] * K, q[2] || 0, q[3] ?? 1]), { rot: 0.3 + flap, tx: 0, ty: 0 })
      .map((q) => { const r = q.slice(); r[0] = root[0] + side * q[0]; r[1] = root[1] + q[1]; return r; });
    const id = side < 0 ? 'fnL' : 'fnR';
    const shape = pen.curve(tf(FIN.shape), { id, k: 0.5 });
    const top = tf([[0, -20]])[0], bot = tf([[0, 16]])[0];
    pen.wash(shape, pen.linear(top[0], top[1], bot[0], bot[1], [[0, pal.finLight], [0.45, pal.fin], [1, pal.finShade]]), { pool: 0.6 });
    const belly = pen.curve(tf(FIN.belly), { id: id + 'b', k: 0.5 });
    pen.clip(shape, () => {
      pen.fill(belly, pal.finBelly);
      pen.fill(pen.curve(tf(FIN.bellyShade), { id: id + 'bs', k: 0.5 }), pal.finBellyShade, 0.85);
      pen.fill(pen.curve(tf(FIN.sheen), { id: id + 'sh', k: 0.4 }), pal.finLight, 0.7);
    });
    const outl = tf(FIN.shape.concat([FIN.shape[0]]));
    pen.line(outl, [[0, 1.0], [0.4, 2.0], [0.55, 2.2], [0.9, 1.8], [1, 1.0]], pal.finLine, { id: id + 'o', k: 0.5 });
    pen.line(tf(FIN.rib), [[0, 0], [0.3, 1.1], [1, 0.3]], pal.finLine, { alpha: 0.6 });
  }
}

// ------------------------------------------------------------------ front hair

const BANGS = [
  // spine root -> tip (head-local), width, shade side, lineFrom
  { s: [[-40, -128], [-74, -100], [-94, -56], [-101, -8]], w: 40, sd: 'r', lf: 0.25 },
  { s: [[36, -128], [70, -102], [90, -58], [99, -6]], w: 40, sd: 'l', lf: 0.25 },
  { s: [[-26, -132], [-50, -104], [-66, -68], [-76, -30]], w: 52, sd: 'r', lf: 0.35 },
  { s: [[22, -133], [44, -106], [60, -70], [66, -22]], w: 52, sd: 'l', lf: 0.35 },
  { s: [[-22, -122], [-38, -90], [-52, -48], [-58, -10]], w: 16, sd: 'r', lf: 0.3 },
  { s: [[8, -135], [22, -104], [30, -66], [32, -28]], w: 48, sd: 'l', lf: 0.4 },
  { s: [[-14, -135], [-28, -104], [-38, -66], [-44, -24]], w: 48, sd: 'r', lf: 0.4 },
  { s: [[14, -122], [30, -88], [42, -48], [46, -8]], w: 16, sd: 'l', lf: 0.3 },
  { s: [[-4, -136], [-8, -100], [-8, -50], [-3, 6]], w: 40, sd: 'r', lf: 0.4 },
];
const BANG_W = (w) => [[0, w * 0.85], [0.35, w], [0.62, w * 0.72], [0.86, w * 0.32], [1, 0]];

const CAP_OUT = [P(-114, 6), P(-117, -50), P(-102, -102), P(-62, -138), P(0, -153), P(62, -140), P(102, -104), P(118, -50), P(115, 6)];
const CAP_IN = [P(96, -2), P(91, -52), P(60, -92), P(0, -104), P(-60, -92), P(-91, -52), P(-96, -2)];

export function capPath(pen, G) {
  return pen.curve(mapW(CAP_OUT.concat(CAP_IN), G, 0.5), { closed: true, id: 'cap', k: 0.6 });
}

/** angel-ring sheen: soft band + tapered light streaks along the hair flow, drawn into the current clip */
function sheenBand(pen, G, alpha = 1) {
  const pal = pen.pal;
  const a0 = Math.PI + 0.36, a1 = TAU - 0.36;
  const top = [], bot = [];
  const N = 36;
  const cy = -30;
  for (let i = 0; i <= N; i++) {
    const u = i / N, a = lerp(a0, a1, u);
    top.push(G.W([Math.cos(a) * 96, cy + Math.sin(a) * 80], 0.8));
    bot.push(G.W([Math.cos(a) * 92, cy + Math.sin(a) * 64], 0.8));
  }
  pen.fill(polyPath(top.concat(bot.reverse())), pal.hairSheen, 0.42 * alpha);
  // streaks: from slightly above the band down along the radial flow
  const n = 15;
  for (let k = 0; k < n; k++) {
    const u = 0.06 + (k / (n - 1)) * 0.88, a = lerp(a0, a1, u);
    const l = 0.75 + 0.25 * Math.sin(k * 2.7);
    const c0 = G.W([Math.cos(a) * 97, cy + Math.sin(a) * 82], 0.8);
    const c1 = G.W([Math.cos(a) * (96 - 10 * l), cy + Math.sin(a) * (80 - 24 * l)], 0.8);
    const w = 3.2 + 1.6 * Math.cos(k * 1.9);
    pen.line([c0, c1], [[0, w * 0.6], [0.3, w], [1, 0]], pal.hairSheenHi, { alpha: 0.55 * alpha });
  }
}

export function drawFrontLocks(pen, p, G, o = {}) {
  const len = o.len ?? 520, bottom = o.lockBottom ?? 330;
  const pal = pen.pal;
  const defs = [
    [[100, 10], [118, bottom], 30, 13, 0.3, -14],
  ];
  let k = 0;
  for (const side of [-1, 1]) {
    for (const d of defs) {
      const ph = d[4] + (side < 0 ? 0.5 : 0);
      let sp = wavy([side * d[0][0], d[0][1]], [side * d[1][0], d[1][1]], { amp: d[3] * side, waves: 1.5, phase: ph, bend: d[5] * side });
      sp = swaySpine(sp, p, 51 + k, 1).map((q) => G.W(q, -0.2));
      const r = clump(pen, sp, [[0, d[2] * 0.6], [0.2, d[2]], [0.75, d[2] * 0.7], [0.93, d[2] * 0.3], [1, 0]],
        { id: 'fl' + k, len, shade: 0.42, shadeSide: side > 0 ? 'l' : 'r', lw: 1.6, sheen: [0.25, 0.6, 0.18], sheenAlpha: 0.35 });
      strand(pen, r, 0.35, 0.3, 0.9, 0.9, pal.hairShade, 0.5);
      k++;
    }
  }
}

export function drawFrontHair(pen, p, G, o = {}) {
  const pal = pen.pal;
  const len = o.len ?? 520;
  // ---- cap
  const cap = capPath(pen, G);
  pen.wash(cap, hairGrad(pen, -155, 20, len), { pool: 0.6, poolColor: pal.hairShade });
  pen.clip(cap, () => sheenBand(pen, G, 1));
  pen.line(mapW(CAP_OUT, G, 0.5), [[0, 0.6], [0.12, 2.0], [0.5, 2.3], [0.88, 2.0], [1, 0.6]], pal.hairLine, { id: 'capo', k: 0.6 });
  // ---- sidelocks (in front of the fins, behind the bangs)
  const SL = [
    { root: [84, -88], tip: [112, o.sideBottom ?? 225], w: 30, amp: 7, ph: 0.2, bend: -8 },
    { root: [74, -70], tip: [92, (o.sideBottom ?? 225) - 95], w: 17, amp: 4, ph: 0.9, bend: -5 },
  ];
  let k = 0;
  for (const side of [-1, 1]) {
    for (const d of SL) {
      let sp = wavy([side * d.root[0], d.root[1]], [side * d.tip[0], d.tip[1]], { amp: d.amp * side, waves: 1.3, phase: d.ph + (side < 0 ? 0.3 : 0), bend: d.bend * side });
      sp = swaySpine(sp, p, 71 + k, 0.7).map((q) => G.W(q, 0.3));
      const r = clump(pen, sp, [[0, d.w * 0.7], [0.18, d.w], [0.6, d.w * 0.8], [0.9, d.w * 0.32], [1, 0]],
        { id: 'sl' + k, len, shade: 0.4, shadeSide: side > 0 ? 'r' : 'l', lw: 1.5, sheen: [0.12, 0.42, 0.22], sheenAlpha: 0.45 });
      if (d.w > 20) strand(pen, r, 0.5, 0.15, 0.85, 0.9, pal.hairShade, 0.55);
      k++;
    }
  }
  // ---- bangs
  BANGS.forEach((b, i) => {
    let sp = b.s.map((q) => [q[0], q[1]]);
    sp = swaySpine(sp, p, 91 + i, 0.35).map((q) => G.W(q, 0.9));
    const r = clump(pen, sp, BANG_W(b.w), { id: 'bg' + i, len, shade: 0.3, shadeSide: b.sd, lw: 1.45, lineFrom: b.lf });
    pen.clip(r.path, () => sheenBand(pen, G, 1));
    if (b.w > 30) strand(pen, r, b.sd === 'r' ? 0.32 : 0.68, 0.5, 0.9, 0.8, pal.hairShade, 0.45);
  });
}

export function drawAhoge(pen, p, G) {
  const pal = pen.pal;
  const t = p.t || 0;
  const bob = Math.sin(t * 2.4) * 3 * (p.hairSway ?? 0);
  let sp = [[-4, -144], [-5, -170], [-16, -194], [-38, -208 + bob], [-62, -205 + bob], [-77, -190 + bob], [-73, -173 + bob]];
  sp = sp.map((q) => G.W(q, 0.6));
  const r = clump(pen, sp, [[0, 15], [0.3, 12], [0.75, 6.5], [1, 0.8]], { id: 'ah', len: 300, lw: 1.5, shade: 0.4, shadeSide: 'r', sheen: [0.15, 0.5, 0.35], sheenAlpha: 0.5 });
  return r;
}

export function drawBand(pen, p, G) {
  const pal = pen.pal;
  const a0 = Math.PI + 0.5, a1 = TAU - 0.5;
  const out = [], inn = [];
  for (let i = 0; i <= 40; i++) {
    const a = lerp(a0, a1, i / 40);
    out.push(G.W(ellPt(a, HD.rx - 2, HD.ry - 2), 0.5));
    inn.push(G.W(ellPt(a, HD.rx - 10, HD.ry - 9.5), 0.5));
  }
  const bp = polyPath(out.concat(inn.slice().reverse()));
  pen.fill(bp, pal.apron);
  pen.clip(bp, () => {
    const sh = new Path2D();
    const s2 = inn.map((q) => q);
    sh.moveTo(s2[0][0], s2[0][1]);
    for (const q of s2) sh.lineTo(q[0], q[1]);
    pen.c.save(); pen.c.strokeStyle = pal.apronShade; pen.c.lineWidth = 5; pen.c.stroke(sh); pen.c.restore();
  });
  pen.line(out, [[0, 0.4], [0.1, 1.2], [0.9, 1.2], [1, 0.4]], pal.apronLine, { step: 2 });
  pen.line(inn, [[0, 0.4], [0.1, 1.3], [0.9, 1.3], [1, 0.4]], pal.apronLine, { step: 2 });
}

/** light-blue bow (headdress, or reused elsewhere): centre (x,y), scale k, rotation rot */
export function drawBow(pen, x, y, k = 1, rot = 0, cols = null, id = 'bow') {
  const pal = pen.pal;
  const C = cols || { fill: pal.ribbon, shade: pal.ribbonShade, light: pal.ribbonLight, line: pal.ribbonLine };
  const T = (list) => xf(list.map((q) => [q[0] * k, q[1] * k, q[2] || 0, q[3] ?? 1]), { rot }).map((q) => { const r = q.slice(); r[0] += x; r[1] += y; return r; });
  const tails = [
    [P(-2, 2), P(-9, 12), P(-14, 24, 1), P(-8, 22), P(-4, 26, 1), P(2, 6)],
    [P(2, 2), P(8, 12), P(12, 25, 1), P(6, 23), P(1, 27, 1), P(-2, 6)],
  ];
  for (let i = 0; i < 2; i++) {
    const tp = pen.curve(T(tails[i]), { id: id + 't' + i, k: 0.3, tension: 0.8 });
    pen.fill(tp, C.shade);
    pen.line(T(tails[i].concat([tails[i][0]])), 1.1, C.line, { start: 0.6, end: 0.6, attack: 0.1, release: 0.1, tension: 0.8 });
  }
  const loops = [
    [P(0, -1, 1), P(-8, -10), P(-20, -14), P(-27, -6), P(-25, 6), P(-14, 7), P(0, 2, 1)],
    [P(0, -1, 1), P(8, -10), P(20, -14), P(27, -6), P(25, 6), P(14, 7), P(0, 2, 1)],
  ];
  for (let i = 0; i < 2; i++) {
    const lp = pen.curve(T(loops[i]), { id: id + 'l' + i, k: 0.3 });
    pen.fill(lp, C.fill);
    pen.clip(lp, () => {
      const sd = i ? 1 : -1;
      pen.fill(pen.curve(T([P(0, 0), P(sd * 12, 2), P(sd * 24, 4), P(sd * 26, 8), P(sd * 10, 9)]), { tension: 0.8 }), C.shade, 0.85);
      pen.fill(pen.curve(T([P(sd * 6, -6), P(sd * 16, -11), P(sd * 22, -9), P(sd * 14, -7)]), { tension: 0.8 }), C.light, 0.85);
    });
    pen.line(T(loops[i].concat([loops[i][0]])), [[0, 0.8], [0.5, 1.4], [1, 0.8]], C.line, { tension: 1 });
    // fold line
    pen.line(T([P(i ? 4 : -4, 0), P(i ? 14 : -14, 1), P(i ? 21 : -21, -1)]), [[0, 0], [0.5, 0.9], [1, 0]], C.line, { alpha: 0.6 });
  }
  const knot = pen.curve(T([P(-4.5, -5), P(4.5, -5), P(5, 4), P(-5, 4)]), { tension: 0.7 });
  pen.fill(knot, C.fill);
  pen.fill(knot, C.shade, 0.35);
  pen.c.save(); pen.c.strokeStyle = C.line; pen.c.lineWidth = 1.2; pen.c.stroke(knot); pen.c.restore();
}

export function drawHeadBow(pen, p, G) {
  const q = G.W([98, -86], 0.2);
  drawBow(pen, q[0], q[1], 0.95, 0.55, null, 'hbow');
}

export { hairAt };
