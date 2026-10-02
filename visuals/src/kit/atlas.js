// Shared glyph atlas: white glyphs on transparent, 16x16 cells, for shader-driven text
// (Ring character band, decode scrambles, confetti). Includes procedural icons that no font
// provides: thumbs up/down, heart, regenerate arrow, block cursor, dot.
//
//   const atlas = GlyphAtlas.get(ctx);             // singleton per text system
//   atlas.texture; atlas.index('A'); atlas.icon('THUMB_UP'); atlas.cols/rows; atlas.randomPool
import * as THREE from 'three';
import { cssFont } from '../core/fonts.js';

const ASCII = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i)).join('');
const CJK = '病名為愛我你在嗎是的不心跳診斷患者永遠一直都夢光熱聲音字';
const SYMBOLS = '•·…—∞♥●○■□▲△→←↑↓✓✕↻▍█░▒▓';
export const ICONS = ['THUMB_UP', 'THUMB_DOWN', 'HEART', 'REGEN', 'CURSOR', 'DOT', 'SPARKLE', 'BUBBLE'];

function drawThumb(c, x, y, s, down = false) {
  c.save();
  c.translate(x + s / 2, y + s / 2);
  if (down) c.rotate(Math.PI);
  c.scale(s / 100, s / 100);
  c.fillStyle = '#fff';
  c.beginPath();
  // fist
  c.roundRect(-30, -6, 52, 44, 10);
  c.fill();
  // thumb
  c.beginPath();
  c.moveTo(-26, -2);
  c.bezierCurveTo(-24, -20, -8, -30, -6, -44);
  c.bezierCurveTo(-5, -52, 8, -52, 9, -40);
  c.bezierCurveTo(10, -30, 6, -20, 4, -8);
  c.lineTo(-26, -2);
  c.fill();
  // cuff
  c.fillRect(-44, -4, 12, 44);
  // finger gaps
  c.globalCompositeOperation = 'destination-out';
  c.lineWidth = 3;
  for (const yy of [8, 19, 30]) { c.beginPath(); c.moveTo(4, yy); c.lineTo(23, yy); c.stroke(); }
  c.restore();
}

function drawIcon(c, name, x, y, s) {
  c.save();
  c.fillStyle = '#fff'; c.strokeStyle = '#fff';
  const cx = x + s / 2, cy = y + s / 2;
  switch (name) {
    case 'THUMB_UP': drawThumb(c, x, y, s, false); break;
    case 'THUMB_DOWN': drawThumb(c, x, y, s, true); break;
    case 'HEART': {
      c.translate(cx, cy + s * 0.05); c.scale(s / 100, s / 100);
      c.beginPath(); c.moveTo(0, 30);
      c.bezierCurveTo(-50, -5, -30, -45, 0, -22);
      c.bezierCurveTo(30, -45, 50, -5, 0, 30); c.fill();
      break;
    }
    case 'REGEN': {
      c.lineWidth = s * 0.09; c.lineCap = 'round';
      c.beginPath(); c.arc(cx, cy, s * 0.28, -Math.PI * 0.35, Math.PI * 1.45); c.stroke();
      const a = -Math.PI * 0.35, r = s * 0.28;
      const ex = cx + Math.cos(a) * r, ey = cy + Math.sin(a) * r;
      c.beginPath(); c.moveTo(ex + s * 0.13, ey - s * 0.02); c.lineTo(ex - s * 0.02, ey - s * 0.14); c.lineTo(ex - s * 0.03, ey + s * 0.1); c.closePath(); c.fill();
      break;
    }
    case 'CURSOR': c.fillRect(x + s * 0.3, y + s * 0.12, s * 0.4, s * 0.76); break;
    case 'DOT': c.beginPath(); c.arc(cx, cy, s * 0.16, 0, Math.PI * 2); c.fill(); break;
    case 'SPARKLE': {
      c.translate(cx, cy); c.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 === 0 ? s * 0.42 : s * 0.1; const a = (i / 8) * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      c.closePath(); c.fill(); break;
    }
    case 'BUBBLE': c.beginPath(); c.roundRect(x + s * 0.12, y + s * 0.2, s * 0.76, s * 0.5, s * 0.16); c.fill();
      c.beginPath(); c.moveTo(x + s * 0.3, y + s * 0.68); c.lineTo(x + s * 0.24, y + s * 0.86); c.lineTo(x + s * 0.46, y + s * 0.68); c.fill(); break;
    default: break;
  }
  c.restore();
}

export class GlyphAtlas {
  static get(ctx, opts = {}) {
    const key = `_atlas_${opts.role || 'ai'}`;
    if (!ctx[key]) ctx[key] = new GlyphAtlas(opts);
    return ctx[key];
  }
  constructor({ role = 'ai', cell = 64, cols = 16, weight = 400 } = {}) {
    this.cell = cell; this.cols = cols;
    this.chars = [...ASCII, ...CJK, ...SYMBOLS];
    const n = this.chars.length + ICONS.length;
    this.rows = Math.ceil(n / cols);
    const cv = document.createElement('canvas');
    cv.width = cols * cell; cv.height = this.rows * cell;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    this.map = new Map();
    this.chars.forEach((ch, i) => {
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      const cjk = /[⺀-鿿]/.test(ch);
      c.font = cssFont(cjk ? 'sans' : role, Math.round(cell * (cjk ? 0.7 : 0.74)), { weight });
      c.fillText(ch, x + cell / 2, y + cell * 0.54);
      this.map.set(ch, i);
    });
    ICONS.forEach((name, k) => {
      const i = this.chars.length + k;
      drawIcon(c, name, (i % cols) * cell, Math.floor(i / cols) * cell, cell);
      this.map.set(name, i);
    });
    this.canvas = cv;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace; // alpha mask
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 4;
    this.texture = tex;
    // glyphs used for random "data" streams (letters, digits, a few symbols)
    this.randomPool = Int32Array.from([...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789<>{}[]/=+*#&%$@'].map((ch) => this.map.get(ch)));
  }
  index(ch) { return this.map.has(ch) ? this.map.get(ch) : this.map.get('?'); }
  icon(name) { return this.map.get(name); }
  /** [u0, v0, u1, v1] for glyph i (v up, as three samples) */
  uv(i) {
    const cx = i % this.cols, cy = Math.floor(i / this.cols);
    return [cx / this.cols, 1 - (cy + 1) / this.rows, (cx + 1) / this.cols, 1 - cy / this.rows];
  }
}
