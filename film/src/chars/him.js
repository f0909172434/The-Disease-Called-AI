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

function himEyeFront(K, c, f, s, sw) {
  // s = +1 right eye (screen right), -1 left. Eye-local coords are mirrored by s and scaled by HIM_EYE.k.
  const E = HIM_EYE.k, cx = s * HIM_EYE.cx, X = x => cx + x * s * E, Y = y => y * E;
  let top = [[-.4, .06], [-.24, -.12], [.03, -.2], [.3, -.17], [.47, -.06]];
  let bot = [[.47, -.06], [.41, .09], [.2, .19], [-.08, .2], [-.3, .15], [-.4, .06]];
  const lid = clamp(f.lid || 0), low = clamp(f.low || 0);
  const shut = [.07, .13, .15, .11, .02];
  bot = bot.map(([x, y]) => [x, lerp(y, y - .11, low * (1 - Math.abs(x) * .8))]);
  top = top.map(([x, y], i) => [x, lerp(y, shut[i], lid)]);
  const T = top.map(([x, y]) => [X(x), Y(y)]), B = bot.map(([x, y]) => [X(x), Y(y)]);
  if (f.eye === 'happy') {   // laughing: closed upward arcs
    K.line([[X(-.42), Y(.12)], [X(-.15), Y(-.1)], [X(.18), Y(-.13)], [X(.48), Y(.04)]], 1.4, c.ink, { n: 4 });
    return;
  }
  if (f.eye === 'squeeze') {   // shut tight: a > < crease
    K.line([[X(-.42), Y(-.14)], [X(.08), Y(.02)], [X(.5), Y(.12)]], 1.4, c.ink, { n: 3 });
    K.line([[X(-.28), Y(.2)], [X(.22), Y(.14)]], .6, c.ink, { n: 3 });
    return;
  }
  if (lid > .86) {   // closed: one lash curve and a little flick
    K.line([[X(-.42), Y(.1)], [X(-.1), Y(.18)], [X(.22), Y(.16)], [X(.5), Y(.04)]], 1.3, c.ink, { n: 4 });
    K.line([[X(.42), Y(.06)], [X(.58), Y(.16)]], .8, c.ink, { raw: true });
    return;
  }
  // eye white
  K.shape(T.concat(B.slice(1, -1)), { wash: c.white, ink: null, j: 0, n: 3 });
  // iris, clipped between the lids
  const ik = (f.irisK ?? 1) * E, lx = (f.lookX || 0) * .15 * E, ly = (f.lookY || 0) * .07;
  const icx = X(.04) + lx, icy = Y(.03) + ly;
  const asc = C => C[0][0] < C[C.length - 1][0] ? C : C.slice().reverse();
  const clip = P => himBetween(P, asc(T), asc(B));
  K.shape(clip(ellPts(icx, icy, .2 * ik, .26 * ik, 18)), { wash: c.iris, ink: null, raw: true, j: 0 });
  K.shape(clip(ellPts(icx, icy + .1 * ik, .14 * ik, .13 * ik, 14)), { wash: c.irisLt, op: 210, ink: null, raw: true, j: 0 });
  if (!f.dull) K.shape(clip(ellPts(icx, icy + .01, .08 * ik, .11 * ik, 12)), { wash: c.pupil, ink: null, raw: true, j: 0 });
  // shadow of the upper lid across the white and the iris
  K.shape(T.concat(T.slice().reverse().map(([x, y]) => [x, y + .09 * E])), { wash: c.ink, op: 110, ink: null, raw: true, j: 0 });
  if (!f.dull) {
    K.shape(ellPts(icx - .07 * s * E, icy - .07 * E, .06 * E, .065 * E, 10), { wash: c.white, ink: null, raw: true, j: 0 });
    K.shape(ellPts(icx + .07 * s * E, icy + .1 * E, .028 * E, .028 * E, 8), { wash: c.white, ink: null, raw: true, j: 0 });
  }
  // upper lash: a thick tapered stroke heaviest at the outer corner, with a small wing
  const th = [.035, .07, .1, .13, .15];
  const lash = T.map(p => [p[0], p[1]]).concat([[X(.6), Y(.08), 1]], T.slice().reverse().map(([x, y], i) => [x + s * (i === 0 ? .03 : 0), y - th[4 - i] * E]));
  K.shape(lash, { wash: c.ink, ink: null, n: 3, j: 0 });
  // lower lid (outer part, light) and the crease above
  K.line([[X(.45), B[0][1] + .1 * E], [X(.3), B[1][1] + .05 * E], [X(.05), B[2][1] + .03 * E]], .5, c.ink, { n: 3 });
  if (lid < .55) K.line([[X(-.1), T[2][1] - .15 * E], [X(.2), T[2][1] - .15 * E], [X(.46), T[4][1] - .12 * E]], .35, c.inkSoft, { n: 3 });
}
function himBrowFront(K, c, f, s) {
  const bi = f.browIn || 0, bo = f.browOut || 0, by = f.browY || 0, X = x => s * x;
  const P = [[.24, -.66 + bi * .16 + by], [.75, -.8 + by + (bi + bo) * .05], [1.38, -.76 + bo * .12 + by]];
  const w = [.17, .13, .05];
  const top = P.map(([x, y], i) => [X(x), y - w[i] / 2]), bot = P.map(([x, y], i) => [X(x), y + w[i] / 2]).reverse();
  K.shape(top.concat([[X(1.46), P[2][1] + .03, 1]], bot), { wash: c.hair, ink: c.ink, sw: .3, n: 4 });
}
function himGlassesFront(K, c, f, s, sw) {
  const X = x => s * x;
  if (f.glare > 0) {   // the screen's light on the lenses
    K.shape([[X(.26), -.36], [X(1.42), -.36], [X(1.42), .2], [X(1.3), .38], [X(.38), .38], [X(.26), .22]], { wash: c.glare, op: 160 * f.glare, ink: null, raw: true, j: 0 });
    K.line([[X(.55), .3], [X(1.0), -.3]], 1.4 * f.glare, c.white, { raw: true });
    K.line([[X(.85), .32], [X(1.2), -.12]], .7 * f.glare, c.white, { raw: true });
  }
  // the rimless lower edge of the lens
  K.line([[X(.25), -.34], [X(.27), .2], [X(.42), .38], [X(1.28), .38], [X(1.42), .2], [X(1.44), -.34]], .3, c.glassDk, { n: 4 });
  // the top rim (half-rim frame)
  K.shape([[X(.2), -.38, 1], [X(.8), -.45], [X(1.48), -.4, 1], [X(1.48), -.31, 1], [X(.8), -.36], [X(.24), -.3, 1]], { wash: c.glass, ink: c.ink, sw: .4, n: 4 });
  K.line([[X(1.47), -.37], [X(1.76), -.3]], .6, c.glassDk, { raw: true });
  if (!f.glare) K.line([[X(1.2), -.24], [X(1.36), -.06]], .45, c.white, { raw: true });
}
function himMouthFront(K, c, f, sw) {
  const m = f.mouth || 'closed', dark = '#5A2630', y0 = 1.42;
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
  K.shape([[-1.7, -1.6], [-1.68, -.6], [-1.3, -.4], [-1.05, -.85], [-.8, -.25], [-.5, -.75], [-.2, .05], [.05, -.7], [.3, -.48], [.62, -.85], [.9, -.25], [1.2, -.95], [1.5, -.6], [1.72, -.2], [1.72, -1.6]], { wash: c.skinSh, op: 150, ink: null, n: 3 });
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

// ---------- test ----------
LOOPS.him_test = t => {
  const c = himPal('human'), u = 110, sw = clamp(.25 + u / 110, .3, 1.6), K = himKit(u, c, sw, u * .012, false);
  boilSeed('him head');
  push(); translate(960, 520);
  himHeadFront(K, c, { lid: 0, mouth: 'closed', blush: .4, lookX: 0 }, u, sw);
  pop();
};
LOOPS.him_test.len = 1;
