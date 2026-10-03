// ai_props.js: the things she holds (loaded after ai.js / ai_pose.js; globals ai / AI_). Painted with aiPaint / aiLine /
// aiGlow only, so they boil, clip, mirror and dissolve with her.
//   In a hand: ai(..., { propR: 'thermometer' }) or { propR: { kind: 'spoon', cap: 'check' } } (with a reach / an action).
//   On their own: aiProp(kind, x, y, u, o) paints one at world (x, y) (the grip point; the floor point for the IV stand)
//   for a figure of unit u, angle o.ang (rad, 0 = screen-right), o.flip, o.pal, o.boilKey; returns its contact points.
// Kinds: thermometer {level 0..1} · spoon {cap: 'check' | 'heart' | null} · capsule {mark} · sticker {peel 0..1} ·
//   phone {screen: 'type' | 'glow' | 'dark' | 'back', k (typing 0..1), draw(rectPts) (paint your own screen)} ·
//   cord {from: [wx, wy] (where it hangs from, world px)} · stetho (the light stethoscope: earpieces at her ears) ·
//   page {k 0..1: the diary page folding into a filed block} · block {check, size (u), at: 'top' | 'side' | 'mid'} ·
//   ivstand (standalone: pole, hooks, the bag of glowing tokens, the drip; o.tube: [[wx, wy], ...] the line to him).
const AI_CYAN = '#7FE9FF', AI_CYANW = '#E8FDFF', AI_CYAND = '#1B6FFF';
// Painted over the hand (a pinched sticker sits under the fingers' tips but over the palm...): the rest go under it.
const aiPropFront = spec => { const k = typeof spec === 'string' ? spec : spec.kind; return k === 'block' || k === 'page' || k === 'sticker' || k === 'phone' || k === 'cord'; };
// spec at the grip point g (local px) along the hand's angle a, for a figure of unit u on side s; form 'chibi' | 'full'.
function aiPropAt(spec, g, a, u, s, form) {
  const S = AI_S, sp = typeof spec === 'string' ? { kind: spec } : spec, hl = (form === 'chibi' ? AI_CHIBI_ARM.hl : AI_FORM.full.arm[2] * AI_HANDK) * u;
  const F = (x, y, ang = a) => { const c = Math.cos(ang), n = Math.sin(ang); return [g[0] + (x * c - y * n) * hl, g[1] + (x * n + y * c) * hl]; };
  S.pts.prop = g;
  switch (sp.kind) {
    case 'thermometer': return aiThermo(F, sp, hl);
    case 'spoon': return aiSpoon(F, sp, hl);
    case 'capsule': return aiCapsule(F(.4, 0), a, hl * .55, sp.mark, hl);
    case 'sticker': return aiSticker(F(.55, -.05), a, hl * .55, sp.peel || 0);
    case 'phone': { const c = sp.mid ? [sp.mid[0] * u, sp.mid[1] * u] : F(.35, 0); return aiPhone(c, sp.ang ?? -Math.PI / 2, hl * (sp.size || 1.25), sp); }
    case 'cord': return aiCord(g, sp, hl);
    case 'stetho': return aiStetho(g, sp, u, form);
    case 'page': { const c = sp.mid ? [sp.mid[0] * u, sp.mid[1] * u] : F(.7, -.1); return aiPage(c, sp.ang ?? a * .3 - .2, hl * (sp.size || (form === 'chibi' ? 2.1 : 1.4)), sp.k || 0, sp); }
    case 'block': {
      const z = (sp.size ?? (form === 'chibi' ? .82 : .5)) * u;
      const c = sp.at === 'side' ? F(.55 + z / hl * .55, 0) : sp.at === 'mid' && sp.mid ? [sp.mid[0] * u, sp.mid[1] * u] : [F(.45, 0)[0], F(.45, 0)[1] - z * .58];
      return aiBlock(c, z, sp);
    }
  }
}
// The standalone version: one prop at world (x, y).
function aiProp(kind, x, y, u, o = {}) {
  const sp = typeof kind === 'string' ? { kind, ...o } : { ...kind, ...o };
  const pal = typeof o.pal === 'object' ? o.pal : AI_PAL[o.pal] || AI_PAL.default, prev = AI_S;
  boilSeed('aiprop ' + (o.boilKey ?? sp.kind));
  AI_S = { P: pal, u, k: AI_FORM.full.k * u, sw: clamp(u / 85, .22, o.swMax ?? 1.7) * pal.swk, swF: clamp(AI_FORM.full.k * u / 75, .22, 1.5) * pal.swk, J: pal.J * u / 60 * .6, clip: null, rot: 0, pts: {}, n: 0,
    tf: { X: x, Y: y, py: 0, sx: o.flip ? -1 : 1, sy: 1, roll: 0 } };
  push(); translate(x, y); if (o.flip) scale(-1, 1);
  let r;
  if (sp.kind === 'ivstand') r = aiIVStand(u, sp);
  else r = aiPropAt(sp, [0, 0], o.ang ?? 0, u, 1, o.form || 'full');
  pop();
  const out = {}; if (r) for (const k in r) out[k] = aiToW(r[k]);
  AI_S = prev; boilSeed('aiprop after');
  return out;
}

// ---------- the props ----------
function aiThermo(F, sp, hl) {
  const S = AI_S, sw = S.sw, lv = clamp(sp.level ?? 0), a0 = -.35, a1 = 1.55, r = .07;
  const tube = []; for (let i = 0; i <= 8; i++) tube.push(F(lerp(a0, a1, i / 8), -r)); tube.push(F(a1 + .05, -r * 1.25), F(a1 + .16, 0), F(a1 + .05, r * 1.25)); for (let i = 8; i >= 0; i--) tube.push(F(lerp(a0, a1, i / 8), r)); tube.push(F(a0 - .05, 0));
  aiPaint(tube, { wash: '#EEF9FF', op: 215, ink: mixCol(S.P.ink, '#7FA6C8', .4), sw: sw * .4 });
  aiPaint([F(a0, -r * .5), F(a1 - .05, -r * .5), F(a1 - .05, -r * .15), F(a0, -r * .15)], { wash: '#FFFFFF', op: 170, ink: null });
  const top = a1 - .06 - lv * 1.55;
  aiPaint(aiEll(...F(a1 + .05, 0), r * 1.05 * hl, r * 1.05 * hl, 10), { wash: AI_CYAN, ink: null });
  if (lv > .02) aiPaint([F(top, -r * .38), F(a1, -r * .38), F(a1, r * .38), F(top, r * .38)], { wash: AI_CYAN, ink: null });
  for (let i = 1; i < 9; i++) aiLine([F(lerp(a0 + .25, a1 - .2, i / 9), r * .3), F(lerp(a0 + .25, a1 - .2, i / 9), r * (i % 2 ? .8 : .95))], sw * .2, mixCol(S.P.ink, '#7FA6C8', .5), 'inkfine');
  if (S.u > 15) { aiGlow(...F(a1 + .05, 0), r * hl * 4, AI_CYAN, .7); if (lv > .05) aiGlow(...F(top, 0), r * hl * (3 + 3 * lv), AI_CYAN, .5 + .5 * lv); }
  return { tip: F(a1 + .16, 0), top: F(top, 0) };
}
function aiSpoon(F, sp, hl) {
  const S = AI_S, sw = S.sw, silver = '#C9D2E0';
  const h = aiRib([F(-.45, 0), F(.3, .01), F(.85, .0)], [.1 * hl, .085 * hl, .06 * hl], 4);
  aiPaint(aiRibPts(h), { wash: silver, ink: S.P.ink, sw: sw * .4 });
  aiLine(h.L.slice(1, -1).map((p, i) => [lerp(p[0], h.C[i + 1][0], .5), lerp(p[1], h.C[i + 1][1], .5)]), sw * .25, '#FFFFFF');
  const bc = F(1.18, 0), ang = Math.atan2(F(1, 0)[1] - F(0, 0)[1], F(1, 0)[0] - F(0, 0)[0]);
  aiPaint(aiEll(bc[0], bc[1], .34 * hl, .22 * hl, 18, ang), { wash: silver, ink: S.P.ink, sw: sw * .45 });
  aiPaint(aiEll(bc[0] + .03 * hl, bc[1] + .02 * hl, .26 * hl, .15 * hl, 16, ang), { wash: mixCol(silver, '#7C879C', .45), op: 200, ink: null });
  aiPaint(aiEll(bc[0] - .1 * hl, bc[1] - .06 * hl, .09 * hl, .04 * hl, 8, ang), { wash: '#FFFFFF', op: 200, ink: null });
  if (sp.cap) aiCapsule([bc[0], bc[1] - .06 * hl], ang + .15, .36 * hl, sp.cap, hl);
  return { bowl: bc };
}
// A glowing capsule: a cream half and a cyan half, a painted ✓ or ♥ on it (the marks are allowed signs, not words).
function aiCapsule(c, a, len, mark, hl = len) {
  const S = AI_S, sw = S.sw, w = len * .42, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const at = (x, y) => [c[0] + d[0] * x + n[0] * y, c[1] + d[1] * x + n[1] * y];
  const half = sd => { const p = []; for (let i = 0; i <= 8; i++) { const t = -Math.PI / 2 + Math.PI * i / 8; p.push(at(sd * (len * .5 - w * .5 + Math.cos(t) * w * .5), Math.sin(t) * w * .5)); } p.push(at(0, w * .5), at(0, -w * .5)); return p; };
  if (S.u > 12) aiGlow(c[0], c[1], len * 1.3, AI_CYAN, .55);
  aiPaint(half(-1), { wash: '#FBF6EE', ink: S.P.ink, sw: sw * .35 });
  aiPaint(half(1), { wash: AI_CYAN, ink: S.P.ink, sw: sw * .35 });
  aiPaint([at(-len * .38, -w * .3), at(len * .3, -w * .3), at(len * .3, -w * .16), at(-len * .38, -w * .16)], { wash: '#FFFFFF', op: 190, ink: null });
  const z = w * .32, m = at(len * .22, w * .02);
  if (mark === 'check') aiLine([[m[0] - z, m[1]], [m[0] - z * .25, m[1] + z * .7], [m[0] + z, m[1] - z * .8]], sw * .5, AI_CYAND, 'inkfine');
  if (mark === 'heart') aiPaint(aiHeartPts(m[0], m[1], z * .9, 14), { wash: '#FF5F8F', ink: null });
}
// The tear sticker (06D): a white die-cut with a grey-blue teardrop; peel curls a corner.
function aiSticker(c, a, r, peel) {
  const S = AI_S, sw = S.sw, P = [];
  for (let i = 0; i < 20; i++) { const t = i / 20 * TAU; P.push([c[0] + Math.cos(t) * r * (1 + .06 * Math.sin(t * 3)), c[1] + Math.sin(t) * r]); }
  aiPaint(P, { wash: '#FFFDF8', ink: S.P.ink, sw: sw * .35 });
  const d = r * .55, tp = [c[0], c[1] + d * .25];
  aiPaint(aiLoop([[tp[0], tp[1] - d * 1.25, 1], [tp[0] + d * .62, tp[1] + .12 * d], [tp[0] + d * .44, tp[1] + d * .62], [tp[0], tp[1] + d * .8], [tp[0] - d * .44, tp[1] + d * .62], [tp[0] - d * .62, tp[1] + .12 * d]], 4), { wash: '#8EA3C2', ink: mixCol(S.P.ink, '#8EA3C2', .4), sw: sw * .3 });
  aiPaint(aiEll(tp[0] - d * .2, tp[1] + d * .1, d * .12, d * .2, 8), { wash: '#FFFFFF', op: 200, ink: null });
  if (peel > .02) { const q = [c[0] + r * .7, c[1] + r * .7], e = r * .55 * peel; aiPaint([[q[0] - e, q[1]], [q[0], q[1] - e], [q[0] - e * .85, q[1] - e * .85]], { wash: '#E6E1DA', ink: S.P.ink, sw: sw * .3 }); }
  return { centre: c };
}
// A phone (no brand): c = centre, a = its long axis (rad; -π/2 = upright), h = its height (px).
function aiPhone(c, a, h, sp) {
  const S = AI_S, sw = S.sw, w = h * .5, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const at = (x, y) => [c[0] + d[0] * x + n[0] * y, c[1] + d[1] * x + n[1] * y];
  const rr = (hx, hy, r) => { const p = []; for (const [cx, cy, a0] of [[hx - r, hy - r, 0], [-hx + r, hy - r, Math.PI / 2], [-hx + r, -hy + r, Math.PI], [hx - r, -hy + r, Math.PI * 1.5]]) for (let i = 0; i <= 3; i++) { const t = a0 + i / 3 * Math.PI / 2; p.push(at(cx + Math.cos(t) * r, cy + Math.sin(t) * r)); } return p; };
  const scr = sp.screen || 'glow';
  if (scr !== 'back' && scr !== 'dark' && S.u > 10) aiGlow(c[0], c[1], h * 1.1, AI_CYAN, .6);
  aiPaint(rr(h * .5, w * .5, w * .16), { wash: '#262B3E', ink: S.P.ink, sw: sw * .5 });
  if (scr === 'back') { aiPaint(aiEll(...at(h * .36, w * .24), w * .07, w * .07, 8), { wash: '#4A5170', ink: null }); aiLine([at(-h * .45, -w * .38), at(h * .45, -w * .38)], sw * .3, '#3C4258'); return { screen: c }; }
  const sc = rr(h * .45, w * .42, w * .1);
  aiPaint(sc, { wash: scr === 'dark' ? '#10142A' : scr === 'glow' ? AI_CYANW : '#0E2342', ink: null });
  if (sp.draw) sp.draw(sc, at, h, w);
  else if (scr === 'type') {   // cyan lines typing out (no letters), then a sent bubble
    const k = clamp(sp.k ?? 1), rows = [[.62, .78], [.8, .55], [.7, .7]];
    rows.forEach(([len, y0], i) => { const f = clamp(k * rows.length - i); if (f <= 0) return; const x0 = -h * .3 + i * h * .12, y = (-w * .22 + w * .22 * (y0 - .6) * 2);
      aiLine([at(x0, -w * .3), at(x0, -w * .3 + w * .62 * len * f)], sw * .9, AI_CYAN, 'inkfine'); });
    if (k > .99) aiPaint(rr(h * .1, w * .3, w * .08).map(p => [p[0] - d[0] * h * .25, p[1] - d[1] * h * .25]), { wash: AI_CYAN, op: 200, ink: null });
  }
  if (sp.thumbs) {   // two thumbs tapping over the lower screen, on eighth notes (sp.t: time; default T)
    const n = Math.floor(bpOf(sp.t ?? T) * 2), C = S.P;
    for (const sd of [-1, 1]) {
      const tap = (n + (sd > 0 ? 1 : 0)) % 2 === 0, q = at(-h * (.12 + .14 * hash(n * 1.7 + sd)), sd * w * (.18 + .08 * hash(n * 2.3 - sd))), r = w * .2;
      aiPaint(aiEll(q[0], q[1] + (tap ? 0 : -r * .3), r * .8, r * 1.05, 12, a + Math.PI / 2 + sd * .5), { wash: C.skin, ink: C.ink, sw: S.sw * .4 });
      aiPaint(aiEll(q[0], q[1] - r * .45 + (tap ? 0 : -r * .3), r * .42, r * .3, 8, a + Math.PI / 2), { wash: '#F7DEDA', ink: null });
      if (tap && S.u > 12) aiGlow(q[0], q[1] - r * .9, r * 1.4, AI_CYAN, .5);
    }
  } else if (scr === 'glow') aiPaint(rr(h * .3, w * .28, w * .1), { wash: '#FFFFFF', op: 120, ink: null });
  aiPaint([at(h * .43, -w * .36), at(h * .43, w * .1), at(h * .4, w * .1), at(h * .4, -w * .36)], { wash: '#FFFFFF', op: 90, ink: null });
  return { screen: c };
}
// The lamp's pull cord (04D): from sp.from (world px) to her hooked finger, with a bead at the end.
function aiCord(g, sp, hl) {
  const S = AI_S, top = sp.from ? aiFromW(sp.from) : [g[0], g[1] - 6 * hl], sag = sp.sag ?? .04;
  const m = [lerp(top[0], g[0], .5) + (g[1] - top[1]) * sag, lerp(top[1], g[1], .5)];
  aiLine(aiCurve([top, m, [g[0], g[1] - hl * .2]], 6), S.sw * .45, '#3A3550');
  aiPaint(aiEll(g[0], g[1] - hl * .05, hl * .14, hl * .2, 10), { wash: AI_CYANW, ink: S.P.ink, sw: S.sw * .35 });
  if (S.u > 12) aiGlow(g[0], g[1], hl * .8, AI_CYAN, .5);
  return { bead: g };
}
// The light stethoscope (03B): earpieces at her ears, the tubes down to a Y at her chest, one tube to the chestpiece in her
// hand. All cyan light (glow + fine lines).
function aiStetho(g, sp, u, form) {
  const S = AI_S, H = S.H; if (!H) return;
  const chibi = form === 'chibi', y0 = chibi ? .42 : .38, ex = .96;
  const eL = H(-ex, y0), eR = H(ex, y0), Y = chibi ? [.15 * u, -4.05 * u] : [.1 * u, -7.7 * u], hl = (chibi ? AI_CHIBI_ARM.hl : .52) * u;
  const tube = (a, b, c) => { const P = aiCurve([a, b, c], 6); aiLine(P, S.sw * 1.1, AI_CYAND, 'inkfine'); aiLine(P, S.sw * .6, AI_CYANW, 'inkfine'); if (S.u > 12) for (let i = 2; i < P.length; i += 4) aiGlow(P[i][0], P[i][1], .22 * u, AI_CYAN, .35); };
  tube(eL, [lerp(eL[0], Y[0], .4) - .3 * u, lerp(eL[1], Y[1], .55)], Y); tube(eR, [lerp(eR[0], Y[0], .4) + .2 * u, lerp(eR[1], Y[1], .55)], Y);
  tube(Y, [lerp(Y[0], g[0], .5) + .2 * u, lerp(Y[1], g[1], .5) + .25 * u], g);
  for (const e of [eL, eR]) aiPaint(aiEll(e[0], e[1], hl * .12, hl * .12, 8), { wash: AI_CYANW, ink: AI_CYAND, sw: S.sw * .3 });
  const cp = [g[0], g[1] + hl * .32];
  aiPaint(aiEll(cp[0], cp[1], hl * .44, hl * .32, 16), { wash: AI_CYANW, ink: AI_CYAND, sw: S.sw * .4 });
  aiPaint(aiEll(cp[0], cp[1], hl * .3, hl * .21, 14), { wash: AI_CYAN, op: 200, ink: null });
  if (S.u > 12) { aiGlow(cp[0], cp[1], hl * 1.2, AI_CYAN, .8); aiGlow(Y[0], Y[1], hl * .7, AI_CYAN, .4); }
  return { chest: cp };
}
// A diary page (06G): cream paper, amber hand-written scribble lines; k folds it into a filed glowing block.
function aiPage(c, a, h, k, sp) {
  const S = AI_S, sw = S.sw, w = h * .78, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]];
  const kk = ease(k), hw = lerp(w * .5, h * .32, kk), hh = lerp(h * .5, h * .32, kk);
  const at = (x, y) => [c[0] + n[0] * x + d[0] * y, c[1] + n[1] * x + d[1] * y];
  const P = []; for (let i = 0; i <= 6; i++) P.push(at(lerp(-hw, hw, i / 6), -hh + (1 - kk) * h * .02 * Math.sin(i * 2.1)));
  for (let i = 0; i <= 6; i++) P.push(at(hw, lerp(-hh, hh, i / 6)));
  for (let i = 6; i >= 0; i--) P.push(at(lerp(-hw, hw, i / 6), hh - (1 - kk) * h * .025 * (i % 2)));   // the torn edge
  for (let i = 6; i >= 0; i--) P.push(at(-hw, lerp(-hh, hh, i / 6)));
  if (kk > .05 && S.u > 10) aiGlow(c[0], c[1], h * .8, AI_CYAN, .7 * kk);
  aiPaint(P, { wash: mixCol('#FFF4E2', AI_CYAN, kk), ink: mixCol('#5A3A22', AI_CYAND, kk), sw: sw * .4 });
  if (kk < .7) for (let i = 0; i < 5; i++) { const y = lerp(-hh * .7, hh * .7, i / 4), L = hw * (1.5 - .35 * hash(i * 3.1 + (sp.seed || 0))) * (1 - kk);
    const pts = []; for (let j = 0; j <= 8; j++) pts.push(at(-hw * .75 + L * j / 8, y + hh * .05 * Math.sin(j * 2.3 + i)));
    aiLine(pts, sw * .45, mixCol('#E8963A', AI_CYAN, kk), 'inkfine'); }
  if (kk > .6) { const z = hw * .5; aiLine([at(-z * .7, 0), at(-z * .1, z * .55), at(z * .8, -z * .6)], sw * (.6 + .4 * kk), AI_CYAND); }
  return { centre: c };
}
// A glowing cyan block (02C's tetromino cell; 06G's filed page): z = side (px), sp.check paints a ✓.
function aiBlock(c, z, sp = {}) {
  const S = AI_S, sw = S.sw, h = z / 2, r = z * .14;
  const box = []; for (const [cx, cy, a0] of [[h - r, h - r, 0], [-h + r, h - r, Math.PI / 2], [-h + r, -h + r, Math.PI], [h - r, -h + r, Math.PI * 1.5]]) for (let i = 0; i <= 3; i++) { const t = a0 + i / 3 * Math.PI / 2; box.push([c[0] + cx + Math.cos(t) * r, c[1] + cy + Math.sin(t) * r]); }
  if (S.u > 10) aiGlow(c[0], c[1], z * 1.25, AI_CYAN, .75);
  aiPaint(box, { wash: sp.col || AI_CYAN, ink: AI_CYAND, sw: sw * .5 });
  aiPaint([[c[0] - h * .7, c[1] - h * .72], [c[0] + h * .55, c[1] - h * .72], [c[0] + h * .4, c[1] - h * .45], [c[0] - h * .7, c[1] - h * .45]], { wash: AI_CYANW, op: 200, ink: null });
  aiPaint([[c[0] + h * .55, c[1] - h * .3], [c[0] + h * .75, c[1] - h * .4], [c[0] + h * .75, c[1] + h * .6], [c[0] + h * .55, c[1] + h * .7]], { wash: '#4FB8E8', op: 150, ink: null });
  if (sp.check) aiLine([[c[0] - h * .42, c[1] + h * .02], [c[0] - h * .08, c[1] + h * .38], [c[0] + h * .48, c[1] - h * .36]], sw * 1.1, '#0F4FBF');
  return { centre: c };
}
// The IV stand (04C), standalone: (0, 0) = its floor point; ~11u tall. Returns { grip (the pole at hand height), bag, drip }.
function aiIVStand(u, sp) {
  const S = AI_S, sw = S.sw, P = S.P, steel = '#AEB6C8', hgt = (sp.h ?? 10.5) * u;
  for (const k of [-1, 1, -.4, .4]) aiPaint(aiRibPts(aiRib([[0, -.38 * u], [k * .5 * u, -.2 * u], [k * .95 * u, -.07 * u]], [.09 * u, .08 * u, .07 * u], 3)), { wash: steel, ink: P.ink, sw: sw * .4 });   // the legs
  for (const k of [-1, 1, -.4, .4]) aiPaint(aiEll(k * .95 * u, 0, .1 * u, .08 * u, 8), { wash: '#3C4258', ink: null });
  const pole = aiRib([[0, -.3 * u], [0, -hgt * .5], [0, -hgt]], [.11 * u, .1 * u, .09 * u], 3);
  aiPaint(aiRibPts(pole), { wash: steel, ink: P.ink, sw: sw * .45 });
  aiLine(pole.L.map((p, i) => [lerp(p[0], pole.C[i][0], .5), p[1]]), sw * .25, '#FFFFFF');
  for (const k of [-1, 1]) aiLine(aiCurve([[0, -hgt], [k * .5 * u, -hgt - .08 * u], [k * .62 * u, -hgt + .2 * u]], 4), sw * .5, steel);
  // the bag of glowing tokens
  const bc = [.62 * u, -hgt + 1.3 * u], bw = .62 * u, bh = 1.0 * u;
  aiGlow(bc[0], bc[1], 1.6 * u, AI_CYAN, .7);
  aiPaint(aiLoop([[bc[0] - bw * .5, bc[1] - bh * .55], [bc[0] + bw * .5, bc[1] - bh * .55], [bc[0] + bw * .55, bc[1] + bh * .3], [bc[0] + bw * .2, bc[1] + bh * .55], [bc[0] - bw * .2, bc[1] + bh * .55], [bc[0] - bw * .55, bc[1] + bh * .3]], 3), { wash: '#E9FBFF', op: 200, ink: P.ink, sw: sw * .4 });
  for (let i = 0; i < 7; i++) { const x = bc[0] + (hash(i * 3.3) - .5) * bw * .7, y = bc[1] + (hash(i * 7.1) - .2) * bh * .5, z = .1 * u;
    aiPaint([[x - z, y - z], [x + z, y - z], [x + z, y + z], [x - z, y + z]], { wash: i % 2 ? AI_CYAN : '#BFF6FF', ink: null }); }
  aiLine([[bc[0], bc[1] - bh * .55], [.62 * u * .6, -hgt + .1 * u]], sw * .4, steel);
  const dc = [bc[0], bc[1] + bh * .8];
  aiPaint([[dc[0] - .07 * u, dc[1] - .12 * u], [dc[0] + .07 * u, dc[1] - .12 * u], [dc[0] + .06 * u, dc[1] + .14 * u], [dc[0] - .06 * u, dc[1] + .14 * u]], { wash: '#E9FBFF', ink: P.ink, sw: sw * .3 });
  if (sp.tube) { const pts = [dc].concat(sp.tube.map(w => aiFromW(w))); aiLine(aiCurve(pts, 6), sw * .55, AI_CYAN, 'inkfine'); }
  return { grip: [0, -(sp.gripH ?? 5.6) * u], bag: bc, drip: dc, top: [0, -hgt] };
}
