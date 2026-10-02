// him.js: "him", the human lead: an original young AI engineer, painted with p5.brush through paint() / inkLine().
// Global-script style (no modules). Everything here is prefixed him / HIM_ so it can share a page with ai.js.

// ---------- palettes ----------
const HIM_BASE = {   // royal-blue blazer, cool white shirt, blue-black hair, rosy tan skin
  skin: '#F2C8B0', skinSh: '#D99E88', skinDk: '#B47866', skinHi: '#FBE1D3', blush: '#E98C80', lip: '#C67A6C',
  hair: '#22212D', hairSh: '#14141C', hairHi: '#5C6688', hairMid: '#2E2D3B', white: '#FBF6EE', iris: '#56372A', irisLt: '#A0704C', irisDk: '#2A1914', pupil: '#1E1415',
  jacket: '#2B48A3', jacketSh: '#1C3486', jacketDk: '#0F2160', jacketHi: '#5277CF', jacketEdge: '#8AA4E6', stitch: '#6C86CC',
  shirt: '#F6F5F2', shirtSh: '#C9CEDD', pants: '#272A3B', pantsSh: '#1A1C29', pantsHi: '#41455C',
  shoe: '#F1EADF', shoeSh: '#C2B9AB', sole: '#6A5A54', leather: '#2E211C', leatherDk: '#17100D', leatherHi: '#7E625A', leatherShine: '#E6DAD2', leatherSole: '#100B09', belt: '#3E2A22', buckle: '#B9B2A6', sock: '#8C8999',
  glass: '#C3C8D1', glassDk: '#6E7480', band: '#FCF9F3', bandSh: '#D8D4DE', code: '#2B2233',
  ink: '#241F2C', inkSoft: '#5A4650', lash: '#16141C', glare: '#7FE9FF', tear: '#BFE6F5', cheekLine: '#D9806F', nail: '#F7DCCB'
};
const himHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const himToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
// drained: desaturated toward grey of the same lightness, a touch cooler and flatter (verse 2)
function himDrain(h, k = .68) { const [r, g, b] = himHex(h), l = .3 * r + .59 * g + .11 * b; return himToHex(lerp(r, l, k) - 4, lerp(g, l, k) - 1, lerp(b, l, k) + 6); }
// swapped: every colour mapped by lightness onto the AI's cyan ramp (final chorus)
function himCyan(h) {
  const [r, g, b] = himHex(h), l = (.3 * r + .59 * g + .11 * b) / 255;
  const st = [[0, '#06213A'], [.25, '#0E4F86'], [.5, '#2FA8D8'], [.72, '#7FE9FF'], [1, '#E8FDFF']];
  let i = 0; while (i < st.length - 2 && l > st[i + 1][0]) i++;
  return mixCol(st[i][1], st[i + 1][1], (l - st[i][0]) / (st[i + 1][0] - st[i][0]));
}
const HIM_PALS = {};
function himPal(name = 'human') {
  if (HIM_PALS[name]) return HIM_PALS[name];
  const c = {};
  for (const k in HIM_BASE) c[k] = name === 'drained' ? himDrain(HIM_BASE[k]) : name === 'swapped' ? himCyan(HIM_BASE[k]) : HIM_BASE[k];
  if (name === 'swapped') { c.ink = '#0B3D6E'; c.inkSoft = '#1B6FFF'; c.glare = '#E8FDFF'; }
  if (name === 'drained') { c.glare = '#7FE9FF'; c.ink = '#33303A'; }
  c.name = name;
  return (HIM_PALS[name] = c);
}

// ---------- geometry helpers (all return point lists; painting is always paint()/inkLine()) ----------
const himMir = P => P.map(p => [-p[0], p[1], p[2]]);
const himSc = (P, u, ox = 0, oy = 0) => P.map(p => [(p[0] + ox) * u, (p[1] + oy) * u]);
const himJ = (P, j) => P.map(p => [p[0] + jit(j), p[1] + jit(j), p[2]]);
// Smooth closed (or open) curve through control points; a point with p[2] = 1 is a sharp corner.
function himS(P, closed = true, n = 5) {
  const k = P.findIndex(p => p[2]);
  if (!closed) {
    const out = []; let seg = [P[0]];
    for (let i = 1; i < P.length; i++) { seg.push(P[i]); if (P[i][2] || i === P.length - 1) { const s = through(seg.map(p => [p[0], p[1]]), n); if (out.length) s.shift(); out.push(...s); seg = [P[i]]; } }
    return out;
  }
  if (k < 0) {   // closed Catmull-Rom
    const m = P.length, out = [];
    for (let i = 0; i < m; i++) {
      const p0 = P[(i - 1 + m) % m], p1 = P[i], p2 = P[(i + 1) % m], p3 = P[(i + 2) % m];
      for (let s = 0; s < n; s++) {
        const t = s / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    return out;
  }
  const R = P.slice(k).concat(P.slice(0, k + 1));   // start and end at a corner
  const out = himS(R, false, n); out.pop(); return out;
}
// A tapered clump (hair lock, collar point): from a root of width w to a sharp tip, bowed by `bend` (in w units).
function himClump(root, tip, w, bend = 0, ang = null) {
  const dx = tip[0] - root[0], dy = tip[1] - root[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const a = ang ?? 0, rx = Math.cos(a) * nx - Math.sin(a) * ny, ry = Math.sin(a) * nx + Math.cos(a) * ny;
  const m = (k, side) => { const b = bend * L * Math.sin(Math.PI * k) * .35, ww = w / 2 * Math.pow(1 - k, .8) * side;
    return [root[0] + dx * k + nx * b + rx * ww, root[1] + dy * k + ny * b + ry * ww]; };
  return [m(0, -1), m(.35, -1), m(.7, -1), [tip[0] + nx * 0, tip[1], 1], m(.7, 1), m(.35, 1), m(0, 1)];
}
// Outline around a limb's centreline C (points) with widths W (per point, or [left, right] pairs).
function himTube(C, W) {
  const n = C.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const w = W[i], wl = Array.isArray(w) ? w[0] : w / 2, wr = Array.isArray(w) ? w[1] : w / 2;
    L.push([C[i][0] - dy / d * wl, C[i][1] + dx / d * wl]); R.push([C[i][0] + dy / d * wr, C[i][1] - dx / d * wr]);
  }
  return { L, R, outline: L.concat(R.reverse()) };
}
// Clamp a shape inside a lens between two y-curves (eye whites, irises)
function himBetween(P, top, bot) {
  const at = (C, x) => { for (let i = 0; i < C.length - 1; i++) { const [x0, y0] = C[i], [x1, y1] = C[i + 1]; if ((x - x0) * (x - x1) <= 0 && x0 !== x1) return lerp(y0, y1, (x - x0) / (x1 - x0)); } return null; };
  const xs = top.map(p => p[0]), lo = Math.min(...xs), hi = Math.max(...xs);
  return P.map(([x, y]) => { const xx = clamp(x, lo, hi), t = at(top, xx), b = at(bot, xx); return [xx, t == null ? y : clamp(y, t, Math.max(t, b ?? y))]; });
}

// Clip a polygon / a polyline to the half-plane below which nothing is drawn (busts): keep g(p) <= 0.
function himClipPoly(P, g) {
  const out = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const A = P[i], B = P[(i + 1) % n], ga = g(A), gb = g(B);
    if (ga <= 0) out.push(A);
    if ((ga <= 0) !== (gb <= 0)) { const t = ga / (ga - gb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
  }
  return out;
}
function himClipLine(P, g) {
  const runs = []; let cur = [];
  for (let i = 0; i < P.length; i++) {
    const A = P[i], ga = g(A);
    if (i > 0) { const B = P[i - 1], gb = g(B); if ((ga <= 0) !== (gb <= 0)) { const t = gb / (gb - ga); cur.push([B[0] + (A[0] - B[0]) * t, B[1] + (A[1] - B[1]) * t]); if (ga > 0) { runs.push(cur); cur = []; } } }
    if (ga <= 0) cur.push(A);
  }
  if (cur.length) runs.push(cur);
  return runs.filter(r => r.length > 1);
}
// Shorthands bound to one character draw: shape() = scaled, smoothed, boiled shape; line() = the same for a stroke.
// k.cut (px, in the current local space) clips everything below a slightly wavy line (the bust's painted edge).
function himKit(u, c, swBase, J, clean) {
  const k = { u, cut: null, det: u * HIM_HS >= 13, det2: u * HIM_HS >= 26 };   // det / det2: levels of detail
  const g = () => k.keep ? k.keep : k.cut == null ? null : (p => p[1] - (k.cut + Math.sin(p[0] / u * 1.7) * .12 * u));
  k.pts = (P, closed = true, n = 5, j = J) => himS(himJ(P, j / u), closed, n).map(([x, y]) => [x * u, y * u]);
  k.shape = (P, o = {}) => {
    let pts = o.raw ? himSc(himJ(P, (o.j ?? J) / u), u) : k.pts(P, true, o.n || 5, o.j ?? J);
    const G = g(); if (G) { pts = himClipPoly(pts, G); if (pts.length < 3) return pts; }
    const sw = (o.sw ?? 1) * swBase, inkC = o.ink === undefined ? c.ink : o.ink;
    if (HIM_PROF.nohatch) o = { ...o, hatch: null, gran: false };
    if (o.wc && o.wash && k.det && !clean && !HIM_PROF.nowc) {
      // watercolour: the wash, a second translucent layer slightly offset and shrunk (a soft wet edge), granulation in
      // the shadow masses, and pigment pooling as a darker ring just inside the edge
      const wk = o.wc === true ? 1 : o.wc, dk = mixCol(o.wash, c.ink, .28);
      paint(pts, { wash: o.wash, washOp: o.op, ink: null });
      let cx = 0, cy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [x, y] of pts) { cx += x; cy += y; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      cx /= pts.length; cy /= pts.length;
      // a real watercolour fill (bleeding, pigment texture), kept a little inside so its bleed stays on the shape
      if (o.fill) paint(pts.map(([x, y]) => [cx + (x - cx) * .86, cy + (y - cy) * .92]), { fill: o.fill, fillOp: o.fillOp ?? 100, bleed: .015, tex: .65, border: .6, ink: null });
      const off = .05 * u * wk, hs = hash(Math.round(x1 - x0) + Math.round(y1 - y0) * 7);
      paint(pts.map(([x, y]) => [cx + (x - cx) * .965 + off * .7, cy + (y - cy) * .965 + off]), { wash: dk, washOp: 40 * wk, ink: null });
      if (!o.ring && (x1 - x0) > 2 * u && (y1 - y0) > 2 * u) {   // a soft lighter bloom where the wash dried unevenly
        const r = Math.min(x1 - x0, y1 - y0) * .16, bx = cx + (hs - .5) * r, by = cy - r * .6;
        paint(ellPts(bx, by, r * 1.3, r, 14, r * .18, hs * 3), { wash: mixCol(o.wash, c.white, .3), washOp: 38, ink: null });
      }
      if (o.ring && o.gran !== false) paint(pts.map(([x, y]) => [cx + (x - cx) * .9, cy + (y - cy) * .9]), { ink: null, hatch: { d: 4.5, a: .3 + hs * 2.4, b: 'HB', c: mixCol(o.wash, c.ink, .22), w: .25, o: { rand: .9 } } });
      // pigment pooling: a darker ring just inside the edge of the wash
      inkLine(pts.concat([pts[0]]), (o.ring ? .55 : .4) * swBase, mixCol(o.wash, c.ink, o.ring ? .4 : .22), 'inkfine', 0);
      if (inkC !== null) paint(pts, { ink: inkC, sw, br: o.br || ((o.sw ?? 1) < .5 ? 'inkfine' : 'ink') });
      if (o.hatch) paint(pts, { ink: null, hatch: o.hatch });
      return pts;
    }
    paint(pts, { wash: o.wash, washOp: o.op, ink: inkC, sw, br: o.br || (clean || (o.sw ?? 1) < .5 ? 'inkfine' : 'ink'), hatch: o.hatch && k.det ? o.hatch : null, fill: o.fill, fillOp: o.fillOp ?? 110, bleed: o.bleed ?? .12, tex: o.tex ?? .55, border: .5 });
    return pts;
  };
  k.line = (P, w = .5, col = c.ink, o = {}) => {
    const pts = o.raw ? himSc(himJ(P, (o.j ?? J) / u), u) : k.pts(P, false, o.n || 5, o.j ?? J);
    const G = g(), runs = G ? himClipLine(pts, G) : [pts];
    // line-weight hierarchy: silhouettes and main contours in 'ink', thin inner details in 'inkfine'
    const br = o.br || (clean || w < .5 ? 'inkfine' : 'ink'), ww = br === 'inkfine' && !o.br ? w * 1.5 : w;
    for (const r of runs) inkLine(r, ww * swBase, col, br, o.curv ?? 0);
  };
  return k;
}

// ---------- face ----------
// Head-local units: origin between the eyes, x right, y down. Head from crown -2.25 to chin 2.18, half-width 1.76.
const HIM_FACE_R = [[0, -2.25], [.95, -2.12], [1.5, -1.72], [1.74, -1.02], [1.76, -.3], [1.72, .35], [1.62, .85], [1.47, 1.22, 1], [1.0, 1.75], [.45, 2.1], [.14, 2.19]];
const HIM_FACE_FRONT = HIM_FACE_R.concat(himMir(HIM_FACE_R.slice(1)).reverse());
const HIM_EYE = { cx: .84, k: 1.2, ky: .86 };

function himEye(K, c, f, cx, s, E = HIM_EYE.k, cmp = 1) {
  // s = +1: outer corner toward screen right, -1: toward the left. cmp < 1 foreshortens it (the far eye in 3/4).
  const X = x => cx + x * s * E * cmp, Y = y => y * E * HIM_EYE.ky;
  let top = [[-.4, .06], [-.24, -.12], [.03, -.2], [.3, -.17], [.47, -.06]];
  let bot = [[.47, -.06], [.41, .09], [.2, .19], [-.08, .2], [-.3, .15], [-.4, .06]];
  const lid = clamp(f.lid || 0), low = clamp(f.low || 0);
  const shut = [.07, .13, .15, .11, .02];
  bot = bot.map(([x, y]) => [x, lerp(y, y - .11, low * (1 - Math.abs(x) * .8))]);
  top = top.map(([x, y], i) => [x, lerp(y, shut[i], lid)]);
  const T = top.map(([x, y]) => [X(x), Y(y)]), B = bot.map(([x, y]) => [X(x), Y(y)]);
  const w = cmp < .9 ? .85 : 1, d2 = K.det2;
  // double-eyelid crease (rides up as the lid lowers) and the inner-corner mark
  const crease = () => { if (lid < .8) K.line([[X(-.18), Y(-.3 + lid * .12)], [X(.12), Y(-.36 + lid * .14)], [X(.38), Y(-.31 + lid * .12)], [X(.52), Y(-.17 + lid * .1)]], .38 * w, c.inkSoft, { n: 3 }); };
  if (f.eye === 'happy') {   // laughing: closed upward arcs with lashes
    K.line([[X(-.42), Y(.12)], [X(-.15), Y(-.1)], [X(.18), Y(-.13)], [X(.48), Y(.04)]], 1.45 * w, c.lash, { n: 4 });
    if (d2) K.line([[X(.4), Y(-.02)], [X(.6), Y(.08)]], .55 * w, c.lash, { raw: true });
    K.line([[X(-.3), Y(-.28)], [X(.05), Y(-.36)], [X(.35), Y(-.3)]], .35 * w, c.inkSoft, { n: 3 });
    return;
  }
  if (f.eye === 'squeeze') {   // shut tight: a > < crease
    K.line([[X(-.42), Y(-.14)], [X(.08), Y(.02)], [X(.5), Y(.12)]], 1.4 * w, c.lash, { n: 3 });
    K.line([[X(-.28), Y(.2)], [X(.22), Y(.14)]], .6 * w, c.ink, { n: 3 });
    return;
  }
  if (lid > .86) {   // closed: one heavy lash curve with flicks, the crease above
    K.line([[X(-.42), Y(.1)], [X(-.1), Y(.18)], [X(.22), Y(.16)], [X(.5), Y(.04)]], 1.35 * w, c.lash, { n: 4 });
    K.line([[X(.42), Y(.06)], [X(.6), Y(.18)]], .7 * w, c.lash, { raw: true });
    if (d2) K.line([[X(.3), Y(.15)], [X(.42), Y(.3)]], .45 * w, c.lash, { raw: true });
    K.line([[X(-.2), Y(-.08)], [X(.15), Y(-.12)], [X(.45), Y(-.06)]], .35 * w, c.inkSoft, { n: 3 });
    return;
  }
  // the white, with the lid's shadow along its top
  K.shape(T.concat(B.slice(1, -1)), { wash: c.white, ink: null, j: 0, n: 3 });
  const asc = C => C[0][0] < C[C.length - 1][0] ? C : C.slice().reverse();
  const clip = P => himBetween(P, asc(T), asc(B));
  // iris in three washes (dark top, mid, a light crescent at the bottom), the pupil, two highlights
  const ik = (f.irisK ?? 1) * E, lx = (f.lookX || 0) * .15 * E * cmp, ly = (f.lookY || 0) * .07;
  const icx = X(.04) + lx, icy = Y(.03) + ly, ir = .2 * ik * (cmp < .9 ? .8 : 1), iry = .25 * ik;
  K.shape(clip(ellPts(icx, icy, ir * .96, iry, 20)), { wash: c.irisDk, ink: null, raw: true, j: 0 });
  K.shape(clip(ellPts(icx, icy + iry * .14, ir * .8, iry * .78, 18)), { wash: c.iris, ink: null, raw: true, j: 0 });
  if (!f.dull) {
    const cres = []; for (let i = 0; i <= 8; i++) { const a = .25 + i / 8 * (Math.PI - .5); cres.push([icx + Math.cos(a) * ir * .76, icy + iry * .12 + Math.sin(a) * iry * .74]); }
    for (let i = 8; i >= 0; i--) { const a = .25 + i / 8 * (Math.PI - .5); cres.push([icx + Math.cos(a) * ir * .5, icy + Math.sin(a) * iry * .42]); }
    K.shape(clip(cres), { wash: c.irisLt, op: 235, ink: null, raw: true, j: 0 });
    K.shape(clip(ellPts(icx, icy + iry * .05, ir * .36, iry * .42, 12)), { wash: c.pupil, ink: null, raw: true, j: 0 });
  } else K.shape(clip(ellPts(icx, icy + iry * .2, ir * .6, iry * .5, 14)), { wash: mixCol(c.iris, c.white, .25), op: 150, ink: null, raw: true, j: 0 });
  if (d2) K.line(clip(ellPts(icx, icy, ir * .96, iry, 20)).concat([clip(ellPts(icx, icy, ir * .96, iry, 20))[0]]), .3, c.irisDk, { raw: true, j: 0 });
  K.shape(T.concat(T.slice().reverse().map(([x, y]) => [x, y + .08 * E])), { wash: c.skinDk, op: 130, ink: null, raw: true, j: 0 });
  if (!f.dull) {
    K.shape(ellPts(icx - .075 * E * cmp, icy - .075 * E, .06 * E, .07 * E, 10, 0, -.4), { wash: c.white, ink: null, raw: true, j: 0 });
    K.shape(ellPts(icx + .065 * E * cmp, icy + .1 * E, .03 * E, .026 * E, 8), { wash: c.white, ink: null, raw: true, j: 0 });
  }
  // upper lash: a thick tapered stroke, heaviest at the outer corner, a wing and two lash flicks
  const th = [.04, .08, .115, .145, .165];
  const lash = T.map(p => [p[0], p[1]]).concat([[X(.62), Y(.1), 1]], T.slice().reverse().map(([x, y], i) => [x, y - th[4 - i] * E]));
  K.shape(lash, { wash: c.lash, ink: null, n: 3, j: 0 });
  if (K.det) {
    K.shape(himClump([X(.3), T[3][1] - .1 * E], [X(.66), T[3][1] - .2 * E], .07 * E, .15 * s), { wash: c.lash, ink: null, n: 2, j: 0 });
    K.shape(himClump([X(.42), T[4][1] - .06 * E], [X(.74), T[4][1] + .02 * E], .06 * E, .1 * s), { wash: c.lash, ink: null, n: 2, j: 0 });
    if (d2) K.line([[X(-.4), T[0][1]], [X(-.47), T[0][1] + .05 * E]], .4 * w, c.skinDk, { raw: true });   // inner corner
  }
  // lower lid: a soft line along the outer half and a couple of lower-lash hints
  K.line([[X(.46), B[0][1] + .1 * E], [X(.3), B[1][1] + .05 * E], [X(.05), B[2][1] + .03 * E]], .5 * w, c.ink, { n: 3 });
  if (K.det) K.line([[X(-.05), B[3][1] + .03 * E], [X(-.3), B[4][1] + .02 * E]], .3 * w, c.inkSoft, { n: 2 });
  if (d2) for (const k of [.36, .22]) K.line([[X(k), B[1][1] + (k > .3 ? .07 : .09) * E], [X(k + .05), B[1][1] + (k > .3 ? .14 : .16) * E]], .35 * w, c.lash, { raw: true });
  crease();
}
function himEyeFront(K, c, f, s) { himEye(K, c, f, s * HIM_EYE.cx, s); }
function himBrowFront(K, c, f, s, X = x => s * x) {
  const bi = f.browIn || 0, bo = f.browOut || 0, by = f.browY || 0;
  const P = [[.22, -.66 + bi * (bi < 0 ? .26 : .17) + by], [.75, -.8 + by + (bi + bo) * .06], [1.4, -.75 + bo * .12 + by]];
  const w = [.15, .11, .03];
  const top = P.map(([x, y], i) => [X(x), y - w[i] / 2]), bot = P.map(([x, y], i) => [X(x), y + w[i] / 2]).reverse();
  K.shape(top.concat([[X(1.48), P[2][1] + .03, 1]], bot), { wash: c.hair, ink: null, n: 4 });
  K.line([[X(.22), P[0][1] - .07], [X(.75), P[1][1] - .055], [X(1.47), P[2][1] + .02]], .5, c.lash, { n: 4 });   // the upper edge, tapering out
  if (K.det2) for (let i = 0; i < 4; i++) {   // hair strokes inside the brow
    const k = (i + .7) / 5, x = lerp(.3, 1.25, k), y = lerp(lerp(P[0][1], P[1][1], Math.min(1, k * 2)), P[2][1], Math.max(0, k * 2 - 1));
    K.line([[X(x), y + .03], [X(x + .13), y - .015]], .25, c.lash, { raw: true });
  }
}
function himGlassesFront(K, c, f, s, sw, X = x => s * x, temple = true) {
  // the frame's faint shadow on the cheek, just under the lens edge
  if (K.det) K.line([[X(.95), .5], [X(1.32), .47], [X(1.5), .32]], .3, mixCol(c.skin, c.skinSh, .7), { n: 3 });
  if (f.glare > 0) {   // the screen's light on the lenses
    K.shape([[X(.26), -.36], [X(1.42), -.36], [X(1.42), .2], [X(1.3), .38], [X(.38), .38], [X(.26), .22]], { wash: c.glare, op: 115 * f.glare, ink: null, raw: true, j: 0 });
    K.line([[X(.55), .3], [X(1.0), -.3]], 1.4 * f.glare, c.white, { raw: true });
    K.line([[X(.85), .32], [X(1.2), -.12]], .7 * f.glare, c.white, { raw: true });
  } else {   // a glare streak across the lens
    K.shape([[X(1.2), -.33], [X(1.4), -.33], [X(1.4), -.18], [X(1.14), .1]], { wash: c.white, op: 60, ink: null, raw: true, j: 0 });
    if (K.det) K.line([[X(1.36), -.26], [X(1.2), -.02]], .3, c.white, { raw: true });
  }
  // the rimless lower edge of the lens
  K.line([[X(.25), -.34], [X(.25), .24, 1], [X(.32), .36], [X(1.36), .36], [X(1.43), .24, 1], [X(1.44), -.34]], .3, c.glassDk, { n: 4 });
  // the top rim (half-rim frame) with a highlight along its upper edge, a nose pad
  K.shape([[X(.2), -.38, 1], [X(.8), -.44], [X(1.48), -.4, 1], [X(1.49), -.33, 1], [X(.8), -.375], [X(.24), -.32, 1]], { wash: c.glass, ink: c.glassDk, sw: .4, n: 4 });
  if (K.det) { K.line([[X(.3), -.39], [X(.8), -.43], [X(1.35), -.39]], .3, c.white, { n: 3 }); K.shape(ellPts(X(.26), .02, .035, .07, 8), { wash: c.glass, ink: c.glassDk, sw: .3, raw: true, j: 0 }); }
  if (temple) K.line([[X(1.47), -.37], [X(1.76), -.3]], .6, c.glassDk, { raw: true });
}
function himMouthFront(K, c, f, sw, mx = 0, mk = 1) {
  const m = f.mouth || 'closed', dark = '#5A2630', y0 = 1.42;
  const K0 = K; K = { shape: (P, o) => K0.shape(P.map(([x, y, k]) => [mx + x * mk, y, k]), o), line: (P, w, col, o) => K0.line(P.map(([x, y, k]) => [mx + x * mk, y, k]), w, col, o) };
  // the lower lip's soft shadow and the philtrum above the mouth
  const lipShade = dy => { if (!K0.det) return; K.shape([[-.17, y0 + dy - .06], [0, y0 + dy - .1], [.17, y0 + dy - .06], [.1, y0 + dy + .04], [-.1, y0 + dy + .04]], { wash: c.skinSh, op: 150, ink: null, n: 3 });
    K.line([[.01, y0 - .26], [.01, y0 - .18]], .25, c.skinSh, { raw: true }); };
  const open = (P, tongue = true, teeth = false) => {
    K.shape(P, { wash: dark, ink: c.ink, sw: .5, n: 4 });
    const t0 = Math.min(...P.map(p => p[1])), b = Math.max(...P.map(p => p[1])), hw = Math.max(...P.map(p => p[0])) * .6;
    if (teeth) K.shape([[-hw, t0 + .02], [hw, t0 + .02], [hw * .85, t0 + .09], [-hw * .85, t0 + .09]], { wash: c.white, ink: null, raw: true, j: 0 });
    if (tongue && b - t0 > .14) K.shape(ellPts(0, b - .06, hw * .7, .06, 10), { wash: '#D9707A', ink: null, raw: true, j: 0 });
  };
  switch (m) {
    case 'closed': lipShade(.2); K.line([[-.3, y0 - .02], [-.1, y0 + .015], [.12, y0 + .015], [.3, y0 - .03]], .6, c.ink, { n: 3 }); K.line([[-.09, y0 + .22], [.09, y0 + .22]], .4, c.skinDk, { raw: true }); break;
    case 'smile': lipShade(.22); K.line([[-.38, y0 - .1], [-.14, y0 + .04], [.14, y0 + .04], [.38, y0 - .1]], .65, c.ink, { n: 3 }); K.line([[-.08, y0 + .24], [.08, y0 + .24]], .4, c.skinDk, { raw: true });
      if (K0.det) { K.line([[-.42, y0 - .16], [-.38, y0 - .06]], .3, c.skinDk, { raw: true }); K.line([[.42, y0 - .16], [.38, y0 - .06]], .3, c.skinDk, { raw: true }); } break;
    case 'frown': K.line([[-.3, y0 + .07], [-.1, y0 - .01], [.12, y0 - .01], [.3, y0 + .08]], .6, c.ink, { n: 3 }); break;
    case 'flat': K.line([[-.24, y0], [.24, y0]], .55, c.ink, { raw: true }); break;
    case 'tight': K.line([[-.3, y0 + .02], [-.15, y0 - .03], [0, y0 + .02], [.15, y0 - .03], [.3, y0 + .02]], .55, c.ink, { n: 3 }); break;
    case 'A': open([[-.28, y0 - .05], [0, y0 - .09], [.28, y0 - .05], [.17, y0 + .3], [0, y0 + .36], [-.17, y0 + .3]], true, true); break;
    case 'I': open([[-.33, y0 - .04], [0, y0 - .06], [.33, y0 - .04], [.2, y0 + .1], [0, y0 + .13], [-.2, y0 + .1]], false, true); break;
    case 'U': open(ellPts(0, y0 + .05, .1, .11, 10), false); break;
    case 'E': open([[-.3, y0 - .04], [0, y0 - .07], [.3, y0 - .04], [.2, y0 + .17], [0, y0 + .2], [-.2, y0 + .17]], true, true); break;
    case 'O': open(ellPts(0, y0 + .1, .16, .21, 12), true); break;
    case 'gasp': open(ellPts(0, y0 + .12, .19, .26, 12), true); break;
    case 'grin': open([[-.4, y0 - .12], [0, y0 - .06], [.4, y0 - .12], [.24, y0 + .16], [0, y0 + .22], [-.24, y0 + .16]], true, true); break;
    case 'laugh': open([[-.42, y0 - .14], [0, y0 - .08], [.42, y0 - .14], [.27, y0 + .28], [0, y0 + .38], [-.27, y0 + .28]], true, true); break;
    case 'wail': { const w = Math.sin(T * 30) * .02; open([[-.34, y0 + .02 + w], [-.12, y0 - .1], [.12, y0 - .1 - w], [.34, y0 + .02], [.21, y0 + .3], [-.21, y0 + .3]], true); break; }
  }
}

// ---------- hair ----------
// Layered hair: a dark base, a mid-tone inner mass, then clumps radiating from the crown to the silhouette (their tips
// make the outline), each with a strand line. keep(p) chooses which silhouette points get a clump (not the face side).
function himHairMass(K, c, sil, crown, keep, n = 26, seed = 0) {
  K.shape(sil, { wash: c.hairSh, ink: null, n: 4, wc: .8, gran: false });
  K.shape(sil.map(([x, y, k]) => [lerp(crown[0], x, .72), lerp(crown[1], y, .72), k]), { wash: c.hair, ink: null, n: 4 });
  const pts = himS(sil, true, 4), L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1], step = tot / n, tips = [];
  for (let k = 0; k < n; k++) {
    const d = (k + .5 + (hash(seed + k) - .5) * .4) * step; let i = 0; while (i < L.length - 1 && L[i + 1] < d) i++;
    const p = pts[i]; if (keep(p)) tips.push(p);
  }
  tips.sort((a, b) => b[1] - a[1]);   // lower clumps first, the top of the head over them
  const clumps = [];
  tips.forEach((p, i) => {
    const h = hash(seed * 7 + i * 3.3), T = [lerp(crown[0], p[0], .985), lerp(crown[1], p[1], .985)], R = [lerp(crown[0], p[0], .3 + .1 * h), lerp(crown[1], p[1], .3 + .1 * h)];
    const sideB = (T[0] - crown[0]) > 0 ? -1 : 1, P = himClump(R, T, step * (1.6 + .7 * h), sideB * (.18 + .2 * h));
    clumps.push(P);
    K.shape(P, { wash: i % 3 === 0 ? mixCol(c.hair, c.hairHi, .12) : i % 3 === 1 ? c.hair : mixCol(c.hair, c.hairSh, .3), ink: null, n: 3 });
    K.line(P.slice(2, 4), .3, c.lash, { n: 3 });
    if (K.det2 && h > .4) K.line([himAt(R, T, .5), himAt(R, T, .88)].map(q => [q[0] + (h - .5) * .08, q[1]]), .22, c.hairSh, { n: 2 });
  });
  return clumps;
}
// Bangs: main clumps with strand lines and a highlight streak each, thin sub-strands between them.
function himBangs(K, c, bangs) {
  for (const [r, t, w, b] of bangs) K.shape(himClump(r, t, w, b), { wash: c.hair, ink: null, n: 4 });
  if (K.det) for (let i = 0; i < bangs.length - 1; i++) {   // thin strands in the gaps
    const [r0, t0] = bangs[i], [r1, t1] = bangs[i + 1], r = himAt(r0, r1, .5), t = himAt(t0, t1, .5 + (hash(i * 5.1) - .5) * .4);
    const P = himClump(r, [t[0], t[1] - .15 - .2 * hash(i * 2.7)], .22, (hash(i) - .5) * .4);
    K.shape(P, { wash: c.hairMid, ink: null, n: 3 }); K.line(P.slice(2, 5), .25, c.lash, { n: 3 });
  }
  bangs.forEach(([r, t, w, b], i) => {
    const P = himClump(r, t, w, b);
    K.line(P.slice(1, 4), .5, c.lash, { n: 4 }); K.line(P.slice(3, 6), .3, c.lash, { n: 4 });
    if (K.det) K.line([himAt(r, t, .12), himAt(r, t, .3)].map(q => [q[0] + w * .12, q[1]]), .3, c.hairHi, { n: 2 });
  });
}
// The angel ring: a broken glossy band across the hair, with fine strokes along the strands through it.
function himRing(K, c, x0, x1, y, sag, crown, seed) {
  himShine(K, c, x0, x1, y, sag, seed);
  if (!K.det2) return;
  for (let i = 0; i < 14; i++) {
    const x = lerp(x0 + .1, x1 - .1, (i + hash(seed + i) * .6) / 14), yy = y + sag * Math.pow((x - (x0 + x1) / 2) / ((x1 - x0) / 2), 2);
    const d = himDir(crown, [x, yy]), l = .18 + .14 * hash(seed + i * 3);
    K.line([[x - d[0] * l, yy - d[1] * l], [x + d[0] * l * .6, yy + d[1] * l * .6]], .22, i % 2 ? c.hairHi : mixCol(c.hairHi, c.white, .3), { raw: true });
  }
}
// Flyaway strands curling off the silhouette.
function himFlyaways(K, c, P, crown) {
  if (!K.det2) return;
  P.forEach(([x, y, b], i) => { const d = himDir(crown, [x, y]), n = [-d[1], d[0]];
    K.line([[x - d[0] * .1, y - d[1] * .1], [x + d[0] * .12 + n[0] * b * .08, y + d[1] * .12 + n[1] * b * .08], [x + d[0] * .2 + n[0] * b * .22, y + d[1] * .2 + n[1] * b * .22]], .3, c.lash, { n: 3 }); });
}
// Ear details (front-facing or profile ear around (cx, cy), s = which way the ear opens, k = scale).
function himEarDetail(K, c, cx, cy, s, k = 1) {
  K.shape(ellPts(cx + s * .03 * k, cy + .12 * k, .1 * k, .2 * k, 10), { wash: c.skinDk, op: 120, ink: null, raw: true, j: 0 });
  K.line([[cx - s * .02 * k, cy - .45 * k], [cx + s * .12 * k, cy - .32 * k], [cx + s * .16 * k, cy + .05 * k], [cx + s * .08 * k, cy + .38 * k]], .32, c.skinDk, { n: 3 });
  if (K.det2) { K.line([[cx + s * .0, cy + .3 * k], [cx + s * .06 * k, cy + .02 * k], [cx - s * .04 * k, cy - .22 * k]], .25, c.skinDk, { n: 3 });
    K.line([[cx - s * .06 * k, cy + .5 * k], [cx + s * .04 * k, cy + .58 * k]], .25, c.skinDk, { n: 2 }); }
}
// The hair's glossy band: broken lens-shaped strokes along an arc (x0..x1 at height y, sagging by `sag` at the ends).
function himShine(K, c, x0, x1, y, sag = .3, seed = 0, w = .13) {
  let x = x0, i = 0;
  while (x < x1 - .1) {
    const L = .32 + .22 * hash(seed + i * 3.1), xa = x, xb = Math.min(x1, x + L), Y = xx => y + sag * Math.pow((xx - (x0 + x1) / 2) / ((x1 - x0) / 2), 2);
    const xm = (xa + xb) / 2, ww = w * (.7 + .5 * hash(seed + i * 7.7));
    K.shape([[xa, Y(xa) + .04, 1], [xm, Y(xm) - ww * .6], [xb, Y(xb) - .02, 1], [xm + .05, Y(xm) + ww * .5]], { wash: c.hairHi, ink: null, n: 3 });
    x = xb + .1 + .1 * hash(seed + i * 5.3); i++;
  }
}
// The head, front view, drawn around its own origin (between the eyes).
const HIM_BANGS_FRONT = [  // [root, tip, width, bend]: heavy uneven locks swept toward screen left from a parting at the right
  [[-1.62, -1.95], [-1.92, .22], .62, -.2], [[-1.2, -2.3], [-1.58, -.32], .8, .2], [[-.7, -2.42], [-1.06, -.36], .84, .16], [[-.2, -2.48], [-.44, .16], .8, .2],
  [[.3, -2.46], [.13, -.12], .74, .12], [[.8, -2.4], [.9, -.42], .68, -.08], [[1.24, -2.25], [1.48, -.36], .64, -.18], [[1.62, -1.95], [1.96, .18], .56, .22]];
function himHeadFront(K, c, f, u, sw) {
  // hair mass behind the head: rounded volume with a few tufts breaking the silhouette, not a crown
  const back = [[-1.9, .25, 1], [-1.98, -.7], [-2.04, -1.35], [-2.32, -1.7, 1], [-2.1, -2.05], [-2.18, -2.6], [-2.3, -2.95, 1], [-1.8, -3.1], [-1.35, -3.45], [-.75, -3.62], [-.5, -3.82, 1], [-.12, -3.66],
                [.5, -3.68], [1.0, -3.75, 1], [1.22, -3.45], [1.72, -3.1], [2.18, -3.0, 1], [2.0, -2.5], [2.1, -1.9], [2.3, -1.62, 1], [2.02, -1.25], [1.98, -.6], [1.9, .25, 1]];
  himHairMass(K, c, back, [.45, -2.7], p => p[1] < -.3, 28, 1);
  // ears
  for (const s of [-1, 1]) {
    const E = [[1.64, -.22], [1.9, -.38], [2.06, -.15], [2.04, .28], [1.9, .66], [1.7, .92], [1.56, .82]].map(([x, y]) => [s * x, y]);
    K.shape(E, { wash: c.skin, sw: .5, n: 4 });
    K.shape([[1.75, -.1], [1.92, -.1], [1.9, .4], [1.72, .5]].map(([x, y]) => [s * x, y]), { wash: c.skinSh, op: 170, ink: null, n: 3 });
    K.line([[1.84, -.14], [1.94, .2], [1.8, .55]].map(([x, y]) => [s * x, y]), .3, c.skinDk);
    if (K.det) himEarDetail(K, c, s * 1.86, .2, s, .75);
  }
  // face
  K.shape(HIM_FACE_FRONT, { wash: c.skin, ink: null, n: 5 });
  // light from the upper left: a shadow down the right side and under the jaw
  K.shape([[1.42, -1.4], [1.7, -.9], [1.74, -.3], [1.7, .35], [1.6, .85], [1.45, 1.22], [.98, 1.74], [.55, 2.04], [.85, 1.55], [1.2, 1.05], [1.4, .45], [1.48, -.4]], { wash: c.skinSh, op: 160, ink: null, n: 4, wc: .7, ring: true, gran: false });
  // the shadow the bangs cast on the forehead (hatched), soft cheek warmth, the jaw's underside
  K.shape([[-1.58, -1.6], [-1.6, -.6], [-1.3, -.35], [-1.05, -.8], [-.8, -.15], [-.5, -.7], [-.25, .12], [.05, -.65], [.3, -.42], [.62, -.8], [.9, -.2], [1.2, -.9], [1.5, -.55], [1.62, -.45], [1.6, -1.6]], { wash: c.skinSh, op: 150, ink: null, n: 3, hatch: { d: 4, a: -.9, b: 'HB', c: c.skinDk, w: .3, o: { rand: .3 } } });
  for (const s of [-1, 1]) K.shape(ellPts(s * 1.05, .72, .42, .2, 14), { wash: c.blush, op: 42, ink: null, raw: true, j: 0 });
  K.shape([[-1.0, 1.8], [-.5, 2.06], [.5, 2.06], [1.0, 1.8], [.45, 1.95], [-.45, 1.95]], { wash: c.skinSh, op: 90, ink: null, n: 3 });
  // blush
  if (f.blush > 0) for (const s of [-1, 1]) {
    K.shape(ellPts(s * 1.02, .7, .36, .14, 14), { wash: c.blush, op: 100 * f.blush, ink: null, raw: true, j: 0 });
    if (f.blush > .5) for (let i = 0; i < 3; i++) K.line([[s * (.82 + i * .16), .78], [s * (.9 + i * .16), .62]], .25, c.cheekLine, { raw: true });
  }
  // dark circles (tired)
  if (f.circles > 0) for (const s of [-1, 1]) {
    K.shape([[s * .4, .26], [s * .84, .38], [s * 1.38, .16], [s * 1.32, .32], [s * .84, .52], [s * .45, .36]], { wash: '#8E6F92', op: 120 * f.circles, ink: null, n: 3 });
    K.line([[s * .48, .44], [s * .86, .5], [s * 1.2, .36]], .3 * f.circles, c.inkSoft);
  }
  // face outline: two tapered strokes, heavier on the shadow side and under the jaw
  const fr = HIM_FACE_R.slice(4);
  K.line(himMir(fr), .75, c.ink, { n: 4 }); K.line(fr, .95, c.ink, { n: 4 });
  // nose: a shadow down the right side of the bridge, the tip, its cast shadow and the nostrils
  K.shape([[.06, -.15], [.12, .3], [.2, .7], [.2, .88], [.05, .93], [.04, .4]], { wash: c.skinSh, op: 170, ink: null, n: 3 });
  K.shape([[.03, .32], [.11, .66], [.18, .86], [.05, .92]], { wash: c.skinSh, op: 200, ink: null, n: 3 });
  if (K.det) { K.shape(ellPts(.04, 1.04, .15, .045, 10), { wash: c.skinSh, op: 150, ink: null, raw: true, j: 0 });
    K.line([[-.13, .97], [-.07, .99]], .3, c.skinDk, { raw: true }); }
  K.line([[.16, .8], [.13, .92], [-.03, .96]], .45, c.ink, { n: 3 });
  // mouth, eyes, brows
  himMouthFront(K, c, f, sw);
  for (const s of [-1, 1]) himEyeFront(K, c, f, s, sw);
  for (const s of [-1, 1]) himBrowFront(K, c, f, s);
  // glasses
  K.line([[-.2, -.37], [0, -.45], [.2, -.37]], .6, c.glassDk, { n: 3 });
  for (const s of [-1, 1]) himGlassesFront(K, c, f, s, sw);
  // fringe: a base over the forehead, the bangs with their sub-strands, the angel ring, flyaways, the silhouette
  K.shape([[-1.78, -.9], [-1.75, -1.75], [-1.2, -2.35], [0, -2.6], [1.2, -2.35], [1.75, -1.75], [1.78, -.9], [1.4, -1.3], [.9, -1.15], [.4, -1.4], [-.1, -1.15], [-.6, -1.35], [-1.1, -1.1], [-1.45, -1.35]], { wash: c.hair, ink: null, n: 3 });
  himBangs(K, c, HIM_BANGS_FRONT);
  himRing(K, c, -1.6, 1.65, -2.72, .38, [.45, -3.05], 1);
  himFlyaways(K, c, [[-.5, -3.85, 1], [1.0, -3.72, -1], [-2.3, -2.9, 1], [2.28, -1.6, -1]], [.45, -2.4]);
  K.line(back.slice(0, 8), .75, c.ink, { n: 4 }); K.line(back.slice(7, 15), .8, c.ink, { n: 4 }); K.line(back.slice(14), .75, c.ink, { n: 4 });
}

// The head in 3/4 view, facing screen right. The near eye (his right) sits left of the nose, the far eye is foreshortened.
const HIM_BANGS_Q = [[[-1.2, -1.9], [-1.46, -.02], .6, -.14], [[-.72, -2.3], [-1.1, -.36], .8, .18], [[-.18, -2.44], [-.52, -.2], .82, .16],
  [[.36, -2.46], [.12, .14], .74, .18], [[.86, -2.36], [.94, -.42], .66, -.08], [[1.28, -2.15], [1.56, -.42], .58, -.2]];
function himHeadQ(K, c, f, u, sw) {
  const back = [[-1.05, 1.05, 1], [-1.6, .9], [-2.05, .35], [-2.32, .18, 1], [-2.22, -.4], [-2.35, -1.2], [-2.68, -1.55, 1], [-2.4, -2.0], [-2.42, -2.6], [-2.52, -2.98, 1], [-1.95, -3.1], [-1.3, -3.48],
                [-.85, -3.85, 1], [-.45, -3.55], [.3, -3.6], [.75, -3.76, 1], [.98, -3.3], [1.5, -3.0], [1.95, -2.85, 1], [1.72, -2.25], [1.92, -1.32, 1], [1.45, -1.3], [1.2, -.5], [-1.2, -.3]];
  himHairMass(K, c, back, [-.5, -2.85], p => p[1] < .95 && !(p[0] > 1.15 && p[1] > -1.6), 30, 2);
  const face = [[.1, -2.25], [1.0, -2.0], [1.42, -1.45], [1.56, -.62], [1.47, -.18], [1.56, .32], [1.48, .88], [1.25, 1.42, 1], [.88, 1.92], [.52, 2.14], [.15, 2.08], [-.55, 1.72], [-1.12, 1.22, 1], [-1.38, .7], [-1.42, -.3], [-1.28, -1.2], [-.85, -1.95]];
  K.shape(face, { wash: c.skin, ink: null, n: 5 });
  // shading: the far cheek, under the cheekbone and along the jaw toward the ear
  K.shape([[1.2, -1.5], [1.5, -.9], [1.56, -.62], [1.47, -.18], [1.56, .32], [1.48, .88], [1.25, 1.42], [.88, 1.92], [.62, 2.02], [.95, 1.4], [1.18, .7], [1.26, .1], [1.25, -.7]], { wash: c.skinSh, op: 150, ink: null, n: 4, wc: .7, ring: true, gran: false });
  K.shape([[-1.4, .55], [-1.1, 1.15], [-.55, 1.62], [.1, 1.95], [-.4, 1.4], [-.95, .85]], { wash: c.skinSh, op: 120, ink: null, n: 3 });
  K.shape([[-1.25, -1.6], [-1.3, -.55], [-.95, -.4], [-.7, -.82], [-.4, -.25], [-.1, -.7], [.25, -.4], [.52, .02], [.75, -.5], [1.0, -.3], [1.3, -.8], [1.45, -1.6]], { wash: c.skinSh, op: 150, ink: null, n: 3, hatch: { d: 4, a: -.9, b: 'HB', c: c.skinDk, w: .3, o: { rand: .3 } } });
  K.shape(ellPts(-.38, .74, .45, .2, 14), { wash: c.blush, op: 42, ink: null, raw: true, j: 0 }); K.shape(ellPts(1.22, .72, .22, .16, 12), { wash: c.blush, op: 38, ink: null, raw: true, j: 0 });
  if (f.blush > 0) {
    K.shape(ellPts(-.35, .72, .4, .14, 14), { wash: c.blush, op: 100 * f.blush, ink: null, raw: true, j: 0 });
    K.shape(ellPts(1.2, .72, .2, .12, 12), { wash: c.blush, op: 90 * f.blush, ink: null, raw: true, j: 0 });
    if (f.blush > .5) for (let i = 0; i < 3; i++) K.line([[-.55 + i * .16, .8], [-.47 + i * .16, .64]], .25, c.cheekLine, { raw: true });
  }
  if (f.circles > 0) {
    K.shape([[.18, .26], [-.28, .38], [-.82, .16], [-.76, .32], [-.28, .52], [.14, .36]], { wash: '#8E6F92', op: 120 * f.circles, ink: null, n: 3 });
    K.shape([[.85, .26], [1.12, .36], [1.4, .18], [1.38, .32], [1.12, .48], [.86, .36]], { wash: '#8E6F92', op: 110 * f.circles, ink: null, n: 3 });
  }
  // contours: far cheek (lit edge thin), jaw line back to the ear
  K.line([[1.56, -.62], [1.47, -.18], [1.56, .32], [1.48, .88], [1.25, 1.42, 1], [.88, 1.92], [.52, 2.14], [.15, 2.08]], .95, c.ink, { n: 4 });
  K.line([[.1, 2.06], [-.55, 1.72], [-1.12, 1.22], [-1.34, .82]], .75, c.ink, { n: 4 });
  // near ear
  const E = [[-1.2, -.22], [-1.52, -.4], [-1.78, -.15], [-1.76, .3], [-1.6, .72], [-1.38, .95], [-1.2, .8]];
  K.shape(E, { wash: c.skin, sw: .55, n: 4 });
  K.shape([[-1.36, -.12], [-1.62, -.1], [-1.6, .42], [-1.38, .5]], { wash: c.skinSh, op: 170, ink: null, n: 3 });
  K.line([[-1.62, -.14], [-1.68, .2], [-1.52, .58]], .3, c.skinDk);
  if (K.det) himEarDetail(K, c, -1.5, .22, -1, .78);
  // nose: a ridge line down the far side, the tip, and its shadow
  K.shape([[.62, .3], [.8, .62], [.92, .86], [.7, .96], [.6, .7]], { wash: c.skinSh, op: 210, ink: null, n: 3 });
  K.line([[.66, .28], [.8, .6], [.94, .86], [.8, .95]], .5, c.ink, { n: 3 });
  K.line([[.55, .96], [.66, .98]], .35, c.ink, { raw: true });
  if (K.det) { K.shape([[.5, -.2], [.62, .3], [.66, .5], [.58, .45], [.52, .1]], { wash: c.skinSh, op: 110, ink: null, n: 3 }); K.shape(ellPts(.66, 1.06, .16, .045, 10), { wash: c.skinSh, op: 150, ink: null, raw: true, j: 0 }); }
  himMouthFront(K, c, f, sw, .62, .78);
  // eyes: the near one (outer corner to the left) and the far one, foreshortened
  himEye(K, c, f, -.28, -1, HIM_EYE.k * .98);
  himEye(K, c, f, 1.12, 1, HIM_EYE.k * .98, .66);
  himBrowFront(K, c, f, -1, x => -.28 - (x - .84) * .98);
  himBrowFront(K, c, f, 1, x => 1.12 + (x - .84) * .66);
  // glasses: the bridge, the near lens (with the temple running back to the ear), the far lens
  K.line([[.3, -.37], [.5, -.44], [.68, -.37]], .6, c.glassDk, { n: 3 });
  himGlassesFront(K, c, f, -1, sw, x => -.28 - (x - .84) * .98, false);
  himGlassesFront(K, c, f, 1, sw, x => 1.12 + (x - .84) * .66, false);
  K.line([[-.92, -.38], [-1.38, -.3]], .7, c.glassDk, { raw: true });
  // fringe
  K.shape([[-1.35, -1.0], [-1.3, -1.8], [-.6, -2.35], [.5, -2.5], [1.4, -2.1], [1.6, -1.2], [1.3, -1.4], [.9, -1.2], [.5, -1.5], [0, -1.25], [-.5, -1.5], [-.95, -1.25]], { wash: c.hair, ink: null, n: 3 });
  // side hair over the temple, down to a short sideburn in front of the ear
  const side = [[-1.5, -1.9], [-.95, -1.6], [-1.0, -.6], [-1.06, .2, 1], [-1.2, -.25], [-1.3, -.42], [-1.55, -.5], [-1.6, -1.4]];
  K.shape(side, { wash: c.hair, ink: null, n: 3 });
  K.line(side.slice(1, 5), .4, c.ink, { n: 3 });
  himBangs(K, c, HIM_BANGS_Q);
  himRing(K, c, -2.05, 1.45, -2.7, .42, [-.5, -3.1], 2);
  himFlyaways(K, c, [[-.85, -3.8, 1], [.75, -3.7, -1], [-2.65, -1.55, 1], [-2.32, .15, -1]], [-.5, -2.4]);
  K.line(back.slice(0, 10), .8, c.ink, { n: 4 }); K.line(back.slice(9, 17), .8, c.ink, { n: 4 }); K.line(back.slice(16, 21), .75, c.ink, { n: 4 });
}

// The head in profile, facing screen right.
const HIM_BANGS_SIDE = [[[.1, -2.4], [.85, -.55], .74, -.12], [[.55, -2.36], [1.34, -.42], .66, .1], [[.95, -2.15], [1.58, -.8], .52, -.12], [[1.1, -1.9], [1.7, -1.15], .42, .15]];
function himHeadSide(K, c, f, u, sw) {
  const face = [[.3, -2.0], [1.05, -1.9], [1.36, -1.3], [1.44, -.6, 1], [1.36, -.22], [1.5, .2], [1.8, .74, 1], [1.5, .94, 1], [1.56, 1.18], [1.44, 1.34], [1.52, 1.5], [1.36, 1.7], [1.45, 1.98], [1.2, 2.2, 1], [.5, 2.04], [-.45, 1.55, 1], [-.85, .9], [-1.05, -.2], [-.85, -1.2], [-.3, -1.8]];
  K.shape(face, { wash: c.skin, ink: null, n: 5 });
  // shade: the jaw and the side plane behind the cheekbone
  K.shape([[-.45, 1.55], [-.85, .9], [-.95, .1], [-.55, .2], [-.15, 1.0], [.6, 1.7], [1.1, 2.0], [.5, 2.04]], { wash: c.skinSh, op: 150, ink: null, n: 3 });
  K.shape([[.2, -1.5], [1.2, -1.6], [1.38, -.8], [1.1, -.45], [.8, -.8], [.5, -.5], [.2, -.9]], { wash: c.skinSh, op: 140, ink: null, n: 3, hatch: { d: 4, a: -.9, b: 'HB', c: c.skinDk, w: .3, o: { rand: .3 } } });
  K.shape(ellPts(.85, .74, .42, .2, 14), { wash: c.blush, op: 42, ink: null, raw: true, j: 0 });
  if (K.det) { K.shape([[1.42, .2], [1.68, .68], [1.48, .86], [1.4, .5]], { wash: c.skinSh, op: 90, ink: null, n: 3 }); K.line([[1.36, 1.62], [1.44, 1.58]], .3, c.skinSh, { raw: true }); }
  if (f.blush > 0) { K.shape(ellPts(.9, .72, .38, .14, 14), { wash: c.blush, op: 100 * f.blush, ink: null, raw: true, j: 0 });
    if (f.blush > .5) for (let i = 0; i < 3; i++) K.line([[.72 + i * .16, .8], [.8 + i * .16, .64]], .25, c.cheekLine, { raw: true }); }
  if (f.circles > 0) K.shape([[.8, .26], [1.08, .38], [1.3, .2], [1.28, .34], [1.06, .5], [.82, .38]], { wash: '#8E6F92', op: 120 * f.circles, ink: null, n: 3 });
  // profile line: brow, nose, lips, chin; jaw back to the ear
  K.line([[1.05, -1.9], [1.36, -1.3], [1.44, -.6], [1.36, -.22], [1.5, .2], [1.8, .74, 1], [1.5, .94, 1], [1.56, 1.18], [1.44, 1.34], [1.52, 1.5], [1.36, 1.7], [1.45, 1.98], [1.2, 2.2]], .95, c.ink, { n: 4 });
  K.line([[1.2, 2.2], [.5, 2.04], [-.45, 1.55], [-.7, 1.1]], .8, c.ink, { n: 4 });
  K.line([[1.55, .86], [1.42, .82]], .35, c.ink, { raw: true });   // nostril
  const m = f.mouth || 'closed', y0 = 1.4;
  if (['A', 'E', 'O', 'gasp', 'laugh', 'grin', 'wail', 'I'].includes(m)) {
    const h = { A: .3, E: .18, O: .24, gasp: .28, laugh: .34, grin: .2, wail: .3, I: .1 }[m];
    K.shape([[1.5, y0 - .06], [1.18, y0 - .02], [1.24, y0 + h * .7], [1.46, y0 + h]], { wash: '#5A2630', ink: c.ink, sw: .45, n: 2 });
  } else if (m === 'smile' || m === 'laugh') K.line([[1.47, y0 - .02], [1.32, y0 + .02], [1.2, y0 - .08]], .55, c.ink, { n: 3 });
  else if (m === 'U') K.line([[1.6, y0], [1.48, y0 + .03]], .5, c.ink, { raw: true });
  else K.line([[1.47, y0], [1.24, y0 + .04]], .55, c.ink, { raw: true });
  // hair: the mass covers the skull behind a hairline that runs from the forehead to the temple and down to a short sideburn
  const back = [[1.15, -2.0], [.6, -1.6], [.12, -1.42], [-.02, -.6], [-.06, .3, 1], [-.32, -.1], [-.6, -.48], [-1.0, -.35], [-1.05, .55], [-.72, 1.18, 1], [-1.45, .85], [-1.95, .25], [-2.3, .1, 1], [-2.18, -.45], [-2.38, -1.3],
    [-2.7, -1.6, 1], [-2.38, -2.1], [-2.25, -2.75], [-2.4, -3.1, 1], [-1.75, -3.2], [-1.0, -3.55], [-.55, -3.85, 1], [-.2, -3.55], [.5, -3.45], [1.0, -3.58, 1], [1.2, -3.0], [1.62, -2.55, 1], [1.45, -1.98], [1.6, -1.3, 1], [1.3, -1.5]];
  himHairMass(K, c, back, [-.9, -2.75], p => p[0] < -.95 || p[1] < -1.95, 30, 3);
  K.line(back.slice(0, 5), .4, c.ink, { n: 3 });
  // ear
  const E = [[-.35, -.25], [-.62, -.42], [-.9, -.2], [-.92, .3], [-.76, .74], [-.5, .95], [-.32, .76]];
  K.shape(E, { wash: c.skin, sw: .55, n: 4 });
  K.shape([[-.5, -.15], [-.75, -.12], [-.74, .42], [-.52, .5]], { wash: c.skinSh, op: 170, ink: null, n: 3 });
  K.line([[-.75, -.16], [-.8, .2], [-.66, .58]], .3, c.skinDk);
  if (K.det) himEarDetail(K, c, -.64, .22, -1, .78);
  // eye in profile
  himEyeSide(K, c, f);
  const bi = f.browIn || 0, by = f.browY || 0;
  K.shape([[.78, -.74 + by], [1.12, -.82 + by + bi * .06], [1.42, -.68 + by + bi * .14], [1.38, -.56 + by + bi * .14], [1.1, -.66 + by + bi * .06], [.8, -.66 + by]], { wash: c.hair, ink: c.ink, sw: .3, n: 3 });
  // glasses: the lens edge in front of the eye, the top rim, the temple back to the ear
  if (f.glare > 0) K.shape([[1.47, -.38], [1.56, -.36], [1.58, .3], [1.5, .36]], { wash: c.glare, op: 180 * f.glare, ink: null, raw: true, j: 0 });
  K.line([[1.5, -.36], [1.53, .1], [1.48, .36]], .32, c.glassDk, { n: 3 });
  K.shape([[1.58, -.42, 1], [.95, -.44], [-.45, -.32, 1], [-.45, -.24, 1], [.95, -.35], [1.56, -.34, 1]], { wash: c.glass, ink: c.ink, sw: .35, n: 3 });
  // fringe and sideburn
  himBangs(K, c, HIM_BANGS_SIDE);
  himRing(K, c, -2.15, 1.1, -2.68, .38, [-.9, -3.05], 3);
  himFlyaways(K, c, [[-.55, -3.8, 1], [-2.65, -1.6, 1], [1.0, -3.52, -1]], [-.9, -2.4]);
  K.line(back.slice(9, 20), .8, c.ink, { n: 4 }); K.line(back.slice(19), .8, c.ink, { n: 4 });
}
function himEyeSide(K, c, f) {
  const lid = clamp(f.lid || 0), low = clamp(f.low || 0);
  if (f.eye === 'happy') { K.line([[.76, .06], [.98, -.1], [1.2, -.02]], 1.3, c.ink, { n: 3 }); return; }
  if (f.eye === 'squeeze') { K.line([[.74, -.12], [1.18, .04]], 1.3, c.ink, { raw: true }); return; }
  if (lid > .86) { K.line([[.74, .08], [1.0, .16], [1.2, .04]], 1.2, c.ink, { n: 3 }); return; }
  const ty = y => lerp(y, .12, lid), by = y => lerp(y, y - .1, low);
  const top = [[.74, ty(-.14)], [.98, ty(-.17)], [1.2, ty(-.06)]], bot = [[1.2, by(.04)], [1.1, by(.16)], [.8, by(.18)]];
  K.shape(top.concat(bot), { wash: c.white, ink: null, raw: true, j: 0 });
  const ik = f.irisK ?? 1, ix = 1.08 + (f.lookX || 0) * .03, iy = .03 + (f.lookY || 0) * .06;
  const clip = P => himBetween(P, top, bot.slice().reverse());
  K.shape(clip(ellPts(ix, iy, .09 * ik, .24 * ik, 14)), { wash: c.irisDk, ink: null, raw: true, j: 0 });
  K.shape(clip(ellPts(ix, iy + .04, .07 * ik, .17 * ik, 12)), { wash: c.iris, ink: null, raw: true, j: 0 });
  if (!f.dull) {
    K.shape(clip(ellPts(ix, iy + .12, .05 * ik, .07 * ik, 10)), { wash: c.irisLt, ink: null, raw: true, j: 0 });
    K.shape(clip(ellPts(ix + .01, iy + .02, .04 * ik, .1 * ik, 10)), { wash: c.pupil, ink: null, raw: true, j: 0 });
    K.shape(ellPts(ix - .02, iy - .08, .03, .05, 8), { wash: c.white, ink: null, raw: true, j: 0 });
  }
  if (lid < .8 && K.det) K.line([[.76, ty(-.3)], [1.0, ty(-.34)], [1.16, ty(-.24)]], .35, c.inkSoft, { n: 3 });
  K.shape([[.7, ty(-.2)], [.98, ty(-.27)], [1.22, ty(-.11)], [1.28, .03, 1], [1.18, ty(-.05)], [.98, ty(-.16)], [.76, ty(-.12)]], { wash: c.lash, ink: null, n: 3, j: 0 });
  if (K.det) K.shape(himClump([.72, ty(-.18)], [.6, ty(-.3)], .06, .2), { wash: c.lash, ink: null, n: 2, j: 0 });
  K.line([[1.16, by(.1)], [.96, by(.18)]], .45, c.ink, { raw: true });
}

// ---------- limbs ----------
// Joint chain from a base point: angles from straight down (0), + toward screen right. Returns [base, joint, end].
function himChain(b, a1, L1, a2, L2) {
  const j = [b[0] + Math.sin(a1) * L1, b[1] + Math.cos(a1) * L1], a = a1 + a2;
  return [b, j, [j[0] + Math.sin(a) * L2, j[1] + Math.cos(a) * L2]];
}
const himDir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
const himAt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const himOff = (p, d, k) => [p[0] - d[1] * k, p[1] + d[0] * k];   // offset to the left of direction d (screen +x when d points down)
// Hands, built from parts in hand-local units: the wrist at (0, 0), the hand pointing down +y. Profile kinds (relax,
// type, fist) are seen from the thumb side with the fingers curling toward +x (the palm side); 'open' is the back of the
// hand with the fingers spread, 'press' a flat hand pressed to glass. `thumb` = ±1 mirrors x.
const HIM_HANDS = {
  // profile silhouettes (from the thumb side): out = outline, lines = inner strokes (thumb edge, the next finger, knuckles)
  // hanging and relaxed, seen from the thumb side: built from parts (palm, four curled fingers back to front, thumb)
  relax: { parts: true },
  type:  { nail: [[.36, 1.55], 2.6], knuck: [[[-.3, .96], [-.24, 1.0]], [[-.02, 1.34], [.06, 1.32]]],
           prof: [[-.3, -.05], [-.34, .5], [-.32, .95], [-.16, 1.22], [.06, 1.42], [.26, 1.6], [.4, 1.62], [.43, 1.48], [.3, 1.3], [.22, 1.14], [.36, 1.04], [.44, .8], [.4, .3], [.3, -.05]],
           lines: [[[.12, .45], [.22, .8], [.26, 1.08]], [[-.3, 1.0], [-.06, 1.3], [.18, 1.5], [.32, 1.56]], [[-.32, .75], [-.14, .78]]] },
  fist:  { prof: [[-.32, -.05], [-.38, .5], [-.4, .95], [-.3, 1.25], [-.05, 1.42], [.25, 1.36], [.43, 1.15], [.47, .8], [.42, .4], [.32, -.05]],
           lines: [[[-.12, 1.0], [.1, 1.12], [.3, 1.08]], [[-.2, 1.2], [.05, 1.3], [.3, 1.24]], [[.06, .5], [.2, .78], [.36, .9]]] },
  // the back of the hand, fingers spread (reaching) or flat (pressed to glass)
  open:  { spread: 1, curl: .05 },
  press: { spread: .4, curl: 0 }
};
// A finger (or thumb) from base along a0, segment lengths L, widths w0 → w1, bending by curl per joint; open at the base.
function himFinger(base, a0, L, w0, w1, curl) {
  const P = [base]; let a = a0, p = base;
  L.forEach((l, i) => { a += curl[i] ?? curl; p = [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l]; P.push(p); });
  const tb = himTube(P, P.map((_, i) => lerp(w0, w1, i / (P.length - 1))));
  const e = P[P.length - 1], d = [Math.sin(a), Math.cos(a)], n = [-d[1], d[0]], r = w1 / 2, tip = [];
  for (let k = 1; k < 6; k++) { const th = -Math.PI / 2 + k / 6 * Math.PI; tip.push([e[0] - n[0] * r * Math.sin(th) * -1 + d[0] * r * Math.cos(th), e[1] - n[1] * r * Math.sin(th) * -1 + d[1] * r * Math.cos(th)]); }
  return tb.L.concat(tip.reverse(), tb.R);
}
function himHand(K, c, kind, at, ang, thumb, skin, sc = 1.55) {
  const H = HIM_HANDS[kind] || HIM_HANDS.relax, ca = Math.cos(-ang), sa = Math.sin(-ang), sk = skin || c.skin;
  const tf = P => P.map(([x, y, k]) => { x *= thumb * sc; y *= sc; return [at[0] + x * ca - y * sa, at[1] + x * sa + y * ca, k]; });
  if (H.parts) {
    // hanging and relaxed, seen at ~45° from the thumb side: the back of the hand, four gently curled fingers (the
    // little finger furthest back and highest, the middle longest, the index a little apart), the thumb in front lying
    // along the index; ink lines between the fingers, nails on the thumb and the front fingers, knuckles on the back
    const fin = (base, a0, L, w0, w1, curl, kx = .8) => {   // kx: the curl toward the palm is foreshortened
      const P = [base]; let a = a0, p = base;
      L.forEach((l, i) => { a += curl[i]; const q = [p[0] + Math.sin(a) * l * kx, p[1] + Math.cos(a) * l]; if (!i) P.push(himAt(p, q, .45)); P.push(q); p = q; });
      const W = P.map((_, i) => lerp(w0, w1, i / (P.length - 1))), tb = himTube(P, W), e = P[P.length - 1], d = himDir(P[P.length - 2], e), r = w1 / 2, tip = [];
      for (let k = 1; k < 6; k++) { const th = k / 6 * Math.PI; tip.push([e[0] - d[1] * r * Math.cos(th) + d[0] * r * Math.sin(th), e[1] + d[0] * r * Math.cos(th) + d[1] * r * Math.sin(th)]); }
      return { out: tb.L.concat(tip, tb.R), e, d, r, P };   // (himTube's R runs from the tip back to the base)
    };
    const body = [[-.34, -.05], [-.4, .3], [-.44, .62], [-.42, .8], [-.34, 1.0], [-.1, 1.1], [.16, 1.14], [.4, 1.02], [.5, .62], [.53, .38], [.47, .15], [.37, -.05]];   // its lower edge is the webbing between the fingers
    K.shape(tf(body), { wash: sk, ink: null, n: 3 });
    K.shape(tf([[-.34, -.05], [-.4, .3], [-.44, .62], [-.42, .8], [-.28, .84], [-.26, .45], [-.18, .05]]), { wash: c.skinSh, op: 150, ink: null, n: 3 });
    K.line(tf(body.slice(0, 4)), .55, c.ink, { n: 3 });
    const F = [   // base, angle, phalanges, widths, curl per joint: little, ring, middle, index (a little apart)
      [[-.3, .74], -.04, [.3, .2, .16], .25, .2, [.14, .38, .3]],
      [[-.09, .82], -.03, [.37, .24, .18], .28, .22, [.12, .34, .28]],
      [[.12, .86], -.01, [.41, .26, .19], .29, .23, [.1, .3, .25]],
      [[.34, .82], .1, [.37, .24, .18], .28, .22, [.06, .24, .22]]
    ].map(([b, a0, L, w0, w1, cu]) => fin(b, a0, L, w0, w1, cu));
    F.forEach((f, i) => {
      const Q = tf(f.out), n = f.out.length;
      K.shape(Q, { wash: i < 2 ? mixCol(sk, c.skinSh, .7 - i * .3) : sk, ink: null, n: 3 });
      if (i >= 2) K.shape(tf(f.out.slice(0, 6)), { wash: c.skinSh, op: 80, ink: null, n: 3 });
      K.line(Q.slice(1, n - 1), i === 3 ? .48 : .42, c.ink, { n: 3 });
      if (K.det) K.line(tf([himOff(f.P[2], f.d, -f.r * .9), himOff(f.P[2], f.d, -f.r * .2)]), .22, c.skinDk, { raw: true });   // the middle joint's crease
    });
    // the thumb, from the ball of the thumb along the index
    const th = fin([.4, .28], .12, [.42, .34], .36, .26, [-.04, .1], 1), tl = th.P.length;
    K.shape(tf(th.out), { wash: sk, ink: null, n: 3 });
    K.shape(tf([[.48, .34], [.55, .6], [.57, .86], [.5, .72], [.45, .5]]), { wash: c.skinHi, op: 130, ink: null, n: 3 });
    K.line(tf(th.out.slice(2, tl + 3)), .42, c.ink, { n: 3 });   // the inner edge, against the index, and the tip
    K.line(tf([[.37, -.05], [.47, .15], [.53, .38]].concat(th.out.slice(tl + 2).reverse().slice(1))), .55, c.ink, { n: 3 });   // the ball of the thumb, its outer edge
    if (K.det) {
      const nail = (f, k, s) => { const q = [f.e[0] - f.d[1] * f.r * .3 * s - f.d[0] * f.r * .45, f.e[1] + f.d[0] * f.r * .3 * s - f.d[1] * f.r * .45];
        K.shape(tf(ellPts(q[0], q[1], f.r * .44 * k, f.r * .66 * k, 8, 0, -Math.atan2(f.d[0], f.d[1]))), { wash: c.nail, ink: c.skinDk, sw: .22, n: 2, j: 0 }); };
      nail(th, 1.05, 0); nail(F[3], .9, 1); if (K.det2) nail(F[2], .85, 1);
      for (const [x, y] of [[-.3, .76], [-.09, .84], [.12, .88], [.34, .84]]) K.line(tf([[x - .07, y], [x, y - .04], [x + .07, y]]), .24, c.skinDk, { n: 2 });   // knuckles
      if (K.det2) { K.line(tf([[-.12, .3], [-.1, .52], [-.08, .7]]), .2, c.skinSh, { n: 2 }); K.line(tf([[.1, .34], [.12, .56], [.13, .74]]), .2, c.skinSh, { n: 2 }); }   // tendons
    }
    return;
  }
  if (H.prof) {
    if (H.behind && K.det) { const B = tf(H.behind); K.shape(B, { wash: c.skinSh, ink: null, n: 3 }); K.line(B.slice(0, 7), .42, c.ink, { n: 3 }); if (H.sep) H.sep.forEach(L => K.line(tf(L), .36, c.ink, { n: 3 })); }
    K.shape(tf(H.prof), { wash: sk, sw: .6, n: 4 });
    K.shape(tf([[-.3, .05], [-.36, .5], [-.37, .9], [-.22, .8], [-.18, .3]]), { wash: c.skinSh, op: 160, ink: null, n: 3 });
    H.lines.forEach((L, i) => K.line(tf(L), i ? .38 : .45, i === H.lines.length - 1 ? c.skinDk : c.ink, { n: 4 }));
    if (K.det && H.nail) { const [[nx, ny], na] = H.nail; K.shape(tf(ellPts(nx, ny, .07, .1, 8, 0, na)), { wash: c.nail, ink: c.skinDk, sw: .25, n: 2, j: 0 }); }
    if (K.det && H.tnail) { const [[nx, ny], na] = H.tnail; K.shape(tf(ellPts(nx, ny, .06, .09, 8, 0, na)), { wash: c.nail, ink: c.skinDk, sw: .25, n: 2, j: 0 }); }
    if (K.det && H.knuck) H.knuck.forEach(L => K.line(tf(L), .28, c.skinDk, { raw: true }));
    return;
  }
  const part = (P, w = .5) => { const Q = tf(P); K.shape(Q, { wash: sk, ink: null, n: 3 }); K.line(Q, w, c.ink, { n: 3 }); };
  const sp = H.spread, cu = H.curl;
  [[-.34, .6, .24, -.2], [-.11, .74, .26, -.07], [.13, .8, .27, .04], [.36, .72, .26, .15]].forEach(([x, l, w, a]) =>
    part(himFinger([x, .9], a * sp, [l * .5, l * .3, l * .2], w, w * .88, [cu, cu, cu]), .45));
  const palm = [[-.46, .98], [-.52, .6], [-.47, .3], [-.36, -.05], [.36, -.05], [.46, .3], [.53, .62], [.47, .98]];
  K.shape(tf(palm), { wash: sk, ink: null, n: 3 }); K.line(tf(palm), .55, c.ink, { n: 3 });
  part(himFinger([.4, .28], .45 + .45 * sp, [.38, .3], .3, .25, [.12, .2]), .45);
  K.line(tf([[-.3, .82], [-.02, .76], [.3, .84]]), .25, c.skinDk, { n: 3 });
  for (const x of [-.34, -.11, .13, .36]) K.line(tf([[x - .05, .95], [x + .05, .95]]), .22, c.skinDk, { raw: true });
  if (K.det2) [[-.34, .6, -.2], [-.11, .74, -.07], [.13, .8, .04], [.36, .72, .15]].forEach(([x, l, a]) => {
    const tip = [x + Math.sin(a * sp) * l * .9, .92 + Math.cos(a * sp) * l * .9]; K.shape(tf(ellPts(tip[0], tip[1] - .04, .07, .08, 8)), { wash: c.nail, ink: c.skinDk, sw: .22, n: 2, j: 0 });
    K.line(tf([[x - .06, .92 + l * .5], [x + .06, .92 + l * .5]]), .22, c.skinDk, { raw: true }); });
}
// The hospital wristband (barcode marks) around a wrist at `at`, perpendicular to the forearm angle.
function himBand(K, c, at, ang, w) {
  const ca = Math.cos(-ang), sa = Math.sin(-ang), tf = P => P.map(([x, y]) => [at[0] + x * ca - y * sa, at[1] + x * sa + y * ca]);
  K.shape(tf([[-w / 2, -.2], [0, -.23], [w / 2, -.2], [w / 2 + .04, .2], [0, .24], [-w / 2 - .04, .2]]), { wash: c.band, ink: c.ink, sw: .45, n: 2 });
  K.shape(tf([[w * .1, -.2], [w / 2, -.2], [w / 2 + .04, .2], [w * .1, .22]]), { wash: c.bandSh, op: 200, ink: null, n: 1 });
  const n = K.det2 ? 13 : 6;
  for (let i = 0; i < n; i++) { const x = -w * .32 + i * w * .48 / n + (hash(i * 3.7) - .5) * .02; K.line(tf([[x, -.11], [x, .11]]), hash(i * 1.9) > .6 ? .32 : .2, c.code, { raw: true, j: 0 }); }
  if (K.det2) { K.line(tf([[w * .2, -.08], [w * .42, -.08]]), .22, c.inkSoft, { raw: true, j: 0 }); K.line(tf([[w * .2, .04], [w * .36, .04]]), .22, c.inkSoft, { raw: true, j: 0 }); }
}
// One arm: sleeve (or the home shirt's rolled sleeve and a bare forearm), cuff, hand, wristband.
// a = { S, E, W, outfit, hand, thumb (±1), band, far (shadowed, behind the body) }
// Arm profiles: [t along the segment, outer half-width, inner half-width] — 'up' from the shoulder joint to the elbow,
// 'fore' from the elbow to the wrist. Deltoid cap → widest at mid upper arm (bicep/tricep) → narrow elbow →
// forearm swelling just below the elbow → narrow wrist.
const HIM_ARM = {   // v7: lean arms in a slightly loose sleeve — a gentle, nearly straight taper
  jacket: { up: [[-.14, .3, .12], [0, .92, .55], [.14, .98, .7], [.35, .95, .82], [.6, .9, .82], [.85, .84, .78], [1, .82, .76]],
            fore: [[.12, .82, .78], [.35, .8, .76], [.6, .76, .73], [.85, .73, .71], [1, .72, .7]] },
  far:    { up: [[-.14, .28, .12], [0, .88, .52], [.14, .94, .67], [.35, .91, .79], [.6, .86, .79], [.85, .8, .75], [1, .78, .73]],
            fore: [[.12, .78, .75], [.35, .76, .73], [.6, .73, .7], [.85, .7, .68], [1, .69, .67]] },
  shirt:  { up: [[-.14, .3, .12], [0, .9, .55], [.14, .95, .68], [.35, .9, .8], [.6, .86, .8], [.85, .82, .78], [1, .8, .76]], fore: [[.08, .8, .78]] },
  skin:   { fore: [[0, .62, .64], [.15, .66, .68], [.4, .6, .62], [.65, .53, .55], [.85, .5, .5], [1, .56, .56]] }
};
function himArmProf(S, E, Wr, prof, outer) {
  const P = [], Wd = [], d1 = himDir(S, E), d2 = himDir(E, Wr);
  const add = (p, o, i) => { P.push(p); Wd.push(outer < 0 ? [o, i] : [i, o]); };
  for (const [t, o, i] of prof.up || []) add(himAt(S, E, t), o, i);
  for (const [t, o, i] of prof.fore || []) add(himAt(E, Wr, t), o, i);
  const wAt = (rows, t) => { let k = 0; while (k < rows.length - 2 && rows[k + 1][0] < t) k++; const [ta, oa, ia] = rows[k], [tb, ob, ib] = rows[Math.min(k + 1, rows.length - 1)], f = tb > ta ? clamp((t - ta) / (tb - ta)) : 0; return [lerp(oa, ob, f), lerp(ia, ib, f)]; };
  // a point at t on 'up' or 'fore', k in -1..1 across the arm (-1 = screen-left edge for a hanging arm, +1 = right)
  const pt = (seg, t, k) => { const rows = prof[seg], [o, i] = wAt(rows, t), [wl, wr] = outer < 0 ? [o, i] : [i, o], base = seg === 'up' ? himAt(S, E, t) : himAt(E, Wr, t), d = seg === 'up' ? d1 : d2;
    return himOff(base, d, -k * (k < 0 ? wl : wr)); };
  return { P, Wd, tb: himTube(P, Wd), pt, nUp: (prof.up || []).length };
}
// One arm: sleeve (or the home shirt's rolled sleeve and a bare forearm), cuff, hand, wristband.
// a = { S, E, W, outfit, hand, thumb (±1), band, far (shadowed, behind the body), outer (-1: the outer side is screen
// left for a hanging arm, +1: right) }
function himArm(K, c, a) {
  const { S, E, W: Wr, outfit } = a, d2 = himDir(E, Wr), ang = Math.atan2(d2[0], d2[1]), far = a.far, outer = a.outer || -1, si = -outer;
  const sh = far ? c.shirtSh : c.shirt, sk = far ? c.skinSh : c.skin;
  const fold = (pts, w = .26, col = c.jacketDk) => K.line(pts, w, col, { n: 3 });
  if (outfit === 'home') {
    const fa = himArmProf(S, E, Wr, HIM_ARM.skin, outer);
    K.shape(fa.tb.outline, { wash: sk, ink: null, n: 3 });
    K.shape(himTube(fa.P, fa.Wd.map(([l, r]) => [-.1, r])).outline, { wash: c.skinSh, op: 190, ink: null, n: 3 });
    K.line(fa.tb.L, .6); K.line(fa.tb.R, .6);
    if (K.det) fold([fa.pt('fore', .1, si * .8), fa.pt('fore', .3, si * .55)], .2, c.skinDk);
    const sl = himArmProf(S, E, Wr, HIM_ARM.shirt, outer), n = sl.nUp;
    K.shape(sl.tb.outline, { wash: sh, ink: null, n: 3 });
    K.shape(himTube(sl.P, sl.Wd.map(([l, r]) => [-.1, r])).outline, { wash: c.shirtSh, op: 170, ink: null, n: 3 });
    K.line(sl.tb.L.slice(1, n), .7); K.line(sl.tb.R.slice(1, n), .7);
    if (K.det) {
      fold([sl.pt('up', .04, -.95), sl.pt('up', -.03, 0), sl.pt('up', .04, .95)], .25, c.shirtSh);   // sleeve-head seam
      fold([sl.pt('up', .2, si * .9), sl.pt('up', .38, si * .4)], .24, c.shirtSh);   // soft drape from the armpit
      fold([sl.pt('up', .55, -si * .85), sl.pt('up', .72, -si * .35)], .22, c.shirtSh);
    }
    // the roll above the elbow
    const r0 = himAt(E, Wr, -.03), r1 = himAt(E, Wr, .15);
    K.shape([himOff(r0, d2, .94), himOff(r1, d2, .9), himOff(r1, d2, -.9), himOff(r0, d2, -.94)], { wash: sh, sw: .5, n: 2 });
    K.line([himOff(himAt(E, Wr, .06), d2, .86), himOff(himAt(E, Wr, .07), d2, -.86)], .25, c.shirtSh);
  } else {
    const sl = himArmProf(S, E, Wr, far ? HIM_ARM.far : HIM_ARM.jacket, outer), n = sl.nUp, pt = sl.pt;
    K.shape(sl.tb.outline, { wash: far ? c.jacketSh : c.jacket, ink: null, n: 3, wc: far ? false : 1 });
    // shading: the right half of the arm (light from the upper left), deeper under the deltoid and inside the elbow
    K.shape(himTube(sl.P, sl.Wd.map(([l, r]) => [-.12, r])).outline, { wash: far ? c.jacketDk : c.jacketSh, ink: null, n: 3, wc: far ? false : 1.1, ring: !far });
    if (!far) K.shape([pt('up', .02, -.72), pt('up', .55, -.82), pt('fore', .1, -.8), pt('up', .55, -.55), pt('up', .06, -.42)], { wash: c.jacketHi, op: 90, ink: null, n: 3 });   // soft light down the sleeve
    if (K.det && far) { fold([pt('up', .07, -.95), pt('up', -.02, 0), pt('up', .07, .95)], .24, c.ink);   // sleeve-head seam
      K.shape([pt('up', -.06, -.4), pt('up', .04, -.8), pt('up', .16, -.75), pt('up', .08, -.45)], { wash: c.jacket, op: 150, ink: null, n: 3 }); }
    if (K.det && !far) {
      fold([pt('up', .04, -.95), pt('up', -.04, 0), pt('up', .04, .95)], .26);   // sleeve-head seam
      fold([pt('up', .22, si * .9), pt('up', .4, si * .45)], .22);   // the loose sleeve hangs in soft folds
      fold([pt('up', .84, si * .92), pt('up', .95, si * .35)], .24);   // bunching inside the elbow
      fold([pt('fore', .04, si * .9), pt('fore', .12, si * .4)], .22);
      fold([pt('up', .92, -si * .9), pt('fore', .06, -si * .45)], .22);   // the bend
      fold([pt('fore', .3, -si * .3), pt('fore', .55, -si * .1)], .2);
      fold([pt('up', .06, -.78), pt('up', .45, -.82), pt('up', .82, -.78)], .26, c.jacketEdge);   // lit edge
      fold([pt('fore', .86, -.9), pt('fore', .9, 0), pt('fore', .86, .9)], .25);   // cuff seam
    }
    // a.soft: the arm's inner contour lies against the chest (3/4 far arm) — a thin dark fold instead of a full ink line
    if (a.soft) { const IN = outer > 0 ? sl.tb.L : sl.tb.R.slice().reverse(), OUT = outer > 0 ? sl.tb.R : sl.tb.L;
      K.line(IN.slice(2), .3, c.jacketDk, { n: 4 }); K.line(OUT, .85); }
    else if (a.cap) {   // front / 3/4: the outer contour runs on over the sleeve head, continuing the shoulder line
      const OUT = outer < 0 ? sl.tb.L : sl.tb.R, IN = outer < 0 ? sl.tb.R.slice(0, -2) : sl.tb.L.slice(2);
      K.line(OUT, .8); K.line(IN, .78);
    } else { K.line(sl.tb.L.slice(1), .78); K.line(sl.tb.R.slice(0, -1), .78); }
    const r0 = himAt(E, Wr, .95), r1 = himAt(E, Wr, 1.06);
    K.shape([himOff(r0, d2, .66), himOff(r1, d2, .6), himOff(r1, d2, -.6), himOff(r0, d2, -.66)], { wash: sh, sw: .4, n: 2 });
  }
  const hw = himAt(E, Wr, outfit === 'home' ? 1.0 : 1.07);
  himHand(K, c, a.hand || 'relax', hw, ang, a.thumb || 1, sk);
  if (a.band) himBand(K, c, himAt(E, Wr, outfit === 'home' ? .93 : 1.13), ang, outfit === 'home' ? 1.12 : 1.18);
}
// Trouser legs from profile tables like the arms: [t, outer half-width, inner half-width] along thigh ('up') and shin
// ('fore'). Quads widest just below the hip, a taper into the knee, the calf, a narrow ankle; the hem breaks on the shoe.
// Leg lengths: thigh 6.8u, shin 6.6u (hips 14.25u above the soles when standing straight).
const HIM_LEG = {   // v7: slim straight trousers
  front: { up: [[0, 1.58, 1.4], [.22, 1.56, 1.46], [.5, 1.44, 1.34], [.78, 1.28, 1.16], [1, 1.18, 1.08]],
           fore: [[.08, 1.14, 1.04], [.35, 1.12, 1.02], [.65, 1.06, .97], [.9, 1.04, .96], [1, 1.07, .98]] },
  side:  { up: [[0, 1.82, 1.58], [.2, 1.76, 1.66], [.45, 1.6, 1.58], [.75, 1.32, 1.3], [.92, 1.18, 1.2], [1, 1.14, 1.18]],
           fore: [[.08, 1.16, 1.06], [.3, 1.34, 1.04], [.55, 1.18, .96], [.8, 1.02, .9], [.92, 1.02, .9], [1, 1.06, .94]] }
};
const HIM_THIGH = 7.45, HIM_SHIN = 7.25;
// Two-bone IK: the knee for a hip H and ankle A (bend = ±1 picks the side the knee goes).
function himIK(H, A, L1, L2, bend) {
  const dx = A[0] - H[0], dy = A[1] - H[1], d = Math.hypot(dx, dy) || 1;
  if (d >= L1 + L2 - 1e-6) return [H[0] + dx * L1 / d, H[1] + dy * L1 / d];
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  return [H[0] + dx * a / d + bend * h * -dy / d, H[1] + dy * a / d + bend * h * dx / d];
}
function himLeg(K, c, H, N, A, prof, o = {}) {
  const outer = o.outer || -1, si = -outer, L = himArmProf(H, N, A, prof, outer), n = L.nUp, pt = L.pt, fold = (P, w, col) => K.line(P, w, col, { n: 3 });
  const hv = o.hem || 'front', d2 = himDir(N, A);
  // the hem resting on the shoe: in front it rides up over the instep, in profile it drops toward the heel
  const dn = (p, k) => [p[0] + d2[0] * k, p[1] + d2[1] * k];
  const hem = hv === 'front' ? [pt('fore', .9, -1), dn(pt('fore', 1, -1.02), .16), dn(pt('fore', 1, -.45), .12), dn(pt('fore', 1, 0), .02), dn(pt('fore', 1, .45), .12), dn(pt('fore', 1, 1.02), .16), pt('fore', .9, 1)]
    : [pt('fore', .9, -1), dn(pt('fore', 1, -1.04), .26), dn(pt('fore', 1, -.3), .16), dn(pt('fore', 1, .4), .04), dn(pt('fore', 1, 1.0), -.04), pt('fore', .9, 1)];
  K.shape(L.tb.outline, { wash: o.far ? c.pantsSh : c.pants, ink: null, n: 3 });
  K.shape(hem, { wash: o.far ? c.pantsSh : c.pants, ink: null, n: 3 });
  if (!o.far) {
    K.shape(himTube(L.P, L.Wd.map(([l, r]) => [-.15, r])).outline, { wash: c.pantsSh, ink: null, n: 3, wc: 1, ring: true });
    if (K.det) {
      fold([pt('up', .3, -.35), pt('up', .6, -.25), pt('fore', .1, -.2), pt('fore', .86, -.15)], .26, c.pantsHi);   // pressed crease, catching the light
      fold([pt('up', .28, -.9), pt('up', .55, -.86)], .25, c.pantsHi);   // lit edge of the thigh
      // folds read on dark cloth as a dark crease with a light ridge beside it
      const fl = (P, w = .26) => { fold(P, w, c.ink); fold(P.map(q => [q[0], q[1] - .1]), w * .8, c.pantsHi); };
      fl([pt('up', .82, si * .9), pt('up', .95, si * .3), pt('fore', .06, si * .6)]);   // behind the knee
      fl([pt('up', .9, -si * .85), pt('fore', .05, -si * .4)], .24);
      // the break: the cloth folds where the hem lands on the shoe
      fl([pt('fore', .76, -1), pt('fore', .83, -.35), pt('fore', .8, .2)], .3);
      fl([pt('fore', .86, -.15), pt('fore', .91, .45), pt('fore', .88, 1)], .28);
      fl([pt('fore', .68, .4), pt('fore', .75, .95)], .24);
    }
  }
  const RR = L.tb.R.slice().reverse(), hv2 = o.heavy ?? 1;   // (himTube's R runs ankle → hip)
  K.line(L.tb.L.slice(0, n), .72 * hv2, c.ink, { n: 3 }); K.line(RR.slice(0, n), .72 / hv2, c.ink, { n: 3 });
  K.line(L.tb.L.slice(n - 1, -1).concat([hem[1]]), .68 * hv2, c.ink, { n: 3 }); K.line(RR.slice(n - 1, -1).concat([hem[hem.length - 2]]), .68 / hv2, c.ink, { n: 3 });
  K.line(hem.slice(1, -1), .45, c.ink, { n: 3 });
  return L;
}
// Dark leather dress shoes (with the suit): a rounded toe box with a shine, a toe-cap seam, the laces under the
// trouser hem, a slim dark sole and a low heel.
function himDressShoe(K, c, P, view, far) {
  const lea = far ? mixCol(c.leather, c.leatherDk, .45) : c.leather, hi = c.leatherHi;
  if (view === 'front') {   // toe toward the viewer (P has already turned it out a little); we see the top of the toe box
    K.shape(P([[-1.1, .45], [-1.02, .82], [-.6, 1.0], [.6, 1.0], [1.02, .82], [1.1, .45]]), { wash: c.leatherSole, sw: .45, n: 3 });   // the sole's edge
    const up = [[-.76, -.4], [.76, -.4], [.96, -.02], [1.1, .4], [1.06, .7], [.82, .86], [0, .91], [-.82, .86], [-1.06, .7], [-1.1, .4], [-.96, -.02]];
    K.shape(P(up), { wash: lea, sw: .62, n: 4 });
    K.shape(P([[.5, -.32], [.96, -.02], [1.1, .4], [1.06, .7], [.82, .86], [.52, .66], [.6, .25]]), { wash: c.leatherDk, op: 160, ink: null, n: 3 });   // the shaded side
    K.shape(P([[-.4, -.4], [.4, -.4], [.36, .08], [0, .14], [-.36, .08]]), { wash: c.leatherDk, op: 170, ink: null, n: 2 });   // the throat, laces
    K.line(P([[-.96, .26], [-.5, .42], [.5, .42], [.96, .26]]), .24, c.leatherDk, { n: 3 });   // toe cap seam
    K.shape(P([[-.82, .56], [-.5, .5], [-.05, .52], [.2, .6], [-.2, .68], [-.66, .68]]), { wash: hi, op: 210, ink: null, n: 3 });   // the shine on the toe
    if (K.det) K.shape(P([[-.56, .55], [-.3, .53], [-.34, .6], [-.58, .61]]), { wash: c.leatherShine, op: 230, ink: null, n: 2 });
    K.line(P([[-1.0, .12], [-.9, -.16]]), .24, hi, { n: 2 });
  } else if (view === 'q') {   // 3/4: the toe toward screen right and the viewer, foreshortened; we see the top of the vamp
    K.shape(P([[-.86, .7], [-.3, .82], [1.0, .86], [2.0, .8], [2.42, .62], [2.42, .8], [2.05, 1.0], [-.3, 1.0], [-.86, .95, 1]]), { wash: c.leatherSole, sw: .42, n: 3 });
    const up = [[-.82, -.34], [.1, -.36], [.75, -.22], [1.35, -.04], [1.9, .14], [2.3, .34], [2.48, .58], [2.4, .8], [2.08, .9], [1.0, .9], [-.3, .86], [-.86, .8], [-.92, .35]];
    K.shape(P(up), { wash: lea, sw: .62, n: 4 });
    K.shape(P([[-.86, .45], [.4, .6], [1.6, .72], [2.4, .7], [2.08, .9], [1.0, .9], [-.3, .86], [-.86, .8]]), { wash: c.leatherDk, op: 150, ink: null, n: 3 });   // the shaded side
    K.line(P([[.0, -.28], [.6, -.12], [1.15, .08]]), .26, c.leatherDk, { n: 3 });   // the throat and laces
    if (K.det) for (let i = 0; i < 3; i++) K.line(P([[.16 + i * .3, -.22 + i * .08], [.3 + i * .3, -.06 + i * .08]]), .2, hi, { raw: true });
    K.line(P([[1.55, .02], [1.78, .4], [1.7, .82]]), .22, c.leatherDk, { n: 2 });   // toe cap
    K.shape(P([[1.85, .2], [2.3, .38], [2.38, .52], [1.9, .38]]), { wash: hi, op: 210, ink: null, n: 3 });   // the shine on the toe
    if (K.det) K.shape(P([[2.02, .3], [2.2, .38], [2.18, .43], [2.0, .36]]), { wash: c.leatherShine, op: 220, ink: null, n: 2 });
    K.shape(P([[-.78, -.16], [-.62, -.18], [-.64, .4], [-.8, .4]]), { wash: hi, op: 110, ink: null, n: 2 });   // the heel counter
  } else {   // profile: heel counter, a long sloping vamp, a rounded toe that lifts a little
    K.shape(P([[-1.0, .74], [3.05, .74], [3.12, .82], [2.88, .93, 1], [-.3, .93, 1], [-.32, 1.0], [-1.0, 1.0, 1]]), { wash: c.leatherSole, sw: .38, n: 3 });   // sole and heel
    const up = [[-.95, -.32], [.1, -.3], [.75, -.1], [1.45, .1], [2.2, .3], [2.85, .46], [3.14, .62], [3.08, .76], [2.8, .8], [-1.02, .8], [-1.06, .3]];
    K.shape(P(up), { wash: lea, sw: .6, n: 4 });
    K.shape(P([[-1.02, .5], [2.9, .62], [3.08, .76], [2.8, .8], [-1.02, .8]]), { wash: c.leatherDk, op: 140, ink: null, n: 3 });   // shade along the welt
    K.line(P([[.0, -.24], [.6, -.04], [1.2, .16]]), .26, c.leatherDk, { n: 3 });   // the throat and laces
    if (K.det) for (let i = 0; i < 3; i++) K.line(P([[.18 + i * .3, -.18 + i * .08], [.32 + i * .3, -.03 + i * .08]]), .2, hi, { raw: true });
    K.line(P([[2.0, .28], [2.3, .55], [2.2, .78]]), .22, c.leatherDk, { n: 2 });   // toe cap
    K.shape(P([[2.35, .38], [2.95, .52], [2.86, .6], [2.3, .48]]), { wash: hi, op: 210, ink: null, n: 3 });   // the shine on the toe
    if (K.det) K.shape(P([[2.5, .43], [2.72, .48], [2.7, .53], [2.48, .48]]), { wash: c.leatherShine, op: 220, ink: null, n: 2 });
    K.shape(P([[-.9, -.1], [-.7, -.12], [-.72, .4], [-.92, .4]]), { wash: hi, op: 120, ink: null, n: 2 });   // and on the heel counter
  }
}
// Shoes: 'front' (toe toward the viewer; turn ±1 turns the toe out to screen left / right), 'side' (toe toward +x) or
// 'q' (3/4). lift: the heel raised (a relaxed foot), rotating the shoe about its toe. Sneakers with the home outfit.
function himShoe(K, c, A, view, far, outfit = 'home', turn = 0, lift = 0) {
  const [x, y] = A, ks = view === 'front' ? 1 : 1.2, la = view === 'front' ? 0 : -lift * .35, toe = [view === 'q' ? 2.3 : outfit === 'launch' ? 3.0 : 2.75, .95];   // ks: sneakers lengthened in side views
  const P = pts => pts.map(([a, b, k]) => {
    if (view === 'front') { a *= 1.0; b = b * 1.06 - .04; return [x + a + turn * .3 * clamp((b + .38) / 1.3) * (1 - .15 * a * turn), y + b, k]; }   // a touch larger; shear: the toe turns out
    if (view === 'q') { a *= 1.08; b = b * 1.06 - .04; }
    const dx = a - toe[0], dy = b - toe[1], ca = Math.cos(la), sa = Math.sin(la);
    return [x + toe[0] + dx * ca - dy * sa, y + toe[1] + dx * sa + dy * ca, k];
  });
  if (outfit === 'launch') return himDressShoe(K, c, P, view, far);
  const body = far ? c.shoeSh : c.shoe, Ps = view === 'front' ? P : pts => P(pts.map(([a, b, k]) => [a < 0 ? a * 1.1 : a * ks, b, k]));
  if (view === 'front') {   // toe toward the viewer: a rounded toe box over a thick sole, laces up the tongue
    K.shape(P([[-.72, -.42], [.72, -.42], [1.02, -.05], [1.22, .42], [1.25, .76], [-1.25, .76], [-1.22, .42], [-1.02, -.05]]), { wash: body, sw: .6, n: 4 });
    K.shape(P([[-1.28, .62], [1.28, .62], [1.3, .98, 1], [-1.3, .98, 1]]), { wash: c.sole, sw: .4, n: 2 });
    K.shape(P([[.55, -.38], [1.02, -.05], [1.22, .42], [1.25, .7], [.7, .7], [.75, .2]]), { wash: c.shoeSh, op: 150, ink: null, n: 3 });   // the shaded side
    K.shape(P([[-.42, -.42], [.42, -.42], [.38, .18], [-.38, .18]]), { wash: c.shoeSh, op: 120, ink: null, n: 2 });
    for (let i = 0; i < 3; i++) K.line(P([[-.34, -.3 + i * .16], [.34, -.24 + i * .16]]), .25, c.shoeSh, { raw: true });
    K.line(P([[-1.0, .3], [-.4, .48], [.4, .48], [1.0, .3]]), .25, c.shoeSh, { n: 3 });   // toe cap
    if (K.det) K.line(P([[-.85, .1], [-.55, -.05]]), .3, c.white, { n: 2 });
  } else {
    const k = view === 'q' ? .72 : 1;   // side: heel counter, a curved vamp and a toe that lifts a little
    K.shape(Ps([[-.82, -.32], [.15, -.3], [.8 * k, -.05], [1.55 * k, .2], [2.12 * k, .42], [2.32 * k, .66], [2.2 * k, .82], [-1.0, .82], [-1.08, .3]]), { wash: body, sw: .6, n: 4 });
    K.shape(Ps([[-1.08, .64], [2.26 * k, .64], [2.18 * k, .97, 1], [-.98, .97, 1]]), { wash: c.sole, sw: .4, n: 2 });
    K.line(Ps([[.0, -.22], [.55 * k, .02], [1.05 * k, .22]]), .3, c.shoeSh, { n: 3 });
    for (let i = 0; i < 3; i++) K.line(Ps([[(.15 + i * .3) * k, -.18 + i * .1], [(.3 + i * .3) * k, -.02 + i * .1]]), .24, c.shoeSh, { raw: true });
    K.line(Ps([[1.55 * k, .3], [1.85 * k, .58], [1.7 * k, .64]]), .24, c.shoeSh, { n: 2 });
    if (K.det) K.line(Ps([[1.0 * k, .1], [1.6 * k, .32]]), .3, c.white, { n: 2 });
  }
}

// A stitch line: short dashes along P offset by `off` (to the left of the path direction).
function himStitch(K, c, P, off = .14, col = null) {
  if (!K.det2) return;
  const Q = himS(P, false, 3), D = [];
  for (let i = 0; i < Q.length; i++) { const d = himDir(Q[Math.max(0, i - 1)], Q[Math.min(Q.length - 1, i + 1)]); D.push(himOff(Q[i], d, off)); }
  let acc = 0, on = true, run = [D[0]];
  for (let i = 1; i < D.length; i++) {
    acc += Math.hypot(D[i][0] - D[i - 1][0], D[i][1] - D[i - 1][1]); if (on) run.push(D[i]);
    if (acc > (on ? .2 : .12)) { if (on && run.length > 1) K.line(run, .22, col || c.stitch, { raw: true, j: 0 }); on = !on; acc = 0; run = [D[i]]; }
  }
}
// A button with a highlight.
function himButton(K, c, x, y, r = .17, col = null) {
  K.shape(ellPts(x, y, r, r, 12), { wash: col || c.jacketDk, ink: c.ink, sw: .3, raw: true, j: 0 });
  if (K.det) { K.line([[x - r * .55, y - r * .1], [x - r * .2, y - r * .55]], .25, c.jacketEdge, { raw: true, j: 0 });
    if (K.det2) for (const [dx, dy] of [[-.25, -.25], [.25, .25]]) K.shape(ellPts(x + dx * r, y + dy * r, r * .12, r * .12, 6), { wash: c.ink, ink: null, raw: true, j: 0 }); }
}

// ---------- torsos ----------
// Torso-local units: origin = hip centre, y up is negative. Each view gives: neck pivot (for the head), the head origin
// relative to the pivot, shoulder and hip joints. The torso functions draw neck, shirt and jacket (no arms).
const HIM_HS = .92;   // head size relative to the body unit (v7: slim build, ~7 heads with the hair, was 1.24)
const HIM_TRAP = .1, HIM_NECKDN = .3;   // HIM_NECKDN: how far the head sits lower than in v5 (a shorter neck)
const HIM_RIG = {
  front: { neck: [0, -12.2 + HIM_NECKDN], head: [0, -1.5], sh: { R: [-3.15, -8.5], L: [3.15, -8.5] }, hip: { R: [-1.42, 0], L: [1.42, 0] } },
  q:     { neck: [.1, -12.2 + HIM_NECKDN], head: [.2, -1.45], sh: { R: [-2.15, -8.75], L: [2.7, -9.0] }, hip: { R: [-1.0, 0], L: [1.15, 0] } },
  side:  { neck: [.1, -12.15 + HIM_NECKDN], head: [.12, -1.4], sh: { R: [.1, -8.45], L: [-.3, -8.45] }, hip: { R: [.12, 0], L: [-.12, 0] } }
};
// The build (v7: slim). Torso shapes are authored in a wide base frame; x is scaled about a centre line by a factor that
// varies with height (HIM_SLIM: average shoulders, a lean chest, a gently suppressed waist, slim hips).
const HIM_SLIM = {
  front: { cx: 0, s: [[-12, .86], [-10, .84], [-9.3, .82], [-8.5, .77], [-7.4, .71], [-5.2, .69], [-2.4, .79], [0, .74], [2.2, .74]] },
  q:     { cx: .6, s: [[-12, .85], [-10, .82], [-9, .78], [-8, .72], [-6.5, .68], [-5, .7], [-2.4, .8], [0, .75], [2.2, .75]] },
  side:  { cx: .3, s: [[-12, .85], [-10, .8], [-8.5, .73], [-7, .7], [-5.4, .71], [-3, .8], [-1, .82], [1, .8], [2.2, .8]] }
};
function himSlim(y, view) {
  const S = (HIM_SLIM[view] || HIM_SLIM.front).s;
  if (y <= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (y <= S[i][0]) return lerp(S[i - 1][1], S[i][1], (y - S[i - 1][0]) / (S[i][0] - S[i - 1][0]));
  return S[S.length - 1][1];
}
// the collar line is raised a little near the neck (HIM_TRAP, fading out toward the shoulder tips and below the
// collarbones) so the head sits on the shoulders; trap = false for the neck itself.
function himBreath(o, view = 'front', trap = true) {
  const br = o.breath || 0, cx = (HIM_SLIM[view] || HIM_SLIM.front).cx;
  return pts => pts.map(([x, y, k]) => {
    if (trap) y -= HIM_TRAP * clamp((-y - 8.6) / 2.4) * clamp(1 - (Math.abs(x - cx) - 1.1) / 3.8);
    return [cx + (x - cx) * himSlim(y, view) * (1 + br * .015 * clamp(-y / 10)), y * (1 + br * .012), k];
  });
}
// the neck: slender (x narrowed about its centre) and short (everything above its base follows the lowered head)
const HIM_NECKW = { front: [0, .72], q: [-.08, .74], side: [-.15, .82] };
const himNeckY = (P, view) => { const [nc, k] = HIM_NECKW[view]; return pts => P(pts.map(([x, y, kk]) => [nc + (x - nc) * k, y < -10.6 ? -10.6 + (y + 10.6) * (1 - HIM_NECKDN / 3.1) : y, kk])); };
function himNeck(K, c, P, view) {
  P = himNeckY(pts => pts, view);
  if (view === 'front') {
    // a cylinder flaring into the trapezius; the jaw's shadow, the sternocleidomastoids, the Adam's apple
    K.shape(P([[-1.32, -13.7], [1.32, -13.7], [1.36, -12.4], [1.5, -11.6], [1.9, -11.0], [2.5, -10.6], [-2.5, -10.6], [-1.9, -11.0], [-1.5, -11.6], [-1.36, -12.4]]), { wash: c.skin, ink: null, n: 3 });
    K.shape(P([[.8, -12.6], [1.36, -12.4], [1.5, -11.6], [1.9, -11.0], [1.45, -10.85], [1.08, -11.7]]), { wash: c.skinSh, op: 130, ink: null, n: 3 });
    K.shape(P([[-1.34, -13.45], [1.34, -13.45], [1.36, -12.7], [.6, -12.25], [0, -12.15], [-.6, -12.25], [-1.36, -12.7]]), { wash: c.skinSh, op: 210, ink: null, n: 3, wc: .6, gran: false });
    K.line(P([[-1.33, -13.5], [-1.38, -12.3], [-1.52, -11.5], [-1.95, -10.95], [-2.55, -10.6]]), .6); K.line(P([[1.33, -13.5], [1.38, -12.3], [1.52, -11.5], [1.95, -10.95], [2.55, -10.6]]), .78);
    K.line(P([[-1.2, -12.95], [-.72, -11.75], [-.26, -10.8]]), .3, c.skinDk, { n: 3 }); K.line(P([[1.2, -12.95], [.72, -11.75], [.26, -10.8]]), .3, c.skinDk, { n: 3 });
    if (K.det) { K.shape(P([[.72, -12.6], [1.15, -12.5], [.72, -11.4], [.34, -10.9], [.48, -11.6]]), { wash: c.skinSh, op: 90, ink: null, n: 3 });
      K.line(P([[-.13, -11.78], [0, -11.92], [.13, -11.78]]), .25, c.skinDk, { n: 3 }); }
  } else if (view === 'q') {
    K.shape(P([[-1.4, -13.7], [1.25, -13.7], [1.3, -12.3], [1.5, -11.4], [1.95, -10.75], [-1.95, -10.75], [-1.65, -11.4], [-1.48, -12.3]]), { wash: c.skin, ink: null, n: 3 });
    K.shape(P([[-1.3, -13.4], [1.1, -13.4], [1.14, -12.6], [.4, -12.25], [-.6, -12.4], [-1.32, -12.7]]), { wash: c.skinSh, op: 210, ink: null, n: 3, wc: .6, gran: false });
    K.shape(P([[.55, -12.4], [1.16, -12.3], [1.38, -11.4], [1.95, -10.75], [1.2, -10.8], [.75, -11.6]]), { wash: c.skinSh, op: 120, ink: null, n: 3 });
    K.line(P([[-1.4, -13.4], [-1.48, -12.3], [-1.68, -11.4], [-2.0, -10.75]]), .6); K.line(P([[1.25, -13.3], [1.3, -12.3], [1.52, -11.4], [2.08, -10.75]]), .78);
    K.line(P([[-1.0, -13.0], [-.35, -11.8], [.35, -10.8]]), .3, c.skinDk, { n: 3 }); K.line(P([[1.0, -12.9], [.85, -11.8], [.7, -10.85]]), .26, c.skinDk, { n: 3 });
    if (K.det) K.line(P([[.12, -11.8], [.24, -11.95], [.34, -11.8]]), .25, c.skinDk, { n: 3 });
  } else {
    K.shape(P([[-1.0, -13.6], [.75, -13.3], [.95, -11.9], [1.4, -10.2], [-1.5, -10.4], [-1.4, -12.2]]), { wash: c.skin, ink: null, n: 3 });
    K.shape(P([[-1.0, -13.3], [.75, -13.0], [.85, -12.3], [0, -11.9], [-1.4, -12.1]]), { wash: c.skinSh, op: 210, ink: null, n: 3, wc: .6, gran: false });
    K.line(P([[.78, -13.1], [.95, -11.9], [1.42, -10.25]]), .7); K.line(P([[-1.05, -13.2], [-1.4, -12.0], [-1.55, -10.5]]), .6);
    K.line(P([[.85, -12.4], [.15, -10.6]]), .25, c.skinDk);
  }
}
function himTorsoFront(K, c, o, outfit) {
  const P = himBreath(o);
  const Pn = pts => pts.map(([x, y, k]) => [x, y, k]);   // the neck isn't widened by the build
  if (outfit === 'launch') K.shape(P([[-1.38, -11.0], [-1.3, -11.6], [0, -11.8], [1.3, -11.6], [1.38, -11.0]]), { wash: c.jacketDk, sw: .45, n: 3 });   // back collar, standing behind the neck
  himNeck(K, c, Pn, 'front');
  // shirt
  K.shape(P([[-1.2, -10.4], [1.2, -10.4], [2.2, -10.1], [3.2, -8.0], [2.9, -4.0], [2.7, -.4], [-2.7, -.4], [-2.9, -4.0], [-3.2, -8.0], [-2.2, -10.1]]), { wash: c.shirt, ink: null, n: 3 });
  // open neck: a V of skin with a hint of collarbones
  const vd = outfit === 'home' ? -8.2 : -8.75;
  K.shape(P([[-1.15, -10.5], [1.15, -10.5], [.5, -9.5], [0, vd], [-.5, -9.5]]), { wash: c.skin, ink: null, n: 3 });
  K.shape(P([[-1.05, -10.45], [1.05, -10.45], [.7, -10.15], [-.7, -10.15]]), { wash: c.skinSh, op: 90, ink: null, n: 3 });
  K.line(P([[-.9, -10.0], [-.42, -9.85], [-.12, -9.62]]), .25, c.skinDk); K.line(P([[.9, -10.0], [.42, -9.85], [.12, -9.62]]), .25, c.skinDk);
  K.line(P([[0, -9.2], [0, vd + .1]]), .2, c.skinDk);
  K.line(P([[-1.0, -10.7], [-.5, -9.5], [0, vd], [.5, -9.5], [1.0, -10.7]]), .4, c.ink, { n: 3 });
  if (K.det) { K.line(P([[-.95, -8.4], [-.4, -7.6], [-.15, -6.4]]), .25, c.shirtSh, { n: 3 }); K.line(P([[.9, -8.0], [.45, -7.0]]), .25, c.shirtSh, { n: 2 });
    K.shape(P([[.55, -9.4], [1.05, -8.8], [.9, -6.0], [.45, -4.5], [.35, -7.0]]), { wash: c.shirtSh, op: 120, ink: null, n: 3 }); }
  if (outfit === 'home') {
    // rumpled white shirt, a little loose: soft drape folds; untucked, two buttons open
    const body = [[-1.08, -10.45], [-1.32, -11.3], [-2.08, -10.8], [-2.91, -10.15], [-3.83, -9.35], [-4.6, -8.45], [-4.8, -7.0], [-4.4, -5.2], [-3.45, -2.6], [-3.82, 0], [-3.95, 1.55, 1], [-1.4, 1.8], [.6, 1.55], [2.2, 1.85], [3.95, 1.55, 1], [3.82, 0], [3.45, -2.6], [4.4, -5.2], [4.8, -7.0], [4.6, -8.45], [3.83, -9.35], [2.91, -10.15], [2.08, -10.8], [1.32, -11.3], [1.08, -10.45]];
    K.shape(P(body), { wash: c.shirt, ink: null, n: 4 });
    K.shape(P([[1.0, -10.55], [.5, -9.4], [0, -8.2], [-.5, -9.4], [-1.0, -10.55]].concat([[-1.0, -10.55]])), { wash: c.skin, ink: null, n: 3 });
    K.shape(P([[3.0, -9.7], [3.9, -9.2], [4.6, -8.3], [4.6, -6.6], [4.1, -5.0], [3.45, -2.6], [3.74, 0], [3.86, 1.5], [3.0, 1.65], [2.95, -.5], [2.85, -2.6], [3.5, -5.0], [3.6, -7.0], [3.4, -8.8]]), { wash: c.shirtSh, op: 190, ink: null, n: 3, hatch: { d: 6, a: .9, b: 'HB', c: c.shirtSh, w: .4 } });
    for (const [a, b, m] of [[[-3.0, -8.4], [-2.6, -5.6], .15], [[3.1, -8.0], [2.8, -5.4], -.15], [[-2.2, -3.6], [-1.6, -.4], .12], [[2.4, -3.2], [2.0, -.2], -.12], [[-1.6, .4], [-.8, 1.4], 0], [[1.4, .3], [2.0, 1.5], 0]])
      K.line(P([a, himAt(a, b, .5).map((v, i) => v + (i ? m : 0)), b]), .3, c.shirtSh, { n: 3 });
    // collar points standing up, rumpled
    for (const s of [-1, 1]) {
      K.shape(P([[1.0, -11.23], [1.85, -11.03], [2.35, -9.28, 1], [1.4, -9.78], [.95, -10.53]].map(([x, y, k]) => [s * x, y, k])), { wash: c.shirt, sw: .5, n: 3 });
      K.line(P([[1.15 * s, -10.78], [1.5 * s, -10.03]]), .22, c.shirtSh);
    }
    // placket with the buttons, then the silhouette
    K.line(P([[.05, -8.2], [.12, -5.0], [-.02, -2.0], [.1, 1.5]]), .32, c.shirtSh, { n: 3 });
    for (const y of [-6.6, -4.4, -2.2, 0]) K.shape(ellPts(.18, y, .1, .1, 8), { wash: c.shirtSh, ink: null, raw: true, j: 0 });
    K.line(P(body.slice(0, 11)), .75, c.ink, { n: 4 }); K.line(P(body.slice(10, 15)), .55, c.ink, { n: 4 }); K.line(P(body.slice(14)), .9, c.ink, { n: 4 });
    return;
  }
  // belt in the cutaway below the button
  K.shape(P([[-2.2, -.6], [2.2, -.6], [2.2, 0], [-2.2, 0]]), { wash: c.belt, sw: .4, n: 2 });
  K.shape(P([[-.24, -.6], [.24, -.6], [.24, 0], [-.24, 0]]), { wash: c.name === 'swapped' ? c.belt : c.buckle, sw: .35, n: 2 });
  K.line(P([[-.02, 0], [0, 1.9]]), .3, c.pantsSh);
  // blazer front panels; the screen-right panel holds the button
  for (const s of [-1, 1]) {
    const pan = [[1.08, -10.45], [1.32, -11.35], [2.08, -10.82], [2.91, -10.15], [3.83, -9.35], [4.55, -8.55], [4.85, -7.4], [4.6, -6.5], [4.45, -5.2], [3.45, -2.4], [4.0, 0], [4.1, 1.95, 1], [2.3, 2.12], [1.2, 2.0, 1], [.55, -.9], [-.1 * s, -3.4, 1], [.45, -6.0], [.95, -9.1]].map(([x, y, k]) => [s * x, y, k]);
    K.shape(P(pan), { wash: c.jacket, ink: null, n: 4, wc: 1 });
    if (s > 0) K.shape(P([[3.2, -10.0], [3.83, -9.35], [4.55, -8.55], [4.85, -7.4], [4.6, -6.5], [4.45, -5.2], [3.45, -2.4], [3.92, 0], [4.0, 1.95], [3.3, 2.05], [3.2, -.2], [2.95, -2.6], [3.55, -5.2], [3.7, -7.4], [3.6, -8.9]]), { wash: c.jacketSh, ink: null, n: 3, wc: 1.2, ring: true });
    else K.shape(P([[-4.45, -5.2], [-3.45, -2.4], [-3.92, 0], [-4.0, 1.95], [-3.5, 2.05], [-3.2, -2.4], [-3.9, -5.0]]), { wash: c.jacketSh, ink: null, n: 3, wc: 1, ring: true });
    K.shape(P([[1.5, -11.0], [2.4, -10.55], [3.6, -9.5], [3.1, -9.35], [2.2, -10.0]].map(([x, y]) => [s * x, y])), { wash: c.jacketHi, op: s < 0 ? 220 : 120, ink: null, n: 3 });
    // one real watercolour fill per figure, on an interior chest mass (it never reaches the silhouette, so its bleed stays inside)
    if (s > 0 && HIM_WCFILL && K.det && c.name !== 'swapped') K.shape(P([[2.7, -8.5], [3.85, -8.1], [4.15, -6.6], [3.7, -5.4], [2.7, -4.8], [2.2, -6.2]]), { fill: c.jacketDk, fillOp: 80, bleed: .015, tex: .7, ink: null, n: 4 });
    if (s < 0) K.shape(P([[-2.0, -8.0], [-3.1, -8.5], [-4.0, -8.0], [-3.4, -7.4], [-2.4, -7.3]]), { wash: c.jacketHi, op: 70, ink: null, n: 3 });
    // a loose fit: one soft pull from the button, the cloth hanging in long gentle folds
    K.line(P([[.35 * s, -3.55], [1.3 * s, -4.15], [2.3 * s, -4.5]]), .24, c.jacketDk, { n: 3 });
    if (K.det) {
      K.shape(P([[.4, -3.7], [1.3, -4.25], [2.3, -4.6], [1.4, -4.05]].map(([x, y]) => [s * x, y])), { wash: c.jacketSh, op: 90, ink: null, n: 3 });
      K.line(P([[3.6 * s, -7.8], [3.75 * s, -5.9], [3.5 * s, -4.0]]), .22, c.jacketDk, { n: 3 });   // drape at the side
      K.line(P([[.6 * s, -2.9], [1.1 * s, -1.6], [1.25 * s, -.4]]), .2, c.jacketDk, { n: 3 });
      K.line(P([[2.3 * s, -10.55], [3.1 * s, -10.0], [3.75 * s, -9.35]]), .26, c.jacketDk, { n: 3 });   // shoulder seam
      if (s < 0) K.line(P([[-2.2, -10.55], [-3.5, -9.5], [-4.3, -8.5], [-4.55, -7.4]]), .3, c.jacketEdge, { n: 3 });   // lit edge
      K.line(P([[3.5 * s, -2.2], [3.78 * s, -.2], [3.85 * s, 1.6]]), .25, s < 0 ? c.jacketEdge : c.jacketDk, { n: 3 });
    }
    // hip pocket flap with its shadow
    K.shape(P([[2.0 * s, -.5], [3.5 * s, -.62], [3.55 * s, .2], [2.05 * s, .3]]), { wash: c.jacket, ink: c.ink, sw: .35, n: 2 });
    K.line(P([[2.1 * s, .38], [3.45 * s, .28]]), .3, c.jacketDk, { n: 2 });
    K.line(P(pan.slice(1, 11)), s > 0 ? 1.0 : .85, c.ink, { n: 4 });
    K.line(P(pan.slice(10, 15)), .6, c.ink, { n: 4 });
  }
  // colour bleeding: a little of the blazer's blue creeps onto the shirt along the lapel roll lines
  if (K.det) for (const s of [-1, 1]) K.shape(P([[.95 * s, -9.4], [.55 * s, -6.2], [.12 * s, -3.6], [.32 * s, -3.8], [.85 * s, -6.2], [1.15 * s, -9.2]]), { wash: c.jacketHi, op: 45, ink: null, n: 3 });
  // notched lapels, with the shirt collar lying open over them
  for (const s of [-1, 1]) {
    const lap = [[1.12, -10.55], [1.36, -11.2], [1.92, -10.72], [2.2, -10.15], [2.32, -8.75, 1], [2.08, -8.5, 1], [2.95, -8.25, 1], [2.98, -7.3], [2.45, -6.0], [.75, -4.2], [.1 * s, -3.45, 1], [.5, -6.0], [.9, -9.0]].map(([x, y, k]) => [s * x, y, k]);
    K.shape(P(lap), { wash: s > 0 ? c.jacketSh : c.jacket, sw: .55, n: 3 });
    K.line(P([[2.4 * s, -6.1], [.75 * s, -4.3], [.12 * s, -3.5]]), .3, c.jacketDk);
    if (K.det) K.line(P([[2.85 * s, -8.15], [2.86 * s, -7.3], [2.35 * s, -6.05], [.8 * s, -4.35]]), .28, s < 0 ? c.jacketEdge : c.jacketHi, { n: 3 });   // lapel edge catching the light
    himStitch(K, c, P([[2.8 * s, -8.1], [2.82 * s, -7.3], [2.3 * s, -6.05], [.75 * s, -4.4]]), -.14 * s);
    // the shirt collar, with its shadow on the lapel
    K.shape(P([[1.0, -10.88], [1.48, -10.68], [1.7, -9.48], [1.3, -9.88]].map(([x, y, k]) => [s * x, y, k])), { wash: c.jacketDk, op: 140, ink: null, n: 3 });
    K.shape(P([[.98, -11.03], [1.42, -10.83], [1.6, -9.66, 1], [1.2, -10.13], [.96, -10.58]].map(([x, y, k]) => [s * x, y, k])), { wash: c.shirt, sw: .45, n: 3 });
    if (K.det) K.line(P([[1.05 * s, -10.78], [1.3 * s, -10.28], [1.48 * s, -9.88]]), .25, c.shirtSh, { n: 3 });
  }
  K.shape(P([[3.25, -5.75], [4.35, -5.88], [4.35, -5.62], [3.25, -5.5]]), { wash: c.jacketSh, ink: c.ink, sw: .3, n: 1 });   // breast pocket welt
  himButton(K, c, .1 * .9, -3.45, .18); himButton(K, c, .1 * .9, -1.6, .16);
}
// 3/4 torso facing screen right: the near side (his right) is screen left, the chest centre line is at x ≈ 1.3.
function himTorsoQ(K, c, o, outfit, farArm) {
  const P = himBreath(o, 'q');
  if (outfit === 'launch') K.shape(P([[-1.55, -10.9], [-1.5, -11.5], [-.4, -11.75], [.9, -11.6], [.95, -11.0]]), { wash: c.jacketSh, sw: .45, n: 3 });   // the back of the collar, standing up behind the neck
  himNeck(K, c, pts => pts.map(([x, y, k]) => [x, y, k]), 'q');
  K.shape(P([[-1.0, -10.2], [1.3, -10.2], [2.3, -10.0], [2.9, -8.0], [2.7, -4.0], [2.6, -.4], [-2.6, -.4], [-2.8, -4.0], [-3.0, -8.0], [-2.0, -10.0]]), { wash: c.shirt, ink: null, n: 3 });
  const vd = outfit === 'home' ? -8.2 : -8.75;
  K.shape(P([[-.15, -10.8], [1.6, -10.8], [1.2, -9.5], [.95, vd], [.45, -9.5]]), { wash: c.skin, ink: null, n: 3 });
  K.line(P([[.0, -10.0], [.45, -9.8], [.8, -9.6]]), .25, c.skinDk);
  K.line(P([[-.05, -10.75], [.45, -9.5], [.95, vd], [1.2, -9.5], [1.55, -10.75]]), .4, c.ink, { n: 3 });
  if (outfit === 'home') {
    const body = [[-.05, -10.5], [-.85, -11.25], [-1.8, -10.72], [-2.85, -9.95], [-3.4, -9.3], [-3.95, -8.4], [-4.0, -6.8], [-3.85, -5.0], [-3.2, -2.6], [-3.9, 0], [-4.02, 1.55, 1], [-1.0, 1.8], [1.0, 1.55], [3.35, 1.65, 1], [3.25, 0], [2.95, -2.5], [3.3, -4.4], [3.62, -6.2], [3.55, -8.0], [3.15, -9.65], [2.6, -10.55], [1.95, -11.15], [1.6, -10.5]];
    K.shape(P(body), { wash: c.shirt, ink: null, n: 4 });
    K.shape(P([[-.05, -10.6], [1.55, -10.6], [1.2, -9.4], [.95, -8.2], [.45, -9.4]]), { wash: c.skin, ink: null, n: 3 });
    K.shape(P([[1.8, -8.6], [3.3, -8.6], [3.62, -6.2], [3.3, -4.4], [2.95, -2.5], [3.25, 0], [3.35, 1.65], [2.5, 1.6], [2.4, -1.0], [2.3, -2.8], [2.9, -5.0], [2.6, -7.0]]), { wash: c.shirtSh, op: 190, ink: null, n: 3, hatch: { d: 6, a: .9, b: 'HB', c: c.shirtSh, w: .4 } });
    for (const [a, b, m] of [[[-2.9, -8.2], [-2.5, -5.4], .15], [[-2.0, -3.4], [-1.5, -.3], .12], [[2.5, -6.8], [2.3, -4.4], -.1], [[-1.2, .4], [-.5, 1.4], 0], [[1.6, .3], [2.2, 1.4], 0]])
      K.line(P([a, himAt(a, b, .5).map((v, i) => v + (i ? m : 0)), b]), .3, c.shirtSh, { n: 3 });
    K.line(P(body.slice(13)), .9, c.ink, { n: 4 });
    if (farArm) { const cut = K.cut; farArm(); K.cut = cut; }   // the far arm over the far side, under the collar
    K.shape(P([[-.1, -11.23], [-.95, -11.03], [-1.45, -9.28, 1], [-.5, -9.78], [-.05, -10.53]]), { wash: c.shirt, sw: .5, n: 3 });
    K.shape(P([[1.55, -11.23], [2.15, -10.98], [2.4, -9.48, 1], [1.8, -9.78], [1.5, -10.53]]), { wash: c.shirtSh, sw: .45, n: 3 });
    K.line(P([[1.0, -8.2], [1.25, -5.0], [1.15, -2.0], [1.3, 1.5]]), .32, c.shirtSh, { n: 3 });
    for (const y of [-6.6, -4.4, -2.2, 0]) K.shape(ellPts(1.35, y, .09, .1, 8), { wash: c.shirtSh, ink: null, raw: true, j: 0 });
    K.line(P(body.slice(0, 11)), .8, c.ink, { n: 4 }); K.line(P(body.slice(10, 14)), .55, c.ink, { n: 4 });
    return;
  }
  K.shape(P([[-1.0, -.6], [2.9, -.6], [2.9, 0], [-1.0, 0]]), { wash: c.belt, sw: .4, n: 2 });
  K.shape(P([[1.1, -.6], [1.55, -.6], [1.55, 0], [1.1, 0]]), { wash: c.name === 'swapped' ? c.belt : c.buckle, sw: .35, n: 2 });
  // far panel (his left), then the near panel over it
  const far = [[1.6, -10.5], [1.95, -11.15], [2.6, -10.55], [3.15, -9.65], [3.55, -8.3], [3.55, -6.2], [3.15, -4.3], [2.85, -2.4], [3.3, 0], [3.35, 1.88, 1], [1.95, 2.02], [1.55, 1.9, 1], [1.4, -1.0], [1.3, -3.4, 1], [1.25, -6.0], [1.45, -9.0]];
  K.shape(P(far), { wash: c.jacket, ink: null, n: 4, wc: 1 });
  K.shape(P([[2.6, -9.0], [3.4, -9.35], [3.62, -8.4], [3.55, -6.2], [3.15, -4.3], [2.85, -2.4], [3.1, 0], [3.1, 1.88], [2.5, 1.95], [2.4, -1.0], [2.35, -2.6], [2.8, -4.4], [3.0, -6.4], [2.9, -8.0]]), { wash: c.jacketSh, ink: null, n: 3, wc: 1.2, ring: true });
  K.line(P(far.slice(2, 11)), 1.0, c.ink, { n: 4 }); K.line(P(far.slice(10, 13)), .55, c.ink, { n: 3 });
  if (K.det) K.line(P([[2.05, -10.95], [2.6, -10.45], [3.0, -9.95]]), .26, c.jacketDk, { n: 3 });   // far shoulder seam, running on into the sleeve head
  if (farArm) { const cut = K.cut; farArm(); K.cut = cut; }
  const near = [[.05, -10.45], [-.85, -11.25], [-1.8, -10.72], [-2.85, -9.95], [-3.75, -8.5], [-4.0, -7.3], [-3.85, -6.5], [-3.75, -5.0], [-3.1, -2.4], [-3.88, 0], [-3.98, 1.95, 1], [.3, 2.1], [1.0, 2.0, 1], [1.12, -1.0], [1.4, -3.4, 1], [.85, -6.0], [.3, -9.0]];
  K.shape(P(near), { wash: c.jacket, ink: null, n: 4, wc: 1 });
  K.shape(P([[-1.0, -10.95], [-1.9, -10.55], [-2.7, -9.85], [-2.25, -9.7], [-1.3, -10.2]]), { wash: c.jacketHi, op: 220, ink: null, n: 3 });
  K.shape(P([[.95, -6.0], [1.4, -3.4], [1.12, -1.0], [1.0, 2.0], [.4, 2.0], [.5, -1.2], [.4, -3.4]]), { wash: c.jacketSh, op: 180, ink: null, n: 3 });
  if (HIM_WCFILL && K.det && c.name !== 'swapped') K.shape(P([[-1.2, -8.4], [-2.6, -8.0], [-3.2, -6.5], [-2.6, -5.4], [-1.2, -5.0], [-.8, -6.6]]), { fill: c.jacketSh, fillOp: 70, bleed: .015, tex: .7, ink: null, n: 4 });
  K.line(P([[1.2, -3.6], [.1, -4.25], [-1.4, -4.7]]), .24, c.jacketDk, { n: 3 }); K.line(P([[1.5, -3.6], [2.2, -4.1]]), .22, c.jacketDk, { n: 3 });   // a soft pull from the button
  if (K.det) { K.shape(P([[1.1, -3.75], [.1, -4.35], [-1.4, -4.85], [-.1, -4.15]]), { wash: c.jacketSh, op: 90, ink: null, n: 3 });
    K.line(P([[-3.3, -7.6], [-3.5, -5.8], [-3.2, -4.0]]), .22, c.jacketDk, { n: 3 }); K.line(P([[.4, -2.9], [.6, -1.6], [.7, -.4]]), .2, c.jacketDk, { n: 3 }); }
  K.shape(P([[-.25, -.5], [-2.2, -.62], [-2.18, .2], [-.3, .3]]), { wash: c.jacket, ink: c.ink, sw: .35, n: 2 });
  K.line(P([[-.35, .38], [-2.1, .28]]), .3, c.jacketDk, { n: 2 });
  if (K.det) { K.line(P([[-1.9, -10.6], [-2.8, -9.95], [-3.35, -9.3]]), .26, c.jacketDk, { n: 3 });
    K.line(P([[-1.6, -10.55], [-2.8, -9.85], [-3.5, -8.95], [-3.8, -7.4]]), .3, c.jacketEdge, { n: 3 }); K.line(P([[-2.9, -2.2], [-3.1, -.2], [-3.15, 1.6]]), .25, c.jacketEdge, { n: 3 }); }
  K.line(P(near.slice(1, 11)), .85, c.ink, { n: 4 }); K.line(P(near.slice(10, 15)), .6, c.ink, { n: 4 });
  // lapels: near one wide, far one narrow
  K.shape(P([[1.6, -10.5], [2.05, -10.55], [2.22, -10.1], [2.3, -8.8, 1], [2.12, -8.6, 1], [2.55, -8.4, 1], [2.25, -6.3], [1.5, -4.2], [1.32, -3.45, 1], [1.25, -6.0], [1.45, -9.0]]), { wash: c.jacketSh, sw: .5, n: 3 });
  K.shape(P([[.05, -10.5], [-.75, -11.15], [-1.05, -10.4], [-1.12, -8.8, 1], [-.9, -8.55, 1], [-1.8, -8.35, 1], [-1.85, -7.3], [-1.3, -6.1], [.75, -4.3], [1.38, -3.45, 1], [.85, -6.0], [.3, -9.0]]), { wash: c.jacket, sw: .55, n: 3 });
  K.line(P([[-1.05, -6.4], [.75, -4.4], [1.32, -3.5]]), .3, c.jacketDk);
  if (K.det) K.line(P([[-1.65, -8.25], [-1.05, -6.35], [.75, -4.45]]), .28, c.jacketEdge, { n: 3 });
  himStitch(K, c, P([[-1.6, -8.2], [-1.0, -6.4], [.75, -4.5]]), .14);
  K.shape(P([[-.05, -11.08], [-.7, -10.78], [-.95, -9.48], [-.35, -9.83]]), { wash: c.jacketDk, op: 140, ink: null, n: 3 });
  K.shape(P([[-.05, -11.13], [-.55, -10.88], [-.68, -9.83, 1], [-.32, -10.13], [.0, -10.58]]), { wash: c.shirt, sw: .45, n: 3 });
  K.shape(P([[1.55, -11.13], [1.88, -10.9], [1.96, -9.88, 1], [1.72, -10.08], [1.52, -10.58]]), { wash: c.shirtSh, sw: .4, n: 3 });
  himButton(K, c, 1.32 * .9, -3.45, .17); himButton(K, c, 1.38 * .9, -1.6, .15);
}
// Profile torso facing screen right.
function himTorsoSide(K, c, o, outfit) {
  const P = himBreath(o, 'side');
  himNeck(K, c, himBreath(o, 'side', false), 'side');
  K.shape(P([[1.2, -10.7], [1.65, -10.3], [2.0, -9.0], [1.5, -8.6]]), { wash: c.skin, ink: null, n: 3 });
  if (outfit === 'home') {
    const body = [[1.35, -10.55], [.4, -10.95], [-1.0, -11.0], [-1.85, -10.4], [-2.45, -9.2], [-2.7, -7.4], [-2.5, -5.4], [-2.0, -3.2], [-2.25, -1.0], [-2.65, .5], [-2.75, 1.6, 1], [2.45, 1.58, 1], [2.45, .3], [2.2, -2.2], [2.55, -3.8], [3.0, -5.8], [2.95, -7.6], [2.45, -9.2], [1.85, -10.0]];
    K.shape(P(body), { wash: c.shirt, ink: null, n: 4 });
    K.shape(P([[-2.0, -10.2], [-2.45, -9.2], [-2.7, -7.4], [-2.5, -5.4], [-2.0, -3.2], [-2.25, -1.0], [-2.62, .5], [-2.72, 1.6], [-1.75, 1.6], [-1.55, -1.0], [-1.3, -3.2], [-1.8, -5.4], [-2.0, -7.6], [-1.6, -9.6]]), { wash: c.shirtSh, op: 190, ink: null, n: 3, hatch: { d: 6, a: .9, b: 'HB', c: c.shirtSh, w: .4 } });
    K.shape(P([[1.95, -9.0], [3.0, -5.8], [2.55, -3.8], [2.4, -4.9], [2.6, -6.4]]), { wash: c.shirtSh, op: 130, ink: null, n: 3 });
    for (const [a, b, m] of [[[2.6, -7.4], [.4, -6.2], -.2], [[2.2, -3.0], [.2, -2.4], .2], [[-1.8, -6.4], [-.4, -5.0], .2], [[2.0, -.8], [.6, -.4], .1], [[-1.8, .2], [-1.2, 1.4], 0], [[1.1, .3], [1.5, 1.4], 0]])
      K.line(P([a, himAt(a, b, .5).map((v, i) => v + (i ? m : 0)), b]), .3, c.shirtSh, { n: 3 });
    K.shape(P([[1.1, -11.28], [1.7, -10.88], [2.25, -9.23, 1], [1.6, -9.58], [1.05, -10.58]]), { wash: c.shirt, sw: .5, n: 3 });
    K.shape(P([[-.9, -11.53], [.6, -11.43], [.9, -10.88], [-1.0, -11.03]]), { wash: c.shirt, sw: .45, n: 3 });
    K.line(P(body.slice(0, 11)), .85, c.ink, { n: 4 }); K.line(P(body.slice(10, 12)), .55, c.ink, { n: 2 }); K.line(P(body.slice(11).concat([body[0]])), .9, c.ink, { n: 4 });
    return;
  }
  const jk = [[1.35, -10.45], [.4, -11.15], [-1.0, -11.3], [-1.9, -10.7], [-2.6, -9.3], [-2.8, -7.6], [-2.5, -5.6], [-2.0, -3.4], [-2.25, -1.0], [-2.68, .6], [-2.72, 1.98, 1], [2.38, 1.9, 1], [2.48, .4], [2.35, -2.2], [2.75, -3.6], [3.35, -5.4], [3.4, -7.0], [3.0, -8.7], [2.2, -9.9]];
  K.shape(P(jk), { wash: c.jacket, ink: null, n: 4, wc: 1 });
  K.shape(P([[-1.9, -10.3], [-2.4, -9.3], [-2.65, -7.5], [-2.45, -5.5], [-1.95, -3.2], [-2.2, -1.0], [-2.62, .6], [-2.66, 1.95], [-1.7, 1.95], [-1.45, -1.0], [-1.2, -3.2], [-1.7, -5.5], [-1.9, -7.6], [-1.5, -9.6]]), { wash: c.jacketSh, ink: null, n: 3, wc: 1.2, ring: true });
  K.shape(P([[-.8, -10.8], [.6, -10.7], [1.4, -10.2], [.6, -9.9], [-.6, -10.2]]), { wash: c.jacketHi, op: 200, ink: null, n: 3 });
  K.line(P([[2.4, -3.5], [1.0, -3.15]]), .24, c.jacketDk, { n: 3 }); K.line(P([[.2, -7.6], [.45, -5.6], [.3, -4.0]]), .22, c.jacketDk, { n: 3 });
  K.line(P([[-1.95, -.3], [-2.3, 1.9]]), .3, c.jacketDk);   // back vent
  K.line(P([[1.9, -.35], [.2, -.45]]), .32, c.jacketDk);    // pocket flap
  // collar and lapel along the chest front
  K.shape(P([[1.05, -11.28], [1.7, -10.88], [2.15, -9.43, 1], [1.6, -9.68], [1.0, -10.58]]), { wash: c.shirt, sw: .45, n: 3 });
  K.shape(P([[1.35, -10.45], [2.05, -10.0], [2.6, -8.9, 1], [2.4, -8.62, 1], [3.0, -8.4, 1], [3.3, -6.6], [2.72, -3.6, 1], [2.55, -6.0], [1.9, -8.8]]), { wash: c.jacketSh, sw: .5, n: 3 });
  K.line(P(jk.slice(1, 11)), .85, c.ink, { n: 4 }); K.line(P(jk.slice(10, 12)), .55, c.ink, { n: 2 }); K.line(P(jk.slice(11).concat([jk[0]])), 1.0, c.ink, { n: 4 });
  himButton(K, c, 2.2, -3.55, .15);
  if (K.det) { K.line(P([[-1.0, -10.9], [-2.0, -10.2], [-2.6, -8.8], [-2.72, -7.2]]), .3, c.jacketEdge, { n: 3 }); K.line(P([[2.9, -8.2], [3.25, -6.6], [2.75, -3.8]]), .28, c.jacketEdge, { n: 3 }); }
  himStitch(K, c, P([[2.95, -8.2], [3.2, -6.6], [2.7, -3.9]]), .14);
}

// ---------- the character ----------
// him(x, y, u, o): u is the size unit. Standing he is ~33u tall (soles to the top of the hair), the head 4.4u × HIM_HS,
// the shoulders ~13u wide. Medium shot u ≈ 14–20, close-up 40–80 (use pose 'bust'). Standing poses use contrapposto
// (weight on his right leg) unless o.contra = 0.
// Anchors: stand = the ground point between the feet; bust = the notch between the collarbones; desk = the floor point
// under the front edge of the chair seat (the chair is drawn too, unless chair: false).
// Options: view front|q|side, flip, pose stand|bust|desk, outfit launch|home, pal human|drained|swapped,
//   face (usually from himFeel / himEmotions): eye (normal|happy|squeeze), lid, low, browIn, browOut, browY, irisK, dull,
//         mouth (closed|A|I|U|E|O|smile|grin|frown|flat|tight|gasp|laugh|wail), blush, circles, gloom, glare, tears,
//         sweat, lookX, lookY, blink (auto when omitted), squint, seed
//   body: dx, dy (in u; -dy = up), sq (squash), lean (torso, radians), tilt (head), nod (head drop, u), breath,
//         aL / aR (his left / right arm swing, radians), handL / handR (relax|type|open|fist), screen (0..1 monitor light)
//   boilKey: a stable id for its boil seeds (set it if characters come and go mid-shot).
let HIM_N = 0, HIM_WCFILL = true, HIM_PROF = {};   // HIM_WCFILL: real watercolour fill on the biggest shadow masses (see STATUS for cost)
function him(x, y, u, o = {}) {
  const id = o.boilKey ?? ('n' + (++HIM_N)), rs = part => boilSeed(`him ${id} ${part}`);
  const c = himPal(o.pal || 'human'), clean = (o.pal === 'swapped');
  const sw = clamp(.28 + u / 100, .32, 1.7) * (o.swMul || 1) * (clean ? .8 : 1);
  const K = himKit(u, c, sw, Math.max(.5, u * .012) * (clean ? .3 : 1), clean);
  const view = o.view || 'front', pose = o.pose || 'stand', outfit = o.outfit || 'launch';
  const f = himFace(o), sq = o.sq || 0;
  rs('shadow');
  if (pose === 'stand' && !o.noShadow) paint(ellPts(x + (o.dx || 0) * u, y + u * .4, u * 6.2, u * 1.0, 22), { wash: c.ink, washOp: 34, ink: null });
  push(); translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u);
  scale((o.flip ? -1 : 1) * (1 + sq * .5), 1 - sq);
  HIM_LAST = {};
  if (pose === 'desk') himDesk(K, c, f, o, outfit, u, sw, rs);
  else himStand(K, c, f, o, view, outfit, u, sw, rs, pose === 'bust');
  pop();
  // contact points in screen space (desk: where the hands meet the keyboard)
  const ax = x + (o.dx || 0) * u, ay = y + (o.dy || 0) * u, fx = (o.flip ? -1 : 1) * (1 + sq * .5);
  for (const k in HIM_LAST) HIM_LAST[k] = [ax + HIM_LAST[k][0] * fx, ay + HIM_LAST[k][1] * (1 - sq)];
  if (clean) himSwapGlow(x, y, u, pose);
  rs('after');
}
function himSwapGlow(x, y, u, pose) {
  const top = pose === 'stand' ? 27 : pose === 'desk' ? 20 : 4;
  glow(x, y - top * u, 7 * u, '#7FE9FF', .4);
}
// Automatic blinks (a pure function of t): ~every 3.7 s, close and open over 0.16 s.
function himBlink(t, seed = 0) { const p = (t * .9 + seed * 1.7) % 3.3, d = .16; return p < d ? Math.sin(p / d * Math.PI) : 0; }
function himFace(o) {
  const f = { ...o };
  const b = Math.max(o.blink ?? himBlink(T, o.seed || 0), o.squint || 0);
  f.lid = clamp(lerp(o.lid || 0, 1, b));
  return f;
}
// v7: short hair — everything above the hairline (y < -2) is pressed down toward the skull (HIM_HAIRK), so the volume
// on top is about half of what it was; the face below is untouched.
const HIM_HAIRK = .6;
function himHead(K, c, f, u, sw, view) {
  const sh = K.shape, ln = K.line, sq = P => P.map(p => p[1] < -2 ? [p[0], -2 + (p[1] + 2) * HIM_HAIRK, p[2]] : p);
  K.shape = (P, o) => sh(sq(P), o); K.line = (P, w, col, o) => ln(sq(P), w, col, o);
  try {
    if (view === 'front') himHeadFront(K, c, f, u, sw);
    else if (view === 'q') himHeadQ(K, c, f, u, sw);
    else himHeadSide(K, c, f, u, sw);
    himHeadFx(K, c, f, view);
  } finally { K.shape = sh; K.line = ln; }
}
// Tears, sweat, the monitor's light: drawn over the head in head-local units.
function himHeadFx(K, c, f, view) {
  const eyes = view === 'front' ? [[-.84, -1], [.84, 1]] : view === 'q' ? [[-.28, -1], [1.12, 1]] : [[1.0, 1]];
  if (f.tears > 0) for (const [ex, s] of eyes) {
    const R = []; for (let k = 0; k <= 5; k++) R.push([ex + s * .1 + Math.sin(T * 7 + k * 1.3 + s) * .03 * k, .22 + k * .32 * f.tears]);
    K.shape(ribbon(R, .12, .2), { wash: c.tear, op: 220, ink: c.ink, sw: .25, raw: true, j: 0 });
    const ph = frac(T * 1.4 + (s > 0 ? .4 : 0)); K.shape(ellPts(ex + s * .12, .4 + ph * 1.6 * f.tears, .07, .1, 8), { wash: c.tear, ink: c.ink, sw: .2, raw: true, j: 0 });
  }
  if (f.gloom > 0) {   // dread: a cold shade over the brow and hanging lines, over the hair
    const x0 = view === 'side' ? -.2 : view === 'q' ? -1.3 : -1.5, x1 = view === 'side' ? 1.45 : view === 'q' ? 1.5 : 1.5;
    K.shape([[x0, -2.4], [x1, -2.4], [x1, -.9], [(x0 + x1) / 2, -.6], [x0, -.9]], { wash: '#5C6AA8', op: 110 * f.gloom, ink: null, n: 3 });
    for (let i = 0; i < 6; i++) { const x = lerp(x0 + .2, x1 - .2, i / 5); K.line([[x, -2.3], [x, -2.3 + 1.5 * f.gloom * (.6 + .4 * hash(i * 3.7))]], .3, '#3E4A86', { raw: true }); }
  }
  if (f.sweat > 0) {
    const sx = view === 'side' ? -.6 : 1.55, k = f.sweat, dy = frac(T * .6) * .3;
    K.shape([[sx, -1.3 + dy, 1], [sx + .2 * k, -.9 + dy], [sx, -.72 + dy], [sx - .2 * k, -.9 + dy]], { wash: c.tear, ink: c.ink, sw: .3, n: 4 });
  }
  if (f.screen > 0) {   // cool rim of monitor light on the side that faces the screen (screen right)
    const R = view === 'side' ? [[1.4, -.7], [1.5, .2], [1.78, .72], [1.52, 1.2], [1.44, 1.95], [1.15, 2.2]] : view === 'q' ? [[1.55, -.6], [1.56, .32], [1.48, .88], [1.25, 1.42], [.88, 1.92]] : [[1.74, -.3], [1.72, .35], [1.62, .85], [1.47, 1.22], [1.0, 1.75]];
    K.line(R.map(([x, y]) => [x - .07, y]), .55 * f.screen, c.glare, { n: 3 });
  }
}

// ---------- poses ----------
// stand (and bust, which is the stand's upper body cut at the chest). Hips ≈ 14.2u above the soles.
function himStand(K, c, f, o, view, outfit, u, sw, rs, bust) {
  const R = HIM_RIG[view] || HIM_RIG.front, lean = o.lean || 0, br = o.breath || 0;
  const band = view === 'front' ? 'L' : (o.flip ? 'R' : 'L');   // the hospital band is on his left wrist
  // bust: the anchor is the collarbone notch (torso-local (0, -10.35)); everything below the chest is cut away
  const hipY = bust ? 10.35 : -14.25;
  K.cut = bust ? (-10.35 + (o.cut ?? 4.95)) * u : null;   // o.cut: how far below the collarbones the bust ends (u)
  // arm angles per view: [a1 (shoulder), a2 (elbow)] for his right (R) and left (L) arm
  const A = view === 'front' ? { R: [-.09, .1], L: [.09, -.1] } : view === 'q' ? { R: [-.04, .14], L: [.02, .16] } : { R: [.06, .16], L: [-.02, .1] };
  const arm = (side, far) => {
    rs('arm' + side);
    // reach (0..1) raises his right arm toward the facing direction (screen left in the front view) and opens the hand
    const rk = side === 'R' ? ease(o.reach || 0) : 0, rdir = view === 'front' ? -1 : 1;
    const sw2 = (side === 'L' ? (o.aL || 0) : (o.aR || 0)) + rk * 1.85 * rdir, S = R.sh[side], [a1, a2] = A[side];
    const [, E, W] = himChain(S, a1 + sw2 + (view === 'front' ? (side === 'R' ? -1 : 1) * .02 * br : 0), 4.9, lerp(a2 + sw2 * .3, -.18 * rdir, rk), 4.3);
    const hand = rk > .5 ? 'open' : (side === 'L' ? o.handL : o.handR) || 'relax';
    himArm(K, c, { S, E, W, outfit, hand, thumb: view === 'front' ? (side === 'R' ? 1 : -1) : 1, band: band === side, far, cap: view !== 'side', soft: view === 'q' && far && outfit === 'launch', outer: view === 'front' ? (side === 'R' ? -1 : 1) : view === 'q' && far ? 1 : -1 });
  };
  // legs with contrapposto: the weight on his right leg, straight and slanting in so that the foot is under his
  // centre of gravity; the hips tilt up on that side and shift over it, the shoulders counter-tilt. The left leg is
  // relaxed: its foot out to the side and a little forward (lower on screen), the heel lifted, the knee bent forward
  // (seen from the front only as a knee that drops and turns in a little). o.contra (0..1, default 1) scales it.
  const ct = bust ? 0 : (o.contra ?? 1), ht = (view === 'side' ? 0 : view === 'q' ? .04 : .045) * ct, dxh = (view === 'front' ? -.22 : view === 'q' ? -.16 : -.05) * ct;
  const legProf = view === 'side' ? HIM_LEG.side : HIM_LEG.front, foot = view === 'front' ? 'front' : view;
  const hipJ = side => { const [x, y] = R.hip[side]; return [x * Math.cos(ht) - y * Math.sin(ht), x * Math.sin(ht) + y * Math.cos(ht)]; };
  const Hw = hipJ('R'), Lsum = HIM_THIGH + HIM_SHIN;
  // feet (world x, relative to the anchor): the standing foot near the centre line, the relaxed one out to the side
  const feet = view === 'front' ? { R: lerp(-1.6, -.85, ct), L: lerp(1.6, 2.05, ct) } : view === 'q' ? { R: lerp(-1.1, -.55, ct), L: lerp(1.5, 1.95, ct) } : { R: .05, L: lerp(1.1, 1.4, ct) };
  const wx = feet.R - dxh, ankleY = Hw[1] + Math.sqrt(Lsum * Lsum * .997 - (wx - Hw[0]) ** 2);   // the standing leg sets the ground
  const legH = ankleY + .95;   // hips above the soles
  const leg = (side, far) => {
    rs('leg' + side);
    const relax = side === 'L' && ct > 0, H = hipJ(side);
    // the relaxed foot: forward (drawn lower on screen) with the heel lifted (the ankle a little higher)
    const fwd = relax ? (view === 'side' ? -.18 * ct : .28 * ct) : 0, lift = relax ? .22 * ct : 0;
    const A = [feet[side] - dxh, ankleY - lift];
    let N;
    if (view === 'side') N = himIK(H, A, HIM_THIGH, HIM_SHIN, -1);   // in profile the bent knee goes forward (+x)
    else {   // front / 3/4: the knee bends toward the camera; only a little of the bend shows, turned in toward the other leg
      const N0 = himIK(H, A, HIM_THIGH, HIM_SHIN, side === 'L' ? 1 : -1), d = himDir(H, A), pr = (N0[0] - H[0]) * d[0] + (N0[1] - H[1]) * d[1], B = [H[0] + d[0] * pr, H[1] + d[1] * pr];
      N = [B[0] + (N0[0] - B[0]) * .32, B[1] + (N0[1] - B[1]) * .32 + (relax ? .12 : 0)];
    }
    rs('shoe' + side); himShoe(K, c, [A[0], A[1] + lift + fwd + .05], foot, far, outfit, view === 'front' ? (side === 'R' ? -1 : 1) * (relax ? .9 : .45) : 0, lift);
    rs('leg' + side);   // the trousers over the shoe: the hem rests on it
    himLeg(K, c, H, N, [A[0], A[1] + fwd * .6], legProf, { far, hem: view === 'front' ? 'front' : 'side', outer: view === 'front' ? (side === 'R' ? -1 : 1) : -1, heavy: view === 'front' ? (side === 'R' ? 1.2 : .85) : 1 });
  };
  push(); translate(dxh * u, (bust ? hipY : -legH) * u);
  // legs: seat of the trousers first
  if (!bust) {
    push(); rotate(ht);
    if (view === 'front') { rs('seat'); K.shape([[-2.4, -1.0], [2.4, -1.0], [2.75, .9], [0, 2.0], [-2.75, .9]], { wash: c.pants, ink: null, n: 2 }); }
    pop();
    if (view === 'front') { leg('R', false); leg('L', false); }
    else if (view === 'q') { leg('L', true); leg('R', false); }
    else { leg('L', true); leg('R', false); }
    rotate(ht - ht * 1.6);   // the shoulders counter the hips
  }
  rotate(lean);
  if (view === 'side' && Math.abs(o.aL || 0) > .05) arm('L', true);   // in profile the far arm hides behind the body unless it swings
  rs('torso');
  // 3/4 suit: the far arm goes over the far panel's side and under the chest / lapel, so its deltoid continues the
  // shoulder line as one form
  (view === 'front' ? himTorsoFront : view === 'q' ? himTorsoQ : himTorsoSide)(K, c, o, outfit, () => arm('L', true));
  if (view === 'front') { arm('R'); arm('L'); }
  if (view === 'side') arm('R');
  // head on the neck pivot
  rs('head');
  push(); translate(R.neck[0] * u, R.neck[1] * u); rotate(o.tilt || 0); translate(R.head[0] * u * HIM_HS, (R.head[1] + (o.nod || 0)) * u * HIM_HS); scale(HIM_HS);
  const cut = K.cut; K.cut = null;
  himHead(K, c, f, u, sw / HIM_HS * 1.05, view);
  K.cut = cut;
  pop();
  if (view === 'q') arm('R');
  pop();
  K.cut = null;
}

// desk: sitting in profile (facing right; flip faces left), hands on a keyboard, lit by the monitor in front of him.
// Anchor: the floor point under the front edge of the chair seat. Seat top at y = -7.2u, hips at (-1.6, -8.5)u, the
// keyboard's top at about (7.8, -10.8)u: draw props with himDeskProps(x, y, u) at the same anchor.
// Extra options: lean (default .15), screen (monitor light 0..1, default .8), chair (false = no chair), type (0..1 finger tap).
let HIM_LAST = {};
function himDesk(K, c, f, o, outfit, u, sw, rs) {
  const lean = o.lean ?? .15, scr = o.screen ?? .8, hip = [-1.6, -8.5], tap = o.type || 0;
  f = { ...f, screen: f.screen ?? scr, glare: f.glare ?? scr * .35, lookX: f.lookX ?? .25, lookY: f.lookY ?? .15 };
  if (o.chair !== false) { rs('chair'); himChair(K, c, 'back'); }
  // far leg (his left), behind everything
  const legAt = (side, far, dx) => {
    rs('leg' + side);
    const [H, N, A] = himChain([hip[0] + dx, hip[1]], Math.PI / 2 - .05, HIM_THIGH - .1, -Math.PI / 2 + .02, 6.95);
    rs('shoe' + side); himShoe(K, c, [A[0], A[1] + .05], 'side', far, outfit);
    rs('leg' + side); himLeg(K, c, H, N, A, HIM_LEG.side, { far, hem: 'side', outer: -1 });
  };
  legAt('L', true, -.3);
  if (o.chair !== false) { rs('seat'); himChair(K, c, 'seat'); }
  push(); translate(hip[0] * u, hip[1] * u); rotate(lean);
  const arm = (side, far) => {
    rs('arm' + side);
    const S = HIM_RIG.side.sh[side], k = far ? 1 : 0, tp = tap * Math.sin(T * 18 + k * 2) * .04;
    const [, E, W] = himChain(S, lean + .52 + k * .05 + (side === 'L' ? o.aL || 0 : o.aR || 0), 4.9, .78 - k * .04 + tp, 4.3);
    himArm(K, c, { S, E, W, outfit, hand: 'type', thumb: -1, band: !o.flip ? side === 'L' : side === 'R', far });
    const ca = Math.cos(lean), sa = Math.sin(lean), at = himAt(E, W, 1.3);
    HIM_LAST['hand' + side] = [(hip[0] + at[0] * ca - at[1] * sa) * u, (hip[1] + at[0] * sa + at[1] * ca) * u];
  };
  arm('L', true);
  rs('torso'); K.cut = .9 * u; himTorsoSide(K, c, o, outfit); K.cut = null;
  pop();
  legAt('R', false, 0);
  push(); translate(hip[0] * u, hip[1] * u); rotate(lean);
  arm('R', false);
  rs('head');
  const R = HIM_RIG.side;
  push(); translate(R.neck[0] * u, R.neck[1] * u); rotate(o.tilt ?? .1); translate(R.head[0] * u * HIM_HS, (R.head[1] + (o.nod || 0)) * u * HIM_HS); scale(HIM_HS);
  himHead(K, c, f, u, sw / HIM_HS * 1.05, 'side');
  pop(); pop();
}
// An office chair in profile (facing right), around the desk anchor. part: 'back' (backrest, behind him) or 'seat'.
function himChair(K, c, part) {
  const ch = c.name === 'swapped' ? '#0E4F86' : c.name === 'drained' ? '#55525C' : '#4B4658', chl = mixCol(ch, '#FFFFFF', .18);
  if (part === 'back') {
    K.shape([[-5.4, -16.2], [-4.4, -16.4], [-4.0, -9.0], [-4.9, -8.6], [-5.3, -12]], { wash: ch, sw: .6, n: 3 });
    K.line([[-4.6, -15.6], [-4.35, -10]], .3, chl);
    K.shape([[-4.8, -8.8], [-4.3, -8.8], [-3.6, -7.0], [-4.1, -7.0]], { wash: ch, sw: .45, n: 2 });
  } else {
    K.shape([[-4.9, -7.25], [.2, -7.2], [.5, -6.75], [.1, -6.35], [-4.8, -6.4], [-5.1, -6.8]], { wash: ch, sw: .6, n: 3 });
    K.line([[-4.4, -7.05], [-.3, -7.0]], .3, chl);
    K.shape([[-2.45, -6.4], [-1.95, -6.4], [-1.95, -2.2], [-2.45, -2.2]], { wash: '#9A97A6', sw: .45, n: 1 });
    for (const [x0, x1] of [[-2.2, -5.4], [-2.2, .9], [-2.2, -2.6]]) {
      K.shape([[-2.4, -2.4], [-2.0, -2.4], [x1 + .2, -.85], [x1 - .2, -.85]].map(([x, y], i) => i < 2 ? [x, y] : [x, y]), { wash: ch, sw: .45, n: 1 });
      K.shape(ellPts(x1, -.42, .42, .42, 10), { wash: '#2E2A36', ink: c.ink, sw: .35, raw: true });
    }
  }
}
// Desk, keyboard and monitor for the desk pose, around the same anchor (call it before him() for the desk behind, or
// after for the front edge). part: 'back' (monitor + desk top) | 'front' (keyboard + desk edge). glowK = screen light.
function himDeskProps(x, y, u, o = {}) {
  const c = himPal(o.pal || 'human'), K = himKit(u, c, clamp(.28 + u / 100, .32, 1.7), Math.max(.5, u * .012), o.pal === 'swapped'), part = o.part || 'back';
  const wood = c.name === 'human' ? '#B9875A' : c.name === 'drained' ? himDrain('#B9875A') : himCyan('#B9875A'), woodDk = mixCol(wood, c.ink, .35);
  boilSeed('himdesk ' + part + (o.key || ''));
  push(); translate(x, y); if (o.flip) scale(-1, 1);
  if (part === 'back') {
    K.shape([[12.6, -17.2], [13.5, -17.4], [13.9, -11.6], [13.0, -11.5]], { wash: '#3A3646', sw: .7, n: 1 });   // monitor (seen edge-on)
    K.shape([[12.4, -12.0], [13.6, -12.0], [13.4, -10.8], [11.8, -10.75]], { wash: '#55505F', sw: .5, n: 1 });
    K.shape([[3.6, -10.75], [18, -10.75], [18, -10.05], [3.6, -10.05]], { wash: wood, sw: .7, n: 1 });
    K.shape([[15.8, -10.05], [16.6, -10.05], [16.6, -.2], [15.8, -.2]], { wash: woodDk, sw: .6, n: 1 });
    pop();
    if ((o.glowK ?? 1) > 0) glow(x + (o.flip ? -1 : 1) * 12.4 * u, y - 14.4 * u, 7 * u, '#7FE9FF', .55 * (o.glowK ?? 1));
    return;
  }
  K.shape([[6.3, -11.2], [10.2, -11.25], [10.4, -10.75], [6.1, -10.75]], { wash: '#D8D2C8', sw: .5, n: 1 });   // keyboard
  for (let i = 0; i < 5; i++) K.line([[6.7 + i * .75, -11.1], [7.1 + i * .75, -11.1]], .35, '#8A8494', { raw: true });
  pop();
}

// ---------- emotions ----------
// Each emotion is a face and a way of moving, locked to the beat. body(t) gives pose offsets for him(); take = how big
// the reaction is when he switches INTO it. Face fields cross-fade; eye/mouth/dull swap under the squint.
const himB = t => { const bp = bpOf(t), bar = bp / 4; return { bp, bar, s1: Math.sin(bp * Math.PI), s2: Math.sin(bar * TAU), ab: Math.abs(Math.sin(bp * Math.PI)), hit: pulse(t), f: frac(bp) }; };
const HIM_EMO = {
  neutral: { mouth: 'closed', take: .3, body: t => { const b = himB(t); return { breath: b.s2, dy: -.08 * b.ab, tilt: .02 * b.s2 }; } },
  focused: { lid: .22, browIn: .55, browOut: -.15, mouth: 'flat', lookX: .15, lookY: .1, take: .4,
             body: t => { const b = himB(t); return { breath: .5 * b.s2, lean: .03, nod: .04 * b.hit, tilt: .04 + .01 * b.s2 }; } },
  smile:   { low: .35, browIn: -.15, browY: -.04, mouth: 'smile', blush: .35, take: .6,
             body: t => { const b = himB(t); return { breath: b.s2, dy: -.25 * b.ab, sq: .015 * b.hit, tilt: -.04 + .03 * Math.sin(b.bar * Math.PI) }; } },
  tired:   { lid: .48, browIn: -.3, browOut: .25, circles: .9, mouth: 'flat', lookY: .35, take: .25,
             body: t => { const b = himB(t), sl = Math.sin(t * TAU * .22); return { breath: .7 * Math.sin(t * TAU * .25), nod: .1 + .06 * sl, tilt: .05 * sl, lean: .03, dy: .05 }; } },
  anxious: { browIn: -.75, browOut: .1, irisK: .82, mouth: 'tight', sweat: 1, gloom: .25, take: .6,
             body: t => { const b = himB(t); return { breath: Math.sin(t * TAU * 1.1), lookX: beatN(t) % 4 < 2 ? .7 : -.7, dx: .04 * Math.sin(t * TAU * 9), tilt: -.03 + .02 * Math.sin(t * TAU * .7) }; } },
  panic:   { browIn: -1, browY: -.12, irisK: .58, mouth: 'gasp', sweat: 1, gloom: .7, take: 1.2,
             body: t => ({ breath: Math.sin(t * TAU * 2.6), dx: .1 * Math.sin(t * TAU * 21), tilt: .025 * Math.sin(t * TAU * 13), dy: -.1 * Math.abs(Math.sin(t * TAU * 2.6)), lookX: .4 * Math.sign(Math.sin(t * 3.1)) }) },
  blank:   { lid: .3, dull: true, irisK: 1.05, mouth: 'flat', glare: .9, take: .2,
             body: t => ({ breath: .35 * Math.sin(t * TAU * .18), tilt: .015 * Math.sin(t * TAU * .1), lookX: 0, lookY: 0, blink: 0 }) },
  cry:     { browIn: -.9, lid: .35, low: .3, mouth: 'wail', tears: 1, blush: .6, take: .8,
             body: t => { const b = himB(t), sob = Math.sin(b.f * Math.PI) * Math.exp(-b.f * 2); return { breath: sob * 1.5 - .5, dy: -.18 * sob, sq: .02 * sob, nod: .12, tilt: .03 * b.s1 }; } },
  laugh:   { eye: 'happy', browY: -.1, browIn: -.2, mouth: 'laugh', blush: .55, take: .8,
             body: t => { const c = Math.abs(Math.sin(t * TAU * 4.3)); return { breath: c, dy: -.22 * c, sq: .02 * c, tilt: -.08 + .03 * Math.sin(t * TAU * 4.3), lean: -.03 }; } },
};
// One emotion, alive at time t: face fields plus body motion. Spread it into him(): him(x, y, u, himFeel('smile', t)).
function himFeel(name, t, over = {}) {
  const E = HIM_EMO[name] || HIM_EMO.neutral, { take: _t, body, ...face } = E;
  return { ...face, ...(body ? body(t) : {}), ...over };
}
// An emotion timeline with ACTED changes: keys = [[t0, 'focused'], [t1, 'smile'], [t2, 'tired', { lookX: -.5 }]].
// Before each change the eyes squint shut and the body dips (anticipation); the face swaps under the squint; then a take
// (squash, small hop) sized to the new emotion, and the body settles into its new idle with overshoot. o.take scales takes.
const HIM_NUM = ['lid', 'low', 'browIn', 'browOut', 'browY', 'irisK', 'blush', 'circles', 'gloom', 'glare', 'tears', 'sweat'];
const HIM_POSE = ['dx', 'dy', 'sq', 'lean', 'tilt', 'nod', 'breath', 'lookX', 'lookY', 'aL', 'aR'];
function himEmotions(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc, cur = himFeel(name, t, over);
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tk = o.take ?? 1, E = HIM_EMO[name] || HIM_EMO.neutral;
  let squint = cur.squint || 0;
  if (tn - t < .1) squint = Math.max(squint, 1 - (tn - t) / .1);
  if (i > 0 && age < .14) squint = Math.max(squint, 1 - age / .14);
  if (i > 0 && age < .5) {
    const prev = himFeel(keys[i - 1][1], t, keys[i - 1][2]), kb = backOut(seg(age, 0, .4)), kc = ease(seg(age, 0, .3));
    const def = { irisK: 1 };
    for (const f of HIM_POSE) cur[f] = lerp(prev[f] ?? 0, cur[f] ?? 0, kb);
    for (const f of HIM_NUM) cur[f] = lerp(prev[f] ?? def[f] ?? 0, cur[f] ?? def[f] ?? 0, kc);
  }
  const t1 = i > 0 ? take(t, tc, (E.take ?? .6) * tk) : { sq: 0, dy: 0 };
  const En = i + 1 < keys.length ? HIM_EMO[keys[i + 1][1]] || HIM_EMO.neutral : null, t2 = En ? take(t, tn, (En.take ?? .6) * tk) : { sq: 0, dy: 0 };
  cur.sq = (cur.sq || 0) + (t1.sq + t2.sq) * .35; cur.dy = (cur.dy || 0) + (t1.dy + t2.dy) * .45;
  cur.squint = squint;
  return cur;
}

// ---------- sheets ----------
function himLabel(txt, x, y, size = 22) { letter(txt, x, y, size, '#5A4650', { ink: false }); }
LOOPS.him_sheet = t => {
  HIM_N = 0;
  boilSeed('him sheet bg');
  paint(rectPts(16, 16, 888, 1048, 3), { wash: '#F6DFC0', washOp: 130, ink: null });
  paint(rectPts(916, 16, 988, 352, 3), { wash: '#EFD3B0', washOp: 110, ink: null });
  paint(rectPts(916, 380, 988, 256, 3), { wash: '#F3E2C8', washOp: 90, ink: null });
  paint(rectPts(916, 644, 988, 200, 3), { wash: '#F6DFC0', washOp: 110, ink: null });
  paint(rectPts(916, 852, 988, 212, 3), { wash: '#F3E2C8', washOp: 90, ink: null });
  // main panel: standing, launch outfit, front and 3/4
  him(250, 1046, 30, { ...himFeel('neutral', t), browIn: .3, view: 'front', boilKey: 'mf', seed: .4 });
  him(650, 1046, 30, { ...himFeel('neutral', t), browIn: .3, view: 'q', boilKey: 'mq', seed: 1.3 });
  himLabel('launch day · front', 235, 40, 21); himLabel('3/4', 665, 40, 21);
  // the face at 2×, and the band on his left wrist
  himLabel('face 2×', 1330, 36, 19);
  him(1140, 322, 43, { ...himFeel('neutral', t), browIn: .3, pose: 'bust', cut: .85, view: 'front', blink: 0, boilKey: 'f2a' });
  him(1500, 322, 43, { ...himFeel('smile', t), pose: 'bust', cut: .85, view: 'q', blink: 0, boilKey: 'f2b' });
  himLabel('left wrist', 1810, 36, 19);
  { const c = himPal('human'), u = 28, K2 = himKit(u, c, clamp(.28 + u / 100, .32, 1.7), u * .012, false);
    boilSeed('him detail arm'); push(); translate(1800, 54);
    K2.keep = p => 6 - p[1] + Math.sin(p[0] / 40) * 4;
    himArm(K2, c, { S: [-1.0, -4.0], E: [-.4, .8], W: [.75, 5.0], outfit: 'launch', hand: 'relax', thumb: 1, band: true });
    pop(); }
  // expressions
  [['focused', 'front', 'launch'], ['smile', 'q', 'launch'], ['tired', 'front', 'home'], ['panic', 'q', 'launch'], ['cry', 'q', 'home']].forEach(([e, v, out], i) => {
    const x = 1012 + i * 198;
    him(x, 540, 19, { ...himFeel(e, t), pose: 'bust', view: v, outfit: out, boilKey: 'e' + i, seed: .4 + i * .7 });
    himLabel(e, x, 396, 18);
  });
  [['anxious', 'front', 'launch', 'human'], ['blank', 'q', 'home', 'human'], ['laugh', 'q', 'launch', 'human'], ['human', 'q', 'launch', 'human'], ['drained', 'q', 'home', 'drained'], ['swapped', 'q', 'launch', 'swapped']].forEach(([e, v, out, pal], i) => {
    const x = 1000 + i * 165, emo = pal === 'swapped' ? 'blank' : pal === 'drained' ? 'tired' : e === 'human' ? 'smile' : e;
    him(x, 765, 15.5, { ...himFeel(emo, t), pose: 'bust', view: v, outfit: out, pal, boilKey: 'e2' + i, seed: 1.3 + i * .7 });
    himLabel(e, x, 660, 18);
  });
  // small figures: profile, home outfit, reaching, the desk pose
  const g = 1036, u4 = 5.8;
  [['side', 'launch', 'neutral', 975, {}], ['front', 'home', 'tired', 1090, {}], ['side', 'home', 'tired', 1200, {}], ['side', 'home', 'anxious', 1320, { reach: 1 }]].forEach(([v, out, e, x, ex], i) => {
    him(x, g, u4, { ...himFeel(e, t), view: v, outfit: out, boilKey: 'r4' + i, seed: .4 + i * .9, ...ex });
    himLabel(['side', 'home', 'home side', 'reach'][i], x, 1062, 17);
  });
  himDeskProps(1610, g, 7, { part: 'back' });
  him(1610, g, 7, { ...himFeel('focused', t), pose: 'desk', boilKey: 'desk', type: 1, seed: .5 });
  himDeskProps(1610, g, 7, { part: 'front' });
  himLabel('desk', 1640, 1062, 17);
};
LOOPS.him_sheet.len = 4;
LOOPS.him_emotions = t => {
  HIM_N = 0;
  boilSeed('him emo bg'); paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#F2DCC0', washOp: 110, ink: null });
  const keys = [[0, 'focused'], [.75, 'smile'], [1.5, 'tired'], [2.25, 'anxious'], [3.0, 'panic'], [3.75, 'blank'], [4.5, 'cry'], [5.25, 'laugh']];
  him(960, 760, 62, { ...himEmotions(t, keys), pose: 'bust', view: 'q', boilKey: 'emo' });
};
LOOPS.him_emotions.len = 6;
LOOPS.him_prof = t => { HIM_N = 0; HIM_PROF = [{}, { nohatch: 1 }, { nowc: 1 }, { nohatch: 1, nowc: 1 }][Math.round(t * 10)] || {};
  him(960, 2000, 55, { ...himFeel('neutral', 0), view: 'front', boilKey: 'vf' }); HIM_PROF = {}; };
LOOPS.him_prof.len = 1;
LOOPS.him_test = t => {
  HIM_N = 0;
  him(200, 1050, 22, { ...himFeel('neutral', 0), view: 'side', boilKey: 'a' });
  him(600, 1050, 22, { ...himFeel('tired', 0), view: 'front', outfit: 'home', boilKey: 'b' });
  him(1000, 1050, 22, { ...himFeel('tired', 0), view: 'side', outfit: 'home', boilKey: 'c' });
  him(1350, 1050, 22, { ...himFeel('anxious', 0), view: 'side', outfit: 'home', reach: 1, boilKey: 'd' });
};
LOOPS.him_test.len = 1;

LOOPS.him_hands = t => {
  const c = himPal('human'), u = 150, K = himKit(u, c, clamp(.28 + u / 100, .32, 1.7) * .7, u * .006, false);
  ['relax', 'type', 'fist', 'open', 'press'].forEach((h, i) => { boilSeed('hh' + i); push(); translate(200 + i * 380, 200); himHand(K, c, h, [0, 0], 0, 1, c.skin, 1); pop(); });
};
LOOPS.him_hands.len = 1;
LOOPS.him_hand1 = t => {
  const c = himPal('human');
  [[180, 1], [60, 1], [29, 1]].forEach(([u, k], i) => { const K = himKit(u, c, clamp(.28 + u / 100, .32, 1.7), u * .006, false);
    boilSeed('h1' + i); push(); translate([300, 900, 1300][i], 120); himHand(K, c, 'relax', [0, 0], 0, 1, c.skin); pop(); });
};
LOOPS.him_hand1.len = 1;
// one character at medium-shot size, for timing (render.mjs prints ms/frame)
LOOPS.him_perf = t => { HIM_N = 0; him(960, 1040, 30, { ...himFeel('smile', t), view: 'q', boilKey: 'perf' }); };
LOOPS.him_perf.len = 2;
LOOPS.him_perf_desk = t => { HIM_N = 0; himDeskProps(700, 1040, 40, { part: 'back' }); him(700, 1040, 40, { ...himFeel('focused', t), pose: 'desk', boilKey: 'perf', type: 1 }); himDeskProps(700, 1040, 40, { part: 'front' }); };
LOOPS.him_perf_desk.len = 2;
LOOPS.him_perf_bust = t => { HIM_N = 0; him(960, 760, 62, { ...himFeel('smile', t), pose: 'bust', view: 'q', boilKey: 'perf' }); };
LOOPS.him_perf_bust.len = 2;
LOOPS.him_perf_fill = t => { HIM_N = 0; HIM_WCFILL = false; him(960, 1040, 30, { ...himFeel('smile', t), view: 'front', boilKey: 'perf' }); HIM_WCFILL = true; };   // without the fill, for comparison
LOOPS.him_perf_fill.len = 2;
LOOPS.him_perf_front = t => { HIM_N = 0; him(960, 1040, 30, { ...himFeel('smile', t), view: 'front', boilKey: 'perf' }); };
LOOPS.him_perf_front.len = 2;
