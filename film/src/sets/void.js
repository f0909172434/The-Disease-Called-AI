// void.js: the void / abstract layers (05A shards and halos, 08G black + ↻, 12A black + flat line) and the END CARD
// (13A: dark paper, the two cards, her amber • • •). Screen space unless noted.
//
//   setVoidLayer(kind, o)      cached screen background: 'black' (#05060A), 'navy', 'indigo', 'blood', 'ash'
//   setShards(t, o)            05A: brush fragments: o.gather 0..1 (scattered → closed on a ring round (cx, cy)), o.ash 0..1
//                              (turn grey and fall), o.n (≤ 40), o.cx/o.cy/o.r
//   setHalo(x, y, r, o)        one ring of light (05A: one per `always`); o.a, o.ash 0..1 (grey), o.ry
//   setHaloSwirl(x, y, t, n, o) up to 60 halos arranged in a turning vortex (05A 80.93–82.33)
//   setRefreshVoid(k, o)       08G end: black, one ↻ turning once (k 0..1 of the turn)
//   setFlatline(x0, x1, y, o)  an amber flat line that boils (12A, 11A's last line of light); o.col, o.k (length 0..1
//                              growing from the centre), o.glow
//   setEndCard(lt, o)          13A at lt s into the card (206.51 = 0): dark paper, card 1 → dissolve → card 2, dots blink twice
const SET_VOIDS = { black: [SET_C.void, '#0C0E16'], navy: [SET_C.navy, '#0F1C40'], indigo: ['#141A3E', '#2F3C7A'], blood: ['#24040E', '#5A0A1E'], ash: ['#2A2A30', '#3E3E46'] };
function setVoidLayer(kind = 'black', o = {}) {
  const [a, b] = SET_VOIDS[kind] || SET_VOIDS.black;
  setScreenLayer('setvoid ' + kind, () => {
    boilSeed('void bg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: a, ink: null });
    [[.5, .5, .42, .4, 110], [.2, .3, .25, .3, 60], [.82, .72, .25, .25, 60]].forEach(([x, y, rx, ry, op], i) => { boilSeed('void bloom' + i); paint(ellPts(W * x, H * y, W * rx, H * ry, 24, 30), { fill: b, fillOp: op * (kind === 'black' ? .45 : 1), bleed: .3, tex: .6, ink: null }); });
  }, { par: o.par });
}
function setShards(t, o = {}) {
  const n = Math.min(40, o.n ?? 30), g = clamp(o.gather ?? 0), ash = clamp(o.ash || 0), cx = o.cx ?? W / 2, cy = o.cy ?? H * .45, R = o.r ?? 300;
  const cols = [SET_C.cyan, '#2F3C7A', SET_C.cyanW, '#1B6FFF', '#3A2A6A'];
  for (let i = 0; i < n; i++) {
    const a0 = hash(i * 1.3) * TAU, d0 = 500 + 700 * hash(i * 2.7), a1 = i / n * TAU, d1 = R * (.7 + .5 * hash(i * 5.1));
    const e = easeOut(g), ang = lerp(a0, a1, e) + t * (.15 + .2 * hash(i)) * (1 - e), d = lerp(d0, d1, e);
    const fall = ash * ash * (300 + 500 * hash(i * 9.3)), x = cx + Math.cos(ang) * d + Math.sin(t * .7 + i) * 18 * (1 - e), y = cy + Math.sin(ang) * d * .7 + fall;
    const s = 26 + 46 * hash(i * 3.9), rot = t * (.6 + hash(i)) * (hash(i * 7) > .5 ? 1 : -1) + i, col = mixCol(cols[i % cols.length], '#6E6E78', ash);
    const P = [[-1, -.6], [.9, -.8], [1.1, .5], [-.4, .9]].map(([px, py]) => [px * (1 + .3 * hash(i + px)), py * (1 + .3 * hash(i * 2 + py))]);
    boilSeed('shard' + i);
    // watercolour: a wash, a paler pigment pool inside, a darker wet edge (pigment gathers at the rim), an inked edge of uneven weight
    const wo = 255 * (1 - ash * .5), rim = mixCol(col, '#0A0C24', .45), pool = mixCol(col, '#FFFFFF', .28 + .15 * hash(i * 4.4));
    setP(setTf(P, x, y, s, rot), { wash: col, washOp: wo, ink: null });
    setP(setTf(P.map(([px, py]) => [px * .62 + .12 * (hash(i * 6.1) - .5), py * .62]), x, y, s, rot), { wash: pool, washOp: wo * .55, ink: null });
    setP(setTf(P, x, y, s, rot), { wash: null, ink: i % 3 ? rim : '#E8FDFF', sw: .5 + .7 * hash(i * 8.8), line: true });
    if (i % 3 === 0 && ash < .8) glow(x, y, s * 2, SET_C.cyan, .35 * (1 - ash));
  }
}
function setHalo(x, y, r, o = {}) {
  const a = o.a ?? 1, ash = clamp(o.ash || 0), col = mixCol(o.col || SET_C.cyan, '#7A7A84', ash), ry = o.ry ?? .35;
  if (a <= 0) return;
  setRingLight(x, y, r, r * ry, col, .7 * a * (1 - ash * .7));
  boilSeed('halo' + (o.key || '') + Math.round(r));
  setP(ellPts(x, y, r, r * ry, 40), { wash: null, ink: mixCol(SET_C.cyanW, '#8A8A92', ash), sw: setSW(r / 200) * .5 * a + .1 });
}
function setHaloSwirl(x, y, t, n = 30, o = {}) {
  n = Math.min(60, n);
  for (let i = 0; i < n; i++) {
    const k = i / Math.max(1, n - 1), ang = t * (.9 - .4 * k) + i * 2.4, r = 80 + k * (o.r ?? 520), dx = Math.cos(ang) * r * .35, dy = Math.sin(ang) * r * .2;
    setHalo(x + dx, y + dy - k * 40, 60 + r * .45, { a: (o.a ?? 1) * (1 - k * .5), ash: o.ash, key: 'sw' + i, ry: .3 + .1 * Math.sin(ang) });
  }
}
function setRefreshVoid(k, o = {}) {
  setVoidLayer('black');
  const x = o.x ?? W / 2, y = o.y ?? H * .46, s = o.s ?? 150;
  glow(x, y, s * 1.6, SET_C.cyan, .45);
  setRefresh(x, y, s, SET_C.cyan, { rot: easeOut(clamp(k)) * TAU, glow: .4, key: 'void' });
}
function setFlatline(x0, x1, y, o = {}) {
  const k = o.k ?? 1, col = o.col || SET_C.amber, cx = (x0 + x1) / 2, a = lerp(cx, x0, k), b = lerp(cx, x1, k), pts = [], n = 28;
  if (b - a < 2) return;
  for (let i = 0; i <= n; i++) { const x = lerp(a, b, i / n); pts.push([x, y + (o.tremor ?? 1.2) * Math.sin(i * 2.1 + BOILN * .9) * (.6 + .4 * hash(i + BOILN))]); }
  boilSeed('flatline' + (o.key || ''));
  setL(pts, o.sw ?? 1.3, col, 'ink', .3);
  setL(pts, (o.sw ?? 1.3) * .35, '#FFE2C0', 'inkfine', .3);
  for (let i = 0; i <= 8; i++) glow(lerp(a, b, i / 8), y, o.r ?? 70, col, (o.glow ?? .35));
}
// End card. o.t1 / o.t2 / o.dots: start times (lt) of card 1, card 2 and the dots' two blinks; o.fade (dissolve s).
function setEndCard(lt, o = {}) {
  setScreenLayer('setendpaper', () => {
    boilSeed('end bg'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#2A2430', ink: null });
    [[.3, .35, .4, .4, '#3A3240', 90], [.75, .65, .35, .35, '#1E1A24', 100], [.55, .2, .3, .2, '#342C3A', 70], [.15, .85, .3, .2, '#1E1A24', 70]]
      .forEach(([x, y, rx, ry, c, op], i) => { boilSeed('end bloom' + i); paint(ellPts(W * x, H * y, W * rx, H * ry, 24, 40), { fill: c, fillOp: op, bleed: .3, tex: .8, ink: null }); });
    for (let i = 0; i < 160; i++) { boilSeed('end fibre' + i); const x = W * hash(i * 3.3), y = H * hash(i * 8.1), l = 10 + 30 * hash(i), a = hash(i * 2.2) * TAU; inkLine([[x, y], [x + Math.cos(a) * l * .5, y + Math.sin(a) * l * .5 + 3], [x + Math.cos(a) * l, y + Math.sin(a) * l]], .35, '#463C4E', 'inkfine', .5); }
  });
  const t1 = o.t1 ?? .39, t2 = o.t2 ?? 4.09, fd = o.fade ?? .4, td = o.dots ?? 7.49;
  const a1 = clamp((lt - t1) / .5) * (1 - clamp((lt - t2) / fd)), a2 = clamp((lt - t2) / fd) * (1 - clamp((lt - (o.t2end ?? 7.09)) / .4));
  const paper = '#E9DFCB';
  if (a1 > 0) {
    setLetter('This song — the words, the music, the voice, the images,', W / 2, H * .4, 44, paper, { font: fontCSS('serif', 44, { italic: true }), alpha: a1, seed: 1, j: .5 });
    setLetter('the direction — was generated by an AI.', W / 2, H * .4 + 60, 44, paper, { font: fontCSS('serif', 44, { italic: true }), alpha: a1, seed: 2, j: .5 });
    setLetter('這首歌的歌詞、旋律、歌聲、畫面與導演，全部由 AI 生成。', W / 2, H * .4 + 150, 34, mixCol(paper, '#2A2430', .15), { font: fontCSS('title', 34, { weight: 400 }), alpha: a1, seed: 3, j: .4 });
  }
  if (a2 > 0) {
    setLetter('Did it move you?', W / 2, H * .44, 74, SET_C.amber, { font: fontCSS('human', 74, { weight: 600 }), alpha: a2, seed: 4, j: .6 });
    setLetter('它打動你了嗎？', W / 2, H * .44 + 96, 40, mixCol(SET_C.amber, paper, .4), { font: fontCSS('title', 40, { weight: 400 }), alpha: a2, seed: 5, j: .4 });
  }
  const d = lt - td, on = (d >= 0 && d < .22) || (d >= .5 && d < .72);
  if (on) setDots(W * .88, H * .86, 9, { col: SET_C.amber, glow: .7, t: 0, wave: 0, key: 'end' });
}
