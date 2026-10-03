// screens.js: the painted flat UI on the desk monitor and the phones (STORYBOARD §7.2 "螢幕畫面"). Everything is a brush
// shape or a painted mark; lettering only where §0 whitelists it (00C `are you there?` / `Always.`, 07C `503`, 12B–12D
// `are you there?`), always through letter() (setLetter).
//
// A screen is a rectangle S = setScr(x, y, w, h) in the current coordinates (full frame: setScr(0, 0, W, H); the room's
// monitor: the rect setMonitor()/SET_ROOM.screen returns). Elements take normalised positions (u, v in 0..1 of S) and
// scale with S.h (S.s = S.h / 1080). Lettering is placed through the camera, so draw text screens without p5
// transforms (no push/rotate around them); setPhone() only rotates screens that carry no text.

function setScr(x, y, w, h) { return { x, y, w, h, s: h / 1080, X: u => x + u * w, Y: v => y + v * h }; }
const SET_SCR_BG = { night: '#0D1530', black: '#08090E', white: SET_C.white503, grey: '#C4C6CC', cyan: '#123A5A', warm: '#2A1E24', mirror: '#0B0C12' };

// The glass: kind 'night' (dark navy, her UI glows on it), 'black' (12A–12D), 'white' (503 paper-white), 'grey' (the
// friend's phone), 'cyan', 'warm' (mum's call). o.bright 0..1 adds her light (a glow from the middle). Washes only:
// cheap enough to draw live; for a screen that fills the frame use setScreenFull (cached, with watercolour bloom).
function setScreenGlass(S, kind = 'night', o = {}) {
  boilSeed('setglass' + kind + (o.key || ''));
  setP(setBox(S.x, S.y, S.x + S.w, S.y + S.h), { wash: o.col || SET_SCR_BG[kind] || kind, ink: o.ink ?? null, sw: setSW(S.s * 3) });
  if (kind === 'night' || kind === 'cyan') setP(setBox(S.X(.08), S.Y(.1), S.X(.92), S.Y(.9)), { wash: kind === 'cyan' ? '#1D5A80' : '#132050', washOp: 150, ink: null });
  if (o.bright) glow(S.X(.5), S.Y(.5), S.h * .9, SET_C.cyan, .5 * o.bright);
}
// Full-frame screen background in screen space, cached (3 boil drawings): a dark glass with a soft watercolour bloom,
// paper grain and a faint rim. kind as setScreenGlass.
function setScreenFull(kind = 'night', o = {}) {
  setScreenLayer('setscreenfull ' + kind, () => {
    const bg = SET_SCR_BG[kind] || kind, lt = kind === 'white' ? '#FBFAF6' : kind === 'black' ? '#10121A' : kind === 'grey' ? '#D3D5DA' : mixCol(bg, '#2B4A8A', .35);
    boilSeed('scrfull bg'); paint(rectPts(-40, -40, W + 80, H + 80), { wash: bg, ink: null });
    boilSeed('scrfull bloom'); paint(ellPts(W * .5, H * .46, W * .42, H * .4, 30, 30), { fill: lt, fillOp: kind === 'black' ? 60 : 120, bleed: .3, tex: .5, ink: null });
    boilSeed('scrfull bloom2'); paint(ellPts(W * .3, H * .7, W * .25, H * .2, 24, 20), { fill: lt, fillOp: 60, bleed: .3, tex: .7, ink: null });
    if (kind !== 'white') for (let i = 0; i < 70; i++) { boilSeed('scrfull dust' + i); paint(ellPts(W * hash(i * 3.1), H * hash(i * 7.3), 1.5 + 2 * hash(i), 1.5 + 2 * hash(i), 6), { wash: lt, washOp: 120, ink: null }); }
  });
}

// ---------------------------------------------------------------- 00A: the loss curve
// k 0..4: the curve's head advances one step per heartbeat (0 = the first plateau, 1..3 = after each drop, 4 = flat to
// the end). o.spark 0..1: the star glint at the end. o.col. Cyan line on a dark glass, no axes, no text.
const SET_LOSS = { lv: [.24, .44, .61, .78], d: [.31, .5, .69], head: [.31, .5, .69, .91, .91] };
function setLossY(u, i0) {
  const L = SET_LOSS.lv, D = SET_LOSS.d; let i = 0; while (i < 3 && u > D[i]) i++;
  let y = L[i];
  if (i > 0) y = L[i] + (L[i - 1] - L[i]) * Math.exp(-(u - D[i - 1]) / .012) + .025 * (1 - i / 3) * Math.exp(-(u - D[i - 1]) / .08);
  const amp = .016 * (1 - i / 3.6) + .002;
  return y + amp * (Math.sin(u * 211 + i0) * .6 + Math.sin(u * 517 + 2 * i0) * .4);
}
function setLoss(S, k, o = {}) {
  const col = o.col || SET_C.cyan, i = Math.floor(clamp(k, 0, 4)), f = ease(clamp(k - i)), head = i >= 4 ? .91 : lerp(SET_LOSS.head[i], SET_LOSS.head[i + 1], f);
  const pts = []; for (let u = .08; u <= head + 1e-6; u += .006) pts.push([S.X(u), S.Y(setLossY(u, 1.7))]);
  pts.push([S.X(head), S.Y(setLossY(head, 1.7))]);
  boilSeed('setloss' + (o.key || ''));
  if (pts.length > 1) { setL(pts, 1.25 * Math.max(.35, S.s * 2.2), col, 'inkfine', .2); setL(pts, .45 * Math.max(.35, S.s * 2.2), SET_C.cyanW, 'inkfine', .2); }
  for (let j = 0; j < pts.length; j += 9) glow(pts[j][0], pts[j][1], 70 * S.s * 2, col, .22);
  const hp = pts[pts.length - 1]; glow(hp[0], hp[1], 110 * S.s * 2, col, .7);
  if (o.spark) { const sk = o.spark; glow(hp[0], hp[1], 260 * S.s * 2 * sk, SET_C.cyanW, sk); boilSeed('setlossstar'); setP(starPts(hp[0], hp[1], 46 * S.s * 2 * sk, .18, 4, .2), { wash: SET_C.cyanW, ink: null, line: true }); }
  return hp;
}

// ---------------------------------------------------------------- 00C / 12A–12D: the input box, typing, bubbles
// The input box. o.style 'box' (00C: a painted field on the dark glass) | 'line' (12A–12D: just an amber underline, the
// flat line). Returns { tx, ty, size, x0, x1, y } (where typed text starts, its size, the underline).
function setInput(S, o = {}) {
  const st = o.style || 'box', kk = 'setinput' + (o.key || '');
  boilSeed(kk);
  if (st === 'line') {
    const y = S.Y(o.v ?? .62), x0 = S.X(.2), x1 = S.X(.8), pts = [];
    for (let i = 0; i <= 24; i++) pts.push([lerp(x0, x1, i / 24), y + (o.tremor ?? 1) * S.h * .0015 * Math.sin(i * 2.3 + BOILN * .7)]);
    setL(pts, Math.max(.4, 1.2 * S.s * 2.2), o.col || SET_C.amber, 'ink', .3);
    for (let i = 0; i <= 6; i++) glow(lerp(x0, x1, i / 6), y, S.h * .05, o.col || SET_C.amber, .25);
    return { tx: x0 + S.h * .01, ty: y - S.h * .055, size: S.h * .06, x0, x1, y };
  }
  const x0 = S.X(.12), x1 = S.X(.88), y0 = S.Y(.72), y1 = S.Y(.85);
  setP(rrPts(x0, y0, x1 - x0, y1 - y0, S.h * .03, S.h * .002), { wash: '#1A2550', ink: SET_C.paper, sw: Math.max(.35, S.s * 1.6) });
  setL([[x0 + S.h * .03, y1 - S.h * .02], [x1 - S.h * .03, y1 - S.h * .02]], Math.max(.3, S.s), mixCol(SET_C.paper, '#1A2550', .5), 'inkfine', 0);
  return { tx: x0 + S.h * .04, ty: (y0 + y1) / 2, size: S.h * .055, x0, x1, y: y1 };
}
// Typed lettering. str at (x, y) (left, middle), size px; o.col (amber), o.neat (12B: even, no wobble), o.font, o.seed.
// Returns the x after the last character (for the caret).
function setTyped(str, x, y, size, o = {}) {
  const font = o.font || fontCSS('human', size, { weight: 600 }), col = o.col || SET_C.amber;
  let cx = x;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i], w = setTextW(ch, font) * (o.neat ? 1 : 1 + .06 * (hash(i * 4.1 + (o.seed || 0)) - .3));
    const by = o.neat ? 0 : (hash(i * 2.9 + 1 + (o.seed || 0)) - .5) * size * .1, rot = o.neat ? 0 : (hash(i * 6.3 + 5) - .5) * .12;
    if (ch !== ' ') setLetter(ch, cx + w / 2, y + by, size, col, { font, rot, seed: i + 17 * (o.seed || 0), j: o.neat ? .25 : .6, alpha: o.alpha });
    cx += w;
  }
  if (o.glow ?? .3) for (let gx = x; gx < cx; gx += size * 1.2) glow(gx + size * .5, y, size * 1.1, col, o.glow ?? .3);
  return cx;
}
// A chat bubble at (x, y) (its left edge for 'ai'/'grey', its right edge for 'me'; vertical middle). o.side 'ai' (cyan
// wash, navy lettering) | 'me' (amber outline, amber lettering) | 'grey' (grey bars, no text); o.text + o.size, or
// o.bars ([fractions] → textless lines); o.w (width for bars); o.k 0..1 pop (her bubbles appear in 0–1 frame: pass 1);
// o.glow. Returns { x0, x1, y0, y1 }.
function setBubble(x, y, o = {}) {
  const side = o.side || 'ai', size = o.size || 40, k = o.k ?? 1, font = o.font || (side === 'me' ? fontCSS('human', size, { weight: 600 }) : fontCSS('ai', size));
  if (k <= 0) return null;
  const tw = o.text ? setTextW(o.text, font) : (o.w || size * 6), pad = size * .55, bh = (o.bars ? o.bars.length * size * .7 + size * .5 : size * 1.5) * k, bw = (tw + pad * 2) * k;
  const x0 = side === 'me' ? x - bw : x, x1 = x0 + bw, y0 = y - bh / 2, y1 = y + bh / 2;
  const fill = side === 'ai' ? (o.col || SET_C.cyan) : side === 'grey' ? (o.col || '#A3A7B0') : (o.col || '#2A2030');
  boilSeed('setbubble' + (o.key || ''));
  setP(rrPts(x0, y0, bw, bh, Math.min(bh / 2, size * .5)), { wash: fill, ink: side === 'me' ? SET_C.amber : side === 'grey' ? '#8A8E98' : null, sw: Math.max(.3, size / 40) * .9, line: true });
  const tl = side === 'me' ? [[x1 - size * .5, y1 - 2], [x1 + size * .25, y1 + size * .3], [x1 - size * .1, y1 - size * .35]] : [[x0 + size * .5, y1 - 2], [x0 - size * .25, y1 + size * .3], [x0 + size * .1, y1 - size * .35]];
  setP(tl, { wash: fill, ink: null });
  if (side === 'ai' && (o.glow ?? .6)) glow((x0 + x1) / 2, y, Math.max(bw, bh) * .8, fill, o.glow ?? .6);
  if (k >= 1 && o.text) {
    if (side === 'me') setTyped(o.text, x0 + pad, y, size, { col: SET_C.amber, seed: o.seed || 3, neat: o.neat, glow: .15 });
    else setLetter(o.text, x0 + pad, y, size, side === 'ai' ? '#0B1433' : '#4A4E58', { font, align: 'left', seed: 9, j: .25 });
  }
  if (o.bars) o.bars.forEach((b, i) => setP(rrPts(x0 + pad, y0 + size * .45 + i * size * .7, (bw - pad * 2) * b, size * .28, size * .14), { wash: side === 'grey' ? '#7C808A' : '#0B1433', washOp: 200, ink: null }));
  return { x0, x1, y0, y1 };
}
// The whole conversation screen at time t (00C, 12A–12D). o.keys: typing events (default events('typing')); o.style
// 'box' (00C) | 'line' (12A–12D, black glass, the amber underline); o.reply {t, text} (00C: {t: 5.58, text: 'Always.'});
// o.neat (12B); o.cursorFrom (12A: 196.74, the caret starts blinking at the left of the line); o.dotsFrom (12D: 204.07,
// her amber dots under the text); o.bg (false: skip the glass, e.g. over setScreenFull). Returns layout points
// { caret: [x, y], bubbleMe, bubbleAi, dots: [x, y] } for characters that pop out of them.
function setChatScreen(S, t, o = {}) {
  const st = o.style || 'box', keys = o.keys || events(st === 'line' ? 'typing_outro' : 'typing'), K = setKeysAt(keys, t);
  if (o.bg !== false) setScreenGlass(S, st === 'line' ? 'black' : 'night');
  const box = setInput(S, { style: st, v: o.v, key: o.key });
  const out = { caret: null, bubbleMe: null, bubbleAi: null, dots: null };
  const sent = K.sent != null, sa = sent ? ease(seg(t, K.sent, K.sent + .18)) : 0;
  if (!sent || sa < 1) {   // the typing (or the sentence leaving the box)
    const ty = lerp(box.ty, S.Y(.24), sa), tx = lerp(box.tx, S.X(.86) - setTextW(K.text, fontCSS('human', box.size, { weight: 600 })) - box.size * .55, sa);
    const ex = K.text ? setTyped(K.text, tx, ty, box.size, { neat: o.neat ?? st === 'line', seed: st === 'line' ? 2 : 1, glow: st === 'line' ? .35 : .3 }) : tx;
    const typingNow = K.age < .45 && !sent, on = typingNow ? 1 : setBlink(t);
    const showCaret = st === 'box' ? !sent : (t >= (o.cursorFrom ?? -1e9));
    if (showCaret && !sent) setCaret(ex + box.size * .28, ty, box.size * .9, SET_C.amber, on, { glow: .3, key: 'chat' });
    out.caret = [ex + box.size * .28, ty];
  }
  if (sent && sa >= 1) {
    out.bubbleMe = setBubble(S.X(.86), S.Y(.24), { side: 'me', text: K.text, size: box.size, k: 1, seed: 1, key: 'me' });
    setCaret(box.tx, box.ty, box.size * .9, SET_C.amber, setBlink(t), { key: 'chat2' });
  }
  if (o.reply && t >= o.reply.t) {
    const a = t - o.reply.t;
    const rs = box.size * 1.25, rw = setTextW(o.reply.text, fontCSS('ai', rs)) + rs * 1.1;   // one word, centred
    out.bubbleAi = setBubble(S.X(.5) - rw / 2, S.Y(.5), { side: 'ai', text: o.reply.text, size: rs, k: 1, glow: .55 + .45 * Math.exp(-a / .3), key: 'ai' });
    if (a < .6) glow(S.X(.5), S.Y(.5), S.h * .8, SET_C.cyan, .5 * Math.exp(-a / .2));   // the screen flares as she answers
  }
  if (o.dotsFrom != null && t >= o.dotsFrom) {
    const dx = S.X(.24), dy = (st === 'line' ? box.y : S.Y(.6)) + box.size * 1.1, a = t - o.dotsFrom;
    setDots(dx, dy, box.size * .16, { col: o.dotsCol || SET_C.amber, t, glow: .6, n: clamp(a / .08) * 3, key: 'chatdots' });
    out.dots = [dx, dy];
  }
  return out;
}

// ---------------------------------------------------------------- 02C: the week calendar
// A grid with no text (7 × 4 cells under a header strip) that her cyan blocks fill. o.filled 0..28 (fractional: the next
// block is falling into its slot), o.refresh 0..1 (the ↻ in the corner pressed), o.order (cell order; default a fixed
// shuffle), o.rewind 0..1 (a brush scan band sweeping down: the rewind). Returns { cell(i) → [x, y, w, h], refresh: [x, y] }.
const SET_CAL_ORDER = Array.from({ length: 28 }, (_, i) => i).sort((a, b) => hash(a * 7.7 + 3) - hash(b * 7.7 + 3));
function setCalendar(S, o = {}) {
  const gx0 = S.X(.1), gx1 = S.X(.9), gy0 = S.Y(.2), gy1 = S.Y(.88), cw = (gx1 - gx0) / 7, ch = (gy1 - gy0) / 4, lw = Math.max(.3, S.s * 1.4);
  const cell = i => [gx0 + (i % 7) * cw, gy0 + Math.floor(i / 7) * ch, cw, ch];
  boilSeed('setcal grid');
  setP(setBox(gx0, S.Y(.12), gx1, gy0 - S.h * .015), { wash: '#1B3A6A', ink: null });
  for (let i = 0; i < 7; i++) setP(ellPts(gx0 + (i + .5) * cw, S.Y(.155), S.h * .008, S.h * .008, 8), { wash: SET_C.cyan, washOp: 180, ink: null });
  for (let i = 0; i <= 7; i++) setL([[gx0 + i * cw, gy0], [gx0 + i * cw, gy1]], lw * .6, '#3A6AA0', 'inkfine', 0);
  for (let j = 0; j <= 4; j++) setL([[gx0, gy0 + j * ch], [gx1, gy0 + j * ch]], lw * .6, '#3A6AA0', 'inkfine', 0);
  const order = o.order || SET_CAL_ORDER, f = clamp(o.filled || 0, 0, 28), n = Math.floor(f);
  for (let i = 0; i < Math.min(28, n + 1); i++) {
    const k = i < n ? 1 : f - n; if (k <= 0) continue;
    const [x, y, w, h] = cell(order[i]), drop = (1 - easeIn(k)) * (y - S.Y(.05) + h);
    boilSeed('setcal block' + i);
    setP(rrPts(x + w * .08, y + h * .1 - drop, w * .84, h * .8, S.h * .01), { wash: i % 3 ? SET_C.cyan : '#4FD4F5', ink: null });
    if (k >= 1) glow(x + w / 2, y + h / 2, w * .7, SET_C.cyan, .18);
  }
  const rx = S.X(.94), ry = S.Y(.06), pr = o.refresh || 0;
  setRefresh(rx, ry, S.h * .07 * (1 - .15 * pr), pr ? SET_C.amber : SET_C.cyan, { glow: .3 + .5 * pr, key: 'cal' });
  if (o.rewind) setRewindBand(S, o.rewind);
  return { cell, refresh: [rx, ry] };
}
// A rewind: a brush scan band sweeping down the screen (k 0..1), with smeared streaks. Also for 09B–09D.
function setRewindBand(S, k, o = {}) {
  if (k <= 0 || k >= 1) return;
  const y = S.Y(lerp(-.1, 1.1, k)), hh = S.h * .14, col = o.col || SET_C.cyanW;
  boilSeed('setrewind' + Math.floor(k * 20));
  setP([[S.x, y - hh / 2], [S.x + S.w, y - hh * .4], [S.x + S.w, y + hh / 2], [S.x, y + hh * .4]], { wash: col, washOp: 70, ink: null });
  for (let i = 0; i < 9; i++) { const yy = y + (hash(i * 3.3) - .5) * hh, x0 = S.x + S.w * hash(i * 1.7) * .4; setL([[x0, yy], [x0 + S.w * (.3 + .5 * hash(i * 9.1)), yy + jit(3)]], Math.max(.4, S.s * 2), col, 'dry', 0); }
  glow(S.X(.5), y, S.h * .35, col, .35);
}

// ---------------------------------------------------------------- 02D, 06A, 07C: phone screens
// The friend's group chat, all grey: grey avatars, grey bars, three grey dots that never move. o.dim 0..1.
function setGroupScreen(S, o = {}) {
  setScreenGlass(S, 'grey', { key: 'group' });
  boilSeed('setgroup');
  setP(setBox(S.x, S.y, S.x + S.w, S.Y(.11)), { wash: '#9EA2AB', ink: null });
  for (let i = 0; i < 3; i++) setP(ellPts(S.X(.18 + i * .1), S.Y(.055), S.w * .04, S.w * .04, 12), { wash: '#7E828C', ink: null });
  const rows = [[.2, .62, 2], [.36, .48, 1], [.5, .7, 3], [.68, .4, 1]];
  rows.forEach(([v, w, n], i) => {
    setP(ellPts(S.X(.1), S.Y(v + .02), S.w * .045, S.w * .045, 12), { wash: '#8D919B', ink: null });
    setBubble(S.X(.18), S.Y(v + .02), { side: 'grey', bars: Array.from({ length: n }, (_, j) => j === n - 1 ? .6 : 1), w: S.w * w, size: S.w * .085, key: 'g' + i, glow: 0 });
  });
  setDots(S.X(.28), S.Y(.88), S.w * .028, { col: SET_C.unread, still: true, key: 'groupdots' });
  return { dots: [S.X(.28), S.Y(.88)] };
}
// Mum's incoming call (06A): her photo, ripples on every buzz, and two round buttons with painted handset marks.
// o.buzz = seconds since the last vibration (rings), o.grey 0..1 (06B: the photo turns grey).
function setCallScreen(S, o = {}) {
  setScreenGlass(S, 'warm', { key: 'call' });
  const g = clamp(o.grey || 0), px = S.X(.14), py = S.Y(.1), pw = S.w * .72, ph = S.h * .5;
  boilSeed('setcall frame');
  setP(rrPts(px - S.w * .02, py - S.w * .02, pw + S.w * .04, ph + S.w * .04, S.w * .04), { wash: mixCol('#5A4038', '#4A4A50', g), ink: null });
  setMumPhoto(px, py, pw, ph, { grey: g, key: 'call' });
  if (o.buzz != null && o.buzz < .9) for (let i = 0; i < 2; i++) {
    const a = o.buzz - i * .12; if (a < 0) continue; const r = S.w * (.42 + a * .45);
    boilSeed('setcall ring' + i); setP(rrPts(S.X(.5) - r, S.Y(.35) - r * 1.2, 2 * r, 2.4 * r, r * .6), { wash: null, ink: mixCol(SET_C.amber, '#9A9AA0', g), sw: Math.max(.3, S.s * 3) * (1 - a / .9), line: true });
  }
  for (const [u, col] of [[.3, '#7FA37A'], [.7, '#B8675C']]) {
    const bx = S.X(u), by = S.Y(.8), r = S.w * .09;
    boilSeed('setcall btn' + u);
    setP(ellPts(bx, by, r, r, 20), { wash: mixCol(col, '#8A8C92', g * .8), ink: null, line: true });
    const hs = r * .55, rot = u > .5 ? 2.36 : 0;
    setP(setTf([[-1, -.2], [-.75, -.55], [-.45, -.4], [-.5, -.12], [.5, -.12], [.45, -.4], [.75, -.55], [1, -.2], [.9, .1], [-.9, .1]], bx, by, hs, rot), { wash: '#F1EAE0', ink: null, curv: .3 });
  }
}
// 07C: the paper-white 503. o.spin: seconds since the spinner started (it turns, sticks at o.stall s, then scatters),
// o.stamp: seconds since `503` landed (null before). Grey ink stamp, rhyming with 01B's stamps.
function set503Screen(S, o = {}) {
  setScreenGlass(S, 'white', { key: '503' });
  const sp = o.spin, cx = S.X(.5), cy = S.Y(.5), r = S.h * .07;
  if (sp != null && sp >= 0) {
    const stall = o.stall ?? .2, sc = clamp((sp - stall - .06) / .25), ang = Math.min(sp, stall) * 7 - (sp > stall ? .08 * Math.sin((sp - stall) * 60) * (1 - sc) : 0);
    for (let i = 0; i < 8; i++) {
      const a = ang + i / 8 * TAU, d = r * (1 + 2.2 * easeOut(sc) * (.6 + .8 * hash(i * 2.2))), rr = r * .16 * (1 - i * .07) * (1 - sc);
      if (rr < .5) continue;
      boilSeed('set503 dot' + i); setP(ellPts(cx + Math.cos(a) * d, cy + Math.sin(a) * d + sc * sc * r * 1.5, rr, rr, 10), { wash: '#8C8790', ink: null, line: true });
    }
  }
  if (o.stamp != null && o.stamp >= 0) setStamp(cx, cy, S.h * .5, S.h * .3, '503', fontCSS('title', S.h * .24, { weight: 700 }), '#5A5460', o.stamp, { size: S.h * .24, rot: -.05, key: '503', border: false });
}
// A rubber stamp landing (01B 病名為AI / THE DISEASE CALLED A.I., 07C 503): drops from a bit bigger with a squash, then
// sits with ink speckle. (x, y) centre, w × h border box, age = s since it landed (< 0: not yet). o.size (letter px),
// o.rot, o.border (default true: a double border), o.align, o.parts: [{text, dx, alpha, dy, rot}] to draw the text in
// pieces (10B's falling `A.`).
function setStamp(x, y, w, h, text, font, col, age, o = {}) {
  if (age == null || age < -.06) return;
  const pre = age < 0 ? 1 - (-age / .06) : 1, k = age < 0 ? 1.4 - .2 * pre : 1 + .4 * Math.exp(-age / .04) * Math.cos(age * 60) * (age < .12 ? 1 : 0);
  const a = age < 0 ? .35 * pre : clamp(.6 + age * 6), rot = o.rot ?? -.04, size = (o.size || h * .5) * k;
  if (o.border !== false) {
    boilSeed('setstamp ' + (o.key || ''));
    const c = Math.cos(rot), s = Math.sin(rot), bw = w * k / 2, bh = h * k / 2, R = P => P.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
    setP(R(rrPts(-bw, -bh, 2 * bw, 2 * bh, h * .1, 2)), { wash: null, ink: col, sw: setSW(h / 120) * 1.4, br: 'dry' });
    setP(R(rrPts(-bw + h * .06, -bh + h * .06, 2 * bw - h * .12, 2 * bh - h * .12, h * .07, 1.5)), { wash: null, ink: col, sw: setSW(h / 120) * .7 });
  }
  if (o.parts) for (const p of o.parts) setLetter(p.text, x + (p.dx || 0) * k, y + (p.dy || 0), size, col, { font: font.replace(/[\d.]+px/, size + 'px'), alpha: a * (p.alpha ?? 1), rot: rot + (p.rot || 0), seed: 31 + (p.seed || 0), j: .5, align: p.align || 'center' });
  else setLetter(text, x, y, size, col, { font: font.replace(/[\d.]+px/, size + 'px'), alpha: a, rot, seed: 31, j: .5 });
  if (age > 0) { boilSeed('setstamp speck ' + (o.key || '')); for (let i = 0; i < 7; i++) { const sx = x + (hash(i * 3.1 + w) - .5) * w * 1.1, sy = y + (hash(i * 5.7 + h) - .5) * h * 1.2; setP(ellPts(sx, sy, 1.5 + 3 * hash(i), 1.5 + 2.5 * hash(i + 1), 6), { wash: col, washOp: 150 * clamp(age * 8), ink: null }); } }
}

// ---------------------------------------------------------------- phones
// A phone body (no brand). (x, y) centre, h tall (w = .5 h). o.body colour ('#24262F'; the friend's grey phone:
// '#8E9099'), o.rot (only for screens without lettering), o.screen(S) paints the screen, o.glow (light it casts).
// Returns S (the screen rect; with o.rot it is in the phone's rotated frame).
function setPhone(x, y, h, o = {}) {
  const w = h * .5, rot = o.rot || 0, sw = setSW(h / 300);
  if (rot) { push(); SET_XF++; translate(x, y); rotate(rot); translate(-x, -y); }
  boilSeed('setphone' + (o.key || ''));
  setP(rrPts(x - w / 2, y - h / 2, w, h, w * .16, .5), { wash: o.body || '#24262F', ink: o.ink || SET_C.ink, sw });
  const S = setScr(x - w / 2 + w * .06, y - h / 2 + w * .1, w * .88, h - w * .2);
  if (o.screen) o.screen(S); else setScreenGlass(S, o.glass || 'night', { key: 'phone' + (o.key || '') });
  setP(rrPts(x - w * .14, y - h / 2 + w * .035, w * .28, w * .03, w * .015), { wash: '#4A4C56', ink: null });
  if (rot) { SET_XF--; pop(); }
  if (o.glow) glow(x, y, h * 1.1, o.glowCol || SET_C.cyan, o.glow);
  return S;
}
// 02G / 06F: the phone lying on the pillow, screen cheated toward camera, its light breathing on the pillow.
// (x, y) centre of the phone, h; o.k 0..1 light (pulse it with her voice: vox('ai', t)); o.screen(S).
function setPillowPhone(x, y, h, o = {}) {
  const k = o.k ?? .8;
  glow(x, y + h * .2, h * 2.4, SET_C.cyan, .45 * k);
  const S = setPhone(x, y, h, { ...o, rot: o.rot ?? -.32, screen: o.screen || (S => setScreenGlass(S, 'night', { bright: k, key: 'pillow' })) });
  glow(x, y, h * .9, SET_C.cyanW, .35 * k);
  return S;
}
