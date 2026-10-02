// Procedural point cloud for the Silhouette (her): an elegant female head + neck + shoulders.
//
// Construction (all deterministic, seeded):
//  * The face is driven by hand-authored SIDE PROFILE curves (forehead, nose, lips, chin) that are
//    "elliptically extruded" sideways: a 2D signed-distance grid of each profile gives depth inside
//    the profile, and the lateral half-width follows an ellipse -> rounded, readable features.
//  * Skull, cheekbones, jaw, eye sockets/eyeballs, neck and a 3/4-turned torso are smooth-unioned
//    implicit primitives. Surface points are rejection-sampled in a thin shell and projected.
//  * Long hair: ~1800 strands grown from scalp roots, draped over the skull (collision with the
//    implicit surface) and falling down the back under gravity.
//  * Explicit features for readability: lash line + lashes, lids, iris/sclera, catch-light, brows.
//
// Local frame: +x = face forward (toward the screen), +y = up, +z = toward the camera in profile.
// Units: head height (chin to crown) ~ 1.0.
import { rng } from '../core/rng.js';

// ------------------------------------------------------------------ 2D profile SDF grids
function catmullRom(pts, perSeg = 10, closed = true) {
  const out = [];
  const n = pts.length;
  const P = (i) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

function polySDF(poly, x, y) {
  let d = Infinity, inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const dx = wx - ex * t, dy = wy - ey * t;
    d = Math.min(d, dx * dx + dy * dy);
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside ? -Math.sqrt(d) : Math.sqrt(d);
}

class Grid2D {
  constructor(ctrl, res = 0.004, margin = 0.1) {
    const poly = catmullRom(ctrl, 12, true);
    this.poly = poly;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    this.x0 = x0 - margin; this.y0 = y0 - margin;
    this.nx = Math.ceil((x1 - x0 + 2 * margin) / res) + 1;
    this.ny = Math.ceil((y1 - y0 + 2 * margin) / res) + 1;
    this.res = res;
    this.data = new Float32Array(this.nx * this.ny);
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) this.data[j * this.nx + i] = polySDF(poly, this.x0 + i * res, this.y0 + j * res);
    this.x1 = this.x0 + (this.nx - 1) * res; this.y1 = this.y0 + (this.ny - 1) * res;
  }
  sample(x, y) {
    const fx = (x - this.x0) / this.res, fy = (y - this.y0) / this.res;
    if (fx < 0 || fy < 0 || fx >= this.nx - 1 || fy >= this.ny - 1) {
      // outside the grid: distance to the grid box + the margin value (conservative, positive)
      const dx = Math.max(this.x0 - x, 0, x - this.x1), dy = Math.max(this.y0 - y, 0, y - this.y1);
      return Math.hypot(dx, dy) + 0.08;
    }
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, n = this.nx, D = this.data;
    const a = D[j * n + i], b = D[j * n + i + 1], c = D[(j + 1) * n + i], d = D[(j + 1) * n + i + 1];
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  }
}

// ------------------------------------------------------------------ profiles (side view: x fwd, y up)
// Base face mass (no nose / lips): forehead -> brow -> midface -> chin -> under-chin, closed inside.
const FACE = [
  [0.170, 0.500], [0.262, 0.420], [0.330, 0.320], [0.360, 0.215], [0.368, 0.140], [0.356, 0.085],
  [0.336, 0.030], [0.326, -0.030], [0.332, -0.095], [0.346, -0.150], [0.356, -0.190], [0.354, -0.245],
  [0.346, -0.290], [0.333, -0.322], [0.346, -0.372], [0.348, -0.418], [0.318, -0.462], [0.250, -0.492],
  [0.150, -0.503], [0.060, -0.498], [-0.040, -0.470], [-0.200, -0.300], [-0.240, 0.050], [-0.120, 0.400],
];
// Nose: nasion -> straight elegant dorsum -> slightly upturned tip -> columella -> subnasale
const NOSE = [
  [0.338, 0.078], [0.356, 0.050], [0.380, 0.004], [0.404, -0.040], [0.428, -0.080], [0.447, -0.106],
  [0.456, -0.122], [0.452, -0.138], [0.436, -0.150], [0.410, -0.156], [0.384, -0.160], [0.336, -0.158],
  [0.312, -0.060], [0.316, 0.050],
];
// Lips: upper (philtrum, vermilion) and lower, with a slight pout
const LIP_UP = [
  [0.338, -0.163], [0.368, -0.166], [0.373, -0.184], [0.386, -0.203], [0.395, -0.216], [0.390, -0.229],
  [0.371, -0.240], [0.338, -0.238],
];
const LIP_LO = [
  [0.336, -0.247], [0.369, -0.246], [0.385, -0.256], [0.389, -0.271], [0.380, -0.290], [0.360, -0.306],
  [0.330, -0.300],
];

// lateral half-width (w0) and depth (D) of the face ellipse vs height
const FACE_W = [[-0.52, 0.12], [-0.46, 0.17], [-0.38, 0.21], [-0.30, 0.25], [-0.18, 0.30], [-0.05, 0.33], [0.10, 0.34], [0.28, 0.33], [0.42, 0.28], [0.52, 0.22]];
const FACE_D = [[-0.52, 0.20], [-0.40, 0.24], [-0.25, 0.26], [0.0, 0.25], [0.2, 0.28], [0.5, 0.30]];
function interp(tab, y) {
  if (y <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [a, va] = tab[i - 1], [b, vb] = tab[i]; return va + (vb - va) * (y - a) / (b - a); }
  return tab[tab.length - 1][1];
}

// ------------------------------------------------------------------ implicit primitives
function sdEllipsoid(x, y, z, cx, cy, cz, rx, ry, rz) {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz;
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = px / rx, qy = py / ry, qz = pz / rz;
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
}
function sdCapsule(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }
function ssub(d, s, k) { // smooth subtraction of s from d
  const h = Math.max(0, Math.min(1, 0.5 - 0.5 * (d + s) / k));
  return d + (-s - d) * h + k * h * (1 - h);
}

export const EYE = { cx: 0.262, cy: 0.014, cz: 0.118, r: 0.05 };
const HINGE = [-0.03, -0.06];
const TORSO_YAW = 0.22; // body turned toward the camera (3/4) while the face stays in profile

export function buildHeadSDF() {
  const gFace = new Grid2D(FACE, 0.004);
  const gNose = new Grid2D(NOSE, 0.002, 0.06);
  const gLipU = new Grid2D(LIP_UP, 0.0015, 0.05);
  const gLipL = new Grid2D(LIP_LO, 0.0015, 0.05);
  const cy = Math.cos(TORSO_YAW), sy = Math.sin(TORSO_YAW);

  function ellExtrude(d2, z, w0, D) {
    const qx = z / w0, qy = Math.max(D + d2, 0) / D; // d2 negative inside -> depth = -d2
    return (Math.hypot(qx, qy) - 1) * Math.min(w0, D);
  }

  function F(x, y, z) {
    const az = Math.abs(z);
    // skull
    let d = sdEllipsoid(x, y, z, -0.075, 0.095, 0, 0.47, 0.435, 0.352);
    // face mass (profile extrusion)
    const w0 = interp(FACE_W, y), D = interp(FACE_D, y);
    const dFace = ellExtrude(gFace.sample(x, y), z, w0, D);
    d = smin(d, dFace, 0.12);
    // cheekbones + jaw
    d = smin(d, sdEllipsoid(x, y, az, 0.165, -0.04, 0.225, 0.13, 0.09, 0.09), 0.1);
    d = smin(d, sdCapsule(x, y, az, 0.25, -0.41, 0.02, -0.06, -0.25, 0.225, 0.065), 0.14);
    // eye sockets (soft recess under the brow) + eyeballs
    d = ssub(d, sdEllipsoid(x, y, az, 0.322, 0.014, EYE.cz, 0.04, 0.03, 0.05), 0.03);
    d = smin(d, Math.hypot(x - EYE.cx, y - EYE.cy, az - EYE.cz) - EYE.r, 0.02);
    // nose + alae
    const dn = ellExtrude(gNose.sample(x, y), z, 0.072, 0.075);
    d = smin(d, dn, 0.022);
    d = smin(d, sdEllipsoid(x, y, az, 0.398, -0.136, 0.046, 0.042, 0.03, 0.032), 0.018);
    // lips, wrapped around the face curvature
    const rec = D * (1 - Math.sqrt(Math.max(0, 1 - (z * z) / (w0 * w0))));
    const xw = x + rec;
    const dl = Math.min(ellExtrude(gLipU.sample(xw, y), z, 0.088, 0.05), ellExtrude(gLipL.sample(xw, y), z, 0.082, 0.05));
    d = smin(d, dl, 0.03);
    // neck (slender, tilted slightly forward)
    d = smin(d, sdCapsule(x, y, z * 0.95, 0.035, -0.36, 0, -0.075, -0.9, 0, 0.168), 0.07);
    // torso turned 3/4: trapezius slopes, shoulder line + deltoid caps, upper chest
    const tx = -0.08;
    const lx = (x - tx) * cy - z * sy, lz = (x - tx) * sy + z * cy;
    const alz = Math.abs(lz);
    let dT = sdCapsule(lx, y, alz, -0.02, -0.74, 0.11, -0.02, -0.99, 0.62, 0.085);         // trapezius
    dT = smin(dT, sdCapsule(lx, y, alz, 0.0, -1.04, 0.0, 0.0, -1.04, 0.6, 0.13), 0.12);     // shoulder line
    dT = smin(dT, sdEllipsoid(lx, y, lz, -0.01, -1.36, 0, 0.22, 0.42, 0.6), 0.16);          // upper chest
    d = smin(d, dT, 0.13);
    return d;
  }

  function grad(x, y, z, h = 0.0015) {
    const gx = F(x + h, y, z) - F(x - h, y, z);
    const gy = F(x, y + h, z) - F(x, y - h, z);
    const gz = F(x, y, z + h) - F(x, y, z - h);
    const l = Math.hypot(gx, gy, gz) || 1;
    return [gx / l, gy / l, gz / l, l / (2 * h)];
  }

  return { F, grad, grids: { gFace, gNose, gLipU, gLipL } };
}

// hair mask on the head surface: 1 where hair grows (scalp), 0 on the face
function hairMask(x, y, z) {
  const dx = x + 0.05, dy = y - 0.05, dz = z;
  const l = Math.hypot(dx, dy, dz) || 1;
  const nx = dx / l, ny = dy / l, nz = dz / l;
  // hairline: forward reach grows with height; temples recede slightly
  const line = 0.2 + 0.6 * Math.max(ny, 0) - 0.1 * Math.abs(nz) * (ny < 0.3 ? 1 : 0);
  let m = Math.max(0, Math.min(1, (line - nx) / 0.07 + 0.5));
  // below ear level the long hair hangs over the ear, the back of the jaw and the nape
  const behindJaw = Math.max(0, Math.min(1, (-0.02 - x) / 0.08 + 0.5 + (y + 0.25) * 0.4));
  const lowCut = Math.max(0, Math.min(1, (y + 0.52) / 0.1));
  if (y < -0.12) m = Math.min(1, Math.max(m * Math.max(0, Math.min(1, (y + 0.3) / 0.15)), behindJaw)) * lowCut;
  return m;
}

/**
 * Build the point cloud. Returns typed arrays:
 *  position (3n), normal (3n), data (4n: kind, mouthWeight, strandV, lidGap), rand (4n), core (n)
 * kinds: 0 skin, 1 hair, 2 interior, 3 iris, 4 lash/lid line, 5 catch-light, 6 brow, 7 scalp, 8 sclera
 */
export function buildSilhouettePoints({ seed = 'her', skin = 48000, hairStrands = 1700, hairPerStrand = 8, interior = 3500 } = {}) {
  const R = rng(seed);
  const { F, grad } = buildHeadSDF();
  const pos = [], nrm = [], dat = [], rnd = [], core = [];
  const push = (p, n, kind, mouth = 0, v = 0, lid = 0, c = 1) => {
    pos.push(p[0], p[1], p[2]); nrm.push(n[0], n[1], n[2]);
    dat.push(kind, mouth, v, lid); rnd.push(R.next(), R.next(), R.next(), R.next()); core.push(c);
  };

  const inEyeOpening = (x, y, z) => {
    const ez = z >= 0 ? EYE.cz : -EYE.cz;
    const dx = x - EYE.cx, dy = y - EYE.cy, dz = (z - ez) * Math.sign(z || 1);
    const l = Math.hypot(dx, dy, dz);
    if (l > EYE.r + 0.014) return false;
    const th = Math.atan2(dz, dx) * 180 / Math.PI, ph = Math.asin(dy / (l || 1)) * 180 / Math.PI;
    if (th < -42 || th > 78) return false;
    const s = (th + 42) / 120;
    return ph < 20 * Math.pow(Math.sin(Math.PI * s), 0.8) + 3 && ph > -13 * Math.pow(Math.sin(Math.PI * s), 0.9) - 3;
  };

  const mouthWeight = (x, y) => {
    if (y > -0.236) return (x > 0.33 && y > -0.236 && y < -0.165) ? -0.12 : 0;
    const below = Math.min(1, (-0.236 - y) / 0.02);
    const front = Math.max(0, Math.min(1, (x + 0.1) / 0.2));
    const neckFade = Math.max(0, Math.min(1, (y + 0.64) / 0.16));
    return below * front * neckFade;
  };

  // ---------------- skin surface: coarse grid of near-surface cells, then shell rejection + projection
  const box = [-0.62, 0.58, -1.9, 0.6, -0.95, 0.95];
  const cell = 0.025;
  const gnx = Math.ceil((box[1] - box[0]) / cell), gny = Math.ceil((box[3] - box[2]) / cell), gnz = Math.ceil((box[5] - box[4]) / cell);
  const near = [];
  const cellWeight = [];
  for (let k = 0; k < gnz; k++) for (let j = 0; j < gny; j++) for (let i = 0; i < gnx; i++) {
    const x = box[0] + (i + 0.5) * cell, y = box[2] + (j + 0.5) * cell, z = box[4] + (k + 0.5) * cell;
    const f = F(x, y, z);
    if (Math.abs(f) > cell * 0.95) continue;
    // region weights: face dense, scalp sparse (hair covers it), neck medium, torso fading out
    let w = 1;
    if (y < -1.05) w = 0.3 * Math.max(0, 1 - (-1.05 - y) / 0.5);
    else if (y < -0.62) w = 0.34;
    else if (x < 0.05 && y < -0.2) w = 0.55;
    if (hairMask(x, y, z) > 0.5) w *= 0.15;
    if (w <= 0) continue;
    near.push(x - cell / 2, y - cell / 2, z - cell / 2);
    cellWeight.push(w);
  }
  // cumulative distribution over cells
  const cdf = new Float64Array(cellWeight.length);
  let acc = 0;
  for (let i = 0; i < cellWeight.length; i++) { acc += cellWeight[i]; cdf[i] = acc; }
  const pickCell = () => {
    const r = R.next() * acc;
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m + 1; else hi = m; }
    return lo;
  };
  const shell = 0.006;
  const scalpRoots = [];
  // 1) white-noise candidates on the surface (shell rejection + projection)
  const cand = [];
  let tries = 0;
  const nCand = Math.round(skin * 2.6);
  while (cand.length < nCand * 7 && tries < nCand * 40) {
    tries++;
    const ci = pickCell();
    const x = near[ci * 3] + R.next() * cell, y = near[ci * 3 + 1] + R.next() * cell, z = near[ci * 3 + 2] + R.next() * cell;
    const f0 = F(x, y, z);
    if (Math.abs(f0) > shell * 2.5) continue;
    const g = grad(x, y, z);
    const dist = f0 / g[3];
    if (Math.abs(dist) > shell) continue;
    let px = x - g[0] * dist, py = y - g[1] * dist, pz = z - g[2] * dist;
    const g2 = grad(px, py, pz);
    const f2 = F(px, py, pz) / g2[3];
    px -= g2[0] * f2; py -= g2[1] * f2; pz -= g2[2] * f2;
    if (inEyeOpening(px, py, pz)) continue;
    cand.push(px, py, pz, g2[0], g2[1], g2[2], hairMask(px, py, pz));
  }
  // 2) greedy Poisson-disk thinning (spatial hash): even, elegant distribution instead of white noise
  const rFace = 0.0052, hashCell = 0.012;
  const hgrid = new Map();
  const hkey = (i, j, k) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  const tooClose = (x, y, z, r) => {
    const i0 = Math.floor(x / hashCell), j0 = Math.floor(y / hashCell), k0 = Math.floor(z / hashCell);
    const r2 = r * r;
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (let k = k0 - 1; k <= k0 + 1; k++) {
      const bkt = hgrid.get(hkey(i, j, k));
      if (!bkt) continue;
      for (let q = 0; q < bkt.length; q += 3) { const ex = bkt[q] - x, ey = bkt[q + 1] - y, ez = bkt[q + 2] - z; if (ex * ex + ey * ey + ez * ez < r2) return true; }
    }
    return false;
  };
  let got = 0;
  for (let c = 0; c < cand.length && got < skin; c += 7) {
    const px = cand[c], py = cand[c + 1], pz = cand[c + 2], hm = cand[c + 6];
    const faceZone = (py > -0.6 && px > -0.05) ? 1 : 0;
    const rmin = rFace * (1 + 0.3 * Math.max(1 - faceZone, Math.min(1, Math.max(0, (hm - 0.2) / 0.6))));
    if (tooClose(px, py, pz, rmin)) continue;
    const kk = hkey(Math.floor(px / hashCell), Math.floor(py / hashCell), Math.floor(pz / hashCell));
    let bkt = hgrid.get(kk); if (!bkt) { bkt = []; hgrid.set(kk, bkt); } bkt.push(px, py, pz);
    const kind = hm > 0.5 ? 7 : 0;
    push([px, py, pz], [cand[c + 3], cand[c + 4], cand[c + 5]], kind, mouthWeight(px, py), 0, hm);
    if (hm > 0.5 && (py > -0.12 || (px < -0.08 && py > -0.36))) scalpRoots.push([px, py, pz, cand[c + 3], cand[c + 4], cand[c + 5]]);
    got++;
  }

  // ---------------- eyes (both), lids, lashes, iris, catch-light
  for (const side of [1, -1]) {
    const ez = EYE.cz * side;
    const P = (thDeg, phDeg, r = EYE.r) => {
      const th = thDeg * Math.PI / 180, ph = phDeg * Math.PI / 180;
      return [EYE.cx + Math.cos(ph) * Math.cos(th) * r, EYE.cy + Math.sin(ph) * r, ez + side * Math.cos(ph) * Math.sin(th) * r];
    };
    const Nn = (p) => { const l = Math.hypot(p[0] - EYE.cx, p[1] - EYE.cy, p[2] - ez); return [(p[0] - EYE.cx) / l, (p[1] - EYE.cy) / l, (p[2] - ez) / l]; };
    const up = (s) => 20 * Math.pow(Math.sin(Math.PI * s), 0.8) * (1 + 0.12 * Math.sin(Math.PI * s * 2 + 0.6));
    const lo = (s) => -13 * Math.pow(Math.sin(Math.PI * s), 0.9);
    for (let i = 0; i < 120; i++) { // upper lash line, lid gap stored for eyeClosed
      const s = R.next(), th = -42 + 120 * s;
      const p = P(th, up(s) + R.range(-0.6, 0.6), EYE.r + 0.004);
      push(p, Nn(p), 4, 0, 0, (up(s) - lo(s)) * Math.PI / 180);
    }
    for (let i = 0; i < 70; i++) { // lower lid
      const s = R.next(), th = -42 + 120 * s;
      const p = P(th, lo(s) - R.range(0, 1.2), EYE.r + 0.003);
      push(p, Nn(p), 4, 0, 0, 0);
    }
    for (let k = 0; k < 14; k++) { // lashes: outer half of the upper lid, curling up and out
      const s = 0.5 + 0.5 * (k / 13) + R.range(-0.01, 0.01);
      const th = -42 + 120 * s;
      const base = P(th, up(s), EYE.r + 0.004);
      const n = Nn(base);
      const len = 0.022 + 0.022 * Math.sin(Math.PI * Math.min(1, s * 1.1)) + R.range(-0.004, 0.004);
      for (let j = 1; j <= 6; j++) {
        const v = j / 6;
        const p = [base[0] + n[0] * len * v, base[1] + n[1] * len * v + 0.6 * len * v * v, base[2] + n[2] * len * v];
        push(p, n, 4, 0, v, (up(s) - lo(s)) * Math.PI / 180 * (1 - 0.3 * v));
      }
    }
    // eyeball within the opening: iris (dark warm) around the gaze, sclera (dim) around it
    for (let i = 0; i < 900; i++) {
      const s = R.next(), th = -42 + 120 * s;
      const ph = lo(s) + (up(s) - lo(s)) * R.next();
      const gth = 2, gph = 2; // gaze ~ toward the screen
      const ang = Math.hypot(th - gth, ph - gph);
      const p = P(th, ph, EYE.r + 0.001);
      if (ang < 24) push(p, Nn(p), 3, 0, ang / 24, 0);
      else if (R.next() < 0.4) push(p, Nn(p), 8, 0, 0, 0);
    }
    for (let i = 0; i < 4; i++) { // catch-light: reflection of the screen, upper front of the iris
      const p = P(8 + R.range(-1.2, 1.2), 9 + R.range(-1, 1), EYE.r + 0.003);
      push(p, Nn(p), 5, 0, 0, 0);
    }
  }

  // ---------------- brows: a fine arch projected onto the skin
  for (const side of [1, -1]) {
    for (let i = 0; i < 110; i++) {
      const s = R.next();
      let x = 0.334 - 0.105 * s - 0.02 * s * s, y = 0.074 + 0.05 * Math.sin(Math.PI * Math.min(1, s * 1.25)) - 0.012 * s, z = side * (0.035 + 0.19 * s);
      x += 0.03; // start outside, then project inward
      for (let k = 0; k < 6; k++) { const g = grad(x, y, z); const f = F(x, y, z) / g[3]; x -= g[0] * f; y -= g[1] * f; z -= g[2] * f; }
      const g = grad(x, y, z);
      const off = 0.003 + R.range(0, 0.003);
      y += R.range(-0.004, 0.004) * (1 - s * 0.5);
      push([x + g[0] * off, y + g[1] * off, z + g[2] * off], [g[0], g[1], g[2]], 6, 0, s, 0);
    }
  }

  // ---------------- hair strands
  const strandRoots = [];
  // hairline-biased roots: half from the scalp sample, half pushed toward the hairline for a crisp edge
  const nearLine = scalpRoots.filter((r) => hairMask(r[0] + r[3] * 0.03, r[1] + r[4] * 0.03, r[2] + r[5] * 0.03) < 0.9 || hairMask(r[0] + 0.03, r[1], r[2]) < 0.5);
  for (let i = 0; i < hairStrands && scalpRoots.length; i++) {
    const pool = (nearLine.length && R.next() < 0.12) ? nearLine : scalpRoots;
    strandRoots.push(pool[Math.floor(R.next() * pool.length)]);
  }
  const strands = [];
  for (let si = 0; si < strandRoots.length; si++) {
    const [rx, ry, rz, nx, ny, nz] = strandRoots[si];
    const r = R.fork(si);
    let offset = 0.004 + r.next() * 0.014 + Math.max(0, -rx - 0.05) * 0.06; // thin at the hairline, fuller at the back
    let p = [rx + nx * offset, ry + ny * offset, rz + nz * offset];
    // initial direction: top strands comb back, side strands fall down over the ear; tangent to the scalp
    const side = Math.min(1, Math.abs(nz) * 1.2) * (ny < 0.55 ? 1 : 0.4);
    let d = [-1 + 0.65 * side + r.range(-0.15, 0.15), -0.3 - 0.7 * side + r.range(-0.12, 0.1), Math.sign(rz) * (0.25 - 0.05 * side) + r.range(-0.1, 0.1)];
    let dn = d[0] * nx + d[1] * ny + d[2] * nz;
    d = [d[0] - nx * dn, d[1] - ny * dn, d[2] - nz * dn];
    let l = Math.hypot(...d); d = d.map((v) => v / l);
    const tipY = -0.95 - r.next() * 0.5 - (Math.abs(rz) < 0.2 ? 0.1 : 0);
    const ds = 0.028;
    const pts = [p.slice()];
    const wavePh = r.range(0, Math.PI * 2), waveAmp = r.range(0.004, 0.014);
    for (let k = 0; k < 140; k++) {
      const gw = Math.min(0.55, 0.04 + k * 0.022);
      d = [d[0] - 0.012, d[1] - gw * 0.35, d[2] + (p[2] > 0 ? 0.006 : -0.006)];
      l = Math.hypot(...d); d = d.map((v) => v / l);
      p = [p[0] + d[0] * ds, p[1] + d[1] * ds, p[2] + d[2] * ds];
      const f = F(p[0], p[1], p[2]);
      const want = offset * (k < 30 ? 1 : 0.7) + 0.006;
      if (k < 26 && p[1] > -0.25 && f > want + 0.012) { // stay near the scalp until past the crown
        const g = grad(p[0], p[1], p[2]);
        const pull = (f - want - 0.012) / g[3] * 0.35;
        p = [p[0] - g[0] * pull, p[1] - g[1] * pull, p[2] - g[2] * pull];
      }
      if (f < want) {
        const g = grad(p[0], p[1], p[2]);
        const push_ = (want - f) / g[3];
        p = [p[0] + g[0] * push_, p[1] + g[1] * push_, p[2] + g[2] * push_];
        dn = d[0] * g[0] + d[1] * g[1] + d[2] * g[2];
        if (dn < 0) { d = [d[0] - g[0] * dn, d[1] - g[1] * dn, d[2] - g[2] * dn]; l = Math.hypot(...d); d = d.map((v) => v / l); }
      }
      pts.push([p[0], p[1] + Math.sin(k * 0.22 + wavePh) * waveAmp * Math.min(1, k / 30), p[2] + Math.cos(k * 0.17 + wavePh) * waveAmp * Math.min(1, k / 30)]);
      if (p[1] < tipY) break;
    }
    strands.push(pts);
  }
  strands.forEach((pts, si) => {
    const n = pts.length - 1;
    if (n < 2) return;
    // cumulative arc length for uniform spacing
    const cum = [0];
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]));
    const L = cum[n];
    const strandRand = R.next();
    const count = Math.max(6, Math.round(hairPerStrand * Math.min(1.2, L / 1.6)));
    let seg = 0;
    for (let j = 0; j < count; j++) {
      const v = (j + 0.5 + R.range(-0.35, 0.35)) / count;
      const sLen = v * L;
      while (seg < n - 1 && cum[seg + 1] < sLen) seg++;
      const u = (sLen - cum[seg]) / Math.max(1e-6, cum[seg + 1] - cum[seg]);
      const a = pts[seg], b = pts[seg + 1];
      const p = [a[0] + (b[0] - a[0]) * u + R.range(-0.0015, 0.0015), a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u + R.range(-0.0015, 0.0015)];
      // normal: away from the body axis (head center above the neck, spine line below)
      const ax = p[1] > -0.2 ? -0.06 : -0.08 - 0.05 * (p[1] + 0.2), ay = p[1] > -0.2 ? 0.06 : p[1];
      let nn = [p[0] - ax, p[1] - ay, p[2]];
      const ll = Math.hypot(...nn) || 1; nn = nn.map((x) => x / ll);
      push(p, nn, 1, 0, v, strandRand);
    }
  });

  // ---------------- interior volume (for innerGlow), depth-weighted
  let ig = 0, itries = 0;
  while (ig < interior && itries < interior * 200) {
    itries++;
    const x = R.range(-0.55, 0.5), y = R.range(-1.7, 0.55), z = R.range(-0.85, 0.85);
    const f = F(x, y, z);
    if (f > -0.015) continue;
    if (y < -1.15 && R.next() > Math.max(0, 1 - (-1.15 - y) / 0.6)) continue;
    const c = Math.min(1, -f / 0.18); // 1 deep inside
    push([x, y, z], [0, 0, 1], 2, mouthWeight(x, y) * 0.8, 0, 0, 1 - c);
    ig++;
  }

  return {
    count: pos.length / 3,
    position: Float32Array.from(pos), normal: Float32Array.from(nrm), data: Float32Array.from(dat),
    rand: Float32Array.from(rnd), core: Float32Array.from(core),
    strands, hinge: HINGE, eye: EYE,
    stats: { skinTries: tries, skin: got, strands: strands.length, interior: ig },
  };
}
