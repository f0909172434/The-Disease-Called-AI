// lyrics.js: fonts and the bilingual karaoke overlay (docs/05_style_guide.md §2 fonts, §5 lyrics overlay).
// The overlay is drawn on the 2D compositor after the painted frame and before the paper grain, so it sits in the paper.
//
// Per shot: shots([[t0, fn, { lyricMode, lyricStyle }], ...]) or fn.lyricMode / fn.lyricStyle.
//   lyricMode: 'karaoke' (default) | 'subtitle-only' (中文 only: the EN is already in the picture) | 'hidden',
//              or (t, lt) => one of those. Loops (model sheets) default to 'hidden'. ?lyrics=<mode> overrides everything.
//   lyricStyle(line, t) -> { font: 'human'|'ai', color, zhColor, label, labelColor, cursor, cursorColor,
//              align: 'left'|'center', band (0..1 strength of the dark readability band), outline (css colour or null) }
//              e.g. the final chorus swap: lyricStyle: l => l.ai ? { font: 'human', color: TOKENS.HUMAN_AMBER } : { font: 'ai', color: TOKENS.AI_CYAN }
// Speakers: 'you' (him, the human), 'ai', 'both'. Any style starting with 'ai' (ai, ai_him = the AI singing in his voice,
// ai_*_spoken) is the AI; human, human_trembling, choir are human.

// style guide §1 colour tokens
const TOKENS = {
  VOID: '#05060A', INK: '#0B0E14', NAVY: '#070B16', AI_CYAN: '#7FE9FF', AI_WHITE: '#E8FDFF', AI_DEEP: '#1B6FFF',
  HUMAN_AMBER: '#FFB070', HUMAN_SKIN: '#FFD9B8', HUMAN_EMBER: '#FF6A3D', FEVER: '#FF2E63', BLOOD: '#B0002A', GOLD: '#FFD36E',
  UNREAD: '#6B7280', ERROR_BG: '#F4F4F2', ERROR_RED: '#FF3B30'
};
const LYRIC_CFG = {
  enY: .865, zhY: .925, margin: .08, enSize: 46, zhSize: 36, labelSize: 13,  // at 1080p
  band: .55, bandTop: .78, bandColor: '#05060A',                              // readability gradient: bottom 22 %, VOID 0 -> 55 %
  outline: 'rgba(24,18,30,.8)', outlineW: .085,                               // thin ink edge (em) so the light colours read on paper
  you: { color: TOKENS.HUMAN_SKIN, zh: TOKENS.HUMAN_SKIN }, ai: { color: TOKENS.AI_CYAN, zh: TOKENS.AI_WHITE },
  leadIn: .25, fadeIn: .12, fadeOut: .35, shift: 46, shiftT: .25,             // human lines fade in .12 s from .25 s early; AI: instant
  sylRise: .06, glow: 14, glowAlpha: .75, glowDecay: .25, jitter: .5
};
// On a light picture (white paper, a grey or daytime room) the pale colours vanish: the mean luminance of the subtitle band
// (sampled before the band is drawn) blends the text towards dark ink with a pale halo and thins the dark band away.
const LYRIC_LIGHT = { lo: .4, hi: .5, you: '#3A2214', youZh: '#3A2214', ai: '#07445A', aiZh: '#0A3342', halo: 'rgba(255,244,222,.9)', haloHi: '#FFE9C4' };
const LYRIC_LABELS = { you: 'you', ai: 'assistant', both: 'you + assistant' };

// ---------- fonts (local woff2 subsets in assets/fonts, built by tools/build_fonts.py; never the network) ----------
const FONT_STACKS = {
  ai: '"JetBrains Mono", "Noto Sans TC", "MV Symbols", monospace',
  human: '"Cormorant Garamond", "Noto Serif TC", "MV Symbols", serif',
  ui: '"Inter", "Noto Sans TC", "MV Symbols", sans-serif',
  title: '"Noto Serif TC", "Cormorant Garamond", "MV Symbols", serif',
  sans: '"Noto Sans TC", "Inter", "MV Symbols", sans-serif',
  serif: '"Cormorant Garamond", "Noto Serif TC", "MV Symbols", serif',
  mono: '"JetBrains Mono", "Noto Sans TC", "MV Symbols", monospace'
};
const FONT_ROLES = {
  ai: { weight: 400, italic: false, tracking: .02 }, human: { weight: 500, italic: true, tracking: 0 },
  ui: { weight: 600, italic: false, tracking: .12 }, title: { weight: 700, italic: false, tracking: 0 },
  sans: { weight: 400, italic: false, tracking: 0 }, serif: { weight: 400, italic: false, tracking: 0 }, mono: { weight: 400, italic: false, tracking: 0 }
};
// fontCSS('human', 46) -> 'italic 500 46px "Cormorant Garamond", ...' (for letter(..., { font }) and canvas text)
function fontCSS(role, size, o = {}) {
  const d = FONT_ROLES[role] || FONT_ROLES.sans, w = o.weight ?? d.weight, it = o.italic ?? d.italic;
  return `${it ? 'italic ' : ''}${w} ${size}px ${FONT_STACKS[role] || role}`;
}
let FONTS_OK = 0;
async function loadMVFonts(base = 'assets/fonts/') {
  const man = await mvJSON(base + 'fonts.json');
  if (!man) { console.warn('fonts: assets/fonts/fonts.json not reachable; lyrics fall back to system fonts'); return 0; }
  const bufs = {};
  await Promise.all(man.faces.map(async f => {
    const buf = await (bufs[f.file] = bufs[f.file] || mvGet(base + f.file, 'arraybuffer'));
    if (!buf) return;
    try { const ff = new FontFace(f.family, buf, { weight: String(f.weight), style: f.style }); await ff.load(); document.fonts.add(ff); FONTS_OK++; }
    catch (e) { console.warn(`font ${f.file}: ${e.message}`); }
  }));
  await document.fonts.ready;
  const c = document.createElement('canvas').getContext('2d');   // first use of a face can be lazy: rasterize once
  for (const r in FONT_STACKS) for (const it of [false, true]) { c.font = fontCSS(r, 20, { italic: it }); c.fillText('Aa你在嗎↻▍', 0, 20); }
  return FONTS_OK;
}

// ---------- karaoke layout ----------
const LYRIC_RE = /[\p{L}\p{N}]/u;
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`; }
// each character of the line -> index of the syllable it belongs to (sequential, case-insensitive matching)
function mapSyllables(text, syl) {
  const ch = [...text], lo = ch.map(c => c.toLowerCase()), as = new Array(ch.length).fill(-1); let pos = 0;
  syl.forEach((s, si) => {
    for (const x of [...String(s.text).toLowerCase()].filter(c => LYRIC_RE.test(c))) {
      let p = pos; while (p < ch.length && lo[p] !== x) p++;
      if (p < ch.length) { as[p] = si; pos = p + 1; }
    }
  });
  let prev = -1; for (let i = 0; i < as.length; i++) { if (as[i] >= 0) prev = as[i]; else as[i] = prev; }
  const first = as.find(a => a >= 0) ?? 0; for (let i = 0; i < as.length && as[i] < 0; i++) as[i] = first;
  return as;
}
// lines visible at t with their alpha and upward shift (newest two at most)
function lyricLayout(t) {
  const L = LYRIC_CFG, out = [];
  for (const l of LYRICS) {
    if (l.start - 1 > t) break;
    const tin = l.start - (l.ai ? 0 : L.leadIn), tout = l.end + L.fadeOut;
    if (t < tin || t >= tout) continue;
    let a = l.ai ? 1 : clamp((t - tin) / L.fadeIn);
    if (t > l.end) a *= 1 - (t - l.end) / L.fadeOut;
    out.push({ line: l, alpha: a, tin, shift: 0 });
  }
  out.sort((x, y) => x.tin - y.tin);
  const nw = out[out.length - 1];
  for (let i = 0; i < out.length - 1; i++) { const k = clamp((t - nw.tin) / L.shiftT); out[i].shift = -L.shift * easeOut(k); out[i].alpha *= 1 - k; }
  return out.filter(o => o.alpha > .004).slice(-2);
}
const LAYOUT_CACHE = new Map();      // pure memo of text measurement (font + string -> per-char x)
function charLayout(c, text, font, track) {
  const key = font + '|' + track + '|' + text; let r = LAYOUT_CACHE.get(key); if (r) return r;
  c.save(); c.font = font; const ch = [...text]; r = []; let pre = '', pw = 0;
  for (let i = 0; i < ch.length; i++) { pre += ch[i]; const w = c.measureText(pre).width; r.push({ ch: ch[i], x: pw + i * track, w: w - pw }); pw = w; }
  r.width = pw + Math.max(0, ch.length - 1) * track; c.restore();
  if (LAYOUT_CACHE.size > 4000) LAYOUT_CACHE.clear(); LAYOUT_CACHE.set(key, r); return r;
}
// one run of text, char by char: outline, glow and fill passes. per(i) -> { a, g } alpha / glow multipliers.
function lyricRun(c, text, x, y, font, track, col, alpha, o = {}) {
  const lay = charLayout(c, text, font, track), per = o.per || (() => ({ a: 1, g: 0 }));
  const P = lay.map((g, i) => { const q = per(i); return { ...g, a: q.a, g: q.g, dx: o.jitter ? (hash(o.seed + i * 7.3) - .5) * 2 * o.jitter : 0, dy: o.jitter ? (hash(o.seed + i * 3.1 + 50) - .5) * 2 * o.jitter : 0 }; });
  c.save(); c.font = font; c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.lineJoin = 'round';
  if (o.outline) {
    c.strokeStyle = o.outline; c.lineWidth = o.outlineW;
    for (const g of P) if (g.ch !== ' ' && g.a > .001) { c.globalAlpha = alpha * g.a; c.strokeText(g.ch, x + g.x + g.dx, y + g.dy); }
  }
  if (o.glow) {
    c.shadowColor = col; c.shadowBlur = o.glow; c.fillStyle = col;
    for (const g of P) if (g.ch !== ' ' && g.g > .001) { c.globalAlpha = alpha * LYRIC_CFG.glowAlpha * g.a * g.g; c.fillText(g.ch, x + g.x + g.dx, y + g.dy); }
    c.shadowColor = 'transparent'; c.shadowBlur = 0;
  }
  c.fillStyle = col;
  for (const g of P) if (g.ch !== ' ' && g.a > .001) { c.globalAlpha = alpha * g.a; c.fillText(g.ch, x + g.x + g.dx, y + g.dy); }
  c.restore();
  return lay;
}

let LYRIC_PROBE = null;
function lyricLightness(c) {   // 0 (dark picture) .. 1 (light picture): luminance of the bottom band, through a 24 x 6 downscale
  try {
    if (!LYRIC_PROBE) { const cv = document.createElement('canvas'); cv.width = 24; cv.height = 6; LYRIC_PROBE = { cv, g: cv.getContext('2d', { willReadFrequently: true }) }; }
    const y0 = Math.round(H * LYRIC_CFG.bandTop), g = LYRIC_PROBE.g; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(c.canvas, 0, y0, W, H - y0, 0, 0, 24, 6);
    const d = g.getImageData(0, 0, 24, 6).data; let sum = 0; for (let i = 0; i < d.length; i += 4) sum += (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255;
    return clamp((sum / (d.length / 4) - LYRIC_LIGHT.lo) / (LYRIC_LIGHT.hi - LYRIC_LIGHT.lo));
  } catch (e) { return 0; }
}
function drawLyrics(c, t, mode = 'karaoke', styleFn = null) {
  if (mode === 'hidden' || !LYRICS.length) return;
  const act = lyricLayout(t); if (!act.length) return;
  const L = LYRIC_CFG, u = H / 1080, left = W * L.margin, right = W * (1 - L.margin);
  for (const a of act) a.st = (styleFn && styleFn(a.line, t)) || {};
  const lk = lyricLightness(c);
  // readability band under the text (it fades out on a light picture, where the text goes dark instead)
  const band = Math.max(...act.map(a => a.alpha * (a.st.band ?? L.band))) * (1 - lk);
  if (band > .002) {
    const y0 = H * L.bandTop, g = c.createLinearGradient(0, y0, 0, H), col = hexRGB(L.bandColor);
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${band})`);
    c.save(); c.fillStyle = g; c.fillRect(0, y0, W, H - y0); c.restore();
  }
  for (const a of act) {
    const l = a.line, st = a.st, ai = st.font ? st.font === 'ai' : l.ai, pal = ai ? L.ai : L.you, align = st.align || 'left';
    const outline0 = st.outline === undefined ? L.outline : st.outline, outline = lk > .5 && outline0 ? LYRIC_LIGHT.halo : outline0, enY = H * L.enY + a.shift * u, zhY = H * L.zhY + a.shift * u;
    if (mode === 'karaoke') {
      const col = lk > .02 ? mixCol(st.color || pal.color, ai ? LYRIC_LIGHT.ai : LYRIC_LIGHT.you, lk) : (st.color || pal.color), role = ai ? 'ai' : 'human', track = FONT_ROLES[role].tracking;
      let size = L.enSize * u, font = fontCSS(role, size), w = charLayout(c, l.text, font, track * size).width;
      if (w > right - left) { size *= (right - left) / w; font = fontCSS(role, size); w = charLayout(c, l.text, font, track * size).width; }
      const x = align === 'center' ? (W - w) / 2 : left;
      const as = l._as || (l._as = mapSyllables(l.text, l.syllables));
      const fl = .4 + .22 * lk, sa = l.syllables.map(s => fl + (1 - fl) * clamp((t - s.start) / L.sylRise));   // unsung syllables stay a bit stronger on light pictures
      const sg = l.syllables.map(s => t < s.start ? 0 : t <= s.end ? 1 : Math.exp(-(t - s.end) / L.glowDecay));
      const lay = lyricRun(c, l.text, x, enY, font, track * size, col, a.alpha, {
        per: i => ({ a: sa[as[i]] ?? 1, g: sg[as[i]] ?? 0 }), glow: L.glow * u, outline, outlineW: L.outlineW * size,
        jitter: ai ? 0 : L.jitter * u, seed: l.i * 131 + 7
      });
      // AI: block cursor after the last sung character; stepped blink once the line is done
      if (ai && st.cursor !== false) {
        let k = -1; for (let i = 0; i < as.length; i++) if (t >= l.syllables[as[i]].start) k = i;
        const cx = x + (k >= 0 ? lay[k].x + lay[k].w : 0) + 6 * u, blink = t >= l.end ? (Math.floor(t * 2.4) % 2 === 0 ? 1 : .15) : 1;
        c.save(); c.globalAlpha = a.alpha * blink;
        if (outline) { c.strokeStyle = outline; c.lineWidth = L.outlineW * size; c.strokeRect(cx, enY - size * .74, size * .42, size * .9); }
        c.fillStyle = st.cursorColor || col; c.fillRect(cx, enY - size * .74, size * .42, size * .9); c.restore();
      }
      // speaker label, top-left of the EN line
      const label = st.label ?? LYRIC_LABELS[l.speaker] ?? l.speaker;
      if (label) {
        const ls = L.labelSize * u;
        lyricRun(c, label, x, enY - size * 1.02, fontCSS('ui', ls), FONT_ROLES.ui.tracking * ls, st.labelColor || col, .45 * a.alpha, { outline, outlineW: L.outlineW * ls * 2 });
      }
    }
    if ((mode === 'karaoke' || mode === 'subtitle-only') && l.zh) {
      const zc = lk > .02 ? mixCol(st.zhColor || pal.zh, ai ? LYRIC_LIGHT.aiZh : LYRIC_LIGHT.youZh, lk) : (st.zhColor || pal.zh), zs = L.zhSize * u, zf = ai ? fontCSS('sans', zs) : fontCSS('title', zs, { weight: 400 });
      const zw = charLayout(c, l.zh, zf, 0).width, zx = align === 'center' ? (W - zw) / 2 : left;
      lyricRun(c, l.zh, zx, zhY, zf, 0, zc, .9 * a.alpha, { outline, outlineW: L.outlineW * zs });
    }
  }
}
