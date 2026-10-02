// him_prop.js: what the human lead wears and holds (round 8): new hand shapes, the phone with his hand (and on its
// own), the wristband prop and the band being fastened, the IV line, the cuff rings, the headphones and their plug, the
// thermometer, the sticker, the heart light under the shirt, the lens and mouth effects; the poses sheet.
// Loaded after him.js and him_pose.js. Painted only through himKit / paint() / inkLine() / ribbon() / glow().

// ---------- hands ----------
// A finger in hand units: from base along angle a (0 = +y, + toward +x), segment lengths L, widths w0 → w1, a round tip.
function himFingerPts(base, a, L, w0, w1, bend = 0) {
  const P = [base]; let p = base, aa = a;
  for (const l of L) { p = [p[0] + Math.sin(aa) * l, p[1] + Math.cos(aa) * l]; P.push(p); aa += bend; }
  const W = P.map((_, i) => lerp(w0, w1, i / (P.length - 1))), tb = himTube(P, W), e = P[P.length - 1], d = himDir(P[P.length - 2], e), r = w1 / 2, tip = [];
  for (let k = 1; k < 6; k++) { const th = k / 6 * Math.PI; tip.push([e[0] - d[1] * r * Math.cos(th) + d[0] * r * Math.sin(th), e[1] + d[0] * r * Math.cos(th) + d[1] * r * Math.sin(th)]); }
  return { out: tb.L.concat(tip, tb.R), P, e, d, r, n: P.length };
}
// The back of the hand (seen from the knuckle side), fingers relaxed (curl foreshortens them: they bend away from
// the viewer), spread fans them; the thumb lies along the +x side. Used by 'rest' (on the lap), 'open', 'press', 'spread'.
function himHandBack(K, c, tf, sk, H) {
  const sp = H.spread, cu = H.curl, ink = c.ink;
  const F = [[-.33, .9, .62, .23, .19, -.17], [-.11, .97, .77, .26, .21, -.055], [.13, .99, .83, .27, .22, .055], [.36, .93, .76, .26, .21, .17]];
  const fk = [1 - cu * .25, 1 - cu * .62, 1 - cu * .9];
  const fs = F.map(([x, y, l, w0, w1, a]) => himFingerPts([x, y - .08], a * (.35 + sp), [l * .46 * fk[0], l * .3 * fk[1], l * .24 * fk[2]], w0, w1));
  fs.forEach((f, i) => {
    const Q = tf(f.out);
    K.shape(Q, { wash: i === 0 ? mixCol(sk, c.skinSh, .35) : sk, ink: null, n: 3 });
    if (cu > .3) K.shape(tf(f.out.slice(Math.floor(f.out.length / 2) - 4, Math.floor(f.out.length / 2) + 5)), { wash: c.skinSh, op: 120 * cu, ink: null, n: 3 });   // the curled tips turn away into shadow
    K.line(Q.slice(1, -1), i === 3 ? .46 : .4, ink, { n: 3 });
    if (K.det) {
      const j = f.P[1], d = himDir(f.P[0], f.P[1]), wr = f.r * 1.1;   // the middle joint's wrinkles
      K.line(tf([[j[0] - d[1] * wr * .6, j[1] + d[0] * wr * .6], [j[0] + d[1] * wr * .5, j[1] - d[0] * wr * .5]]), .2, c.skinDk, { raw: true });
      if (cu < .4) {   // nails at the tips
        const e = f.e, dd = f.d, q = [e[0] - dd[0] * f.r * .7, e[1] - dd[1] * f.r * .7];
        K.shape(tf(ellPts(q[0], q[1], f.r * .58, f.r * .82, 8, 0, -Math.atan2(dd[0], dd[1]))), { wash: c.nail, ink: c.skinDk, sw: .2, n: 2, j: 0 });
      }
    }
  });
  const body = [[-.36, -.05], [.36, -.05], [.45, .28], [.52, .62], [.5, .88], [.38, .98], [.13, 1.02], [-.11, 1.0], [-.33, .94], [-.46, .78], [-.47, .42]];
  K.shape(tf(body), { wash: sk, ink: null, n: 3 });
  K.shape(tf([[-.36, -.05], [-.47, .42], [-.46, .78], [-.33, .94], [-.24, .7], [-.26, .3]]), { wash: c.skinSh, op: 140, ink: null, n: 3 });   // the little-finger side turns away
  K.line(tf(body.slice(9).concat([body[0]])), .5, ink, { n: 3 });
  K.line(tf([[.36, -.05], [.45, .28]]), .5, ink, { n: 2 });
  if (K.det) {
    for (const [x, y] of [[-.33, .9], [-.11, .97], [.13, .99], [.36, .93]]) K.line(tf([[x - .08, y - .02], [x, y - .07], [x + .08, y - .02]]), .24, c.skinDk, { n: 2 });   // knuckles
    if (K.det2) for (const x of [-.2, .02, .24]) K.line(tf([[x * .7, .22], [x * .85, .5], [x, .78]]), .18, c.skinSh, { n: 2 });   // tendons
  }
  // the thumb, out along the +x side
  const th = himFingerPts([.4, .26], .5 + .55 * sp, [.38, .3], .31, .25, -.12 - .1 * cu);
  K.shape(tf(th.out), { wash: sk, ink: null, n: 3 });
  K.shape(tf([[.38, .2], [.5, .3], [.56, .55], [.46, .5]]), { wash: c.skinSh, op: 110, ink: null, n: 3 });
  K.line(tf(th.out.slice(1, -1)), .44, ink, { n: 3 });
  if (K.det) { const e = th.e, d = th.d, q = [e[0] - d[0] * th.r * .75 + d[1] * th.r * .2, e[1] - d[1] * th.r * .75 - d[0] * th.r * .2];
    K.shape(tf(ellPts(q[0], q[1], th.r * .5, th.r * .78, 8, 0, -Math.atan2(d[0], d[1]))), { wash: c.nail, ink: c.skinDk, sw: .2, n: 2, j: 0 }); }
}
// Profile hands (from the thumb side; the palm toward +x). point: the index straight out, the others curled;
// pinch: the thumb and index tips together (holding a plug); flat: a flat hand, fingers straight (palm on glass).
function himHandSide(K, c, tf, sk, H) {
  const ink = c.ink;
  if (H.kind === 'flat') {
    const P = [[-.2, -.05], [-.25, .45], [-.24, .95], [-.2, 1.45], [-.13, 1.78], [-.03, 1.86], [.07, 1.78], [.12, 1.4], [.13, .98], [.2, .78], [.36, .62], [.4, .42], [.32, .12], [.24, -.05]];
    K.shape(tf(P), { wash: sk, ink: null, n: 3 });
    K.shape(tf([[-.2, -.05], [-.25, .45], [-.24, .95], [-.2, 1.45], [-.1, 1.4], [-.12, .9], [-.12, .4]]), { wash: c.skinSh, op: 150, ink: null, n: 3 });
    K.line(tf(P.slice(0, 7)), .5, ink, { n: 3 }); K.line(tf(P.slice(6)), .58, ink, { n: 3 });   // the palm side presses on the glass: heavier
    K.line(tf([[.12, .98], [.0, 1.05], [-.05, 1.2]]), .3, ink, { n: 2 });   // the thumb's tip against the index
    if (K.det) { K.line(tf([[-.22, 1.02], [-.14, 1.04]]), .22, c.skinDk, { raw: true }); K.line(tf([[-.17, 1.42], [-.1, 1.44]]), .22, c.skinDk, { raw: true });
      K.shape(tf(ellPts(-.16, 1.68, .055, .11, 8)), { wash: c.nail, ink: c.skinDk, sw: .2, n: 2, j: 0 }); }
    return;
  }
  const fist = [[-.32, -.05], [-.38, .5], [-.4, .95], [-.3, 1.25], [-.05, 1.42], [.25, 1.36], [.43, 1.15], [.47, .8], [.42, .4], [.32, -.05]];
  if (H.kind === 'point') {   // the index first (behind the fist's outline at its root), then the fist over it
    const f = himFingerPts([-.18, 1.0], -.04, [.42, .3, .24], .27, .21);
    K.shape(tf(f.out), { wash: sk, ink: null, n: 3 }); K.line(tf(f.out.slice(1, -1)), .48, ink, { n: 3 });
    if (K.det) { const e = f.e; K.shape(tf(ellPts(e[0] - .07, e[1] - .12, .055, .1, 8)), { wash: c.nail, ink: c.skinDk, sw: .2, n: 2, j: 0 });
      K.line(tf([[-.31, 1.42], [-.2, 1.44]]), .22, c.skinDk, { raw: true }); }
    const P = [[-.32, -.05], [-.38, .5], [-.36, .95], [-.12, 1.12], [.18, 1.3], [.4, 1.12], [.46, .8], [.42, .4], [.32, -.05]];
    K.shape(tf(P), { wash: sk, ink: null, n: 3 }); K.line(tf(P.slice(0, 4)), .5, ink, { n: 3 }); K.line(tf(P.slice(4)), .5, ink, { n: 3 });
    K.line(tf([[-.08, 1.12], [.12, 1.06], [.32, .96]]), .3, ink, { n: 2 });   // the curled fingers' edges
    K.line(tf([[.05, .45], [.2, .78], [.3, .9]]), .38, ink, { n: 3 });   // the thumb along the side
    K.shape(tf([[-.32, .05], [-.37, .5], [-.35, .9], [-.22, .8], [-.18, .3]]), { wash: c.skinSh, op: 150, ink: null, n: 3 });
    return;
  }
  // pinch
  K.shape(tf(fist), { wash: sk, ink: null, n: 4 }); K.line(tf(fist), .52, ink, { n: 4 });
  K.shape(tf([[-.32, .05], [-.38, .5], [-.4, .9], [-.24, .8], [-.18, .3]]), { wash: c.skinSh, op: 150, ink: null, n: 3 });
  const th = himFingerPts([.3, .62], .55, [.34, .28], .27, .22, -.25), ix = himFingerPts([.1, 1.25], .7, [.3, .22], .25, .2, -.4);
  for (const f of [ix, th]) { K.shape(tf(f.out), { wash: sk, ink: null, n: 3 }); K.line(tf(f.out.slice(1, -1)), .42, ink, { n: 3 }); }
  K.line(tf([[-.12, 1.0], [.1, 1.1], [.3, 1.06]]), .26, ink, { n: 2 });
  HIM_PINCH = tf([ix.e])[0];
}
let HIM_PINCH = null;
Object.assign(HIM_HANDS, {
  rest:   { draw: himHandBack, spread: .12, curl: .62 },
  open:   { draw: himHandBack, spread: .55, curl: .1 },
  press:  { draw: himHandBack, spread: .35, curl: 0 },
  spread: { draw: himHandBack, spread: 1.2, curl: 0 },
  point:  { draw: himHandSide, kind: 'point' },
  pinch:  { draw: himHandSide, kind: 'pinch' },
  flat:   { draw: himHandSide, kind: 'flat' },
  hold:   HIM_HANDS.type
});
