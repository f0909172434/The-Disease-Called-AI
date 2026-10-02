// Text system: canvas 2D text -> THREE.CanvasTexture, with font roles, tracking, per-char human
// jitter, glow, wrapping (Latin words + CJK chars), measurement and caching.
//
//   const tex = ctx.text.texture('Always.', { role: 'ai', size: 64, color: C.AI_CYAN, glow: 18 });
//   const s = ctx.text.sprite('are you there?', { role: 'human', size: 72, color: C.HUMAN_AMBER }, { height: 0.2 });
//   scene.add(s);  s.setText('you there?');  s.opacity = 0.5;
//   ctx.text.draw(ctx2d, 'hello', x, y, style)        // draw into your own canvas (baseline at y)
//   ctx.text.charLayout('hello', style) -> [{ch, x, w}] // per-character positions (kerning kept)
//
// Style fields: role ('ai'|'human'|'ui'|'title'|'sans'|'serif'|'mono'), size (px), weight, italic,
// color, alpha, tracking (em), caps, glow (blur px), glowColor, glowAlpha, jitter (px), seed,
// align ('left'|'center'|'right'), lineHeight (x size), maxWidth (px, wraps), stroke {width,color}.
import * as THREE from 'three';
import { cssFont, ROLE_DEFAULTS } from './fonts.js';
import { hash01 } from './rng.js';

const CJK_RE = /[⺀-鿿豈-﫿︰-﹏＀-￯]/;

export function isCJK(ch) { return CJK_RE.test(ch); }

function normStyle(style) {
  const role = style.role || 'sans';
  const d = ROLE_DEFAULTS[role] || {};
  return {
    role, size: style.size || 32, weight: style.weight ?? d.weight, italic: style.italic ?? d.italic,
    color: style.color || '#ffffff', alpha: style.alpha ?? 1, tracking: style.tracking ?? d.tracking ?? 0,
    caps: style.caps ?? d.caps ?? false, glow: style.glow || 0, glowColor: style.glowColor || style.color || '#ffffff',
    glowAlpha: style.glowAlpha ?? 1, jitter: style.jitter || 0, seed: style.seed || 0,
    align: style.align || 'left', lineHeight: style.lineHeight || 1.25, maxWidth: style.maxWidth || 0,
    stroke: style.stroke || null,
  };
}

export class TextSystem {
  constructor() {
    this._mc = document.createElement('canvas').getContext('2d');
    this._cache = new Map(); // key -> {texture, ...}
    this._layoutCache = new Map();
    this.maxCache = 400;
  }

  font(role, size, opts) { return cssFont(role, size, opts); }

  _setFont(c, s) {
    c.font = cssFont(s.role, s.size, { weight: s.weight, italic: s.italic });
  }

  /** advance width (with tracking) + font ascent/descent */
  measure(str, style = {}) {
    const s = normStyle(style);
    const text = s.caps ? str.toUpperCase() : str;
    const c = this._mc;
    this._setFont(c, s);
    const m = c.measureText(text);
    const n = [...text].length;
    const width = m.width + Math.max(0, n - 1) * s.tracking * s.size;
    const ascent = m.fontBoundingBoxAscent ?? s.size * 0.8;
    const descent = m.fontBoundingBoxDescent ?? s.size * 0.25;
    return { width, ascent, descent, height: ascent + descent, inkAscent: m.actualBoundingBoxAscent, inkDescent: m.actualBoundingBoxDescent };
  }

  /** per-character x positions (prefix widths keep kerning) for one line */
  charLayout(str, style = {}) {
    const s = normStyle(style);
    const text = s.caps ? str.toUpperCase() : str;
    const key = `${s.role}|${s.size}|${s.weight}|${s.italic}|${s.tracking}|${text}`;
    const hit = this._layoutCache.get(key);
    if (hit) return hit;
    const c = this._mc;
    this._setFont(c, s);
    const chars = [...text];
    const out = [];
    let prefix = '';
    let prevW = 0;
    for (let i = 0; i < chars.length; i++) {
      const x = prevW + i * s.tracking * s.size;
      prefix += chars[i];
      const w = c.measureText(prefix).width;
      out.push({ ch: chars[i], x, w: w - prevW });
      prevW = w;
    }
    out.width = prevW + Math.max(0, chars.length - 1) * s.tracking * s.size;
    if (this._layoutCache.size > 2000) this._layoutCache.clear();
    this._layoutCache.set(key, out);
    return out;
  }

  /** greedy wrap: Latin breaks at spaces, CJK anywhere; explicit \n respected */
  wrap(str, style = {}) {
    const s = normStyle(style);
    const paragraphs = str.split('\n');
    if (!s.maxWidth) return paragraphs;
    const lines = [];
    for (const para of paragraphs) {
      const tokens = para.match(/[⺀-鿿豈-﫿＀-￯][，。、；：？！」』）]*|\S+\s*|\s+/g) || [''];
      let line = '';
      for (const tok of tokens) {
        const cand = line + tok;
        if (line && this.measure(cand.trimEnd(), s).width > s.maxWidth) {
          lines.push(line.trimEnd());
          line = tok.trimStart();
        } else line = cand;
      }
      lines.push(line.trimEnd());
    }
    return lines;
  }

  /**
   * Draw one line with baseline at (x, y). Handles tracking, jitter, glow, stroke, alignment.
   * opts.charAlpha(i, ch) -> alpha multiplier per char (karaoke); opts.charColor(i, ch) -> css color
   * Returns the advance width.
   */
  draw(c, str, x, y, style = {}, opts = {}) {
    const s = normStyle(style);
    const text = s.caps ? str.toUpperCase() : str;
    const lay = this.charLayout(text, { ...s, caps: false });
    const width = lay.width;
    let x0 = x;
    if (s.align === 'center') x0 = x - width / 2;
    else if (s.align === 'right') x0 = x - width;
    c.save();
    this._setFont(c, s);
    c.textBaseline = 'alphabetic';
    c.textAlign = 'left';
    const perChar = s.jitter > 0 || opts.charAlpha || opts.charColor || opts.charGlow;
    const passes = s.glow > 0 ? [true, false] : [false];
    for (const glowPass of passes) {
      if (glowPass) {
        c.shadowColor = s.glowColor;
        c.shadowBlur = s.glow;
        c.globalAlpha = s.alpha * s.glowAlpha;
      } else {
        c.shadowColor = 'transparent';
        c.shadowBlur = 0;
        c.globalAlpha = s.alpha;
      }
      if (!perChar) {
        c.fillStyle = s.color;
        c.letterSpacing = `${s.tracking * s.size}px`;
        if (s.stroke && !glowPass) { c.lineWidth = s.stroke.width; c.strokeStyle = s.stroke.color || s.color; c.lineJoin = 'round'; c.strokeText(text, x0, y); }
        c.fillText(text, x0, y);
        c.letterSpacing = '0px';
      } else {
        for (let i = 0; i < lay.length; i++) {
          const g = lay[i];
          if (g.ch === ' ') continue;
          const a = opts.charAlpha ? opts.charAlpha(i, g.ch) : 1;
          if (a <= 0.001) continue;
          let gx = x0 + g.x, gy = y;
          if (s.jitter > 0) {
            gx += (hash01(i, s.seed, 1) - 0.5) * 2 * s.jitter;
            gy += (hash01(i, s.seed, 2) - 0.5) * 2 * s.jitter;
          }
          const cg = opts.charGlow ? opts.charGlow(i, g.ch) : 1;
          if (glowPass) {
            if (cg <= 0.001) continue;
            c.globalAlpha = s.alpha * s.glowAlpha * a * cg;
          } else c.globalAlpha = s.alpha * a;
          c.fillStyle = opts.charColor ? opts.charColor(i, g.ch) : s.color;
          if (glowPass && opts.charColor) c.shadowColor = c.fillStyle;
          if (s.stroke && !glowPass) { c.lineWidth = s.stroke.width; c.strokeStyle = s.stroke.color || c.fillStyle; c.lineJoin = 'round'; c.strokeText(g.ch, gx, gy); }
          c.fillText(g.ch, gx, gy);
        }
      }
    }
    c.restore();
    return width;
  }

  /** multi-line block; (x,y) = top-left (or top-center/right per align). Returns {width,height,lines} */
  drawBlock(c, str, x, y, style = {}, opts = {}) {
    const s = normStyle(style);
    const lines = this.wrap(str, s);
    const m = this.measure('Hg你', s);
    const lh = s.size * s.lineHeight;
    let w = 0;
    lines.forEach((ln, i) => {
      w = Math.max(w, this.draw(c, ln, x, y + m.ascent + i * lh, { ...style, seed: (s.seed || 0) + i * 101 }, opts));
    });
    return { width: w, height: lh * (lines.length - 1) + m.ascent + m.descent, lines };
  }

  /** render text into a tight canvas (with padding for glow/jitter). */
  canvas(str, style = {}, opts = {}) {
    const s = normStyle(style);
    const pad = Math.ceil((opts.pad ?? 0) + s.glow * 1.6 + s.jitter + 2 + (s.stroke ? s.stroke.width : 0));
    const lines = this.wrap(s.caps ? str.toUpperCase() : str, s);
    const m = this.measure('Hg你', s);
    const lh = s.size * s.lineHeight;
    let w = 1;
    for (const ln of lines) w = Math.max(w, this.measure(ln, { ...s, caps: false }).width);
    const italicExtra = s.italic ? s.size * 0.18 : 0;
    const cw = Math.ceil(w + pad * 2 + italicExtra);
    const ch = Math.ceil(m.ascent + m.descent + lh * (lines.length - 1) + pad * 2);
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const c = cv.getContext('2d');
    const ax = s.align === 'center' ? cw / 2 : s.align === 'right' ? cw - pad - italicExtra : pad;
    lines.forEach((ln, i) => this.draw(c, ln, ax, pad + m.ascent + i * lh, { ...s, caps: false, seed: s.seed + i * 101 }, opts));
    cv._metrics = { pad, ascent: m.ascent, descent: m.descent, textWidth: w, lineHeight: lh, lines: lines.length, baseline: pad + m.ascent };
    return cv;
  }

  /** cached CanvasTexture for (str, style). Returns {texture, width, height, aspect, metrics} */
  texture(str, style = {}, opts = {}) {
    const key = JSON.stringify([str, style, opts.pad || 0]);
    const hit = this._cache.get(key);
    if (hit) { this._cache.delete(key); this._cache.set(key, hit); return hit; }
    const cv = this.canvas(str, style, opts);
    const tex = canvasTexture(cv);
    const entry = { texture: tex, width: cv.width, height: cv.height, aspect: cv.width / cv.height, metrics: cv._metrics, canvas: cv };
    this._cache.set(key, entry);
    if (this._cache.size > this.maxCache) {
      const oldest = this._cache.keys().next().value;
      this._cache.get(oldest).texture.dispose();
      this._cache.delete(oldest);
    }
    return entry;
  }

  /** a plane mesh showing text; height = world height of the canvas (incl. padding) */
  sprite(str, style = {}, opts = {}) {
    return new TextSprite(this, str, style, opts);
  }
}

/**
 * Material for premultiplied-alpha canvas textures (text, UI panels). Correct edge blending with
 * mipmaps; opacity scales rgb and alpha. additive: true -> glow-style ONE/ONE blending.
 * Uniforms: map, color (multiplier), opacity, brightness (rgb gain, may exceed 1 to feed bloom).
 */
export function canvasMaterial({ map = null, additive = false, color = 0xffffff, opacity = 1, brightness = 1, side = THREE.DoubleSide, depthTest = true } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map }, color: { value: new THREE.Color(color) },
      opacity: { value: opacity }, brightness: { value: brightness },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity; uniform float brightness; varying vec2 vUv;
      void main(){ vec4 t = texture2D(map, vUv); gl_FragColor = vec4(t.rgb * color * opacity * brightness, t.a * opacity); }`,
    transparent: true, depthWrite: false, depthTest, side,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

/** CanvasTexture configured for the premultiplied pipeline */
export function canvasTexture(canvas, { mipmaps = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = true;
  tex.generateMipmaps = mipmaps;
  tex.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = mipmaps ? 4 : 1;
  return tex;
}

/**
 * Mesh showing a text texture. World size: height = opts.height (default 1) for the full canvas,
 * width follows the aspect. opts.anchor: 'center' (default) | 'left' | 'right'.
 * Props: opacity, brightness, color (THREE.Color multiplier), setText(str), setStyle(style).
 * opts.additive: glow-style blending.
 */
export class TextSprite extends THREE.Mesh {
  constructor(textSystem, str, style, opts = {}) {
    super(new THREE.PlaneGeometry(1, 1), canvasMaterial({ additive: !!opts.additive }));
    this.ts = textSystem;
    this.style = style;
    this.opts = opts;
    this.worldHeight = opts.height ?? 1;
    this.anchor = opts.anchor || 'center';
    this.text = null;
    this.setText(str);
  }
  setText(str) {
    if (str === this.text) return this;
    this.text = str;
    const e = this.ts.texture(str, this.style, this.opts);
    this.entry = e;
    this.material.uniforms.map.value = e.texture;
    const h = this.worldHeight, w = h * e.aspect;
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(w, h);
    if (this.anchor === 'left') this.geometry.translate(w / 2 - (e.metrics.pad / e.height) * h, 0, 0);
    if (this.anchor === 'right') this.geometry.translate(-w / 2 + (e.metrics.pad / e.height) * h, 0, 0);
    return this;
  }
  setStyle(style) { this.style = style; const t = this.text; this.text = null; return this.setText(t); }
  get opacity() { return this.material.uniforms.opacity.value; }
  set opacity(v) { this.material.uniforms.opacity.value = v; this.visible = v > 0.001; }
  get brightness() { return this.material.uniforms.brightness.value; }
  set brightness(v) { this.material.uniforms.brightness.value = v; }
  get color() { return this.material.uniforms.color.value; }
  /** world units per canvas pixel */
  get unitsPerPx() { return this.worldHeight / this.entry.height; }
  /** world width of the text ink box (without padding) */
  get textWorldWidth() { return this.entry.metrics.textWidth * this.unitsPerPx; }
}
