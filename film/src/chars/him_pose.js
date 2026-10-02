// him_pose.js: the human lead's extra poses (round 8, storyboard §7.1): sitting up in bed with the covers over the lap,
// arm presets (hands on the lap, holding the phone, reaching up, hugging, wrists offered, waving, puppet, lever, palm on
// glass), arm IK to points in the scene, a walk and a run cycle, lying on his back, lying on his side, sitting on the
// bed's edge and falling back, hugging his knees, curled up on the floor. Loaded after him.js; same him / HIM_ prefix.
// Everything is painted through himKit (paint() / inkLine()); every option is a pure function of its inputs and T.

// a colour of a prop or the covers, through the figure's palette (drained / clean / mirror / cyan)
function himCol(c, hex) {
  return c.name === 'drained' ? himDrain(hex) : c.name === 'swapped' ? himNavy(hex) : c.name === 'mirror' ? himSilver(hex) : c.name === 'cyan' ? himCyan(hex) : hex;
}

// ---------- arms ----------
// Two-bone arm IK to a wrist point W (torso-local units); the elbow takes the lower of the two solutions unless bend
// (±1) picks one.
function himArmIK(S, W, bend) {
  const L1 = 4.9, L2 = 4.3, d = Math.hypot(W[0] - S[0], W[1] - S[1]);
  if (d > L1 + L2 - .02) { const k = (L1 + L2 - .02) / d; W = [S[0] + (W[0] - S[0]) * k, S[1] + (W[1] - S[1]) * k]; }
  const a = himIK(S, W, L1, L2, 1), b = himIK(S, W, L1, L2, -1);
  return { E: bend > 0 ? a : bend < 0 ? b : a[1] > b[1] ? a : b, W };
}
// Wrist targets per preset, in torso-local units (hip centre origin, y up negative; views face screen right).
// Each entry: { W: [x, y], hand, handAng (radians, 0 = fingers down, + toward screen right), bend, lap (rests on the
// covers: redrawn over them), far (override shading), thumb }.  t = T for the animated ones.
const HIM_ARMS = {
  // hands resting on the lap (the bed's default)
  lap: { front: { R: { W: [-1.75, -.55], hand: 'rest', handAng: .42, bend: 1, thumb: 1 }, L: { W: [1.85, -.6], hand: 'rest', handAng: -.42, bend: -1, thumb: -1 } },
         q:     { R: { W: [2.2, -.45], hand: 'rest', handAng: -.95, bend: 1, thumb: -1 }, L: { W: [4.9, -.35], hand: 'rest', handAng: -.85, bend: 1, lap: true, thumb: -1 } },
         side:  { R: { W: [4.0, -1.55], hand: 'rest', handAng: -1.35, bend: 1, thumb: -1 }, L: { W: [4.5, -1.75], hand: 'rest', handAng: -1.35, bend: 1 } } },
  // both hands holding the phone in front of the chest, looking down at it (the phone: him_prop.js)
  phone: { front: { R: { W: [-.75, -5.6], hand: 'hold', handAng: 2.6, bend: 1, thumb: 1 }, L: { W: [.75, -5.6], hand: 'hold', handAng: -2.6, bend: -1, thumb: -1 } },
           q:     { R: { W: [2.35, -5.7], hand: 'hold', handAng: -2.2, bend: 1 }, L: { W: [3.55, -5.9], hand: 'hold', handAng: -2.4, bend: 1 } },
           side:  { R: { W: [3.75, -5.75], hand: 'hold', handAng: -2.25, bend: 1 }, L: { W: [4.05, -6.05], hand: 'hold', handAng: -2.3, bend: 1 } } },
  // both arms up and forward, hands open (reaching up to her)
  up: { front: { R: { W: [-3.2, -17.2], hand: 'open', handAng: Math.PI + .15, bend: -1, thumb: -1 }, L: { W: [3.2, -17.2], hand: 'open', handAng: Math.PI - .15, bend: 1, thumb: 1 } },
        q:     { R: { W: [3.4, -16.8], hand: 'open', handAng: Math.PI - .5, bend: -1 }, L: { W: [5.2, -16.4], hand: 'open', handAng: Math.PI - .55, bend: -1 } },
        side:  { R: { W: [4.3, -16.9], hand: 'open', handAng: Math.PI - .45, bend: -1 }, L: { W: [5.1, -16.4], hand: 'open', handAng: Math.PI - .5, bend: -1 } } },
  // hugging a tall thing in front of him (her giant finger, 08A): forearms wrap around it, hands closed
  hug: { front: { R: { W: [-.7, -11.6], hand: 'fist', handAng: Math.PI * .55, bend: -1 }, L: { W: [.7, -10.9], hand: 'fist', handAng: -Math.PI * .55, bend: 1 } },
         q:     { R: { W: [3.4, -11.3], hand: 'fist', handAng: -2.0, bend: -1 }, L: { W: [4.4, -10.6], hand: 'fist', handAng: -2.2, bend: -1 } },
         side:  { R: { W: [4.2, -11.4], hand: 'fist', handAng: -1.75, bend: 1 }, L: { W: [4.6, -10.8], hand: 'fist', handAng: -1.8, bend: 1 } } },
  // forearms forward, the wrists side by side, offered (the cuffs close on them, 08B)
  wrists: { front: { R: { W: [-.45, -8.6], hand: 'open', handAng: Math.PI - .25, bend: -1, thumb: -1 }, L: { W: [.45, -8.6], hand: 'open', handAng: Math.PI + .25, bend: 1, thumb: 1 } },
            q:     { R: { W: [5.0, -9.6], hand: 'open', handAng: -2.3, bend: -1 }, L: { W: [5.5, -10.0], hand: 'open', handAng: -2.35, bend: -1 } },
            side:  { R: { W: [6.0, -9.2], hand: 'open', handAng: -2.15, bend: 1 }, L: { W: [6.1, -9.6], hand: 'open', handAng: -2.15, bend: 1 } } },
  // looking at his own hands: raised in front of the chest, the backs of the hands toward the viewer (10A)
  look: { front: { R: { W: [-1.9, -6.3], hand: 'open', handAng: Math.PI + .35, bend: -1, thumb: -1 }, L: { W: [1.9, -6.3], hand: 'open', handAng: Math.PI - .35, bend: 1, thumb: 1 } },
          q:     { R: { W: [2.6, -6.4], hand: 'open', handAng: -2.6, bend: -1 }, L: { W: [4.0, -6.6], hand: 'open', handAng: -2.7, bend: -1 } },
          side:  { R: { W: [4.0, -6.6], hand: 'open', handAng: -2.6, bend: 1 }, L: { W: [4.4, -6.9], hand: 'open', handAng: -2.6, bend: 1 } } },
  // the ten fingers spread, pointing up (the puppeteer, 10C)
  puppet: { front: { R: { W: [-4.6, -15.6], hand: 'spread', handAng: Math.PI + .2, bend: -1, thumb: -1 }, L: { W: [4.6, -15.6], hand: 'spread', handAng: Math.PI - .2, bend: 1, thumb: 1 } },
            q:     { R: { W: [2.4, -16.4], hand: 'spread', handAng: Math.PI - .2, bend: -1 }, L: { W: [5.4, -16.0], hand: 'spread', handAng: Math.PI - .3, bend: -1 } },
            side:  { R: { W: [3.6, -16.4], hand: 'spread', handAng: Math.PI - .25, bend: -1 }, L: { W: [4.6, -16.0], hand: 'spread', handAng: Math.PI - .3, bend: -1 } } },
};
// Arm spec for one arm: preset (o.arms), per-arm overrides (o.armR / o.armL: a preset name or a spec object), targets
// in the caller's coordinates (o.toR / o.toL: [x, y] for the hand), the wave, the walk/run swing, the lever, the glass.
function himArmSpec(o, view, side, S, mode, u, gait) {
  const v = view === 'q' ? 'q' : view === 'side' ? 'side' : 'front', t = T;
  let pre = o['arm' + side] || o.arms || (mode === 'bed' ? 'lap' : null), sp = null;
  if (typeof pre === 'object' && pre) sp = { ...pre };
  else if (pre === 'wave' && side === 'R') {   // waving bye: the forearm up beside the head, rocking from the elbow
    const ph = Math.sin((o.waveT ?? t) * TAU * 2.6), k = o.wave ?? 1, base = v === 'front' ? [-4.6, -12.6] : [S[0] + 1.6, S[1] - 1.0];
    const E = v === 'front' ? [-5.3, -8.0] : [S[0] + 1.9, S[1] + 3.2], a = Math.PI + (v === 'front' ? .25 : -.35) + ph * .32 * k;
    const W = [E[0] + Math.sin(a) * 4.3, E[1] + Math.cos(a) * 4.3];
    return { E: [lerp(S[0] + Math.sin(.1) * 4.9, E[0], k), lerp(S[1] + Math.cos(.1) * 4.9, E[1], k)], W: [lerp(base[0], W[0], k), lerp(base[1] + 8, W[1], k)], hand: 'open', handAng: a + .1, thumb: v === 'front' ? -1 : 1 };
  }
  else if (pre === 'strung') {   // a puppet on strings: the wrists pulled up, hands hanging limp, swaying (10D)
    const s = side === 'R' ? -1 : 1, sway = (o.sway ?? 1) * Math.sin(t * TAU * .7 + (s > 0 ? 1.3 : 0)), lift = o.lift ?? 1;
    const W = v === 'front' ? [s * (4.4 + .5 * sway), lerp(-6.0, -14.6, lift) + .6 * sway * s] : [S[0] + 2.2 + .6 * sway, lerp(-6.0, -15.0, lift) + .5 * sway];
    return { ...himArmIK(S, W, v === 'front' ? s : -1), hand: 'relax', handAng: .25 * sway, thumb: v === 'front' ? -s : 1 };
  }
  else if (pre === 'lever' && side === 'R') {   // gripping a lever's knob and yanking it down (o.pull 0..1)
    const k = clamp(o.pull ?? 0), W = [lerp(5.4, 6.0, k), lerp(-12.4, -6.4, k)];
    return { ...himArmIK(S, W, 1), hand: 'fist', handAng: lerp(-2.1, -1.4, k) };
  }
  else if (pre === 'glass' && side === 'R') {   // the palm flat on glass in front of him (09I); o.glassX: the glass (u ahead of the hips)
    const gx = o.glassX ?? 6.9, k = ease(o.reachK ?? 1), W = [lerp(S[0] + 1.2, gx - .45, k), lerp(-4.6, -10.4, k)];
    return { ...himArmIK(S, W, 1), hand: k > .7 ? 'flat' : 'relax', handAng: lerp(-.4, Math.PI, ease(seg(k, .3, 1))) };
  }
  else if (pre === 'finger' && side === 'R') {   // one finger raised ("one more?", 02G)
    const W = v === 'front' ? [-2.4, -9.6] : [S[0] + 2.4, S[1] - .4];
    return { ...himArmIK(S, W, 1), hand: 'point', handAng: Math.PI - .2 + .06 * Math.sin(t * TAU * 1.4) };
  }
  else if (pre === 'plug' && side === 'R') {   // holding the unplugged headphone jack up in front of his eyes (04H)
    const W = v === 'front' ? [-1.6, -9.6] : v === 'q' ? [3.0, -9.4] : [4.2, -9.6];
    return { ...himArmIK(S, W, v === 'front' ? -1 : 1), hand: 'pinch', handAng: v === 'front' ? Math.PI + .6 : -2.3, plug: true };
  }
  else if (typeof pre === 'string' && HIM_ARMS[pre]) { const e = HIM_ARMS[pre][v] && HIM_ARMS[pre][v][side]; if (e) sp = { ...e }; }
  // the walk / run swing (angles), unless a preset owns this arm
  if (!sp && gait && gait.arms) return { a: gait.arms[side], hand: gait.hand || null };
  // targets in the caller's coordinates (the hand's centre)
  const to = o['to' + side];
  if (to) {
    const p = himFromCaller(to[0], to[1]), q = [p[0] / u, p[1] / u], d = himDir(S, q), hl = .9 * (sp && sp.handSc || 1);
    sp = { ...(sp || {}), W: [q[0] - d[0] * hl, q[1] - d[1] * hl] };
    if (o['hand' + side]) sp.hand = o['hand' + side];
  }
  if (!sp) return null;
  if (sp.W && !sp.E) Object.assign(sp, himArmIK(S, sp.W, sp.bend || 0));
  if (o['hand' + side] && pre) sp.hand = o['hand' + side];
  if (o['handAng' + side] != null) sp.handAng = o['handAng' + side];
  return sp;
}

// ---------- the covers (sitting up in bed) ----------
// Drawn in the torso's frame without the lean: hip joint at the origin, the mattress surface at y = +1.3 (the anchor).
// o.coverW / o.coverD scale the spread and the depth (default 1), o.coverCol the duvet colour (hospital white), o.knees
// (0..1) raises the knees under it. Returns the covers' top edge as a function x(px) → y(px) (for clipping arms).
function himCovers(K, c, o, view, u) {
  const base = himCol(c, o.coverCol || '#E7EAF2'), sh = mixCol(base, himCol(c, '#7E89A6'), .42), dk = mixCol(base, himCol(c, '#4C5677'), .5), hi = mixCol(base, '#FFFFFF', .6);
  const sheet = himCol(c, o.sheetCol || '#F6F4EE'), cw = o.coverW ?? 1, cd = o.coverD ?? 1, kn = o.knees ?? .25;
  const X = x => x * cw, Y = y => y < 1.3 ? y : 1.3 + (y - 1.3) * cd;
  const pp = P => P.map(([x, y, k]) => [X(x), Y(y), k]);
  let top, out, shade, folds, ridges, hiL;
  if (view === 'front') {   // the legs run toward the viewer: two ridges down the duvet, a valley between them, the flat
    // parts beyond, the drape over the bed's sides
    top = [[-5.4, -.2], [-4.0, -.8], [-2.1, -1.1], [0, -1.18], [2.1, -1.08], [4.0, -.78], [5.4, -.18]];
    out = [[5.4, -.18], [6.5, .3], [7.8, .55], [8.5, 1.05], [8.75, 3.0], [8.6, 6.4, 1], [4.5, 6.75], [0, 6.55], [-4.5, 6.8], [-8.6, 6.4, 1], [-8.75, 3.0], [-8.5, 1.05], [-7.8, .58], [-6.5, .32]];
    ridges = [[-2.05, 3.0, 1.2, 2.7, -.04], [2.05, 3.0, 1.2, 2.7, .04]];
    shade = [[[-.55, .3], [.55, .3], [.95, 3.4], [1.15, 6.6], [-1.15, 6.6], [-.95, 3.4]], [[3.5, .05], [5.4, -.1], [6.6, .4], [8.4, 1.1], [8.6, 6.4], [4.6, 6.75], [4.2, 3.5]], [[-3.5, .05], [-5.4, -.1], [-6.6, .4], [-8.4, 1.1], [-8.6, 6.4], [-4.6, 6.8], [-4.2, 3.5]],
             [[8.0, .8], [8.75, 1.4], [8.75, 6.3], [8.1, 6.4]], [[-8.0, .8], [-8.75, 1.4], [-8.75, 6.3], [-8.1, 6.4]]];
    folds = [[[-.35, .7], [-.55, 2.6], [-.3, 4.8]], [[.45, .8], [.65, 2.8], [.35, 5.0]], [[-3.4, .5], [-4.0, 2.4], [-4.3, 4.6]], [[3.5, .45], [4.1, 2.3], [4.3, 4.5]], [[-5.6, .6], [-6.6, 2.0], [-7.2, 3.8]], [[5.6, .55], [6.6, 2.0], [7.2, 3.7]],
             [[-3.2, 5.4], [-4.6, 6.2]], [[3.2, 5.3], [4.6, 6.2]], [[-1.6, .2], [-2.4, .9]], [[1.7, .15], [2.4, .9]], [[-8.3, 2.0], [-8.4, 4.6]], [[8.3, 2.0], [8.4, 4.6]]];
    hiL = [[[-2.9, 1.2], [-2.6, 3.0], [-2.75, 5.2]], [[1.35, 1.2], [1.55, 3.0], [1.45, 5.2]]];
  } else if (view === 'q') {   // the legs run toward the viewer and screen right
    top = [[-4.6, -.15], [-3.0, -.8], [-.8, -1.15], [1.4, -1.22], [3.3, -.98], [4.5, -.55]];
    out = [[4.5, -.55], [6.6, -.42], [8.8, .1], [11.0, 1.05], [12.5, 2.0], [13.3, 2.8], [13.7, 4.2], [13.4, 6.4, 1], [7.0, 6.6], [0, 6.5], [-5.0, 6.0], [-7.6, 5.6, 1], [-7.85, 3.4], [-7.4, 1.6], [-6.4, .6], [-5.4, .1]];
    ridges = [[5.6, 2.0, 4.9, 1.15, .27], [7.2, .7, 4.5, 1.0, .22]];
    shade = [[[.4, 1.6], [5.0, 3.05], [10.0, 4.0], [13.5, 4.4], [13.4, 6.4], [7.0, 6.6], [0, 6.5], [-.8, 4.2]], [[-4.4, .1], [-6.6, .8], [-7.7, 2.8], [-7.6, 5.6], [-5.6, 5.4], [-5.4, 2.6]],
             [[3.2, 1.0], [6.0, 1.45], [9.0, 2.2], [11.4, 2.6], [9.2, 1.7], [6.2, 1.0]]];
    folds = [[[-3.0, .3], [-4.5, 1.8], [-5.6, 3.8]], [[1.8, .2], [2.4, 1.6], [2.2, 3.4]], [[4.6, 3.1], [7.2, 3.6], [10.0, 3.6]], [[9.2, .9], [10.4, 1.8], [10.8, 2.6]], [[-.6, 4.6], [1.8, 5.4], [4.4, 5.6]], [[3.6, -.3], [4.8, .4]], [[12.6, 3.2], [13.2, 5.0]]];
    hiL = [[[2.0, 1.0], [5.2, 1.0], [8.6, 1.9]], [[4.6, -.25], [7.4, -.05], [10.2, .9]]];
  } else {   // profile: the legs lie along the mattress toward screen right, the knees a little up
    top = [[-3.2, -.25], [-2.5, -.95], [-1.0, -1.3], [.8, -1.45], [2.2, -1.48]];
    out = [[2.2, -1.48], [4.6, -1.62], [7.6, -1.95 - kn * 2.2], [9.2, -1.85 - kn * 2.3], [11.2, -1.35 - kn * .8], [13.0, -1.15], [14.3, -1.75], [15.0, -1.5], [15.7, -.45], [17.4, .25], [18.6, .9], [18.9, 1.3, 1], [-4.4, 1.3, 1], [-4.2, .5]];
    ridges = [[8.4, -1.3 - kn * 2.0, 2.3, .85, -.05], [14.5, -1.05, 1.0, .6, 0]];
    shade = [[[-4.2, .6], [6.0, .4], [12.0, .5], [18.6, .9], [18.9, 1.3], [-4.4, 1.3]], [[-3.9, -.1], [-2.6, -.4], [-2.2, 1.3], [-4.4, 1.3]], [[9.6, -1.4 - kn * 1.6], [11.2, -.9 - kn * .6], [11.0, .3], [9.8, -.2]]];
    folds = [[[4.0, -1.2], [5.4, -.3], [6.0, .9]], [[10.4, -1.15 - kn * .5], [11.2, -.2], [11.3, .9]], [[12.6, -.9], [13.2, .2]], [[1.0, -1.0], [1.6, .1], [1.4, 1.1]], [[15.9, -.2], [16.6, .8]], [[6.8, -1.6 - kn * 1.6], [7.4, -.5]]];
    hiL = [[[5.4, -1.62], [8.2, -2.0 - kn * 2.2], [10.4, -1.6 - kn * 1.2]]];
  }
  const all = pp(top.concat(out.slice(1)));
  K.shape(all, { wash: base, n: 4, wc: 1.1, sw: .85 });
  for (const S of shade) K.shape(pp(S), { wash: sh, op: 130, ink: null, n: 3, wc: .8, gran: false });
  for (const [x, y, rx, ry, a] of ridges) K.shape(ellPts(X(x), Y(y), rx * cw, ry * cd, 18, 0, a), { wash: hi, op: 150, ink: null, raw: true, j: 0 });
  for (const L of hiL) K.line(pp(L), .4, hi, { n: 3 });
  for (const F of folds) K.line(pp(F), .32, dk, { n: 3 });
  // the turned-down top: a band of sheet along the top edge (tapering at its ends), with its lower hem
  const n = top.length, band = top.map(([x, y], i) => [x, y + (i === 0 || i === n - 1 ? .2 : .55)]);
  K.shape(pp(top.concat(band.slice().reverse())), { wash: sheet, n: 3, sw: .6 });
  K.line(pp(band.slice(1, -1).map(([x, y]) => [x, y - .1])), .26, sh, { n: 3 });
  if (K.det) for (let i = 1; i < n - 1; i += 2) K.line(pp([[top[i][0] - .2, top[i][1] + .1], [top[i][0] + .1, top[i][1] + .48]]), .22, sh, { raw: true });
  // contact shadow where his waist sinks into the covers
  K.shape(pp(top.slice(1, -1).map(([x, y]) => [x * .8, y - .04]).concat(top.slice(1, -1).reverse().map(([x, y]) => [x * .8, y - .3]))), { wash: dk, op: 60, ink: null, n: 3 });
  // the top edge as a function x(px) → y(px), for clipping (linear between its points)
  const T2 = pp(top).map(([x, y]) => [x * u, y * u]);
  return xp => { if (xp <= T2[0][0]) return T2[0][1]; for (let i = 1; i < T2.length; i++) if (xp <= T2[i][0]) return lerp(T2[i - 1][1], T2[i][1], (xp - T2[i - 1][0]) / (T2[i][0] - T2[i - 1][0])); return T2[T2.length - 1][1]; };
}

// ---------- gait (profile) ----------
// o.walk = phase (cycles, any real; one cycle = two steps) or o.run = phase. Returns hip height, lean, bob, ankle
// targets per leg (hip-local units) with the heel lift, and the arm swing angles. stride: o.stride (u, default 1).
function himGait(o, view) {
  if (view !== 'side' || (o.walk == null && o.run == null)) return null;
  const run = o.run != null, ph = frac(run ? o.run : o.walk), st = (o.stride ?? 1) * (run ? 6.2 : 4.4);
  const hipH = run ? 14.0 : 14.55, L = {};
  const one = (p, side) => {
    p = frac(p);
    const stance = run ? .38 : .6;
    let x, lift = 0, up = 0;
    if (p < stance) { const k = p / stance; x = lerp(st / 2, -st / 2, k); lift = k > .6 ? (k - .6) / .4 * (run ? .8 : .55) : 0; }
    else { const k = (p - stance) / (1 - stance); x = lerp(-st / 2, st / 2, ease(k)); up = Math.sin(Math.PI * k) * (run ? 3.2 : 1.3) + (k < .3 ? (run ? 1.0 : .5) * (1 - k / .3) : 0); lift = k < .25 ? (run ? .8 : .55) * (1 - k / .25) : 0; }
    // the hip-local ankle: forward of the hip by x, down by the hip height minus the foot's height above the ground
    L[side] = { A: [x + .3, hipH - .95 - up - lift * .3], lift: lift * .9 };
    return p;
  };
  one(ph, 'R'); one(ph + .5, 'L');
  const bob = run ? -.45 * Math.abs(Math.sin(ph * TAU)) + .2 : -.22 * Math.cos(ph * TAU * 2);   // lowest at the contacts (walk)
  const sw = run ? .95 : .42, s = Math.sin(ph * TAU);
  const arms = run ? { R: [-sw * s + .15, -1.45], L: [sw * s + .15, -1.45] } : { R: [-sw * s, .18 + .12 * Math.max(0, -s)], L: [sw * s, .18 + .12 * Math.max(0, s)] };
  return { hipH, legs: L, bob, lean: run ? .2 : .04, arms, hand: run ? 'fist' : null, order: [['L', true], ['R', false]] };
}
