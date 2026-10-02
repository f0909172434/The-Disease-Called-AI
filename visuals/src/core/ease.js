// Easing + small math helpers. Human motion: inOutSine / outBack / noise. AI motion: linear / steps.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const saturate = (x) => clamp(x, 0, 1);
export const lerp = (a, b, u) => a + (b - a) * u;
export const invLerp = (a, b, x) => (b === a ? 0 : (x - a) / (b - a));
/** map x from [a,b] to [c,d], clamped */
export const remap = (x, a, b, c, d) => c + (d - c) * clamp(invLerp(a, b, x));
export const fract = (x) => x - Math.floor(x);
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smootherstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mix = lerp;

export const linear = (t) => t;
export const inSine = (t) => 1 - Math.cos((clamp(t) * Math.PI) / 2);
export const outSine = (t) => Math.sin((clamp(t) * Math.PI) / 2);
export const inOutSine = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
export const inQuad = (t) => clamp(t) ** 2;
export const outQuad = (t) => 1 - (1 - clamp(t)) ** 2;
export const inOutQuad = (t) => { t = clamp(t); return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; };
export const inCubic = (t) => clamp(t) ** 3;
export const outCubic = (t) => 1 - (1 - clamp(t)) ** 3;
export const inOutCubic = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; };
export const inQuart = (t) => clamp(t) ** 4;
export const outQuart = (t) => 1 - (1 - clamp(t)) ** 4;
export const inOutQuart = (t) => { t = clamp(t); return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2; };
export const inExpo = (t) => (clamp(t) === 0 ? 0 : 2 ** (10 * clamp(t) - 10));
export const outExpo = (t) => (clamp(t) === 1 ? 1 : 1 - 2 ** (-10 * clamp(t)));
export const inOutExpo = (t) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
};
/** overshoot; style guide: human pop-ins use outBack(1.2) */
export const outBack = (t, s = 1.70158) => { t = clamp(t) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
export const inBack = (t, s = 1.70158) => { t = clamp(t); return (s + 1) * t * t * t - s * t * t; };
export const outElastic = (t) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
/** AI motion: quantized progress, n steps */
export const steps = (t, n) => Math.floor(clamp(t) * n) / n;

/** 0 before t0, ramps to 1 over [t0, t0+dur] with easing */
export const ramp = (t, t0, dur, ease = linear) => ease(clamp((t - t0) / Math.max(dur, 1e-9)));

/** window: fades in over [a, a+fin], holds, fades out over [b-fout, b] */
export function window(t, a, b, fin = 0, fout = 0) {
  if (t < a || t > b) return 0;
  const i = fin > 0 ? clamp((t - a) / fin) : 1;
  const o = fout > 0 ? clamp((b - t) / fout) : 1;
  return Math.min(i, o);
}

/** one-shot envelope: 0 before t0, instant/attack rise, exponential decay (seconds) */
export function pulse(t, t0, decay = 0.15, attack = 0) {
  const dt = t - t0;
  if (dt < 0) return 0;
  if (attack > 0 && dt < attack) return dt / attack;
  return Math.exp(-(dt - attack) / decay);
}

/** damped spring step response (closed form), useful for organic settle */
export function spring(t, freq = 4, damping = 0.35) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  return 1 - Math.exp(-damping * w * t) * Math.cos(w * Math.sqrt(1 - damping * damping) * t);
}

/** keyframe track: keys = [[t, value], ...] (value number or array), optional ease per segment */
export function track(t, keys, ease = linear) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1, e] = keys[i];
      const u = (e || ease)((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((v, k) => v + (v1[k] - v) * u);
      return v0 + (v1 - v0) * u;
    }
  }
  return keys[keys.length - 1][1];
}

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
