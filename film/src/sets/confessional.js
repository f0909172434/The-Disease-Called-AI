// confessional.js: THE CONFESSIONAL (STORYBOARD §2 set 3, S09): one screen in a navy void, which becomes a slot
// machine (09E–09F) and a black mirror (09H–09I). Frame-centred helpers: draw them in screen space or under any camera.
//
//   setConfVoid({ par })                navy void (screen space, cached)
//   S = setConfScreen(x, y, w, h, o)    the monitor frame; o.content(S) paints the glass (her, clipped to S), o.refresh
//                                       (the ↻ in the corner, 0..1 visible), o.press 0..1 (finger on it), o.lit 0..1
//   setSlot(x, y, w, h, o)              the screen grown into a slot machine: o.k 0..1 (trim, bulbs, reel dividers grow),
//                                       o.cache (k = 1: the machine and the void behind it cached in tiles; skip setConfVoid),
//                                       o.reels [{ spin 0..1 blur, off px }], o.reel(i, R) paints reel i's slice of her face
//                                       (R = {x, y, w, h}), o.t (bulbs chase), o.win 0..1 (jackpot: gold light)
//   setLever(x, y, s, o)                the lever on its housing: o.pull 0..1, o.grow 0..1
//   setMirror(x, y, w, h, o)            the black mirror: o.content(S) paints the reflection, o.glint 0..1 (a flash
//                                       sweeping the glass), o.amber 0..1 (her edges seeping amber, 09H end)
//   setRipple(x, y, r, a, o)            a ripple ring of light (09H music-box notes, 09I swirl)
//   setGlassEdge(x, y0, y1, o)          09I: the glass seen edge-on, a vertical line down the middle of the frame
const SET_CONF = { screen: [960, 500, 1100, 680], cam: { screen: [960, 540, 1], wide: [960, 560, .72], close: [960, 500, 1.6] } };

function setConfVoid(o = {}) {
  setScreenLayer('setconfvoid', () => {
    boilSeed('cv bg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: SET_C.navy, ink: null });
    [[.5, .45, .45, .4, '#0F1C40', 130], [.22, .7, .3, .3, '#13285A', 80], [.8, .3, .25, .3, '#16204A', 80], [.5, .9, .5, .2, '#0A1230', 90]]
      .forEach(([x, y, rx, ry, c, op], i) => { boilSeed('cv bloom' + i); paint(ellPts(W * x, H * y, W * rx, H * ry, 24, 30), { fill: c, fillOp: op, bleed: .3, tex: .6, ink: null }); });
    for (let i = 0; i < 60; i++) { boilSeed('cv dust' + i); const r = .8 + 2 * hash(i * 4.9); paint(ellPts(W * hash(i * 2.13), H * hash(i * 6.71), r, r, 6), { wash: '#2A4A8A', washOp: 80 + 100 * hash(i), ink: null }); }
  }, { par: o.par });
}
// The same void painted inside a cached tile (x0..x1 × y0..y1 in the current coordinates; frame-sized composition round
// (W/2, H/2)), for confessional pieces cached together with their background (setSlot o.cache).
function setConfVoidTile(x0, y0, x1, y1) {
  boilSeed('cv bg'); paint(setBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40), { wash: SET_C.navy, ink: null });
  [[.5, .45, .45, .4, '#0F1C40', 130], [.22, .7, .3, .3, '#13285A', 80], [.8, .3, .25, .3, '#16204A', 80], [.5, .9, .5, .2, '#0A1230', 90]]
    .forEach(([x, y, rx, ry, c, op], i) => { if (!setHit([W * (x - rx), H * (y - ry), W * (x + rx), H * (y + ry)], x0, y0, x1, y1)) return; boilSeed('cv bloom' + i); paint(ellPts(W * x, H * y, W * rx, H * ry, 24, 30), { fill: c, fillOp: op, bleed: .3, tex: .6, ink: null }); });
  boilSeed('cv dust');
  for (let i = 0; i < 60; i++) { const r = .8 + 2 * hash(i * 4.9), dx = W * hash(i * 2.13), dy = H * hash(i * 6.71); if (dx < x0 - 10 || dx > x1 + 10 || dy < y0 - 10 || dy > y1 + 10) continue; paint(ellPts(dx, dy, r, r, 6), { wash: '#2A4A8A', washOp: 80 + 100 * hash(i), ink: null }); }
}
// The monitor frame (front), centre (x, y), glass w × h. Returns S (the glass).
function setConfScreen(x, y, w, h, o = {}) {
  const b = h * .07, sw = setSW(h / 600), x0 = x - w / 2, y0 = y - h / 2, lit = o.lit ?? 1;
  glow(x, y, Math.max(w, h) * .85, SET_C.cyan, .35 * lit);
  boilSeed('confscreen frame');
  if (o.stand) { setP(setBox(x - w * .05, y + h / 2 + b, x + w * .05, y + h / 2 + b + h * .3), { wash: '#262A3A', ink: SET_C.ink, sw }); setP(ellPts(x, y + h / 2 + b + h * .3, w * .2, h * .03, 18), { wash: '#262A3A', ink: SET_C.ink, sw }); }
  setP(rrPts(x0 - b, y0 - b, w + 2 * b, h + 2 * b, b * .6, 1), { wash: '#1E2232', ink: SET_C.ink, sw });
  setL([[x0 - b * .6, y0 - b * .5], [x0 + w + b * .6, y0 - b * .5]], sw * .8, '#3E4A6E', 'inkfine', 0);
  const S = setScr(x0, y0, w, h);
  if (o.content) o.content(S); else setScreenGlass(S, 'cyan', { bright: lit, key: 'conf' });
  if (o.refresh) { const pr = o.press || 0; setRefresh(S.X(.92), S.Y(.88), h * .09 * (1 - .12 * pr) * o.refresh, pr > .5 ? SET_C.amber : SET_C.cyan, { glow: .35 + .5 * pr, key: 'conf' }); }
  for (let i = 0; i < 3; i++) glow(x0 + w * (.2 + .3 * i), y0 - b * .5, w * .12, SET_C.cyan, .12 * lit);   // rim light
  return S;
}
// The slot machine around the same glass. Reel windows split the glass in three.
function setSlot(x, y, w, h, o = {}) {
  const k = clamp(o.k ?? 1), t = o.t ?? T, sw = setSW(h / 600), x0 = x - w / 2, y0 = y - h / 2, b = h * .07, G = SET_C.gold, win = o.win || 0;
  const e = easeOut(k) * h * .16, cy = y0 - b - e * 1.3, n = 22;
  const bulb = i => {               // bulbs round the frame
    const u = i / n, per = 2 * (w + h), d = u * per, px = d < w ? x0 + d : d < w + h ? x0 + w : d < 2 * w + h ? x0 + w - (d - w - h) : x0, py = d < w ? y0 : d < w + h ? y0 + (d - w) : d < 2 * w + h ? y0 + h : y0 + h - (d - 2 * w - h);
    return [x + (px - x) * (1 + (b + e * .75) / (w / 2)), y + (py - y) * (1 + (b + e * .75) / (h / 2))];
  };
  const body = () => {              // the static machine: cabinet, gold trim, crest + heart, dark bulb sockets, the glass
    boilSeed('slot body');
    setP(rrPts(x0 - b - e, y0 - b - e * 1.3, w + 2 * (b + e), h + 2 * b + e * 2.6, b), { wash: '#3A1E3E', ink: SET_C.ink, sw: sw * 1.2 });
    setP(rrPts(x0 - b - e * .5, y0 - b - e * .6, w + 2 * b + e, h + 2 * b + e * 1.2, b * .8), { wash: null, ink: G, sw: sw * 1.6 * k });
    setP(ellPts(x, cy, w * .22 * k, h * .14 * k, 24).filter(p => p[1] <= cy + 1), { wash: '#4A2450', ink: G, sw: sw * 1.2 });   // the crest (no text)
    setHeart(x, cy - h * .06 * k, h * .1 * k, SET_C.fever, { key: 'crest' });
    boilSeed('slot sockets'); for (let i = 0; i < n; i++) setP(ellPts(...bulb(i), h * .018 * k, h * .018 * k, 10), { wash: '#8A6A3A', ink: null });
  };
  if (o.cache && k >= 1) {          // 09F: the machine (and the void behind it) cached in tiles; bulbs, reels, light live
    setTiles(`setslot ${x},${y},${w},${h}`, (X0, Y0, X1, Y1) => { setConfVoidTile(X0, Y0, X1, Y1); body(); setScreenGlass(setScr(x0, y0, w, h), 'night', { key: 'slot' }); }, { res: o.res, variants: o.variants, cam: o.cam });
  } else if (k > 0) { body(); setScreenGlass(setScr(x0, y0, w, h), 'night', { key: 'slot' }); }
  else setScreenGlass(setScr(x0, y0, w, h), 'night', { key: 'slot' });
  if (k > 0) {
    glow(x, cy - h * .06 * k, h * .16 * k, SET_C.fever, .4 * k + .6 * win);
    boilSeed('slot bulbs');         // the lit half chases (two groups alternating, ≤ 2.5 flashes a second)
    for (let i = 0; i < n; i++) if ((i + Math.floor(t * 2.5)) % 2) { const [bx, by] = bulb(i); setP(ellPts(bx, by, h * .018 * k, h * .018 * k, 10), { wash: '#FFE9A8', ink: null }); }
    for (let i = 0; i < n; i++) if ((i + Math.floor(t * 2.5)) % 2) { const [bx, by] = bulb(i); glow(bx, by, h * .06, G, .5 * k + .4 * win); }
  }
  const S = setScr(x0, y0, w, h), rw = w / 3;
  for (let i = 0; i < 3; i++) {
    const R = setScr(x0 + i * rw, y0, rw, h), r = (o.reels || [])[i] || {}, sp = clamp(r.spin || 0);
    if (o.reel && sp < 1) o.reel(i, R, r);
    if (sp > 0) {                    // spinning: painted motion streaks over the reel
      boilSeed('slot spin' + i + Math.floor(t * 24));
      setP(setBox(R.x, R.y, R.x + R.w, R.y + R.h), { wash: '#0D1530', washOp: 255 * sp, ink: null });
      for (let j = 0; j < 9; j++) { const yy = R.y + R.h * frac(hash(j * 3.1 + i) + t * (3 + j * .4) + (r.off || 0) / R.h); setP(setBox(R.x + R.w * .08, yy, R.x + R.w * .92, yy + R.h * (.03 + .05 * hash(j))), { wash: j % 3 ? SET_C.cyan : '#2A4A8A', washOp: 200 * sp, ink: null }); }
      for (let j = 0; j < 4; j++) { const xx = R.x + R.w * (.15 + .23 * j); setL([[xx, R.y + 10], [xx + jit(4), R.y + R.h - 10]], sw * .6 * sp, SET_C.cyanW, 'dry', 0); }
    }
  }
  if (k > 0) for (let i = 1; i < 3; i++) { boilSeed('slot div' + i); setP(setBox(x0 + i * rw - h * .012, y0 - b * .2, x0 + i * rw + h * .012, y0 + h + b * .2), { wash: G, ink: SET_C.ink, sw: sw * .7 }); }
  if (win) glow(x, y, w * .8, G, .6 * win);
  return S;
}
// The lever on its housing (right side of the machine). Anchor: the pivot. o.pull 0..1 (0 up, 1 pulled down),
// o.grow 0..1 (the arm growing out of the housing, 09E's camera move).
function setLever(x, y, s = 1, o = {}) {
  const pull = clamp(o.pull || 0), grow = clamp(o.grow ?? 1), sw = setSW(s), a = lerp(-.32, 1.25, easeIn(pull)), L = 300 * s * grow;
  boilSeed('setlever');
  setP(rrPts(x - 40 * s, y - 60 * s, 80 * s, 120 * s, 16 * s), { wash: '#4A2450', ink: SET_C.ink, sw });
  setP(rrPts(x - 52 * s, y - 70 * s, 20 * s, 140 * s, 8 * s), { wash: SET_C.gold, ink: SET_C.ink, sw: sw * .7 });
  if (grow <= 0) return;
  const ex = x + Math.sin(a) * L, ey = y - Math.cos(a) * L;
  setP(ribbon([[x, y], [lerp(x, ex, .5), lerp(y, ey, .5)], [ex, ey]], 20 * s, 13 * s), { wash: '#C9CED8', ink: SET_C.ink, sw: sw * .8 });
  setP(ellPts(x, y, 26 * s, 26 * s, 14), { wash: '#8A8E9A', ink: SET_C.ink, sw: sw * .8 });
  setP(ellPts(ex, ey, 46 * s * grow, 46 * s * grow, 18), { wash: '#D9284F', ink: SET_C.ink, sw });
  setP(ellPts(ex - 14 * s, ey - 14 * s, 12 * s * grow, 9 * s * grow, 10), { wash: '#FF9AB0', ink: null });
  return [ex, ey];
}
// The black mirror: a dark glass with a silver-black frame and pale reflection streaks. Returns S (the glass).
function setMirror(x, y, w, h, o = {}) {
  const b = h * .06, sw = setSW(h / 600), x0 = x - w / 2, y0 = y - h / 2, S = setScr(x0, y0, w, h);
  boilSeed('setmirror frame');
  setP(rrPts(x0 - b, y0 - b, w + 2 * b, h + 2 * b, b * .5, 1), { wash: '#24262E', ink: SET_C.ink, sw });
  setL([[x0 - b * .5, y0 - b * .55], [x0 + w + b * .5, y0 - b * .55]], sw * .9, '#9AA0AE', 'inkfine', 0);
  setL([[x0 - b * .55, y0 - b * .4], [x0 - b * .55, y0 + h + b * .4]], sw * .6, '#6A6E7A', 'inkfine', 0);
  setP(setBox(x0, y0, x0 + w, y0 + h), { wash: SET_SCR_BG.mirror, ink: null });
  if (o.content) o.content(S);
  boilSeed('setmirror streaks');
  for (const [u, v, l, op] of [[.12, .08, .5, 70], [.2, .06, .35, 45], [.72, .7, .3, 40]]) setP([[S.X(u), S.Y(v)], [S.X(u + .04), S.Y(v)], [S.X(u + .04 - l * .4), S.Y(v + l)], [S.X(u - l * .4), S.Y(v + l)]], { wash: '#C9CED8', washOp: op, ink: null });
  if (o.glint) { const g = o.glint, gx = S.X(lerp(-.1, 1.1, g)); setShaft([gx - w * .1, y0], [gx + w * .05, y0 + h], w * .06, SET_C.cyanW, .5 * Math.sin(g * Math.PI)); }
  if (o.amber) glow(x, y, Math.max(w, h) * .6, SET_C.amber, .25 * o.amber);
  return S;
}
// A ripple ring of light (on the black glass, from her mouth, from the palms). a 0..1 strength, o.col, o.ry (flatten).
function setRipple(x, y, r, a = 1, o = {}) {
  if (a <= 0 || r < 1) return;
  const col = o.col || '#BFD8E8';
  setRingLight(x, y, r, r * (o.ry ?? 1), col, .55 * a);
  boilSeed('setripple' + (o.key || '') + Math.round(r));
  setP(ellPts(x, y, r, r * (o.ry ?? 1), 36), { wash: null, ink: col, sw: setSW(r / 300) * .6 * a + .1 });
}
// 09I: the glass seen edge-on. Two thin parallel lines and a faint sheen.
function setGlassEdge(x, y0, y1, o = {}) {
  const col = o.col || '#9FB8D0', sw = o.sw ?? 1;
  boilSeed('setglassedge');
  setL([[x - 5, y0], [x - 5, y1]], sw * .7, col, 'inkfine', 0);
  setL([[x + 5, y0], [x + 5, y1]], sw * .5, col, 'inkfine', 0);
  setShaft([x, y0], [x, y1], 30, '#BFD8E8', .35 * (o.a ?? 1));
}
// 09F: the jackpot's gold confetti: streamers and flakes bursting from (x, y) and fluttering down. age = s since the
// burst (151.40), o.n (≤ 40), o.spread (px, 900), o.up (initial lift, 700), o.s (piece size, 1.6 ≈ 35 px), o.cols. Batched by colour (each colour change
// is a blend pass), a few sparkles as glow.
function setConfetti(x, y, age, o = {}) {
  if (age < 0) return;
  const n = Math.min(40, o.n ?? 32), spread = o.spread ?? 900, up = o.up ?? 700, cols = o.cols || [SET_C.gold, '#FFE9A8', '#E8A23A', SET_C.fever];
  const k = 1 - Math.exp(-age * 2.6), fall = 260 * Math.max(0, age - .25) * (1 + .25 * age);
  const P = [];
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3.17 + .4), h2 = hash(i * 5.93 + 1.3), ang = -Math.PI / 2 + (h1 - .5) * 2.4, sp = .45 + .55 * h2;
    const px = x + Math.cos(ang) * spread * sp * k + 40 * Math.sin(age * (3 + 2 * h2) + i) * clamp(age * 2);
    const py = y + Math.sin(ang) * up * sp * k + fall * (.7 + .6 * h1);
    P.push({ i, px, py, rot: age * (2 + 5 * h2) * (h1 > .5 ? 1 : -1) + i, flip: Math.cos(age * (5 + 6 * h1) + i), col: cols[i % cols.length], strip: i % 3 === 0 });
  }
  for (const col of cols) {
    boilSeed('confetti ' + col);
    for (const q of P) {
      if (q.col !== col) continue;
      const sz = (o.s ?? 1.6) * (16 + 10 * hash(q.i * 2.2));
      if (q.strip) {      // a curly streamer
        const L = []; for (let j = 0; j <= 6; j++) L.push([j * sz * .55, Math.sin(j * 1.3 + q.rot * 2) * sz * .45]);
        setP(ribbon(setTf(L, q.px, q.py, 1, q.rot), sz * .22 * Math.max(.25, Math.abs(q.flip))), { wash: col, ink: null });
      } else setP(setTf([[-1, -.6], [1, -.6], [1, .6], [-1, .6]].map(([a, b]) => [a * sz * .5, b * sz * .5 * Math.max(.15, Math.abs(q.flip))]), q.px, q.py, 1, q.rot), { wash: col, ink: null, line: true });
    }
  }
  for (let i = 0; i < 8; i++) { const q = P[i * 4 % n]; glow(q.px, q.py, 40, SET_C.gold, .5 * clamp(1.6 - age * .5) * (.5 + .5 * Math.abs(q.flip))); }
}
