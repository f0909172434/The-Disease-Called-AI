// KineticText — big type in 3D, one quad per glyph (cut from a single high-res text texture so
// kerning is preserved), animated per glyph on the CPU (a few dozen glyphs: cheap).
//
//   const k = new KineticText(ctx, 'DISEASE', { role: 'ui', size: 220, weight: 800, color: C.AI_WHITE }, { height: 0.6 });
//   scene.add(k);
//   k.update(t, { slam: { at: 56.0 }, glitch: audio.pulse('snare', t, 0.08) });
//
// States (all optional; combine freely):
//   slam   { at, dur=0.16, from=2.6, stagger=0 }      smash in (scale from `from`, motion-blur alpha)
//   type   { at, rate=14 | times:[...], pop=true }      human typewriter (glyph i at times[i] / at+i/rate)
//   decode { at, dur=0.6, rate=24 }                    AI decode: scrambled glyphs resolve left -> right
//   glitch (0..1)                                      per-glyph jitter / dropouts (quantized at 30 Hz)
//   split  { at, force=1 }                             glyphs fly apart, spinning
//   drop   { indices:[...], at }                       chosen glyphs fall away (e.g. 'A.' leaving 'I')
//   pulse (0..1) scale bump    opacity    brightness   color (THREE.Color multiplier)   tracking (extra em)
// k.width = world width of the laid-out line.
import * as THREE from 'three';
import { canvasMaterial, canvasTexture } from '../core/text.js';
import { hash01 } from '../core/rng.js';
import { clamp, outExpo, outBack, outCubic, inQuad } from '../core/ease.js';

const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&@$*+=<>/\\[]{}';

export class KineticText extends THREE.Group {
  constructor(ctx, text, style = {}, { height = 0.5, align = 'center', additive = true } = {}) {
    super();
    this.ctx = ctx;
    this.text = text;
    this.style = { role: 'ui', size: 200, color: '#ffffff', ...style };
    const ts = ctx.text;
    const cv = ts.canvas(text, this.style, { pad: 8 });
    const m = cv._metrics;
    this.texture = canvasTexture(cv);
    const lay = ts.charLayout(text, this.style);
    const unit = height / cv.height;           // world units per canvas px
    const totalW = (m.textWidth) * unit;
    const x0 = align === 'center' ? -totalW / 2 : align === 'right' ? -totalW : 0;
    // scramble atlas (same style) for decode
    const sc = document.createElement('canvas');
    const cellW = Math.ceil(this.style.size * 0.75), cellH = cv.height;
    const cols = 16, rows = Math.ceil(SCRAMBLE.length / cols);
    sc.width = cols * cellW; sc.height = rows * cellH;
    const c2 = sc.getContext('2d');
    [...SCRAMBLE].forEach((ch, i) => {
      ts.draw(c2, ch, (i % cols) * cellW + cellW / 2, Math.floor(i / cols) * cellH + m.baseline, { ...this.style, align: 'center' });
    });
    this.scrambleTex = canvasTexture(sc);
    this.scr = { cols, rows, cellW, cellH, w: sc.width, h: sc.height };
    this.glyphs = [];
    lay.forEach((g, i) => {
      if (g.ch === ' ') return;
      const padL = this.style.size * 0.12, padR = this.style.size * 0.22;
      const px0 = m.pad + g.x - padL, px1 = m.pad + g.x + g.w + padR;
      const gw = (px1 - px0) * unit, gh = height;
      const geo = new THREE.PlaneGeometry(gw, gh);
      const uv = geo.getAttribute('uv');
      const u0 = px0 / cv.width, u1 = px1 / cv.width;
      uv.setXY(0, u0, 1); uv.setXY(1, u1, 1); uv.setXY(2, u0, 0); uv.setXY(3, u1, 0);
      const mat = canvasMaterial({ map: this.texture, additive });
      const scrMat = canvasMaterial({ map: this.scrambleTex, additive });
      const mesh = new THREE.Mesh(geo, mat);
      const cx = x0 + ((px0 + px1) / 2 - m.pad) * unit;
      mesh.position.set(cx, 0, 0);
      this.add(mesh);
      this.glyphs.push({ ch: g.ch, i, mesh, mat, scrMat, base: new THREE.Vector3(cx, 0, 0), u0, u1, gw, scrGeo: null, origGeo: geo });
    });
    this.width = totalW;
    this.height = height;
    this.color = new THREE.Color(1, 1, 1);
    Object.assign(this, { opacity: 1, brightness: 1, pulse: 0, glitch: 0, slam: null, type: null, decode: null, split: null, drop: null });
  }

  _setScrambleUV(g, k) {
    const { cols, rows } = this.scr;
    const cx = k % cols, cy = Math.floor(k / cols);
    if (!g.scrGeo) { g.scrGeo = new THREE.PlaneGeometry(g.gw, this.height); }
    const uv = g.scrGeo.getAttribute('uv');
    const u0 = cx / cols, u1 = (cx + 1) / cols, v1 = 1 - cy / rows, v0 = 1 - (cy + 1) / rows;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    uv.needsUpdate = true;
  }

  update(t, states = {}) {
    // reset transient effects each frame (pure function of t): only keys passed this frame apply
    this.slam = this.type = this.decode = this.split = this.drop = null;
    this.glitch = 0; this.pulse = 0; this.opacity = 1; this.brightness = 1;
    Object.assign(this, states);
    const n = this.glyphs.length;
    const fq = Math.floor(t * 30);
    this.glyphs.forEach((g, k) => {
      let alpha = 1, s = 1, ox = 0, oy = 0, oz = 0, rz = 0;
      let useScr = false;
      if (this.slam) {
        const sl = this.slam;
        const tt = (t - sl.at - (sl.stagger || 0) * k) / (sl.dur || 0.16);
        if (tt < 0) alpha = 0;
        else if (tt < 1) { const e = outExpo(tt); s *= (sl.from || 2.6) + (1 - (sl.from || 2.6)) * e; alpha *= Math.min(1, tt * 3); }
      }
      if (this.type) {
        const ty = this.type;
        const at = ty.times ? ty.times[k] ?? Infinity : ty.at + k / (ty.rate || 14);
        if (t < at) alpha = 0;
        else if (ty.pop !== false) { const e = clamp((t - at) / 0.12); s *= 0.85 + 0.15 * outBack(e, 1.2); oy += (hash01(k, 3) - 0.5) * this.height * 0.02; }
      }
      if (this.decode) {
        const d = this.decode;
        const resolve = d.at + (d.dur ?? 0.6) * (n > 1 ? k / (n - 1) : 1);
        if (t < d.at) alpha = 0;
        else if (t < resolve) {
          useScr = true;
          const step = Math.floor(t * (d.rate || 24));
          this._setScrambleUV(g, Math.floor(hash01(k, step, 17) * SCRAMBLE.length));
        }
      }
      if (this.glitch > 0) {
        const h = hash01(k, fq, 5);
        if (h < this.glitch * 0.5) ox += (hash01(k, fq, 7) - 0.5) * this.height * 0.5 * this.glitch;
        if (hash01(k, fq, 9) < this.glitch * 0.12) alpha *= 0.15;
        oy += (hash01(k, fq, 11) - 0.5) * this.height * 0.06 * this.glitch;
      }
      if (this.split) {
        const sp = this.split, tt = Math.max(0, t - sp.at);
        if (tt > 0) {
          const f = sp.force ?? 1;
          const dx = (g.base.x / Math.max(0.001, this.width / 2)) + (hash01(k, 21) - 0.5);
          ox += dx * tt * 1.6 * f; oy += (hash01(k, 23) - 0.3) * tt * 1.2 * f - tt * tt * 1.5 * f; oz += (hash01(k, 25) - 0.5) * tt * 2 * f;
          rz += (hash01(k, 27) - 0.5) * tt * 6 * f;
          alpha *= clamp(1 - tt / 1.2);
        }
      }
      if (this.drop && this.drop.indices.includes(k)) {
        const tt = Math.max(0, t - this.drop.at);
        oy -= inQuad(clamp(tt / 0.9)) * this.height * 3; rz += tt * 0.9 * (hash01(k, 31) - 0.3); alpha *= clamp(1 - tt / 0.9);
      }
      s *= 1 + 0.06 * this.pulse;
      g.mesh.position.set(g.base.x * (1 + 0.06 * this.pulse) + ox, g.base.y + oy, g.base.z + oz);
      g.mesh.scale.setScalar(s);
      g.mesh.rotation.z = rz;
      const mat = useScr ? g.scrMat : g.mat;
      if (g.mesh.material !== mat) g.mesh.material = mat;
      if (useScr && g.mesh.geometry !== g.scrGeo) g.mesh.geometry = g.scrGeo;
      if (!useScr && g.scrGeo && g.mesh.geometry === g.scrGeo) g.mesh.geometry = this._origGeo(g);
      mat.uniforms.opacity.value = alpha * this.opacity;
      mat.uniforms.brightness.value = this.brightness;
      mat.uniforms.color.value.copy(this.color);
      g.mesh.visible = alpha * this.opacity > 0.002;
    });
    return this;
  }
  _origGeo(g) { return g.origGeo; }
}
