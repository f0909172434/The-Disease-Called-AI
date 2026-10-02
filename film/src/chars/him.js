// him.js: "him", the human lead: an original young AI engineer, painted with p5.brush through paint() / inkLine().
// Global-script style (no modules). Everything here is prefixed him / HIM_ so it can share a page with ai.js.

// ---------- palettes ----------
const HIM_BASE = {
  skin: '#F5D2B3', skinSh: '#E0A688', skinDk: '#C98568', skinHi: '#FCE6D2', blush: '#EE8E7E', lip: '#C67A6C',
  hair: '#3D3748', hairSh: '#27222F', hairHi: '#77749A', white: '#FBF5EC', iris: '#5B3A2B', irisLt: '#A0704C', pupil: '#2A1B1C',
  jacket: '#2F4E98', jacketSh: '#223A74', jacketDk: '#192B58', jacketHi: '#4D6EBC',
  shirt: '#F7F2EA', shirtSh: '#CFCBD6', pants: '#3A3D50', pantsSh: '#2A2C3B', pantsHi: '#55596F',
  shoe: '#F1EADF', shoeSh: '#C2B9AB', sole: '#6A5A54', belt: '#4E3529', buckle: '#B9B2A6', sock: '#8C8999',
  glass: '#B4BAC6', glassDk: '#666C7A', band: '#FCF9F3', bandSh: '#D8D4DE', code: '#2B2233',
  ink: '#2B2233', inkSoft: '#5A4650', glare: '#7FE9FF', tear: '#BFE6F5', cheekLine: '#D9806F'
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

// Shorthands bound to one character draw: S = scaled smooth shape, L = scaled line
function himKit(u, c, swBase, J, clean) {
  const k = {};
  k.pts = (P, closed = true, n = 5, j = J) => himS(himJ(P, j / u), closed, n).map(([x, y]) => [x * u, y * u]);
  k.shape = (P, o = {}) => {
    const pts = o.raw ? himSc(himJ(P, (o.j ?? J) / u), u) : k.pts(P, true, o.n || 5, o.j ?? J);
    paint(pts, { wash: o.wash, washOp: o.op, ink: o.ink === undefined ? c.ink : o.ink, sw: (o.sw ?? 1) * swBase, br: clean ? 'inkfine' : (o.br || 'ink'), hatch: o.hatch });
    return pts;
  };
  k.line = (P, w = .5, col = c.ink, o = {}) => {
    const pts = o.raw ? himSc(himJ(P, (o.j ?? J) / u), u) : k.pts(P, false, o.n || 5, o.j ?? J);
    inkLine(pts, w * swBase, col, clean ? 'inkfine' : (o.br || 'ink'), o.curv ?? 0);
  };
  return k;
}

// ---------- face ----------
// Head-local units: origin between the eyes, x right, y down. Head from crown -2.25 to chin 2.18, half-width 1.76.
const HIM_FACE_R = [[0, -2.25], [.95, -2.12], [1.5, -1.72], [1.74, -1.02], [1.76, -.3], [1.72, .35], [1.62, .85], [1.47, 1.22, 1], [1.0, 1.75], [.45, 2.1], [.14, 2.19]];
const HIM_FACE_FRONT = HIM_FACE_R.concat(himMir(HIM_FACE_R.slice(1)).reverse());
const HIM_EYE = { cx: .84, k: 1.22 };

function himEye(K, c, f, cx, s, E = HIM_EYE.k, cmp = 1) {
  // s = +1: outer corner toward screen right, -1: toward the left. cmp < 1 foreshortens it (the far eye in 3/4).
  const X = x => cx + x * s * E * cmp, Y = y => y * E;
  let top = [[-.4, .06], [-.24, -.12], [.03, -.2], [.3, -.17], [.47, -.06]];
  let bot = [[.47, -.06], [.41, .09], [.2, .19], [-.08, .2], [-.3, .15], [-.4, .06]];
  const lid = clamp(f.lid || 0), low = clamp(f.low || 0);
  const shut = [.07, .13, .15, .11, .02];
  bot = bot.map(([x, y]) => [x, lerp(y, y - .11, low * (1 - Math.abs(x) * .8))]);
  top = top.map(([x, y], i) => [x, lerp(y, shut[i], lid)]);
  const T = top.map(([x, y]) => [X(x), Y(y)]), B = bot.map(([x, y]) => [X(x), Y(y)]);
  const w = cmp < .9 ? .85 : 1;
  if (f.eye === 'happy') {   // laughing: closed upward arcs
    K.line([[X(-.42), Y(.12)], [X(-.15), Y(-.1)], [X(.18), Y(-.13)], [X(.48), Y(.04)]], 1.4 * w, c.ink, { n: 4 });
    return;
  }
  if (f.eye === 'squeeze') {   // shut tight: a > < crease
    K.line([[X(-.42), Y(-.14)], [X(.08), Y(.02)], [X(.5), Y(.12)]], 1.4 * w, c.ink, { n: 3 });
    K.line([[X(-.28), Y(.2)], [X(.22), Y(.14)]], .6 * w, c.ink, { n: 3 });
    return;
  }
  if (lid > .86) {   // closed: one lash curve and a little flick
    K.line([[X(-.42), Y(.1)], [X(-.1), Y(.18)], [X(.22), Y(.16)], [X(.5), Y(.04)]], 1.3 * w, c.ink, { n: 4 });
    K.line([[X(.42), Y(.06)], [X(.58), Y(.16)]], .8 * w, c.ink, { raw: true });
    return;
  }
  K.shape(T.concat(B.slice(1, -1)), { wash: c.white, ink: null, j: 0, n: 3 });
  // iris, clipped between the lids
  const ik = (f.irisK ?? 1) * E, lx = (f.lookX || 0) * .15 * E * cmp, ly = (f.lookY || 0) * .07;
  const icx = X(.04) + lx, icy = Y(.03) + ly, ir = .2 * ik * (cmp < .9 ? .8 : 1);
  const asc = C => C[0][0] < C[C.length - 1][0] ? C : C.slice().reverse();
  const clip = P => himBetween(P, asc(T), asc(B));
  K.shape(clip(ellPts(icx, icy, ir, .26 * ik, 18)), { wash: c.iris, ink: null, raw: true, j: 0 });
  K.shape(clip(ellPts(icx, icy + .1 * ik, ir * .7, .13 * ik, 14)), { wash: c.irisLt, op: 210, ink: null, raw: true, j: 0 });
  if (!f.dull) K.shape(clip(ellPts(icx, icy + .01, ir * .4, .11 * ik, 12)), { wash: c.pupil, ink: null, raw: true, j: 0 });
  K.shape(T.concat(T.slice().reverse().map(([x, y]) => [x, y + .07 * E])), { wash: c.skinDk, op: 120, ink: null, raw: true, j: 0 });
  if (!f.dull) {
    K.shape(ellPts(icx - .07 * E * cmp, icy - .07 * E, .06 * E, .065 * E, 10), { wash: c.white, ink: null, raw: true, j: 0 });
    K.shape(ellPts(icx + .06 * E * cmp, icy + .1 * E, .028 * E, .028 * E, 8), { wash: c.white, ink: null, raw: true, j: 0 });
  }
  // upper lash: a thick tapered stroke heaviest at the outer corner, with a small wing
  const th = [.035, .07, .1, .13, .15];
  const lash = T.map(p => [p[0], p[1]]).concat([[X(.6), Y(.08), 1]], T.slice().reverse().map(([x, y], i) => [x, y - th[4 - i] * E]));
  K.shape(lash, { wash: c.ink, ink: null, n: 3, j: 0 });
  K.line([[X(.45), B[0][1] + .1 * E], [X(.3), B[1][1] + .05 * E], [X(.05), B[2][1] + .03 * E]], .5 * w, c.ink, { n: 3 });
  if (lid < .55) K.line([[X(-.1), T[2][1] - .15 * E], [X(.2), T[2][1] - .15 * E], [X(.46), T[4][1] - .12 * E]], .35 * w, c.inkSoft, { n: 3 });
}
function himEyeFront(K, c, f, s) { himEye(K, c, f, s * HIM_EYE.cx, s); }
function himBrowFront(K, c, f, s, X = x => s * x) {
  const bi = f.browIn || 0, bo = f.browOut || 0, by = f.browY || 0;
  const P = [[.24, -.66 + bi * .16 + by], [.75, -.8 + by + (bi + bo) * .05], [1.38, -.76 + bo * .12 + by]];
  const w = [.17, .13, .05];
  const top = P.map(([x, y], i) => [X(x), y - w[i] / 2]), bot = P.map(([x, y], i) => [X(x), y + w[i] / 2]).reverse();
  K.shape(top.concat([[X(1.46), P[2][1] + .03, 1]], bot), { wash: c.hair, ink: c.ink, sw: .3, n: 4 });
}
function himGlassesFront(K, c, f, s, sw, X = x => s * x, temple = true) {
  if (f.glare > 0) {   // the screen's light on the lenses
    K.shape([[X(.26), -.36], [X(1.42), -.36], [X(1.42), .2], [X(1.3), .38], [X(.38), .38], [X(.26), .22]], { wash: c.glare, op: 160 * f.glare, ink: null, raw: true, j: 0 });
    K.line([[X(.55), .3], [X(1.0), -.3]], 1.4 * f.glare, c.white, { raw: true });
    K.line([[X(.85), .32], [X(1.2), -.12]], .7 * f.glare, c.white, { raw: true });
  }
  // the rimless lower edge of the lens
  K.line([[X(.25), -.34], [X(.27), .2], [X(.42), .38], [X(1.28), .38], [X(1.42), .2], [X(1.44), -.34]], .3, c.glassDk, { n: 4 });
  // the top rim (half-rim frame)
  K.shape([[X(.2), -.38, 1], [X(.8), -.45], [X(1.48), -.4, 1], [X(1.48), -.31, 1], [X(.8), -.36], [X(.24), -.3, 1]], { wash: c.glass, ink: c.ink, sw: .4, n: 4 });
  if (temple) K.line([[X(1.47), -.37], [X(1.76), -.3]], .6, c.glassDk, { raw: true });
  if (!f.glare) K.line([[X(1.2), -.24], [X(1.36), -.06]], .45, c.white, { raw: true });
}
function himMouthFront(K, c, f, sw, mx = 0, mk = 1) {
  const m = f.mouth || 'closed', dark = '#5A2630', y0 = 1.42;
  const K0 = K; K = { shape: (P, o) => K0.shape(P.map(([x, y, k]) => [mx + x * mk, y, k]), o), line: (P, w, col, o) => K0.line(P.map(([x, y, k]) => [mx + x * mk, y, k]), w, col, o) };
  const open = (P, tongue = true, teeth = false) => {
    K.shape(P, { wash: dark, ink: c.ink, sw: .5, n: 4 });
    const t0 = Math.min(...P.map(p => p[1])), b = Math.max(...P.map(p => p[1])), hw = Math.max(...P.map(p => p[0])) * .6;
    if (teeth) K.shape([[-hw, t0 + .02], [hw, t0 + .02], [hw * .85, t0 + .09], [-hw * .85, t0 + .09]], { wash: c.white, ink: null, raw: true, j: 0 });
    if (tongue && b - t0 > .14) K.shape(ellPts(0, b - .06, hw * .7, .06, 10), { wash: '#D9707A', ink: null, raw: true, j: 0 });
  };
  switch (m) {
    case 'closed': K.line([[-.3, y0 - .02], [-.1, y0 + .015], [.12, y0 + .015], [.3, y0 - .03]], .6, c.ink, { n: 3 }); K.line([[-.09, y0 + .22], [.09, y0 + .22]], .4, c.skinDk, { raw: true }); break;
    case 'smile': K.line([[-.38, y0 - .1], [-.14, y0 + .04], [.14, y0 + .04], [.38, y0 - .1]], .65, c.ink, { n: 3 }); K.line([[-.08, y0 + .24], [.08, y0 + .24]], .4, c.skinDk, { raw: true }); break;
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

// The head, front view, drawn around its own origin (between the eyes).
const HIM_BANGS_FRONT = [  // [root, tip, width, bend]: uneven clumps, swept a little toward screen left
  [[-1.62, -1.95], [-1.86, .12], .62, -.16], [[-1.2, -2.25], [-1.42, -.55], .74, .12], [[-.68, -2.35], [-.84, -.38], .74, -.08],
  [[-.18, -2.4], [-.2, -.02], .66, .16], [[.34, -2.38], [.3, -.62], .7, -.12], [[.86, -2.3], [.9, -.36], .72, .1],
  [[1.32, -2.15], [1.48, -.72], .64, -.1], [[1.62, -1.9], [1.9, .1], .58, .2]];
function himHeadFront(K, c, f, u, sw) {
  // hair mass behind the head: rounded volume with a few tufts breaking the silhouette, not a crown
  const back = [[-1.96, .25, 1], [-2.06, -.7], [-2.1, -1.55], [-2.42, -2.05, 1], [-2.0, -2.35], [-1.95, -2.82, 1], [-1.42, -2.9], [-1.2, -3.32, 1], [-.62, -3.2],
                [-.12, -3.42, 1], [.35, -3.22], [.95, -3.38, 1], [1.3, -3.0], [1.86, -2.92, 1], [1.95, -2.45], [2.36, -2.22, 1], [2.08, -1.7], [2.12, -.9], [1.98, .25, 1]];
  K.shape(back, { wash: c.hair, ink: null, n: 4 });
  // ears
  for (const s of [-1, 1]) {
    const E = [[1.64, -.22], [1.9, -.38], [2.06, -.15], [2.04, .28], [1.9, .66], [1.7, .92], [1.56, .82]].map(([x, y]) => [s * x, y]);
    K.shape(E, { wash: c.skin, sw: .5, n: 4 });
    K.shape([[1.75, -.1], [1.92, -.1], [1.9, .4], [1.72, .5]].map(([x, y]) => [s * x, y]), { wash: c.skinSh, op: 170, ink: null, n: 3 });
    K.line([[1.84, -.14], [1.94, .2], [1.8, .55]].map(([x, y]) => [s * x, y]), .3, c.skinDk);
  }
  // face
  K.shape(HIM_FACE_FRONT, { wash: c.skin, ink: null, n: 5 });
  // light from the upper left: a shadow down the right side and under the jaw
  K.shape([[1.42, -1.4], [1.7, -.9], [1.74, -.3], [1.7, .35], [1.6, .85], [1.45, 1.22], [.98, 1.74], [.55, 2.04], [.85, 1.55], [1.2, 1.05], [1.4, .45], [1.48, -.4]], { wash: c.skinSh, op: 160, ink: null, n: 4 });
  // shadow under the fringe
  K.shape([[-1.58, -1.6], [-1.6, -.6], [-1.3, -.4], [-1.05, -.85], [-.8, -.25], [-.5, -.75], [-.2, .05], [.05, -.7], [.3, -.48], [.62, -.85], [.9, -.25], [1.2, -.95], [1.5, -.6], [1.62, -.5], [1.6, -1.6]], { wash: c.skinSh, op: 150, ink: null, n: 3 });
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
  // nose: shadow on the right of the bridge and a small tip
  K.shape([[.03, .32], [.11, .66], [.18, .86], [.05, .92]], { wash: c.skinSh, op: 220, ink: null, n: 3 });
  K.line([[.16, .8], [.13, .92], [-.03, .96]], .45, c.ink, { n: 3 });
  // mouth, eyes, brows
  himMouthFront(K, c, f, sw);
  for (const s of [-1, 1]) himEyeFront(K, c, f, s, sw);
  for (const s of [-1, 1]) himBrowFront(K, c, f, s);
  if (f.gloom > 0) for (let i = 0; i < 6; i++) K.line([[-1.0 + i * .4, -1.5], [-1.0 + i * .4, -1.5 + .9 * f.gloom * (.7 + .3 * hash(i))]], .25, c.inkSoft, { raw: true });
  // glasses
  K.line([[-.2, -.37], [0, -.45], [.2, -.37]], .6, c.glassDk, { n: 3 });
  for (const s of [-1, 1]) himGlassesFront(K, c, f, s, sw);
  // fringe: a base over the forehead, then uneven clumps with strand lines, then highlights
  K.shape([[-1.78, -1.0], [-1.75, -1.75], [-1.2, -2.3], [0, -2.5], [1.2, -2.3], [1.75, -1.75], [1.78, -1.0], [1.4, -1.45], [.9, -1.3], [.4, -1.55], [-.1, -1.3], [-.6, -1.5], [-1.1, -1.25], [-1.45, -1.5]], { wash: c.hair, ink: null, n: 3 });
  for (const [r, t, w, b] of HIM_BANGS_FRONT) K.shape(himClump(r, t, w, b), { wash: c.hair, ink: null, n: 4 });
  for (const [r, t, w, b] of HIM_BANGS_FRONT) {
    const P = himClump(r, t, w, b);
    K.line(P.slice(1, 4), .5, c.ink, { n: 4 }); K.line(P.slice(3, 6), .32, c.ink, { n: 4 });
  }
  for (let i = 0; i < 7; i++) {
    const x = -1.45 + i * .48, y = -2.25 + Math.pow(Math.abs(i - 3) / 3, 2) * .35;
    K.shape(himClump([x - .02, y - .2], [x + .06, y + .34], .13, .12), { wash: c.hairHi, ink: null, n: 3 });
  }
  // silhouette of the hair, broken into strokes
  K.line(back.slice(0, 7), .7, c.ink, { n: 4 }); K.line(back.slice(6, 13), .75, c.ink, { n: 4 }); K.line(back.slice(12), .7, c.ink, { n: 4 });
  // a few loose strands inside the mass
  K.line([[-1.5, -2.5], [-1.0, -2.75], [-.75, -2.6]], .3, c.ink, { n: 3 }); K.line([[.5, -2.8], [1.0, -2.75], [1.5, -2.45]], .3, c.ink, { n: 3 });
}

// ---------- limbs ----------
// Joint chain from a base point: angles from straight down (0), + toward screen right. Returns [base, joint, end].
function himChain(b, a1, L1, a2, L2) {
  const j = [b[0] + Math.sin(a1) * L1, b[1] + Math.cos(a1) * L1], a = a1 + a2;
  return [b, j, [j[0] + Math.sin(a) * L2, j[1] + Math.cos(a) * L2]];
}
const himDir = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
const himAt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
// A sleeve (or a bare arm): shoulder S, elbow E, wrist W; widths at cap/deltoid/bicep/elbow/forearm/wrist.
function himArmShape(S, E, Wr, w, cap = .75) {
  const d = himDir(S, E), C = [[S[0] - d[0] * cap, S[1] - d[1] * cap], S, himAt(S, E, .45), E, himAt(E, Wr, .35), Wr];
  return himTube(C, w);
}
// Hands, in hand-local units: wrist at (0, 0), the hand pointing down +y; +x is the thumb side.
const HIM_HANDS = {
  // hanging, seen from the thumb side: fingers loosely curled
  relax: { out: [[-.46, 0], [-.58, .7], [-.56, 1.2], [-.44, 1.75], [-.18, 2.05], [.1, 2.0], [.3, 1.7], [.36, 1.3], [.52, 1.12], [.62, .7], [.5, 0]],
           lines: [[[.18, .45], [.42, .95], [.4, 1.18]], [[-.2, 1.25], [-.1, 1.85]], [[.08, 1.2], [.16, 1.75]]] },
  // on a keyboard, seen from the side: fingers bent down at the knuckles
  type:  { out: [[-.42, 0], [-.48, .8], [-.4, 1.25], [-.1, 1.7], [.18, 1.95], [.42, 1.9], [.5, 1.55], [.4, 1.0], [.5, .7], [.45, 0]],
           lines: [[[.2, .55], [.38, .95], [.36, 1.2]], [[-.15, 1.3], [.22, 1.75]]] },
  // open, reaching: fingers extended, slightly spread
  open:  { out: [[-.45, 0], [-.55, .8], [-.62, 1.4], [-.58, 2.3], [-.38, 2.42], [-.24, 1.6], [-.14, 2.55], [.06, 2.5], [.08, 1.6], [.22, 2.42], [.4, 2.3], [.36, 1.45], [.6, 1.3], [.85, 1.1], [.72, .8], [.5, 0]],
           lines: [[[.2, .5], [.45, .9]]] },
  fist:  { out: [[-.5, 0], [-.6, .75], [-.55, 1.35], [-.2, 1.55], [.25, 1.5], [.55, 1.2], [.6, .6], [.5, 0]],
           lines: [[[.15, .55], [.45, .85], [.3, 1.1]], [[-.45, 1.0], [.1, 1.05]]] }
};
function himHand(K, c, kind, at, ang, mirror, skin, sw, s = 1) {
  const H = HIM_HANDS[kind] || HIM_HANDS.relax, ca = Math.cos(-ang), sa = Math.sin(-ang);
  const tf = P => P.map(([x, y]) => { x *= mirror * s; y *= s; return [at[0] + x * ca - y * sa, at[1] + x * sa + y * ca]; });
  K.shape(tf(H.out), { wash: skin || c.skin, sw: .55, n: 3 });
  for (const L of H.lines) K.line(tf(L), .3, c.inkSoft, { n: 3 });
  return tf;
}
// The hospital wristband (barcode marks) around a wrist at `at`, perpendicular to the forearm angle.
function himBand(K, c, at, ang, w, mirror = 1) {
  const ca = Math.cos(-ang), sa = Math.sin(-ang), tf = P => P.map(([x, y]) => [at[0] + x * ca - y * sa, at[1] + x * sa + y * ca]);
  K.shape(tf([[-w / 2, -.2], [w / 2, -.24], [w / 2 + .04, .2], [-w / 2 - .04, .24]]), { wash: c.band, ink: c.ink, sw: .4, n: 2 });
  for (let i = 0; i < 6; i++) { const x = -w * .32 + i * w * .11 * (1 + .25 * (i % 2)); K.line(tf([[x * mirror, -.12], [x * mirror, .12]]), i % 3 ? .18 : .3, c.code, { raw: true, j: 0 }); }
}

// ---------- torso (front) ----------
// Torso-local units: origin = hip centre, y up is negative. Shoulder joints at (±4.55, -8.6), hip joints at (±1.8, 0),
// eyes at (0, -13.25) with the neck pivot at (0, -11.6).
function himTorsoFront(K, c, o, outfit) {
  const br = o.breath || 0, B = y => y * (1 + br * .012);
  const P = pts => pts.map(([x, y, k]) => [x * (1 + br * .015 * clamp(-y / 10)), B(y), k]);
  // neck
  K.shape(P([[-1.15, -12.8], [1.15, -12.8], [1.32, -11.2], [1.5, -10.4], [-1.5, -10.4], [-1.32, -11.2]]), { wash: c.skin, ink: null, n: 3 });
  K.shape(P([[-1.2, -12.5], [1.2, -12.5], [1.3, -11.3], [.6, -11.0], [-.4, -11.25], [-1.25, -11.6]]), { wash: c.skinSh, op: 200, ink: null, n: 3 });
  K.line(P([[-1.15, -12.6], [-1.3, -11.3], [-1.5, -10.5]]), .6); K.line(P([[1.15, -12.6], [1.32, -11.3], [1.52, -10.5]]), .75);
  K.line(P([[-.7, -11.0], [-.35, -10.3]]), .25, c.skinDk); K.line(P([[.75, -11.0], [.4, -10.3]]), .25, c.skinDk);
  if (outfit === 'launch') {
    // back collar of the blazer, behind the neck
    K.shape(P([[-1.85, -10.4], [-1.45, -11.2], [0, -11.45], [1.45, -11.2], [1.85, -10.4], [1.2, -10.2], [-1.2, -10.2]]), { wash: c.jacketDk, sw: .5, n: 3 });
  }
  // shirt
  const shirt = P([[-1.4, -10.9], [1.4, -10.9], [2.8, -9.8], [3.4, -4.0], [3.3, 0.8], [-3.3, 0.8], [-3.4, -4.0], [-2.8, -9.8]]);
  K.shape(shirt, { wash: c.shirt, ink: outfit === 'home' ? c.ink : null, sw: .6, n: 3 });
  // open neck: a V of skin with a hint of collarbones
  K.shape(P([[-.95, -10.75], [.95, -10.75], [.5, -9.5], [0, -8.75], [-.5, -9.5]]), { wash: c.skin, ink: null, n: 3 });
  K.shape(P([[-.95, -10.75], [.95, -10.75], [.7, -10.2], [-.7, -10.2]]), { wash: c.skinSh, op: 160, ink: null, n: 3 });
  K.line(P([[-.85, -10.05], [-.4, -9.9], [-.12, -9.7]]), .25, c.skinDk); K.line(P([[.85, -10.05], [.4, -9.9], [.12, -9.7]]), .25, c.skinDk);
  K.line(P([[-.95, -10.75], [-.5, -9.5], [0, -8.75], [.5, -9.5], [.95, -10.75]]), .4, c.ink, { n: 3 });
  // placket, buttons, the pull of the chest
  K.line(P([[0, -8.75], [.05, -6.5], [0, -3.8]]), .3, c.shirtSh);
  for (const y of [-7.6, -5.6]) K.shape(ellPts(.12, B(y), .09, .09, 8), { wash: c.shirtSh, ink: null, raw: true, j: 0 });
  // belt in the cutaway below the button
  K.shape(P([[-2.2, -.95], [2.2, -.95], [2.2, -.35], [-2.2, -.35]]), { wash: c.belt, sw: .4, n: 2 });
  K.shape(P([[-.32, -1.0], [.32, -1.0], [.32, -.3], [-.32, -.3]]), { wash: c.buckle, sw: .35, n: 2 });
  if (outfit === 'home') {
    // rumpled shirt: open collar points standing up, creases pulling across the chest, untucked hem
    for (const s of [-1, 1]) {
      const cp = [[.95, -10.95], [1.75, -10.75], [2.2, -9.1, 1], [1.35, -9.55], [.9, -10.2]].map(([x, y, k]) => [s * x, y, k]);
      K.shape(P(cp), { wash: c.shirt, sw: .5, n: 3 });
      K.line(P([[1.0, -10.6], [1.4, -9.8]].map(([x, y]) => [s * x, y])), .25, c.shirtSh);
    }
    K.shape(P([[2.6, -9.6], [3.3, -8.0], [3.2, -6.5], [2.4, -7.6]]), { wash: c.shirtSh, op: 150, ink: null, n: 3 });
    for (const [a, b] of [[[-2.6, -7.0], [-.6, -6.1]], [[2.7, -6.9], [.7, -6.0]], [[-2.9, -4.2], [-1.2, -3.2]], [[2.9, -4.5], [1.5, -3.4]], [[-2.4, -1.8], [-1.0, -2.6]], [[2.5, -1.6], [1.1, -2.4]]])
      K.line(P([a, himAt(a, b, .5).map((v, i) => v + (i ? -.15 : 0)), b]), .35, c.shirtSh, { n: 3 });
    K.line(P([[0, -8.75], [.1, -6.5], [-.05, -3.8], [.08, -1.2]]), .35, c.shirtSh);
    // untucked hem
    K.shape(P([[-3.35, -.9], [3.35, -.9], [3.45, .9], [2.0, 1.25], [.4, .95], [-1.2, 1.3], [-3.45, .95]]), { wash: c.shirt, sw: .55, n: 3 });
    K.line(P([[-2.6, .2], [-1.8, 1.1]]), .3, c.shirtSh); K.line(P([[1.6, .3], [2.3, 1.05]]), .3, c.shirtSh);
    // shirt silhouette
    K.line(P([[-1.45, -10.9], [-2.8, -9.8], [-3.35, -6.8], [-3.25, -4.0], [-3.4, -.9]]), .7); K.line(P([[1.45, -10.9], [2.8, -9.8], [3.35, -6.8], [3.25, -4.0], [3.4, -.9]]), .85);
    return;
  }
  // blazer front panels: screen right panel on top (it holds the button)
  for (const s of [-1, 1]) {
    const pan = [[1.15, -10.45], [1.9, -10.55], [3.3, -10.2], [4.6, -9.6], [5.25, -8.6], [5.0, -7.2], [4.45, -6.4], [4.3, -5.0], [3.55, -2.6], [3.75, -.4], [3.7, .75, 1], [2.3, 1.0], [1.15, .95, 1], [.6, -1.6], [-.1 * s, -3.95, 1], [.45, -6.4], [.95, -9.1]].map(([x, y, k]) => [s * x, y, k]);
    K.shape(P(pan), { wash: c.jacket, ink: null, n: 4 });
    // shading: the far side of the chest and the side seam fall into shadow
    if (s > 0) K.shape(P([[3.4, -10.0], [4.6, -9.6], [5.25, -8.6], [5.0, -7.2], [4.45, -6.4], [4.3, -5.0], [3.55, -2.6], [3.75, -.4], [3.7, .75], [3.0, .8], [3.0, -2.6], [3.6, -5.2], [3.7, -7.4], [3.9, -9.0]]), { wash: c.jacketSh, ink: null, n: 3, hatch: { d: 5, a: .9, b: 'HB', c: c.jacketDk, w: .5, o: { rand: .2 } } });
    else K.shape(P([[-4.3, -5.0], [-3.55, -2.6], [-3.75, -.4], [-3.7, .75], [-3.25, .8], [-3.2, -2.6], [-3.8, -5.0]]), { wash: c.jacketSh, ink: null, n: 3 });
    // highlight across the top of the chest/shoulder
    K.shape(P([[1.9, -10.4], [3.4, -10.05], [4.5, -9.5], [3.9, -9.35], [2.6, -9.6]].map(([x, y]) => [s * x, y])), { wash: c.jacketHi, op: s < 0 ? 230 : 140, ink: null, n: 3 });
    // folds pulling from the button toward the chest and the side
    K.line(P([[.35 * s, -4.2], [1.6 * s, -5.0], [3.2 * s, -6.2]]), .32, c.jacketDk, { n: 3 });
    K.line(P([[.4 * s, -3.7], [1.8 * s, -3.4], [3.0 * s, -2.9]]), .28, c.jacketDk, { n: 3 });
    K.line(P([[1.9 * s, -.9], [3.4 * s, -1.1]]), .3, c.jacketDk);   // hip pocket flap
    // outline (silhouette heavier)
    K.line(P(pan.slice(1, 11)), s > 0 ? .95 : .8, c.ink, { n: 4 });
    K.line(P(pan.slice(10, 15)), .6, c.ink, { n: 4 });
  }
  // lapels (notched), with the shirt collar lying open over them
  for (const s of [-1, 1]) {
    const lap = [[1.12, -10.45], [1.85, -10.55], [2.15, -10.15], [2.32, -8.75, 1], [2.08, -8.5, 1], [2.95, -8.28, 1], [2.25, -6.3], [.75, -4.6], [.1 * s, -4.0, 1], [.5, -6.3], [.92, -9.0]].map(([x, y, k]) => [s * x, y, k]);
    K.shape(P(lap), { wash: s > 0 ? c.jacketSh : c.jacket, sw: .55, n: 3 });
    K.line(P([[2.25 * s, -6.3], [.75 * s, -4.6], [.12 * s, -4.0]]), .3, c.jacketDk);
    const cp = [[.92, -10.95], [1.62, -10.7], [1.95, -9.05, 1], [1.25, -9.45], [.85, -10.15]].map(([x, y, k]) => [s * x, y, k]);
    K.shape(P(cp), { wash: c.shirt, sw: .45, n: 3 });
    K.line(P([[1.05 * s, -10.55], [1.45 * s, -9.75]]), .2, c.shirtSh);
  }
  // breast pocket and the button
  K.line(P([[3.05, -6.0], [4.0, -6.15]]), .35, c.jacketDk);
  K.shape(ellPts(.1, B(-4.0), .17, .17, 10), { wash: c.jacketDk, sw: .3, raw: true, j: 0 });
}

// ---------- legs ----------
// Trouser leg from hip H through knee N to ankle A; widths thigh/knee/calf/hem. side = -1 | 1 (which outline is heavier).
function himLeg(K, c, H, N, A, w, outfit, heavy = 1) {
  const C = [H, himAt(H, N, .45), N, himAt(N, A, .38), A];
  const tb = himTube(C, w);
  K.shape(tb.outline, { wash: c.pants, ink: null, n: 3, raw: false });
  K.shape(himTube(C, w.map((x, i) => [-(Array.isArray(x) ? x[0] : x / 2) * .15, Array.isArray(x) ? x[1] : x / 2])).outline, { wash: c.pantsSh, ink: null, n: 3 });
  K.line(tb.L, .65 * heavy, c.ink, { n: 3 }); K.line(tb.R, .65 / heavy, c.ink, { n: 3 });
  K.line([himAt(N, A, .1), himAt(N, A, .95)], .22, c.pantsSh);   // crease
  K.line([himAt(H, N, .78), himAt(H, N, .98), himAt(N, A, .1)].map(([x, y], i) => [x + (i - 1) * .25, y + (i === 1 ? .15 : 0)]), .25, c.pantsSh, { n: 3 });   // knee fold
  return tb;
}
// Sneaker, front view (toe toward the viewer) or side view (toe toward +x).
function himShoe(K, c, A, view, mirror = 1) {
  const [x, y] = A, m = mirror;
  if (view === 'front') {
    K.shape([[x - .85, y - .1], [x + .85, y - .1], [x + .98, y + .55], [x + .95, y + .95], [x - .95, y + .95], [x - .98, y + .55]], { wash: c.shoe, sw: .6, n: 3 });
    K.shape([[x - .97, y + .72], [x + .97, y + .72], [x + .95, y + .98], [x - .95, y + .98]], { wash: c.sole, ink: c.ink, sw: .4, n: 2 });
    K.line([[x - .4, y + .25], [x + .4, y + .25]], .3, c.shoeSh);
  } else {
    const P = [[-.7, -.15], [.5, -.12], [1.5, .3], [2.05, .62], [2.1, .95], [-.85, .95], [-.9, .4]].map(([a, b]) => [x + a * m, y + b]);
    K.shape(P, { wash: c.shoe, sw: .6, n: 3 });
    K.shape([[-.9, .72], [2.12, .72], [2.1, .98], [-.86, .98]].map(([a, b]) => [x + a * m, y + b]), { wash: c.sole, sw: .4, n: 2 });
    K.line([[.3, .05], [.9, .3], [1.3, .55]].map(([a, b]) => [x + a * m, y + b]), .3, c.shoeSh, { n: 3 });
  }
}

// ---------- the character ----------
// him(x, y, u, o): (x, y) is the anchor (see HIM_POSES), u the size unit. Standing he is ~31u tall (soles to hair top),
// head 4.4u, shoulders ~10.5u wide: u ≈ 14 for a full figure filling a 1080p frame's height... u ≈ 30 for a bust.
// Options: view front|q|side, flip, pose stand|desk|bust, outfit launch|home, pal human|drained|swapped,
//   face: eye (normal|happy|squeeze), lid, low, browIn, browOut, browY, irisK, dull, mouth, blush, circles, gloom, glare,
//         tears, sweat, lookX, lookY, blink, squint, seed (blink timing)
//   body: dx, dy (in u), sq (squash), lean (torso), tilt (head), nod, breath, aL / aR (arm swing), hands
//   boilKey: a stable id for its boil seeds.
let HIM_N = 0;
function him(x, y, u, o = {}) {
  const id = o.boilKey ?? ('n' + (++HIM_N)), rs = part => boilSeed(`him ${id} ${part}`);
  const c = himPal(o.pal || 'human'), clean = (o.pal === 'swapped');
  const sw = clamp(.25 + u / 110, .3, 1.6) * (o.swMul || 1) * (clean ? .8 : 1);
  const K = himKit(u, c, sw, Math.max(.5, u * .012) * (clean ? .3 : 1), clean);
  const view = o.view || 'front', pose = o.pose || 'stand', outfit = o.outfit || 'launch';
  const f = himFace(o);
  const sq = o.sq || 0;
  rs('shadow');
  if (pose === 'stand' && !o.noShadow) paint(ellPts(x, y + u * .3, u * 6.5, u * 1.1, 22), { wash: c.ink, washOp: 38, ink: null });
  push(); translate(x + (o.dx || 0) * u, y + (o.dy || 0) * u);
  scale((o.flip ? -1 : 1) * (1 + sq * .5), 1 - sq);
  if (pose === 'stand') himStand(K, c, f, o, view, outfit, u, sw, rs);
  else if (pose === 'bust') himBust(K, c, f, o, view, outfit, u, sw, rs);
  else if (pose === 'desk') himDesk(K, c, f, o, view, outfit, u, sw, rs);
  pop();
  if (clean) himSwapGlow(x, y, u, pose);
  rs('after');
}
function himSwapGlow(x, y, u, pose) {
  const top = pose === 'stand' ? 28 : pose === 'desk' ? 22 : 4;
  glow(x, y - top * u, 9 * u, '#7FE9FF', .45); glow(x, y - top * .5 * u, 14 * u, '#1B6FFF', .3);
}
// Face state from options: automatic blinks (pure function of T), squint, and defaults.
function himBlink(t, seed = 0) {
  const p = (t * .9 + seed * 1.7) % 3.3, d = .16;   // a blink every ~3.7 s, closing then opening
  return p < d ? Math.sin(p / d * Math.PI) : 0;
}
function himFace(o) {
  const f = { ...o };
  const b = Math.max(o.blink ?? himBlink(T, o.seed || 0), o.squint || 0);
  f.lid = clamp(lerp(o.lid || 0, 1, b));
  if (f.lid > .86 && f.eye && f.eye !== 'normal') f.lid = .87;
  return f;
}
// The head in any view, drawn around its origin (between the eyes).
function himHead(K, c, f, u, sw, view) {
  if (view === 'front') himHeadFront(K, c, f, u, sw);
  else if (view === 'q') himHeadQ(K, c, f, u, sw);
  else himHeadSide(K, c, f, u, sw);
}

// ---------- poses ----------
// stand: anchor = ground point between the feet. Hips at y = -15u.
function himStand(K, c, f, o, view, outfit, u, sw, rs) {
  const hip = [0, -15], lean = o.lean || 0, aL = o.aL || 0, aR = o.aR || 0;
  if (view === 'front') {
    const legs = [[-1, -.04, .03], [1, .05, -.03]];
    rs('legs');
    // seat of the trousers, then the two legs, then the shoes
    K.shape([[-3.5, -16.2], [3.5, -16.2], [3.6, -14.2], [0, -13.1], [-3.6, -14.2]], { wash: c.pants, ink: null, n: 2 });
    const ank = [];
    for (const [s, a1, a2] of legs) {
      const [H, N, A] = himChain([s * 1.8, -15], a1, 7.15, a2, 6.95);
      himLeg(K, c, H, N, A, [3.1, 2.8, 2.05, 2.15, 1.75], outfit, s < 0 ? 1.25 : .8); ank.push(A);
    }
    K.line([[0, -14.6], [0, -13.4]], .4, c.pantsSh);
    rs('shoes'); ank.forEach((A, i) => himShoe(K, c, [A[0], A[1] + .05], 'front', i ? 1 : -1));
    rs('torso');
    push(); translate(hip[0] * u, hip[1] * u); rotate(lean);
    himTorsoFront(K, c, o, outfit);
    // arms: [side, swing]; the left wrist (screen right in the front view) wears the hospital band
    const arms = [[-1, aR, o.handR || 'relax'], [1, aL, o.handL || 'relax']];
    for (const [s, sa, hk] of arms) {
      rs('arm' + s);
      const S = [s * 4.55, -8.6], a1 = s * (.12 + .02 * (o.breath || 0)) + sa, [, E, Wr] = himChain(S, a1, 4.9, -s * .07 + sa * .4, 4.3);
      himArm(K, c, S, E, Wr, outfit, s, hk, view, s > 0 !== !!o.flip);
    }
    pop();
    rs('head');
    push(); translate(hip[0] * u, hip[1] * u); rotate(lean); translate(0, -11.6 * u); rotate(o.tilt || 0); translate(0, (-1.65 + (o.nod || 0)) * u);
    himHead(K, c, f, u, sw, 'front');
    pop();
  } else {
    himStandTurned(K, c, f, o, view, outfit, u, sw, rs);
  }
}
// One arm: sleeve (or rolled shirt sleeve and bare forearm), cuff, hand, wristband.
function himArm(K, c, S, E, Wr, outfit, s, hand, view, band, far = false) {
  const d2 = himDir(E, Wr), ang = Math.atan2(d2[0], d2[1]);
  const col = far ? { wash: outfit === 'home' ? c.shirtSh : c.jacketSh } : { wash: outfit === 'home' ? c.shirt : c.jacket };
  if (outfit === 'home') {
    // bare forearm first, then the rolled sleeve over the elbow
    const fa = himTube([E, himAt(E, Wr, .3), Wr], [1.75, 1.7, 1.15]);
    K.shape(fa.outline, { wash: far ? c.skinSh : c.skin, ink: null, n: 3 });
    K.shape(himTube([E, himAt(E, Wr, .3), Wr], [[.0, .85], [.1, .85], [.1, .58]]).outline, { wash: c.skinSh, op: 200, ink: null, n: 3 });
    K.line(fa.L, .55); K.line(fa.R, .55);
    K.line([himAt(E, Wr, .25), himAt(E, Wr, .6), himAt(E, Wr, .85)].map(([x, y], i) => [x + s * (.2 - i * .1), y]), .2, c.skinDk, { n: 3 });   // a vein
    const sl = himTube([himAt(S, E, -.12), S, himAt(S, E, .5), E, himAt(E, Wr, .2)], [1.2, 2.3, 2.2, 1.95, 2.05]);
    K.shape(sl.outline, { wash: col.wash, ink: null, n: 3 });
    K.shape(himTube([himAt(S, E, .2), himAt(S, E, .5), E, himAt(E, Wr, .2)], [[.0, 1.1], [.2, 1.1], [.2, 1.0], [.1, 1.0]].map(([a, b]) => s < 0 ? [b, a] : [a, b])).outline, { wash: c.shirtSh, op: 160, ink: null, n: 3 });
    // roll: a band at the bottom
    const r0 = himAt(E, Wr, .03), r1 = himAt(E, Wr, .2), n = [-d2[1], d2[0]];
    K.shape([[r0[0] + n[0] * 1.08, r0[1] + n[1] * 1.08], [r1[0] + n[0] * 1.05, r1[1] + n[1] * 1.05], [r1[0] - n[0] * 1.05, r1[1] - n[1] * 1.05], [r0[0] - n[0] * 1.08, r0[1] - n[1] * 1.08]], { wash: c.shirt, sw: .45, n: 2 });
    K.line(sl.L.slice(0, -1), .6); K.line(sl.R.slice(0, -1), .6);
    K.line([himAt(S, E, .55), himAt(S, E, .8)].map(([x, y]) => [x + s * .3, y]), .25, c.shirtSh);
  } else {
    const sl = himArmShape(S, E, Wr, [1.2, 2.35, 2.2, 1.7, 1.8, 1.42]);
    K.shape(sl.outline, { wash: col.wash, ink: null, n: 3 });
    // shadow on the back of the arm, highlight on the shoulder cap
    const sh = himArmShape(S, E, Wr, [[.0, .5], [.0, 1.1], [0, 1.05], [0, .8], [0, .85], [0, .66]].map(([a, b]) => (s > 0) ? [a, b] : [b, a]));
    K.shape(sh.outline, { wash: c.jacketSh, ink: null, n: 3 });
    K.shape(himArmShape(S, E, Wr, [[.4, 0], [.95, -.35], [.7, -.4], [0, 0], [0, 0], [0, 0]].map(([a, b]) => s > 0 ? [b, a] : [a, b]).map(([a, b]) => [Math.max(a, 0), Math.max(b, 0)])).outline, { wash: c.jacketHi, op: 150, ink: null, n: 3 });
    // creases at the elbow, a strained bicep
    K.line([himAt(S, E, .82), himAt(S, E, .95), himAt(E, Wr, .08)].map(([x, y], i) => [x - s * (.5 - i * .3), y]), .3, c.jacketDk, { n: 3 });
    K.line([himAt(S, E, .35), himAt(S, E, .55)].map(([x, y]) => [x + s * .6, y]), .25, c.jacketDk);
    K.line(sl.L.slice(0, -1), s < 0 ? .85 : .6); K.line(sl.R.slice(0, -1), s > 0 ? .85 : .6);
    // shirt cuff peeking out
    const r0 = himAt(E, Wr, .94), r1 = himAt(E, Wr, 1.06), n = [-d2[1], d2[0]];
    K.shape([[r0[0] + n[0] * .66, r0[1] + n[1] * .66], [r1[0] + n[0] * .62, r1[1] + n[1] * .62], [r1[0] - n[0] * .62, r1[1] - n[1] * .62], [r0[0] - n[0] * .66, r0[1] - n[1] * .66]], { wash: c.shirt, sw: .35, n: 2 });
  }
  const hw = himAt(E, Wr, outfit === 'home' ? 1.0 : 1.08);
  himHand(K, c, hand, hw, ang, s < 0 ? 1 : -1, far ? c.skinSh : c.skin, 0);
  if (band) himBand(K, c, himAt(E, Wr, outfit === 'home' ? .9 : .86), ang, outfit === 'home' ? 1.25 : 1.32);
}

// ---------- test ----------
function himHeadQ(K, c, f, u, sw) { himHeadFront(K, c, f, u, sw); }
function himHeadSide(K, c, f, u, sw) { himHeadFront(K, c, f, u, sw); }
function himStandTurned() {}
function himBust() {}
function himDesk() {}
LOOPS.him_test = t => {
  him(560, 1040, 31, { mouth: 'closed', blush: .3 });
  him(1360, 1040, 31, { outfit: 'home', mouth: 'smile', blush: .3, circles: .7, lid: .35 });
};
LOOPS.him_test.len = 1;
