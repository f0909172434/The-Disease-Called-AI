// Lyrics overlay — style guide §5. Drawn on a 2D canvas band at the bottom of the frame and
// composited AFTER post FX (never bloomed / glitched / grained).
//
// Modes (decided by the active scene's `lyricMode`, string or function(t)):
//   'karaoke'        EN line (per-syllable highlight) + ZH line + speaker label
//   'subtitle-only'  only the ZH line (EN is already on screen inside the interface)
//   'hidden'         nothing
// Per-line style override: scene.lyricStyle(line, t) -> { font: 'human'|'ai', color, zhColor,
//   label, cursor (bool), cursorColor, align: 'left'|'center' } (e.g. S10: AI wearing her font).
import * as THREE from 'three';
import { C, rgba } from './palette.js';
import { clamp, outCubic } from './ease.js';

const ALNUM = /[\p{L}\p{N}]/u;

/** map each character of `text` to a syllable index (sequential, case-insensitive matching) */
export function mapSyllables(text, syllables) {
  const chars = [...text];
  const lower = chars.map((c) => c.toLowerCase());
  const assign = new Array(chars.length).fill(-1);
  let pos = 0;
  syllables.forEach((s, si) => {
    const sc = [...String(s.text).toLowerCase()].filter((c) => ALNUM.test(c));
    for (const ch of sc) {
      let p = pos;
      while (p < chars.length && lower[p] !== ch) p++;
      if (p < chars.length) { assign[p] = si; pos = p + 1; }
    }
  });
  // gaps (spaces, punctuation, unmatched): inherit previous syllable; leading gap -> first syllable
  let prev = -1;
  for (let i = 0; i < assign.length; i++) {
    if (assign[i] >= 0) prev = assign[i];
    else assign[i] = prev;
  }
  const first = assign.find((a) => a >= 0) ?? 0;
  for (let i = 0; i < assign.length && assign[i] < 0; i++) assign[i] = first;
  return assign;
}

const LABELS = { you: 'you', ai: 'assistant', both: 'you + assistant' };

export class LyricsOverlay {
  constructor(renderer, text, timeline, W, H) {
    this.renderer = renderer;
    this.text = text;
    this.W = W; this.H = H;
    this.u = H / 1080;
    this.bandTop = Math.floor(H * 0.64);
    this.bandH = H - this.bandTop;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W; this.canvas.height = this.bandH;
    this.c2d = this.canvas.getContext('2d');
    // raw sRGB bytes, premultiplied on upload, composited in display space like the browser does
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.premultiplyAlpha = true;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.NearestFilter;
    const y0 = -1, y1 = -1 + (2 * this.bandH) / H;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, y0, 0, 1, y0, 0, 1, y1, 0, -1, y0, 0, 1, y1, 0, -1, y1, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ gl_FragColor = texture2D(map, vUv); }',
      transparent: true, depthTest: false, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._lastKey = null;
    this.setLines(timeline.lyrics || []);
  }

  setLines(lines) {
    this.lines = [...lines].sort((a, b) => a.start - b.start).map((l) => ({
      ...l,
      syllables: l.syllables && l.syllables.length ? l.syllables : [{ text: l.text, start: l.start, end: l.end }],
    }));
    for (const l of this.lines) l._assign = mapSyllables(l.text, l.syllables);
  }

  _isAI(line, st) {
    if (st && st.font) return st.font === 'ai';
    return line.speaker === 'ai' || line.style === 'ai' || line.style === 'ai_her';
  }

  /** visibility + vertical offset of every line at t (newest two at most) */
  _activeLines(t) {
    const out = [];
    for (const l of this.lines) {
      const ai = this._isAI(l, null);
      const tin = l.start - (ai ? 0 : 0.25);
      const tout = l.end + 0.35;
      if (t < tin || t >= tout) continue;
      let a = ai ? 1 : clamp((t - tin) / 0.12);
      if (t > l.end) a *= 1 - (t - l.end) / 0.35;
      out.push({ line: l, alpha: a, tin, shift: 0 });
    }
    out.sort((x, y) => x.tin - y.tin);
    // overlap: older lines move up 46px and fade (over 0.25 s from the newer line's entrance)
    for (let i = 0; i < out.length - 1; i++) {
      const newer = out[out.length - 1];
      const k = clamp((t - newer.tin) / 0.25);
      out[i].shift = -46 * outCubic(k);
      out[i].alpha *= 1 - k;
    }
    return out.filter((o) => o.alpha > 0.004).slice(-2);
  }

  _draw(t, active, mode) {
    const c = this.c2d, u = this.u, W = this.W, top = this.bandTop;
    c.clearRect(0, 0, W, this.bandH);
    if (!active.length || mode === 'hidden') return;
    // readability gradient: bottom 22%, VOID 0 -> 55%
    const vis = Math.max(...active.map((a) => a.alpha));
    const g0 = this.H * 0.78 - top;
    const grad = c.createLinearGradient(0, g0, 0, this.bandH);
    grad.addColorStop(0, rgba('VOID', 0));
    grad.addColorStop(1, rgba('VOID', 0.55 * vis));
    c.fillStyle = grad;
    c.fillRect(0, g0, W, this.bandH - g0);

    const left = W * 0.08, right = W * 0.92;
    for (const a of active) {
      const l = a.line;
      const st = a.style;
      const ai = this._isAI(l, st);
      const align = st.align || 'left';
      const enY = this.H * 0.865 - top + a.shift * u;
      const zhY = this.H * 0.925 - top + a.shift * u;
      if (mode === 'karaoke') {
        const color = st.color || (ai ? C.AI_CYAN : C.HUMAN_SKIN);
        let size = 46 * u;
        const style = ai
          ? { role: 'ai', size, color, tracking: 0.02 }
          : { role: 'human', size, color, jitter: 0.5 * u, seed: l.start * 1000 | 0 };
        let w = this.text.measure(l.text, style).width;
        if (w > right - left) { size *= (right - left) / w; style.size = size; w = this.text.measure(l.text, style).width; }
        const x = align === 'center' ? (W - w) / 2 : left;
        const syl = l.syllables;
        const assign = l._assign;
        const sylAlpha = syl.map((s) => 0.4 + 0.6 * clamp((t - s.start) / 0.06));
        const sylGlow = syl.map((s) => (t < s.start ? 0 : t <= s.end ? 1 : Math.exp(-(t - s.end) / 0.25)));
        this.text.draw(c, l.text, x, enY, { ...style, alpha: a.alpha, glow: 14 * u, glowAlpha: 0.75 }, {
          charAlpha: (i) => sylAlpha[assign[i]] ?? 1,
          charGlow: (i) => sylGlow[assign[i]] ?? 0,
        });
        // AI cursor: after the last sung character, stepped blink once the line is done
        if (ai && st.cursor !== false) {
          const lay = this.text.charLayout(l.text, style);
          let lastSung = -1;
          for (let i = 0; i < assign.length; i++) if (t >= syl[assign[i]].start) lastSung = i;
          const done = t >= l.end;
          const cx = x + (lastSung >= 0 ? lay[lastSung].x + lay[lastSung].w : 0) + 6 * u;
          const blink = done ? (Math.floor(t * 2.4) % 2 === 0 ? 1 : 0.15) : 1;
          c.globalAlpha = a.alpha * blink;
          c.fillStyle = st.cursorColor || color;
          c.fillRect(cx, enY - size * 0.74, size * 0.42, size * 0.9);
          c.globalAlpha = 1;
        }
        // speaker label: top-left of the EN line
        const label = st.label ?? LABELS[l.speaker] ?? l.speaker;
        if (label) {
          this.text.draw(c, label, x, enY - size * 1.02, {
            role: 'ui', size: 13 * u, weight: 600, tracking: 0.12, caps: false,
            color: st.labelColor || color, alpha: 0.45 * a.alpha,
          });
        }
      }
      if (mode === 'karaoke' || mode === 'subtitle-only') {
        if (l.zh) {
          const zcol = st.zhColor || (ai ? C.AI_WHITE : C.HUMAN_SKIN);
          const zstyle = ai ? { role: 'sans', size: 36 * u, color: zcol, weight: 400 } : { role: 'title', size: 36 * u, color: zcol, weight: 400 };
          const zw = this.text.measure(l.zh, zstyle).width;
          const zx = align === 'center' ? (W - zw) / 2 : left;
          this.text.draw(c, l.zh, zx, zhY, { ...zstyle, alpha: 0.9 * a.alpha });
        }
      }
    }
  }

  /** draw (if changed) and composite onto the current framebuffer */
  render(t, mode = 'karaoke', styleFn = null) {
    const active = mode === 'hidden' ? [] : this._activeLines(t);
    let key = mode + '|';
    for (const a of active) {
      a.style = styleFn ? (styleFn(a.line, t) || {}) : {};
      key += JSON.stringify(a.style);
      const l = a.line;
      const sylKey = l.syllables.map((s) => Math.round(clamp((t - s.start) / 0.06) * 32) + ':' + (t < s.start ? 0 : t <= s.end ? 32 : Math.round(Math.exp(-(t - s.end) / 0.25) * 32))).join(',');
      const ai = this._isAI(l, null);
      key += `${l.id}@${Math.round(a.alpha * 128)}/${Math.round(a.shift * 2)}/${sylKey}/${ai && t >= l.end ? Math.floor(t * 2.4) % 2 : 'x'};`;
    }
    if (key !== this._lastKey) {
      this._draw(t, active, mode);
      this.texture.needsUpdate = true;
      this._lastKey = key;
    }
    if (!active.length) return;
    const r = this.renderer;
    const prev = r.autoClear;
    r.autoClear = false;
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
    r.autoClear = prev;
  }
}
