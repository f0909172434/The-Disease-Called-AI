// Deterministic randomness. NEVER use Math.random() anywhere in the engine.
//
//   import { rng, hash01, noise1 } from './rng.js';
//   const r = rng('S04/pills');      // seeded generator (string or int seed)
//   r.next() r.range(a,b) r.int(n) r.pick(arr) r.gauss() r.sign() r.chance(p) r.fork('sub')
//   hash01(i, j, ...)                // stateless: same ints -> same float in [0,1)
//   noise1(x, seed)                  // smooth 1D value noise in [-1,1]
//   fbm1(x, seed, oct)               // fractal 1D noise in ~[-1,1]
//   noise2(x, y, seed)               // smooth 2D value noise in [-1,1]

/** FNV-1a 32-bit hash of a string -> uint32 */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function seedToInt(seed) {
  if (typeof seed === 'number') return (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  return hashString(String(seed));
}

/** integer hash (murmur3 finalizer-style mixing of any number of ints) -> uint32 */
export function hash(...vals) {
  let h = 0x2545f491;
  for (let i = 0; i < vals.length; i++) {
    let k = (vals[i] | 0) ^ Math.imul(i + 1, 0x27d4eb2d);
    k = Math.imul(k ^ (k >>> 16), 0x85ebca6b);
    k = Math.imul(k ^ (k >>> 13), 0xc2b2ae35);
    k ^= k >>> 16;
    h = Math.imul(h ^ k, 0x9e3779b1);
    h ^= h >>> 15;
  }
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** stateless hash of ints -> float in [0,1) */
export function hash01(...vals) {
  return hash(...vals) / 4294967296;
}

/** mulberry32 PRNG */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) {
    this.seed = seedToInt(seed);
    this._next = mulberry32(this.seed);
    this._spare = null;
  }
  next() { return this._next(); }
  range(a = 0, b = 1) { return a + (b - a) * this._next(); }
  int(a, b) { // int(n) -> [0,n) ; int(a,b) -> [a,b]
    if (b === undefined) return Math.floor(this._next() * a);
    return a + Math.floor(this._next() * (b - a + 1));
  }
  pick(arr) { return arr[Math.floor(this._next() * arr.length)]; }
  sign() { return this._next() < 0.5 ? -1 : 1; }
  chance(p) { return this._next() < p; }
  gauss(mean = 0, sd = 1) {
    if (this._spare !== null) { const s = this._spare; this._spare = null; return mean + sd * s; }
    let u = 0, v = 0, s = 0;
    do { u = this._next() * 2 - 1; v = this._next() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const m = Math.sqrt(-2 * Math.log(s) / s);
    this._spare = v * m;
    return mean + sd * u * m;
  }
  /** point uniformly inside unit sphere */
  inSphere() {
    let x, y, z;
    do { x = this.range(-1, 1); y = this.range(-1, 1); z = this.range(-1, 1); } while (x * x + y * y + z * z > 1);
    return [x, y, z];
  }
  onSphere() {
    const z = this.range(-1, 1), a = this.range(0, Math.PI * 2), r = Math.sqrt(1 - z * z);
    return [r * Math.cos(a), r * Math.sin(a), z];
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(this._next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  /** independent child stream, stable regardless of how much the parent was consumed */
  fork(label) { return new RNG(hash(this.seed, hashString(String(label)))); }
}

export function rng(seed) { return new RNG(seed); }

// ------------------------------------------------------------------ smooth noise

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** 1D value noise, C2-smooth, range [-1, 1] */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash01(i, seed) * 2 - 1, b = hash01(i + 1, seed) * 2 - 1;
  return a + (b - a) * fade(f);
}

export function fbm1(x, seed = 0, octaves = 3) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let o = 0; o < octaves; o++) { sum += amp * noise1(x * freq, seed + o * 1013); norm += amp; amp *= 0.5; freq *= 2.03; }
  return sum / norm;
}

/** 2D value noise, range [-1, 1] */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fade(fx), v = fade(fy);
  const h = (a, b) => hash01(a, b, seed) * 2 - 1;
  const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

/** smooth 3-vector noise (each component independent 1D fbm) for camera shake etc. */
export function noiseVec3(t, seed = 0, octaves = 2) {
  return [fbm1(t, seed + 11, octaves), fbm1(t, seed + 23, octaves), fbm1(t, seed + 37, octaves)];
}
