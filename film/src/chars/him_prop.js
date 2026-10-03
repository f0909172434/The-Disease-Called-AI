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
  const F = [[-.31, .88, .72, .22, .18, -.17], [-.1, .95, .9, .25, .2, -.055], [.12, .97, .97, .26, .21, .055], [.33, .91, .88, .25, .2, .17]];
  const fs = F.map(([x, y, l, w0, w1, a], i) => { const cc = H.curls ? H.curls[i] : cu, fk = [1 - cc * .25, 1 - cc * .62, 1 - cc * .9];
    return himFingerPts([x, y - .08], a * (.35 + sp), [l * .46 * fk[0], l * .3 * fk[1], l * .24 * fk[2]], w0, w1); });
  fs.forEach((f, i) => {
    const Q = tf(f.out);
    K.shape(Q, { wash: i === 0 ? mixCol(sk, c.skinSh, .35) : sk, ink: null, n: 3 });
    const ci = H.curls ? H.curls[i] : cu;
    if (ci > .3) K.shape(tf(f.out.slice(Math.floor(f.out.length / 2) - 4, Math.floor(f.out.length / 2) + 5)), { wash: c.skinSh, op: 120 * ci, ink: null, n: 3 });   // the curled tips turn away into shadow
    K.line(Q.slice(1, -1), i === 3 ? .46 : .4, ink, { n: 3 });
    if (K.det) {
      const j = f.P[1], d = himDir(f.P[0], f.P[1]), wr = f.r * 1.1;   // the middle joint's wrinkles
      K.line(tf([[j[0] - d[1] * wr * .6, j[1] + d[0] * wr * .6], [j[0] + d[1] * wr * .5, j[1] - d[0] * wr * .5]]), .2, c.skinDk, { raw: true });
      if (ci < .4) {   // nails at the tips
        const e = f.e, dd = f.d, q = [e[0] - dd[0] * f.r * .7, e[1] - dd[1] * f.r * .7];
        K.shape(tf(ellPts(q[0], q[1], f.r * .58, f.r * .82, 8, 0, -Math.atan2(dd[0], dd[1]))), { wash: c.nail, ink: c.skinDk, sw: .2, n: 2, j: 0 });
      }
    }
  });
  const body = [[-.33, -.05], [.33, -.05], [.44, .22], [.5, .5], [.47, .82], [.35, .95], [.12, .99], [-.1, .97], [-.31, .91], [-.43, .76], [-.43, .4]];
  K.shape(tf(body), { wash: sk, ink: null, n: 3 });
  K.shape(tf([[-.33, -.05], [-.43, .4], [-.43, .76], [-.31, .91], [-.22, .7], [-.24, .3]]), { wash: c.skinSh, op: 140, ink: null, n: 3 });   // the little-finger side turns away
  K.line(tf(body.slice(9).concat([body[0]])), .5, ink, { n: 3 });
  if (K.det) {
    for (const [x, y] of [[-.31, .88], [-.1, .95], [.12, .97], [.33, .91]]) K.line(tf([[x - .06, y - .03], [x, y - .07], [x + .06, y - .03]]), .2, c.skinSh, { n: 2 });   // knuckles
    if (K.det2) for (const x of [-.2, .02, .24]) K.line(tf([[x * .7, .22], [x * .85, .5], [x, .78]]), .18, c.skinSh, { n: 2 });   // tendons
  }
  // the thumb, out along the +x side
  const th = himFingerPts([.36, .16], (H.thumbA ?? .42) + .55 * sp, [.44, .36, .28].map(l => l * (H.thumbL ?? 1)), .36, .24, -.08 - .1 * cu);
  K.shape(tf(th.out), { wash: sk, ink: null, n: 3 });
  K.shape(tf(th.out.slice(Math.floor(th.out.length / 2) + 1)), { wash: c.skinSh, op: 90, ink: null, n: 3 });
  K.line(tf(th.out.slice(2, -1)), .44, ink, { n: 3 });
  K.line(tf([[.33, -.05], [.38, .1]]), .45, ink, { n: 2 });
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
  pointBack: { draw: himHandBack, spread: .05, curl: 1, curls: [1, 1, 1, 0], thumbA: .05, thumbL: .85 },
  point:  { draw: himHandSide, kind: 'point' },
  pinch:  { draw: himHandSide, kind: 'pinch' },
  flat:   { draw: himHandSide, kind: 'flat' },
  hold:   HIM_HANDS.type
});

// ---------- the phone ----------
// Phone-local units: the phone is 1 wide and 2.06 tall, centred on the origin, x right, y down (no brand, no text).
const HIM_PHONE = { w: 1, h: 2.06, r: .13, sx: .045, sy: .075, sr: .09 };
const HIM_SCREENS = { cyan: ['#C9F7FF', '#7FE9FF'], white: ['#F4F6F8', '#DDE3EA'], grey: ['#8A909B', '#6B7280'], off: ['#15171F', '#0B0C12'], amber: ['#FFE2B8', '#FFB070'] };
// The phone itself, in a kit whose unit is the phone's width. face: 'front' (the screen) | 'back' (the casing) |
// 'edge' (seen from the side, a thin slab). o.screen: a HIM_SCREENS name or a hex; o.content(S): paints the screen
// (S = { w, h, u }: px, origin at the screen's centre, called inside the phone's transform); o.glowK: screen light.
function himPhoneBody(K, c, face, o = {}) {
  const P = HIM_PHONE, body = himCol(c, '#2A2833'), edge = himCol(c, '#4A4756'), u = K.u;
  if (face === 'edge') {   // the slab from the side: the screen edge glows on one face
    K.shape(rrPts(-.07, -P.h / 2, .14, P.h, .05), { wash: body, sw: .5, raw: true, j: 0 });
    K.line([[-.05, -P.h / 2 + .1], [-.05, P.h / 2 - .1]], .35, (HIM_SCREENS[o.screen] || HIM_SCREENS.cyan)[1], { raw: true });
    return;
  }
  K.shape(rrPts(-P.w / 2, -P.h / 2, P.w, P.h, P.r), { wash: body, sw: .62, raw: true, j: 0, cl: '#0B1E3C' });
  K.line([[-P.w / 2 + .04, -P.h / 2 + .2], [-P.w / 2 + .04, P.h / 2 - .2]], .3, edge, { raw: true });   // the lit rim
  if (face === 'back') {
    K.shape(rrPts(-P.w / 2 + .1, -P.h / 2 + .1, .3, .42, .08), { wash: edge, sw: .3, raw: true, j: 0 });   // camera bump
    for (const [x, y] of [[-.25, -.78], [-.25, -.56]]) K.shape(ellPts(x, y, .07, .07, 10), { wash: '#0E0E14', ink: c.ink, sw: .2, raw: true, j: 0 });
    K.line([[.42, -.2], [.42, .6]], .3, edge, { raw: true });
    return;
  }
  const sc = HIM_SCREENS[o.screen] || (o.screen && o.screen[0] === '#' ? [o.screen, o.screen] : HIM_SCREENS.cyan), sw = P.w - 2 * P.sx, sh = P.h - 2 * P.sy;
  K.shape(rrPts(-sw / 2, -sh / 2, sw, sh, P.sr), { wash: himCol(c, sc[0]), ink: null, raw: true, j: 0, cl: '#0E3A5C' });
  K.shape([[-sw / 2, sh / 2 - .5], [sw / 2, sh / 2 - .9], [sw / 2, sh / 2], [-sw / 2, sh / 2]], { wash: himCol(c, sc[1]), op: 60, ink: null, raw: true, j: 0 });   // a soft gradient
  if (o.content) { push(); o.content({ w: sw * u, h: sh * u, u }); pop(); }
  K.shape([[-sw / 2 + .05, -sh / 2 + .05], [-sw / 2 + .32, -sh / 2 + .05], [-sw / 2 + .05, -sh / 2 + .55]], { wash: '#FFFFFF', op: 50, ink: null, raw: true, j: 0 });   // glare on the glass
  K.line([[-.12, -P.h / 2 + .045], [.12, -P.h / 2 + .045]], .3, edge, { raw: true });   // earpiece slit
}
// The thumb (or a finger) as two phalanges from base to tip, its knuckle bowed to side s; returns the outline etc.
function himDigit(base, tip, L1, w0, w1, s = 1) {
  const d = Math.hypot(tip[0] - base[0], tip[1] - base[1]), L2 = Math.max(d - L1 * .55, d * .45), j = himIK(base, tip, L1, L2, s);
  const P = [base, himAt(base, j, .5), j, himAt(j, tip, .55), tip];
  const W = P.map((_, i) => lerp(w0, w1, i / (P.length - 1))), tb = himTube(P, W), e = tip, dd = himDir(j, tip), r = w1 / 2, cap = [];
  for (let k = 1; k < 6; k++) { const th = k / 6 * Math.PI; cap.push([e[0] - dd[1] * r * Math.cos(th) + dd[0] * r * Math.sin(th), e[1] + dd[0] * r * Math.cos(th) + dd[1] * r * Math.sin(th)]); }
  return { out: tb.L.concat(cap, tb.R), j, d: dd, r, e, P };
}
// himPhone(x, y, u, o): his hand holding the phone, close to the camera (02B, 02E, 07A, 07E), or the phone alone.
// u is the figure's unit (the phone is 1.25u wide: give the same u as the shot's scale, or a big one for an insert).
// o.grip: 'hold' (default: his right hand, the screen cheated to camera, the thumb over the screen) | 'poke' (the phone
// in his left hand, his right index pokes the screen) | 'none'; o.ang (tilt, rad), o.flip (mirror the hands only),
// o.thumb [sx, sy] (0..1 on the screen: where the thumb is), o.tap (0..1: thumb down), o.type (> 0: the thumb hops over
// the keyboard area by itself, o.type taps/s), o.poke [sx, sy], o.press (0..1), o.blur (0..1: frantic, ghosted finger),
// o.screen ('cyan'|'white'|'grey'|'off'|'amber'|hex), o.content(S) (paints the screen: S = {w, h, u}, origin at its
// centre), o.glowK (screen light, default 1), o.outfit ('home': bare forearm | 'launch': blazer sleeve), o.pal, o.band
// (default: on the left wrist when the left hand is in shot), o.face ('front' | 'back'), o.boilKey.
// Sets HIM_LAST.screen = the screen's four corners and HIM_LAST.screenC = its centre (caller coordinates).
function himPhone(x, y, u, o = {}) {
  const c = himPal(o.pal || 'human'), pu = u * 1.25 * (o.scale || 1), id = o.boilKey ?? 'phone' + (++HIM_N), rs = k => c.clean ? himSeed('ph ' + id + k) : boilSeed('ph ' + id + k);
  const sw = clamp(.28 + pu / 120, .32, 1.7), K = himKit(pu, c, sw, Math.max(.4, pu * .006), false), grip = o.grip || 'hold', P = HIM_PHONE;
  const sk = c.skin, ink = c.ink, mx = o.flip ? -1 : 1, M = Q => Q.map(([a, b, k]) => [a * mx, b, k]);
  HIM_M0 = himMat(); HIM_LAST = {};
  push(); translate(x, y); rotate((o.ang ?? -.1) * mx);
  const sP = (sx, sy) => [-P.w / 2 + P.sx + (P.w - 2 * P.sx) * sx, -P.h / 2 + P.sy + (P.h - 2 * P.sy) * sy];
  const scr = HIM_SCREENS[o.screen] || HIM_SCREENS.cyan, lit = o.screen !== 'off', gk = (o.glowK ?? 1) * (lit ? 1 : 0);
  // the forearm and the back of the holding hand (behind the phone): right hand for 'hold', left for 'poke'
  const holdHand = grip !== 'none', hm = grip === 'poke' ? -mx : mx, H = Q => Q.map(([a, b, k]) => [a * hm, b, k]);
  if (holdHand) {
    rs('arm');
    // the forearm: narrow at the wrist, swelling toward the elbow (out of frame below)
    const FA = [[.0, 1.5], [.06, 1.95], [.18, 2.6], [.28, 3.3], [.36, 4.1]], FW = [.74, .72, .8, .92, .98];
    const fa = himTube(FA.map(([a, b]) => [a + .36, b]), FW), arm = H(fa.outline);
    K.shape(arm, { wash: sk, ink: null, n: 3 });
    K.shape(H(himTube(FA.map(([a, b]) => [a + .36, b]), FW.map(w => [-.08, w / 2])).outline), { wash: c.skinSh, op: 150, ink: null, n: 3 });
    K.line(H(fa.L), .5, ink, { n: 3 }); K.line(H(fa.R), .58, ink, { n: 3 });
    if (K.det) K.line(H([[.62, 2.3], [.7, 2.9], [.72, 3.5]]), .2, c.skinSh, { n: 2 });   // a tendon's soft ridge
    if ((o.outfit || 'home') === 'launch') {   // the shirt cuff and the blazer sleeve round the forearm
      const cuf = himTube([[.48, 2.5], [.62, 3.0]], [.98, 1.02]), sl = himTube([[.6, 2.95], [.74, 3.6], [.84, 4.4]], [1.16, 1.24, 1.3]);
      K.shape(H(cuf.outline), { wash: c.shirt, sw: .4, n: 2 });
      K.shape(H(sl.outline), { wash: c.jacket, sw: .6, n: 3, wc: 1 });
      K.shape(H(himTube([[.6, 2.95], [.74, 3.6], [.84, 4.4]], [[-.15, .58], [-.15, .62], [-.15, .65]]).outline), { wash: c.jacketSh, ink: null, n: 3 });
      K.line(H([[.2, 3.05], [.5, 3.2], [.95, 3.0]]), .26, c.jacketDk, { n: 2 });
    }
    const bandOn = o.band ?? (hm < 0);   // the band is on his left wrist
    if (bandOn) { rs('band'); himBand(K, c, H([[.4, 1.86]])[0], -.12 * hm, .82); }
    // the palm: the heel below the phone, the ball of the thumb out past its right edge, the little-finger side on the left
    rs('palm');
    const palm = H([[-.4, .72], [-.5, .98], [-.42, 1.22], [-.16, 1.4], [.18, 1.5], [.5, 1.46], [.72, 1.26], [.78, .98], [.72, .7], [.58, .5], [.3, .55]]);
    K.shape(palm, { wash: sk, ink: null, n: 4 });
    K.shape(H([[-.5, .98], [-.42, 1.22], [-.16, 1.4], [.18, 1.5], [.5, 1.46], [.3, 1.3], [-.1, 1.22]]), { wash: c.skinSh, op: 110, ink: null, n: 3 });
    K.shape(H([[.56, .62], [.74, .8], [.78, 1.02], [.7, 1.2], [.58, 1.0]]), { wash: c.skinHi, op: 120, ink: null, n: 3 });   // the ball of the thumb catches the light
    K.line(H([[-.4, .72], [-.5, .98], [-.42, 1.22], [-.16, 1.4], [.18, 1.5]]), .52, ink, { n: 4 });
    K.line(H([[.5, 1.46], [.72, 1.26], [.78, .98], [.72, .7]]), .55, ink, { n: 3 });
    if (K.det) { K.line(H([[-.22, 1.24], [.08, 1.34], [.36, 1.28]]), .2, c.skinDk, { n: 2 }); K.line(H([[.12, 1.56], [.36, 1.6]]), .2, c.skinSh, { n: 2 }); }   // palm and wrist creases
    // the fingers curling round the far edge (the left edge for the right hand): middle, ring, little; the index behind
    rs('fingers');
    [[-.05, .19, .9], [.27, .19, 1], [.58, .18, .95], [.86, .15, .82]].forEach(([fy, hh, k], i) => {
      const L = H([[-.38, fy - hh], [-.56, fy - hh * 1.05], [-.5 - .17 * k, fy - hh * .3], [-.5 - .16 * k, fy + hh * .45], [-.56, fy + hh * 1.05], [-.38, fy + hh]]);
      K.shape(L, { wash: i === 0 ? mixCol(sk, c.skinSh, .3) : sk, ink: null, n: 3 });
      K.line(L.slice(1, 5), .45, ink, { n: 3 });
      if (K.det) K.line(H([[-.52 - .12 * k, fy - hh * .05], [-.6 - .05 * k, fy + hh * .1]]), .2, c.skinDk, { raw: true });   // the joint crease
    });
  }
  // the phone
  rs('phone'); push(); if (o.face === 'back') scale(mx, 1);
  himPhoneBody(K, c, o.face || 'front', { screen: o.screen, content: o.content });
  pop();
  HIM_LAST.screen = [sP(0, 0), sP(1, 0), sP(1, 1), sP(0, 1)].map(([a, b]) => himToCaller(a * pu, b * pu));
  HIM_LAST.screenC = himToCaller(0, 0);
  if (holdHand) {   // the fingertips curl onto the glass at the edge
    rs('tips');
    [[-.05, .19], [.27, .19], [.58, .18]].forEach(([fy, hh]) => {
      const L = H([[-.5, fy - hh * .55], [-.44, fy - hh * .35], [-.42, fy + hh * .1], [-.45, fy + hh * .45], [-.5, fy + hh * .55]]);
      K.shape(L, { wash: sk, ink: null, n: 3 }); K.line(L.slice(1, -1), .4, ink, { n: 3 });
    });
  }
  if (grip === 'hold') {   // the thumb over the screen, from the ball of the thumb; the screen lights its upper edge
    rs('thumb');
    let [tx, ty] = o.thumb || [.58, .62];
    if (o.type > 0) { const k = Math.floor(T * o.type), h = hash(k * 7.3 + (o.seed || 0)); tx = .18 + .64 * h; ty = .64 + .22 * hash(k * 3.1 + 1); }
    const tap = o.type > 0 ? Math.exp(-frac(T * o.type) * 5) : (o.tap ?? 0), tip = sP(tx, ty).map((v, i) => v + (i ? -.06 : .03) * (1 - tap));
    const base = [.64 * mx, 1.08], tipM = [tip[0], tip[1]];
    const th = himDigit(base, tipM, .58, .33, .23, mx);
    if (lit) K.shape(ellPts(tipM[0] + .04 * mx, tipM[1] + .07 + .05 * (1 - tap), .13, .07, 12), { wash: himCol(c, '#1C2A40'), op: 70 * (.5 + tap * .5), ink: null, raw: true, j: 0 });   // its shadow on the glass
    K.shape(th.out, { wash: sk, ink: null, n: 3 });
    K.shape(th.out.slice(Math.floor(th.out.length / 2) + 2).concat([base]), { wash: c.skinSh, op: 120, ink: null, n: 3 });
    K.line(th.out.slice(1, -1), .52, ink, { n: 3 });
    if (lit) K.line(th.out.slice(2, Math.floor(th.out.length / 2) - 2), .3, himCol(c, scr[1]), { n: 3 });
    if (K.det) {
      const e = th.e, d = th.d, q = [e[0] - d[0] * th.r * .8, e[1] - d[1] * th.r * .8];
      K.shape(ellPts(q[0], q[1], th.r * .55, th.r * .82, 10, 0, -Math.atan2(d[0], d[1])), { wash: c.nail, ink: c.skinDk, sw: .22, raw: true, j: 0 });
      K.line([himOff(th.j, d, th.r * .7), himOff(th.j, d, -th.r * .5)], .22, c.skinDk, { raw: true });   // the knuckle crease
    }
    if (tap > .6 && lit) glow(tipM[0] * pu, tipM[1] * pu, .3 * pu, scr[1], .5 * tap);
    HIM_LAST.thumb = himToCaller(tipM[0] * pu, tipM[1] * pu);
  }
  if (grip === 'poke') {   // his right hand from the lower right, the index out to the screen
    rs('poke');
    const [px, py] = o.poke || [.5, .45], press = clamp(o.press ?? 1), blur = clamp(o.blur || 0), tip = sP(px, py);
    const draw = (dx, dy, op) => {
      // the back of his right hand from the lower right, the index straight to the screen, the others curled under
      const t0 = [tip[0] + dx, tip[1] + dy], ang = Math.atan2(-.95 * mx, -1.0), sc = 1.2;
      // the wrist, placed so that the index tip (hand units (.39, 1.8), see himHandBack) lands on the screen point
      const hx = .39 * -mx * sc, hy = 1.8 * sc, ca = Math.cos(-ang), sa = Math.sin(-ang), at = [t0[0] - (hx * ca - hy * sa), t0[1] - (hx * sa + hy * ca)];
      if (op < 1) { const d = [Math.sin(ang), Math.cos(ang)], q = [t0[0] - d[0] * .75, t0[1] - d[1] * .75]; K.shape(ribbon([q, t0], .3, .26), { wash: sk, op: 255 * op, ink: null, raw: true, j: 0 }); return; }
      const fa = himTube([at, [at[0] + .55 * mx, at[1] + 1.1], [at[0] + 1.0 * mx, at[1] + 2.4]], [.74, .82, .95]);
      K.shape(fa.outline, { wash: sk, ink: null, n: 3 }); K.line(fa.L, .5, ink, { n: 3 }); K.line(fa.R, .55, ink, { n: 3 });
      K.shape(himTube([at, [at[0] + .55 * mx, at[1] + 1.1], [at[0] + 1.0 * mx, at[1] + 2.4]], [[-.1, .37], [-.1, .41], [-.1, .47]]).outline, { wash: c.skinSh, op: 140, ink: null, n: 3 });
      himHand(K, c, 'pointBack', at, ang, -mx, sk, sc);
    };
    if (blur > 0) for (let i = 3; i >= 1; i--) draw(.12 * i * mx * blur, .2 * i * blur, .28 * blur);
    draw(0, -.06 * (1 - press), 1);
    if (blur > .2) for (let i = 0; i < 4; i++) K.line([[tip[0] + (.3 + i * .12) * mx, tip[1] + .1 + i * .1], [tip[0] + (.75 + i * .12) * mx, tip[1] + .55 + i * .1]], .3, ink, { raw: true });   // speed lines
    if (press > .5 && lit) { K.shape(ellPts(tip[0], tip[1], .16 * press, .1 * press, 14), { ink: scr[1], sw: .4, raw: true, j: 0 }); glow(tip[0] * pu, tip[1] * pu, .45 * pu, scr[1], .7 * press); }
    HIM_LAST.finger = himToCaller(tip[0] * pu, tip[1] * pu);
  }
  if (gk > 0 && o.face !== 'back') glow(0, -.1 * pu, 1.6 * pu, scr[1], .45 * gk);
  pop();
}

// ---------- props on the body (called from himStand and the round-8 poses) ----------
const HIM_CYAN = '#7FE9FF', HIM_CYANW = '#E8FDFF';
// where a hand is (torso-local units) for an arm spec: the wrist pushed along the forearm
const himHandAt = sp => { const d = himDir(sp.E, sp.W); return [sp.W[0] + d[0] * .9, sp.W[1] + d[1] * .9]; };
// The phone held in both hands in front of him (o.phone: 'two' with arms 'phone'): the back of the phone toward the
// viewer (front, q) or the slab edge-on (side); fingertips curl round its edges.
function himHeldPhone(K, c, o, view, u) {
  const R = HIM_SPECS.R, L = HIM_SPECS.L;
  if (!R || !L || !R.W || !L.W) return;
  const hc = sp => { const d = himDir(sp.E, sp.W); return [sp.W[0] + d[0] * .4, sp.W[1] + d[1] * .4]; };   // in the palms, under the fingers
  const a = hc(R), b = hc(L), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - .3], pu = 1.25, Kp = himKit(u * pu, c, K === null ? 1 : clamp(.28 + u * pu / 120, .32, 1.7), Math.max(.4, u * .006), false);
  push(); translate(m[0] * u, m[1] * u);
  if (view === 'side') { rotate(o.phoneAng ?? -.75); himPhoneBody(Kp, c, 'edge', { screen: o.screen }); }
  else { rotate((view === 'q' ? .12 : 0) + (o.phoneAng || 0)); scale(view === 'q' ? .62 : .78, view === 'q' ? .62 : .58); himPhoneBody(Kp, c, 'back', {});
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const y = .1 + i * .32, L2 = [[s * .5, y - .12], [s * .62, y - .06], [s * .62, y + .1], [s * .5, y + .14]];   // fingertips on the edges
      Kp.shape(L2, { wash: c.skin, n: 3, sw: .4 }); } }
  pop();
  const scr = (HIM_SCREENS[o.screen] || HIM_SCREENS.cyan)[1];
  if (o.screen !== 'off') glow((m[0] + (view === 'front' ? 0 : -.5)) * u, (m[1] - 1.2) * u, 4.2 * u, scr, .55 * (o.glowK ?? 1));
  HIM_W.phone = himToCaller(m[0] * u, m[1] * u);
}
// IV lines and cuff rings on the arms (called by himArm for each arm drawn)
function himArmProps(K, c, a, E, W, ang) {
  const o = a.o || {}, u = a.u || K.u, side = a.side;
  if (!side || a.part) return;
  const n = o.iv === true ? 1 : (o.iv | 0);
  if (n > 0) {
    const slots = [['R', .55], ['L', .55], ['R', .25], ['L', .25], ['R', .8]].slice(0, n);
    slots.forEach(([sd, t], i) => {
      if (sd !== side) return;
      const d = himDir(E, W), p = himAt(E, W, t), q = himOff(p, d, .28 * (o.flip ? -1 : 1));
      K.shape([himOff(himAt(E, W, t - .07), d, .45), himOff(himAt(E, W, t + .07), d, .45), himOff(himAt(E, W, t + .07), d, -.3), himOff(himAt(E, W, t - .07), d, -.3)], { wash: '#F4F2EA', sw: .3, n: 1 });   // the tape
      K.line([q, himAt(q, E, .12)], .45, himCol(c, '#B9C6D8'), { raw: true });   // the cannula
      (HIM_W.iv = HIM_W.iv || [])[i] = himToCaller(q[0] * u, q[1] * u);
      (HIM_W.ivDir = HIM_W.ivDir || [])[i] = himToCaller((q[0] - d[0]) * u, (q[1] - d[1]) * u);
    });
  }
  if (o.cuffs > 0) {   // a ring of light closing round the wrist (08B): an arc that grows into a ring
    const k = clamp(o.cuffs), p = himAt(E, W, .93), rx = .62, ry = .2, a0 = ang;
    const P = []; for (let i = 0; i <= 24; i++) { const th = -Math.PI / 2 + i / 24 * TAU * k; P.push([p[0] + Math.cos(th) * rx * Math.cos(-a0) - Math.sin(th) * ry * Math.sin(-a0), p[1] + Math.cos(th) * rx * Math.sin(-a0) + Math.sin(th) * ry * Math.cos(-a0)]); }
    K.line(P, .9, HIM_CYAN, { raw: true, j: 0 }); K.line(P, .35, HIM_CYANW, { raw: true, j: 0 });
    glow(p[0] * u, p[1] * u, 1.6 * u, HIM_CYAN, .5 * k);
    HIM_W['cuff' + side] = himToCaller(p[0] * u, p[1] * u);
  }
  if (a.hand === 'pinch' && HIM_PINCH) HIM_W.pinch = himToCaller(HIM_PINCH[0] * u, HIM_PINCH[1] * u);
}
// On the chest, in the torso's frame: the heart light under the shirt (o.heart 0..1, o.heartSpin 0..1 morphs it into a
// loading ring of dots, o.heartGrey 0..1 greys it out to a dot), the light inside him (o.innerGlow 0..1, 04F), the
// light stethoscope's chest piece (o.stetho), the phone held in both hands (q / side views).
function himTorsoProps(K, c, o, view, u) {
  if (o.phone === 'two' && view !== 'front') himHeldPhone(K, c, o, view, u);
  if (o.phone === 'chest') {   // lying on his chest, screen up (03B): o.content paints the screen, HIM_LAST.screen its corners
    const Kp = himKit(u * 1.25, c, clamp(.28 + u * 1.25 / 120, .32, 1.7), Math.max(.4, u * .006), false), P = HIM_PHONE;
    push(); translate(-.25 * u, -6.4 * u); rotate(o.phoneAng ?? .22);
    paint(rrPts(-.5 * u * 1.25 + .15 * u, -1.03 * u * 1.25 + .2 * u, u * 1.25, 2.06 * u * 1.25, .16 * u), { wash: c.shirtSh, washOp: 140, ink: null });   // its shadow on the shirt
    himPhoneBody(Kp, c, 'front', { screen: o.screen, content: o.content });
    const sw2 = (P.w - 2 * P.sx) / 2, sh2 = (P.h - 2 * P.sy) / 2, pu = u * 1.25;
    HIM_W.screen = [[-sw2, -sh2], [sw2, -sh2], [sw2, sh2], [-sw2, sh2]].map(([a2, b2]) => himToCaller(a2 * pu, b2 * pu));
    HIM_W.screenC = himToCaller(0, 0);
    if (o.screen !== 'off') glow(0, 0, 2.6 * u, (HIM_SCREENS[o.screen] || HIM_SCREENS.cyan)[1], .5 * (o.glowK ?? 1));
    pop();
  }
  const hp = view === 'front' ? [1.55, -7.3] : view === 'q' ? [2.05, -7.2] : [2.3, -7.4];
  HIM_W.heart = himToCaller(hp[0] * u, hp[1] * u);
  if (o.innerGlow > 0) {
    const k = o.innerGlow, nx = view === 'front' ? 0 : view === 'q' ? .35 : .5;
    K.shape(ellPts(nx, -10.9, .45, .8, 12), { wash: HIM_CYANW, op: 110 * k, ink: null, raw: true, j: 0, cl: HIM_CYANW });   // a pale core (near white: no cyan pigment over the warm skin)
    glow(nx * u, -11 * u, 2.6 * u, HIM_CYAN, .9 * k); glow((hp[0] - .8) * u, (hp[1] + .3) * u, 4.8 * u, HIM_CYAN, .8 * k);
  }
  const hk = o.heart ?? 0;
  if (hk > 0 || o.heartSpin > 0 || o.heartGrey > 0) {
    const sp = clamp(o.heartSpin || 0), gr = clamp(o.heartGrey || 0), col = mixCol(mixCol(o.heartCol || '#FF6F86', HIM_CYAN, sp), '#8A8F99', gr), r = lerp(.95, .22, ease(seg(gr, .4, 1)));
    const heart = th => { const x = 16 * Math.pow(Math.sin(th), 3), y = -(13 * Math.cos(th) - 5 * Math.cos(2 * th) - 2 * Math.cos(3 * th) - Math.cos(4 * th)); return [x / 17, y / 17]; };
    if (sp < .98) {   // the heart: a soft shape and its light
      const H = []; for (let i = 0; i < 28; i++) { const [x, y] = heart(i / 28 * TAU); H.push([hp[0] + x * r, hp[1] + y * r]); }
      // seen through the shirt: a soft wash, a brighter core, no outline
      K.shape(H, { wash: col, op: (25 + 70 * hk) * (1 - sp), ink: null, raw: true, j: 0, cl: col });
      K.shape(H.map(([x, y]) => [hp[0] + (x - hp[0]) * .55, hp[1] + (y - hp[1]) * .55 - .05]), { wash: mixCol(col, '#FFFFFF', .45), op: (30 + 90 * hk) * (1 - sp), ink: null, raw: true, j: 0, cl: col });
    }
    if (sp > 0) {   // the loading ring: dots on the heart's outline slide onto a circle and turn, never finishing
      const n = 8, rot = T * TAU * .9;
      for (let i = 0; i < n; i++) {
        const th = i / n * TAU, [hx, hy] = heart(th), cth = th + rot, cx = Math.sin(cth) * .75, cy = -Math.cos(cth) * .75;
        const x = hp[0] + lerp(hx * r, cx * r, ease(sp)), y = hp[1] + lerp(hy * r, cy * r, ease(sp)), al = lerp(1, .25 + .75 * frac(i / n + T * .9), sp);
        K.shape(ellPts(x, y, .13 * r + .03, .13 * r + .03, 10), { wash: col, op: 230 * al, ink: null, raw: true, j: 0, cl: col });
      }
    }
    if (gr < 1) glow(hp[0] * u, hp[1] * u, (2.2 + 1.6 * hk) * r * u, col, (.25 + .6 * hk) * (1 - gr * .9));
  }
  if (o.stetho) {   // her stethoscope of light, its chest piece on his heart (03B)
    K.shape(ellPts(hp[0] - .3, hp[1] - .4, .55, .55, 16), { wash: HIM_CYANW, op: 200, ink: HIM_CYAN, sw: .5, raw: true, j: 0, cl: HIM_CYANW });
    glow((hp[0] - .3) * u, (hp[1] - .4) * u, 1.6 * u, HIM_CYAN, .7);
    HIM_W.stetho = himToCaller((hp[0] - .3) * u, (hp[1] - .4) * u);
  }
}
// After the near arm (front view): the phone held in both hands, in front of them.
function himFrontProps(K, c, o, view, u) { if (o.phone === 'two' && view === 'front') himHeldPhone(K, c, o, view, u); }
// The hair's silhouette in each view (for effects that cover the hair), in head units before the squash.
// Head props, in head-local units: 'pre' (behind the head: the far headphone cup) and 'post' (over it).
function himHeadProps(K, c, f, o, view, u, when) {
  const ph = o.phones, sq = P => P.map(([x, y, k]) => [x, y < -2 ? -2 + (y + 2) * HIM_HAIRK : y, k]);
  const pu = (o.phonesUp || 0) * 1.6;   // lifting them off
  if (ph) {
    const dark = himCol(c, '#2C2A35'), mid = himCol(c, '#4A4658'), pad = himCol(c, '#6E6A7A'), hi = himCol(c, '#8C88A0');
    const cup = (x, y, w, h, far) => {
      K.shape(ellPts(x, y - pu, w, h, 18), { wash: far ? dark : mid, sw: .6, raw: true, j: 0 });
      if (!far) { K.shape(ellPts(x + w * .12, y - pu, w * .66, h * .74, 16), { wash: dark, ink: null, raw: true, j: 0 }); K.line([[x - w * .55, y - h * .5 - pu], [x - w * .7, y - pu], [x - w * .55, y + h * .5 - pu]], .3, hi, { n: 2 }); }
    };
    if (when === 'pre') {
      if (view === 'q') cup(1.78, .1, .42, .78, true);
      if (view === 'front' || view === 'q') {}
    } else {
      const band = view === 'front' ? [[-2.05, -.55], [-2.25, -2.0], [-1.4, -3.55], [0, -3.95], [1.4, -3.55], [2.25, -2.0], [2.05, -.55]]
        : view === 'q' ? [[-1.58, -.6], [-1.85, -2.1], [-1.2, -3.55], [.1, -3.95], [1.2, -3.55], [1.72, -2.3], [1.8, -.6]]
        : [[-.66, -.62], [-.75, -2.0], [-.6, -3.4], [-.3, -3.95], [.1, -4.0]];
      const B = sq(band).map(([x, y]) => [x, y - pu]);
      K.shape(ribbon(B, .3, .3), { wash: mid, sw: .5, raw: true, j: 0 });
      K.line(B.map(([x, y]) => [x, y + .06]), .25, hi, { n: 3 });
      if (view === 'front') { cup(-2.08, .12, .48, .82); cup(2.08, .12, .48, .82); }
      else if (view === 'q') cup(-1.58, .18, .5, .84);
      else cup(-.64, .2, .62, .86);
      const cp = view === 'front' ? [-2.08, .9] : view === 'q' ? [-1.58, .98] : [-.64, 1.02];
      HIM_W.cable = himToCaller(cp[0] * u, (cp[1] - pu) * u);
    }
  }
  if (when !== 'post') return;
  if (o.hairLines > 0) himHairLines(K, c, o, view, u);
  const mouth = view === 'front' ? [0, 1.44] : view === 'q' ? [.62, 1.44] : [1.46, 1.42], fw = view === 'side' ? 1 : view === 'q' ? .8 : .55;
  HIM_W.mouth = himToCaller(mouth[0] * u, mouth[1] * u);
  if (o.thermo != null && o.thermo !== false) {   // the thermometer between his lips; its cyan column rises with o.thermo
    const k = o.thermo === true ? .5 : clamp(o.thermo), a = [mouth[0] + .1 * fw, mouth[1] + .02], b = [a[0] + 1.6 * fw, a[1] + .85 - (view === 'side' ? .1 : 0)];
    const tube = ribbon([a, b], .17, .13);
    K.shape(tube, { wash: '#EEF6FA', op: 200, sw: .35, raw: true, j: 0, cl: '#123A5C' });
    const lv = himAt(a, b, .12 + .8 * k);
    K.line([himAt(a, b, .08), lv], .45, HIM_CYAN, { raw: true, j: 0 }); K.line([himAt(a, b, .1), lv], .18, HIM_CYANW, { raw: true, j: 0 });
    for (let i = 1; i < 6; i++) { const q = himAt(a, b, .15 + i * .13), d = himDir(a, b); K.line([himOff(q, d, .04), himOff(q, d, .09)], .16, '#7E8A9A', { raw: true, j: 0 }); }
    glow(lv[0] * u, lv[1] * u, .7 * u, HIM_CYAN, .5 + .4 * k);
  }
  if (o.sticker) {   // a grey-blue teardrop sticker on his forehead (06D)
    const p = view === 'front' ? [.15, -1.05] : view === 'q' ? [.42, -1.05] : [1.05, -1.25], w = view === 'side' ? .32 : .6;
    push(); translate(p[0] * u, p[1] * u); rotate(-.12);
    const S2 = rrPts(-w / 2, -.32, w, .64, .1).map(([x, y]) => [x * u, y * u]);
    paint(S2.map(([x, y]) => [x + .04 * u, y + .05 * u]), { wash: c.skinSh, washOp: 110, ink: null });
    K.shape(rrPts(-w / 2, -.32, w, .64, .1), { wash: '#F2F0EA', sw: .35, raw: true, j: 0 });
    K.shape([[0, -.2, 1], [.12 * w / .6, .02], [.1 * w / .6, .14], [0, .19], [-.1 * w / .6, .14], [-.12 * w / .6, .02]], { wash: himCol(c, '#7F93B3'), ink: null, n: 3 });
    pop();
  }
  if (o.lens) {   // a reflection in the lenses (00D): o.lens(i, {x, y, w, h}) paints in head pixels, lens centred at (x, y)
    const L = view === 'front' ? [[-.84, -.02, 1.18, .72], [.84, -.02, 1.18, .72]] : view === 'q' ? [[-.28, -.02, 1.14, .72], [1.12, -.02, .76, .7]] : [[1.05, -.02, .25, .7]];
    L.forEach(([x, y, w, h], i) => { const s2 = u; o.lens(i, { x: x * s2, y: y * s2, w: w * s2, h: h * s2 }); (HIM_W.lens = HIM_W.lens || [])[i] = himToCaller(x * s2, y * s2); });
  }
  if (o.mouthGlow > 0) {   // light pouring out of his mouth (08G)
    const k = o.mouthGlow, [mx2, my2] = mouth, my3 = my2 + .12, fwd = view === 'side' ? 0 : view === 'q' ? .5 : Math.PI / 2;
    K.shape(ellPts(mx2 + (view === 'side' ? -.1 : 0), my3, .14 + .08 * k, .1 + .1 * k, 12), { wash: HIM_CYANW, op: 235 * k, ink: null, raw: true, j: 0, cl: HIM_CYANW });   // the light inside the mouth
    for (let i = 0; i < 9; i++) {   // a burst of short rays, longest forward
      const a = fwd + (i - 4) * .55 + .08 * Math.sin(T * 4 + i), fk = .45 + .55 * Math.cos((i - 4) * .3), L = (.5 + .7 * hash(i * 3.3 + Math.floor(T * 12) * .1)) * k * fk, d = [Math.cos(a), Math.sin(a)];
      K.line([[mx2 + d[0] * .32, my3 + d[1] * .26], [mx2 + d[0] * (.32 + L), my3 + d[1] * (.26 + L)]], .32, HIM_CYANW, { raw: true, j: 0 });
    }
    glow(mx2 * u, my3 * u, 2.4 * u * k, HIM_CYAN, k); glow(mx2 * u, my3 * u, .8 * u * k, HIM_CYANW, .8 * k);
  }
  if (o.breathFx > 0) {   // his breath as brush strokes: wavy amber, pulled straight and cyan by o.breathStraight (08G)
    const k = o.breathFx, st = clamp(o.breathStraight || 0), col = mixCol('#FFB070', HIM_CYAN, st), [mx2, my2] = mouth, dir = view === 'side' ? [1, .1] : view === 'q' ? [.8, .5] : [.25, 1];
    for (let i = 0; i < 3; i++) {
      const P = []; for (let j = 0; j <= 10; j++) { const s2 = j / 10, w = (1 - st) * .25 * Math.sin(s2 * 9 + T * 6 + i * 2), off = (i - 1) * .3;
        P.push([mx2 + dir[0] * s2 * 3.2 * k - dir[1] * (w + off * s2), my2 + .05 + dir[1] * s2 * 3.2 * k + dir[0] * (w + off * s2)]); }
      K.shape(ribbon(P, .05, .22 * (1 - st * .5)), { wash: col, op: 150, ink: null, raw: true, j: 0, cl: col });
      K.line(P, .25, col, { raw: true, j: 0 });
    }
  }
}
// Point in polygon (even-odd), for effects that fill a silhouette with lines.
function himInPoly(P, x, y) { let r = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) r = !r; } return r; }
// Combed into straight lines (08F): where her finger has combed (o.hairLines 0..1 of the way, from the front of the
// head to the back in side / 3/4 views, from the crown down in front), the hand-drawn locks turn into evenly spaced
// parallel cyan lines over a dark base. Head-local units.
function himHairLines(K, c, o, view, u) {
  const k = clamp(o.hairLines), sq = P => P.map(([x, y, kk]) => [x, y < -2 ? -2 + (y + 2) * HIM_HAIRK : y, kk]);
  const bangs = view === 'side' ? HIM_BANGS_SIDE : view === 'q' ? HIM_BANGS_Q : HIM_BANGS_FRONT;
  const polys = [himS(sq(HIM_HAIR[view] || HIM_HAIR.side), true, 4)].concat(bangs.map(([r, t, w, b]) => himS(sq(himClump(r, t, w, b)), true, 3)));
  const front = view === 'front', xc = front ? lerp(-4.2, 1.0, k) : lerp(2.0, -3.0, k);   // the comb's edge (y in front)
  const inside = (x, y) => (front ? y <= xc : x >= xc) && polys.some(P => himInPoly(P, x, y));
  K.keep = front ? (p => p[1] - xc * u) : (p => xc * u - p[0]);
  for (const P of polys) K.shape(P, { wash: himCol(c, '#0B1830'), ink: null, raw: true, j: 0, cl: '#0B1830' });
  K.keep = null;
  const sl = view === 'front' ? 0 : .16, step = .15, col = HIM_CYAN;
  for (let y0 = -4.2; y0 <= 1.4; y0 += step) {   // each line: sampled, split into the runs that lie inside the combed hair
    let run = [];
    const flush = () => { if (run.length > 1) K.line(run, .24, col, { raw: true, j: 0 }); run = []; };
    for (let x = -3.0; x <= 2.2; x += .08) {
      const p = front ? [lerp(-2.45, 2.45, (y0 + 4.2) / 5.6) + x * .03, x - .9] : [x, y0 + (2 - x) * sl];
      if (inside(p[0], p[1])) run.push(p); else flush();
    }
    flush();
  }
}
// After the figure, in the caller's coordinates: IV tubes to the bag (o.ivTo: a point, or one per line), the headphone
// cable to its plug (o.plugAt, or the pinching hand), a link of light between the cuffs.
function himAfter(K, c, o, u, sw, x, y) {
  const Kw = himKit(u, c, sw, c.clean ? 0 : Math.max(.5, u * .012), false), sx = o.flip ? -1 : 1;
  const sag = (a, b, s) => { const m = himAt(a, b, .5); return [a, himAt(a, m, .5).map((v, i) => v + (i ? s * .6 : 0)), [m[0], m[1] + s], himAt(m, b, .5).map((v, i) => v + (i ? s * .6 : 0)), b]; };
  if (HIM_W.iv) HIM_W.iv.forEach((p, i) => {
    if (!p) return;
    const to = Array.isArray(o.ivTo && o.ivTo[0]) ? (o.ivTo[i] || o.ivTo[0]) : o.ivTo || [x - sx * (6 + 2 * i) * u, y - 30 * u];
    const d = HIM_W.ivDir[i], a1 = [p[0] + (d[0] - p[0]) * .8, p[1] + (d[1] - p[1]) * .8];
    const P = through([p, a1, ...sag(a1, to, 2.5 * u).slice(1)], 6);
    inkLine(P, .9 * sw, mixCol(HIM_CYAN, '#1B6FFF', .25), c.clean ? 'himclean' : 'inkfine', 0);
    inkLine(P, .35 * sw, HIM_CYANW, 'inkfine', 0);
    for (let k = 0; k < 3; k++) {   // glowing tokens flowing down the line into his arm (one light per line: glow() is costly)
      const s2 = 1 - frac(T * .45 + k / 3 + i * .13), q = P[Math.min(P.length - 1, Math.floor(s2 * (P.length - 1)))];
      Kw.shape(ellPts(q[0] / u, q[1] / u, .22, .22, 8), { wash: HIM_CYAN, op: 120, ink: null, raw: true, j: 0, cl: HIM_CYAN });
      Kw.shape(ellPts(q[0] / u, q[1] / u, .12, .12, 8), { wash: HIM_CYANW, ink: null, raw: true, j: 0, cl: HIM_CYANW });
    }
    glow(p[0], p[1], 1.2 * u, HIM_CYAN, .55);
  });
  if (o.phones && o.cable !== false && HIM_W.cable) {
    const a = HIM_W.cable, end = HIM_W.pinch || o.plugAt || [a[0] + sx * 1.5 * u, a[1] + 13 * u], P = through(sag(a, end, (HIM_W.pinch ? 3 : 1.2) * u), 6);
    inkLine(P, .7 * sw, himCol(c, '#2C2A35'), c.clean ? 'himclean' : 'ink', 0);
    const d = himDir(P[P.length - 2], P[P.length - 1]), e = P[P.length - 1];   // the plug: a sleeve and the metal tip, hanging free
    const q = P2 => P2.map(([s2, t2]) => [e[0] / u + d[0] * s2 - d[1] * t2, e[1] / u + d[1] * s2 + d[0] * t2]);
    Kw.shape(q([[-.1, -.17], [.75, -.15], [.75, .15], [-.1, .17]]), { wash: himCol(c, '#3A3846'), sw: .5, raw: true, j: 0 });
    Kw.shape(q([[.75, -.07], [1.35, -.06], [1.42, 0], [1.35, .06], [.75, .07]]), { wash: himCol(c, '#C9CDD6'), sw: .4, raw: true, j: 0 });
    Kw.line(q([[1.0, -.06], [1.0, .06]]), .3, himCol(c, '#6C7180'), { raw: true, j: 0 });
    HIM_LAST.plug = [e[0] + d[0] * 1.4 * u, e[1] + d[1] * 1.4 * u];
  }
  if (o.unravel > 0) {   // threads pulled from the dissolving outline, drifting up and right toward her (≤ 40)
    const k = clamp(o.unravel), cx = o.unravelAt ? o.unravelAt[0] : x, cy = o.unravelAt ? o.unravelAt[1] : y + (o.pose === 'bust' ? 3.2 : o.pose === 'bed' ? -7.5 : o.pose === 'stand' || !o.pose ? -21 : -6) * u;
    const pose = o.pose || 'stand', r = (o.unravelR ?? (pose === 'bust' ? 11 : pose === 'stand' ? 22 : 15) * u) * Math.pow(1 - k, 1.3), n = Math.min(40, Math.round(8 + 32 * Math.sqrt(k))), D = o.unravelDir || [.62, -.78];
    const E = HIM_EDGE, ne = E.length;   // thread roots: points where the outline meets the disc (else round the disc)
    for (let i = 0; i < n; i++) {
      const th = -Math.PI / 4 + (hash(i * 7.1) - .5) * Math.PI * 1.7, s0 = ne > 4 ? E[Math.floor(hash(i * 5.7 + 1) * ne)] : [cx + Math.cos(th) * r, cy + Math.sin(th) * r], L = (3 + 11 * hash(i * 3.3)) * u * (.25 + .75 * k), nn = [-D[1], D[0]];
      const P = []; for (let j = 0; j <= 7; j++) { const t2 = j / 7, w = Math.sin(j * .9 + T * 2.2 + i) * .5 * u * t2; P.push([s0[0] + (D[0] * L + Math.cos(th) * L * .25 * (1 - t2)) * t2 + nn[0] * w, s0[1] + (D[1] * L + Math.sin(th) * L * .25 * (1 - t2)) * t2 + nn[1] * w]); }
      inkLine(through(P, 4), (.32 + .25 * hash(i)) * sw, i % 3 ? HIM_CYAN : HIM_CYANW, c.clean ? 'himclean' : 'inkfine', 0);
    }
    if (r > 1) glow(cx, cy, r * .9 + 2 * u, HIM_CYAN, .35 * (1 - k));
  }
  if (o.cuffs >= 1 && HIM_W.cuffR && HIM_W.cuffL) { const a = HIM_W.cuffR, b = HIM_W.cuffL; inkLine([a, himAt(a, b, .5).map((v, i) => v + (i ? .4 * u : 0)), b], .5 * sw, HIM_CYAN, 'inkfine', 0); }
  Object.assign(HIM_LAST, HIM_W);
}

// ---------- the wristband ----------
// The printed text on the band (whitelisted on screen: 01A, 12C): lettering, queued in the caller's coordinates.
function himBandText(p, q, size, txt = 'PATIENT: YOU', col = '#2B2233') {
  const rot = Math.atan2(q[1] - p[1], q[0] - p[0]), fl = Math.abs(rot) > Math.PI / 2;
  letter(txt, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, size, col, { ink: false, rot: fl ? rot + Math.PI : rot, font: typeof fontCSS === 'function' ? fontCSS('ai', Math.round(size), { weight: 600 }) : undefined });
}
// The band's face: a strip along the centreline C (units) w wide, with the barcode, a name stripe and (text) the label.
function himBandStrip(K, c, C, w, o = {}) {
  const S = ribbon(C, w, w), n = C.length, u = K.u, sh = himCol(c, c.bandSh);
  K.shape(S, { wash: c.band, sw: .5, raw: true, j: 0 });
  K.shape(ribbon(C.map(([x, y], i) => { const a = C[Math.max(0, i - 1)], b = C[Math.min(n - 1, i + 1)], d = himDir(a, b); return [x - d[1] * w * .36, y + d[0] * w * .36]; }), w * .26, w * .26), { wash: sh, op: 110, ink: null, raw: true, j: 0 });
  // the barcode over the first third, the printed lines after it
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]));
  const at = s => { let i = 1; while (i < n - 1 && L[i] < s) i++; const k = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), p = himAt(C[i - 1], C[i], k), d = himDir(C[i - 1], C[i]); return { p, d }; };
  const tot = L[n - 1], b0 = (o.code0 ?? .12) * tot, b1 = (o.code1 ?? .36) * tot;
  for (let i = 0; i < 17; i++) { const s = lerp(b0, b1, i / 16), { p, d } = at(s), hw = w * .3, th = hash(i * 3.7) > .55 ? .5 : .28;
    K.line([[p[0] - d[1] * hw, p[1] + d[0] * hw], [p[0] + d[1] * hw, p[1] - d[0] * hw]], th, c.code, { raw: true, j: 0 }); }
  if (o.text) { const t0 = o.t0 ?? .42 * tot, t1 = o.t1 ?? .86 * tot, a = at(t0).p, b = at(t1).p; himBandText(himToCaller(a[0] * u, a[1] * u), himToCaller(b[0] * u, b[1] * u), Math.min(o.size || w * u * .5, (t1 - t0) * u / 7.6)); }
  else for (const k of [-.12, .12]) { const a = at(.45 * tot).p, b = at(.8 * tot).p, d = himDir(a, b); K.line([[a[0] - d[1] * w * k, a[1] + d[0] * w * k], [b[0] - d[1] * w * k, b[1] + d[0] * w * k]], .22, c.inkSoft, { raw: true, j: 0 }); }
  return { at, tot };
}
// himWrist(x, y, u, o): his left hand lying on the desk, seen from above, close up (01A, u ≈ 120): the back of the
// hand, the wrist at (x, y), the forearm in its sleeve running off toward o.ang + π (default: the hand points up-right).
// o.bandK 0..1: the band being fastened — 0 none; up to .6 a long strip from under his wrist to o.bandEnd (caller
// coordinates: her hands, default off to the right); then its free end sweeps over the wrist; 1 = clasped (the label
// "PATIENT: YOU" reads along it). o.twitch 0..1: his fingers twitch once. o.outfit (default 'launch'), o.pal.
function himWrist(x, y, u, o = {}) {
  const c = himPal(o.pal || 'human'), id = o.boilKey ?? 'wrist' + (++HIM_N), rs = k => c.clean ? himSeed('wr ' + id + k) : boilSeed('wr ' + id + k);
  const sw = clamp(.28 + u / 100, .32, 1.7), K = himKit(u, c, sw, Math.max(.4, u * .006), false), outfit = o.outfit || 'launch';
  const ang = o.ang ?? -2.2, d = [Math.sin(ang), Math.cos(ang)], W = [0, 0], E = [-d[0] * 4.3, -d[1] * 4.3], S = [E[0] - d[0] * 4.9, E[1] - d[1] * 4.9];
  HIM_M0 = himMat(); HIM_LAST = {};
  push(); translate(x, y);
  rs('shadow'); paint(ribbon([[E[0] * u + 30, E[1] * u + 40], [W[0] * u + 30, W[1] * u + 40], [(W[0] + d[0] * 2.6) * u + 30, (W[1] + d[1] * 2.6) * u + 40]], 2.2 * u, 1.9 * u), { wash: c.ink, washOp: 30, ink: null });
  const tw = Math.sin(clamp(o.twitch || 0) * Math.PI);
  rs('arm');
  HIM_HANDS.desk = HIM_HANDS.desk || { draw: himHandBack, spread: .22, curl: .3, thumbA: .7, thumbL: .74 };
  HIM_HANDS.desk.curl = .3 + .35 * tw; HIM_HANDS.desk.spread = .22 - .1 * tw;
  himArm(K, c, { S, E, W, outfit, hand: 'desk', thumb: -1, band: false });
  const k = clamp(o.bandK || 0);
  if (k > 0) {
    rs('band');
    const n = [-d[1], d[0]], bw = .42, half = .78, at = W.map((v, i) => v + d[i] * .2);   // across the wrist, at the base of the hand
    const far = [at[0] - n[0] * half, at[1] - n[1] * half], near = [at[0] + n[0] * half, at[1] + n[1] * half];
    const end = o.bandEnd ? (() => { push(); const p = himFromCaller(o.bandEnd[0], o.bandEnd[1]); pop(); return [p[0] / u, p[1] / u]; })() : [near[0] + n[0] * 4 + d[0] * 1.5, near[1] + n[1] * 4 + d[1] * 1.5];
    const wrap = ease(seg(k, .6, 1));
    if (wrap < 1) {   // the loose strip: from under the far edge of the wrist round to its free end (in her hands)
      const tip = [lerp(end[0], near[0], wrap), lerp(end[1], near[1], wrap)], mid = himAt(far, tip, .5), bulge = (1 - wrap) * 1.2;
      const C = through([far.map((v, i) => v - n[i] * .25), [mid[0] - n[0] * bulge * .3 + d[0] * bulge, mid[1] - n[1] * bulge * .3 + d[1] * bulge], tip], 8);
      if (wrap > 0) { const over = through([far, himAt(far, near, wrap * .98)], 4); himBandStrip(K, c, over, bw, {}); }
      himBandStrip(K, c, C, bw, { code0: .5, code1: .75 });
      K.shape(ellPts(tip[0], tip[1], .16, .16, 10), { wash: himCol(c, '#C9CDD6'), sw: .35, raw: true, j: 0 });   // the snap
    } else {   // clasped: the band across the wrist, the label reading along it, the snap at the near edge
      const C = through([far, at, near], 6);
      const bl = 2 * half;
      himBandStrip(K, c, C, bw, { text: true, code0: .1, code1: .36, t0: .4 * bl, t1: .98 * bl, size: bw * u * .5 });
      K.shape(ellPts(far[0] + n[0] * .12, far[1] + n[1] * .12, .12, .12, 10), { wash: himCol(c, '#C9CDD6'), sw: .35, raw: true, j: 0 });
      const pop2 = Math.exp(-(T - (o.clickT ?? -9)) * 10);   // the "click": a flash at the snap
      if (pop2 > .02) glow(near[0] * u, near[1] * u, 1.2 * u * (1 + pop2), '#FFFFFF', .7 * pop2);
    }
    HIM_LAST.band = himToCaller(at[0] * u, at[1] * u);
  }
  HIM_LAST.wrist = himToCaller(0, 0);
  pop();
}
// himBandProp(x, y, u, o): the cut band lying flat (12C), label up: an open strip that remembers the wrist's curve, the
// snap at one end, the cut through it near the other. o.ang (rad), o.curve (0..1), o.pal.
function himBandProp(x, y, u, o = {}) {
  const c = himPal(o.pal || 'human'), id = o.boilKey ?? 'bandp' + (++HIM_N), rs = k => c.clean ? himSeed('bp ' + id + k) : boilSeed('bp ' + id + k);
  const sw = clamp(.28 + u / 100, .32, 1.7), K = himKit(u, c, sw, Math.max(.4, u * .006), false), cv = o.curve ?? .5;
  HIM_M0 = himMat();
  push(); translate(x, y); rotate(o.ang ?? -.08);
  const C = []; for (let i = 0; i <= 14; i++) { const s = i / 14 - .5; C.push([s * 4.6, -cv * 1.1 * (1 - 4 * s * s) + .035 * Math.sin(i * 1.9)]); }
  rs('shadow'); paint(ribbon(C.map(([a, b]) => [(a + .08) * u, (b + .16) * u]), .5 * u, .5 * u), { wash: c.ink, washOp: 50, ink: null });
  rs('strip'); himBandStrip(K, c, C, .48, { text: true, code0: .08, code1: .3, t0: 1.55, t1: 3.85, size: .2 * u });
  // the snap end and the cut end (a short ragged edge)
  K.shape(ellPts(C[14][0] - .2, C[14][1], .15, .15, 10), { wash: himCol(c, '#C9CDD6'), sw: .35, raw: true, j: 0 });
  const a = C[0], b = C[1], dd = himDir(a, b);
  K.line([[a[0] - dd[1] * .24, a[1] + dd[0] * .24], [a[0] + .06, a[1] + .06], [a[0] - .03, a[1] - .05], [a[0] + dd[1] * .24, a[1] - dd[0] * .24]], .35, c.ink, { raw: true });
  HIM_LAST = { band: himToCaller(0, 0) };
  pop();
}

// ---------- the round-8 sheet: every new pose, prop and expression, labelled (four pages: t in [0,1), [1,2), [2,3), [3,4)) ----------
// node render.mjs --soft-gl --loop=him_poses --sheet=0.5,1.5,2.5,3.5 --cols=1 --w=1920 --out=../output/sheets/char_him_poses.jpg
function himPanel(x, y, w, h, col, op = 120, key = '') { boilSeed('panel' + x + y + key); paint(rectPts(x, y, w, h, 2), { wash: col, washOp: op, ink: null }); }
function himStandIn(kind, x, y, w, h = 0) {   // grey stand-ins for set dressing that belongs to the sets (pillow, mattress), for checking contacts
  boilSeed('standin' + kind + x + y);
  if (kind === 'pillow') paint(ellPts(x, y, w, h || w * .55, 22), { wash: '#ECE8DE', washOp: 230, ink: '#6E6670', sw: .45 });
  else paint(rectPts(x, y, w, h), { wash: '#B9AD9C', washOp: 200, ink: '#6E6670', sw: .45 });
}
LOOPS.him_poses = t => {
  HIM_N = 0;
  const page = Math.floor(t), tt = t - page + 1.3, L = (s, x, y, z = 17) => himLabel(s, x, y, z);
  if (page === 0) {   // in bed and lying down
    himPanel(10, 10, 1900, 520, '#EAD6BC', 130); himPanel(10, 540, 1900, 530, '#E4D2BC', 110);
    L('sitting up in bed (pose: bed) · u 17', 960, 30, 20);
    const by = 430, bu = 17, cv = { coverW: .62, coverD: .6 }, ly = 520;
    him(150, by, bu, { ...himFeel('smile', tt), pose: 'bed', view: 'front', outfit: 'home', ...cv, boilKey: 'b1' }); L('front · hands on the lap', 150, ly);
    him(470, by, bu, { ...himFeel('smile', tt), pose: 'bed', view: 'q', flip: true, outfit: 'home', ...cv, iv: 1, ivTo: [330, 70], thermo: .7, blush: .9, sweat: 1, boilKey: 'b2' }); L('IV line · thermometer (04B)', 450, ly);
    him(790, by, bu, { ...himFeel('peace', tt), pose: 'bed', view: 'q', flip: true, outfit: 'home', ...cv, phones: 1, plugAt: [700, 415], boilKey: 'b3' }); L('headphones, unplugged (04G)', 770, ly);
    him(1110, by, bu, { ...himFeel('confused', tt), pose: 'bed', view: 'q', flip: true, outfit: 'home', ...cv, phones: 1, arms: 'plug', boilKey: 'b4' }); L('confused · the plug (04H)', 1090, ly);
    him(1430, by, bu, { ...himFeel('smile', tt), pose: 'bed', view: 'q', flip: true, outfit: 'home', ...cv, arms: 'wrists', cuffs: 1, boilKey: 'b5' }); L('wrists · cuff rings (08B)', 1410, ly);
    him(1760, by, bu, { ...himFeel('laugh', tt), pose: 'bed', view: 'side', flip: true, outfit: 'home', ...cv, arms: 'hug', boilKey: 'b6' }); L('profile · hug (08A)', 1740, ly);
    L('lying, the bed\'s edge, knees, curl · u 15 (grey: stand-ins for the pillow / mattress)', 960, 560, 20);
    himStandIn('pillow', 70, 690, 60, 92);
    him(330, 690, 15, { ...himFeel('blank', tt), pose: 'lie', outfit: 'home', phone: 'chest', boilKey: 'l1' }); L('lie (top view) · phone on chest (03B)', 300, 800);
    himStandIn('pillow', 70, 930, 60, 92);
    him(330, 930, 15, { ...himFeel('blank', tt), wide: .5, pose: 'lie', outfit: 'home', iv: 3, ivTo: [[600, 860], [620, 900], [600, 1000]], boilKey: 'l2' }); L('lie · 3 IV lines (08D)', 300, 1050);
    himStandIn('pillow', 790, 630, 92, 50);
    him(780, 840, 15, { ...himFeel('tired', tt), mouth: 'soft', pose: 'sidelie', flip: true, outfit: 'home', armR: 'finger', coverW: .75, coverD: .62, boilKey: 'l3' }); L('side-lying · "one more?" (02G)', 790, 1050);
    himStandIn('bed', 1010, 870, 170, 40);
    him(1000, 1000, 15, { ...himFeel('hold', tt), pose: 'edge', flip: true, outfit: 'home', seatH: 8.2, boilKey: 'e1' }); L('bed edge · phone (03A)', 1010, 1050);
    himStandIn('bed', 1250, 870, 210, 40);
    him(1240, 1000, 15, { ...himFeel('blank', tt), pose: 'edge', flip: true, outfit: 'home', seatH: 8.2, fall: .65, boilKey: 'e2' }); L('fall: .65', 1290, 1050);
    him(1590, 1000, 15, { ...himFeel('sad', tt), pose: 'knees', flip: true, outfit: 'home', boilKey: 'k1' }); L('knees (06A)', 1600, 1050);
    him(1800, 1000, 15, { ...himFeel('cry', tt), pose: 'curl', flip: true, outfit: 'home', phone: 'forehead', boilKey: 'k2' }); L('curl · phone (07D)', 1800, 1050);
  } else if (page === 1) {   // actions (stand, profile) and the new expressions
    himPanel(10, 10, 1900, 600, '#E9D8C0', 120); himPanel(10, 620, 1900, 450, '#EFDCC4', 110);
    himPanel(1400, 40, 500, 560, '#0A1024', 240, 'n');
    L('actions · u 13', 700, 30, 20);
    const gy = 560, gu = 13;
    him(110, gy, gu, { ...himFeel('neutral', tt), view: 'side', outfit: 'home', walk: tt * .9, boilKey: 'a1' }); L('walk', 110, 590);
    him(290, gy, gu, { ...himFeel('panic', tt), view: 'side', outfit: 'home', run: tt * 1.4, boilKey: 'a2' }); L('run', 290, 590);
    him(470, gy, gu, { ...himFeel('smile', tt), view: 'side', flip: true, outfit: 'home', armR: 'wave', walk: .1, boilKey: 'a3' }); L('wave (04C)', 470, 590);
    him(650, gy, gu, { ...himFeel('laugh', tt), view: 'front', outfit: 'home', arms: 'up', boilKey: 'a4' }); L('arms up', 650, 590);
    him(830, gy, gu, { ...himFeel('panic', tt), view: 'side', flip: true, outfit: 'home', armR: 'lever', pull: .5 + .5 * Math.sin(tt * 9), boilKey: 'a5' }); L('lever (09E)', 830, 590);
    him(1010, gy, gu, { ...himFeel('peace', tt), view: 'side', flip: true, outfit: 'home', armR: 'glass', boilKey: 'a6' }); L('palm on glass (09I)', 1010, 590);
    him(1200, gy, gu, { ...himFeel('neutral', tt), view: 'q', flip: true, outfit: 'home', armR: 'finger', boilKey: 'a7' }); L('one finger', 1200, 590);
    him(1530, gy, gu, { ...himFeel('neutral', tt), view: 'front', outfit: 'home', arms: 'puppet', pal: 'swapped', boilKey: 'a8' }); letter('puppeteer (10C)', 1530, 64, 17, '#BFD8EE', { ink: false });
    him(1780, gy, gu, { ...himFeel('blank', tt), view: 'front', outfit: 'home', arms: 'strung', tilt: .18, pal: 'swapped', boilKey: 'a9' }); letter('on strings (10D)', 1780, 64, 17, '#BFD8EE', { ink: false });
    letter('clean line: pal swapped', 1650, 590, 15, '#BFD8EE', { ink: false });
    L('new expressions (HIM_EMO) · bust u 30', 960, 640, 20);
    ['sad', 'wide', 'peace', 'confused', 'hold'].forEach((e, i) => {
      const x = 130 + i * 300;
      him(x, 900, 30, { ...himFeel(e, tt), pose: 'bust', view: 'front', outfit: 'home', cut: 2.2, boilKey: 'x' + i });
      him(x + 135, 1010, 18, { ...himFeel(e, tt), pose: 'bust', view: i % 2 ? 'side' : 'q', flip: true, outfit: 'home', cut: 2.2, boilKey: 'y' + i });
      L(e, x, 668);
    });
    himPanel(1510, 655, 390, 410, '#0A1024', 240, 'm');
    him(1610, 1000, 30, { ...himFeel('neutral', tt), pose: 'bust', view: 'front', outfit: 'home', pal: 'mirror', cut: 2.2, boilKey: 'mi' }); letter('mirror (09H)', 1610, 690, 17, '#BFD8EE', { ink: false });
    him(1800, 1000, 30, { ...himFeel('wide', tt), pose: 'bust', view: 'q', flip: true, outfit: 'home', pal: 'swapped', cut: 2.2, boilKey: 'cl' }); letter('swapped', 1800, 690, 17, '#BFD8EE', { ink: false });
  } else if (page === 2) {   // close-ups: the phone in his hand, the wristband; the heart light and the dissolve
    himPanel(10, 10, 1900, 480, '#3A3550', 220);
    const lc = '#E9E2F0', LL = (s, x, y, z = 17) => letter(s, x, y, z, lc, { ink: false });
    himPhone(170, 220, 60, { boilKey: 'ph1', type: 6, content: S => { paint(rrPts(-S.w * .38, -S.h * .36, S.w * .5, S.h * .1, 6), { wash: '#FFFFFF', washOp: 200, ink: null }); paint(rrPts(-S.w * .1, -S.h * .2, S.w * .48, S.h * .1, 6), { wash: '#7FE9FF', washOp: 230, ink: null }); } });
    himPhone(480, 220, 60, { boilKey: 'ph2', grip: 'poke', poke: [.5, .42], press: .5 + .5 * Math.sin(tt * 20), screen: 'white' });
    himPhone(730, 210, 42, { boilKey: 'ph3', grip: 'poke', poke: [.5, .5], blur: 1 });
    himWrist(1010, 300, 56, { bandK: .45, bandEnd: [1180, 150], ang: -2.75, boilKey: 'w1' });
    himWrist(1360, 300, 56, { bandK: 1, ang: -2.75, boilKey: 'w2' });
    himBandProp(1720, 250, 62, { boilKey: 'bp' });
    himPanel(10, 500, 1900, 570, '#1C2040', 250, 'lo');   // (covers the forearms running off the top row)
    [['hold · thumb typing (02B, 02E)', 180], ['poke (07E)', 480], ['poke · frantic', 740], ['band being fastened (01A)', 1000], ['clasped: PATIENT: YOU', 1350], ['the cut band (12C)', 1720]].forEach(([s, x]) => LL(s, x, 74));
    LL('his hand and phone · the wristband (close-ups: u 42–62)', 960, 34, 20);
    LL('the heart light, the light inside him, the dissolve · bust u 30', 960, 524, 20);
    [['heart', { heart: .8 }, 'heart light (03B)'], ['spin', { heartSpin: 1 }, 'loading ring (03C)'], ['inner', { innerGlow: 1, mouth: 'O', lid: 1 }, 'light inside (04F)'],
     ['grey', { pal: 'swapped', heartGrey: .8, heart: .4 }, 'heart offline · clean line (10F)'], ['unravel', { pal: 'swapped', unravel: .45 }, 'unravel (10F)']].forEach(([k, ex, lab], i) => {
      const x = 200 + i * 380;
      him(x, 790, 30, { ...himFeel('blank', tt), pose: 'bust', view: 'front', outfit: 'home', cut: 5, ...ex, boilKey: 'fx' + i }); LL(lab, x, 570);
    });
  } else {   // head effects
    himPanel(10, 10, 1900, 1060, '#1C2040', 240);
    const lc = '#E9E2F0', LL = (s, x, y, z = 17) => letter(s, x, y, z, lc, { ink: false });
    LL('head effects and props · bust u 44', 960, 32, 20);
    [['sticker', { ...himFeel('sad', tt), sticker: 1, view: 'q', flip: true }, 'sticker (06D)'], ['lens', { ...himFeel('smile', tt), pupil: 1.7, lens: (i, Ls) => { boilSeed('lens' + i); paint(ellPts(Ls.x + Ls.w * .1, Ls.y, Ls.w * .12, Ls.w * .16, 12), { wash: '#7FE9FF', washOp: 170, ink: null }); } }, 'pupils + lens hook (00D)'],
     ['hair', { ...himFeel('peace', tt), hairLines: .55, view: 'side', flip: true }, 'combed into lines (08F)']].forEach(([k, ex, lab], i) => {
      const x = 330 + i * 630; him(x, 470, 44, { pose: 'bust', view: 'front', outfit: 'home', cut: 2.4, ...ex, boilKey: 'fz' + i }); LL(lab, x, 120);
    });
    [['mouth', { ...himFeel('blank', tt), eyeGlow: 1, mouthGlow: 1, mouth: 'A' }, 'eyes + mouth light (08G)'], ['breath', { ...himFeel('focused', tt), breathFx: 1, breathStraight: .35, mouth: 'O', view: 'q', flip: true }, 'breath strokes (08G)'],
     ['thermo', { ...himFeel('smile', tt), thermo: .8, blush: 1, sweat: 1, phones: 1, cable: false, view: 'q', flip: true }, 'thermometer · headphones (04B, 04G)']].forEach(([k, ex, lab], i) => {
      const x = 330 + i * 630; him(x, 1000, 44, { pose: 'bust', view: 'front', outfit: 'home', cut: 2.4, ...ex, boilKey: 'fw' + i }); LL(lab, x, 640);
    });
  }
};
LOOPS.him_poses.len = 4;
