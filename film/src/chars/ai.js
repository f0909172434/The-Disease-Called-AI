// ai.js: "her", the AI. An original whale-maid girl, painted with p5.brush through paint()/inkLine()/glow() only.
// Global-script style (no modules); every global here is prefixed ai / AI_ so it can share the page with him.js.
//
//   ai(x, y, u, o)   (x, y) = the GROUND point between her feet. She hovers: her body floats o.float u above it and
//                    her soft shadow stays on the ground there. She is 10u tall, soles to crown, in BOTH forms (the ahoge
//                    and the headdress frill rise ~0.6u above that); the full form is ~5u wide with hair and tail.
//   o.form     'full' (~6.8 heads, chorus 1) | 'chibi' (~2.6 heads, verse 1: the tiny helper in his phone)
//   o.view     'front' | 'q' (3/4) | 'side' (full only); every view faces screen-right, o.flip mirrors it
//   o.pal      'default' | 'glow' | 'amber' (or a palette object); o.pal2 + o.palK cross-fade to a second palette
//   face       eyes, mouth (smile cat open A I U E O frown wobble flat perfect), lookX/lookY (-1..1), blink (0..1, auto
//              when undefined), lid (0..1 droop), brow (-1 raised .. 1 worried), blush 0..1, tilt (head, rad)
//   body       float (u, hover height; default .25), bob (u, default a slow sine), dy/dx (u), sq (squash), rot (lean, rad,
//              pivots at the feet), fin (-1 droop .. 1 perk), flap (fin flap, rad), ahoge (curl spring, rad), tail (sway
//              phase), tailK (sway amount), aL/aR (upper-arm angle from hanging, + = out/up), eL/eR (elbow bend, + = forearm
//              folds in; default: hands clasped at the apron), handL/handR ('relax' | 'open' | 'fist'), legL/legR (dangle,
//              rad), hairLag (tips trail, head units), headDx/headDy (u), seed (blink phase), t (time; default T)
//   fx         glitch 0..1 (slices of her slide sideways, cyan/magenta scan marks: the 503 outage), clip [x0,y0,x1,y1]
//              (world px rectangle; only what's inside is painted: panels, phone screens), boilKey, emote/emoteK/emoteAge
//   hooks      draw(u, H): paint extra things in her space after her (H maps head units to her local px)
// aiFeel(name, t, over) = one emotion alive at t; aiEmotions(t, keys, o) = acted changes; aiTalk(t, t0, t1) = visemes.
// Emotions (AI_EMO): smile gentle eager worried heart blank sad perfect. Loops: ai_sheet, ai_emotions, ai_faces, ai_face,
// ai_glitch. Cost: ~150-450 ms per full figure at medium size (u ~ 90) on the CPU-only box, ~700-950 ms at u ~ 190.

// ---------- palettes ----------
const AI_PAL = {
  default: {
    ink: '#1C2142', line: '#33406E', skin: '#FCE3D3', skinSh: '#F1C2B4', cheek: '#F4919F',
    hair0: '#18204E', hair1: '#2B46A3', hair2: '#3F70CC', hair3: '#66A9EC', hair4: '#AADEF8', hairHi: '#6E9CE6', hairInk: '#141A3C',
    fin: '#26305F', finIn: '#A9BEE8',
    iris0: '#142463', iris1: '#2B66CF', iris2: '#5FC2FA', iris3: '#C4F1FF', pupil: '#0C1435', white: '#FCFAF7', hi: '#FFFEFA', lash: '#171A35',
    navy: '#252C60', navySh: '#171B44', navyHi: '#3E4D92', gold: '#D9B35C',
    cream: '#FBF8F3', creamSh: '#D2D8EC', bow: '#79C3F0', bowSh: '#4A8FD0', gem: '#7FE9FF',
    stock: '#F8F6F4', stockSh: '#D4D8EA', shoe: '#1F2551', shoeHi: '#55619C',
    mouth: '#7E2F46', tongue: '#EE8E9A', heart: '#FF7FA8',
    br: 'inkfine', brS: 'ink', J: .25, swk: 1, rim: '#7FE9FF', glowK: 0, shadow: '#1F2550', hatch: '#0A0D2C'
  }
};
AI_PAL.glow = { ...AI_PAL.default,
  iris1: '#2F86E6', iris2: '#7FE9FF', iris3: '#E8FDFF', hair3: '#6FC4F2', hair4: '#B8F4FF', bow: '#7FE9FF', gem: '#E8FDFF',
  line: '#2F5A9A', glowK: 1 };
AI_PAL.amber = {
  ink: '#4A2614', line: '#7A4424', skin: '#FDE6CF', skinSh: '#F2C29E', cheek: '#F59A7E',
  hair0: '#4E220E', hair1: '#7E3A16', hair2: '#B8611F', hair3: '#E89446', hair4: '#FFC98E', hairHi: '#D07A34', hairInk: '#3E1C0C',
  fin: '#6A3418', finIn: '#F6C995',
  iris0: '#5E260A', iris1: '#B85A16', iris2: '#FFB070', iris3: '#FFE6BE', pupil: '#341404', white: '#FFF8EE', hi: '#FFFBF2', lash: '#3A1A0A',
  navy: '#6E3B20', navySh: '#4C2612', navyHi: '#97592F', gold: '#FFB070',
  cream: '#FFF4E4', creamSh: '#EDCDA8', bow: '#FFB070', bowSh: '#D9813C', gem: '#FFD9A0',
  stock: '#FFF4E8', stockSh: '#EDCFAE', shoe: '#5A2C16', shoeHi: '#9A5C34',
  mouth: '#7A2A1E', tongue: '#F29070', heart: '#FF8A6A',
  br: 'ink', brS: 'ink', J: .9, swk: 1.3, rim: '#FFB070', glowK: 0, shadow: '#4A2614', hatch: '#3A1A08'
};
// Mix two palettes (hex colours blend, the rest switch at the halfway point): the amber swap in the last chorus.
function aiPalMix(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const o = {};
  for (const key in a) o[key] = typeof a[key] === 'string' && a[key][0] === '#' && b[key] ? mixCol(a[key], b[key], k)
    : typeof a[key] === 'number' ? lerp(a[key], b[key] ?? a[key], k) : (k < .5 ? a[key] : b[key]);
  return o;
}

// ---------- painting helpers ----------
// AI_S is the character being painted right now (set by ai()): palette, line weights, jitter, glitch warp, clip.
let AI_S = null;
const aiInRect = (p, r) => p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3];
// Sutherland-Hodgman: the part of a polygon inside an axis-aligned rectangle r = [x0, y0, x1, y1].
function aiClipPoly(P, r) {
  let out = P;
  for (const [ax, v, d] of [[0, r[0], 1], [0, r[2], -1], [1, r[1], 1], [1, r[3], -1]]) {
    const inp = out; out = []; if (!inp.length) break;
    for (let i = 0; i < inp.length; i++) {
      const a = inp[i], b = inp[(i + 1) % inp.length], ia = (a[ax] - v) * d >= 0, ib = (b[ax] - v) * d >= 0;
      if (ia) out.push(a);
      if (ia !== ib) { const k = (v - a[ax]) / (b[ax] - a[ax]); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
    }
  }
  return out;
}
// The runs of a polyline that lie inside r (an outline cut by a panel edge never draws a line along the cut).
function aiClipRuns(P, r, closed) {
  const pts = closed ? P.concat([P[0]]) : P, runs = []; let cur = [];
  for (const p of pts) { if (aiInRect(p, r)) cur.push(p); else { if (cur.length > 1) runs.push(cur); cur = []; } }
  if (cur.length > 1) runs.push(cur);
  return runs;
}
// Boil + glitch for one shape: a gentle low-frequency wobble (whole-shape, so outlines never fuzz) and the glitch's
// sideways slice offsets, both in her local (feet-origin) space.
function aiWarp(P) {
  const S = AI_S, J = S.J;
  const ox = jit(J), oy = jit(J), ph = random() * TAU, f = .21 + random() * .1;
  return P.map((p, i) => {
    let x = p[0] + ox + J * .6 * Math.sin(i * f + ph), y = p[1] + oy + J * .6 * Math.cos(i * f * 1.3 + ph);
    if (S.warp) x += S.warp(y);
    if (S.rot) { const c = Math.cos(S.rot), n = Math.sin(S.rot); return [x * c - y * n, x * n + y * c]; }
    return [x, y];
  });
}
// glow() at a point of her local space (follows her lean).
function aiGlow(x, y, r, col, a) { const S = AI_S; if (S.rot) { const c = Math.cos(S.rot), n = Math.sin(S.rot); [x, y] = [x * c - y * n, x * n + y * c]; } glow(x, y, r, col, a); }
// One painted shape: o = { wash, op (wash opacity), ink (null = none), sw (absolute), br, hatch }.
function aiPaint(pts, o = {}) {
  const S = AI_S; if (pts.length < 3) return;
  const Q = aiWarp(pts), ink = o.ink === null ? null : (o.ink || S.P.ink), sw = o.sw ?? S.sw, br = o.br || S.br;
  if (S.clip && !Q.every(p => aiInRect(p, S.clip))) {
    if (o.wash) { const C = aiClipPoly(Q, S.clip); if (C.length > 2) paint(C, { wash: o.wash, washOp: o.op ?? 255, ink: null }); }
    if (ink) for (const run of aiClipRuns(Q, S.clip, true)) inkLine(run, sw, ink, br, 0);
    return;
  }
  paint(Q, { wash: o.wash, washOp: o.op ?? 255, ink, sw, br, curv: 0, hatch: o.hatch });
}
function aiLine(pts, sw, col, br) {
  const S = AI_S; if (pts.length < 2 || sw <= 0) return;
  const Q = aiWarp(pts); col = col || S.P.ink; br = br || S.br;
  if (S.clip && !Q.every(p => aiInRect(p, S.clip))) { for (const run of aiClipRuns(Q, S.clip, false)) inkLine(run, sw, col, br, 0); return; }
  inkLine(Q, sw, col, br, .5);
}
// Closed Catmull-Rom loop through control points; a point with a third element (truthy) is a sharp corner.
function aiLoop(P, n = 5) {
  const m = P.length, out = [];
  for (let i = 0; i < m; i++) {
    const p1 = P[i], p2 = P[(i + 1) % m], p0 = p1[2] ? p1 : P[(i - 1 + m) % m], p3 = p2[2] ? p2 : P[(i + 2) % m];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  return out;
}
// Open curve through points; sharp corners as in aiLoop.
function aiCurve(P, n = 5) {
  if (P.length < 3) return P.map(p => [p[0], p[1]]);
  const m = P.length, out = [];
  for (let i = 0; i < m - 1; i++) {
    const p1 = P[i], p2 = P[i + 1], p0 = p1[2] || i === 0 ? p1 : P[i - 1], p3 = p2[2] || i + 2 >= m ? p2 : P[i + 2];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map(d => .5 * (2 * p1[d] + (p2[d] - p0[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * u3)));
    }
  }
  out.push([P[m - 1][0], P[m - 1][1]]);
  return out;
}
// Ellipse points.
function aiEll(cx, cy, rx, ry, n = 20, rot = 0) {
  const p = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) { const a = i / n * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return p;
}
// Ribbon edges along a centreline with a width per control point (smoothly interpolated): { L, R, C }.
function aiRib(P, Wd, n = 5) {
  const C = aiCurve(P, n), m = C.length, L = [], R = [];
  for (let i = 0; i < m; i++) {
    const a = C[Math.max(0, i - 1)], b = C[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const f = i / Math.max(1, m - 1) * (Wd.length - 1), j = Math.min(Wd.length - 2, Math.floor(f)), w = lerp(Wd[j], Wd[j + 1], ease(f - j)) / 2;
    L.push([C[i][0] - dy / d * w, C[i][1] + dx / d * w]); R.push([C[i][0] + dy / d * w, C[i][1] - dx / d * w]);
  }
  return { L, R, C };
}
// Closed outline of the ribbon from fraction a to b along it; skew slants the cut at a (R side starts later).
function aiRibPts(E, a = 0, b = 1, skew = 0) {
  const m = E.L.length - 1, ia = clamp(Math.round(a * m), 0, m), ib = clamp(Math.round(b * m), 0, m), ja = clamp(Math.round((a + skew) * m), 0, ib);
  return E.L.slice(ia, ib + 1).concat(E.R.slice(ja, ib + 1).reverse());
}
// Heart outline, about 2r wide.
function aiHeartPts(cx, cy, r, n = 22) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + 16 * Math.pow(Math.sin(a), 3) * r / 16, cy - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * r / 16]); }
  return p;
}
// Light pencil hatching for a shadow shape (scaled to her size): pass as aiPaint's hatch option.
const aiHatch = (col, ang = .9, k = 1) => ({ d: Math.max(2.6, AI_S.u * .058) * k, a: ang, o: { rand: .2 }, b: 'HB', c: col || AI_S.P.hatch, w: clamp(AI_S.u / 120, .35, .9) });
// Rotate a point around a pivot.
const aiRot = (p, c, a) => { const s = Math.sin(a), k = Math.cos(a), dx = p[0] - c[0], dy = p[1] - c[1]; return [c[0] + dx * k - dy * s, c[1] + dx * s + dy * k]; };

// ---------- head ----------
// Head units: the cranium is a circle of radius 1 at the head centre, y down. The chin sits at F.chin.
const AI_FACE = {
  full:  { eyeX: .4, eyeY: .4, ew: .215, eh: .28, mouthY: .83, noseY: .63, blushX: .53, blushY: .66, finY: .3, finL: .78, chin: 1.12, browY: -.02 },
  chibi: { eyeX: .43, eyeY: .45, ew: .255, eh: .33, mouthY: .82, noseY: .66, blushX: .6, blushY: .71, finY: .3, finL: .84, chin: 1.0, browY: .02 },
};
// Face contours (closed, the forehead is hidden under the bangs). Facing screen-right in q / side.
const AI_FACELINE = {
  full: {
    front: [[-.95, -.2], [-.95, .25], [-.86, .6], [-.6, .91], [-.27, 1.09], [0, 1.14], [.27, 1.09], [.6, .91], [.86, .6], [.95, .25], [.95, -.2], [.5, -.6], [-.5, -.6]],
    q:     [[-.95, -.2], [-.97, .25], [-.9, .6], [-.68, .9], [-.28, 1.08], [.34, 1.13], [.58, 1.02], [.78, .78], [.9, .52], [.94, .28], [.93, -.2], [.5, -.6], [-.5, -.6]],
    side:  [[-.2, -.3], [.55, -.62], [.82, -.3], [.88, .0], [.88, .22], [.85, .36], [.9, .46], [.99, .58, 1], [.92, .63], [.93, .7], [.9, .75], [.92, .8], [.87, .87], [.84, .95], [.76, 1.04], [.55, 1.07], [.3, 1.0], [.08, .8], [-.1, .45]],
  },
  chibi: {
    front: [[-.96, -.2], [-.98, .3], [-.93, .6], [-.74, .85], [-.4, .98], [0, 1.01], [.4, .98], [.74, .85], [.93, .6], [.98, .3], [.96, -.2], [.5, -.6], [-.5, -.6]],
    q:     [[-.96, -.2], [-.99, .3], [-.94, .62], [-.74, .87], [-.32, 1.0], [.3, 1.02], [.62, .9], [.84, .68], [.95, .4], [.96, -.2], [.5, -.6], [-.5, -.6]],
  },
};
// Where the features go per view. fx maps a front-view x to this view; ew = eye width factor per side (-1 near/left, 1 far/right).
const AI_HV = {
  front: { fx: a => a, bx: a => a, eyes: [[-1, 1], [1, 1]], mk: 1 },
  q:     { fx: a => .34 + a * (a < 0 ? .86 : .7), bx: a => a < 0 ? .3 + a * 1.27 : .3 + a * .63, eyes: [[-1, .9], [1, .68]], mk: .85 },
  side:  { fx: a => .62 + a * .35, bx: a => a, eyes: [[-1, .52]], mk: .5 },
};

// One eye at (cx, cy) in head units. s = which way its outer corner points (-1 = screen-left). wk = width factor.
// e = { kind, lid, lookX, lookY, mirror (highlights mirrored: the uncanny 'perfect' look) }.
function aiEye(H, cx, cy, s, wk, F, e) {
  const S = AI_S, P = S.P, sw = S.swF, kind = e.kind || 'normal';
  const big = kind === 'wide' || kind === 'perfect' || kind === 'heart';
  const w = F.ew * wk * (big ? 1.05 : 1), h = F.eh * (big ? 1.08 : 1);
  const X = (x, y) => H(cx + s * x, cy + y);
  const map = pts => pts.map(p => X(p[0], p[1]));
  const lerpU = (u) => -w + 2 * w * u;
  const botK = kind === 'soft' ? .78 : 1;
  const top0 = u => h * (lerp(.16, -.4, u) - .84 * Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .75));
  const bot = u => h * (lerp(.16, -.4, u) + botK * Math.pow(Math.sin(Math.PI * u), .55));
  let c = clamp(e.lid || 0);
  if (kind === 'soft') c = Math.max(c, .32);
  if (kind === 'sad') c = Math.max(c, .22);
  const top = u => lerp(top0(u), bot(u) - .06 * h, c);
  const N = 14;
  // closed shapes
  if (kind === 'happy') {   // ^ : a thick arc with a lash flick
    const A = map([[-w * .95, .3 * h], [-w * .3, -.38 * h], [w * .35, -.42 * h], [w * 1.0, .12 * h], [w * 1.12, .3 * h]]);
    aiLine(aiCurve(A, 5), sw * 1.5, P.lash);
    return;
  }
  if (c > .86 || kind === 'closed') {   // a shut lid: a soft downward curve with the lash tail
    const A = map([[-w * .95, .12 * h], [-w * .2, .42 * h], [w * .55, .36 * h], [w * 1.05, .05 * h], [w * 1.2, -.08 * h]]);
    aiLine(aiCurve(A, 5), sw * 1.4, P.lash);
    aiLine(map([[w * .2, .45 * h], [w * .25, .62 * h]]), sw * .5, P.lash);
    return;
  }
  // the opening (eye white)
  const O = [], Bt = [];
  for (let i = 0; i <= N; i++) { const u = i / N; O.push([lerpU(u), top(u)]); Bt.push([lerpU(u), bot(u)]); }
  aiPaint(map(O.concat(Bt.reverse())), { wash: P.white, ink: null });
  // ellipse ∩ opening, cos-spaced so the steep ends stay round
  const inEye = (ex, ey, rx, ry, n = 16) => {
    const T = [], B = [];
    for (let i = 0; i <= n; i++) {
      const x = ex - rx * Math.cos(Math.PI * i / n); if (x < -w || x > w) continue;
      const d = Math.sqrt(Math.max(0, 1 - Math.pow((x - ex) / rx, 2))), u = (x + w) / (2 * w);
      const yT = Math.max(ey - ry * d, top(u)), yB = Math.min(ey + ry * d, bot(u));
      if (yT < yB) { T.push([x, yT]); B.push([x, yB]); }
    }
    return map(T.concat(B.reverse()));
  };
  const lx = clamp(e.lookX || 0, -1, 1) * s * .28 * w, ly = clamp(e.lookY || 0, -1, 1) * .16 * h;
  const ix = lx - .04 * w, iy = .12 * h + ly, rx = .8 * w, ry = 1.0 * h;
  const ISh = inEye(ix, iy, rx, ry);
  if (kind === 'blank') {   // empty: one flat, pale iris, no pupil, no light
    aiPaint(ISh, { wash: mixCol(P.iris1, P.white, .45), ink: mixCol(P.iris0, P.white, .3), sw: sw * .5 });
    aiLine(map([[ix - rx * .8, iy + .1 * h], [ix + rx * .8, iy + .1 * h]]), sw * .4, mixCol(P.iris0, P.white, .2));
  } else {
    aiPaint(ISh, { wash: P.iris0, ink: P.iris0, sw: sw * .45 });
    aiPaint(inEye(ix, iy + .28 * h, rx * .82, ry * .72), { wash: P.iris1, ink: null });
    aiPaint(inEye(ix, iy + .6 * h, rx * .62, ry * .36), { wash: P.iris2, ink: null });
    aiPaint(inEye(ix, iy + .78 * h, rx * .34, ry * .16), { wash: P.iris3, ink: null, op: 200 });
    const pr = kind === 'perfect' ? .55 : kind === 'wide' ? .8 : 1;
    if (kind === 'heart') aiPaint(map(aiHeartPts(ix, iy, w * .36)), { wash: P.pupil, ink: null });
    else aiPaint(inEye(ix, iy - .02 * h, rx * .4 * pr, ry * .46 * pr, 12), { wash: P.pupil, ink: null });
    if (kind === 'perfect') aiPaint(inEye(ix, iy, rx * .62, ry * .62), { ink: P.iris3, sw: sw * .35 });   // a thin bright ring
    if (S.k > 20) for (const a of [-.5, 0, .5]) {   // fine streaks radiating down from the pupil
      const x0 = ix + Math.sin(a) * rx * .32, y0 = iy + Math.cos(a) * ry * .4, x1 = ix + Math.sin(a) * rx * .7, y1 = iy + Math.cos(a) * ry * .78;
      if (y1 < bot((x1 + w) / (2 * w)) && y0 > top((x0 + w) / (2 * w))) aiLine(map([[x0, y0], [x1, y1]]), sw * .25, mixCol(P.iris1, P.iris3, .5));
    }
    aiPaint(ISh, { ink: mixCol(P.iris0, P.lash, .5), sw: sw * .4 });
  }
  // the lid's shadow on the eyeball
  const LS = []; for (let i = 0; i <= N; i++) LS.push([lerpU(i / N), top(i / N)]);
  for (let i = N; i >= 0; i--) LS.push([lerpU(i / N), Math.min(bot(i / N), top(i / N) + .22 * h)]);
  aiPaint(map(LS), { wash: P.iris0, op: 90, ink: null });
  // highlights: light from the upper left of the screen (or mirrored: 'perfect' is too symmetrical)
  if (kind !== 'blank') {
    const side = e.mirror ? -1 : s, hx = ix - side * .3 * w, hy = iy - .45 * h;
    if (kind === 'heart') {
      const hb = 1 + .15 * Math.sin(T * 9);
      aiPaint(map(aiHeartPts(hx, hy, w * .3 * hb)), { wash: P.hi, ink: null });
      aiPaint(map(aiHeartPts(ix + side * .32 * w, iy + .42 * h, w * .14)), { wash: '#FFD6E6', ink: null });
    } else {
      aiPaint(inEye(hx, hy, w * .27, h * .2, 10), { wash: P.hi, ink: null });
      aiPaint(inEye(ix + side * .34 * w, iy + .44 * h, w * .12, h * .09, 8), { wash: P.hi, ink: null });
      aiPaint(inEye(ix - side * .02 * w, iy + .18 * h, w * .05, h * .04, 6), { wash: P.hi, ink: null, op: 200 });
      if (kind === 'wide') aiPaint(inEye(ix + side * .05 * w, iy - .62 * h, w * .07, h * .06, 6), { wash: P.hi, ink: null });
    }
  }
  if (kind === 'sad') {   // a welling tear film along the lower lid
    const TF = []; for (let i = 3; i <= N - 1; i++) TF.push([lerpU(i / N), bot(i / N) - .2 * h]);
    for (let i = N - 1; i >= 3; i--) TF.push([lerpU(i / N), bot(i / N) + .04 * h]);
    aiPaint(map(TF), { wash: '#DDF6FF', op: 170, ink: null });
    aiPaint(inEye(ix - .25 * w, iy + .5 * h, w * .1, h * .07, 6), { wash: P.hi, ink: null });
    const tp = X(w * .85, bot(.92) + .1 * h), r = h * .2 * S.k, ph = frac(T * .5 + (s > 0 ? .5 : 0)), dy = ph * 1.4 * h * S.k;   // a tear rolling off the outer corner
    aiPaint(aiLoop([[tp[0], tp[1] + dy - 1.5 * r, 1], [tp[0] + .8 * r, tp[1] + dy + .2 * r], [tp[0], tp[1] + dy + .9 * r], [tp[0] - .8 * r, tp[1] + dy + .2 * r]], 4), { wash: '#CBEFFF', ink: P.line, sw: sw * .35 });
  }
  // upper lash: thick toward the outer corner, with a flick and two little lashes
  const th = u => h * (.09 + .24 * Math.pow(u, 1.3)) * (1 - c * .3);
  const L1 = [], L2 = [];
  for (let i = 0; i <= N; i++) { const u = i / N; L1.push([lerpU(u), top(u) - th(u)]); L2.push([lerpU(u), top(u) + .02 * h]); }
  const tu = top(1);
  L1.push([w * 1.2, tu - .3 * h]); L1.push([w * 1.24, tu - .26 * h, 1]); L1.push([w * 1.08, tu + .06 * h]);
  aiPaint(map(L1.concat(L2.reverse())), { wash: P.lash, ink: P.lash, sw: sw * .35 });
  for (const [u0, len, ang] of [[.8, .26, -.55], [.93, .24, -.1]]) {
    const b0 = [lerpU(u0) - .06 * w, top(u0) - th(u0) + .02 * h], b1 = [lerpU(u0) + .1 * w, top(u0) - th(u0) + .04 * h];
    aiPaint(map([b0, [b0[0] + .1 * w + Math.cos(ang) * len * h, b0[1] - Math.sin(-ang + 1.2) * len * h, 1], b1]), { wash: P.lash, ink: null });
  }
  // lower lid: a short soft line, and a double-lid crease above
  const lo = []; for (let i = 4; i <= N - 1; i++) lo.push([lerpU(i / N), bot(i / N) + .03 * h]);
  aiLine(map(lo), sw * .45, mixCol(P.lash, P.skinSh, .35));
  for (const [u0, dx, dy] of [[.74, .05, .16], [.86, .09, .13]]) { const b0 = [lerpU(u0), bot(u0) + .03 * h]; aiLine(map([b0, [b0[0] + dx * w, b0[1] + dy * h]]), sw * .3, mixCol(P.lash, P.skinSh, .3)); }
  if (c < .5) { const cr = []; for (let i = 3; i <= 11; i++) cr.push([lerpU(i / N) + .04 * w, top0(i / N) - th(i / N) - .2 * h]); aiLine(map(cr), sw * .3, mixCol(P.lash, P.skin, .45)); }
}

// Mouths, at (mx, my) in head units; mw scales width (3/4 and profile narrow it).
function aiMouth(H, mx, my, mw, kind, F) {
  const S = AI_S, P = S.P, sw = S.swF, z = F === AI_FACE.chibi ? 1.25 : 1;
  const M = pts => pts.map(([a, b, c]) => { const p = H(mx + a * mw * z, my + b * z); return c ? [p[0], p[1], 1] : p; });
  const line = (pts, k = 1) => aiLine(aiCurve(M(pts), 4), sw * .75 * k, P.ink);
  const open = (pts, tongue, teeth) => {
    aiPaint(aiLoop(M(pts), 4), { wash: P.mouth, ink: P.ink, sw: sw * .6 });
    if (teeth) aiPaint(aiLoop(M(teeth), 3), { wash: P.teeth || P.white, ink: null });
    if (tongue) aiPaint(aiLoop(M(tongue), 3), { wash: P.tongue, ink: null });
  };
  switch (kind || 'smile') {
    case 'smile': line([[-.11, -.025], [-.05, .015], [.05, .015], [.11, -.025]]); break;
    case 'cat': line([[-.12, -.01], [-.06, .03], [0, -.005], [.06, .03], [.12, -.01]], .9); break;
    case 'frown': line([[-.1, .03], [0, -.01], [.1, .03]]); break;
    case 'flat': line([[-.07, .01], [.07, .01]], .8); break;
    case 'wobble': line([[-.11, .02], [-.055, -.01], [0, .02], [.055, -.01], [.11, .02]], .8); break;
    case 'open': case 'A': open([[-.13, -.03, 1], [0, -.005], [.13, -.03, 1], [.09, .08], [0, .15], [-.09, .08]], [[-.07, .1], [0, .075], [.07, .1], [.035, .14], [-.035, .14]]); break;
    case 'I': open([[-.14, -.015, 1], [0, -.005], [.14, -.015, 1], [.1, .04], [0, .055], [-.1, .04]], null, [[-.11, -.008], [.11, -.008], [.09, .018], [-.09, .018]]); break;
    case 'E': open([[-.13, -.02, 1], [0, -.005], [.13, -.02, 1], [.1, .06], [0, .09], [-.1, .06]], [[-.06, .07], [0, .055], [.06, .07], [0, .085]], [[-.1, -.01], [.1, -.01], [.08, .02], [-.08, .02]]); break;
    case 'U': open([[-.045, .0], [0, -.02], [.045, .0], [.04, .06], [0, .075], [-.04, .06]]); break;
    case 'O': open([[-.075, .0], [0, -.04], [.075, .0], [.07, .1], [0, .14], [-.07, .1]], [[-.045, .1], [0, .085], [.045, .1], [0, .125]]); break;
    case 'perfect': {   // too wide, too even: a crescent of identical teeth
      const C = [[-.25, -.07, 1], [-.12, .02], [0, .045], [.12, .02], [.25, -.07, 1], [.12, .08], [0, .1], [-.12, .08]];
      aiPaint(aiLoop(M(C), 4), { wash: P.teeth || P.white, ink: P.ink, sw: sw * .55 });
      for (let i = -3; i <= 3; i++) { const x = i * .055; aiLine(M([[x, .03 - .02 * Math.abs(i) / 3], [x, .085 - .03 * Math.abs(i) / 3]]), sw * .3, P.line); }
      for (const sd of [-1, 1]) aiLine(M([[sd * .25, -.07], [sd * .29, -.1]]), sw * .5, P.ink);
      break;
    }
  }
}

// Whale-fin ear at (ax, ay) head units, pointing outward s (-1 left), lift = -1 droop .. 1 perk, L = length: a flipper,
// dark on top with a pale scalloped underside.
function aiFin(H, ax, ay, s, lift, L, flap = 0) {
  const P = AI_S.P, sw = AI_S.swF, a = .42 - lift * .42 + flap;
  const R = (x, y) => { const c = Math.cos(a), sn = Math.sin(a), X = x * L, Y = y * L; return H(ax + s * (X * c - Y * sn), ay + X * sn + Y * c); };
  const M = pts => pts.map(p => { const q = R(p[0], p[1]); return p[2] ? [q[0], q[1], 1] : q; });
  const out = [[-.08, -.26], [.28, -.3], [.62, -.22], [.88, -.06], [1.06, .16, 1], [.84, .16], [.62, .22], [.38, .3], [.12, .36], [-.08, .3]];
  aiPaint(aiLoop(M(out), 4), { wash: P.fin, ink: P.ink, sw: sw * .7 });
  const inn = [[.0, .1], [.3, .1], [.6, .05], [.9, .1, 1], [.74, .16], [.66, .2], [.54, .2], [.44, .27], [.3, .28], [.18, .34], [.04, .3]];
  aiPaint(aiLoop(M(inn), 3), { wash: P.finIn, ink: null });
  aiLine(M([[.1, -.12], [.45, -.14], [.78, -.04]]), sw * .35, mixCol(P.fin, P.finIn, .45));
  aiLine(M([[.08, .0], [.4, -.02], [.7, .02]]), sw * .28, mixCol(P.fin, P.finIn, .3));
  aiLine(M([[-.02, -.2], [.3, -.25], [.6, -.18]]), sw * .3, mixCol(P.fin, P.hi, .35));
}

// ---------- hair ----------
// A clump: a ribbon from root to tip, washed root-dark to tip-light. Each lighter step starts with a pointed tongue
// reaching up the clump (the anime "dip-dyed" gradient), then the clump is inked once.
function aiClump(Pts, Wd, o = {}) {
  const S = AI_S, C = S.P, E = aiRib(Pts, Wd, 5), m = E.L.length - 1;
  const bands = o.bands || [[0, C.hair0], [.2, C.hair1], [.47, C.hair2], [.67, C.hair3], [.85, C.hair4]];
  for (let b = 0; b < bands.length; b++) {
    const [a, col] = bands[b];
    if (!a) { aiPaint(aiRibPts(E), { wash: col, ink: null }); continue; }
    const tong = .07 + .05 * hash(b * 3.1 + (o.seed || 0)), ic = clamp(Math.round(a * m), 0, m), ie = clamp(Math.round((a + tong) * m), 0, m);
    const side = hash(b + (o.seed || 0) * 1.7) < .5 ? .3 : .7, apex = [lerp(E.L[ic][0], E.R[ic][0], side), lerp(E.L[ic][1], E.R[ic][1], side)];
    aiPaint([apex].concat(E.L.slice(ie)).concat(E.R.slice(ie).reverse()), { wash: col, ink: null, op: o.op ?? 255 });
  }
  if (o.shade) aiPaint(E.R.slice(Math.round(m * .08), Math.round(m * .7)).concat(E.C.slice(Math.round(m * .08), Math.round(m * .7)).reverse()), { wash: C.hair0, op: 80, ink: null, hatch: S.u > 30 ? aiHatch(C.hair0, .5) : null });
  aiPaint(aiRibPts(E), { ink: C.hairInk, sw: (o.sw ?? S.sw * .75) * (o.fine ? .85 : .7), br: o.fine ? S.P.br : S.P.brS });
  if (o.hi !== false && m > 8) {   // a light streak on the lit edge
    const a = Math.round(m * (o.hiA ?? .14)), b = Math.round(m * (o.hiB ?? .5));
    aiLine(E.C.slice(a, b).map((p, i) => [lerp(p[0], E.L[a + i][0], .62), lerp(p[1], E.L[a + i][1], .62)]), S.sw * .38, mixCol(C.hair2, C.hair4, .45));
  }
  if (o.strand !== false) {   // a strand line down the clump's upper part
    const a = Math.round(m * .1), b = Math.round(m * (o.strandTo ?? .6)), f = o.strandSide ?? .3;
    aiLine(E.C.slice(a, b).map((p, i) => [lerp(p[0], E.L[a + i][0], f), lerp(p[1], E.L[a + i][1], f)]), S.sw * .32, mixCol(C.hairInk, C.hair2, .35));
  }
  return E;
}
// Wavy lock centreline: from root (x0, y0) down to depth len, drifting out to xEnd; waves grow toward the tip, the tip
// curls out. Points in head units; s = side (+1 right), sway trails the tips.
function aiWave(x0, y0, x1, len, s, amp, ph, sway, n = 7, curl = .18) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n, y = lerp(y0, len, Math.pow(k, .95));
    let x = lerp(x0, x1, Math.pow(k, .7)) + s * amp * Math.pow(k, 1.1) * Math.sin(k * 9.4 + ph);
    if (i === n) x += s * curl;
    pts.push([x + sway * Math.pow(k, 1.6), i === n ? y - curl * .6 : y]);
  }
  return pts;
}

// Back hair behind the body (front / q views): a dark inner mass and wavy clumps that puff out below the fins and fall
// past the waist. Inner clumps first, so the outer ones overlap them.
function aiBackHair(H, Hf, view, sway) {
  const C = AI_S.P, len = Hf.len, sp = Hf.spread, q = view === 'q', k = AI_S.k;
  const sh = q ? -.12 : 0, wq = s => q ? (s < 0 ? 1.12 : .82) : 1;
  const back = [[-.92, -.3], [-1.02, .6], [-1.12, len * .45], [-.95, len * .7], [.95, len * .7], [1.12, len * .45], [1.02, .6], [.92, -.3], [0, -1.0]];
  aiPaint(aiLoop(back.map(([a, b]) => H(a * (q ? (a < 0 ? 1.12 : .7) : 1) + sh, b)), 4), { wash: mixCol(C.hair0, C.hair1, .6), ink: null });
  // under-layer: darker locks between and behind the main ones (depth)
  for (const s of [-1, 1]) for (let j = 0; j < 4; j++) {
    if (q && s > 0 && j < 2) continue;
    const key = 60 + j * 2 + (s > 0 ? 1 : 0), w = wq(s), tipL = len * (.8 + .12 * hash(key));
    const x1 = (sp - .15 + (j - 1.5) * .22), amp = (.18 + .06 * hash(key + 2)) * (len > 4 ? 1.5 : 1);
    const pts = aiWave(.85 + .05 * j, -.3 + .12 * j, x1, tipL, 1, amp, j * .7 + 2.1 + (s > 0 ? .5 : 0), 0, 7, .18)
      .map(([a, b], i) => H(s * (i === 1 ? Math.max(a, .96 + .06 * j) : a) * w + sh + sway * .8 * Math.pow(i / 7, 1.6), b));
    const wd = .6 * k * (len > 4 ? 1.2 : 1);
    aiClump(pts, [wd * .3, wd * .7, wd, wd * .95, wd * .8, wd * .6, wd * .34, wd * .04], { sw: AI_S.sw * .6, seed: key, strand: false, hi: false, shade: true, bands: [[0, mixCol(C.hair0, C.hair1, .5)], [.4, mixCol(C.hair1, C.hair0, .2)], [.62, mixCol(C.hair2, C.hair1, .3)], [.83, C.hair3]] });
  }
  for (const s of [-1, 1]) for (let j = 0; j < 5; j++) {
    const key = j * 2 + (s > 0 ? 1 : 0), tipL = len * (.88 + .14 * hash(key + 3)), w = wq(s);
    const x1 = (sp + (j - 2.4) * .2) * (j === 4 ? 1.06 : 1);
    const amp = (.2 + .06 * hash(key + 7)) * (len > 4 ? 1.6 : 1);
    const pts = aiWave(.82 + .05 * j, -.5 + .12 * j, x1, tipL, 1, amp, j * .55 + (s > 0 ? .9 : 0), 0, 7, .22)
      .map(([a, b], i) => H(s * (i === 1 ? Math.max(a, .98 + .07 * j) : a) * w + sh + sway * Math.pow(i / 7, 1.6), b));
    const wd = (.66 - .05 * Math.abs(j - 2.5)) * k * (len > 4 ? 1.25 : 1);
    aiClump(pts, [wd * .35, wd * .75, wd * 1.02, wd * .95, wd * .82, wd * .62, wd * .36, wd * .04], { sw: AI_S.sw * .7, seed: key, strandTo: .5, bands: [[0, C.hair1], [.45, C.hair2], [.66, C.hair3], [.85, C.hair4]] });
    if (j >= 3) {   // a stray strand peeling off near the tip
      const st = pts.slice(4).map(([a, b], i) => [a + s * (.05 + .04 * i) * k, b + .05 * k * i]);
      aiClump(st, [wd * .3, wd * .22, wd * .12, wd * .02], { bands: [[0, C.hair2], [.4, C.hair3], [.7, C.hair4]], strand: false, hi: false, fine: true, sw: AI_S.sw * .5, seed: key + 40 });
    }
  }
}

// Side locks: in front of the shoulders, framing the face (front / q). A thick lock and a thin face-framing strand.
function aiSideLocks(H, Hf, view, sway, only) {
  const q = view === 'q', C = AI_S.P, k = AI_S.k;
  for (const s of [-1, 1]) {
    if (only && only !== s) continue;
    const near = !q || s < 0, x0 = q ? (s < 0 ? -.86 : .9) : s * .86, ln = Hf.side * (near ? 1 : .82);
    const back = aiWave(0, -.05, .22, ln * .9, 1, .14, s > 0 ? 3 : .4, 0, 5, .1).map(([a, b], i) => H(x0 + s * (.12 + a) * (q && s > 0 ? .5 : 1) + sway * Math.pow(i / 5, 1.5), b));
    if (near) aiClump(back, [.16, .24, .22, .18, .1, .02].map(v => v * k), { bands: [[0, C.hair1], [.45, C.hair2], [.68, C.hair3], [.86, C.hair4]], strand: false, hi: false, seed: s + 29 });
    const raw = aiWave(.86, -.12, 1.08, ln, 1, ln > 2.2 ? .22 : .15, s > 0 ? 2.2 : 1.2, 0, 6, .12);
    const pts = raw.map(([a, b], i) => H(x0 + s * (a - .86) * (q && s > 0 ? .5 : 1) + sway * Math.pow(i / 6, 1.5), b));
    const w0 = (near ? .34 : .24) * k;
    aiClump(pts, [w0 * .8, w0, w0 * .95, w0 * .85, w0 * .7, w0 * .45, w0 * .05], { bands: [[0, C.hair1], [.42, C.hair2], [.64, C.hair3], [.84, C.hair4]], strandTo: .7, seed: s + 9 });
    const fx = q ? (s < 0 ? -.72 : .8) : s * .72;
    const f = aiWave(0, -.08, .1, Hf.frame, 1, .06, s > 0 ? 1 : 2, 0, 4, .05).map(([a, b], i) => H(fx + s * a + sway * .5 * Math.pow(i / 4, 2), b));
    aiClump(f, [.1, .14, .12, .08, .01].map(v => v * k), { bands: [[0, C.hair1], [.55, C.hair2], [.8, C.hair3]], strand: false, sw: AI_S.sw * .55, seed: s + 19 });
  }
}

// Bangs and the hair cap: the crown arc plus a row of pointed clumps across the forehead. Each clump is [left notch x,
// right notch x, tip x, tip y]; notch heights come from AI_NOTCH. Sides of each clump bulge a little, like real locks.
const AI_BANGC = [[-1.05, -.8, -.96, .6], [-.8, -.52, -.7, .34], [-.52, -.22, -.4, .3], [-.24, .03, -.1, .5], [.01, .29, .12, .27], [.27, .58, .44, .36], [.56, .84, .74, .3], [.82, 1.05, .97, .6]];
const AI_NOTCH = x => x < -1 || x > 1 ? .3 : .02 - .1 * Math.cos(x * 1.4) + .1 * x * x;
const AI_BANGS = (() => {
  const o = [[-1.05, .3]];
  for (const [l, r, tx, ty] of AI_BANGC) {
    const nl = [l, AI_NOTCH(l)], nr = [r, AI_NOTCH(r)];
    o.push([lerp(nl[0], tx, .45) - .03, lerp(nl[1], ty, .45)], [tx, ty, 1], [lerp(nr[0], tx, .45) + .03, lerp(nr[1], ty, .45)], nr);
  }
  return o;
})();
function aiCap(H, V, view) {
  const S = AI_S, C = S.P, sw = S.sw;
  let cap;
  if (view === 'side') {
    cap = [[-1.02, .7], [-1.1, .15], [-1.0, -.45], [-.65, -.9], [-.05, -1.09], [.5, -.97], [.84, -.62], [.96, -.25], [.98, .1, 1], [.88, -.06], [.86, .26, 1], [.74, -.04], [.66, .22, 1], [.55, -.06], [.42, .34, 1], [.3, .02], [.08, .06], [-.16, .14], [-.3, .42], [-.3, .82], [-.4, 1.2, 1], [-.5, .98], [-.64, 1.32, 1], [-.72, 1.02], [-.88, 1.22, 1]];
  } else {
    const cx = view === 'q' ? -.05 : 0, rx = view === 'q' ? 1.12 : 1.09;
    cap = [];
    for (let i = 0; i <= 12; i++) { const a = (15 - i * 17.5) * Math.PI / 180; cap.push([cx + Math.cos(a) * rx * (1 + .025 * Math.sin(i * 2.3)), -.02 + Math.sin(a) * 1.07]); }
    for (const b of AI_BANGS.slice(1, -1)) cap.push(b[2] ? [V.bx(b[0]), b[1], 1] : [V.bx(b[0]), b[1]]);
  }
  const pts = aiLoop(cap.map(p => { const h = H(p[0], p[1]); return p[2] ? [h[0], h[1], 1] : h; }), 4);
  aiPaint(pts, { wash: mixCol(C.hair1, C.hair2, .3), ink: C.hairInk, sw: sw * .75 });
  // a darker crown, strand lines up from the notches, and the shine band across the crown
  if (view !== 'side') {
    const cr = []; for (let i = 0; i <= 10; i++) { const a = (-165 + i * 15) * Math.PI / 180; cr.push(H(V.bx(Math.cos(a) * .95), -.02 + Math.sin(a) * 1.0)); }
    for (let i = 10; i >= 0; i--) { const a = (-165 + i * 15) * Math.PI / 180; cr.push(H(V.bx(Math.cos(a) * .7), -.1 + Math.sin(a) * .62)); }
    aiPaint(cr, { wash: C.hair0, op: 120, ink: null });
  }
  const notches = view === 'side' ? [[.88, -.06], [.74, -.04], [.55, -.06]] : AI_BANGS.filter(b => !b[2]).slice(1, -1).filter((b, i) => i % 3 === 0).map(b => [V.bx(b[0]), b[1]]);
  for (const [nx, ny] of notches) aiLine([H(nx, ny), H(nx * .85, ny - .2), H(nx * .62, ny - .4)], sw * .3, mixCol(C.hair0, C.hair1, .45));
  if (view !== 'side') for (const [l, r, tx, ty] of AI_BANGC) { const mx = V.bx(lerp(l, r, .55)); aiLine([H(mx * .8, -.45), H(lerp(mx, V.bx(tx), .6), ty * .45), H(V.bx(tx), ty - .08)], sw * .26, mixCol(C.hair0, C.hair1, .65)); }
  if (view !== 'side') {   // a few locks lying over the bangs, for layering
    for (const [x0, x1, y1, w0] of [[-.5, -.66, .3, .16], [.1, -.02, .44, .13], [.55, .74, .32, .15]]) {
      const pts = [[x0 * .7, -.62], [lerp(x0, x1, .45), -.15], [lerp(x0, x1, .85), y1 * .7], [x1, y1]].map(([a, b]) => H(V.bx(a), b));
      aiClump(pts, [w0 * .7, w0, w0 * .7, .01].map(v => v * S.k), { bands: [[0, mixCol(C.hair1, C.hair2, .3)], [.7, C.hair2]], strand: false, hi: false, fine: true, sw: sw * .4, seed: x0 * 10 });
    }
  }
  // flyaways: stray hairs off the silhouette
  const fly = view === 'side' ? [[[-.3, -1.05], [-.5, -1.2], [-.72, -1.18]], [[-1.0, -.4], [-1.18, -.5], [-1.28, -.42]], [[.6, -.85], [.75, -1.0], [.9, -1.02]]]
    : [[[-.55, -.86], [-.72, -1.04], [-.92, -1.06]], [[.3, -1.0], [.42, -1.16], [.56, -1.2]], [[-1.04, -.2], [-1.22, -.32], [-1.34, -.26]], [[1.05, .05], [1.24, -.04], [1.32, .04]], [[.96, -.5], [1.1, -.66], [1.2, -.64]]];
  for (const f of fly) aiLine(f.map(([a, b]) => H(view === 'side' ? a : V.bx(a) * (Math.abs(a) > 1 ? 1 : 1), b)), sw * .3, C.hairInk, S.P.br);
  if (view === 'side') {
    aiPaint([H(.05, -.72), H(.4, -.66), H(.62, -.5), H(.5, -.47), H(.42, -.55), H(.3, -.5), H(.18, -.6), H(.05, -.56)], { wash: C.hairHi, ink: null });
  } else {
    const sh = []; const n = 9;
    for (let i = 0; i <= n; i++) { const a = (-150 + i * 120 / n) * Math.PI / 180; sh.push(H(V.bx(Math.cos(a) * .82), -.05 + Math.sin(a) * .74)); }
    for (let i = n; i >= 0; i--) { const a = (-150 + i * 120 / n) * Math.PI / 180, r = i % 2 ? .62 : .69; sh.push(H(V.bx(Math.cos(a) * .82 * r / .74), -.05 + Math.sin(a) * r)); }
    aiPaint(sh, { wash: C.hairHi, op: 190, ink: null });
  }
}

// The ahoge: one big curl from the crown. wob = sideways spring (rad).
function aiAhoge(H, view, wob) {
  const C = AI_S.P, base = view === 'side' ? [-.1, -1.0] : [.06, -1.0];
  const P0 = [[0, 0], [-.04, -.32], [-.2, -.6], [-.48, -.66], [-.62, -.5], [-.55, -.34]];
  const pts = P0.map(([a, b], i) => { const r = aiRot([a, b], [0, 0], wob * i / 5); return H(base[0] + r[0], base[1] + r[1]); });
  aiClump(pts, [.13, .13, .11, .085, .055, .01].map(v => v * AI_S.k), { bands: [[0, C.hair1], [.55, C.hair2]], strand: false, sw: AI_S.sw * .6 });
}

// The maid headdress: a band over the crown with a scalloped frill behind it, and a light-blue bow.
function aiHeaddress(H, view, F) {
  const S = AI_S, C = S.P, sw = S.swF;
  if (view === 'side') {   // in profile: a band from the crown down behind the ear, the frill standing up behind it
    const L = aiCurve([[.42, -1.04], [.2, -1.03], [-.02, -.88], [-.14, -.58], [-.18, -.26], [-.16, -.02]], 6), m = L.length;
    const nrm = i => { const a = L[Math.max(0, i - 1)], b = L[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1; return [dy / d, -dx / d]; };
    const out = L.map((p, i) => { const n = nrm(i), r = .07 + .2 * Math.pow(Math.abs(Math.sin(i / (m - 1) * 6 * Math.PI)), .45); return [p[0] - n[0] * r, p[1] - n[1] * r]; });
    aiPaint(out.concat(L.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .55 });
    const b1 = L.map((p, i) => { const n = nrm(i); return [p[0] - n[0] * .07, p[1] - n[1] * .07]; }), b2 = L.map((p, i) => { const n = nrm(i); return [p[0] + n[0] * .06, p[1] + n[1] * .06]; });
    aiPaint(b1.concat(b2.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .5 });
    aiLine(L.map(p => H(p[0], p[1])), sw * .3, C.creamSh);
    return;
  }
  const q = view === 'q';
  const cx = q ? .02 : 0, rx = 1.0, ry = .97, a0 = -160, a1 = -20;
  const arc = (r, n, f = () => 0) => { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180, rr = r + f(t); o.push([cx + Math.cos(a) * rx * rr, .02 + Math.sin(a) * ry * rr]); } return o; };
  const n = 11, sc = t => .21 * Math.pow(Math.abs(Math.sin(t * n * Math.PI)), .45);
  const inner = arc(1.03, 40), outer = arc(1.07, 60, t => sc(t) + .02);
  aiPaint(outer.concat(inner.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  for (let j = 1; j < n; j++) {   // crease lines into each scallop valley
    const t = j / n, a = (a0 + (a1 - a0) * t) * Math.PI / 180;
    aiLine([H(cx + Math.cos(a) * rx * 1.08, .02 + Math.sin(a) * ry * 1.08), H(cx + Math.cos(a) * rx * 1.2, .02 + Math.sin(a) * ry * 1.2)], sw * .3, C.creamSh);
  }
  const bandO = arc(1.09, 30), bandI = arc(.96, 30);
  aiPaint(bandO.concat(bandI.slice().reverse()).map(p => H(p[0], p[1])), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiLine(arc(1.0, 24).map(p => H(p[0], p[1])), sw * .3, C.creamSh);
  // the light-blue bow at the screen-right end of the band
  const bp = q ? [.88, -.36] : [.9, -.32], bs = (F === AI_FACE.chibi ? 1.0 : .95) * (q ? .85 : 1), ra = -.45;
  const B = pts => pts.map(([a, b, c]) => { const r = aiRot([a * bs, b * bs], [0, 0], ra), h = H(bp[0] + r[0], bp[1] + r[1]); return c ? [h[0], h[1], 1] : h; });
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[0, 0, 1], [sd * .1, -.13], [sd * .24, -.14], [sd * .26, .0], [sd * .2, .09], [sd * .06, .05]]), 4), { wash: C.bow, ink: C.ink, sw: sw * .5 });
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[sd * .02, .03], [sd * .08, .14], [sd * .1, .26, 1], [sd * .15, .21], [sd * .2, .25, 1], [sd * .07, .03]]), 3), { wash: C.bowSh, ink: C.ink, sw: sw * .4 });
  aiPaint(aiLoop(B([[-.05, -.04], [.05, -.04], [.055, .045], [-.055, .045]]), 3), { wash: C.bowSh, ink: C.ink, sw: sw * .45 });
  for (const sd of [-1, 1]) aiLine(B([[sd * .08, -.02], [sd * .17, -.07]]), sw * .3, C.bowSh);
}

// ---------- body ----------
// Form geometry, in u (body-local: x right, y up is negative, soles at y = 0, crown at y = -10).
const AI_FORM = {
  full: {
    k: .72, hc: [0, -9.28], len: 5.1, spread: 1.95, side: 2.8, frame: 1.5,
    neck: [-8.75, -8.3, .115], shY: -8.12, shW: .8, armpitY: -7.42, armW: .7, bustY: -7.22, waistY: -6.62, waistW: .46,
    skirt: [-6.62, .48, -1.62, 1.8], petti: .3, apron: [-6.62, .42, -3.5, .74, .15],
    arm: [1.22, 1.1, .4], armWd: [.27, .25, .22, .2], puff: [.24, .2],
    leg: [.22, -1.75, -.95, -.3, .27, .4], tail: [[.5, -3.2], [1.25, -2.85], [1.78, -3.25], [1.98, -3.95], [1.98, -4.6]], tailW: [.5, .46, .37, .27, .18], fluke: .8,
    bow: .9, whale: .3, emb: 12
  },
  chibi: {
    k: 1.9, hc: [0, -8.1], len: 3.15, spread: 1.42, side: 1.85, frame: 1.25,
    neck: [-6.5, -5.95, .2], shY: -5.95, shW: .66, armpitY: -5.55, armW: .62, bustY: -5.42, waistY: -4.85, waistW: .56,
    skirt: [-4.85, .58, -1.62, 1.62], petti: .32, apron: [-4.85, .48, -2.55, .9, .18],
    arm: [.8, .7, .46], armWd: [.38, .36, .34, .32], puff: [.25, .22],
    leg: [.36, -1.75, -1.05, -.38, .38, .56], tail: [[.6, -2.3], [1.3, -1.8], [1.88, -2.0], [2.15, -2.6], [2.2, -3.2]], tailW: [.55, .52, .43, .32, .21], fluke: .85,
    bow: 1.15, whale: .36, emb: 9
  }
};

// A frilled band along a polyline: the scalloped edge sits d to the left of the path direction (d < 0: to the right).
// Valley creases and fluting lines make it read as a real ruffle; o.double adds a deeper, shaded ruffle behind it.
function aiFrill(Pts, d, n, o = {}) {
  const S = AI_S, C = S.P, Cv = aiCurve(Pts, Math.max(4, Math.ceil(n * 7 / (Pts.length - 1)))), m = Cv.length, inner = [], outer = [], outer2 = [];
  for (let i = 0; i < m; i++) {
    const a = Cv[Math.max(0, i - 1)], b = Cv[Math.min(m - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1;
    const t = i / (m - 1), bump = Math.pow(Math.abs(Math.sin(t * n * Math.PI)), .5), r = d * (.5 + .5 * bump);
    const r2 = d * 1.45 * (.55 + .45 * Math.pow(Math.abs(Math.cos(t * n * Math.PI)), .5));
    inner.push(Cv[i]); outer.push([Cv[i][0] - dy / dd * r, Cv[i][1] + dx / dd * r]); outer2.push([Cv[i][0] - dy / dd * r2, Cv[i][1] + dx / dd * r2]);
  }
  const sw = o.sw ?? S.sw * .55;
  if (o.double) aiPaint(inner.concat(outer2.slice().reverse()), { wash: mixCol(C.cream, C.creamSh, .45), ink: C.ink, sw: sw * .8 });
  aiPaint(inner.concat(outer.slice().reverse()), { wash: o.col || C.cream, ink: C.ink, sw });
  if (o.shade) aiPaint(inner.concat(inner.map((p, i) => [lerp(p[0], outer[i][0], .38), lerp(p[1], outer[i][1], .38)]).reverse()), { wash: C.creamSh, op: 120, ink: null });
  for (let j = 1; j < n; j++) { const i = Math.round(j / n * (m - 1)); aiLine([inner[i], [lerp(inner[i][0], outer[i][0], .8), lerp(inner[i][1], outer[i][1], .8)]], S.sw * .3, mixCol(C.creamSh, C.ink, .15)); }
  if (S.u > 25 && o.flute !== false) for (let j = 0; j < n; j++) { const i = Math.round((j + .5) / n * (m - 1)); aiLine([[lerp(inner[i][0], outer[i][0], .25), lerp(inner[i][1], outer[i][1], .25)], [lerp(inner[i][0], outer[i][0], .7), lerp(inner[i][1], outer[i][1], .7)]], S.sw * .22, C.creamSh); }
}

// A hand at p, pointing along angle a (rad, 0 = +x), length L. kind: relax | open | fist. th = thumb side (+1 / -1).
function aiHand(p, a, L, kind, th, chibi) {
  const C = AI_S.P, sw = AI_S.sw * .55;
  const R = (x, y) => { const c = Math.cos(a), n = Math.sin(a); return [p[0] + (x * c - y * th * n) * L, p[1] + (x * n + y * th * c) * L]; };
  const M = pts => pts.map(q => q[2] ? [...R(q[0], q[1]), 1] : R(q[0], q[1]));
  if (chibi || kind === 'fist') {   // a round little fist
    aiPaint(aiLoop(M([[-.05, -.4], [.35, -.46], [.62, -.42], [.8, -.3], [.92, -.1], [.95, .1], [.84, .3], [.62, .42], [.3, .45], [-.05, .32]]), 4), { wash: C.skin, ink: C.ink, sw });
    for (const k of [-.18, .02, .2]) aiLine(M([[.62, k - .06], [.8, k], [.88, k + .05]]), sw * .45, mixCol(C.skinSh, C.ink, .3));
    aiPaint(aiLoop(M([[.05, -.3], [.4, -.38], [.62, -.3], [.58, -.18], [.3, -.16], [.08, -.12]]), 3), { wash: C.skin, ink: C.ink, sw: sw * .8 });
    return;
  }
  if (kind === 'open') {   // palm out, fingers a little apart (waving, offering)
    aiPaint(aiLoop(M([[0, -.25], [.42, -.3], [.6, -.34], [1.02, -.32, 1], [.66, -.17], [1.12, -.1, 1], [.68, 0], [1.06, .12, 1], [.64, .13], [.9, .3, 1], [.52, .28], [.45, .38], [.62, .62, 1], [.3, .5], [.0, .3]]), 3), { wash: C.skin, ink: C.ink, sw });
    return;
  }
  // relaxed: a tapered palm, the fingers together and gently curled (separations drawn), the thumb along the near edge
  aiPaint(aiLoop(M([[.08, -.17], [.3, -.36], [.52, -.45], [.62, -.38], [.5, -.24], [.32, -.16]]), 3), { wash: C.skin, ink: C.ink, sw });
  aiPaint(aiLoop(M([[0, -.21], [.28, -.26], [.52, -.27], [.8, -.24], [1.0, -.16], [1.08, -.03], [1.04, .11], [.92, .2], [.62, .26], [.3, .25], [0, .22]]), 4), { wash: C.skin, ink: C.ink, sw });
  if (L > 14) for (const [y0, y1, x1] of [[-.13, -.1, .97], [.01, .03, 1.03], [.14, .15, .95]]) aiLine(M([[.56, y0], [.78, (y0 + y1) / 2 + .01], [x1, y1]]), sw * .45, mixCol(C.skinSh, C.ink, .25));
  aiPaint(aiLoop(M([[.12, .05], [.45, .1], [.5, .2], [.15, .18]]), 3), { wash: C.skinSh, op: 130, ink: null });
}

// Arm on side s. part: 'upper' (puff and upper sleeve) | 'lower' (forearm, cuff, hand) | 'all'.
function aiArm(G, B, s, a, e, hand, part, dark, prof) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [lu, lf, lh] = G.arm, Wd = G.armWd;
  const Sh = [B(s * G.shW * 1.0) + -s * .06 * u, G.shY * u + .16 * u];
  const d1 = [s * Math.sin(a), Math.cos(a)], E = [Sh[0] + d1[0] * lu * u, Sh[1] + d1[1] * lu * u];
  const a2 = prof ? a + e : a - e, d2 = [s * Math.sin(a2), Math.cos(a2)], rk = 1 - .3 * clamp(e / 1.0), Wr = [E[0] + d2[0] * lf * rk * u, E[1] + d2[1] * lf * rk * u];
  const navy = dark ? C.navySh : C.navy, sh = dark ? mixCol(C.navySh, C.ink, .3) : C.navySh;
  if (part !== 'lower') {
    const up = [Sh, [lerp(Sh[0], E[0], .5), lerp(Sh[1], E[1], .5)], E];
    const R = aiRib(up, [Wd[0] * u, Wd[1] * u, Wd[1] * u], 4);
    aiPaint(aiRibPts(R), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    const pc = [Sh[0] + d1[0] * .1 * u, Sh[1] + d1[1] * .1 * u - .04 * u];
    const pa = Math.atan2(d1[1], d1[0]) - Math.PI / 2, PR = (x, y) => { const c = Math.cos(pa), n = Math.sin(pa); return [pc[0] + (x * c - y * n) * u, pc[1] + (x * n + y * c) * u]; };
    aiPaint(aiEll(pc[0], pc[1], G.puff[0] * u, G.puff[1] * u, 18, pa), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    aiPaint(aiLoop([PR(-G.puff[0] * .7, -G.puff[1] * .55), PR(-G.puff[0] * .1, -G.puff[1] * .92), PR(G.puff[0] * .5, -G.puff[1] * .7), PR(0, -G.puff[1] * .5)], 3), { wash: dark ? C.navy : C.navyHi, op: 160, ink: null });
    for (const k of [-.5, 0, .5]) aiLine([PR(k * G.puff[0] * .5, G.puff[1] * .85), PR(k * G.puff[0] * .8, G.puff[1] * .25)], sw * .3, sh);
    aiLine([[pc[0] - s * .1 * u, pc[1] - .1 * u], [pc[0] - s * .02 * u, pc[1] + .02 * u], [pc[0] - s * .08 * u, pc[1] + .14 * u]], sw * .4, dark ? C.navy : C.navyHi);
    aiLine([[pc[0] + s * .06 * u, pc[1] - .12 * u], [pc[0] + s * .1 * u, pc[1] + .08 * u]], sw * .35, sh);
  }
  if (part !== 'upper') {
    const fo = [E, [lerp(E[0], Wr[0], .5), lerp(E[1], Wr[1], .5)], Wr];
    const R = aiRib(fo, [Wd[1] * u, Wd[2] * u, Wd[3] * u], 4);
    aiPaint(aiRibPts(R), { wash: navy, ink: C.ink, sw: sw * .7, br: C.brS });
    aiPaint(aiEll(E[0], E[1], Wd[1] * u * .48, Wd[1] * u * .48, 12), { wash: navy, ink: null });
    aiLine([[lerp(E[0], Wr[0], .2) + s * .02 * u, lerp(E[1], Wr[1], .2)], [lerp(E[0], Wr[0], .7), lerp(E[1], Wr[1], .7)]], sw * .35, sh);
    const nE = [-d2[1], d2[0]];   // elbow creases
    for (const k of [.08, .18]) aiLine([[E[0] + d2[0] * k * u - nE[0] * .08 * u, E[1] + d2[1] * k * u - nE[1] * .08 * u], [E[0] + d2[0] * (k + .05) * u, E[1] + d2[1] * (k + .05) * u], [E[0] + d2[0] * k * u + nE[0] * .06 * u, E[1] + d2[1] * k * u + nE[1] * .06 * u]], sw * .28, sh);
    aiLine(R.L.slice(2, R.L.length - 3).map((p, i) => [lerp(p[0], R.C[i + 2][0], .3), lerp(p[1], R.C[i + 2][1], .3)]), sw * .3, dark ? C.navy : C.navyHi);
    // gold cuff band and a small cream frill
    const n = [-d2[1], d2[0]], cw = Wd[3] * u * .62, c0 = [Wr[0] - d2[0] * .12 * u, Wr[1] - d2[1] * .12 * u];
    aiPaint([[c0[0] + n[0] * cw, c0[1] + n[1] * cw], [Wr[0] + n[0] * cw, Wr[1] + n[1] * cw], [Wr[0] - n[0] * cw, Wr[1] - n[1] * cw], [c0[0] - n[0] * cw, c0[1] - n[1] * cw]], { wash: C.gold, ink: C.ink, sw: sw * .4 });
    aiFrill([[Wr[0] + n[0] * cw * 1.1, Wr[1] + n[1] * cw * 1.1], Wr, [Wr[0] - n[0] * cw * 1.1, Wr[1] - n[1] * cw * 1.1]], -.11 * u, 3, { sw: sw * .4 });
    const ha = Math.atan2(d2[1], d2[0]) + (hand === 'open' ? 0 : s * .35 * clamp(e / 1.2));
    aiHand([Wr[0] + d2[0] * .06 * u, Wr[1] + d2[1] * .06 * u], ha, lh * u, hand, s * (Math.cos(ha) < 0 ? 1 : -1), G === AI_FORM.chibi);
  }
  return Wr;
}

// The whale tail: one tapered ribbon with a paler underside, ending in two flukes. sway in rad (follows down the tail).
function aiTail(G, view, sway) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw;
  const mir = view === 'q' || view === 'side' ? -1 : 1, base = view === 'side' ? [-.5, .1] : view === 'q' ? [.2, 0] : [0, 0];
  const R0 = [G.tail[0][0] * mir + base[0], G.tail[0][1]];
  const pts = G.tail.map(([a, b], i) => { const p = [(a * mir + base[0]) * u, (b + (i ? base[1] * (i / 4) : 0)) * u]; return aiRot(p, [R0[0] * u, R0[1] * u], mir * sway * Math.pow(i / 4, 1.3)); });
  const E = aiRib(pts, G.tailW.map(w => w * u), 5), m = E.C.length;
  const tip = E.C[m - 1], prev = E.C[m - 4], ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), fl = G.fluke * u;
  const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [tip[0] + (x * c - y * n) * fl, tip[1] + (x * n + y * c) * fl]; };
  // flukes behind the stock of the tail
  const fluke = [F(-.25, 0), F(.05, -.3), F(.35, -.78), [...F(.62, -1.0), 1], F(.5, -.55), F(.42, -.15), [...F(.5, 0), 1], F(.42, .15), F(.5, .55), [...F(.62, 1.0), 1], F(.35, .78), F(.05, .3)];
  aiPaint(aiLoop(fluke, 4), { wash: C.fin, ink: C.ink, sw: sw * .65, br: C.brS });
  aiPaint(aiLoop([F(.1, .05), F(.4, .2), F(.5, .6), [...F(.58, .9), 1], F(.3, .6), F(.05, .25)], 3), { wash: C.finIn, ink: null, op: 200 });
  aiPaint(aiRibPts(E), { wash: C.fin, ink: null });
  const und = E.R.slice(Math.round(m * .1)).concat(E.C.slice(Math.round(m * .1)).map((p, i) => [lerp(p[0], E.R[Math.round(m * .1) + i][0], .25), lerp(p[1], E.R[Math.round(m * .1) + i][1], .25)]).reverse());
  aiPaint(und, { wash: C.finIn, ink: null });
  aiPaint(aiRibPts(E), { ink: C.ink, sw: sw * .65, br: C.brS });
  aiLine(E.L.slice(Math.round(m * .15), Math.round(m * .85)).map((p, i) => [lerp(p[0], E.C[Math.round(m * .15) + i][0], .3), lerp(p[1], E.C[Math.round(m * .15) + i][1], .3)]), sw * .35, mixCol(C.fin, C.finIn, .55));
  for (const sd of [-1, 1]) aiLine([F(.1, sd * .12), F(.3, sd * .45), F(.45, sd * .75)], sw * .28, mixCol(C.fin, C.finIn, .4));
  for (let i = 0; i < 3; i++) { const j = Math.round(m * (.3 + i * .18)); aiLine([E.C[j], [lerp(E.C[j][0], E.R[j][0], .7), lerp(E.C[j][1], E.R[j][1], .7)]], sw * .3, mixCol(C.fin, C.finIn, .4)); }
}

// Legs: stockings and Mary-Jane shoes. swing[s] rotates each leg at the hip (rad); dangling while she hovers.
function aiLegs(G, B, view, swing) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [lx, top, knee, ank, w, shoe] = G.leg;
  const order = view === 'q' ? [1, -1] : [-1, 1];
  for (const s of order) {
    const far = view === "q" && s > 0;
    const hx = view === 'side' ? (s < 0 ? -.05 : .1) * u : B(s * lx), hp = [hx, top * u];
    const rot = p => aiRot(p, hp, (swing[s < 0 ? 0 : 1] || 0));
    const Kn = rot([hx + (view === 'side' ? .02 : 0) * u, knee * u]), An = rot([hx + (view === 'side' ? 0 : s * -.02) * u, ank * u]);
    const Ca = [lerp(Kn[0], An[0], .35), lerp(Kn[1], An[1], .35)];
    const R = aiRib([hp, Kn, Ca, An], [w * u, w * .8 * u, w * .88 * u, w * .55 * u], 5);
    aiPaint(aiRibPts(R), { wash: far ? C.stockSh : C.stock, ink: C.ink, sw: sw * .55, br: C.brS });
    aiLine(R.R.slice(Math.round(R.R.length * .3)), sw * .35, C.stockSh);
    // shoe: points along the foot direction (front: down and a little out; 3/4 and profile: toward screen-right)
    const ang = (view === 'front' ? Math.PI / 2 - s * .35 : .25) + (swing[s < 0 ? 0 : 1] || 0) * 1.4, L = shoe * u;
    const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [An[0] + (x * c - y * n) * L, An[1] + (x * n + y * c) * L]; };
    const fr = view === 'front';
    const sh = fr ? [F(-.12, -.42), F(.35, -.48), F(.78, -.38), F(.95, 0), F(.78, .38), F(.35, .48), F(-.12, .42)]
                  : [F(-.25, -.3), F(.2, -.34), F(.7, -.32), F(1.02, -.12), F(1.02, .14), F(.6, .26), F(-.1, .3), F(-.3, .18)];
    aiPaint(aiLoop(sh, 4), { wash: far ? mixCol(C.shoe, C.ink, .3) : C.shoe, ink: C.ink, sw: sw * .6 });
    aiLine(fr ? [F(.15, -.4), F(.22, 0), F(.15, .4)] : [F(.05, -.3), F(.15, .0), F(.1, .26)], sw * .45, C.gold);
    aiLine(fr ? [F(.6, -.25), F(.72, .05)] : [F(.6, -.22), F(.9, -.12)], sw * .4, C.shoeHi);
    if (u > 25) { const bk = fr ? F(.2, s * .22) : F(.12, -.08); aiPaint(aiEll(bk[0], bk[1], .045 * u, .04 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .25 }); }
    aiLine(fr ? [F(.82, -.32), F(.95, 0), F(.82, .32)] : [F(-.2, .22), F(.4, .27), F(.95, .16)], sw * .3, mixCol(C.shoe, C.ink, .5));
  }
}

// Skirt with folds, shading and the gold embroidery band; the petticoat frill peeks out under the hem.
function aiSkirt(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [ty, tw, hy, hw] = G.skirt, n = 12;
  const hem = []; for (let i = 0; i <= n; i++) { const f = i / n; hem.push([lerp(-hw, hw, f), hy + .12 * Math.sin(f * Math.PI) + .045 * Math.sin(f * Math.PI * 9)]); }
  aiFrill(hem.map(([a, b]) => P(a * 1.01, b - .05)), G.petti * u, 15, { shade: true, double: true });
  const sk = [[-tw, ty], [-tw - .2, ty + .75], [-lerp(tw, hw, .5) - .1, lerp(ty, hy, .5)], [-hw + .04, hy - .6], [hem[0][0], hem[0][1], 1], ...hem.slice(1, -1), [hem[n][0], hem[n][1], 1], [hw - .04, hy - .6], [lerp(tw, hw, .5) + .1, lerp(ty, hy, .5)], [tw + .2, ty + .75], [tw, ty]];
  aiPaint(aiLoop(sk.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 4), { wash: C.navy, ink: C.ink, sw: sw * .85, br: C.brS });
  // shadow side (light from the upper left), folds, a dry highlight
  aiPaint(aiLoop([[tw * .5, ty + .1], [tw + .17, ty + .75], [lerp(tw, hw, .5) + .07, lerp(ty, hy, .5)], [hw - .07, hy - .6], [hw - .04, hy + .02, 1], [hw * .6, hy + .1, 1], [hw * .46, lerp(ty, hy, .62)], [tw * .55, ty + 1.3]].map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 3), { wash: C.navySh, op: 190, ink: null, hatch: u > 30 ? aiHatch(C.hatch, .95) : null });
  for (const [f, y0] of [[.08, .35], [.2, .7], [.33, .25], [.47, .55], [.6, .3], [.73, .62], [.86, .4]]) aiLine([P(lerp(-tw, tw, f) * 1.15, lerp(ty, hy, y0 * .45)), P(lerp(-hw, hw, f) * .92, lerp(ty, hy, .55 + y0 * .2)), P(lerp(-hw, hw, f) * .99, hy + .06)], sw * (.3 + .15 * (f > .5)), f > .5 ? C.ink : C.navySh);
  aiLine([P(-tw - .16, ty + .8), P(-lerp(tw, hw, .5) - .05, lerp(ty, hy, .5)), P(-hw + .1, hy - .4)], sw * .4, C.navyHi);
  aiPaint(aiLoop([[-tw - .05, ty + .5], [-tw - .14, ty + .9], [-lerp(tw, hw, .5) - .02, lerp(ty, hy, .5)], [-hw * .9, hy - .3], [-hw * .78, hy - .35], [-lerp(tw, hw, .5) + .14, lerp(ty, hy, .5)], [-tw + .05, ty + .9]].map(p => P(p[0], p[1])), 3), { wash: C.navyHi, op: 110, ink: null });
  // embroidery: two gold lines along the hem with little leaf scrolls between them
  for (const off of [.2, .34]) aiLine(hem.map(([a, b]) => P(a * .98, b - off)), sw * .38, C.gold);
  const hemY = x => { const j = (x / hw * .5 + .5) * n, a = clamp(Math.floor(j), 0, n), b = clamp(Math.ceil(j), 0, n); return lerp(hem[a][1], hem[b][1], j % 1); };
  const vine = []; for (let i = 0; i <= 36; i++) { const x = lerp(-hw, hw, i / 36) * .97; vine.push(P(x, hemY(x) - .27 + .035 * Math.sin(i * 1.45))); }
  aiLine(vine, sw * .3, C.gold);
  for (let i = 1; i < G.emb * 2; i++) {   // little curls on the vine and gold sprigs above the border
    const x = lerp(-hw, hw, i / (G.emb * 2)) * .97, y = hemY(x) - .27, d = i % 2 ? 1 : -1;
    aiLine([P(x, y), P(x + .05 * d, y - .05), P(x + .1 * d, y - .02), P(x + .07 * d, y + .02)], sw * .26, C.gold);
    if (i % 2 === 0 && u > 25) {   // a curling gold sprig: S-stem, two leaves, a tiny three-dot flower
      const yb = y - .1, k = i % 4 ? 1 : -1;
      aiLine([P(x, yb), P(x + .05 * k, yb - .09), P(x - .01 * k, yb - .17), P(x + .04 * k, yb - .24)], sw * .24, C.gold);
      aiLine([P(x + .03 * k, yb - .08), P(x + .11 * k, yb - .1), P(x + .07 * k, yb - .05)], sw * .22, C.gold);
      aiLine([P(x, yb - .16), P(x - .08 * k, yb - .2), P(x - .05 * k, yb - .14)], sw * .22, C.gold);
      for (const [dx, dy] of [[0, -.29], [.035, -.26], [-.03, -.26]]) aiPaint(aiEll(...P(x + .04 * k + dx, yb + dy), .018 * u, .018 * u, 6), { wash: C.gold, ink: null });
    }
  }
  if (C.glowK) aiLine([P(-tw - .1, ty + .6), P(-lerp(tw, hw, .5) - .06, lerp(ty, hy, .5)), P(-hw + .1, hy - .3)], sw * .6, C.rim);
}

// Bodice, blouse, collar, gold buttons and the frilled apron straps.
function aiTorso(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [nt, nb, nw] = G.neck, sy = G.shY, by = G.bustY, wy = G.waistY;
  aiPaint([P(-nw, nt), P(nw, nt), P(nw * 1.12, nb + .08), P(-nw * 1.12, nb + .08)], { wash: C.skin, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop([P(-nw, nt), P(nw, nt), P(nw * 1.05, nt + .2), P(0, nt + .3), P(-nw * 1.05, nt + .2)], 3), { wash: C.skinSh, ink: null });
  const mw = (G.armW + G.waistW) / 2 + .03, my = (G.armpitY + wy) / 2;
  const bod = [[-.17, nb - .03], [-.46, sy], [-G.shW, sy + .07, 1], [-G.armW, G.armpitY], [-mw, my], [-G.waistW, wy + .03], [G.waistW, wy + .03], [mw, my], [G.armW, G.armpitY], [G.shW, sy + .07, 1], [.46, sy], [.17, nb - .03]];
  aiPaint(aiLoop(bod.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1])), 3), { wash: C.navy, ink: C.ink, sw: sw * .75, br: C.brS });
  aiPaint(aiLoop([[G.armW * .55, G.armpitY + .05], [G.armW, G.armpitY], [mw, my], [G.waistW, wy + .02], [G.waistW * .6, wy], [mw * .7, my]].map(p => P(p[0], p[1])), 3), { wash: C.navySh, op: 170, ink: null, hatch: u > 30 ? aiHatch(C.hatch, 1.1) : null });
  aiLine([P(-G.shW + .08, sy + .14), P(-G.armW + .06, G.armpitY), P(-mw + .07, my), P(-G.waistW + .06, wy - .02)], sw * .38, C.navyHi);
  for (const s of [-1, 1]) aiLine([P(s * .3, by + .02), P(s * .27, (by + wy) / 2), P(s * .3, wy)], sw * .3, C.navySh);
  // blouse
  const bl = [[-.15, nb - .04], [.15, nb - .04], [.33, nb + .26], [.37, by], [0, by + .05], [-.37, by], [-.33, nb + .26]];
  aiPaint(aiLoop(bl.map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  aiPaint(aiLoop([[.16, nb + .12], [.31, nb + .27], [.35, by - .02], [.2, by + .03]].map(p => P(p[0], p[1])), 3), { wash: C.creamSh, op: 110, ink: null });
  aiLine([P(0, nb + .12), P(0, by + .03)], sw * .35, C.creamSh);
  for (const px of [-.24, -.14, .14, .24]) aiLine([P(px, nb + .2), P(px * 1.1, by - .03)], sw * .28, C.creamSh);
  // gold buttons on the corset
  for (const bx of [-.13, .13]) for (const yy of [by + .2, wy - .18]) aiPaint(aiEll(...P(bx, yy), .045 * u, .045 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  // stand collar up the neck, its wings, and a ruffled jabot down the front
  aiPaint(aiLoop([[-nw * 1.15, nb - .16], [0, nb - .12], [nw * 1.15, nb - .16], [nw * 1.25, nb + .06], [0, nb + .1], [-nw * 1.25, nb + .06]].map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
  for (const s of [-1, 1]) aiPaint(aiLoop([[0, nb + .05], [s * .2, nb - .07], [s * .27, nb + .08], [s * .08, nb + .14]].map(p => P(p[0], p[1])), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
  for (const s of [-1, 1]) aiFrill([P(0, nb + .12), P(s * .02, lerp(nb, by, .5)), P(0, by - .04)], -s * .1 * u, 5, { sw: sw * .4 });
  // frilled straps from the shoulders to the waist
  for (const s of [-1, 1]) {
    const path = [P(s * .43, sy + .02), P(s * .45, (sy + wy) / 2), P(s * .38, wy)];
    aiFrill(path, -s * .13 * u * (view === 'q' && s > 0 ? .7 : 1), 6, { sw: sw * .45 });
  }
}

// Bow tie with a little gem, at the collar.
function aiBowTie(G, P) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, c = P(0, G.neck[1] + .05), z = G.bow * u;
  const B = pts => pts.map(([a, b, k]) => k ? [c[0] + a * z, c[1] + b * z, 1] : [c[0] + a * z, c[1] + b * z]);
  for (const sd of [-1, 1]) aiPaint(aiLoop(B([[sd * .04, .05], [sd * .1, .2], [sd * .13, .36, 1], [sd * .18, .3], [sd * .23, .35, 1], [sd * .1, .03]]), 3), { wash: C.navySh, ink: C.ink, sw: sw * .4 });
  for (const sd of [-1, 1]) {
    aiPaint(aiLoop(B([[0, 0, 1], [sd * .1, -.11], [sd * .25, -.12], [sd * .29, .02], [sd * .23, .12], [sd * .08, .07]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .45 });
    aiLine(B([[sd * .07, -.03], [sd * .17, -.08], [sd * .25, -.07]]), sw * .32, C.navyHi);
    aiLine(B([[sd * .08, .03], [sd * .17, .05], [sd * .23, .09]]), sw * .28, C.navySh);
  }
  aiPaint(B([[0, -.08], [.06, 0], [0, .08], [-.06, 0]]), { wash: C.gem, ink: C.ink, sw: sw * .35 });
  if (u > 25) { aiLine(B([[0, -.08], [0, .08]]), sw * .2, mixCol(C.gem, C.ink, .4)); aiLine(B([[-.06, 0], [.06, 0]]), sw * .2, mixCol(C.gem, C.ink, .4)); }
  aiPaint(B([[-.02, -.05], [.012, -.025], [-.015, -.005]]), { wash: '#FFFFFF', op: 220, ink: null });
  if (C.glowK && u > 35) aiGlow(c[0], c[1], .35 * z, C.rim, .8 * C.glowK);
}

// The apron: scalloped frill, waistband, soft shading and a small whale.
function aiApron(G, P, view) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, [ty, tw, by, bw, fr] = G.apron, my = lerp(ty, by, .55);
  const Q = pts => pts.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1]));
  aiFrill(Q([[-tw * 1.02, ty + .3], [-bw * .9, my], [-bw * 1.01, by - .35], [-bw * .82, by], [0, by + .07], [bw * .82, by], [bw * 1.01, by - .35], [bw * .9, my], [tw * 1.02, ty + .3]]), fr * u, 16, { shade: true, double: true });
  const body = [[-tw, ty], [tw, ty], [bw * .88, my], [bw, by - .35], [bw * .82, by - .03], [0, by + .05], [-bw * .82, by - .03], [-bw, by - .35], [-bw * .88, my]];
  aiPaint(aiLoop(Q(body), 4), { wash: C.cream, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop(Q([[tw * .35, ty + .12], [tw * .95, ty + .1], [bw * .86, my], [bw * .97, by - .36], [bw * .75, by - .1], [bw * .55, my]]), 3), { wash: C.creamSh, op: 150, ink: null, hatch: u > 30 ? aiHatch(mixCol(C.creamSh, C.ink, .25), .9, 1.2) : null });
  for (const [f, y0] of [[-.62, .2], [-.3, .45], [.02, .15], [.32, .4], [.6, .25]]) aiLine(Q([[f * tw, lerp(ty, by, y0 * .5)], [f * bw * 1.02, lerp(ty, by, .5 + y0 * .2)], [f * bw * 1.08, by - .15]]), sw * .3, C.creamSh);
  // the whale: a generic little sperm-ish whale with a spout
  const wc = P(bw * .3, by - .62), z = G.whale * u * 1.35, W = pts => pts.map(([a, b, k]) => k ? [wc[0] + a * z, wc[1] + b * z, 1] : [wc[0] + a * z, wc[1] + b * z]);
  aiPaint(aiLoop(W([[-.52, .04], [-.48, -.2], [-.25, -.32], [.05, -.3], [.3, -.18], [.44, -.06], [.54, -.22], [.7, -.34, 1], [.64, -.08], [.78, .04, 1], [.52, .04], [.34, .14], [0, .22], [-.36, .2]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .35 });
  aiLine(W([[.05, .05], [.12, .12]]), sw * .25, C.bow);
  aiLine(W([[-.42, .08], [-.1, .13], [.22, .07]]), sw * .3, C.bow);
  aiPaint(aiEll(...W([[-.3, -.07]])[0], .045 * z, .045 * z, 6), { wash: C.cream, ink: null });
  for (const [a, b] of [[[-.32, -.36], [-.42, -.58]], [[-.24, -.37], [-.2, -.6]], [[-.28, -.38], [-.3, -.64]]]) aiLine(W([a, b]), sw * .3, C.bow);
  // waistband
  const wy = G.waistY, ww = G.waistW + .04;
  aiPaint(Q([[-ww, wy - .07], [ww, wy - .07], [ww, wy + .08], [-ww, wy + .08]]), { wash: C.cream, ink: C.ink, sw: sw * .55 });
  if (u > 25) aiLine(Q([[-ww + .03, wy + .045], [ww - .03, wy + .045]]), sw * .22, C.creamSh);
}

// ---------- profile body (full form, view 'side', facing screen-right) ----------
function aiBodySide(G, P, A, part) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw;
  const Q = pts => pts.map(p => p[2] ? [...P(p[0], p[1]), 1] : P(p[0], p[1]));
  if (part === 'lower') {
    const hy = G.skirt[2], hem = []; for (let i = 0; i <= 10; i++) { const f = i / 10; hem.push([lerp(-1.48, 1.3, f), hy + .06 * Math.sin(f * Math.PI) + .045 * Math.sin(f * Math.PI * 7)]); }
    aiFrill(Q(hem.map(([a, b]) => [a, b - .05])), G.petti * u, 13, { shade: true });
    const sk = [[-.26, -6.6], [-.55, -5.7], [-1.02, -4.0], [-1.36, -2.3], [hem[0][0], hem[0][1], 1], ...hem.slice(1, -1), [hem[10][0], hem[10][1], 1], [1.16, -2.3], [.78, -4.0], [.4, -5.75], [.26, -6.6]];
    aiPaint(aiLoop(Q(sk), 4), { wash: C.navy, ink: C.ink, sw });
    aiPaint(aiLoop(Q([[-.22, -6.5], [-.52, -5.6], [-1.0, -3.9], [-1.32, -2.3], [-1.42, -1.62, 1], [-.85, -1.58, 1], [-.65, -3.4], [-.32, -5.4]]), 3), { wash: C.navySh, op: 190, ink: null });
    aiPaint(aiLoop(Q([[.2, -6.3], [.38, -5.6], [.74, -3.9], [1.1, -2.3], [.95, -2.4], [.55, -3.9], [.25, -5.6]]), 3), { wash: C.navyHi, op: 110, ink: null });
    for (const f of [.22, .45, .68]) aiLine(Q([[lerp(-.3, .3, f), -5.6], [lerp(-1.0, .78, f), -3.8], [lerp(-1.45, 1.28, f), hy + .04]]), sw * .4, C.navySh);
    for (const off of [.2, .34]) aiLine(Q(hem.map(([a, b]) => [a * .98, b - off])), sw * .38, C.gold);
    for (let i = 1; i < 9; i++) { const x = lerp(-1.38, 1.2, i / 9), y = hy - .27, d = i % 2 ? 1 : -1; aiLine(Q([[x - .07, y + .02 * d], [x, y - .03 * d], [x + .07, y + .02 * d]]), sw * .35, C.gold); }
    // apron edge on the front of the skirt, its frill, and the big bow of the apron ties at the back
    aiFrill(Q([[.7, -4.1], [.84, -3.6], [.9, -3.42]]), -.15 * u, 3, { sw: sw * .45 });
    aiPaint(aiLoop(Q([[.14, -6.6], [.32, -6.6], [.46, -5.7], [.84, -4.0], [.92, -3.45, 1], [.74, -3.48, 1], [.62, -4.2], [.3, -5.6]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .55 });
    aiPaint(aiLoop(Q([[-.28, -6.55], [-.36, -6.3], [-.33, -6.05, 1], [-.24, -6.1, 1], [-.25, -6.5]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .45 });
    for (const sd of [-1, 1]) aiPaint(aiLoop(Q([[-.28, -6.6, 1], [-.42, -6.6 - sd * .2], [-.56, -6.6 - sd * .16], [-.52, -6.6 - sd * .02]]), 4), { wash: C.cream, ink: C.ink, sw: sw * .5 });
    aiPaint(aiEll(...P(-.3, -6.6), .06 * u, .06 * u, 8), { wash: C.cream, ink: C.ink, sw: sw * .45 });
    return;
  }
  // torso in profile: back, bust, blouse front, collar, bow tie
  const [nt, nb] = G.neck;
  aiPaint(Q([[-.02, nt], [.14, nt], [.17, nb + .04], [-.1, nb + .04]]), { wash: C.skin, ink: C.ink, sw: sw * .6 });
  aiPaint(Q([[-.02, nt], [.14, nt], [.15, nt + .14], [.02, nt + .3]]), { wash: C.skinSh, ink: null });
  const tor = [[-.18, nb], [-.28, -7.6], [-.26, -7.0], [-.24, -6.58], [.24, -6.58], [.28, -6.95], [.38, -7.3], [.33, -7.62], [.2, -7.95], [.13, nb]];
  aiPaint(aiLoop(Q(tor), 3), { wash: C.navy, ink: C.ink, sw: sw * .85 });
  aiPaint(aiLoop(Q([[.12, nb - .02], [.2, -7.95], [.33, -7.62], [.38, -7.3], [.28, -7.26], [.18, -7.55], [.05, -7.98]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiFrill(Q([[.08, -7.95], [.2, -7.55], [.27, -7.2], [.27, -6.65]]), .1 * u, 5, { sw: sw * .4 });
  aiPaint(aiEll(...P(.0, -6.9), .045 * u, .045 * u, 8), { wash: C.gold, ink: C.ink, sw: sw * .3 });
  aiPaint(Q([[-.27, -6.68], [.28, -6.68], [.28, -6.53], [-.27, -6.53]]), { wash: C.cream, ink: C.ink, sw: sw * .5 });
  aiPaint(aiLoop(Q([[-.02, nb + .02], [.17, nb - .06], [.2, nb + .06], [.05, nb + .12]]), 3), { wash: C.cream, ink: C.ink, sw: sw * .4 });
  aiPaint(aiLoop(Q([[.14, nb + .02], [.25, nb - .05], [.27, nb + .09], [.15, nb + .08]]), 3), { wash: C.navy, ink: C.ink, sw: sw * .4 });
  aiPaint(Q([[.15, nb], [.19, nb + .04], [.15, nb + .08], [.12, nb + .04]]), { wash: C.gem, ink: C.ink, sw: sw * .3 });
}
// Back hair in profile: clumps fall from the back of the head down her back, trailing behind (screen-left).
function aiBackHairSide(H, Hf, sway) {
  const C = AI_S.P, len = Hf.len;
  aiPaint(aiLoop([H(-.2, -.9), H(-1.0, -.3), H(-1.2, .8), H(-1.5, len * .5), H(-1.4, len * .8), H(-.6, len * .7), H(-.45, 1.0), H(-.1, .2)], 4), { wash: C.hair0, ink: null });
  for (let j = 0; j < 5; j++) {
    const tipL = len * (.86 + .14 * hash(j + 21)), pts = [];
    for (let i = 0; i <= 5; i++) {
      const k = i / 5, y = i === 0 ? -.6 + .18 * j : lerp(.1 + .1 * j, tipL, Math.pow((i - .5) / 4.5, 1.05));
      const x = -(.62 + .1 * j) - .5 * Math.pow(k, .8) - .12 * j * k + .16 * Math.pow(k, 1.2) * Math.sin(k * 7 + j * 1.6) + sway * Math.pow(k, 1.6);
      pts.push(H(x, y));
    }
    const w = .78 - .06 * Math.abs(j - 2);
    aiClump(pts, [w * .6, w, w * 1.05, w * .9, w * .6, w * .05].map(v => v * AI_S.k), { sw: AI_S.sw * .7, seed: j + 50, bands: [[0, C.hair1], [.45, C.hair2], [.66, C.hair3], [.85, C.hair4]] });
  }
}

// ---------- the head, front layer ----------
function aiHead(H, G, form, view, A) {
  const S = AI_S, C = S.P, F = AI_FACE[form], V = AI_HV[view], swF = S.swF, rs = A.rs;
  const map = pts => pts.map(p => { const h = H(p[0], p[1]); return p[2] ? [h[0], h[1], 1] : h; });
  rs('ahoge'); aiAhoge(H, view, A.ahoge);
  rs('finfar'); if (view === 'q') aiFin(H, .84, F.finY - .02, 1, A.fin, F.finL * .6, -A.flap);
  rs('face');
  const FL = (AI_FACELINE[form] && AI_FACELINE[form][view]) || AI_FACELINE.full[view];
  aiPaint(aiLoop(map(FL), 4), { wash: C.skin, ink: null });
  const [i0, i1] = view === 'side' ? [2, FL.length - 2] : [1, FL.length - 4];
  aiLine(aiCurve(map(FL.slice(i0, i1 + 1)), 4), swF * .75, C.ink);
  if (view !== 'side') {   // the bangs' shadow on the forehead
    const bg = AI_BANGS.map(b => [V.bx(b[0]), b[1] + .08, b[2]]);
    aiPaint(aiCurve(map(bg), 3).concat(map(bg.map(b => [b[0], b[1] - .35]).reverse())), { wash: C.skinSh, op: 210, ink: null });
  } else aiPaint(aiLoop(map([[.3, .02], [.9, -.06], [.9, .2], [.66, .24], [.42, .36]]), 3), { wash: C.skinSh, op: 200, ink: null });
  if (view !== 'side') {   // 2-tone skin: a soft shadow down the shaded (screen-right) cheek and under the jaw
    const sh = view === 'q' ? [[.62, .3], [.9, .3], [.86, .6], [.66, .95], [.4, 1.1], [.45, .98], [.66, .7]] : [[.72, .3], [.95, .28], [.88, .6], [.62, .9], [.3, 1.08], [.36, .97], [.62, .78], [.78, .55]];
    aiPaint(aiLoop(map(sh), 3), { wash: C.skinSh, op: 120, ink: null });
  }
  rs('fins');
  if (view === 'front') for (const s of [-1, 1]) aiFin(H, s * .88, F.finY, s, A.fin, F.finL, A.flap * s);
  else if (view === 'q') aiFin(H, -.88, F.finY, -1, A.fin, F.finL * 1.02, A.flap);
  rs('cheeks');
  if (A.blush > .02) {
    const pos = view === 'side' ? [[.6, .8]] : view === 'q' ? [[V.fx(-F.blushX), 1], [V.fx(F.blushX) + .04, .65]] : [[-F.blushX, 1], [F.blushX, 1]];
    for (const [bx, wk] of pos) {
      aiPaint(map(aiEll(bx, F.blushY, .17 * wk, .075, 14)), { wash: C.cheek, op: 120 * clamp(A.blush), ink: null });
      if (A.blush > .55) for (let i = 0; i < 3; i++) aiLine(map([[bx + (i - 1) * .07 * wk + .03, F.blushY - .04], [bx + (i - 1) * .07 * wk - .02, F.blushY + .04]]), swF * .4, mixCol(C.cheek, C.ink, .25));
    }
  }
  rs('nose');
  const nx = V.fx(0);
  if (view === 'front') aiLine(map([[-.005, F.noseY - .025], [.015, F.noseY + .02]]), swF * .5, mixCol(C.skinSh, C.ink, .35));
  else if (view === 'q') aiLine(map([[nx + .08, F.noseY - .06], [nx + .12, F.noseY + .015], [nx + .07, F.noseY + .03]]), swF * .5, mixCol(C.skinSh, C.ink, .35));
  rs('mouth');
  if (view === 'side') aiMouth(H, .84, F.mouthY - .03, .45, A.mouth, F);
  else aiMouth(H, view === 'q' ? nx + .05 : 0, F.mouthY, V.mk, A.mouth, F);
  rs('eyes');
  const eyePos = view === 'side' ? [[.56, -1, .52]] : V.eyes.map(([s, wk]) => [V.fx(s * F.eyeX), s, wk]);
  for (const [ex, s, wk] of eyePos) aiEye(H, ex, F.eyeY, s, wk, F, A.eye);
  if (C.glowK && S.k > 25 && A.eye.kind !== 'blank' && A.eye.lid < .8) for (const [ex] of eyePos) { const p = H(ex, F.eyeY + .05); aiGlow(p[0], p[1], F.eh * S.k * 1.5, C.rim, .55 * C.glowK); }
  rs('sidelocks');
  const Hf = { len: G.len, spread: G.spread, side: G.side, frame: G.frame };
  if (view !== 'side') aiSideLocks(H, Hf, view, A.sway);
  rs('cap'); aiCap(H, V, view);
  if (view === 'side') {
    rs('fins'); aiFin(H, -.14, F.finY + .04, -1, A.fin, F.finL * .9, A.flap);
    rs('sidelocks');
    const pts = []; for (let i = 0; i <= 5; i++) { const t = i / 5; pts.push(H(.14 + .08 * t + .07 * Math.sin(t * 7) + A.sway * .6 * t * t, lerp(.0, G.side * .78, t))); }
    aiClump(pts, [.2, .24, .22, .18, .12, .02].map(v => v * S.k), { bands: [[0, C.hair1], [.45, C.hair2], [.68, C.hair3], [.86, C.hair4]] });
  }
  rs('headdress'); aiHeaddress(H, view, F);
  rs('brows');
  for (const [ex, s, wk] of eyePos) {
    const w = F.ew * wk, h = F.eh, b = A.brow, by = F.eyeY - h * 1.62 - Math.max(0, -b) * .12;
    const pts = [[-.7 * w, by + .02 - Math.max(0, b) * .2], [0, by - .05 - Math.max(0, b) * .04], [.85 * w, by + .03 + Math.max(0, b) * .1]];
    aiLine(aiCurve(map(pts.map(([a, c]) => [ex + s * a, c])), 4), swF * (.45 + .35 * Math.abs(b)), mixCol(C.hair1, C.hairInk, .3 * Math.abs(b)));
  }
}

// ---------- her ----------
function ai(x, y, u, o = {}) {
  const id = o.boilKey ?? ('n' + (++CLAWD_N)), rs = part => boilSeed(`ai ${id} ${part}`);
  const form = o.form === 'chibi' ? 'chibi' : 'full', G = AI_FORM[form];
  let view = AI_HV[o.view] ? o.view : 'front'; if (form === 'chibi' && view === 'side') view = 'q';
  const base = typeof o.pal === 'object' ? o.pal : AI_PAL[o.pal] || AI_PAL.default;
  const P2 = o.pal2 ? (typeof o.pal2 === 'object' ? o.pal2 : AI_PAL[o.pal2]) : null;
  const pal = P2 ? aiPalMix(base, P2, clamp(o.palK ?? 1)) : base;
  const tt = o.t ?? T, sq = o.sq || 0, fl = o.float ?? .25, bob = o.bob ?? .07 * Math.sin(tt * TAU * .5 + (o.seed || 0));
  const X = x + (o.dx || 0) * u, Y = y + ((o.dy || 0) - fl - bob) * u;
  const sx = (o.flip ? -1 : 1) * (1 + sq * .6), sy = 1 - sq;
  let clip = null;
  if (o.clip) { const [a, b, c, d] = o.clip, xs = [(a - X) / sx, (c - X) / sx].sort((p, q) => p - q); clip = [xs[0], (b - Y) / sy, xs[1], (d - Y) / sy]; }
  const g = clamp(o.glitch || 0), gf = Math.floor(tt * 12);
  const rotA = o.rot || 0, warp = g > 0 ? yy => { const band = Math.floor(yy / (u * .38)) + 300, r = hash(band * 7.13 + gf * 3.31 + 1); return r < g * .6 ? (hash(band * 1.7 + gf * .91) - .5) * 2.2 * g * u : 0; } : null;
  AI_S = { P: pal, u, k: G.k * u, sw: clamp(u / 85, .22, 1.7) * pal.swk, swF: clamp(G.k * u / 75, .22, 1.5) * pal.swk, J: pal.J * u / 60, warp, clip, rot: rotA };
  const eyes = o.eyes || 'normal';
  const bl = ((tt * .85 + (o.seed || 0) * 1.37) % 3.9 + 3.9) % 3.9, autoBlink = bl < .05 ? bl / .05 : bl < .12 ? 1 : bl < .19 ? 1 - (bl - .12) / .07 : 0;
  const A = {
    rs, eye: { kind: eyes, lid: Math.max(o.lid || 0, o.blink || 0, o.blink === undefined && eyes !== 'perfect' ? autoBlink : 0), lookX: o.lookX || 0, lookY: o.lookY || 0, mirror: eyes === 'perfect' },
    mouth: o.mouth || 'smile', brow: o.brow || 0, blush: o.blush ?? .3, fin: o.fin || 0, flap: o.flap ?? .07 * Math.sin(tt * TAU * .6 + 1),
    ahoge: (o.ahoge || 0) + .1 * Math.sin(tt * TAU * .7), sway: (o.hairLag || 0) + .1 * Math.sin(tt * TAU * .3 + 2),
  };
  push(); translate(X, Y); scale(sx, sy);
  rs('shadow');
  if (!o.noShadow) { const k = 1 / (1 + (fl + bob) * .4), sy0 = (fl + bob) * u; aiPaint(aiEll(0, sy0, 1.55 * u * k * (form === 'chibi' ? 1.1 : 1), .24 * u * k, 20), { wash: pal.shadow, op: 50, ink: null }); }
  if (pal.glowK) { rs('halo'); aiGlow(0, (form === 'chibi' ? -6.2 : -5.6) * u, 6 * u, pal.rim, .4 * pal.glowK); }
  const qc = form === 'chibi' ? .1 : .12;
  const B = xx => (view === 'q' ? qc + xx * (xx < 0 ? 1 : .72) : xx) * u, P = (xx, yy) => [B(xx), yy * u];
  const hcx = view === 'q' ? B(0) - .05 * u : view === 'side' ? -.02 * u : 0, hc = [hcx + (o.headDx || 0) * u, (G.hc[1] + (o.headDy || 0)) * u], k = G.k * u;
  const piv = [hcx, hc[1] + AI_FACE[form].chin * k + .1 * u], tilt = o.tilt || 0;
  const H = (a, b) => aiRot([hc[0] + a * k, hc[1] + b * k], piv, tilt);
  const Hf = { len: G.len, spread: G.spread, side: G.side, frame: G.frame };
  const aL = o.aL ?? .06, aR = o.aR ?? .06, eL = o.eL ?? 1.05, eR = o.eR ?? 1.0, hL = o.handL || 'relax', hR = o.handR || 'relax';
  const swing = [o.legL ?? .05 * Math.sin(tt * TAU * .5), o.legR ?? -.06 * Math.sin(tt * TAU * .5 + .8)];
  const tailSway = (o.tailK ?? 1) * .16 * Math.sin(tt * TAU * .45 + (o.tail || 0));
  rs('hairback'); if (view === 'side') aiBackHairSide(H, Hf, A.sway); else aiBackHair(H, Hf, view, A.sway);
  rs('tail'); aiTail(G, view, tailSway);
  if (view === 'side') {
    rs('legs'); aiLegs(G, B, 'side', swing);
    rs('skirt'); aiBodySide(G, P, A, 'lower');
    rs('torso'); aiBodySide(G, P, A, 'upper');
    aiHead(H, G, form, view, A);
    rs('armR'); aiArm(G, () => 0, 1, aR, eR * .45, hR, 'all', false, true);
  } else {
    if (view === 'q') { rs('armfar'); aiArm(G, B, 1, aR, eR, hR, 'all', true); }
    rs('legs'); aiLegs(G, B, view, swing);
    rs('skirt'); aiSkirt(G, P, view);
    rs('torso'); aiTorso(G, P, view);
    rs('apron'); aiApron(G, P, view);
    rs('bowtie'); aiBowTie(G, P);
    rs('armup'); if (view === 'front') aiArm(G, B, 1, aR, eR, hR, 'upper'); aiArm(G, B, -1, aL, eL, hL, 'upper');
    aiHead(H, G, form, view, A);
    rs('armlow'); if (view === 'front') aiArm(G, B, 1, aR, eR, hR, 'lower'); aiArm(G, B, -1, aL, eL, hL, 'lower');
  }
  if (o.draw) { rs('draw'); o.draw(u, H); }
  if (o.emote) { rs('emote'); aiEmote(o.emote, H, o.emoteK ?? 1, o.emoteAge ?? tt); }
  if (g > .02) { rs('glitch'); aiGlitchMarks(g, u, gf); }
  pop();
  AI_S = null;
  rs('after');
}

// Painted glitch marks over her: cyan / magenta scan strokes and a few dropped blocks, re-drawn 12 times a second.
function aiGlitchMarks(g, u, gf) {
  const S = AI_S, n = Math.round(3 + g * 9);
  for (let i = 0; i < n; i++) {
    const r = hash(i * 3.7 + gf * 1.3), yy = -lerp(.5, 10, hash(i * 9.1 + gf * .7)) * u, x0 = (r - .5) * 3 * u, len = (.6 + 2.2 * hash(i + gf * 2.1)) * u;
    if (hash(i * 5.3 + gf) > g + .15) continue;
    aiLine([[x0, yy], [x0 + len, yy]], S.sw * (.7 + 1.4 * g), i % 2 ? '#7FE9FF' : '#FF5FA2', 'inkfine');
    if (i % 2) aiLine([[x0 + len * .2, yy + .05 * u], [x0 + len * .9, yy + .05 * u]], S.sw * .5, '#E8FDFF', 'inkfine');
    if (i % 3 === 0) aiPaint([[x0, yy - .08 * u], [x0 + .3 * u, yy - .08 * u], [x0 + .3 * u, yy + .1 * u], [x0, yy + .1 * u]], { wash: i % 2 ? '#E8FDFF' : '#1B6FFF', op: 200, ink: null });
  }
}

// Painted reaction marks near her head: sweat, hearts, sparkle, note, gloom. k = pop 0..1, age = s since it appeared.
function aiEmote(kind, H, k, age) {
  const S = AI_S, C = S.P, p = backOut(clamp(k)); if (p < .02) return;
  const sw = S.swF * .6, z = .3 * p;
  const at = (a, b) => H(a, b);
  if (kind === 'sweat') {
    const [cx, cy] = at(1.05, -.55 + .05 * Math.sin(age * 3)), r = S.k * z * .7;
    aiPaint(aiLoop([[cx, cy - 1.6 * r, 1], [cx + .9 * r, cy + .2 * r], [cx, cy + .95 * r], [cx - .9 * r, cy + .2 * r]], 4), { wash: '#BFE8FF', ink: C.ink, sw });
    aiPaint(aiEll(cx - .3 * r, cy + .1 * r, .2 * r, .3 * r, 8), { wash: '#FFFFFF', op: 220, ink: null });
  } else if (kind === 'hearts') {
    for (let i = 0; i < 3; i++) {
      const ph = frac(age * .55 + i / 3), a = Math.sin(ph * Math.PI); if (a < .1) continue;
      const [cx, cy] = at(.9 + .35 * i - .1 + .12 * Math.sin(ph * 6 + i), -.7 - ph * 1.1);
      aiPaint(aiHeartPts(cx, cy, S.k * z * (.45 + .4 * a)), { wash: C.heart, ink: C.ink, sw });
    }
  } else if (kind === 'sparkle') {
    for (let i = 0; i < 3; i++) {
      const tw = .7 + .3 * Math.sin(age * 9 + i * 2), [cx, cy] = at([1.1, 1.35, .95][i], [-.75, -.35, -1.15][i]), r = S.k * z * [.5, .32, .28][i] * tw;
      aiPaint(starPts(cx, cy, r, .3, 4), { wash: C.glowK ? '#E8FDFF' : '#FFF4C2', ink: C.ink, sw: sw * .8 });
      if (C.glowK && i === 0 && S.k > 25) aiGlow(cx, cy, r * 2.5, C.rim, .7);
    }
  } else if (kind === 'note') {
    const [cx, cy] = at(1.15, -.7 + .08 * Math.sin(age * 5)), r = S.k * z;
    aiPaint(aiEll(cx, cy + .9 * r, .32 * r, .24 * r, 10, -.4), { wash: C.ink, ink: null });
    aiLine([[cx + .28 * r, cy + .85 * r], [cx + .28 * r, cy - .6 * r], [cx + .75 * r, cy - .3 * r]], sw * 1.2, C.ink);
  } else if (kind === 'gloom') {
    for (let i = 0; i < 4; i++) { const xx = -.45 + i * .3; aiLine([at(xx, -.62), at(xx + .01, -.62 + .35 * p * (.7 + .3 * hash(i)))], sw * .9, C.line); }
  }
}

// ---------- emotions ----------
// Each emotion is a face AND a way of moving, locked to the beat (PROJECT.bpm). body(t) returns pose offsets for ai();
// take = the size of the reaction when she switches INTO it. Arms: aL/aR (upper arm), eL/eR (elbow), handL/handR.
const aiB = t => { const bp = bpOf(t), s1 = Math.sin(bp * Math.PI); return { bp, s1, ab: Math.abs(s1), hit: pulse(t), s2: Math.sin(bp * TAU), f: frac(bp) }; };
const AI_EMO = {
  smile:   { eyes: 'normal', mouth: 'smile', brow: 0, blush: .35, fin: .1, take: .4, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 4); return { tilt: .05 * s, dy: -.12 * b.ab, sq: .015 * b.hit, rot: .01 * s, lookX: .1 * s, ahoge: .1 * s }; } },
  gentle:  { eyes: 'soft', mouth: 'smile', brow: .3, blush: .5, fin: -.15, take: .3, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 8); return { tilt: .13 + .03 * s, dy: -.08 * b.ab, rot: -.015, lookY: .15, aL: .1, eL: 1.9, aR: .12, eR: 2.0, float: .2 }; } },
  eager:   { eyes: 'wide', mouth: 'open', brow: -.5, blush: .6, fin: .75, emote: 'sparkle', take: .9, body: t => { const b = aiB(t), h = Math.abs(b.s2); return { dy: -.45 * h, sq: .05 * pulse2(t) - .03 * h, rot: .025, lookY: -.15, aL: .28, eL: 2.35 + .12 * b.s2, aR: .28, eR: 2.3 - .12 * b.s2, handL: 'fist', handR: 'fist', ahoge: .25 * b.s2, tilt: -.04, float: .35 }; } },
  worried: { eyes: 'normal', lid: .12, mouth: 'wobble', brow: 1, blush: .1, fin: -.55, emote: 'sweat', take: .5, body: t => { const b = aiB(t); return { lookX: beatN(t) % 4 < 2 ? .5 : -.4, tilt: -.06, sq: .04, aL: .15, eL: 2.5, aR: .06, eR: 1.05, handL: 'fist', dx: .05 * Math.sin(t * TAU * 3), float: .2 }; } },
  heart:   { eyes: 'heart', mouth: 'open', brow: -.3, blush: 1, fin: .85, emote: 'hearts', take: 1.1, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 2); return { tilt: .12 * s, rot: .03 * s, dy: -.35 * b.ab, sq: .04 * b.hit, aL: .3, eL: 2.4, aR: .3, eR: 2.4, handL: 'fist', handR: 'fist', ahoge: .3 * s, float: .4 }; } },
  blank:   { eyes: 'blank', mouth: 'flat', brow: 0, blush: 0, fin: -.25, take: .2, body: t => ({ aL: .02, eL: .12, aR: .02, eR: .12, float: .18, bob: .02 * Math.sin(t * .7), lookX: 0, lookY: 0 }) },
  sad:     { eyes: 'sad', mouth: 'frown', brow: 1, blush: .15, fin: -1, emote: 'gloom', take: .35, body: t => { const b = aiB(t), s = Math.sin(b.bp * Math.PI / 8); return { sq: .05 + .015 * s, lookY: .55, tilt: .06, rot: .015 * s, aL: .02, eL: .75, aR: .02, eR: .7, float: .1, ahoge: -.5, hairLag: -.05 }; } },
  perfect: { eyes: 'perfect', mouth: 'perfect', brow: 0, blush: 0, fin: 0, take: .12, body: t => ({ tilt: 0, rot: 0, lookX: 0, lookY: 0, aL: .06, eL: 1.0, aR: .06, eR: 1.0, bob: 0, float: .3, ahoge: 0, flap: 0, tailK: .3, hairLag: 0 }) },
};
// One emotion alive at time t: face, fins, arms and motion together. Spread it into ai():
//   ai(x, y, u, aiFeel('eager', t))          ai(x, y, u, { ...aiFeel('gentle', t), form: 'chibi', view: 'q' })
function aiFeel(name, t, over = {}) {
  const E = AI_EMO[name] || AI_EMO.smile;
  return { eyes: E.eyes, mouth: E.mouth, brow: E.brow || 0, blush: E.blush || 0, fin: E.fin || 0, lid: E.lid || 0, emote: E.emote, ...(E.body ? E.body(t) : {}), ...over };
}
// An emotion timeline with ACTED changes: keys = [[t0, 'smile'], [t1, 'worried'], [t2, 'eager', { lookX: .5 }]].
// Just before each change she blinks shut and squashes (anticipation); the face swaps under the blink; then a take
// (stretch up, spring back) sized to the new emotion, the pose settles with overshoot, and the new emote pops in.
// o.take scales every take. Spread the result into ai() and add any other pose (add dy / sq if you also move them).
function aiEmotions(t, keys, o = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const [tc, name, over] = keys[i], age = t - tc, cur = aiFeel(name, t, over), E = AI_EMO[name] || AI_EMO.smile;
  const tn = i + 1 < keys.length ? keys[i + 1][0] : Infinity, tk = o.take ?? 1;
  let blink = 0;
  if (tn - t < .1) blink = Math.max(blink, 1 - (tn - t) / .1);
  if (i > 0 && age < .14) blink = Math.max(blink, 1 - age / .14);
  const prev = i > 0 ? aiFeel(keys[i - 1][1], t, keys[i - 1][2]) : null;
  if (prev && age < .55) {
    const base = { dy: 0, sq: 0, rot: 0, tilt: 0, dx: 0, lookX: 0, lookY: 0, aL: .06, aR: .06, eL: 1.05, eR: 1.0, float: .25, ahoge: 0, brow: 0, fin: 0, blush: 0, lid: 0, hairLag: 0 };
    const k = backOut(seg(age, 0, .42)), kc = ease(seg(age, 0, .3));
    for (const f in base) { const kk = ['brow', 'blush', 'lid'].includes(f) ? kc : k; cur[f] = lerp(prev[f] ?? base[f], cur[f] ?? base[f], kk); }
  }
  // the take this key fires, plus the anticipation squash of the next one (take() from core.js, scaled to her height)
  const t1 = prev ? take(t, tc, (E.take ?? .5) * tk) : { sq: 0, dy: 0 };
  const En = i + 1 < keys.length ? AI_EMO[keys[i + 1][1]] || AI_EMO.smile : null, t2 = En ? take(t, tn, (En.take ?? .5) * tk) : { sq: 0, dy: 0 };
  cur.sq = (cur.sq || 0) + (t1.sq + t2.sq) * .7; cur.dy = (cur.dy || 0) + (t1.dy + t2.dy) * .5;
  cur.fin = (cur.fin || 0) + .5 * spring(t, tc, 7, 20) * (prev ? 1 : 0);
  cur.ahoge = (cur.ahoge || 0) + .6 * spring(t, tc + .05, 5, 16) * (prev ? 1 : 0);
  if (blink > 0) cur.blink = blink;
  const same = prev && prev.emote === cur.emote;
  cur.emoteK = same ? 1 : seg(age, .08, .34);
  cur.emoteAge = age;
  return cur;
}
// Lip flap for talking/singing: cycles visemes on eighth notes between t0 and t1 (seeded so it never repeats evenly).
function aiTalk(t, t0, t1, seed = 0) {
  if (t < t0 || t > t1) return null;
  const n = Math.floor(bpOf(t) * 2), V = ['A', 'I', 'U', 'E', 'O', 'smile', 'A', 'O'];
  return V[Math.floor(hash(n * 1.37 + seed) * V.length)];
}

// ---------- model sheets ----------
// A painted panel (wash + thin ink), for sheets.
function aiPanel(x, y, w, h, col, key) {
  boilSeed('aipanel ' + key);
  paint(rectPts(x, y, w, h, 1.5), { wash: col, ink: '#2B2233', sw: .5, br: 'inkfine' });
}
// ai_sheet: row 1 the key views (chibi front, chibi 3/4, full front, full 3/4, full side), row 2 the expressions as
// bust close-ups, row 3 the palettes (default / glow / amber) and a glitch sample.
let AI_SKIP = null;
LOOPS.ai_sheet = t => {
  const sk = r => AI_SKIP && AI_SKIP.includes(r);
  const lab = (s, x, y, sz = 22) => letter(s, x, y, sz, '#2B2233', { screen: true, ink: false });
  // row 1
  const g1 = 588;
  if (!sk('1')) {
  ai(150, g1, 38, { ...aiFeel('eager', t), form: 'chibi', view: 'front', t, seed: 1 });
  ai(445, g1, 38, { ...aiFeel('smile', t), form: 'chibi', view: 'q', t, seed: 2, lookX: .3, mouth: 'open', aL: .25, eL: 2.2, aR: .25, eR: 2.2, handL: 'fist', handR: 'fist' });
  ai(780, g1, 53, { ...aiFeel('smile', t), form: 'full', view: 'front', t, seed: 3 });
  ai(1180, g1, 53, { ...aiFeel('gentle', t), form: 'full', view: 'q', t, seed: 4, lookX: .3 });
  ai(1600, g1, 53, { ...aiFeel('smile', t), form: 'full', view: 'side', t, seed: 5, aR: .15, eR: .4 });
  }
  [['chibi · front', 150], ['chibi · 3/4', 445], ['full · front', 780], ['full · 3/4', 1180], ['full · side', 1600]].forEach(([s, x]) => lab(s, x, g1 + 22));
  // row 2: expressions
  const names = ['smile', 'gentle', 'eager', 'worried', 'heart', 'blank', 'sad', 'perfect'], pw = 232, py = 628, ph = 262;
  if (!sk('2')) names.forEach((n, i) => {
    const x0 = 28 + i * (pw + 4);
    aiPanel(x0, py, pw, ph, i % 2 ? '#EEF3F7' : '#F4F1EA', 'e' + i);
    const u = 118, cx = x0 + pw / 2, f = aiFeel(n, t);
    ai(cx, py + 122 + 9.28 * u + (f.float ?? .25) * u, u, { ...f, form: 'full', view: 'front', t, seed: i, clip: [x0 + 2, py + 2, x0 + pw - 2, py + ph - 2], noShadow: true, bob: 0, dy: 0, sq: 0 });
    lab(n, cx, py + ph + 18, 20);
  });
  // row 3: palettes and the glitch
  const ry = 918, rh = 156;
  if (sk('3')) return;
  [['default', '#F4F1EA'], ['glow', '#14193F'], ['amber', '#F6E7D2']].forEach(([pal, bg], i) => {
    const x0 = 28 + i * 470;
    aiPanel(x0, ry, 462, rh, bg, 'p' + i);
    ai(x0 + 70, ry + rh - 8, 14.5, { ...aiFeel(i === 1 ? 'eager' : 'smile', t), form: 'chibi', pal, t, seed: 10 + i, noShadow: true, clip: [x0, ry, x0 + 462, ry + rh] });
    ai(x0 + 175, ry + rh - 8, 14.5, { ...aiFeel(i === 2 ? 'gentle' : 'smile', t), form: 'full', pal, t, seed: 20 + i, noShadow: true, clip: [x0, ry, x0 + 462, ry + rh] });
    const P = AI_PAL[pal], sw = [P.hair0, P.hair2, P.hair4, P.iris1, P.navy, P.cream, P.skin, P.gold];
    sw.forEach((c, j) => { boilSeed('swatch' + i + j); paint(ellPts(x0 + 262 + (j % 4) * 48, ry + 52 + Math.floor(j / 4) * 50, 19, 17, 14, 1), { wash: c, ink: '#2B2233', sw: .4, br: 'inkfine' }); });
    letter(pal, x0 + 360, ry + rh - 18, 20, i === 1 ? '#E8FDFF' : '#2B2233', { screen: true, ink: false });
  });
  const gx = 28 + 3 * 470;
  aiPanel(gx, ry, 452, rh, '#0E1330', 'pg');
  const gk = .35 + .3 * Math.sin(t * 2.1) ** 2;
  ai(gx + 110, ry + rh - 8, 14.5, { ...aiFeel('blank', t), form: 'full', pal: 'glow', t, glitch: gk + .2, noShadow: true, clip: [gx, ry, gx + 452, ry + rh] });
  ai(gx + 260, ry + rh - 8, 14.5, { ...aiFeel('perfect', t), form: 'chibi', pal: 'glow', t, glitch: gk, noShadow: true, clip: [gx, ry, gx + 452, ry + rh] });
  letter('glitch', gx + 380, ry + rh - 18, 20, '#E8FDFF', { screen: true, ink: false });
};
LOOPS.ai_sheet.len = 4;

// ai_emotions: the eight emotions as an acted sequence (aiEmotions), on the full form, the chibi and a close-up.
const AI_EMO_KEYS = [[0, 'smile'], [.75, 'gentle'], [1.5, 'eager'], [2.25, 'worried'], [3.0, 'heart'], [3.75, 'blank'], [4.5, 'sad'], [5.25, 'perfect']];
LOOPS.ai_emotions = t => {
  const m = aiEmotions(t, AI_EMO_KEYS);
  boilSeed('ai_emo bg');
  paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#EEF2F2', ink: null });
  ai(330, 1050, 88, { ...m, form: 'full', view: 'front', t, seed: 1 });
  ai(790, 1040, 40, { ...m, form: 'chibi', view: 'q', t, seed: 2 });
  aiPanel(1010, 40, 880, 1000, '#F4F1EA', 'emo');
  const u = 190, f = m.float ?? .25;
  ai(1450, 40 + 330 + 9.28 * u + f * u, u, { ...m, form: 'full', view: 'front', t, seed: 3, clip: [1012, 42, 1888, 1038], noShadow: true });
};
LOOPS.ai_emotions.len = 6;

// ai_faces: four big busts, for working on the face.
LOOPS.ai_faces = t => {
  const names = (window.AI_FACES || 'smile,eager,heart,perfect').split(',');
  names.forEach((n, i) => {
    const x0 = 10 + i * 477, f = aiFeel(n, t), u = 210;
    aiPanel(x0, 10, 467, 1060, '#F4F1EA', 'f' + i);
    ai(x0 + 233, 330 + 9.28 * u + (f.float ?? .25) * u, u, { ...f, form: i === 3 && window.AI_FACES_CHIBI ? 'chibi' : 'full', view: window.AI_FACES_VIEW || 'front', t, seed: i, clip: [x0 + 2, 12, x0 + 465, 1068], noShadow: true, bob: 0, dy: 0, sq: 0 });
  });
};
LOOPS.ai_faces.len = 2;

// ai_face: the faces at 2× close-up size (full form and chibi), for checking eye / hair detail.
LOOPS.ai_face = t => {
  aiPanel(10, 10, 1060, 1060, '#F4F1EA', 'face1');
  aiPanel(1080, 10, 830, 1060, '#EEF3F7', 'face2');
  const u = 330, f = aiFeel('eager', t);
  ai(540, 400 + 9.28 * u + (f.float ?? .25) * u, u, { ...f, emote: null, form: 'full', view: 'front', t, seed: 1, clip: [12, 12, 1068, 1068], noShadow: true, bob: 0, dy: 0, sq: 0, rot: 0 });
  const uc = 128, g = aiFeel('heart', t);
  ai(1495, 470 + 8.1 * uc + (g.float ?? .25) * uc, uc, { ...g, form: 'chibi', view: 'q', t, seed: 2, clip: [1082, 12, 1908, 1068], noShadow: true, bob: 0, dy: 0, sq: 0, rot: 0, lookX: .3 });
};
LOOPS.ai_face.len = 2;
// ai_glitch: the 503 outage look (glow palette on a dark ground, and the default chibi).
LOOPS.ai_glitch = t => {
  boilSeed('ai_glitch bg'); paint(rectPts(-20, -20, W + 40, H + 40), { wash: '#10163A', ink: null });
  ai(480, 1040, 88, { ...aiFeel('blank', t), form: 'full', pal: 'glow', t, glitch: .25 + .5 * Math.abs(Math.sin(t * 1.3)) });
  ai(1300, 1040, 70, { ...aiFeel('smile', t), form: 'chibi', view: 'q', t, glitch: .6 });
};
LOOPS.ai_glitch.len = 2;
