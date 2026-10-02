// ChatUI — the chat window, drawn on a 2D canvas and shown as a texture on a plane (placeable in 3D).
// Everything is a pure function of t derived from a script of time-stamped events.
//
//   const chat = new ChatUI(ctx, { width: 900, height: 1100, planeHeight: 2 });
//   chat.setScript({
//     header: { title: 'assistant', status: 'online' },
//     messages: [
//       { id: 'q1', from: 'you', text: 'what should I wear today?', at: 27.9, seen: { at: 30, text: 'Seen 2 days ago' } },
//       { id: 'a1', from: 'ai', text: '1. the grey sweater\n2. black jeans', at: 28.4, stream: { rate: 22 } },
//       { id: 'a2', from: 'ai', text: "I'm a language model.", at: 142.3, tokenTimes: [142.3, 142.5, ...] },
//       { id: 'a3', from: 'ai', text: 'You deserve—', at: 147.9, stream: { rate: 22 }, rewind: { at: 148.7, dur: 0.35 } },
//       { id: 'q2', from: 'you', text: 'Now every word I say is yours', at: 128, swap: { start: 128.4, end: 131 } },
//       { from: 'ai', dots: [44.9, 46.2] },                       // typing indicator bubble only
//     ],
//     input: { events: audio.events('typing'), ghost: { at: 36.3, text: "te Jess that I can't come tonight", rate: 40 },
//              sendAt: 5.47, placeholder: 'Message assistant…', caretColor: C.AI_CYAN },
//     regenerate: { show: [143.5, 153], clicks: [145.0, 147.8], counter: [[143.5, 1, 1], [145.1, 2, 2]] },
//   });
//   chat.update(t);        // redraws the canvas only when the visible state changed
//
// Options: theme 'panel' (window with header) | 'minimal' (no panel, underline input) ; scale (canvas
// px per logical px) ; mipmaps ; fontScale. chat.mesh is the plane; chat.texture the CanvasTexture.
// depth (logical px, default 0 = flat): bubbles, the typing-dots bubble, the input field and the panel
//   become real glass slabs (kit/Glass.js) with that thickness behind the text plane; the canvas then
//   only draws text/icons. Tilt the chat (chat.rotation.y) or move the camera to see the thickness.
// glass: { bevel (px, 5), body, edge, sheen } overrides for the slabs.
import * as THREE from 'three';
import { C, rgba } from '../core/palette.js';
import { cssFont } from '../core/fonts.js';
import { canvasMaterial, canvasTexture } from '../core/text.js';
import { hash01 } from '../core/rng.js';
import { clamp, outBack, outCubic } from '../core/ease.js';
import { GlassSlab } from './Glass.js';

const TOKEN_RE = /\s*[\w'’]+|\s*[^\w\s]|\s+/gu;
export function tokenize(text) { return text.match(TOKEN_RE) || []; }

/** replay typing events up to t -> current input string (supports '\b' backspace and '\n' send) */
export function typedText(events, t) {
  let s = '';
  for (const e of events) {
    if (e.t > t) break;
    if (e.ch === '\b') s = s.slice(0, -1);
    else if (e.ch === '\n') s = '';
    else s += e.ch;
  }
  return s;
}

export class ChatUI extends THREE.Group {
  constructor(ctx, opts = {}) {
    super();
    this.ctx = ctx;
    this.o = {
      width: 900, height: 1100, scale: 1.25, planeHeight: 2, theme: 'panel', mipmaps: true, fontScale: 1,
      bubbleMax: 0.74, depth: 0, glass: {}, ...opts,
    };
    const { width, height, scale } = this.o;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(width * scale);
    this.canvas.height = Math.round(height * scale);
    this.c = this.canvas.getContext('2d');
    this.texture = canvasTexture(this.canvas, { mipmaps: this.o.mipmaps });
    this.material = canvasMaterial({ map: this.texture });
    const ph = this.o.planeHeight;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(ph * width / height, ph), this.material);
    this.add(this.mesh);
    this.slabs = [];          // glass slab pool (depth > 0)
    this._rects = [];         // slab rectangles recorded by the last canvas draw (same key => same rects)
    this.script = { messages: [] };
    this._key = null;
    this.opacity = 1;
    this.brightness = 1;
    const fs = this.o.fontScale;
    this.fonts = {
      you: { role: 'human', size: 34 * fs, color: C.HUMAN_SKIN },
      ai: { role: 'ai', size: 25 * fs, color: C.AI_CYAN },
      ui: { role: 'ui', size: 14 * fs, color: C.UNREAD },
    };
  }

  setScript(script) {
    this.script = { messages: [], ...script };
    this.script.messages = this.script.messages.map((m, i) => ({ id: m.id || `m${i}`, ...m, _tokens: m.text ? tokenize(m.text) : [] }));
    this._key = null;
    return this;
  }

  // ------------------------------------------------------------ state at t
  _visibleChars(m, t) {
    const total = [...(m.text || '')].length;
    if (m.from !== 'ai') return t >= m.at ? total : 0;
    let n = total;
    const toks = m._tokens;
    const lens = toks.map((tk) => [...tk].length);
    let shown = toks.length;
    if (m.tokenTimes) shown = m.tokenTimes.filter((x) => x <= t).length;
    else if (m.stream && m.stream !== 'instant') {
      const start = m.stream.start ?? m.at;
      shown = t < start ? 0 : Math.floor((t - start) * (m.stream.rate || 22)) + 1;
    } else if (t < m.at) shown = 0;
    shown = Math.min(shown, toks.length);
    if (m.rewind && t >= m.rewind.at) {
      const k = clamp((t - m.rewind.at) / (m.rewind.dur || 0.35));
      shown = Math.round(shown * (1 - k));
    }
    n = lens.slice(0, shown).reduce((a, b) => a + b, 0);
    return n;
  }
  _streamDone(m, t) {
    if (m.from !== 'ai') return true;
    return this._visibleChars(m, t) >= [...(m.text || '')].length;
  }
  _swapCount(m, t) {
    if (m.swapTimes) return m.swapTimes.filter((x) => x <= t).length;
    if (!m.swap) return 0;
    const n = [...m.text].length;
    return Math.floor(clamp((t - m.swap.start) / Math.max(1e-6, m.swap.end - m.swap.start)) * n + 1e-6);
  }

  // ------------------------------------------------------------ rich text layout
  _layoutRich(chars, maxW) {
    // chars: [{ch, style}] -> lines of positioned glyphs; wraps at spaces
    const c = this.c;
    const words = [];
    let cur = [];
    for (const g of chars) {
      cur.push(g);
      if (g.ch === ' ' || g.ch === '\n') { words.push(cur); cur = []; }
    }
    if (cur.length) words.push(cur);
    const measure = (g) => {
      c.font = cssFont(g.style.role, g.style.size, { weight: g.style.weight });
      return c.measureText(g.ch).width + (g.style.role === 'ai' ? g.style.size * 0.02 : 0);
    };
    const lines = [];
    let line = [], x = 0;
    for (const w of words) {
      const ww = w.reduce((a, g) => a + (g.ch === '\n' ? 0 : (g._w ??= measure(g))), 0);
      if (x + ww > maxW && line.length) { lines.push({ glyphs: line, width: x }); line = []; x = 0; }
      for (const g of w) {
        if (g.ch === '\n') { lines.push({ glyphs: line, width: x }); line = []; x = 0; continue; }
        line.push({ ...g, x }); x += g._w;
      }
    }
    lines.push({ glyphs: line, width: x });
    // trim trailing spaces from widths
    for (const l of lines) {
      let w = l.width;
      for (let i = l.glyphs.length - 1; i >= 0 && l.glyphs[i].ch === ' '; i--) w -= l.glyphs[i]._w;
      l.width = Math.max(0, w);
    }
    return lines;
  }

  _messageModel(m, t) {
    const W = this.o.width;
    const maxW = W * this.o.bubbleMax - 44;
    const human = m.from === 'you';
    const all = [...(m.text || '')];
    const vis = this._visibleChars(m, t);
    const swapN = this._swapCount(m, t);
    // layout the FULL text (stable wrapping while streaming); reveal progressively
    const chars = all.map((ch, i) => {
      const toAI = human && i < swapN;
      return { ch, i, style: human && !toAI ? this.fonts.you : this.fonts.ai, ai: !human || toAI, swapped: toAI };
    });
    const lines = this._layoutRich(chars, maxW);
    const lh = (human ? 1.18 : 1.45) * (human ? this.fonts.you.size : this.fonts.ai.size);
    const tw = Math.max(...lines.map((l) => l.width), human ? 20 : 30);
    const padX = 22, padY = human ? 14 : 16;
    return { m, human, lines, lh, vis, w: tw + padX * 2, h: lines.length * lh + padY * 2, padX, padY };
  }

  // ------------------------------------------------------------ drawing
  _roundRect(x, y, w, h, r, fill, stroke, lw = 1.5) {
    const c = this.c;
    c.beginPath();
    c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  }

  _drawBubble(model, x, y, t, alpha, scale) {
    const c = this.c;
    const { human, lines, lh, vis, w, h, padX, padY, m } = model;
    c.save();
    c.globalAlpha = alpha;
    const cx = human ? x + w : x, cy = y + h;
    c.translate(cx, cy); c.scale(scale, scale); c.translate(-cx, -cy);
    if (this.o.depth > 0) {
      this._rects.push({ kind: human ? 'you' : 'ai', x, y, w, h, r: human ? [22, 22, 6, 22] : [22, 22, 22, 6], alpha, scale, ax: cx, ay: cy, clip: true });
    } else if (human) {
      this._roundRect(x, y, w, h, [22, 22, 6, 22], rgba('HUMAN_AMBER', 0.1), rgba('HUMAN_AMBER', 0.42), 1.4);
    } else {
      this._roundRect(x, y, w, h, [22, 22, 22, 6], rgba('INK', 0.55), rgba('AI_CYAN', 0.75), 1.6);
    }
    // rewind: VHS displacement bands across the bubble
    const rewinding = m.rewind && t >= m.rewind.at && t < m.rewind.at + (m.rewind.dur || 0.35);
    let k = 0;
    lines.forEach((ln, li) => {
      const by = y + padY + lh * (li + 0.78);
      let dx = 0;
      if (rewinding) dx = (hash01(li, Math.floor(t * 30)) - 0.5) * 30;
      for (const g of ln.glyphs) {
        const idx = g.i;
        k++;
        if (idx >= vis) continue;
        const st = g.style;
        c.font = cssFont(st.role, st.size, { weight: st.weight });
        c.fillStyle = st.color;
        let gx = x + padX + g.x + dx, gy = by;
        if (!g.ai) { gx += (hash01(idx, 7) - 0.5) * 1.0; gy += (hash01(idx, 11) - 0.5) * 1.0; }
        if (g.ai) { c.shadowColor = rgba('AI_CYAN', 0.6); c.shadowBlur = 8; } else { c.shadowColor = rgba('HUMAN_AMBER', 0.35); c.shadowBlur = 6; }
        c.fillText(g.ch, gx, gy);
      }
    });
    c.shadowBlur = 0;
    // AI block cursor at the end of the streamed text
    if (!human && (!this._streamDone(m, t) || (t - this._doneTime(m) < 0.9 && Math.floor(t * 3.3) % 2 === 0))) {
      let cxp = x + padX, cyp = y + padY;
      let found = false;
      lines.forEach((ln, li) => {
        for (const g of ln.glyphs) {
          if (g.i === vis - 1) { cxp = x + padX + g.x + g._w + 3; cyp = y + padY + lh * li; found = true; }
        }
      });
      if (!found && vis > 0) { const ll = lines[lines.length - 1]; cxp = x + padX + ll.width + 3; cyp = y + padY + lh * (lines.length - 1); }
      c.fillStyle = C.AI_CYAN;
      c.fillRect(cxp, cyp + lh * 0.18, this.fonts.ai.size * 0.45, lh * 0.66);
    }
    c.restore();
  }
  _doneTime(m) {
    if (m.tokenTimes) return m.tokenTimes[m.tokenTimes.length - 1];
    if (m.stream && m.stream !== 'instant') return (m.stream.start ?? m.at) + (m._tokens.length - 1) / (m.stream.rate || 22);
    return m.at;
  }

  _drawDots(x, y, t, alpha, color = C.AI_CYAN) {
    const c = this.c;
    const w = 92, h = 50;
    c.save();
    c.globalAlpha = alpha;
    if (this.o.depth > 0) this._rects.push({ kind: 'dots', x, y, w, h, r: [22, 22, 22, 6], alpha, scale: 1, ax: x, ay: y + h, clip: true });
    else this._roundRect(x, y, w, h, [22, 22, 22, 6], rgba('INK', 0.55), rgba('AI_CYAN', 0.6), 1.4);
    const beat = this.ctx.audio ? this.ctx.audio.beatDur : 0.349;
    for (let i = 0; i < 3; i++) {
      const ph = ((t / (beat / 2)) - i) % 3;
      const k = ph >= 0 && ph < 1 ? 1 - ph : 0;
      c.fillStyle = color;
      c.globalAlpha = alpha * (0.3 + 0.7 * k);
      c.beginPath(); c.arc(x + 26 + i * 20, y + h / 2 - k * 3, 5 + k * 1.2, 0, Math.PI * 2); c.fill();
    }
    c.restore();
    return h;
  }

  _drawInput(t, y0) {
    const c = this.c, s = this.script, inp = s.input || {};
    const W = this.o.width;
    const minimal = this.o.theme === 'minimal';
    const x = minimal ? 40 : 28, w = W - x * 2, h = 66;
    const typed = inp.events ? typedText(inp.events, t) : (inp.text || '');
    const active = typed.length > 0 || (inp.focus ?? true);
    if (minimal) {
      c.fillStyle = rgba(typed ? 'HUMAN_AMBER' : 'AI_CYAN', typed ? 0.45 : 0.35);
      c.fillRect(x, y0 + h - 8, w, 1.5);
    } else if (this.o.depth > 0) {
      this._rects.push({ kind: typed ? 'input-typed' : 'input', x, y: y0, w, h, r: [18, 18, 18, 18], alpha: 1, scale: 1, ax: x, ay: y0, clip: false });
    } else {
      this._roundRect(x, y0, w, h, 18, rgba('INK', 0.8), rgba(typed ? 'HUMAN_AMBER' : 'UNREAD', typed ? 0.5 : 0.4), 1.3);
    }
    const st = this.fonts.you;
    const by = y0 + h / 2 + st.size * 0.32;
    let xx = x + 22;
    c.font = cssFont(st.role, st.size);
    if (!typed && inp.placeholder && !(inp.events && inp.events.length && t >= inp.events[0].t)) {
      c.font = cssFont('ui', 18, { weight: 400 });
      c.fillStyle = rgba('UNREAD', 0.8);
      c.fillText(inp.placeholder, xx, y0 + h / 2 + 6);
    }
    c.font = cssFont(st.role, st.size);
    const chars = [...typed];
    chars.forEach((ch, i) => {
      c.fillStyle = C.HUMAN_AMBER;
      c.shadowColor = rgba('HUMAN_AMBER', 0.4); c.shadowBlur = 6;
      c.fillText(ch, xx + (hash01(i, 3) - 0.5), by + (hash01(i, 5) - 0.5));
      xx += c.measureText(ch).width;
    });
    c.shadowBlur = 0;
    // ghost completion (AI): cyan mono chars appearing after the typed text
    if (inp.ghost && t >= inp.ghost.at) {
      const g = inp.ghost;
      const n = Math.min([...g.text].length, Math.floor((t - g.at) * (g.rate || 40)) + 1);
      c.font = cssFont('ai', this.fonts.ai.size);
      c.fillStyle = rgba('AI_CYAN', 0.75);
      c.shadowColor = rgba('AI_CYAN', 0.5); c.shadowBlur = 8;
      c.fillText([...g.text].slice(0, n).join(''), xx + 2, by);
      c.shadowBlur = 0;
    }
    // caret: solid while typing, stepped blink when idle
    const lastKey = inp.events ? inp.events.filter((e) => e.t <= t).pop() : null;
    const idle = !lastKey || t - lastKey.t > 0.5;
    const on = !idle || Math.floor(t / 0.53) % 2 === 0;
    if (on && active && !(inp.ghost && t >= inp.ghost.at)) {
      c.fillStyle = inp.caretColor || C.AI_CYAN;
      c.fillRect(xx + 3, y0 + h / 2 - st.size * 0.42, 2.5, st.size * 0.84);
    }
    return h;
  }

  _drawRegenerate(x, y, t) {
    const c = this.c, rg = this.script.regenerate;
    const clicks = (rg.clicks || []).filter((k) => k <= t);
    const lastClick = clicks.length ? clicks[clicks.length - 1] : -1e9;
    const flash = Math.exp(-(t - lastClick) / 0.18);
    const hover = rg.hover && rg.hover.some(([a, b]) => t >= a && t < b) ? 1 : 0;
    const w = 168, h = 40;
    c.save();
    const sc = 1 - 0.05 * flash;
    c.translate(x + w / 2, y + h / 2); c.scale(sc, sc); c.translate(-(x + w / 2), -(y + h / 2));
    this._roundRect(x, y, w, h, 20, rgba('AI_CYAN', 0.08 + 0.5 * flash + 0.08 * hover), rgba('AI_CYAN', 0.55 + 0.3 * hover), 1.3);
    c.font = cssFont('ui', 16, { weight: 600 });
    c.fillStyle = flash > 0.5 ? C.INK : C.AI_CYAN;
    c.fillText('↻  Regenerate', x + 22, y + h / 2 + 6);
    c.restore();
    // "Response n / N"
    const ctr = (rg.counter || []).filter((r) => r[0] <= t).pop();
    if (ctr) {
      c.font = cssFont('ui', 14, { weight: 400 });
      c.fillStyle = rgba('UNREAD', 0.95);
      c.fillText(`‹  Response ${ctr[1]} / ${ctr[2]}  ›`, x + w + 18, y + h / 2 + 5);
    }
    return h;
  }

  /** draw state at t (only if changed) */
  update(t, states = {}) {
    Object.assign(this, { opacity: 1, brightness: 1 }, states);   // per-frame defaults (no carry-over)
    this.material.uniforms.opacity.value = this.opacity;
    this.material.uniforms.brightness.value = this.brightness;
    this.visible = this.opacity > 0.001;
    const s = this.script;
    const msgs = s.messages.filter((m) => {
      const start = m.dots ? m.dots[0] : m.at;
      if (t < start) return false;
      if (m.removeAt !== undefined && t >= m.removeAt) return false;
      if (m.dots && !m.text && t >= m.dots[1]) return false;
      return true;
    });
    // state key: everything that affects pixels
    const inp = s.input || {};
    const typed = inp.events ? typedText(inp.events, t) : '';
    const keyParts = [msgs.map((m) => `${m.id}:${t < m.at ? 'd' + Math.floor(t / (this.ctx.audio.beatDur / 2)) : this._visibleChars(m, t)}:${this._swapCount(m, t)}:${Math.round(clamp((t - m.at) / 0.25) * 20)}:${m.seen && t >= m.seen.at ? 1 : 0}:${m.rewind && t >= m.rewind.at && t < m.rewind.at + 0.4 ? Math.floor(t * 30) : 0}:${!this._streamDone(m, t) || t - this._doneTime(m) < 0.9 ? Math.floor(t * 3.3) % 2 : 'x'}`).join('|'),
      typed, inp.ghost && t >= inp.ghost.at ? Math.floor((t - inp.ghost.at) * (inp.ghost.rate || 40)) : -1,
      Math.floor(t / 0.53) % 2, inp.events ? (inp.events.filter((e) => e.t <= t).pop()?.t ?? -1) : -1];
    let animating = false;
    if (s.regenerate) {
      const rg = s.regenerate;
      const lc = (rg.clicks || []).filter((k) => k <= t).pop() ?? -1e9;
      const hover = rg.hover && rg.hover.some(([a, b]) => t >= a && t < b);
      keyParts.push(t >= rg.show[0] && t < rg.show[1], hover, JSON.stringify((rg.counter || []).filter((r) => r[0] <= t).pop() || 0));
      if (t - lc < 1.2) animating = true;
    }
    // continuous animations (dots, pop-ins, slides, rewind, ghost) -> exact per-frame key, so a
    // cached canvas is only reused when the drawing is provably identical (out-of-order safe)
    for (const m of msgs) {
      if (m.dots && t < (m.at ?? Infinity)) animating = true;
      if (m.from === 'you' && t - m.at < 0.3) animating = true;
      if (m.from === 'ai' && t - m.at < 1 / 15) animating = true;
      if (m.rewind && t >= m.rewind.at - 0.05 && t < m.rewind.at + (m.rewind.dur || 0.35) + 0.05) animating = true;
    }
    if (animating) keyParts.push(Math.round(t * 240));
    const key = keyParts.join('#');
    if (key !== this._key) {
      this._key = key;
      this._draw(t, msgs);
      this.texture.needsUpdate = true;
    }
    if (this.o.depth > 0) this._applySlabs(t);
    return this;
  }

  // glass slabs behind the text plane, from the rectangles recorded by the last draw
  _applySlabs(t) {
    const o = this.o, W = o.width, H = o.height, ph = o.planeHeight, pw = ph * W / H, k = ph / H;
    const g = { bevel: 5, body: null, edge: null, sheen: 1, ...o.glass };
    const STYLE = {
      ai: { color: 'AI_CYAN', body: 0.55, edge: 0.85, z: 0 },
      dots: { color: 'AI_CYAN', body: 0.55, edge: 0.7, z: 0 },
      you: { color: 'HUMAN_AMBER', body: 0.3, edge: 0.75, z: 0 },
      input: { color: 'AI_CYAN', body: 0.7, edge: 0.45, z: 0 },
      'input-typed': { color: 'HUMAN_AMBER', body: 0.7, edge: 0.7, z: 0 },
      panel: { color: 'AI_CYAN', body: 0.88, edge: 0.3, z: -1.7, thick: 0.7 },
    };
    const [cTop, cBot] = this._clipY || [0, H];
    const yTop = (0.5 - cTop / H) * ph, yBot = (0.5 - cBot / H) * ph;
    let i = 0;
    for (const r of this._rects) {
      const st = STYLE[r.kind];
      if (!this.slabs[i]) {
        const slab = new GlassSlab(this.ctx, { color: st.color });
        slab.renderOrder = this.mesh.renderOrder - 1;
        this.slabs.push(slab);
        this.add(slab);
      }
      const slab = this.slabs[i++];
      const sc = r.scale, x0 = r.ax + (r.x - r.ax) * sc, y0 = r.ay + (r.y - r.ay) * sc, w = r.w * sc, h = r.h * sc;
      const depth = o.depth * k;
      slab.position.set(((x0 + w / 2) / W - 0.5) * pw, (0.5 - (y0 + h / 2) / H) * ph, st.z * depth - 0.0008 * ph);
      slab.renderOrder = this.mesh.renderOrder - (r.kind === 'panel' ? 2 : 1);
      slab.update(t, {
        width: w * k, height: h * k, radius: r.r.map((v) => v * sc * k), thickness: depth * (st.thick || 1), bevel: g.bevel * k,
        color: st.color, body: g.body ?? st.body, edge: g.edge ?? st.edge, sheen: g.sheen,
        opacity: this.opacity * r.alpha, brightness: this.brightness,
        clip: r.clip ? [yBot - slab.position.y, yTop - slab.position.y] : null,
      });
    }
    for (; i < this.slabs.length; i++) this.slabs[i].update(t, { opacity: 0 });
  }

  _draw(t, msgs) {
    const c = this.c, o = this.o, s = this.script;
    const W = o.width, H = o.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(o.scale, 0, 0, o.scale, 0, 0);
    c.textBaseline = 'alphabetic';
    const panel = o.theme === 'panel';
    this._rects = [];
    let top = 18;
    if (panel) {
      if (o.depth > 0) this._rects.push({ kind: 'panel', x: 1, y: 1, w: W - 2, h: H - 2, r: [28, 28, 28, 28], alpha: 1, scale: 1, ax: 0, ay: 0, clip: false });
      else this._roundRect(1, 1, W - 2, H - 2, 28, rgba('INK', 0.92), rgba('AI_CYAN', 0.16), 1.5);
      const hd = s.header || { title: 'assistant', status: 'online' };
      const online = hd.status !== 'offline';
      c.fillStyle = online ? C.AI_CYAN : C.UNREAD;
      c.beginPath(); c.arc(36, 40, 5, 0, Math.PI * 2); c.fill();
      c.font = cssFont('ui', 15, { weight: 600 });
      c.letterSpacing = '1.8px';
      c.fillStyle = rgba('AI_WHITE', 0.8);
      c.fillText(String(hd.title || 'assistant').toUpperCase(), 52, 46);
      c.letterSpacing = '0px';
      c.fillStyle = rgba('AI_CYAN', 0.12);
      c.fillRect(24, 72, W - 48, 1);
      top = 84;
    }
    const inputH = s.input || panel ? 66 : 0;
    const bottom = H - (s.input || panel ? inputH + 26 : 20);
    if (s.input || panel) this._drawInput(t, H - inputH - 18);
    // regenerate row under the newest AI message
    const rg = s.regenerate;
    const showRg = rg && t >= rg.show[0] && t < rg.show[1];
    // bottom-anchored stack; newest at the bottom, older ones pushed up with an eased slide
    const models = msgs.map((m) => (m.text && t >= m.at ? this._messageModel(m, t) : { m, dots: true, h: 50, w: 92, human: false }));
    const gap = 16;
    let y = bottom - (showRg ? 56 : 0);
    const placed = [];
    for (let i = models.length - 1; i >= 0; i--) {
      const md = models[i];
      const extra = md.m.seen && t >= md.m.seen.at ? 22 : 0;
      // slide-in of this item pushes items above it; ease by its own age
      const age = t - (md.dots ? md.m.dots[0] : md.m.at);
      const k = md.human ? outCubic(clamp(age / 0.22)) : (age < 1 / 30 ? 0.5 : 1);
      const hh = (md.h + gap + extra) * k;
      y -= hh;
      placed.push({ md, y: y + (md.h + gap + extra) * (1 - k) * 0.0, k, age, extra });
    }
    this._clipY = [top, bottom + 4];
    c.save();
    c.beginPath(); c.rect(0, top, W, bottom - top + 4); c.clip();
    for (const p of placed) {
      const { md, k, age } = p;
      const yy = p.y;
      if (yy + md.h < top - 10) continue;
      if (md.dots) { this._drawDots(26, yy, t, 1); continue; }
      const x = md.human ? W - 26 - md.w : 26;
      const alpha = md.human ? clamp(age / 0.12) : 1;
      const sc = md.human ? 0.94 + 0.06 * outBack(clamp(age / 0.25), 1.2) : 1;
      this._drawBubble(md, x, yy, t, alpha, sc);
      if (md.m.seen && t >= md.m.seen.at) {
        c.font = cssFont('ui', 13, { weight: 400 });
        c.fillStyle = rgba('UNREAD', 0.9 * clamp((t - md.m.seen.at) / 0.3));
        const tw = c.measureText(md.m.seen.text).width;
        c.fillText(md.m.seen.text, md.human ? W - 30 - tw : 30, yy + md.h + 17);
      }
    }
    c.restore();
    if (showRg) this._drawRegenerate(26, bottom - 46, t);
  }
}
