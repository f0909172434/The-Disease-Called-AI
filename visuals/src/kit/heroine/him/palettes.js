// "Him" palettes (css hex). He lives on the warm amber, hand-drawn side of the film.
//   human    default: blue-black hair, dark warm-brown eyes, warm skin, royal-blue blazer
//   drained  verse 2: colour drained out (desaturated, paler skin, greyer clothes)
//   swapped  final chorus: he is redrawn as clean cyan vector lines on deep navy fills
// `look` holds per-mode defaults the rig applies unless the caller overrides them.
import { drained as drainPal, mix } from '../palettes.js';

export const HIM_HUMAN = Object.freeze({
  name: 'human',
  // skin
  skin: '#F6D9C2', skinShade: '#E2AF95', skinShade2: '#C98F78', skinLight: '#FFEFE0',
  skinLine: '#5E2F25', skinLineSoft: '#A8664F', blush: '#EE9A86', lip: '#D98C7C',
  underEye: '#8D7FA6',
  // hair (dark slate so black ink still reads inside the mass)
  hair: '#272C3B', hairMid: '#323849', hairShade: '#171A24', hairDeep: '#0E1017', hairLine: '#08090D',
  hairSheen: '#4E5A78', hairSheenHi: '#94A3C4', hairInner: '#1D212D',
  brow: '#1B1820', lash: '#120D0E', lashLower: '#5A3A34',
  // eyes
  sclera: '#FFFDF8', scleraShade: '#D7CCDA',
  iris0: '#160E0B', iris1: '#3A281F', iris2: '#70503A', iris3: '#C08E5A', irisRim: '#120A08', pupil: '#0B0605',
  // mouth
  mouthLine: '#6E3329', mouthIn: '#5A2226', tongue: '#C9686A', teeth: '#FFFDF8',
  // glasses (silver-grey half rim)
  frame: '#A3A9B4', frameShade: '#5F6672', frameHi: '#EEF1F5', frameLine: '#2E333C', lensTint: '#DCE6F0', lensEdge: '#8E96A4',
  // blazer (royal / navy blue)
  blazer: '#2F4B9E', blazerShade: '#223878', blazerDeep: '#172757', blazerLight: '#4A68BE', blazerLine: '#0C1534', lining: '#1A2348',
  // dress shirt
  shirt: '#FBF7EF', shirtShade: '#D5D0DC', shirtShade2: '#B4B2C4', shirtLine: '#4D5068', button: '#E8E4DA',
  // trousers + shoes
  pants: '#30333D', pantsShade: '#22242C', pantsLight: '#454957', pantsLine: '#0F1015',
  shoe: '#4B2E22', shoeShade: '#2C1A13', shoeHi: '#8A5C46', shoeLine: '#150B07',
  // hospital wristband
  band: '#FAFAFA', bandShade: '#CDD2DC', barcode: '#1E222A',
  // fx
  sweat: '#CFEFFF', sweatLine: '#5A8FB0', gloom: '#5B5F8E', screen: '#7FE9FF', screenCore: '#E8FDFF', tear: '#BFEFFF',
  vline: '#7FE9FF', vglow: '#7FE9FF',
  look: { boil: 1.6, painterly: 0.6, lineScale: 1, underEye: 0, vector: false, glow: 0, pale: 0, grain: 0.5 },
});

// verse 2: colour drained; skin pushed toward a sallow grey, clothes greyed
export const HIM_DRAINED = Object.freeze({
  ...drainPal(HIM_HUMAN, 0.62),
  name: 'drained',
  skin: '#E9DED6', skinShade: '#CDBDB4', skinShade2: '#B4A39C', skinLight: '#F5EEE9',
  skinLine: '#4E3A36', skinLineSoft: '#8F7A72', blush: '#C9AFA8', lip: '#BFA19A',
  underEye: '#7B7690',
  look: { boil: 1.6, painterly: 0.45, lineScale: 1, underEye: 0.6, vector: false, glow: 0, pale: 0.4, grain: 0.6 },
});

// final chorus: interface cyan vector lines, flat deep-navy fills, no boil, no painterly
const N0 = '#07121F', N1 = '#0B1C2E', N2 = '#10263C', N3 = '#163352';
export const HIM_SWAPPED = Object.freeze({
  ...HIM_HUMAN,
  name: 'swapped',
  skin: N2, skinShade: N1, skinShade2: N0, skinLight: N3,
  skinLine: '#7FE9FF', skinLineSoft: '#4FB8D8', blush: '#1E5C80', lip: '#2A6A8E', underEye: '#1E4A6E',
  hair: N1, hairMid: N2, hairShade: N0, hairDeep: '#040B14', hairLine: '#7FE9FF',
  hairSheen: '#1E5C80', hairSheenHi: '#7FE9FF', hairInner: N0,
  brow: '#7FE9FF', lash: '#7FE9FF', lashLower: '#4FB8D8',
  sclera: '#0E2638', scleraShade: '#0A1B2A',
  iris0: '#062C44', iris1: '#0F6A8E', iris2: '#3FB8E0', iris3: '#7FE9FF', irisRim: '#7FE9FF', pupil: '#E8FDFF',
  mouthLine: '#7FE9FF', mouthIn: '#05101C', tongue: '#1E5C80', teeth: '#7FE9FF',
  frame: '#7FE9FF', frameShade: '#4FB8D8', frameHi: '#E8FDFF', frameLine: '#7FE9FF', lensTint: '#7FE9FF', lensEdge: '#7FE9FF',
  blazer: N2, blazerShade: N1, blazerDeep: N0, blazerLight: N3, blazerLine: '#7FE9FF', lining: N0,
  shirt: N3, shirtShade: N2, shirtShade2: N1, shirtLine: '#7FE9FF', button: '#7FE9FF',
  pants: N1, pantsShade: N0, pantsLight: N2, pantsLine: '#7FE9FF',
  shoe: N1, shoeShade: N0, shoeHi: N3, shoeLine: '#7FE9FF',
  band: '#7FE9FF', bandShade: '#4FB8D8', barcode: N0,
  sweat: '#7FE9FF', sweatLine: '#7FE9FF', gloom: '#7FE9FF',
  vline: '#7FE9FF', vglow: '#7FE9FF',
  look: { boil: 0, painterly: 0, lineScale: 1, underEye: 0, vector: true, glow: 1, pale: 0, grain: 0 },
});

export const HIM_PALETTES = Object.freeze({ human: HIM_HUMAN, drained: HIM_DRAINED, swapped: HIM_SWAPPED });

/** skin tinted toward pale grey-blue (tired / panic pallor); u 0..1 */
export function paled(pal, u) {
  if (!u || pal.name === 'swapped') return pal;
  const g = '#E4E2E6';
  return { ...pal,
    skin: mix(pal.skin, g, u * 0.55), skinShade: mix(pal.skinShade, '#C4BCC8', u * 0.55),
    skinShade2: mix(pal.skinShade2, '#A8A0B4', u * 0.5), blush: mix(pal.blush, pal.skinShade, u),
    lip: mix(pal.lip, '#BBA6A8', u * 0.6) };
}
