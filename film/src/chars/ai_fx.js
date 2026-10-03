// ai_fx.js: her effects and the giant shots (loaded after ai_props.js; globals ai / AI_). Brush paint only: aiPaint /
// aiLine / aiGlow, plus cachedLayer images for the shards and the slot reels (painted once, then moved / masked).
//   AI_PAL.mirror                      the low-contrast silver-grey reflection palette (09H)
//   o.ripple = { c, age, amp, wl, speed }   a ripple running through her shapes (09H); aiRipple() paints the rings
//   o.strings = { to: { wristL, wristR, head }, col } | { lines: [...] }   puppet strings (10C / 10D)
//   o.dissolve 0..1 (+ o.dissolveTo [wx, wy]): she thins out into light motes flying to a point (06F, into the phone)
//   aiBeam(x, y, u, k)                 the lamp's light column she descends in (04A, with aiDescend)
//   aiGiantHand(x, y, s, o)            the giant's hand (08A-08F): cup, palm, finger, two, open; drawn at its real size
//   aiShards(t, o)                     07B: her figure (cached) torn into strips that break into falling shards
//   aiReels(t, o)                      09E / 09F: her close-up cut into three reels that spin and stop one by one
//   aiScanBands(x, y, w, h, k, t)      the rewind's brush scan bands (09B-09D); aiRewindT(t, tPress, dur, back) its time

AI_PAL.mirror = { ...AI_PAL.default,
  ink: '#3C3F4A', line: '#5E626F', skin: '#D9DBE2', skinSh: '#BFC2CC', cheek: '#C9C3CC',
  hair0: '#5D6270', hair1: '#6E7482', hair2: '#7D8492', hair3: '#8E95A3', hair4: '#A6ADBA', hairHi: '#A9AFBB', hairInk: '#3A3D46',
  fin: '#616674', finIn: '#A7ABB6', iris0: '#4C515E', iris1: '#7A808E', iris2: '#A2A8B5', iris3: '#C6CBD4', pupil: '#363944', white: '#E6E8EC', hi: '#F4F5F7', lash: '#33353D',
  navy: '#5F6372', navySh: '#4C505D', navyHi: '#777C8A', gold: '#A9A6A2', panel: '#8A8F9C', panelSh: '#727784', cream: '#E1E3E8', creamSh: '#C4C7CF',
  bow: '#9EA5B2', bowSh: '#7F8693', gem: '#C8CCD4', stock: '#E3E5EA', stockSh: '#C3C6CE', shoe: '#4E525E', shoeHi: '#737885', tail: '#666B79', tailIn: '#A3A8B4',
  mouth: '#BDB3B8', tongue: '#D1C9CD', heart: '#BBAEB5', teeth: '#EEEFF2', rim: '#C9CED8', shadow: '#3C3F4A', hatch: '#33353D', glowK: 0 };

// ---------- ripple ----------
// A ring running out from c (her local u; default her face) at speed u/s; amp (u) fades with age and with distance.
function aiRippleDisp(sp, u) {
  const c = sp.c || [0, -9.1], amp = (sp.amp ?? .14) * u * Math.exp(-(sp.age || 0) * (sp.decay ?? .9)), wl = (sp.wl ?? .9) * u, front = (sp.speed ?? 2.6) * u * (sp.age || 0);
  if (amp < .3) return null;
  return (x, y) => {
    const dx = x - c[0] * u, dy = y - c[1] * u, r = Math.hypot(dx, dy) || 1, env = Math.exp(-Math.pow((r - front) / (wl * 1.6), 2));
    const d = amp * env * Math.sin((r - front) / wl * TAU); return [dx / r * d, dy / r * d];
  };
}
// Ripple rings on the glass: n rings out to radius r (px) at progress k (0..1), pale ink, thinning as they spread.
function aiRipple(x, y, r, k, o = {}) {
  boilSeed('airipple ' + (o.key || ''));
  const n = o.n ?? 4, col = o.col || '#C9E9F2';
  for (let i = 0; i < n; i++) {
    const f = k - i * .18; if (f <= 0 || f >= 1) continue;
    const rr = r * f, a = 1 - f, P = []; for (let j = 0; j <= 40; j++) { const t = j / 40 * TAU; P.push([x + Math.cos(t) * rr * (1 + .015 * Math.sin(t * 5 + i)), y + Math.sin(t) * rr * (o.flat ?? .85)]); }
    inkLine(P, (o.sw ?? 1.2) * (.4 + .8 * a), col, 'inkfine', .5);
  }
}

// ---------- puppet strings (10C / 10D) ----------
// sp.to = { wristL, wristR, head } (world px: where each string goes up to), or sp.lines = [{ from: 'wristL' | 'handR' |
// 'head' | [x, y] (her local u), to: [wx, wy], sag: 0..1 }]; sp.col (default cyan; amber in the swap), sp.w (line weight).
function aiStrings(sp, H, u) {
  const S = AI_S, col = sp.col || AI_CYAN, lines = sp.lines || Object.entries(sp.to || {}).map(([from, to]) => ({ from, to, sag: sp.sag || 0 }));
  for (const L of lines) {
    const a = Array.isArray(L.from) ? [L.from[0] * u, L.from[1] * u] : L.from === 'head' ? H(0, -1.12) : S.pts[L.from]; if (!a) continue;
    const b = aiFromW(L.to), m = [lerp(a[0], b[0], .5), lerp(a[1], b[1], .5) + (L.sag || 0) * Math.hypot(b[0] - a[0], b[1] - a[1]) * .25];
    aiLine(aiCurve([a, m, b], 8), S.sw * (sp.w ?? .55), col, 'inkfine');
    if (S.u > 12) { aiGlow(a[0], a[1], .25 * u, col, .7); for (let i = 1; i < 4; i++) { const p = aiCurve([a, m, b], 4)[Math.round(i * 2.5)]; if (p) aiGlow(p[0], p[1], .14 * u, col, .4); } }
    aiPaint(aiEll(a[0], a[1], .05 * u, .05 * u, 8), { wash: AI_CYANW, ink: null });
  }
}

// ---------- dissolve motes (06F) ----------
function aiDissolveMotes(k, H, u, tt, to) {
  const S = AI_S, dis = S.dis; S.dis = 0;
  const T = to ? aiFromW(to) : null, n = 34;
  for (let i = 0; i < n; i++) {
    const d0 = hash(i * 3.17) * .45, p = clamp((k - d0) / .55); if (p <= 0 || p >= 1) continue;
    const a = (hash(i * 7.3) - .5) * 2.6, b = -.9 + hash(i * 5.1) * 3.2, s0 = H(a, b);
    const e = ease(p), tgt = T || [s0[0] + (hash(i * 2.2) - .5) * u, s0[1] - 2.5 * u];
    const m = [lerp(s0[0], tgt[0], .5) + (hash(i * 9.9) - .5) * 1.5 * u, lerp(s0[1], tgt[1], .5) - .8 * u];
    const q = [lerp(lerp(s0[0], m[0], e), lerp(m[0], tgt[0], e), e), lerp(lerp(s0[1], m[1], e), lerp(m[1], tgt[1], e), e)];
    const z = (.05 + .06 * hash(i * 4.4)) * u * (1 - .6 * e), al = Math.sin(p * Math.PI);
    aiPaint([[q[0], q[1] - z], [q[0] + z, q[1]], [q[0], q[1] + z], [q[0] - z, q[1]]], { wash: i % 3 ? AI_CYAN : AI_CYANW, op: 230 * al, ink: null });
    if (S.u > 12 && i % 2 === 0) aiGlow(q[0], q[1], z * 4, AI_CYAN, .6 * al);
  }
  S.dis = dis;
}

// ---------- the lamp's light column (04A) ----------
// A soft cyan column from the top of the frame down to (x, y) (world px, her ground point), for a figure of unit u.
function aiBeam(x, y, u, k, o = {}) {
  if (k <= .01) return;
  boilSeed('aibeam ' + (o.key || ''));
  const top = o.top ?? -50, w0 = (o.w0 ?? 1.6) * u, w1 = (o.w1 ?? 3.2) * u;
  paint([[x - w0, top], [x + w0, top], [x + w1, y], [x - w1, y]], { wash: o.col || '#BFF6FF', washOp: 70 * k, ink: null });
  paint([[x - w0 * .45, top], [x + w0 * .45, top], [x + w1 * .4, y], [x - w1 * .4, y]], { wash: '#E8FDFF', washOp: 60 * k, ink: null });
  for (let i = 0; i < 6; i++) { const f = i / 5; glow(x, lerp(top, y - 5 * u, f), lerp(w0, w1, f) * 1.4, o.col || AI_CYAN, .45 * k); }
}

// ---------- the giant's hand (S08) ----------
// (x, y) = the wrist (world px); s = the hand's length (wrist to the middle fingertip, px); o.ang = where the fingers
// point (rad, 0 = screen-right, π/2 = down); o.kind: 'open' (palm out, fingers a little apart) | 'palm' (the same,
// fingers together: the wall he runs into) | 'cup' (palm up, fingers curled up: holding the bed island) | 'finger' (a
// fist with the index out: the finger he hugs) | 'two' (index and middle out: combing his hair); o.back: the back of
// the hand (nails, knuckles) instead of the palm; o.flip: her left hand; o.sleeve (hand lengths of sleeve behind the
// wrist, default 1.2); o.part: 'all' | 'back' (palm and sleeve only) | 'front' (the fingers only: over what the hand
// holds); o.pal, o.u (her unit, for line weights; default s / 1.15), o.curl 0..1 (fingers closing). Returns { tip,
// tips, palm } in world px.
function aiGiantHand(x, y, s, o = {}) {
  const pal = typeof o.pal === 'object' ? o.pal : AI_PAL[o.pal] || AI_PAL.default, prev = AI_S, u = o.u ?? s / 1.15;
  boilSeed('aigiant ' + (o.boilKey ?? o.kind));
  const swMax = 1.7 * Math.sqrt(Math.max(1, u / 145));
  AI_S = { P: pal, u, k: AI_FORM.full.k * u, sw: clamp(u / 85, .22, swMax) * pal.swk, swF: clamp(AI_FORM.full.k * u / 75, .22, swMax * .88) * pal.swk, J: pal.J * u / 60 * .5, clip: null, rot: 0, pts: {}, n: 0,
    tf: { X: x, Y: y, py: 0, sx: o.flip ? -1 : 1, sy: 1, roll: 0 } };
  const ang = o.flip ? Math.PI - (o.ang ?? -Math.PI / 2) : (o.ang ?? -Math.PI / 2);
  push(); translate(x, y); if (o.flip) scale(-1, 1);
  const r = aiGiantHand0(s, ang, o.kind || 'open', o, pal);
  pop();
  const out = {}; for (const k in r) out[k] = Array.isArray(r[k][0]) ? r[k].map(aiToW) : aiToW(r[k]);
  AI_S = prev; boilSeed('aigiant after');
  return out;
}
// The hand in its own frame: wrist at (0, 0), fingers along angle a, length s. Hand units: x along the hand (knuckles at
// ~.5, the middle fingertip at 1), y across with the thumb on +y.
const AI_GH = {   // fingers: base [x, y], length, width (index, middle, ring, little)
  F: [[[.5, .155], .37, .132], [[.53, .05], .42, .138], [[.51, -.056], .39, .13], [[.46, -.158], .31, .116]],
  palm: [[0, -.19], [.16, -.21], [.32, -.225], [.46, -.22], [.53, -.16], [.56, -.05], [.56, .07], [.54, .19], [.44, .245], [.3, .26], [.14, .25], [0, .2]],
};
function aiGiantHand0(s, a, kind, o, C) {
  const S = AI_S, big = s > 450, sw = S.sw * (big ? .42 : .6), back = !!o.back, part = o.part || 'all';   // big: the giant scale: thinner ink, more skin detail
  const R = (x, y) => { const c = Math.cos(a), n = Math.sin(a); return [(x * c - y * n) * s, (x * n + y * c) * s]; };
  const M = pts => pts.map(p => { const q = R(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; });
  const crease = mixCol(C.skinSh, C.ink, .3), out = { palm: R(.3, 0), tips: [] };
  // one finger: a tapered ribbon through its joints, a round tip, a shaded side; nail and knuckles from the back
  const finger = (pts, w, i, o2 = {}) => {
    const E = aiRib(M(pts), pts.map((_, j) => w * (1 - .2 * j / (pts.length - 1)) * s), 4), m = E.L.length - 1, tip = E.C[m];
    const dir = [tip[0] - E.C[m - 2][0], tip[1] - E.C[m - 2][1]], dl = Math.hypot(...dir) || 1, ux = dir[0] / dl, uy = dir[1] / dl, rr = Math.hypot(E.L[m][0] - tip[0], E.L[m][1] - tip[1]), cap = [];
    for (let k = 1; k < 8; k++) { const t = Math.PI * k / 8; cap.push([tip[0] - uy * Math.cos(t) * rr + ux * Math.sin(t) * rr * 1.1, tip[1] + ux * Math.cos(t) * rr + uy * Math.sin(t) * rr * 1.1]); }
    aiPaint(E.L.concat(cap, E.R.slice().reverse()), { wash: C.skin, ink: C.ink, sw, br: C.brS });
    aiPaint(E.R.slice(1).concat(E.C.slice(1).map((p, j) => [lerp(p[0], E.R[j + 1][0], .3), lerp(p[1], E.R[j + 1][1], .3)]).reverse()), { wash: C.skinSh, op: 120, ink: null });
    if (back && !o2.noNail) {
      const nb = E.C[Math.round(m * .8)], nl = rr * 1.25;
      aiPaint(aiEll(lerp(nb[0], tip[0], .55), lerp(nb[1], tip[1], .55), nl * .62, nl * .44, 14, Math.atan2(uy, ux)), { wash: '#F7DEDA', ink: crease, sw: sw * .45 });
      for (const f of [.28, .6]) { const j = Math.round(m * f), c = E.C[j]; aiLine([[lerp(c[0], E.L[j][0], .5), lerp(c[1], E.L[j][1], .5)], [c[0] + ux * rr * .25, c[1] + uy * rr * .25], [lerp(c[0], E.R[j][0], .5), lerp(c[1], E.R[j][1], .5)]], sw * .45, crease); }
    } else if (!back) for (const f of (big ? [.22, .44, .7] : [.36, .68])) { const j = Math.round(m * f); aiLine([[lerp(E.L[j][0], E.R[j][0], .25), lerp(E.L[j][1], E.R[j][1], .25)], [lerp(E.L[j][0], E.R[j][0], .75), lerp(E.L[j][1], E.R[j][1], .75)]], sw * .4, crease); }
    out.tips[i] = tip; if (i === 0) out.tip = tip;
    return E;
  };
  const chain = (base, len, ang, bend, f = [.45, .31, .24]) => { const P = [base]; let p = base, an = ang; f.forEach((fj, j) => { an += bend * [.35, .75, 1][j]; p = [p[0] + Math.cos(an) * len * fj, p[1] + Math.sin(an) * len * fj]; P.push(p); }); return P; };
  const sleeve = o.sleeve ?? 1.2, cup = kind === 'cup';
  const cuff = () => {
    if (sleeve <= 0) return;
    aiPaint(aiLoop(M([[-sleeve, -.34, 1], [-sleeve * .55, -.31], [-.13, -.27], [-.1, 0], [-.13, .27], [-sleeve * .55, .33], [-sleeve, .37, 1]]), 3), { wash: C.navy, ink: C.ink, sw: sw * 1.2, br: C.brS });
    aiPaint(aiLoop(M([[-sleeve, .1], [-sleeve * .5, .12], [-.15, .12], [-.14, .25], [-sleeve * .55, .31], [-sleeve, .35]]), 3), { wash: C.navySh, op: 170, ink: null });
    for (const [x0, y0, x1, y1, c] of [[-sleeve, -.2, -.3, -.15, C.navyHi], [-sleeve * .8, .02, -.35, .05, C.navySh], [-sleeve * .45, -.26, -.25, -.08, C.navySh]]) aiLine(aiCurve(M([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + .02], [x1, y1]]), 3), sw * .6, c);
    aiPaint(aiLoop(M([[-.24, -.29], [-.07, -.28], [-.06, 0], [-.07, .28], [-.24, .3]]), 2), { wash: C.gold, ink: C.ink, sw: sw * .7 });
    aiLine(M([[-.18, -.28], [-.17, 0], [-.18, .29]]), sw * .4, mixCol(C.gold, C.ink, .3));
    aiFrill(M([[-.05, -.3], [-.03, 0], [-.05, .3]]), -.085 * s, 7, { sw: sw * .6, shade: true });
  };
  if (cup) {   // palm up, seen from the little finger's side: a slab, the fingers rising from its end as one curled bundle
    const c = clamp(o.curl ?? .75);
    if (part !== 'front') {
      cuff();
      finger(chain([.3, -.06], .3, -1.25, -.25 * c), .13, 4, { noNail: true });   // the thumb's tip, behind the palm
      aiWC(aiLoop(M([[0, -.13], [.2, -.11], [.42, -.08], [.56, -.06], [.64, .02], [.62, .13], [.44, .17], [.2, .19], [0, .17]]), 4), C.skin, { dark: C.skinSh, glaze: 40, sw, br: C.brS, pool: .5, gx: .008, gy: .012 });
      aiLine(aiCurve(M([[.06, -.11], [.3, -.07], [.54, -.04]]), 4), sw * .5, crease);
    }
    if (part !== 'back') {
      const B = chain([.56, .0], .5, -.2 - .4 * c, -1.25 * c, [.36, .34, .3]);
      const E = finger(B, .23, 0, { noNail: true });
      const m = E.L.length - 1;   // the staggered fingertips and the separations between the stacked fingers
      for (const [f, k] of [[.28, .7], [.5, .45], [.72, .2]]) { const j = Math.round(m * (1 - k * .35)); aiLine(aiCurve([[lerp(E.L[j][0], E.R[j][0], f), lerp(E.L[j][1], E.R[j][1], f)], [lerp(E.L[m - 1][0], E.R[m - 1][0], f) * .5 + lerp(E.L[j][0], E.R[j][0], f) * .5, lerp(E.L[m - 1][1], E.R[m - 1][1], f) * .5 + lerp(E.L[j][1], E.R[j][1], f) * .5], [lerp(E.L[m][0], E.R[m][0], f), lerp(E.L[m][1], E.R[m][1], f)]], 3), sw * .45, crease); }
      for (const f of [.3, .6]) { const j = Math.round(m * f); aiLine([[lerp(E.L[j][0], E.R[j][0], .1), lerp(E.L[j][1], E.R[j][1], .1)], [lerp(E.L[j][0], E.R[j][0], .4), lerp(E.L[j][1], E.R[j][1], .4)]], sw * .4, crease); }
    }
    return out;
  }
  if (part !== 'front') cuff();
  const ext = kind === 'finger' ? [1, 0, 0, 0] : kind === 'two' ? [1, 1, 0, 0] : [1, 1, 1, 1];
  const spread = kind === 'open' ? 1 : .2, bend = clamp(o.curl ?? (kind === 'open' ? .14 : .06));
  // the extended fingers (their bases tuck under the palm), then the palm, the folded fingers, the thumb
  if (part !== 'back') for (let i = 3; i >= 0; i--) {
    if (!ext[i]) continue;
    const [base, len, w] = AI_GH.F[i], sp = (i - 1.3) * -.085 * spread;
    finger(chain([base[0] - .07, base[1]], len + .07, sp, bend * (i === 3 ? 1.3 : 1)), w, i);
  }
  if (part !== 'front') {
    aiWC(aiLoop(M(AI_GH.palm), 4), C.skin, { dark: C.skinSh, glaze: 40, sw, br: C.brS, pool: .5, gx: .008, gy: .012 });
    if (back) { for (const y of [-.13, -.03, .08]) aiLine(aiCurve(M([[.18, y * .8], [.34, y * .95], [.48, y]]), 3), sw * .4, mixCol(C.skinSh, C.skin, .3)); }
    else { aiLine(aiCurve(M([[.1, .21], [.2, .08], [.28, -.12]]), 4), sw * .5, crease); aiLine(aiCurve(M([[.45, -.2], [.38, -.05], [.43, .14]]), 4), sw * .45, crease); aiLine(aiCurve(M([[.36, -.2], [.31, -.07]]), 3), sw * .35, crease); }
    aiPaint(aiLoop(M([[.04, -.12], [.3, -.17], [.47, -.13], [.3, -.07], [.08, -.04]]), 3), { wash: C.skinSh, op: 90, ink: null });
    if (big) {   // a soft shading wash over the palm (heel in shade, a lit pad at the base of the thumb) and a few skin lines
      aiPaint(aiLoop(M([[0, .2], [.14, .25], [.3, .26], [.44, .245], [.42, .14], [.24, .09], [.06, .12]]), 3), { wash: C.skinSh, op: 70, ink: null });
      aiPaint(aiLoop(M([[.12, .17], [.26, .2], [.36, .17], [.3, .1], [.18, .09]]), 3), { wash: mixCol(C.skin, '#FFFFFF', .4), op: 110, ink: null });
      if (!back) for (const [x0, y0, x1, y1] of [[.2, -.1, .38, -.08], [.16, .0, .36, .03], [.3, .12, .42, .1]]) aiLine(aiCurve(M([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + .015], [x1, y1]]), 3), sw * .4, crease);
    }
  }
  if (part !== 'back') {
    const folded = [0, 1, 2, 3].filter(i => !ext[i]);
    if (folded.length) {   // folded fingers: a knuckle bump each, in one mass
      const ys = folded.map(i => AI_GH.F[i][0][1]).sort((p, q) => p - q), y0 = ys[0] - .065, y1 = ys[ys.length - 1] + .065, P = [[.44, y0]];
      for (const y of ys) P.push([.62, y - .055], [.69, y - .03], [.71, y + .02], [.65, y + .055]);
      P.push([.44, y1]);
      aiPaint(aiLoop(M(P), 3), { wash: C.skin, ink: C.ink, sw, br: C.brS });
      for (let j = 1; j < folded.length; j++) { const y = (AI_GH.F[folded[j - 1]][0][1] + AI_GH.F[folded[j]][0][1]) / 2; aiLine(M([[.58, y], [.69, y]]), sw * .45, crease); }
      aiPaint(aiLoop(M([[.54, y0 + .03], [.6, y0 + .04], [.61, y1 - .04], [.54, y1 - .03]]), 3), { wash: C.skinSh, op: 100, ink: null });
    }
    const tuck = folded.length ? 1 : kind === 'palm' ? .3 : 0;
    finger(chain([.12, .2], .43, lerp(.95, .45, tuck), lerp(-.35, -.75, tuck), [.42, .32, .26]), .15, 4);
  }
  return out;
}

// ---------- 07B: torn into strips, then shards that fall ----------
// o: { x, y, u, pose (her ai() options at the moment she breaks: a still), key, t0 (the tear starts), t1 (the strips
// break into shards and fall; default t0 + .9), n (strips, 7), cols (shards per strip, 3), fall (px/s² at u 50) }.
// Her figure is painted ONCE into a cachedLayer (3 boil drawings) and cut with masks: never drawn N times.
function aiShards(t, o) {
  const u = o.u, x = o.x, y = o.y, pose = o.pose || {}, key = `aishard ${o.key || 'a'} ${Math.round(x)},${Math.round(y)},${Math.round(u)}`;
  const draw = () => { AI_NOGLOW = true; ai(x, y, u, { form: 'full', view: 'front', t: o.tStill ?? 0, noShadow: true, ...pose, boilKey: key }); AI_NOGLOW = false; };
  push(); translate(-8 * W, 0); cachedLayer(key, 3, draw, { paper: false }); pop();   // paint it (once per drawing)
  const t0 = o.t0 ?? 0, t1 = o.t1 ?? t0 + .9, n = o.n ?? 7, cols = o.cols ?? 3, y0 = y - 11 * u, y1 = y + .6 * u, x0 = x - 3.4 * u, x1 = x + 3.4 * u;
  const tear = clamp((t - t0) / Math.max(.01, t1 - t0)), fall = Math.max(0, t - t1), gf = Math.floor(t * 12);
  for (let i = 0; i < n; i++) {
    const ya = lerp(y0, y1, i / n), yb = lerp(y0, y1, (i + 1) / n);
    const slide = tear * (hash(i * 3.7 + gf * .13) - .5) * 1.4 * u * (fall > 0 ? 1 : Math.sin(tear * 9 + i));
    for (let j = 0; j < cols; j++) {
      const xa = lerp(x0, x1, j / cols) + (j ? (hash(i * 9 + j) - .5) * .5 * u : 0), xb = lerp(x0, x1, (j + 1) / cols) + (j < cols - 1 ? (hash(i * 9 + j + 1) - .5) * .5 * u : 0);
      const P = [[xa, ya + (j ? (hash(i + j * 5) - .5) * .4 * u : 0)], [xb, ya + (j < cols - 1 ? (hash(i + j * 5 + 5) - .5) * .4 * u : 0)], [xb, yb], [xa, yb]];
      const cx = (xa + xb) / 2, cy = (ya + yb) / 2, h = hash(i * 13.1 + j * 7.7), g = (o.fall ?? 2400) * u / 50;
      const dx = slide + fall * (h - .5) * 3 * u, dy = .5 * g * fall * fall * (.6 + .8 * h) - fall * u * (1 + h), rot = fall * (h - .5) * 3;
      if (cy + dy > H + 3 * u) continue;
      push(); translate(cx + dx, cy + dy); rotate(rot); translate(-cx, -cy);
      beginClip(); beginShape(); for (const p of P) vertex(p[0], p[1]); endShape(CLOSE); endClip();
      cachedLayer(key, 3, draw, { paper: false });
      pop();
    }
  }
  if (tear > 0 && fall < .6) {   // cyan / magenta seams between the strips while she tears
    boilSeed(key + ' seams');
    for (let i = 1; i < n; i++) { const yy = lerp(y0, y1, i / n); if (hash(i * 5.5 + gf) < .55) inkLine([[x0 + u, yy], [x1 - u, yy]], .8 + tear, i % 2 ? AI_CYAN : '#FF5FA2', 'inkfine', 0); }
  }
}

// ---------- 09E / 09F: the slot reels ----------
// o: { x, y, w, h (the reel window, world px), u (her bust unit), faces: ['sad', 'worried', 'eager', 'heart'] (the
// symbols on each reel), final: 'heart', spin: [tStart, tFast], stops: [t1, t2, t3], pal, key, live (paint the
// stopped face live once all three stopped: true) }. Each face is a cachedLayer close-up (1 drawing); a reel is a
// column of the window showing its strip of the faces, scrolling; it stops on the final face with a bounce.
function aiReels(t, o) {
  const { x, y, w, h } = o, u = o.u ?? h / 2.3, faces = o.faces || ['sad', 'worried', 'eager', 'heart'], fin = o.final || 'heart', key = `aireel ${o.key || 'a'} ${Math.round(x)},${Math.round(y)},${Math.round(w)}x${Math.round(h)}`;
  const stops = o.stops || [1, 1.35, 1.7], [ts, tf] = o.spin || [0, .5], nf = faces.length;
  const fi = faces.indexOf(fin) >= 0 ? faces.indexOf(fin) : nf - 1;
  const draw = name => () => {
    boilSeed(key + ' bg ' + name); paint(rectPts(x - 10, y - 10, w + 20, h + 20), { wash: o.bg || '#101634', ink: null });
    const Tsave = T; T = 0;   // the cached faces must not depend on the frame that first paints them (heart eyes pulse with the global T)
    AI_NOGLOW = true; ai(x + w / 2, y + h * .5 + 1.05 * u, u, { ...aiFeel(name, 0), form: 'full', pose: 'bust', pal: o.pal || 'glow', t: 0, seed: 3, blink: 0, bob: 0, tilt: 0, cut: 1.6, clip: [x, y, x + w, y + h], boilKey: key + name }); AI_NOGLOW = false; T = Tsave;
  };
  for (const f of faces) { push(); translate(-8 * W, 0); cachedLayer(key + ' ' + f, 1, draw(f), { paper: false }); pop(); }
  const allStopped = t >= stops[2] + .25 && o.live !== false;
  for (let c = 0; c < 3; c++) {
    const xa = x + w * c / 3, xb = x + w * (c + 1) / 3, ts2 = stops[c];
    // position along the strip of faces (in face heights): spins up from ts to tf, runs, eases onto the final face at its
    // stop and bounces; 'rem' = how far it still has to go
    const d = .35, v = 9 + c * 1.5, R0 = v * (ts2 - d / 2 - tf) + .5 * v * (tf - ts);
    const rem = t <= ts ? R0 : t < tf ? R0 - .5 * v * (t - ts) * (t - ts) / (tf - ts) : t < ts2 - d ? v * (ts2 - t - d / 2) : t < ts2 ? .5 * v * d * Math.pow((ts2 - t) / d, 2) : -.12 * Math.exp(-9 * (t - ts2)) * Math.cos(22 * (t - ts2));
    const endPos = fi + nf * Math.ceil(R0 / nf + 2), pos = endPos - rem;
    if (allStopped) continue;
    const base = Math.floor(pos), f0 = pos - base;
    for (let k = -1; k <= 1; k++) {
      const idx = ((base + k) % nf + nf) % nf, dy = (k - f0) * h;
      if (Math.abs(dy) >= h) continue;
      push(); beginClip(); beginShape(); vertex(xa, y); vertex(xb, y); vertex(xb, y + h); vertex(xa, y + h); endShape(CLOSE); endClip();
      translate(0, -dy); cachedLayer(key + ' ' + faces[idx], 1, draw(faces[idx]), { paper: false });
      pop();
    }
    const speed = t > ts && t < ts2 ? clamp((t - ts) / Math.max(.01, tf - ts)) * (1 - seg(t, ts2 - d, ts2)) : 0;   // motion streaks while it spins
    if (speed > .2) { boilSeed(key + ' blur ' + c + Math.floor(t * 24)); for (let i = 0; i < 6; i++) { const xx = lerp(xa, xb, (i + .5) / 6); inkLine([[xx, y + h * hash(i + c * 7 + Math.floor(t * 24)) * .3], [xx, y + h * (.7 + .3 * hash(i * 3 + c))]], 1.2 * speed, '#BFEFFF', 'inkfine', 0); } }
  }
  if (allStopped) ai(x + w / 2, y + h * .5 + 1.05 * u, u, { ...aiFeel(fin, 0), form: 'full', pose: 'bust', pal: o.pal || 'glow', t, seed: 3, blink: 0, bob: 0, tilt: 0, cut: 1.6, clip: [x, y, x + w, y + h], boilKey: key + fin, ...(o.over || {}) });
  boilSeed(key + ' frame');
  for (let c = 1; c < 3; c++) inkLine([[x + w * c / 3, y], [x + w * c / 3, y + h]], 2.2, o.frameCol || '#E8C46E', 'ink', 0);
}

// ---------- rewind (09B-09D) ----------
// The time to evaluate her at, so her acting plays backward after a press at tPress for dur s (back = how many seconds
// of her acting it undoes, default 1.2): t' runs back from tPress to tPress - back, then holds there.
function aiRewindT(t, tPress, dur = .35, back = 1.2) { if (t < tPress) return t; const k = clamp((t - tPress) / dur); return tPress - back * (k * k * (3 - 2 * k)); }
// Brush scan bands over a rect while rewinding (k 0..1 strength): horizontal pale streaks that roll upward.
function aiScanBands(x, y, w, h, k, t, o = {}) {
  if (k <= .01) return;
  boilSeed('aiscan ' + (o.key || '') + Math.floor(t * 24));
  const n = o.n ?? 5;
  for (let i = 0; i < n; i++) {
    const f = frac(hash(i * 3.3) - t * (1.6 + i * .3)), yy = y + h * f, bh = h * (.02 + .05 * hash(i * 7.7));
    paint([[x, yy], [x + w, yy + jit(3)], [x + w, yy + bh], [x, yy + bh + jit(3)]], { wash: o.col || '#DDF8FF', washOp: 90 * k, ink: null });
    inkLine([[x, yy + bh * .5], [x + w, yy + bh * .5]], .8 * k, '#FFFFFF', 'inkfine', 0);
  }
}

// ---------- LOOPS.ai_poses: every new mode, action and prop, labelled (six pages: t 0-1, 1-2 ... 5-6) ----------
// node render.mjs --soft-gl --loop=ai_poses --stills=0.5,1.5,2.5,3.5,4.5,5.5 --out=out/ai_poses   (full-res pages; see ai.STATUS.md)
LOOPS.ai_poses = t => {
  const page = clamp(Math.floor(t), 0, 5), lab = (s, x, y, col = '#2B2233', sz = 21) => letter(s, x, y, sz, col, { screen: true, ink: false });
  const bg = (col, key) => { boilSeed('aip bg ' + key); paint(rectPts(-20, -20, W + 40, H + 40), { wash: col, ink: null }); };
  const panel = (x, y, w, h, col, key) => { boilSeed('aip panel ' + key); paint(rectPts(x, y, w, h, 1.2), { wash: col, ink: '#2B2233', sw: .5, br: 'inkfine' }); };
  const beatT = f => OFF + (f + 2) * BEAT;   // a time at beat fraction f (for beat-locked actions)
  if (page !== 4) lab(['page 1 · chibi actions (aiAct)', 'page 2 · chibi: climb, thumbnails, silhouette', 'page 3 · full form: close-up (pose bust), sit, lie, dissolve', 'page 4 · props, descend, puppet strings, glass', '', 'page 6 · at scale: 08A giant face + hands, 06C cup (two-shot), 09H glass, 10G throat, climb grab'][page], 960, 22, '#2B2233', 24);
  if (page === 0) {
    bg('#EEF1F2', 0);
    const acts = [['wave', 'smile', 1.1], ['point', 'smile', 1.1], ['nod', 'eager', beatT(.5)], ['shake', 'smile', .35], ['carry', 'eager', 1.1], ['push', 'eager', 1.1],
      ['hold', 'smile', 1.1, { prop: { kind: 'page', k: .15 } }], ['clap', 'eager', beatT(0)], ['salute', 'smile', 1.1], ['stetho', 'worried', 1.1], ['catch', 'eager', 1.1, { prop: { kind: 'page', k: 0 } }], ['hold', 'eager', 1.1, { prop: { kind: 'block', check: true, size: .9 } }]];
    acts.forEach(([a, f, ta, ex], i) => {
      const x = 170 + (i % 6) * 316, y = i < 6 ? 470 : 990;
      ai(x, y, 37, { ...aiFeel(f, ta), ...aiAct(a, ta, 0, ex || {}), form: 'chibi', t: ta, seed: i, boilKey: 'aip0 ' + i });
      lab(a + (ex && ex.prop ? ' · ' + ex.prop.kind : ''), x, y + 30);
    });
    return;
  }
  if (page === 1) {
    bg('#EEF1F2', 1);
    // climbing out of a screen: the bubble's top edge clips her (00C, 01A, 03B)
    [.18, .36, .58, .8, 1.15].forEach((p, i) => {
      const x = 170 + i * 270, edge = 430;
      boilSeed('aip scr ' + i); paint(rrPts(x - 120, edge, 240, 150, 18), { wash: '#BFF4FF', ink: '#1B6FFF', sw: .6 }); glow(x, edge + 70, 140, '#7FE9FF', .5);
      ai(x, edge, 30, { ...aiFeel(p < .45 ? 'eager' : 'smile', 1), ...aiClimb(p * 1.2, 0, 1.2), form: 'chibi', t: 1, seed: i, clip: [x - 300, 0, x + 300, edge], noShadow: true, boilKey: 'aip1c ' + i });
      lab('climb ' + Math.round(Math.min(1, p) * 100) + '%', x, edge + 175);
    });
    // thumbnails: the lite chibi (u < 20 by default) vs the full one
    [[8, 'thumb'], [12, 'thumb'], [17, 'thumb'], [8, 'full'], [12, 'full'], [17, 'full']].forEach(([u, lod], i) => {
      const x = 1440 + (i % 3) * 150, y = i < 3 ? 330 : 560;
      ai(x, y, u, { ...aiFeel('smile', 1), ...aiAct('wave', 1.1, 0), form: 'chibi', t: 1, seed: i, lod, boilKey: 'aip1t ' + i });
      lab(`u ${u} · ${lod}`, x, y + 22, '#2B2233', 17);
    });
    // a reflection in a lens (00D) and the shadow puppet on the glowing quilt (02A)
    boilSeed('aip lens'); paint(ellPts(340, 820, 170, 130, 40), { wash: '#16203A', ink: '#2B2233', sw: 1 }); glow(330, 800, 160, '#7FE9FF', .5);
    ai(340, 880, 11, { ...aiFeel('smile', 1), ...aiAct('wave', 1.1, 0), form: 'chibi', pal: 'glow', t: 1, seed: 7, noShadow: true, clip: [170, 690, 510, 950], boilKey: 'aip1l' });
    lab('lens reflection · glow, u 11', 340, 975);
    boilSeed('aip quilt'); paint(aiQuilt(700, 690, 1180, 300), { wash: '#8FEFFF', ink: '#2B2233', sw: .6 }); glow(1290, 840, 420, '#7FE9FF', .7);
    [[960, .15], [1290, .5], [1620, .85]].forEach(([x, f], i) => {
      ai(x, 960, 26, { ...aiAct('wave', beatT(f), 0, { high: true }), form: 'chibi', t: 1, seed: 20 + i, silhouette: '#2E6A92', noShadow: true, boilKey: 'aip1s ' + i });
      lab('silhouette · wave (high) · beat ' + f, x, 1010);
    });
    return;
  }
  if (page === 2) {
    bg('#EEF1F2', 2);
    // close-ups (pose 'bust'): the cheap head-and-shoulders mode
    const cu = [['05A · glow, perfect, O', '#121838', { ...aiFeel('perfect', 1), mouth: 'O', pal: 'glow' }], ['09B · sad (in the screen)', '#0F1430', { ...aiFeel('sad', 1), view: 'q' }],
      ['09H · mirror + ripple', '#0B0D14', { ...aiFeel('perfect', 1), pal: 'mirror', ripple: { age: .45 } }], ['10G · amber, hand on throat', '#3A2414', { ...aiFeel('gentle', 1), pal: 'amber', ...aiAct('throat', 1.2, 0, { form: 'full' }) }]];
    cu.forEach(([s, col, o], i) => {
      const x0 = 20 + i * 475, y0 = 50, w = 465, h = 450, u = 170;
      panel(x0, y0, w, h, col, 'cu' + i);
      ai(x0 + w / 2, y0 + 205 + .98 * u, u, { form: 'full', pose: 'bust', t: 1, seed: i, cut: 1.4, clip: [x0 + 2, y0 + 2, x0 + w - 2, y0 + h - 2], ...o, boilKey: 'aip2c ' + i });
      if (i === 2) aiRipple(x0 + w / 2, y0 + 205, 260, .5, { key: 'aip' });
      lab(s, x0 + w / 2, y0 + h + 18);
    });
    // sitting on a bed edge: front, 3/4 with his head on her lap (stroking), covering his ears
    const bed = (x, w, key) => { boilSeed('aip bed ' + key); paint(rectPts(x, 840, w, 26), { wash: '#C9C3DA', ink: '#2B2233', sw: .5 }); paint(rectPts(x, 866, w, 170), { wash: '#A9A2C2', ink: '#2B2233', sw: .5 }); };
    bed(30, 330, 'a'); ai(190, 850, 45, { ...aiFeel('gentle', 1), form: 'full', pose: 'sit', t: 1, seed: 9, boilKey: 'aip2s0' }); lab('sit · front', 190, 1058);
    bed(380, 420, 'b'); ai(500, 850, 45, { ...aiFeel('gentle', 1), form: 'full', pose: 'sit', view: 'q', t: 1, seed: 10, boilKey: 'aip2s1' });
    const lap = AI_LAST.lap; boilSeed('aip head'); paint(ellPts(lap[0] + 30, lap[1] - 25, 34, 28, 18), { wash: '#E8C9B0', ink: '#2B2233', sw: .5 });
    ai(500, 850, 45, { ...aiFeel('gentle', 1), ...aiAct('stroke', 1.2, 0, { at: [lap[0] + 30, lap[1] - 25], r: 32 }), form: 'full', pose: 'sit', view: 'q', t: 1, seed: 10, boilKey: 'aip2s1' });
    lab('sit · 3/4 · stroke (his head on her lap)', 590, 1058);
    bed(830, 400, 'c');
    const cov = { ...aiFeel('gentle', 1), ...aiAct('cover', 1.2, 0, { at: [1068, 735], r: 38 }), form: 'full', pose: 'sit', view: 'q', t: 1, seed: 11, boilKey: 'aip2s2' };
    ai(980, 850, 45, { ...cov, layer: 'far' });   // two passes: her far hand behind his head, the near one over it
    boilSeed('aip head2'); paint(ellPts(1068, 735, 38, 44, 18), { wash: '#E8C9B0', ink: '#2B2233', sw: .5 }); paint(ellPts(1072, 706, 40, 22, 14), { wash: '#4A3A35', ink: '#2B2233', sw: .5 });
    ai(980, 850, 45, { ...cov, layer: 'near' });
    lab('sit · 3/4 · cover (his ears; layer far / near)', 1030, 1058);
    // lying on the pillow, then dissolving into the phone (06F)
    [[0, 1395], [.55, 1715]].forEach(([k, x], i) => {
      boilSeed('aip pil' + i); paint(rrPts(x - 150, 560, 310, 230, 70), { wash: '#C9CCE0', ink: '#2B2233', sw: .5 });
      ai(x + 40, 805, 82, { ...aiFeel('gentle', 1), eyes: 'heart', blush: .8, form: 'full', pose: 'lie', t: 1, seed: 12, dissolve: k, dissolveTo: [x + 50, 790], cut: 1.25, boilKey: 'aip2l' });
      if (k) aiProp('phone', x + 50, 790, 70, { ang: -1.2, screen: 'glow', size: 1.2, boilKey: 'aip2p' });
      boilSeed('aip blk' + i); paint([[x - 160, 845], [x + 160, 815], [x + 160, 1030], [x - 160, 1030]], { wash: '#8C90B8', ink: '#2B2233', sw: .5 });
      lab(k ? 'lie · dissolve .55 → phone' : 'lie (pose lie)', x, 1058);
    });
    return;
  }
  if (page === 3) {
    bg('#EEF1F2', 3);
    const u = 46, props = [['thermometer', { reachR: [1.55, -7.25], handR: 'fist', handAR: -.25, propR: { kind: 'thermometer', level: .75 } }, 'eager'],
      ['spoon · ✓ capsule', { reachR: [1.5, -7.5], handR: 'fist', handAR: -.45, propR: { kind: 'spoon', cap: 'check' } }, 'smile'],
      ['sticker (pinch)', { reachR: [1.3, -8.7], handR: 'pinch', handAR: -.6, propR: { kind: 'sticker', peel: .3 } }, 'gentle'],
      ['phone · thumbs typing', aiAct('hold', 1, 0, { form: 'full', prop: { kind: 'phone', screen: 'type', k: .7, size: 1.7, thumbs: true, t: 1.1 } }), 'smile'],
      ['lamp cord', { reachR: [1.1, -9.6], handR: 'point', handAR: -1.4, propR: { kind: 'cord', from: [1205, 40] } }, 'perfect'],
      ['IV stand', null, 'smile']];
    props.forEach(([s, o, f], i) => {
      const x = 150 + i * 320;
      if (!o) { const r = aiProp('ivstand', x + 70, 540, u, { boilKey: 'aip3iv' }); ai(x - 40, 540, u, { ...aiFeel(f, 1), ...aiAct('wave', 1.1, 0, { form: 'full', side: 'L' }), form: 'full', t: 1, seed: 30 + i, reachRW: r.grip, handR: 'fist', boilKey: 'aip3 ' + i }); }
      else ai(x, 540, u, { ...aiFeel(f, 1), ...o, form: 'full', t: 1, seed: 30 + i, boilKey: 'aip3 ' + i });
      lab(s, x, 570);
    });
    // descending from the lamp in its light, into the curtsy (04A)
    boilSeed('aip dsc'); paint(rectPts(20, 600, 560, 470, 1.2), { wash: '#141A3A', ink: '#2B2233', sw: .5, br: 'inkfine' });
    aiBeam(170, 1040, 36, 1, { top: 602, key: 'aip' });
    ai(170, 1040, 36, { ...aiFeel('smile', 1), ...aiDescend(.8, 0, 1.4, 6), form: 'full', pose: 'curtsy', pal: 'glow', t: 1, seed: 40, boilKey: 'aip3d0' });
    ai(420, 1040, 36, { ...aiFeel('smile', 1), ...aiDescend(1.6, 0, 1.4, 6), form: 'full', pose: 'curtsy', pal: 'glow', t: 1, seed: 41, boilKey: 'aip3d1' });
    lab('descend (aiDescend + aiBeam) → curtsy dip', 300, 625, '#E8FDFF');
    // puppet strings: tied to her (10C) and pulled by her (10D), amber
    boilSeed('aip pup'); paint(rectPts(600, 600, 760, 470, 1.2), { wash: '#F6E7D2', ink: '#2B2233', sw: .5, br: 'inkfine' });
    ai(780, 1040, 36, { ...aiFeel('smile', 1), form: 'full', pal: 'amber', t: 1, seed: 42, reachL: [-1.2, -8.8], reachR: [1.25, -9.0], handL: 'relax', handR: 'relax', tilt: .12, strings: { to: { wristL: [700, 610], wristR: [870, 610], head: [790, 605] }, col: '#C8742E', sag: .03 }, boilKey: 'aip3p0' });
    ai(1130, 1040, 36, { ...aiFeel('perfect', 1), form: 'full', pal: 'amber', t: 1, seed: 43, reachR: [1.0, -10.2], handR: 'fist', strings: { lines: [{ from: 'handR', to: [1260, 760] }, { from: 'handR', to: [1300, 800] }], col: '#C8742E' }, boilKey: 'aip3p1' });
    lab('strings: on her (10C) · held by her (10D)', 980, 625);
    // palm on the glass, in profile (09I)
    boilSeed('aip gl'); paint(rectPts(1380, 600, 520, 470, 1.2), { wash: '#0B0D14', ink: '#2B2233', sw: .5, br: 'inkfine' });
    ai(1560, 900, 120, { ...aiFeel('gentle', 1), lid: .55, ...aiAct('glass', 1.2, 0, { at: [1.55, -8.9], view: 'side' }), form: 'full', pose: 'bust', view: 'side', pal: 'mirror', t: 1, seed: 44, cut: 1.5, clip: [1382, 602, 1898, 1068], boilKey: 'aip3g' });
    boilSeed('aip glass'); inkLine([[1752, 602], [1752, 1068]], 1.2, '#9FD8E8', 'inkfine', 0);
    lab('palm on the glass · side · mirror', 1640, 625, '#E8FDFF');
    return;
  }
  if (page === 5) return aiPoses6(t, lab, panel);
  // page 5: the giant, shards, reels, rewind
  bg('#2A0A14', 4);
  lab('page 5 · the giant (08), shards (07B), slot reels (09E/F), rewind', 320, 22, '#F3D9DF', 22);
  // the giant's face cropped by the frame: the unblinking eye (08D) and the syncing mouth (08E), u 900
  panel(20, 50, 600, 300, '#3A0A18', 'g0'); panel(20, 380, 600, 300, '#3A0A18', 'g1');
  // the anchor is the collarbone notch: the eyes sit .67u above it, the mouth .35u (full form)
  ai(320, 200 + .67 * 900, 900, { ...aiFeel('perfect', 1), lookY: .8, blink: 0, form: 'full', pose: 'bust', giant: true, t: 1, seed: 50, cut: 1, clip: [22, 52, 618, 348], boilKey: 'aip4e' });
  ai(320, 545 + .354 * 900, 900, { ...aiFeel('perfect', 1), mouth: 'A', form: 'full', pose: 'bust', giant: true, t: 1, seed: 51, cut: 1, clip: [22, 382, 618, 678], boilKey: 'aip4m' });
  lab('giant · the unblinking eye (u 900)', 320, 368, '#F3D9DF'); lab('giant · the syncing mouth (u 900)', 320, 698, '#F3D9DF');
  // the giant's hands: cupping a bed island (08A), the lowered finger (08A), the palm wall (08C), combing (08F)
  aiGiantHand(90, 900, 210, { kind: 'cup', ang: 0, part: 'back', boilKey: 'aip4h0' }); aiGiantHand(560, 900, 210, { kind: 'cup', ang: Math.PI, flip: true, part: 'back', boilKey: 'aip4h1' });
  boilSeed('aip island'); paint([[200, 860], [450, 860], [430, 900], [220, 900]], { wash: '#E9E3F4', ink: '#2B2233', sw: .6 }); paint([[220, 900], [430, 900], [380, 960], [270, 960]], { wash: '#6E5A8E', ink: '#2B2233', sw: .6 });
  aiGiantHand(90, 900, 210, { kind: 'cup', ang: 0, part: 'front', boilKey: 'aip4h0' }); aiGiantHand(560, 900, 210, { kind: 'cup', ang: Math.PI, flip: true, part: 'front', boilKey: 'aip4h1' });
  lab('cup ×2 (part back / front around the island)', 320, 1058, '#F3D9DF');
  aiGiantHand(840, 45, 270, { kind: 'finger', ang: Math.PI / 2 + .05, back: true, boilKey: 'aip4h2' }); lab('finger (back)', 840, 420, '#F3D9DF');
  aiGiantHand(840, 1078, 270, { kind: 'palm', ang: -Math.PI / 2 - .08, flip: true, sleeve: .3, boilKey: 'aip4h3' }); lab('palm', 840, 735, '#F3D9DF');
  aiGiantHand(1440, 70, 230, { kind: 'two', ang: Math.PI * .83, back: true, boilKey: 'aip4h4' }); lab('two (combing)', 1230, 420, '#F3D9DF');
  // 07B: torn into strips, then falling shards (cached, masked)
  aiShards(.45, { x: 1135, y: 1030, u: 30, pose: { ...aiFeel('blank', 0), pal: 'glow' }, key: 'aip', t0: 0, t1: .9 });
  aiShards(1.2, { x: 1330, y: 1030, u: 30, pose: { ...aiFeel('blank', 0), pal: 'glow' }, key: 'aip', t0: 0, t1: .9 });
  lab('07B · tear → shards', 1235, 1058, '#F3D9DF');
  // 09E / 09F: the slot reels, spinning and stopped; and the rewind's scan bands
  aiReels(.9, { x: 1460, y: 60, w: 430, h: 300, stops: [1.4, 1.75, 2.1], spin: [.2, .6], key: 'aip' }); lab('09E · reels spinning', 1675, 378, '#F3D9DF');
  aiReels(1.9, { x: 1460, y: 400, w: 430, h: 300, stops: [1.4, 1.75, 2.1], spin: [.2, .6], key: 'aip' }); lab('09F · two stopped (the third bounces in)', 1675, 718, '#F3D9DF');
  panel(1460, 750, 430, 280, '#0F1430', 'rw');
  ai(1675, 750 + 120 + .98 * 120, 120, { ...aiFeel('eager', aiRewindT(1.5, 1.2)), form: 'full', pose: 'bust', t: aiRewindT(1.5, 1.2), seed: 52, cut: 1.2, clip: [1462, 752, 1888, 1028], boilKey: 'aip4r' });
  aiScanBands(1462, 752, 426, 276, .7, 1.5, { key: 'aip' }); lab('09B-D · rewind (aiRewindT + aiScanBands)', 1675, 1048, '#F3D9DF');
};
LOOPS.ai_poses.len = 6;
// page 6: the new modes at the size the shots use them, for contact and line-weight checks
function aiPoses6(t, lab, panel) {
  boilSeed('aip bg 5'); paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#EEF1F2', ink: null });
  // 08A: the giant face filling the top of the frame (u 300, line weights scaled), her cupped hands holding the bed island
  panel(20, 50, 920, 650, '#2A0A14', 'g6'); const A = [22, 52, 938, 698];
  ai(480, 300 + .98 * 300, 300, { ...aiFeel('heart', 1), blink: 0, lookY: .7, form: 'full', pose: 'bust', giant: true, t: 1, seed: 60, cut: .8, clip: A, boilKey: 'aip6g' });
  const hk = { u: 300, sleeve: .6 };
  aiGiantHand(215, 605, 200, { ...hk, kind: 'cup', ang: -.1, part: 'back', boilKey: 'aip6h0' }); aiGiantHand(745, 605, 200, { ...hk, kind: 'cup', ang: Math.PI + .1, flip: true, part: 'back', boilKey: 'aip6h1' });
  boilSeed('aip6 island'); paint([[300, 555], [660, 555], [640, 590], [320, 590]], { wash: '#E9E3F4', ink: '#2B2233', sw: .6 }); paint([[320, 590], [640, 590], [600, 633], [360, 633]], { wash: '#6E5A8E', ink: '#2B2233', sw: .6 });
  aiGiantHand(215, 605, 200, { ...hk, kind: 'cup', ang: -.1, part: 'front', boilKey: 'aip6h0' }); aiGiantHand(745, 605, 200, { ...hk, kind: 'cup', ang: Math.PI + .1, flip: true, part: 'front', boilKey: 'aip6h1' });
  lab('08A · giant bust u 300 (giant: true) + cup hands (u 300 line weights)', 480, 718);
  // 06C: the two-shot, she cups his face (he sits lower, looking up: a stand-in head)
  panel(960, 50, 940, 470, '#F4F1EA', 'c6'); const B = [962, 52, 1898, 518], hc = [1400, 400];
  const cup = { ...aiFeel('gentle', 1), ...aiAct('cup', 1.2, 0, { at: hc, r: 60 }), form: 'full', pose: 'bust', view: 'q', t: 1, seed: 61, cut: 2.4, clip: B, boilKey: 'aip6c' };
  ai(1250, 210 + .98 * 105, 105, { ...cup, layer: 'far' });
  boilSeed('aip6 head'); paint(ellPts(hc[0], hc[1], 60, 68, 20), { wash: '#E8C9B0', ink: '#2B2233', sw: .6 }); paint(ellPts(hc[0] + 8, hc[1] - 50, 64, 32, 16), { wash: '#4A3A35', ink: '#2B2233', sw: .6 });
  ai(1250, 210 + .98 * 105, 105, { ...cup, layer: 'near' });
  lab('06C · bust q · cup, two passes (layer far → his head → near)', 1430, 538);
  // 09H: the palm raised to the glass (front, mirror); 10G: the hand on her throat (amber)
  panel(960, 560, 460, 480, '#0B0D14', 'm6');
  ai(1190, 760 + .98 * 125, 125, { ...aiFeel('gentle', 1), ...aiAct('glass', 1.2, 0, { at: [1.25, -9.35] }), form: 'full', pose: 'bust', pal: 'mirror', t: 1, seed: 62, cut: 1.6, clip: [962, 562, 1418, 1038], boilKey: 'aip6m' });
  lab('09H · glass (front, mirror)', 1190, 1058);
  panel(1440, 560, 460, 480, '#3A2414', 'a6');
  ai(1670, 760 + .98 * 125, 125, { ...aiFeel('gentle', 1), lookY: -.2, ...aiAct('throat', 1.2, 0, { form: 'full' }), form: 'full', pose: 'bust', pal: 'amber', t: 1, seed: 63, cut: 1.6, clip: [1442, 562, 1898, 1038], boilKey: 'aip6a' });
  lab('10G · throat (amber)', 1670, 1058);
  // climbing out of a screen at the grab and at the pull (her hands on the edge beside the face)
  [[.42, 250], [.62, 690]].forEach(([p, x], i) => {
    const edge = 900; boilSeed('aip6 scr' + i); paint(rrPts(x - 200, edge, 400, 140, 16), { wash: '#BFF4FF', ink: '#1B6FFF', sw: .6 }); glow(x, edge + 60, 200, '#7FE9FF', .4);
    ai(x, edge, 42, { ...aiFeel('eager', 1), ...aiClimb(p * 1.2, 0, 1.2), form: 'chibi', t: 1, seed: 64 + i, clip: [x - 230, 740, x + 230, edge], noShadow: true, boilKey: 'aip6k' + i });
    lab('climb ' + Math.round(p * 100) + '% (' + (p < .45 ? 'grab' : 'pull') + ')', x, 1058);
  });
}
// A stand-in quilt outline for the sheet.
function aiQuilt(x, y, w, h) { const P = []; for (let i = 0; i <= 12; i++) P.push([x + w * i / 12, y + 18 * Math.sin(i * 1.3)]); for (let i = 12; i >= 0; i--) P.push([x + w * i / 12 + 20 * Math.sin(i), y + h - 10 * Math.cos(i * 1.7)]); return P; }
