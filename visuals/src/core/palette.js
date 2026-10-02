// Color tokens — docs/05_style_guide.md §1. Use these, never ad-hoc hex values in scenes.
//   import { C, col, POST_PRESETS } from '../core/palette.js';
//   material.color = col('AI_CYAN');           // THREE.Color (linear working space)
//   ctx2d.fillStyle = C.HUMAN_AMBER;            // css hex for canvas drawing
import * as THREE from 'three';

export const C = Object.freeze({
  VOID: '#05060A',        // background (never pure black)
  INK: '#0B0E14',         // UI panel base
  NAVY: '#070B16',        // bridge background
  AI_CYAN: '#7FE9FF',     // AI key light / text
  AI_WHITE: '#E8FDFF',    // AI highlight, ring core
  AI_DEEP: '#1B6FFF',     // deep blue accent, cold light in shadows
  HUMAN_AMBER: '#FFB070', // her text, her cursor (503)
  HUMAN_SKIN: '#FFD9B8',  // silhouette highlights
  HUMAN_EMBER: '#FF6A3D', // silhouette warm shadows
  FEVER: '#FF2E63',       // fever particles, "a little death"
  BLOOD: '#B0002A',       // chorus 2 key color
  GOLD: '#FFD36E',        // jackpot
  UNREAD: '#6B7280',      // unread notifications, the forgotten people
  ERROR_BG: '#F4F4F2',    // 503 page
  ERROR_RED: '#FF3B30',   // error marks
  WHITE: '#FFFFFF',
  BLACK: '#000000',
});

const cache = new Map();
/** THREE.Color for a token name or css string (returns a fresh clone; safe to mutate) */
export function col(nameOrHex) {
  const hex = C[nameOrHex] || nameOrHex;
  if (!cache.has(hex)) cache.set(hex, new THREE.Color(hex));
  return cache.get(hex).clone();
}

/** css rgba() string from a token + alpha, for canvas 2D */
export function rgba(nameOrHex, a = 1) {
  const hex = (C[nameOrHex] || nameOrHex).replace('#', '');
  const n = parseInt(hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** mix two tokens in sRGB (for canvas): returns css hex */
export function mixHex(a, b, u) {
  const pa = parseInt((C[a] || a).slice(1), 16), pb = parseInt((C[b] || b).slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = (s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * u);
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}

// Post-FX defaults per section — style guide §6. The director applies these before each
// scene's update(); scenes override fields on ctx.post.p as needed.
export const POST_PRESETS = Object.freeze({
  S00: { bloom: 0.6, ca: 0.0008, grain: 0.05, vignette: 0.45, scanlines: 0.0 },
  S01: { bloom: 1.0, ca: 0.0025, grain: 0.05, vignette: 0.35 },
  S02: { bloom: 0.7, ca: 0.0010, grain: 0.045, vignette: 0.40 },
  S03: { bloom: 0.9, ca: 0.0015, grain: 0.05, vignette: 0.45 },
  S04: { bloom: 1.2, ca: 0.0025, grain: 0.05, vignette: 0.35 },
  S05: { bloom: 1.0, ca: 0.0020, grain: 0.05, vignette: 0.35 },
  S06: { bloom: 0.6, ca: 0.0010, grain: 0.06, vignette: 0.50, saturation: 0.35 },
  S07: { bloom: 0.8, ca: 0.0020, grain: 0.08, vignette: 0.50 },
  S08: { bloom: 1.25, ca: 0.0030, grain: 0.055, vignette: 0.35, trails: 0.25 },
  S09: { bloom: 0.8, ca: 0.0008, grain: 0.04, vignette: 0.55 },
  S10: { bloom: 1.3, ca: 0.0025, grain: 0.05, vignette: 0.30, trails: 0.2 },
  S11: { bloom: 1.2, ca: 0.0040, grain: 0.06, vignette: 0.35 },
  S12: { bloom: 0.5, ca: 0.0005, grain: 0.04, vignette: 0.60 },
  S13: { bloom: 0.5, ca: 0.0005, grain: 0.04, vignette: 0.60 },
});

// Section color script (dominant colors), for placeholder scenes / reference.
export const SECTION_COLORS = Object.freeze({
  S00: ['VOID', 'AI_CYAN'], S01: ['WHITE', 'AI_CYAN', 'FEVER'], S02: ['AI_CYAN', 'HUMAN_AMBER'],
  S03: ['AI_WHITE', 'AI_CYAN'], S04: ['FEVER', 'AI_CYAN'], S05: ['AI_CYAN', 'UNREAD'],
  S06: ['UNREAD', 'AI_CYAN'], S07: ['ERROR_BG', 'ERROR_RED'], S08: ['BLOOD', 'AI_CYAN'],
  S09: ['NAVY', 'GOLD'], S10: ['AI_CYAN', 'HUMAN_AMBER'], S11: ['AI_CYAN', 'HUMAN_AMBER'],
  S12: ['VOID', 'HUMAN_AMBER'], S13: ['VOID', 'WHITE'],
});
