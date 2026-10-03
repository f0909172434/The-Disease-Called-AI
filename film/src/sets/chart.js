// chart.js: the patient chart on its clipboard (STORYBOARD 01B title card, 10B, and hanging on the ward bed's footboard),
// with its ECG strip. Lettering only as §0 allows: `病名為AI` and `THE DISEASE CALLED A.I.` (01B), `A.` falling off to
// leave `I` (10B). Everything else on the paper is ruled lines, boxes and a barcode.
//
//   setChart(x, y, s, o)   centre (x, y); 760 × 1000 at s = 1 (fills the frame height at s ≈ 1.05).
//     o.stamp1 / o.stamp2: seconds since `病名為AI` / `THE DISEASE CALLED A.I.` landed (null: not yet; 01B: t - 15.35,
//       t - 16.74). o.fall: seconds since `A.` let go (10B: t - 171.63) — it drops out of frame, `I.` stays.
//     o.ecg: options for the strip (beats, t, dotsT, ...: see setECG); o.style 'paint' | 'line' (10B, in the line-drawn
//     ward: cyan outlines, cyan-white lettering); o.mini (small, cached in the ward: no lettering, red marks instead).
//     o.cache: paint the static paper (board, clip, form, graph paper) once into cached tiles (setTiles) together with
//       the background behind it, o.bg: 'indigo' (01B) | 'final' (10B) | any setVoidLayer kind | fn(x0, y0, x1, y1) (+ o.bgKey);
//       o.res / o.variants as setTiles (fix res for a push). The stamps, the ECG trace and its dots stay live.
//   SET_CHART.barcode: the barcode's centre at s = 1 (01B's match cut from the wristband's barcode lands here).
const SET_CHART = { w: 760, h: 1000, barcode: [-205, -352], title1: [0, -175], title2: [0, -20], ecg: [-300, 150, 600, 270] };
function setChart(x, y, s = 1, o = {}) {
  const P = setPalOf(o), line = o.style === 'line' || SET_MODE === 'line', m0 = SET_MODE;
  if (line) { SET_MODE = 'line'; SET_LINE.col = o.lineCol || SET_C.cyan; }
  const X = (px, py) => [x + px * s, y + py * s], M = Q => Q.map(([a, b]) => X(a, b)), sw = setSW(s), kk = 'setchart' + (o.key || '');
  const ecg = [...X(SET_CHART.ecg[0], SET_CHART.ecg[1]), SET_CHART.ecg[2] * s, SET_CHART.ecg[3] * s], eo = { key: kk, line, ...(o.ecg || {}) };
  if (o.cache && !o.mini) {   // the board, paper, form and graph paper cached in tiles (with the background behind them)
    const bg = o.bg, bk = typeof bg === 'string' ? bg : bg ? (o.bgKey || 'custom') : 'none';
    setTiles(`setchart ${line ? 'line' : 'paint'} ${bk} ${x},${y},${s}`, (x0, y0, x1, y1) => {
      const mm = SET_MODE; SET_MODE = 'paint';
      if (typeof bg === 'string') setChartBg(bg, x, y, s, x0, y0, x1, y1); else if (bg) bg(x0, y0, x1, y1);
      if (line) SET_MODE = 'line';
      setChartPaper(x, y, s, o, P, line, kk); setECG(...ecg, { ...eo, part: 'paper' });
      SET_MODE = mm;
    }, { res: o.res, variants: o.variants ?? (line ? 1 : 3), cam: o.cam });
    setECG(...ecg, { ...eo, part: 'trace' });
  } else { setChartPaper(x, y, s, o, P, line, kk); setECG(...ecg, eo); }
  const red = line ? SET_C.cyanW : (o.stampCol || '#D9284F');
  if (o.mini) {            // illegible red stamp marks for wide shots
    boilSeed(kk + ' mini');
    setP(M(setBox(-200, -230, 200, -120, 2)), { wash: null, ink: red, sw: sw * 3 });
    for (let i = 0; i < 4; i++) setP(M(setBox(-170 + i * 90, -200, -110 + i * 90, -150)), { wash: red, washOp: 200, ink: null });
    setP(M(setBox(-260, -60, 260, 20, 2)), { wash: null, ink: red, sw: sw * 2.4 });
    setP(M(setBox(-230, -38, 230, -2)), { wash: red, washOp: 170, ink: null });
  } else {
    const [t1x, t1y] = SET_CHART.title1, [t2x, t2y] = SET_CHART.title2;
    if (o.stamp1 != null) setStamp(...X(t1x, t1y), 540 * s, 170 * s, '病名為AI', fontCSS('title', 112 * s, { weight: 700 }), red, o.stamp1, { size: 112 * s, rot: -.035, key: kk + '1' });
    if (o.stamp2 != null) {
      const size = 44 * s, font = fontCSS('ui', size, { weight: 800 }), left = 'THE DISEASE CALLED ', a = 'A.', i = 'I.';
      const wl = setTextW(left, font), wa = setTextW(a, font), wi = setTextW(i, font), tot = wl + wa + wi, x0 = -tot / 2;
      const f = o.fall, parts = [{ text: left, dx: x0 + wl / 2 }, { text: i, dx: x0 + wl + wa + wi / 2, seed: 2 }];
      if (f == null || f < 0) parts.push({ text: a, dx: x0 + wl + wa / 2, seed: 1 });
      else {                // `A.` lets go: a small lift, then it drops and spins out of frame; a faint ghost stays
        const dy = f < .08 ? -6 * s * Math.sin(f / .08 * Math.PI) : .5 * 2600 * s * (f - .08) ** 2, rot = f < .08 ? 0 : (f - .08) * 3.2;
        parts.push({ text: a, dx: x0 + wl + wa / 2 + 30 * s * Math.max(0, f - .08), dy, rot, alpha: clamp(1.4 - f * .9), seed: 1 });
        parts.push({ text: a, dx: x0 + wl + wa / 2, alpha: .12 * clamp(f * 4), seed: 1 });
      }
      setStamp(...X(t2x, t2y), 640 * s, 96 * s, 'THE DISEASE CALLED A.I.', font, red, o.stamp2, { size, rot: .02, key: kk + '2', parts });
    }
  }
  SET_MODE = m0;
}
// The static paper of the chart: board, paper, clip, header form (barcode, rules, boxes; no words).
function setChartPaper(x, y, s, o, P, line, kk) {
  const X = (px, py) => [x + px * s, y + py * s], M = Q => Q.map(([a, b]) => X(a, b)), sw = setSW(s);
  boilSeed(kk + ' board');
  setP(M(rrPts(-380, -500, 760, 1000, 34, 1)), { wash: P.board || '#8A6A4C', ink: P.ink, sw: sw * 1.2 });
  if (!o.mini && !line) setP(M(rrPts(-360, -480, 720, 960, 30)), { fill: P.boardDk || '#634830', fillOp: 60, bleed: .1, tex: .6, ink: null });
  boilSeed(kk + ' paper');
  setP(M([[-332, -430], [334, -426], [330, 466], [-334, 470]]), { wash: P.page || '#F4ECDA', ink: P.ink, sw: sw * .8 });
  setP(M([[-334, 440], [330, 436], [330, 466], [-334, 470]]), { wash: P.pageSh || '#D9CDB4', washOp: 150, ink: null });
  // the clip
  boilSeed(kk + ' clip');
  setP(M([[-150, -446], [150, -446], [160, -404], [-160, -404]]), { wash: P.clip || '#B9BCC4', ink: P.ink, sw });
  setP(M([[-90, -446], [-76, -520], [76, -520], [90, -446]]), { wash: P.clip || '#B9BCC4', ink: P.ink, sw, curv: .3 });
  setP(M(ellPts(0, -486, 26, 16, 14)), { wash: P.board || '#8A6A4C', ink: P.ink, sw: sw * .6 });
  for (const rx of [-120, 120]) setP(M(ellPts(rx, -424, 9, 9, 10)), { wash: P.metalDk || '#5E5B6A', ink: null, line: true });
  // header: barcode, rules, boxes (no words)
  boilSeed(kk + ' form');
  const [bx, by] = SET_CHART.barcode;
  for (let i = 0; i < 24; i++) { const xx = bx - 80 + i * 7 + (hash(i * 3.7) - .5) * 2; setL(M([[xx, by - 24], [xx, by + 24]]), sw * (hash(i * 1.9) > .6 ? 1.3 : .6), P.code || P.ink, 'inkfine', 0); }
  for (let i = 0; i < 3; i++) setL(M([[-40, -380 + i * 26], [280 - 60 * (i % 2), -380 + i * 26]]), sw * .5, '#8FA6C8', 'inkfine', 0);
  for (let i = 0; i < 3; i++) setP(M(setBox(-300 + i * 200, -290, -276 + i * 200, -266)), { wash: null, ink: P.inkSoft || P.ink, sw: sw * .5 });
  if (o.mini || line) for (let i = 0; i < 3; i++) setL(M([[-220 + i * 200, -278], [-120 + i * 200, -278]]), sw * .5, '#8FA6C8', 'inkfine', 0);
  for (let i = 0; i < 4; i++) setL(M([[-300, 70 + i * 20 - 40], [300, 70 + i * 20 - 40]]), sw * .35, '#B9C6DA', 'inkfine', 0);
}
// A void behind a cached chart, painted in the chart's own coordinates (the frame-filling chart is s ≈ 1.04): kind
// 'indigo' | 'navy' | 'black' | 'blood' | 'ash' (as setVoidLayer) or 'final' (10B: the line ward's blueprint navy + grid).
function setChartBg(kind, x, y, s, x0, y0, x1, y1) {
  const k = s / 1.04, F = (u, v) => [x + (u - .5) * W * k, y + (v - .5) * H * k];
  if (kind === 'final') {
    boilSeed('chartbg final'); paint(setBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40), { wash: '#070B16', ink: null });
    paint(ellPts(...F(.5, .55), W * .5 * k, H * .45 * k, 30, 10), { wash: '#0B1430', washOp: 120, ink: null });
    const g = 120 * k;
    for (let gx = Math.ceil((x0 - x) / g) * g + x; gx < x1; gx += g) { boilSeed('chartbg gx' + Math.round((gx - x) / g)); inkLine([[gx, y0], [gx, y1]], .35, '#123060', 'inkfine', 0); }
    for (let gy = Math.ceil((y0 - y) / g) * g + y; gy < y1; gy += g) { boilSeed('chartbg gy' + Math.round((gy - y) / g)); inkLine([[x0, gy], [x1, gy]], .35, '#123060', 'inkfine', 0); }
    return;
  }
  const [a, b] = SET_VOIDS[kind] || SET_VOIDS.indigo;
  boilSeed('chartbg ' + kind); paint(setBox(x0 - 40, y0 - 40, x1 + 40, y1 + 40), { wash: a, ink: null });
  [[.5, .5, .42, .4, 110], [.2, .3, .25, .3, 60], [.82, .72, .25, .25, 60]].forEach(([u, v, rx, ry, op], i) => { boilSeed('chartbg bloom' + i);
    paint(ellPts(...F(u, v), W * rx * k, H * ry * k, 24, 30), { fill: b, fillOp: op * (kind === 'black' ? .45 : 1), bleed: .3, tex: .6, ink: null }); });
}
// The ECG strip: graph paper and the trace (cyan), scrolling right to left with "now" at the right edge.
// (x, y) top-left, w × h. o.t (now), o.beats (times of the beats: e.g. kick onsets; default a steady 2 per second),
// o.span (seconds across the strip, 2.8), o.dotsT (from this time the scroll freezes and the last three beats turn into
// three pulsing dots, • • •: 01B 19.53), o.col, o.line (line style), o.grid (default true).
function setECG(x, y, w, h, o = {}) {
  const t = o.t ?? T, span = o.span ?? 2.8, col = o.col || SET_C.cyan, kk = 'setecg' + (o.key || ''), now = o.dotsT != null ? Math.min(t, o.dotsT) : t;
  const beats = o.beats || Array.from({ length: Math.ceil(now * 2) + 2 }, (_, i) => i * .5).filter(b => b <= now && b > now - span - .5);
  if (o.part !== 'trace') {   // the graph paper (static: cached with the chart when it is)
  boilSeed(kk + ' paper');
  if (!o.line) setP(setBox(x, y, x + w, y + h), { wash: '#F7E4E2', ink: null });
  setP(setBox(x, y, x + w, y + h), { wash: null, ink: o.line ? SET_C.cyan : '#D9A0A6', sw: setSW(h / 270) * .7 });
  if (o.grid !== false) {
    const gc = o.line ? '#1B4F7A' : '#EBB8BE', n = 12, g = w / n;
    for (let i = 1; i < n; i++) setL([[x + i * g, y + 2], [x + i * g, y + h - 2]], setSW(h / 270) * .35, gc, 'inkfine', 0, { skipLine: false, lineCol: gc, lineSw: .35 });
    for (let j = 1; j < Math.round(h / g); j++) setL([[x + 2, y + j * g], [x + w - 2, y + j * g]], setSW(h / 270) * .35, gc, 'inkfine', 0, { lineCol: gc, lineSw: .35 });
  }
  }
  if (o.part === 'paper') return null;
  const base = y + h * .62, amp = h * .42, mk = o.dotsT != null ? ease(clamp((t - o.dotsT) / .4)) : 0;
  const last3 = o.dotsT != null ? beats.filter(b => b <= o.dotsT).slice(-3) : [];
  const shape = d => {   // P wave, QRS, T wave around a beat (d in s from the beat)
    let v = .08 * Math.exp(-(((d + .12) / .03) ** 2)) - .12 * Math.exp(-(((d + .025) / .008) ** 2)) + Math.exp(-((d / .012) ** 2)) - .28 * Math.exp(-(((d - .03) / .012) ** 2)) + .16 * Math.exp(-(((d - .2) / .05) ** 2));
    return v;
  };
  const pts = [], N = 140;
  for (let i = 0; i <= N; i++) {
    const tau = now - span * (1 - i / N);
    let v = 0; for (const b of beats) { const d = tau - b; if (d > -.2 && d < .35) v += shape(d) * (last3.includes(b) ? 1 - mk : 1); }
    pts.push([x + w * i / N, base - v * amp]);
  }
  boilSeed(kk + ' trace');
  const lw = Math.max(.4, setSW(h / 270) * 1.1);
  setL(pts, lw, o.line ? SET_C.cyan : col, 'inkfine', .1, { lineSw: 1 });
  if (!o.line) setL(pts, lw * .4, SET_C.cyanW, 'inkfine', .1);
  const hp = pts[pts.length - 1]; glow(hp[0], hp[1], h * .35, col, mk ? .4 * (1 - mk) : .7);
  if (mk > 0) last3.forEach((b, i) => {
    const dx = x + w * (1 - (now - b) / span), ph = Math.pow(.5 + .5 * Math.cos((bpOf(t) * 2 / 3 - i / 3) * TAU), 3) * clamp((t - o.dotsT - .4) / .3);
    const r = h * .055 * mk * (1 + .15 * ph), dy = base - amp * .35 - h * .04 * ph;
    boilSeed(kk + ' dot' + i);
    setP(ellPts(dx, dy, r, r * .92, 16), { wash: col, ink: null, line: true });
    glow(dx, dy, r * 3.5, col, .6 * mk * (.6 + .4 * ph));
  });
  return { head: hp, dots: last3.map(b => [x + w * (1 - (now - b) / span), base - amp * .35]) };
}
