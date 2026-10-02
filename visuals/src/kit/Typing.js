// Typing primitives used by the intro / 503 / outro (and anywhere text is typed in 3D):
//
//   TypedText     a line typed from timeline events ({t, ch} with '\b' backspace, '\n' ignored here):
//                 per-character sprites (kerning-correct positions), human pop-in + ±0.5px jitter,
//                 deletions vanish. caretX(t) gives the caret position for a cursor.
//   ScreenCursor  the ▍ block cursor rendered through an LCD RGB-subpixel mask, with the faint
//                 subpixel grid of the screen glowing around it (fades to solid as it gets small).
//   BubbleOutline rounded-rect chat bubble drawn as glowing antialiased lines (GlowLines).
import * as THREE from 'three';
import { GlowLines } from './lines.js';
import { col } from '../core/palette.js';
import { clamp, outCubic } from '../core/ease.js';
import { hash01 } from '../core/rng.js';
import { LCD_GLSL } from '../core/text.js';

// ------------------------------------------------------------------------------------ TypedText
export class TypedText extends THREE.Group {
  /**
   * events: [{t, ch}] ('\b' deletes the previous char). style: text style (role/size/color...).
   * opts.height: world height of a glyph sprite (canvas line incl. padding). opts.fade: pop-in secs.
   */
  constructor(ctx, events, style, { height = 0.13, fade = 0.07, rise = 0.012, additive = false, lcd = 0 } = {}) {
    super();
    this.ctx = ctx;
    this.style = style;
    this.height = height;
    this.fade = fade;
    this.rise = rise;
    // char instances with add / delete times
    const inst = [];
    const stack = [];
    for (const e of events) {
      if (e.ch === '\n') continue;
      if (e.ch === '\b') { const k = stack.pop(); if (k !== undefined) inst[k].tDel = e.t; continue; }
      inst.push({ ch: e.ch, tAdd: e.t, tDel: Infinity, k: inst.length });
      stack.push(inst.length - 1);
    }
    this.inst = inst;
    const m = ctx.text.measure('Hg', style);
    const probe = ctx.text.texture('H', style);
    this.unit = height / probe.height;          // world units per canvas px
    this.padPx = probe.metrics.pad;
    this.baselinePx = probe.metrics.baseline;
    this.sprites = inst.map((it) => {
      const s = ctx.text.sprite(it.ch === ' ' ? ' ' : it.ch, style, { height, anchor: 'left', additive });
      if (lcd) { const m = s.material; m.defines = { LCD: 1 }; m.uniforms.uPitch.value = lcd; m.needsUpdate = true; }
      s.visible = false;
      this.add(s);
      return s;
    });
    this.opacity = 1;
    this.color = new THREE.Color(1, 1, 1);
    this._lastLayout = { str: null, lay: null };
    this.ascentWorld = m.ascent * this.unit;
  }
  /** alive instances at t, in order */
  alive(t) { return this.inst.filter((it) => it.tAdd <= t && t < it.tDel); }
  textAt(t) { return this.alive(t).map((it) => it.ch).join(''); }
  _layout(str) {
    if (this._lastLayout.str !== str) this._lastLayout = { str, lay: this.ctx.text.charLayout(str, this.style) };
    return this._lastLayout.lay;
  }
  /** world x of the caret (after the last alive char) relative to the group origin */
  caretX(t) {
    const str = this.textAt(t);
    const lay = this._layout(str);
    return (str.length ? lay.width : 0) * this.unit;
  }
  /** time of the most recent key event <= t (adds or deletes) */
  lastKeyTime(t) {
    let best = -Infinity;
    for (const it of this.inst) { if (it.tAdd <= t) best = Math.max(best, it.tAdd); if (it.tDel <= t) best = Math.max(best, it.tDel); }
    return best;
  }
  update(t, { opacity = this.opacity, jitter = 0.5 } = {}) {
    this.opacity = opacity;
    const alive = this.alive(t);
    const str = alive.map((it) => it.ch).join('');
    const lay = this._layout(str);
    const aliveSet = new Map(alive.map((it, i) => [it.k, i]));
    const pxJ = jitter * this.unit;
    this.inst.forEach((it, idx) => {
      const s = this.sprites[idx];
      const i = aliveSet.get(it.k);
      if (i === undefined || it.ch === ' ') { s.visible = false; return; }
      const a = clamp((t - it.tAdd) / this.fade);
      const e = outCubic(a);
      // anchor-left sprites: local x=0 is the pen position; baseline placed at y = 0
      s.position.set(lay[i].x * this.unit + (hash01(it.k, 3) - 0.5) * 2 * pxJ,
        (this.baselinePx * this.unit - this.height / 2) - (1 - e) * this.rise + (hash01(it.k, 7) - 0.5) * 2 * pxJ, 0);
      s.opacity = a * this.opacity;
      s.color.copy(this.color);
    });
    return this;
  }
}

// ---------------------------------------------------------------------------------- ScreenCursor
const CUR_VERT = /* glsl */`
varying vec2 vP;
varying vec2 vW;
uniform vec2 uSize;
void main() { vP = (uv - 0.5) * uSize; vW = (modelMatrix * vec4(position, 1.0)).xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CUR_FRAG = /* glsl */`
precision highp float;
varying vec2 vP;
varying vec2 vW;
uniform vec2 uCursor;      // cursor center (local)
uniform vec2 uCurSize;     // cursor w, h
uniform float uBright, uGrid, uPitch, uGlowR, uOpacity;
uniform vec3 uColor;
${LCD_GLSL}
void main() {
  vec3 mask = lcdMask(vW, uPitch);              // world-aligned: same grid as LCD text sprites
  vec2 d = abs(vP - uCursor) - uCurSize * 0.5;
  float px = fwidth(vP.x) * 0.7;
  float inC = (1.0 - smoothstep(-px, px, d.x)) * (1.0 - smoothstep(-px, px, d.y));
  vec3 cur = uColor * inC * uBright;
  // the unlit subpixels around the cursor catch a little of its light (1–2% at the brightest)
  float dist = length(max(d, 0.0));
  float leak = uGrid * exp(-dist / uGlowR) * uBright;
  vec3 col = cur * mask + vec3(0.55, 0.62, 0.7) * mask * leak * 0.016;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}`;

export class ScreenCursor extends THREE.Mesh {
  /** size: plane size [w, h] (local units); pitch: screen pixel size; cursor: [w, h] */
  constructor(ctx, { size = [2.4, 1.4], pitch = 0.0065, cursor = [0.042, 0.092], color = 'AI_CYAN' } = {}) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: CUR_VERT, fragmentShader: CUR_FRAG,
      uniforms: {
        uSize: { value: new THREE.Vector2(...size) }, uCursor: { value: new THREE.Vector2() }, uCurSize: { value: new THREE.Vector2(...cursor) },
        uBright: { value: 1 }, uGrid: { value: 1 }, uPitch: { value: pitch }, uGlowR: { value: 0.045 }, uOpacity: { value: 1 },
        uColor: { value: col(color) },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    super(new THREE.PlaneGeometry(size[0], size[1]), mat);
    Object.assign(this, { brightness: 1, grid: 1, opacity: 1 });
    this.cursorPos = mat.uniforms.uCursor.value;
    this.cursorSize = mat.uniforms.uCurSize.value;
    this.color = mat.uniforms.uColor.value;
  }
  update(t, states = {}) {
    Object.assign(this, states);
    const u = this.material.uniforms;
    u.uBright.value = this.brightness; u.uGrid.value = this.grid; u.uOpacity.value = this.opacity;
    this.visible = this.opacity > 0.001;
    return this;
  }
}

// --------------------------------------------------------------------------------- BubbleOutline
export function roundRectPoints(w, h, r, tail = null, n = 10) {
  const pts = [];
  const x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2;
  const rr = (k) => (tail === k ? r * 0.25 : r);
  // corners: bottom-right, top-right, top-left, bottom-left (ccw); tail corner gets a tight radius
  const corners = [['br', x1, y0, -Math.PI / 2], ['tr', x1, y1, 0], ['tl', x0, y1, Math.PI / 2], ['bl', x0, y0, Math.PI]];
  for (const [k, x, y, a0] of corners) {
    const R = rr(k);
    const cx = x + (x > 0 ? -R : R), cy = y + (y > 0 ? -R : R);
    for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0]); }
  }
  pts.push(pts[0]);
  return pts;
}

export class BubbleOutline extends GlowLines {
  /** w, h (world), r corner radius, tail: 'bl' (AI, left) | 'br' (human, right) */
  constructor(ctx, { w = 1, h = 0.3, r = 0.1, tail = 'bl', color = 'AI_CYAN', width = 1.6, glow = 6 } = {}) {
    super({ width, glow, W: ctx.W, H: ctx.H, color });
    this.setShape(w, h, r, tail);
  }
  setShape(w, h, r, tail) {
    const pts = roundRectPoints(w, h, r, tail);
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) segs.push([...pts[i], ...pts[i + 1]]);
    this.setSegments(segs);
    this.w = w; this.h = h;
    return this;
  }
}

/** canvas texture of an AI chat bubble with text (cornea reflections, small screens). aspect 7:3 */
export function bubbleTexture(ctx, text, { w = 700, h = 300, color = '#7FE9FF' } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.strokeStyle = color; c.lineWidth = 4;
  c.shadowColor = color; c.shadowBlur = 10;
  c.beginPath(); c.roundRect(40, 50, w - 80, h - 100, [48, 48, 48, 12]); c.stroke();
  c.shadowBlur = 0;
  ctx.text.draw(c, text, w / 2, h / 2 + 30, { role: 'ai', size: 92, color: '#E8FDFF', align: 'center', glow: 10, glowColor: color });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
