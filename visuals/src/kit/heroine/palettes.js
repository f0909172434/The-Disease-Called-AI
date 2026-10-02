// Heroine palettes (css hex for canvas). Identity: she is the HUMAN / amber side of the film
// (docs/05_style_guide.md). Three modes:
//   human      default: blue-black hair, warm amber-brown eyes, pale warm skin, heather-grey hoodie
//   swapped    final chorus: she has been digitized into interface cyan (crisp: no boil/painterly)
//   perfected  the AI wearing her face: flawless, symmetric, no dark circles, glowing amber irises
// `look` holds per-mode defaults the rig applies unless the caller overrides them.
export const HUMAN = Object.freeze({
  name: 'human',
  skin: '#FBE3D6', skinShade: '#E7B9A8', skinShade2: '#D69A8C', skinLight: '#FFF3EC',
  skinLine: '#7E443C', skinLineSoft: '#B7766A', blush: '#F49A9A', lip: '#E59A94',
  underEye: '#9C8CB4', // lavender-grey dark circles
  hair: '#1F2537', hairMid: '#2B3550', hairShade: '#131724', hairDeep: '#0C0F18', hairLine: '#080A12',
  hairSheen: '#56688F', hairSheenHi: '#8FA5C8', hairInner: '#171C2B',
  brow: '#2A2433', lash: '#1C1114', lashWarm: '#5A2A22', lashLower: '#7A4A44',
  sclera: '#FFFDFB', scleraShade: '#D8D2E6',
  iris0: '#3E1C08', iris1: '#8A4A1C', iris2: '#D0782E', iris3: '#FFB070', irisRim: '#4A2410', pupil: '#2A1206',
  irisGlow: null,
  mouthLine: '#8E4A44', mouthIn: '#6E2C30', tongue: '#D9777A', teeth: '#FFFFFF',
  hood: '#5C6270', hoodShade: '#424754', hoodShade2: '#353945', hoodLight: '#727A8B', hoodLine: '#22252D', hoodInner: '#2E323C',
  string: '#F4F4F2', stringShade: '#C5C9D2', aglet: '#D9DDE4',
  band: '#FAFAFA', bandShade: '#D3D7E0', barcode: '#1E222A',
  pin: '#7FE9FF', pinCore: '#E8FDFF',
  pillow: '#E9ECF2', pillowShade: '#BCC3D2', pillowLine: '#6E7690', sheet: '#C9CFDC', sheetShade: '#9AA3B8',
  glass: '#7FE9FF',
  look: { boil: 0.6, painterly: 0.55, lineScale: 1, underEye: 1, flyaways: 1, symmetric: false, glowIris: 0, reflectCyan: 1 },
});

export const SWAPPED = Object.freeze({
  ...HUMAN,
  name: 'swapped',
  skin: '#E3F8FF', skinShade: '#A9DDF0', skinShade2: '#7FC3DD', skinLight: '#F6FDFF',
  skinLine: '#1A5876', skinLineSoft: '#4D93B4', blush: '#7FE9FF', lip: '#8ED6EE',
  underEye: '#5AA8D0',
  hair: '#0F2A44', hairMid: '#17406A', hairShade: '#0A1C30', hairDeep: '#061322', hairLine: '#030A14',
  hairSheen: '#3FB3E6', hairSheenHi: '#7FE9FF', hairInner: '#0B2036',
  brow: '#0E2C48', lash: '#06182C', lashWarm: '#0F4A78', lashLower: '#2A6E96',
  sclera: '#F4FEFF', scleraShade: '#BFE6F4',
  iris0: '#04204A', iris1: '#1B6FFF', iris2: '#3FB8FF', iris3: '#7FE9FF', irisRim: '#08306A', pupil: '#031836',
  irisGlow: '#7FE9FF',
  mouthLine: '#1E5E80', mouthIn: '#0C3550', tongue: '#5FB4D6', teeth: '#F4FEFF',
  hood: '#2E536C', hoodShade: '#1F3D54', hoodShade2: '#173044', hoodLight: '#3F6E8C', hoodLine: '#0A1E2E', hoodInner: '#15293A',
  string: '#E8FDFF', stringShade: '#9ED8EC', aglet: '#BFF3FF',
  band: '#E8FDFF', bandShade: '#A8DCEE', barcode: '#06243C',
  pillow: '#CFEFFA', pillowShade: '#8FC6DC', pillowLine: '#2A6E8E', sheet: '#A9D6E8', sheetShade: '#6FA9C2',
  look: { boil: 0, painterly: 0, lineScale: 0.9, underEye: 0, flyaways: 0.3, symmetric: false, glowIris: 0.6, reflectCyan: 1 },
});

export const PERFECTED = Object.freeze({
  ...HUMAN,
  name: 'perfected',
  skin: '#FCE9DF', skinShade: '#EFCBBE', skinShade2: '#E3B3A4', skinLight: '#FFF8F3',
  skinLine: '#9A5A4E', skinLineSoft: '#C88E80', blush: '#F6B0A8', lip: '#EFA79C',
  underEye: '#000000',
  hair: '#1E2436', hairMid: '#2E3A58', hairSheen: '#6A7FA8', hairSheenHi: '#B4C6E6',
  iris0: '#6A2E06', iris1: '#C2661E', iris2: '#FF9A3C', iris3: '#FFD9A0', irisRim: '#7A3A0E', pupil: '#3A1604',
  irisGlow: '#FFB070',
  look: { boil: 0, painterly: 0, lineScale: 0.85, underEye: 0, flyaways: 0, symmetric: true, glowIris: 1, reflectCyan: 0 },
});

export const PALETTES = Object.freeze({ human: HUMAN, swapped: SWAPPED, perfected: PERFECTED });

/** parse css hex -> [r,g,b] 0..255 */
export function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** mix two css hex colors in sRGB -> css hex */
export function mix(a, b, u) {
  const A = hexRgb(a), B = hexRgb(b);
  const m = (i) => Math.round(A[i] + (B[i] - A[i]) * u);
  return '#' + ((1 << 24) | (m(0) << 16) | (m(1) << 8) | m(2)).toString(16).slice(1);
}

/** css rgba() from hex + alpha */
export function rgba(h, a = 1) {
  const [r, g, b] = hexRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

/** desaturate a hex color toward its luminance (u = 0 none .. 1 grey) */
export function desat(h, u) {
  const [r, g, b] = hexRgb(h);
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const m = (c) => Math.round(c + (l - c) * u);
  return '#' + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1);
}

/** palette with every color desaturated by u (the "colour drained from her face" beat) */
export function drained(pal, u) {
  if (!u) return pal;
  const out = {};
  for (const [k, v] of Object.entries(pal)) out[k] = typeof v === 'string' && v[0] === '#' ? desat(v, u) : v;
  return out;
}
