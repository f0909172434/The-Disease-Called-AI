// ai_pose.js: her poses and actions beyond the model sheet (loaded right after ai.js; every global is ai / AI_).
//   - transforms: aiToW / aiFromW (her local px <-> world px, inside ai()), aiLastPts (AI_LAST)
//   - arms: aiIK (two-bone reach), aiArmsFull (o.reachL / o.reachLW / o.propL ... for the full form), the chibi arm
//     rig (aiChibiRig / aiChibiArm / aiChibiHand)
//   - pose 'sit' (full form, front / q): aiSitLower, aiSitApron, aiTailSit
//   - acted actions as option sets to spread into ai(): aiAct (wave, point, nod, shake, carry, push, hold, clap, salute,
//     stetho, catch, cover, cup, stroke, throat, glass), aiClimb (out of a screen edge), aiDescend (from the lamp + dip)

// ---------- her frame <-> the world ----------
// A point of her local space (px, as passed to aiPaint, before the boil) to world px, and back. Only valid inside ai().
function aiToW(p) {
  const S = AI_S, f = S.tf; let [x, y] = aiRotL(p[0], p[1]); y -= f.py;
  if (f.roll) { const c = Math.cos(f.roll), n = Math.sin(f.roll); [x, y] = [x * c - y * n, x * n + y * c]; }
  return [f.X + f.sx * x, f.Y + f.py + f.sy * y];
}
function aiFromW(w) {
  const S = AI_S, f = S.tf; let x = (w[0] - f.X) / f.sx, y = (w[1] - f.Y - f.py) / f.sy;
  if (f.roll) { const c = Math.cos(-f.roll), n = Math.sin(-f.roll); [x, y] = [x * c - y * n, x * n + y * c]; }
  y += f.py;
  if (S.rot) { const r = S.rot; S.rot = -r; [x, y] = aiRotL(x, y); S.rot = r; }
  return [x, y];
}
// AI_LAST: her contact points in world px (see ai.js).
function aiLastPts(H, form, u, o, sit) {
  const S = AI_S, F = AI_FACE[form], view = form === 'chibi' && o.view === 'side' ? 'q' : o.view || (o.pose === 'lie' ? 'q' : 'front');
  const yaw = (AI_YAW[view] ?? 0) + (o.yaw || 0), c = Math.cos(yaw), s = Math.sin(yaw);
  const ex = x => x * c + Math.cos(Math.asin(clamp(x, -1, 1))) * .9 * s;
  const r = { u, flip: !!o.flip, head: aiToW(H(0, 0)), eyeL: aiToW(H(ex(-F.eyeX), F.eyeY)), eyeR: aiToW(H(ex(F.eyeX), F.eyeY)),
    mouth: aiToW(H(.9 * s, F.mouthY)), chin: aiToW(H(.7 * s, F.chin)), throat: aiToW(H(.5 * s, F.chin + .3)), crown: aiToW(H(0, -1.05)) };
  const G = AI_FORM[form], q = view === 'q';
  r.notch = aiToW(form === 'chibi' ? [(q ? .16 : 0) * u, AI_RC.p.neck[1] * u] : [(q ? .12 : 0) * u, G.neck[1] * u]);
  for (const k in S.pts) r[k] = aiToW(S.pts[k]);
  return r;
}

// ---------- arms ----------
// The full form's hand is drawn this much bigger than G.arm[2] (closer to the reference's hands).
const AI_HANDK = 1.3;
// Two-bone reach: shoulder Sh to the target T (px) for a hand that holds things hl past the wrist. Returns aiArm's
// angles: a (upper arm from hanging, + = out / up on side s) and e (elbow bend). The elbow points out (down and back
// in profile). The forearm shortens as it bends, as aiArm draws it.
function aiIK(Sh, T, lu, lf, s, hl, prof, rk = .3) {
  // Two solutions: the elbow bent one way (e > 0: aiArm folds the forearm in, and shortens it) or the other (e < 0).
  // Take the one whose elbow hangs lower (elbows stay down), except in profile where it points back.
  const solve = sgn => {
    let tg = T, a = 0, e = 0;
    for (let it = 0; it < 3; it++) {
      const dx = tg[0] - Sh[0], dy = tg[1] - Sh[1], D = Math.hypot(dx, dy) || 1e-6;
      let ee = 0, lf2 = lf;
      for (let j = 0; j < 4; j++) { lf2 = lf * (1 - rk * clamp(ee)); ee = Math.acos(clamp((D * D - lu * lu - lf2 * lf2) / (2 * lu * lf2), -1, 1)); }
      lf2 = lf * (1 - rk * clamp(ee));
      const th = Math.atan2(s * dx, dy), beta = Math.atan2(lf2 * Math.sin(ee), lu + lf2 * Math.cos(ee));
      if (prof) { a = th - sgn * beta; e = sgn * ee; } else { a = th + sgn * beta; e = sgn * ee; }
      const a2 = prof ? a + e : a - e;
      tg = [T[0] - s * Math.sin(a2) * hl, T[1] - Math.cos(a2) * hl];
    }
    return { a, e, ey: Sh[1] + Math.cos(a) * lu };
  };
  if (prof) return solve(1);
  const p = solve(1), q = solve(-1);
  return q.ey > p.ey + .02 * lu ? q : p;
}
// The full form's arm settings for ai(): angles, or a reach target (o.reachL / o.reachR in her local u, o.reachLW /
// o.reachRW in world px) solved by aiIK; o.propL / o.propR = what each hand holds; o.handAL / handAR = hand angle (rad,
// screen, overrides the direction the forearm gives it).
function aiArmsFull(G, B, view, o, sit) {
  const S = AI_S, u = S.u, prof = view === 'side', out = {};
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    let a = o['a' + k], e = o['e' + k];
    const hand = o['hand' + k] || 'relax', tW = o['reach' + k + 'W'];
    const rest = sit && !tW && !o['reach' + k] && o.sitRest !== false;   // sitting, the hands rest on the lap (the emotions' standing arm angles would cross them)
    const tU = o['reach' + k] || (rest ? (view === 'q' ? AI_SIT.restQ : AI_SIT.rest)[k] : null);
    const Tg = tW ? aiFromW(tW) : tU ? [tU[0] * u, tU[1] * u] : null, ik = !!Tg && !(prof && s < 0);
    if (ik) {
      // the target is the palm; with a set hand angle the wrist sits half a hand back along it, else along the forearm
      const Sh = prof ? [-.06 * u, G.shY * u + .16 * u] : [B(s * G.shW) - s * .06 * u, G.shY * u + .16 * u], hA = o['handA' + k], hl = G.arm[2] * AI_HANDK * .5 * u;
      const T2 = hA === undefined ? Tg : [Tg[0] - Math.cos(hA) * hl, Tg[1] - Math.sin(hA) * hl];
      const r = aiIK(Sh, T2, G.arm[0] * u, G.arm[1] * u, s, hA === undefined ? .06 * u + hl : .06 * u, prof);
      a = r.a; e = r.e;
    }
    out['a' + k] = a ?? .06; out['e' + k] = e ?? (s < 0 ? 1.05 : 1.0); out['h' + k] = hand;
    out['x' + k] = { prop: o['prop' + k], hang: o['handA' + k] ?? (rest ? (view === 'q' ? AI_SIT.restAQ : AI_SIT.restA)[k] : undefined), key: k, ik };
  }
  return out;
}

// ---------- the chibi's arm rig ----------
// Without a reach the chibi keeps the measured arms of the reference (fists at the apron). With o.reachL / o.reachR
// (local u) or o.reachLW / o.reachRW (world px) the arm is a rig: the puffed sleeve is the upper arm, a short sleeve, the
// gold-ringed cuff and a hand (o.handL / o.handR: fist | open | flat | point), and it may stretch up to 1.7x (chibi arms
// are short). An arm raised above the shoulder is painted over the hair and the face-framing locks.
const AI_CHIBI_ARM = { sh: [1.2, -4.32], lu: .62, lf: .55, hl: .56 };
function aiChibiRig(o, q, u) {
  const A = AI_CHIBI_ARM, out = [null, null];
  [[-1, 'L'], [1, 'R']].forEach(([s, k], i) => {
    const tW = o['reach' + k + 'W'], tU = o['reach' + k];
    if (!tW && !tU) return;
    const bodyX = x => q ? .16 + x * (x < 0 ? 1 : .8) : x;
    const hA = o['handA' + k], T0 = tW ? aiFromW(tW) : [tU[0] * u, tU[1] * u], Sh = [bodyX(s * A.sh[0]) * u, A.sh[1] * u];
    const T = hA === undefined ? T0 : [T0[0] - Math.cos(hA) * A.hl * .5 * u, T0[1] - Math.sin(hA) * A.hl * .5 * u];   // the target is the palm
    Sh[1] -= .3 * u * clamp((Sh[1] - T[1]) / (2 * u));   // the shoulder lifts for a high reach
    const D = Math.hypot(T[0] - Sh[0], T[1] - Sh[1]), reach = (A.lu + A.lf + A.hl * .55) * u, st = clamp(D / (reach * .9), 1, o.armStretch ?? 1.9);
    const r = aiIK(Sh, T, A.lu * u * st, A.lf * u * st, s, (hA === undefined ? A.hl * .55 + .1 : .1) * u, false, 0);
    out[i] = { s, Sh, a: r.a, e: r.e, st, hand: o['hand' + k] || 'fist', prop: o['prop' + k], hang: o['handA' + k], up: T[1] < Sh[1] - .25 * u || Math.abs(T[0]) > 2.1 * u, key: k };
  });
  return out;
}
// part: 'puff' (the upper sleeve) | 'lower' (forearm, cuff, hand, prop) | 'all'.
function aiChibiArm(R, part) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, A = AI_CHIBI_ARM, s = R.s;
  const d1 = [s * Math.sin(R.a), Math.cos(R.a)], E = [R.Sh[0] + d1[0] * A.lu * u * R.st, R.Sh[1] + d1[1] * A.lu * u * R.st];
  const a2 = R.a - R.e, d2 = [s * Math.sin(a2), Math.cos(a2)], Wr = [E[0] + d2[0] * A.lf * u * R.st, E[1] + d2[1] * A.lf * u * R.st];
  const pa = Math.atan2(d1[1], d1[0]);
  if (part !== 'lower') {   // the puff: a ball sleeve over the shoulder, along the upper arm
    const pc = [R.Sh[0] + d1[0] * .3 * u, R.Sh[1] + d1[1] * .3 * u];
    aiWC(aiEll(pc[0], pc[1], .5 * u, .4 * u, 22, pa), C.navy, { glaze: 45, sw: sw * .7 });
    aiPaint(aiEll(pc[0] - d1[1] * .1 * u * s, pc[1] - .1 * u, .25 * u, .14 * u, 12, pa), { wash: C.navyHi, op: 140, ink: null });
    for (const k of [-.45, 0, .45]) { const n = [-d1[1], d1[0]], q0 = [pc[0] + d1[0] * .38 * u + n[0] * k * .3 * u, pc[1] + d1[1] * .38 * u + n[1] * k * .3 * u]; aiLine([q0, [q0[0] - d1[0] * .22 * u, q0[1] - d1[1] * .22 * u]], sw * .3, C.navySh); }
  }
  if (part === 'puff') return Wr;
  // the forearm sleeve from inside the puff to the cuff
  const E0 = [R.Sh[0] + d1[0] * .45 * u, R.Sh[1] + d1[1] * .45 * u];
  const fa = aiRib([E0, E, Wr], [.4 * u, .38 * u, .32 * u], 4);
  if (Math.hypot(Wr[0] - E0[0], Wr[1] - E0[1]) > .12 * u) { aiPaint(aiRibPts(fa), { wash: C.navy, ink: C.ink, sw: sw * .6 }); aiLine(fa.L.slice(1, -1).map((p, i) => [lerp(p[0], fa.C[i + 1][0], .35), lerp(p[1], fa.C[i + 1][1], .35)]), sw * .3, C.navyHi); }
  const ca = Math.atan2(d2[1], d2[0]);
  aiPaint(aiEll(Wr[0], Wr[1], .19 * u, .26 * u, 18, ca), { wash: mixCol(C.navy, C.ink, .15), ink: C.ink, sw: sw * .55 });
  aiPaint(aiEll(Wr[0], Wr[1], .155 * u, .21 * u, 16, ca), { ink: C.gold, sw: sw * .35 });
  const ha = R.hang ?? ca, hp = [Wr[0] + d2[0] * .1 * u, Wr[1] + d2[1] * .1 * u], L = A.hl * u, grip = [hp[0] + Math.cos(ha) * L * .5, hp[1] + Math.sin(ha) * L * .5];
  S.pts['hand' + R.key] = grip; S.pts['wrist' + R.key] = Wr;
  const th = s * (Math.cos(ha) < 0 ? 1 : -1);
  if (R.prop && !aiPropFront(R.prop)) aiPropAt(R.prop, grip, ha, u, s, 'chibi');
  aiChibiHand(hp, ha, L, R.hand, th);
  if (R.prop && aiPropFront(R.prop)) aiPropAt(R.prop, grip, ha, u, s, 'chibi');
  return Wr;
}
// A chibi hand at p along angle a, length L (px); th = the thumb's side (+1 / -1). kind: fist | open | flat | point.
function aiChibiHand(p, a, L, kind, th) {
  const C = AI_S.P, sw = AI_S.sw * .5;
  const R = (x, y) => { const c = Math.cos(a), n = Math.sin(a); return [p[0] + (x * c - y * th * n) * L, p[1] + (x * n + y * th * c) * L]; };
  const M = pts => pts.map(q => q[2] ? [...R(q[0], q[1]), 1] : R(q[0], q[1]));
  const wc = pts => aiWC(aiLoop(M(pts), 3), C.skin, { dark: C.skinSh, glaze: 50, sw, br: C.br, pool: .6 });
  const crease = mixCol(C.skinSh, C.ink, .3);
  if (kind === 'open') {   // a soft palm out, four short round fingers a little apart, the thumb out to the side
    wc([[-.04, -.3], [.3, -.36], [.5, -.38], [.66, -.46], [.82, -.44], [.84, -.32], [.92, -.26], [1.02, -.18], [1.0, -.08], [.9, -.04], [1.04, .03], [1.02, .14], [.9, .14], [.94, .24], [.86, .32], [.7, .26], [.6, .3], [.66, .48], [.58, .58], [.44, .5], [.3, .36], [-.04, .28]]);
    aiLine(M([[.66, -.32], [.8, -.25]]), sw * .5, crease); aiLine(M([[.72, -.08], [.86, -.05]]), sw * .5, crease); aiLine(M([[.72, .1], [.82, .14]]), sw * .5, crease);
    aiLine(M([[.28, -.06], [.44, .04], [.4, .16]]), sw * .5, crease);
    return;
  }
  if (kind === 'flat') {   // fingers together and straight (a salute, a palm on glass, a hand pressed to the chest)
    wc([[-.04, -.28], [.35, -.32], [.7, -.32], [.95, -.27], [1.08, -.16], [1.1, -.02], [1.02, .1], [.7, .18], [.58, .22], [.62, .4], [.5, .48], [.32, .36], [-.04, .28]]);
    for (const y of [-.14, .0]) aiLine(M([[.66, y], [.98, y + .01]]), sw * .5, crease);
    return;
  }
  // fist (and the point's fist): a round little fist with knuckle bumps, the thumb across
  wc([[-.04, -.36], [.3, -.42], [.58, -.4], [.78, -.28], [.86, -.06], [.8, .16], [.64, .32], [.34, .4], [-.04, .3]]);
  for (const k of [-.2, 0, .18]) aiLine(M([[.6, k - .05], [.75, k], [.8, k + .04]]), sw * .5, crease);
  if (kind === 'point') aiWC(aiLoop(M([[.5, -.36], [.9, -.42], [1.24, -.38], [1.34, -.29], [1.26, -.2], [.9, -.17], [.6, -.15]]), 3), C.skin, { glaze: 0, sw, br: C.br, pool: 0 });
}

// ---------- pose 'sit' (full form, front / q): on a bed edge or a chair ----------
// Her frame is the standing one with the seat at AI_SIT.seat: the upper body is unchanged, the thighs come toward the
// viewer over the seat, the skirt falls from the knees and the feet rest AI_SIT.floor u below the seat. The anchor
// (x, y) is the seat point under her hips (the bed's front edge). Default hands rest on the lap (AI_SIT.rest).
const AI_SIT = { seat: -5.62, knee: -5.28, hem: -3.72, ankle: -2.78, floor: 3.05, hair: { lenL: 5.0, lenR: 5.0 }, rest: { L: [-.42, -5.72], R: [.44, -5.7] }, restA: { L: Math.PI / 2 + .25, R: Math.PI / 2 - .25 }, lap: [.05, -6.05],
  restQ: { L: [.5, -6.28], R: [1.05, -6.22] }, restAQ: { L: .45, R: .3 }, lapQ: [1.3, -6.1] };
function aiSitLower(G, B, P, view, swing, tt) {
  if (view === 'q') return aiSitLowerQ(G, swing);
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, Z = AI_SIT, q = false, kx = 0;
  const Q = pts => pts.map(p => { const r = P(p[0], p[1]); return p[2] ? [r[0], r[1], 1] : r; });
  S.pts.lap = P(Z.lap[0] + kx * .5, Z.lap[1]);
  // stockings and shoes: the shins hang from the knees, the feet a little apart
  for (const s of q ? [1, -1] : [-1, 1]) {
    const far = q && s > 0, kn = [s * .27 + kx, Z.knee + .05], an = [s * .25 + kx * 1.05 + (swing[s < 0 ? 0 : 1] || 0) * 1.4, Z.ankle];
    const L = aiRib([P(kn[0], kn[1]), P(lerp(kn[0], an[0], .4) - s * .02, lerp(kn[1], an[1], .4)), P(an[0], an[1])], [.25 * u, .24 * u, .16 * u], 4);
    aiPaint(aiRibPts(L), { wash: far ? C.stockSh : C.stock, ink: C.ink, sw: sw * .55, br: C.brS });
    aiLine(L.R.slice(Math.round(L.R.length * .3)), sw * .35, C.stockSh);
    const A0 = P(an[0], an[1]), ang = Math.PI / 2 - s * .25 + (q ? -.55 : 0), Ls = .4 * u;
    const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [A0[0] + (x * c - y * n) * Ls, A0[1] + (x * n + y * c) * Ls]; };
    aiPaint(aiLoop([F(-.12, -.42), F(.35, -.48), F(.78, -.38), F(.95, 0), F(.78, .38), F(.35, .48), F(-.12, .42)], 4), { wash: far ? mixCol(C.shoe, C.ink, .3) : C.shoe, ink: C.ink, sw: sw * .6 });
    aiLine([F(.15, -.4), F(.22, 0), F(.15, .4)], sw * .45, C.gold);
    aiLine([F(.6, -.25), F(.72, .05)], sw * .4, C.shoeHi);
  }
  // petticoat ruffle under the hem
  const n = 12, hem = []; for (let i = 0; i <= n; i++) { const f = i / n; hem.push([lerp(-1.3, 1.3, f) + kx * 1.1, Z.hem + .08 * Math.sin(f * Math.PI) + .04 * Math.sin(f * Math.PI * 9)]); }
  aiFrill(Q(hem.map(([a, b]) => [a * 1.01, b - .05])), .3 * u, 15, { shade: true, double: true });
  // the skirt: over the hips, across the lap to the knees, then falling to the hem
  const sk = [[-.47, -6.62], [-.72, -6.32], [-1.0, -5.98], [-1.2, -5.5], [-1.24, Z.knee, 1], [-1.27, -4.6], [hem[0][0], hem[0][1], 1], ...hem.slice(1, -1), [hem[n][0], hem[n][1], 1], [1.27, -4.6], [1.24, Z.knee, 1], [1.2, -5.5], [1.0, -5.98], [.72, -6.32], [.47, -6.62]];
  aiPaint(aiLoop(Q(sk), 4), { wash: C.navy, ink: C.ink, sw: sw * .85, br: C.brS });
  // the lap's lit top, the shadow falling down the front, the knees' edge, folds, embroidery
  aiPaint(aiLoop(Q([[-.9, -6.0], [.9 + kx * .3, -6.0], [1.1 + kx * 1.1, -5.4], [-1.1 + kx * .8, -5.4]]), 3), { wash: C.navyHi, op: 100, ink: null });
  aiPaint(aiLoop(Q([[.15 + kx, Z.knee + .08], [1.15 + kx * 1.15, Z.knee + .02], [1.24 + kx * 1.05, -4.4], [1.22 + kx * 1.05, Z.hem + .05, 1], [.4 + kx, Z.hem + .12]]), 3), { wash: C.navySh, op: 170, ink: null, hatch: u > 30 ? aiHatch(C.hatch, .95) : null });
  aiLine(aiCurve(Q([[-1.15 + kx * .9, Z.knee - .02], [-.55 + kx, Z.knee + .06], [kx, Z.knee - .02], [.55 + kx, Z.knee + .06], [1.15 + kx * 1.15, Z.knee - .02]]), 4), sw * .5, C.navySh);
  for (const f of [-.8, -.45, -.1, .3, .7]) aiLine(Q([[f * 1.05 + kx, Z.knee + .12], [f * 1.12 + kx, lerp(Z.knee, Z.hem, .55)], [f * 1.2 + kx, Z.hem + .02]]), sw * .35, f > 0 ? C.ink : C.navySh);
  for (const f of [-.65, .1]) aiLine(Q([[f * .9, -6.25], [f * 1.0 + kx * .3, -5.75]]), sw * .3, C.navySh);
  for (const off of [.2, .34]) aiLine(Q(hem.map(([a, b]) => [a * .98, b - off])), sw * .38, C.gold);
  if (C.glowK) aiLine(Q([[-1.0, -5.98], [-1.17 + kx * .6, -5.42], [-1.22 + kx, -4.6]]), sw * .6, C.rim);
}
// 3/4 (facing screen-right): the thighs run toward screen-right over the seat, the skirt falls from the knees like a
// bell, the shins hang from the knees. Coordinates are drawn x (u, from her centre line), not the body's B() remap.
const AI_SITQ = { lap: [[.45, -6.62], [.66, -6.36], [1.2, -6.07], [1.75, -5.92], [2.15, -5.82], [2.32, -5.56]], knee: [2.1, -5.45] };
function aiSitLowerQ(G, swing) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, Z = AI_SIT, qc = .12, D = (x, y) => [(qc + x) * u, y * u];
  const Q = pts => pts.map(p => { const r = D(p[0], p[1]); return p[2] ? [r[0], r[1], 1] : r; });
  S.pts.lap = D(Z.lapQ[0], Z.lapQ[1]); S.pts.knee = D(AI_SITQ.knee[0], AI_SITQ.knee[1]);
  // the shins hang from the knees; the feet point toward screen-right
  for (const s of [1, -1]) {
    const far = s > 0, kn = far ? [2.22, -5.45] : [2.02, -5.4], an = [kn[0] - .12 + (swing[far ? 1 : 0] || 0) * 1.6, Z.ankle - (far ? .06 : 0)];
    const L = aiRib([D(kn[0], kn[1]), D(lerp(kn[0], an[0], .45) + .05, lerp(kn[1], an[1], .45)), D(an[0], an[1])], [.27 * u, .25 * u, .16 * u], 4);
    aiPaint(aiRibPts(L), { wash: far ? C.stockSh : C.stock, ink: C.ink, sw: sw * .55, br: C.brS });
    aiLine(L.R.slice(Math.round(L.R.length * .3)), sw * .35, C.stockSh);
    const A0 = D(an[0], an[1]), ang = .35 + (swing[far ? 1 : 0] || 0), Ls = .42 * u;
    const F = (x, y) => { const c = Math.cos(ang), n = Math.sin(ang); return [A0[0] + (x * c - y * n) * Ls, A0[1] + (x * n + y * c) * Ls]; };
    aiPaint(aiLoop([F(-.25, -.3), F(.2, -.34), F(.7, -.32), F(1.02, -.12), F(1.02, .14), F(.6, .26), F(-.1, .3), F(-.3, .18)], 4), { wash: far ? mixCol(C.shoe, C.ink, .3) : C.shoe, ink: C.ink, sw: sw * .6 });
    aiLine([F(.05, -.3), F(.15, .0), F(.1, .26)], sw * .45, C.gold);
    aiLine([F(.6, -.22), F(.9, -.12)], sw * .4, C.shoeHi);
  }
  // the petticoat under the bell's hem
  const n = 10, hem = []; for (let i = 0; i <= n; i++) { const f = i / n; hem.push([lerp(.82, 2.55, f), Z.hem + .1 * Math.sin(f * Math.PI) + .035 * Math.sin(f * Math.PI * 8)]); }
  aiFrill(Q(hem.map(([a, b]) => [a, b - .05])), .3 * u, 12, { shade: true, double: true });
  // the skirt: waist, over the hip and along the lap to the knee, down the bell to the hem, back up under the thigh,
  // along the seat to the back of the hips
  const lp = AI_SITQ.lap, sk = [[-.34, -6.62], ...lp, [2.36, -5.2], [2.45, -4.5], [hem[n][0], hem[n][1], 1], ...hem.slice(1, -1).reverse(), [hem[0][0], hem[0][1], 1], [.92, -4.5], [1.02, -5.3], [.75, -5.52], [.1, -5.58], [-.5, -5.62], [-.64, -5.95], [-.52, -6.35]];
  aiPaint(aiLoop(Q(sk), 4), { wash: C.navy, ink: C.ink, sw: sw * .85, br: C.brS });
  // the lap's lit top, the bell's shadow side, the knee's edge, folds, embroidery
  aiPaint(aiLoop(Q([[.5, -6.5], [.7, -6.3], [1.2, -6.02], [1.75, -5.86], [2.12, -5.76], [2.0, -5.6], [1.4, -5.7], [.75, -5.85], [.2, -6.05]]), 3), { wash: C.navyHi, op: 110, ink: null });
  aiPaint(aiLoop(Q([[1.0, -5.32], [1.6, -5.42], [2.1, -5.3], [2.0, -4.3], [2.1, Z.hem + .1], [1.0, Z.hem + .14], [.95, -4.5]]), 3), { wash: C.navySh, op: 170, ink: null, hatch: u > 30 ? aiHatch(C.hatch, .95) : null });
  aiLine(aiCurve(Q([[1.05, -5.35], [1.55, -5.5], [2.05, -5.45], [2.3, -5.3]]), 4), sw * .45, C.navySh);
  for (const f of [.2, .42, .62, .82]) aiLine(Q([[lerp(1.1, 2.3, f), -5.32 + .05 * Math.sin(f * 3)], [lerp(1.0, 2.4, f), lerp(-5.3, Z.hem, .6)], [lerp(.9, 2.5, f), Z.hem + .03]]), sw * .35, f > .6 ? C.ink : C.navySh);
  for (const f of [.25, .55]) aiLine(Q([[lerp(.6, 2.0, f), lerp(-6.3, -5.88, f) + .05], [lerp(.6, 2.0, f) + .35, lerp(-6.3, -5.88, f) + .2]]), sw * .3, C.navySh);
  for (const off of [.2, .34]) aiLine(Q(hem.map(([a, b]) => [a, b - off])), sw * .38, C.gold);
  if (C.glowK) aiLine(Q(lp.slice(1)), sw * .6, C.rim);
}
// The apron over the lap, hanging over the knees, with the little whale.
function aiSitApron(G, P, view) {
  if (view === 'q') return aiSitApronQ(G);
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, Z = AI_SIT, kx = 0;
  const Q = pts => pts.map(p => { const r = P(p[0], p[1]); return p[2] ? [r[0], r[1], 1] : r; });
  const by = -4.5, edge = [[-.42, -6.6], [-.62, -6.0], [-.74 + kx * .6, Z.knee], [-.74 + kx, -4.85], [-.6 + kx, by + .02], [kx, by + .08], [.6 + kx, by + .02], [.74 + kx * 1.1, -4.85], [.76 + kx * 1.1, Z.knee], [.62, -6.0], [.42, -6.6]];
  aiFrill(aiCurve(Q(edge.slice(1, -1)), 4), .16 * u, 14, { shade: true, sw: sw * .45 });
  aiPaint(aiLoop(Q(edge), 4), { wash: C.cream, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop(Q([[-.55 + kx * .4, -5.6], [.6 + kx, -5.6], [.68 + kx * 1.1, Z.knee - .02], [-.68 + kx, Z.knee - .02]]), 2), { wash: '#FFFFFF', op: 70, ink: null });
  aiPaint(aiLoop(Q([[.05 + kx, Z.knee + .06], [.72 + kx * 1.1, Z.knee + .02], [.72 + kx * 1.1, -4.85], [.55 + kx, by + .05], [.15 + kx, by + .08]]), 3), { wash: C.creamSh, op: 150, ink: null, hatch: u > 30 ? aiHatch(mixCol(C.creamSh, C.ink, .25), .9, 1.2) : null });
  aiLine(aiCurve(Q([[-.72 + kx, Z.knee + .02], [-.3 + kx, Z.knee + .07], [.3 + kx, Z.knee + .07], [.74 + kx * 1.1, Z.knee + .02]]), 4), sw * .4, C.creamSh);
  for (const f of [-.45, 0, .42]) aiLine(Q([[f + kx, Z.knee + .12], [f * 1.05 + kx, by + .1]]), sw * .3, C.creamSh);
  // the whale on the hanging part
  const wc = P(-.25 + kx, -4.82), z = G.whale * u * 1.15, W = pts => pts.map(([a, b, k]) => k ? [wc[0] + a * z, wc[1] + b * z, 1] : [wc[0] + a * z, wc[1] + b * z]);
  aiPaint(aiLoop(W([[-.52, .04], [-.48, -.2], [-.25, -.32], [.05, -.3], [.3, -.18], [.44, -.06], [.54, -.22], [.7, -.34, 1], [.64, -.08], [.78, .04, 1], [.52, .04], [.34, .14], [0, .22], [-.36, .2]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .35 });
  for (const [a, b] of [[[-.32, -.36], [-.42, -.58]], [[-.24, -.37], [-.2, -.6]]]) aiLine(W([a, b]), sw * .3, C.bow);
  const wy = G.waistY, ww = G.waistW + .04;
  aiPaint(Q([[-ww, wy - .07], [ww, wy - .07], [ww, wy + .08], [-ww, wy + .08]]), { wash: C.cream, ink: C.ink, sw: sw * .55 });
}
function aiSitApronQ(G) {
  const S = AI_S, C = S.P, u = S.u, sw = S.sw, qc = .12, D = (x, y) => [(qc + x) * u, y * u];
  const Q = pts => pts.map(p => { const r = D(p[0], p[1]); return p[2] ? [r[0], r[1], 1] : r; });
  const ap = [[.3, -6.62], [.62, -6.32], [1.15, -6.0], [1.75, -5.86], [2.12, -5.76], [2.3, -5.5], [2.36, -5.0], [2.38, -4.62, 1], [2.0, -4.55], [1.72, -4.6, 1], [1.72, -5.1], [1.55, -5.5], [1.0, -5.68], [.45, -5.9], [-.08, -6.25], [-.14, -6.62]];
  aiFrill(aiCurve(Q([[2.38, -4.62], [2.05, -4.52], [1.72, -4.6]]), 4), -.14 * u, 5, { shade: true, sw: sw * .45 });
  aiPaint(aiLoop(Q(ap), 4), { wash: C.cream, ink: C.ink, sw: sw * .6 });
  aiPaint(aiLoop(Q([[.4, -6.5], [1.1, -5.98], [1.75, -5.84], [2.1, -5.74], [1.9, -5.62], [1.1, -5.84], [.3, -6.3]]), 3), { wash: '#FFFFFF', op: 80, ink: null });
  aiPaint(aiLoop(Q([[1.75, -5.45], [2.25, -5.4], [2.3, -4.7], [1.8, -4.66]]), 3), { wash: C.creamSh, op: 150, ink: null, hatch: u > 30 ? aiHatch(mixCol(C.creamSh, C.ink, .25), .9, 1.2) : null });
  aiLine(aiCurve(Q([[1.6, -5.52], [2.0, -5.58], [2.28, -5.45]]), 4), sw * .4, C.creamSh);
  const wc = D(1.0, -5.92), z = G.whale * u, W = pts => pts.map(([a, b, k]) => k ? [wc[0] + a * z, wc[1] + b * z, 1] : [wc[0] + a * z, wc[1] + b * z]);
  aiPaint(aiLoop(W([[-.52, .04], [-.48, -.2], [-.25, -.32], [.05, -.3], [.3, -.18], [.44, -.06], [.54, -.22], [.7, -.34, 1], [.64, -.08], [.78, .04, 1], [.52, .04], [.34, .14], [0, .22], [-.36, .2]]), 4), { wash: C.navy, ink: C.ink, sw: sw * .35 });
  const wy = G.waistY;
  aiPaint(Q([[-.36, wy - .07], [.5, wy - .07], [.5, wy + .08], [-.36, wy + .08]]), { wash: C.cream, ink: C.ink, sw: sw * .55 });
}
// The tail lying on the seat beside her, its flukes curling up (front: to screen-right; 3/4: behind her, to the left).
function aiTailSit(G, view, sway) {
  const q = view === 'q', m = q ? -1 : 1;
  const path = [[.55, -5.85], [1.25, -5.68], [1.9, -5.72], [2.35, -6.05], [2.45, -6.6]].map(([x, y]) => [x * m + (q ? -.1 : 0), y]);
  aiTail({ ...G, tail: path }, 'front', sway * .6);
}

// ---------- actions (chibi first; full-form ones say so) ----------
// aiAct(name, t, t0, o) -> options to spread into ai() after aiFeel / aiEmotions (it sets arms, head and body bits, not
// the face, unless the action needs it). t0 = when the action starts (it eases in over ~.2 s with an anticipation);
// o.form 'full' gives the full-form version where there is one. o.at / o.to / o.dir: targets in her local u.
//   wave    one hand waving beside the face, the other pressed to the chest (00C, 02F)
//   point   pointing (o.dir: angle in rad, 0 = screen-right, -π/2 = up; default up-right) (02B, 09C)
//   nod     eager nodding on every beat (02G)          shake   a sweet head shake "no" (02G Never.)
//   carry   a block on her raised palm (02C)          push    the arm thrust out, pushing the block (02C)
//   hold    a prop held in both hands in front (06G page, 06B phone)
//   clap    clapping on the beat (02C, 04B)          salute  hand to the brow (01A)
//   stetho  the light stethoscope: earpieces in, chestpiece held down (03B)
//   catch   one hand up to catch (06G)
//   full form only: cover (hands over his ears, o.at = his head, world px), cup (hands cupping his face, o.at), stroke
//   (stroking his hair on her lap, o.at), throat (hand on her own throat, 10G), glass (palm raised to the glass, 09H/09I)
function aiAct(name, t, t0 = 0, o = {}) {
  const r = aiAct0(name, t, t0, o);
  return o.side === 'L' ? aiActMirror(r) : r;
}
// The same action done with the other hand: swap the arms' keys, mirror their x and hand angles.
function aiActMirror(r) {
  const out = { ...r };
  for (const [a, b] of [['reachL', 'reachR'], ['handL', 'handR'], ['handAL', 'handAR'], ['propL', 'propR'], ['reachLW', 'reachRW']]) { out[a] = r[b]; out[b] = r[a]; if (out[a] === undefined) delete out[a]; if (out[b] === undefined) delete out[b]; }
  for (const k of ['reachL', 'reachR']) if (out[k]) out[k] = [-out[k][0], out[k][1]];
  for (const k of ['handAL', 'handAR']) if (out[k] !== undefined) out[k] = Math.PI - out[k];
  for (const k of ['tilt', 'rot', 'lookX', 'yaw', 'headDx', 'dx']) if (out[k] !== undefined) out[k] = -out[k];
  return out;
}
function aiAct0(name, t, t0, o) {
  const age = t - t0, k = backOut(seg(age, 0, .28)), kin = ease(seg(age, 0, .22)), b = bpOf(t), full = o.form === 'full';
  const mix = (a, c) => [lerp(a[0], c[0], kin), lerp(a[1], c[1], kin)];
  const restL = full ? [-.25, -6.75] : [-.55, -3.55], restR = full ? [.25, -6.75] : [.55, -3.55];
  switch (name) {
    case 'wave': {
      const sw = Math.sin(b * Math.PI), up = full ? [1.25, -9.55] : o.high ? [4.0, -8.9] : [2.75, -5.75];   // high: the hand clears the hair (a shadow puppet)
      const p = [up[0] + .22 * sw * k, up[1] - .1 * Math.abs(sw) * k];
      return { reachR: mix(restR, p), handR: 'open', handAR: -Math.PI / 2 + .55 * sw * k + .15, armStretch: o.high ? 4 : undefined, reachL: mix(restL, full ? [-.05, -7.75] : [-.3, -4.15]), handL: 'flat', handAL: full ? -.2 : -.35,
        tilt: .06 * k + .02 * sw, rot: -.02 * k, lookX: .25 };
    }
    case 'point': {
      const d = o.dir ?? -.45, base = full ? [.75, -8.0] : [1.2, -4.32], L = full ? 2.2 : 1.55, p = [base[0] + Math.cos(d) * L, base[1] + Math.sin(d) * L];
      return { reachR: mix(restR, p), handR: 'point', handAR: d, rot: .04 * k * Math.cos(d), tilt: .05 * k, lookX: .6 * Math.cos(d), lookY: .6 * Math.sin(d) };
    }
    case 'nod': { const h = Math.pow(Math.abs(Math.sin(b * Math.PI)), 1.5); return { headDy: .16 * h * k, tilt: -.03 * h, sq: .03 * h, lookY: .3 * h, ahoge: .35 * Math.sin(b * Math.PI) }; }
    case 'shake': { const d = Math.exp(-1.8 * Math.max(0, age - .6)), s = Math.sin(age * TAU * 2.6) * kin * d; return { yaw: .3 * s, headDx: .1 * s, tilt: -.05 * s, ahoge: -.4 * s, hairLag: -.15 * s }; }
    case 'carry': {
      const p = o.at || [3.05, -4.75];
      return { reachR: mix(restR, p), handR: 'open', handAR: -Math.PI / 2 + .2, propR: { kind: 'block', at: 'top', ...(o.prop || {}) }, reachL: mix(restL, [-.5, -3.6]), handL: 'fist', rot: -.03 * k, tilt: -.05 * k };
    }
    case 'push': {
      const p = o.at || [2.4, -4.5];
      return { reachR: mix(restR, p), handR: 'open', handAR: .1, propR: { kind: 'block', at: 'side', ...(o.prop || {}) }, reachL: mix(restL, [-.75, -3.8]), handL: 'fist', rot: .08 * k, dx: .15 * k, tilt: .05 * k };
    }
    case 'hold': {
      const c = o.at || (full ? [.05, -7.05] : [0, -3.75]), w = o.w ?? (full ? .3 : .42);
      return { reachL: mix(restL, [c[0] - w, c[1] + .05]), reachR: mix(restR, [c[0] + w, c[1] + .05]), handL: 'fist', handR: 'fist', handAL: -1.2, handAR: Math.PI + 1.2 - Math.PI * 2,
        propR: o.prop ? { at: 'mid', mid: [c[0], c[1]], ...o.prop } : undefined };
    }
    case 'clap': {
      const h = Math.exp(-frac(b) * 7), g = full ? .07 + .22 * (1 - h) : .06 + .32 * (1 - h), y = full ? -7.4 : -4.25;
      return { reachL: mix(restL, [-g, y]), reachR: mix(restR, [g, y]), handL: 'flat', handR: 'flat', handAL: -Math.PI / 2 + .35, handAR: -Math.PI / 2 - .35, sq: .03 * h, ahoge: .2 * h };
    }
    case 'salute': return { reachR: mix(restR, full ? [.62, -9.55] : [2.3, -6.75]), handR: 'flat', handAR: -2.25, reachL: restL, sq: -.03 * k, tilt: -.04 * k, rot: -.015 * k };
    case 'stetho': {
      const p = o.at || [1.45, -2.9];
      return { reachR: mix(restR, p), handR: 'fist', propR: { kind: 'stetho', ...(o.prop || {}) }, reachL: mix(restL, [-.45, -4.0]), handL: 'flat', handAL: -.6, rot: .07 * k, tilt: .12 * k, lookX: .3, lookY: .5 };
    }
    case 'catch': {
      const p = o.at || [2.0, -5.6];
      return { reachR: mix(restR, p), handR: 'open', handAR: -Math.PI / 2 - .4, propR: o.prop, reachL: mix(restL, [-.4, -4.0]), handL: 'fist', rot: -.04 * k, tilt: .06 * k, lookX: .5, lookY: -.4 };
    }
    // full form, around him: o.at = his head centre (world px), o.r = his head's half-width (px)
    case 'cover': { const c = o.at, r = o.r || 40; return { reachLW: [c[0] - r * .95, c[1] + r * .05], reachRW: [c[0] + r * .95, c[1] - r * .05], handL: 'flat', handR: 'flat', handAL: -Math.PI / 2 - .1, handAR: -Math.PI / 2 + .1, tilt: .1 }; }
    case 'cup': { const c = o.at, r = o.r || 40; return { reachLW: [c[0] - r * .85, c[1] + r * .35], reachRW: [c[0] + r * .85, c[1] + r * .3], handL: 'flat', handR: 'flat', handAL: -Math.PI / 2 + .35, handAR: -Math.PI / 2 - .35, tilt: .08 }; }
    case 'stroke': { const c = o.at, r = o.r || 40, s = Math.sin(age * TAU * .5); return { reachRW: [c[0] + r * (.1 + .35 * s), c[1] - r * .55], handR: 'flat', handAR: .25 + .2 * s, reachL: [-.15, -6.05], tilt: .14, lookY: .7 }; }
    case 'throat': return { reachR: mix(restR, [.06, -8.22]), handR: 'flat', handAR: -2.15, tilt: -.05 };
    case 'glass': { const p = o.at || [1.0, -9.0]; return { reachR: mix(restR, p), handR: 'flat', handAR: -Math.PI / 2, tilt: .04 }; }
  }
  return {};
}
// Climbing out of a screen (01A, 03B; 00C popping up out of the bubble's lower edge): she rises from below an edge at
// her ground line, peeks, grabs the edge, pulls herself up and hops on (dur s). Spread into ai() for the chibi and give
// ai() o.clip = [x0, y0, x1, edgeY] (world px) so only what is above the edge shows: the result's .clip says which edge
// rows to use (her local u: everything above y = 0, the ground she ends standing on). Returns { dy, ... }.
function aiClimb(t, t0, dur = 1.2) {
  const p = (t - t0) / dur;
  if (p >= 1) { const a = t - t0 - dur; return { dy: 0, sq: .14 * Math.exp(-8 * a) * Math.cos(18 * a), float: .05 }; }
  const ph = (a, b) => clamp((p - a) / (b - a));
  // 0-.28 peek (eyes over the edge), .28-.45 hands grab the edge, .45-.75 pull up, .75-1 hop on
  let dy = lerp(10.6, 5.5, easeOut(ph(0, .28)));
  dy = lerp(dy, 2.0, ease(ph(.45, .75)));
  if (p > .75) { const k = ph(.75, 1); dy = lerp(2.0, 0, k) - 1.4 * 4 * k * (1 - k); }
  const grab = ph(.28, .4), hold = p < .8;
  const o = { dy, float: 0, bob: 0, eyes: p < .45 ? 'wide' : 'normal', lookY: p < .3 ? .2 : 0, sq: p > .45 && p < .75 ? -.06 * Math.sin(ph(.45, .75) * Math.PI) : 0, tilt: .05 * Math.sin(p * 9) };
  if (grab > 0 && hold) { const y = -dy - .38; o.reachL = [lerp(-.55, -1.8, grab), lerp(-3.55, y, grab)]; o.reachR = [lerp(.55, 1.85, grab), lerp(-3.55, y, grab)]; o.handL = o.handR = 'fist'; o.handAL = Math.PI / 2 + .3; o.handAR = Math.PI / 2 - .3; }
  return o;
}
// Descending out of the lamp (04A): from h u above, slowing to land at t1, then the curtsy dip and settle.
// Returns { dy, sq, hairLag, fin, float, beam } (beam 0..1: the light column still on her; see aiBeam).
function aiDescend(t, t0, t1, h = 7) {
  const k = seg(t, t0, t1), e = 1 - Math.pow(1 - k, 2.4);
  const land = t - t1, dip = land > 0 ? .28 * Math.sin(Math.min(1, land / .45) * Math.PI) + .05 * Math.exp(-5 * land) * Math.sin(land * 16) : 0;
  return { dy: -h * (1 - e) + dip, sq: land > 0 ? .05 * Math.exp(-7 * land) * Math.cos(land * 15) : -.04 * (1 - k), hairLag: -.25 * (1 - k), fin: .4 * (1 - k), float: .25, beam: 1 - seg(t, t1, t1 + .6) };
}
