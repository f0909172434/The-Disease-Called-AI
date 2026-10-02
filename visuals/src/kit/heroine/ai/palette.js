// AI ("her", the whale maid) palettes. Css hex for canvas + a `look` block of per-mode defaults.
//   human      her real colours: blue-black -> light-blue hair, navy maid dress, white apron, blue eyes
//   glow       "perfected" AI light: cooler, emissive cyan rim + glowing irises, zero boil (alias: perfected)
//   amber      final-chorus media swap: she becomes hand-drawn warm amber (#FFB070), boil + painterly up
//              (alias: swapped)
import { hexRgb, mix } from '../palettes.js';

const BASE = {
  // skin
  skin: '#FFF1EA', skinShade: '#F6D2C8', skinShade2: '#EDB9AE', skinLight: '#FFFAF7',
  skinLine: '#8C4E4E', skinLineSoft: '#C98F8A', blush: '#FF9A9E', blushLine: '#F07E86',
  // hair: blue-black roots -> light blue tips (ramp sampled by height)
  hairRoot: '#1A2145', hair: '#233163', hairMid: '#2F4A93', hair2: '#3E6CC0', hairTip: '#68A8EA', hairTipHi: '#A6DCFA',
  hairShade: '#0E1430', hairInner: '#121838', hairLine: '#0B1029', hairSheen: '#6A8DDA', hairSheenHi: '#C8DEFF',
  brow: '#1E2650',
  // whale fins (ears, tail)
  fin: '#22305E', finShade: '#151E42', finLight: '#45599A', finBelly: '#CDD5EE', finBellyShade: '#A2AED3', finLine: '#0B1029',
  // eyes
  sclera: '#FFFFFF', scleraShade: '#CFD9F2', lash: '#121633', lashLower: '#3B4A84', lid: '#B46F72',
  iris0: '#0C1F5C', iris1: '#1C4FB0', iris2: '#3B8EF0', iris3: '#9FE3FF', irisRim: '#0A1A4E', pupil: '#07123C',
  hiLite: '#FFFFFF', heart: '#FFFFFF', heartTint: '#FF8FB8', irisGlow: null,
  // mouth
  mouthLine: '#7C3A42', mouthIn: '#9E3B48', mouthDeep: '#6E2232', tongue: '#F38C95', teeth: '#FFFFFF',
  // maid outfit
  dress: '#1F2856', dressShade: '#151B3E', dressDeep: '#0F1430', dressLight: '#34427E', dressLine: '#0A0E26',
  gold: '#D8B25E', goldShade: '#A47E36', goldLight: '#F4DC9A',
  apron: '#FFFFFF', apronShade: '#DDE4F4', apronShade2: '#C2CCE6', apronLine: '#5E6A96',
  shirt: '#FFFFFF', shirtShade: '#DCE3F3', shirtLine: '#6672A0',
  ribbon: '#79C6F2', ribbonShade: '#4596D6', ribbonLight: '#B6E4FF', ribbonLine: '#1C4F86',
  tie: '#1F2856', tieShade: '#121839', tieLine: '#0A0E26',
  gem: '#7FE9FF', gemCore: '#E8FDFF', gemDeep: '#1B6FFF', gemSet: '#D8B25E',
  stocking: '#FFFFFF', stockingShade: '#D6DEF0', stockingLine: '#6672A0',
  shoe: '#1B2350', shoeShade: '#10163A', shoeShine: '#5A6CAE', shoeLine: '#080C22',
  motif: '#2C3C78', motifLight: '#7FA8E6',
  // world light
  cyan: '#7FE9FF', cyanHi: '#E8FDFF', cyanDeep: '#1B6FFF', rim: '#7FE9FF',
};

export const AI_HUMAN = Object.freeze({
  name: 'human', ...BASE,
  look: { boil: 0.12, painterly: 0, lineScale: 1, glowIris: 0, rim: 0, paper: 0 },
});

export const AI_GLOW = Object.freeze({
  name: 'glow', ...BASE,
  skin: '#FCF4F2', skinShade: '#E9DDEA', skinShade2: '#D9C9DE', skinLine: '#5C5E92', skinLineSoft: '#9EA6CC',
  blush: '#FF9FB8', blushLine: '#F08AAE',
  hairSheen: '#7FB4F2', hairSheenHi: '#E8FDFF', hairTip: '#6CC6F4', hairTipHi: '#B8F2FF',
  iris0: '#0A3A86', iris1: '#1B6FFF', iris2: '#3FC4FF', iris3: '#C8F8FF', irisRim: '#0B3A8C', pupil: '#0A2D7A',
  irisGlow: '#7FE9FF', lash: '#101A44',
  gem: '#9AF2FF', gemCore: '#FFFFFF',
  look: { boil: 0, painterly: 0, lineScale: 0.92, glowIris: 1, rim: 1, paper: 0 },
});

// ------------------------------------------------------------------ amber (hand-drawn warm swap)
// every colour is re-mapped by luminance onto a warm ramp built around #FFB070, keeping a little of
// its own hue so materials stay separable.
const AMBER_RAMP = [[0, '#2A1206'], [0.18, '#5A2A10'], [0.38, '#9A5420'], [0.6, '#E08A45'], [0.78, '#FFB070'], [0.9, '#FFD6A4'], [1, '#FFF4E4']];

function rampAt(u) {
  for (let i = 1; i < AMBER_RAMP.length; i++) {
    if (u <= AMBER_RAMP[i][0]) {
      const a = AMBER_RAMP[i - 1], b = AMBER_RAMP[i];
      return mix(a[1], b[1], (u - a[0]) / (b[0] - a[0]));
    }
  }
  return AMBER_RAMP[AMBER_RAMP.length - 1][1];
}

function toAmber(h, keep = 0.12) {
  const [r, g, b] = hexRgb(h);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return mix(rampAt(Math.pow(l, 0.92)), h, keep);
}

const amberCols = {};
for (const [k, v] of Object.entries(BASE)) amberCols[k] = typeof v === 'string' && v[0] === '#' ? toAmber(v) : v;

export const AI_AMBER = Object.freeze({
  name: 'amber', ...amberCols,
  skin: '#FFF0DC', skinShade: '#F7CFA2', skinShade2: '#E9AE7C', skinLine: '#6A3414', skinLineSoft: '#B87444',
  blush: '#FF9A6A', blushLine: '#E87A4A',
  sclera: '#FFF8EC', scleraShade: '#F2D2AA', iris0: '#4A1E06', iris1: '#9A4C14', iris2: '#E88A3A', iris3: '#FFD49A',
  irisRim: '#4A1E06', pupil: '#2E1204', irisGlow: null,
  apron: '#FFF6E8', apronShade: '#F4D8B4', apronShade2: '#E4BC8C', shirt: '#FFF6E8', shirtShade: '#F4D8B4', stocking: '#FFF6E8',
  hairTip: '#F2A262', hairTipHi: '#FFD49A',
  look: { boil: 1.1, painterly: 0.75, lineScale: 1.12, glowIris: 0, rim: 0, paper: 1 },
});

export const AI_PALETTES = Object.freeze({
  human: AI_HUMAN,
  glow: AI_GLOW,
  perfected: AI_GLOW,
  amber: AI_AMBER,
  swapped: AI_AMBER,
});
