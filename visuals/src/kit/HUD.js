// HUD — medical monitor overlay: ECGLine (a PQRST blip per kick onset, sweep display), ♥ BPM,
// TEMP, DOSAGE, clock and session timer. Canvas widgets on planes; units are HUD pixels (use with
// a scene's `hud` overlay: origin at frame center, y up), or place in 3D and scale down.
//
//   const hud = new HUD(ctx, { layout: 'monitor' });  this.hud.add(hud);
//   hud.update(t, { bpm: 172, temp: 41.2, dosage: '∞', clock: '07:00', session: t - 22.3 });
//
// States: bpm, temp, dosage (string), clock (string), session (seconds), ecgOnset ('kick'),
//   ecgWindow (seconds across the trace), ecgColor (css), show: { ecg, vitals, clock, session },
//   opacity, glow (0..1). Layouts: 'monitor' (bottom-right stack), 'clock' (top-right clock only),
//   'ecg-wide' (full-width trace), 'card' (ECG only, for the diagnosis card). hud.widgets.<name>.mesh
//   can also be positioned manually.
import * as THREE from 'three';
import { C, rgba } from '../core/palette.js';
import { cssFont } from '../core/fonts.js';
import { canvasMaterial, canvasTexture } from '../core/text.js';

/** single PQRST complex, dt seconds after the beat (compressed to fit fast tempos) */
export function pqrst(dt) {
  if (dt < 0 || dt > 0.42) return 0;
  const g = (mu, s, a) => a * Math.exp(-((dt - mu) ** 2) / (2 * s * s));
  return g(0.045, 0.016, 0.12) + g(0.098, 0.006, -0.16) + g(0.118, 0.0075, 1.0) + g(0.139, 0.007, -0.3) + g(0.27, 0.034, 0.21);
}

class Widget {
  constructor(w, h, scale = 1.5) {
    this.w = w; this.h = h; this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(w * scale); this.canvas.height = Math.round(h * scale);
    this.c = this.canvas.getContext('2d');
    this.texture = canvasTexture(this.canvas, { mipmaps: false });
    this.material = canvasMaterial({ map: this.texture, depthTest: false });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.material);
    this.key = null;
  }
  begin() { const c = this.c; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.canvas.width, this.canvas.height); c.setTransform(this.scale, 0, 0, this.scale, 0, 0); return c; }
  commit() { this.texture.needsUpdate = true; }
}

export class HUD extends THREE.Group {
  constructor(ctx, { layout = 'monitor', scale = 1.5 } = {}) {
    super();
    this.ctx = ctx;
    this.widgets = {
      ecg: new Widget(760, 150, scale),
      vitals: new Widget(460, 210, scale),
      clock: new Widget(300, 110, scale),
      session: new Widget(380, 54, scale),
    };
    for (const w of Object.values(this.widgets)) this.add(w.mesh);
    Object.assign(this, { bpm: 172, temp: 41.2, dosage: '∞', clock: '07:00', session: 0, ecgOnset: 'kick', ecgWindow: 2.4,
      ecgColor: C.AI_WHITE, show: { ecg: true, vitals: true, clock: true, session: true }, opacity: 1, glow: 1 });
    this.setLayout(layout);
  }

  setLayout(name) {
    const { W, H } = this.ctx;
    const u = H / 1080;
    this.scale.setScalar(1);
    const w = this.widgets;
    const set = (wd, x, y, s = 1) => { wd.mesh.position.set(x, y, 0); wd.mesh.scale.setScalar(s * u); };
    if (name === 'monitor') {
      set(w.ecg, W / 2 - 80 * u - 380 * u, -H / 2 + 230 * u);
      set(w.vitals, W / 2 - 80 * u - 230 * u, -H / 2 + 400 * u);
      set(w.clock, -W / 2 + 80 * u + 150 * u, H / 2 - 110 * u);
      set(w.session, -W / 2 + 80 * u + 190 * u, H / 2 - 180 * u);
    } else if (name === 'clock') {
      set(w.clock, W / 2 - 90 * u - 150 * u, H / 2 - 100 * u);
      set(w.session, W / 2 - 90 * u - 190 * u, H / 2 - 165 * u);
      this.show = { ecg: false, vitals: false, clock: true, session: false };
    } else if (name === 'ecg-wide') {
      set(w.ecg, 0, -H / 2 + 160 * u, W / 800);
    } else if (name === 'card') {
      set(w.ecg, 0, -H * 0.3, 1.2);
      this.show = { ecg: true, vitals: false, clock: false, session: false };
    }
    this.layout = name;
    return this;
  }

  _drawECG(t) {
    const wd = this.widgets.ecg, a = this.ctx.audio;
    const win = this.ecgWindow, Wc = wd.w, Hc = wd.h;
    const sweep = ((t % win) + win) % win / win * Wc;
    const key = `${Math.round(t * 240)}|${this.ecgOnset}|${win}|${this.ecgColor}|${this.glow}`;   // exact per frame
    if (key === wd.key) return;
    wd.key = key;
    const c = wd.begin();
    // faint grid
    c.strokeStyle = rgba('AI_CYAN', 0.07); c.lineWidth = 1;
    for (let x = 0; x <= Wc; x += 38) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x, Hc - 8); c.stroke(); }
    for (let y = 8; y <= Hc - 8; y += 38) { c.beginPath(); c.moveTo(0, y); c.lineTo(Wc, y); c.stroke(); }
    const onsets = a.onsetsIn(this.ecgOnset, t - win - 0.5, t + 1e-6);
    const valueAt = (tx) => { let v = 0; for (const o of onsets) v += pqrst(tx - o); return v; };
    const base = Hc * 0.68, amp = Hc * 0.55;
    const gap = 26;
    c.lineJoin = 'round'; c.lineCap = 'round';
    const pts = [];
    for (let x = 0; x <= Wc; x += 1.5) {
      const ahead = x <= sweep;
      const tx = ahead ? t - (sweep - x) / Wc * win : t - (sweep + Wc - x) / Wc * win;
      if (!ahead && x < sweep + gap) { pts.push(null); continue; }
      const age = ahead ? (sweep - x) / Wc : (sweep + Wc - x) / Wc;
      pts.push([x, base - valueAt(tx) * amp, age]);
    }
    // draw with glow, older parts dimmer
    for (const pass of [0, 1]) {
      c.shadowColor = this.ecgColor; c.shadowBlur = pass === 0 ? 14 * this.glow : 0;
      c.lineWidth = pass === 0 ? 3.2 : 1.6;
      let started = false;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!p) { started = false; continue; }
        if (!started) { c.beginPath(); c.moveTo(p[0], p[1]); started = true; continue; }
        c.lineTo(p[0], p[1]);
        if (i % 8 === 0 || i === pts.length - 1 || !pts[i + 1]) {
          c.strokeStyle = rgba(this.ecgColor, (pass === 0 ? 0.35 : 0.95) * (1 - p[2] * 0.8));
          c.stroke(); c.beginPath(); c.moveTo(p[0], p[1]);
        }
      }
    }
    // sweep head
    const hx = sweep, hy = base - valueAt(t) * amp;
    c.shadowBlur = 18; c.shadowColor = this.ecgColor; c.fillStyle = C.WHITE;
    c.beginPath(); c.arc(hx, hy, 3.2, 0, Math.PI * 2); c.fill();
    c.shadowBlur = 0;
    c.font = cssFont('ui', 12, { weight: 600 }); c.letterSpacing = '1.5px'; c.fillStyle = rgba('AI_WHITE', 0.5);
    c.fillText('ECG  II', 8, 22); c.letterSpacing = '0px';
    wd.commit();
  }

  _drawVitals(t) {
    const wd = this.widgets.vitals, a = this.ctx.audio;
    const beat = Math.round(Math.exp(-a.since(this.ecgOnset, t) / 0.12) * 16) / 16;   // draw from the quantized value
    const key = `${this.bpm}|${this.temp}|${this.dosage}|${beat}`;
    if (key === wd.key) return;
    wd.key = key;
    const c = wd.begin();
    const label = (s, x, y) => { c.font = cssFont('ui', 13, { weight: 600 }); c.letterSpacing = '1.6px'; c.fillStyle = rgba('AI_WHITE', 0.5); c.fillText(s, x, y); c.letterSpacing = '0px'; };
    // heart
    c.save();
    c.translate(36, 62); c.scale(1 + beat * 0.18, 1 + beat * 0.18);
    c.fillStyle = C.FEVER; c.shadowColor = C.FEVER; c.shadowBlur = 10 + beat * 16;
    c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(-26, -4, -14, -24, 0, -10); c.bezierCurveTo(14, -24, 26, -4, 0, 14); c.fill();
    c.restore();
    c.font = cssFont('mono', 64, { weight: 700 }); c.fillStyle = C.AI_WHITE; c.shadowColor = rgba('AI_WHITE', 0.5); c.shadowBlur = 10;
    c.fillText(String(Math.round(this.bpm)), 74, 86);
    c.shadowBlur = 0;
    label('BPM', 200, 84);
    label('TEMP', 16, 140);
    c.font = cssFont('mono', 30, { weight: 400 }); c.fillStyle = C.FEVER;
    c.fillText(`${Number(this.temp).toFixed(1)}°C`, 16, 176);
    label('DOSAGE', 232, 140);
    c.font = cssFont('mono', 34, { weight: 400 }); c.fillStyle = C.AI_CYAN;
    c.fillText(String(this.dosage), 232, 178);
    c.fillStyle = rgba('AI_CYAN', 0.15); c.fillRect(0, 108, wd.w, 1);
    wd.commit();
  }

  _drawClock() {
    const wd = this.widgets.clock;
    const key = this.clock;
    if (key === wd.key) return;
    wd.key = key;
    const c = wd.begin();
    c.font = cssFont('mono', 64, { weight: 400 }); c.fillStyle = C.AI_WHITE;
    c.shadowColor = rgba('AI_CYAN', 0.6); c.shadowBlur = 12;
    c.fillText(this.clock, 8, 76);
    c.shadowBlur = 0;
    wd.commit();
  }

  _drawSession() {
    const wd = this.widgets.session;
    const s = Math.max(0, Math.floor(this.session));
    const txt = `SESSION  ${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (txt === wd.key) return;
    wd.key = txt;
    const c = wd.begin();
    c.font = cssFont('ui', 15, { weight: 600 }); c.letterSpacing = '2px'; c.fillStyle = rgba('AI_CYAN', 0.75);
    c.fillText(txt, 8, 34); c.letterSpacing = '0px';
    wd.commit();
  }

  update(t, states = {}) {
    // per-frame defaults (no carry-over between out-of-order frames); `show` is layout config
    Object.assign(this, { bpm: 172, temp: 41.2, dosage: '∞', clock: '07:00', session: 0, ecgOnset: 'kick', ecgWindow: 2.4, ecgColor: C.AI_WHITE, opacity: 1, glow: 1 }, states);
    const w = this.widgets, sh = this.show;
    for (const [k, wd] of Object.entries(w)) { wd.mesh.visible = !!sh[k] && this.opacity > 0.001; wd.material.uniforms.opacity.value = this.opacity; }
    if (sh.ecg) this._drawECG(t);
    if (sh.vitals) this._drawVitals(t);
    if (sh.clock) this._drawClock();
    if (sh.session) this._drawSession();
    return this;
  }
}
