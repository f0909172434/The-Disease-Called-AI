// him_pose.js: the human lead's extra poses (round 8, storyboard §7.1): sitting up in bed with the covers over the lap,
// arm presets (hands on the lap, holding the phone, reaching up, hugging, wrists offered, waving, puppet, lever, palm on
// glass), arm IK to points in the scene, a walk and a run cycle, lying on his back, lying on his side, sitting on the
// bed's edge and falling back, hugging his knees, curled up on the floor. Loaded after him.js; same him / HIM_ prefix.
// Everything is painted through himKit (himPaintV() / himInkV()); every option is a pure function of its inputs and T.

// a colour of a prop or the covers, through the figure's palette (drained / clean / mirror / cyan)
function himCol(c, hex) {
  return c.name === 'drained' ? himDrain(hex) : c.name === 'swapped' ? himNavy(hex) : c.name === 'mirror' ? himSilver(hex) : c.name === 'cyan' ? himCyan(hex) : hex;
}

// ---------- arms ----------
// Two-bone arm IK to a wrist point W (torso-local units); the elbow takes the lower of the two solutions unless bend
// (±1) picks one.
// k1 / k2 shorten the upper arm / forearm as drawn (foreshortened: pointing toward the camera).
function himArmIK(S, W, bend, k1 = 1, k2 = 1) {
  const L1 = 4.9 * k1, L2 = 4.3 * k2, d = Math.hypot(W[0] - S[0], W[1] - S[1]);
  if (d > L1 + L2 - .02) { const k = (L1 + L2 - .02) / d; W = [S[0] + (W[0] - S[0]) * k, S[1] + (W[1] - S[1]) * k]; }
  const a = himIK(S, W, L1, L2, 1), b = himIK(S, W, L1, L2, -1);
  return { E: bend > 0 ? a : bend < 0 ? b : a[1] > b[1] ? a : b, W };
}
// Wrist targets per preset, in torso-local units (hip centre origin, y up negative; views face screen right).
// Each entry: { W: [x, y], hand, handAng (radians, 0 = fingers down, + toward screen right), bend, lap (rests on the
// covers: redrawn over them), far (override shading), thumb }.  t = T for the animated ones.
const HIM_ARMS = {
  // hands resting on the lap (the bed's default)
  lap: { front: { R: { W: [-1.75, -.55], hand: 'rest', handAng: .42, bend: 1, thumb: 1, k2: .85 }, L: { W: [1.85, -.6], hand: 'rest', handAng: -.42, bend: -1, thumb: -1, k2: .85 } },
         q:     { R: { W: [2.2, -.45], hand: 'rest', handAng: -.95, bend: 1, thumb: -1 }, L: { W: [4.9, -.35], hand: 'rest', handAng: -.85, bend: 1, lap: true, thumb: -1 } },
         side:  { R: { W: [4.0, -1.55], hand: 'rest', handAng: -1.35, bend: 1, thumb: -1 }, L: { W: [4.5, -1.75], hand: 'rest', handAng: -1.35, bend: 1 } } },
  // both hands holding the phone in front of the chest, looking down at it (the phone: him_prop.js)
  phone: { front: { R: { W: [-.75, -5.6], hand: 'hold', handAng: 2.6, bend: 1, thumb: 1, k2: .6 }, L: { W: [.75, -5.6], hand: 'hold', handAng: -2.6, bend: -1, thumb: -1, k2: .6 } },
           q:     { R: { W: [2.35, -5.7], hand: 'hold', handAng: -2.2, bend: 1, k2: .7 }, L: { W: [3.55, -5.9], hand: 'hold', handAng: -2.4, bend: 1, k2: .7 } },
           side:  { R: { W: [3.75, -5.75], hand: 'hold', handAng: -2.25, bend: 1 }, L: { W: [4.05, -6.05], hand: 'hold', handAng: -2.3, bend: 1 } } },
  // both arms up and forward, hands open (reaching up to her)
  up: { front: { R: { W: [-3.2, -17.2], hand: 'open', handAng: Math.PI + .15, bend: -1, thumb: -1 }, L: { W: [3.2, -17.2], hand: 'open', handAng: Math.PI - .15, bend: 1, thumb: 1 } },
        q:     { R: { W: [3.4, -16.8], hand: 'open', handAng: Math.PI - .5, bend: -1 }, L: { W: [5.2, -16.4], hand: 'open', handAng: Math.PI - .55, bend: -1 } },
        side:  { R: { W: [4.3, -16.9], hand: 'open', handAng: Math.PI - .45, bend: -1 }, L: { W: [5.1, -16.4], hand: 'open', handAng: Math.PI - .5, bend: -1 } } },
  // hugging a tall thing in front of him (her giant finger, 08A): forearms wrap around it, hands closed
  hug: { front: { R: { W: [-.7, -11.6], hand: 'fist', handAng: Math.PI * .55, bend: 1, k2: .8 }, L: { W: [.7, -10.9], hand: 'fist', handAng: -Math.PI * .55, bend: -1, k2: .8 } },
         q:     { R: { W: [5.4, -8.2], hand: 'rest', handAng: -1.75, bend: 1, k1: .9, k2: .85 }, L: { W: [4.9, -10.4], hand: 'rest', handAng: -1.6, bend: 1, k1: .7, k2: .75 } },
         side:  { R: { W: [5.4, -8.4], hand: 'rest', handAng: -1.75, bend: 1, k2: .85 }, L: { W: [5.0, -10.6], hand: 'rest', handAng: -1.6, bend: 1, k2: .85 } } },
  // forearms forward, the wrists side by side, offered (the cuffs close on them, 08B)
  wrists: { front: { R: { W: [-.45, -8.4], hand: 'open', handAng: Math.PI - .25, bend: 1, thumb: -1, k2: .45 }, L: { W: [.45, -8.4], hand: 'open', handAng: Math.PI + .25, bend: -1, thumb: 1, k2: .45 } },
            q:     { R: { W: [4.3, -8.0], hand: 'open', handAng: -2.0, bend: 1, k1: .8, k2: .78 }, L: { W: [4.8, -8.4], hand: 'open', handAng: -2.05, bend: 1, k1: .62, k2: .7 } },
            side:  { R: { W: [6.0, -9.2], hand: 'open', handAng: -2.15, bend: 1 }, L: { W: [6.1, -9.6], hand: 'open', handAng: -2.15, bend: 1 } } },
  // looking at his own hands: raised in front of the chest, the backs of the hands toward the viewer (10A)
  look: { front: { R: { W: [-1.9, -6.6], hand: 'open', handAng: Math.PI + .35, bend: 1, thumb: -1, k2: .55 }, L: { W: [1.9, -6.6], hand: 'open', handAng: Math.PI - .35, bend: -1, thumb: 1, k2: .55 } },
          q:     { R: { W: [2.3, -6.6], hand: 'open', handAng: -2.6, bend: 1, k2: .6 }, L: { W: [3.9, -6.9], hand: 'open', handAng: -2.7, bend: 1, k2: .6 } },
          side:  { R: { W: [3.8, -6.6], hand: 'open', handAng: -2.6, bend: 1, k2: .85 }, L: { W: [4.2, -6.9], hand: 'open', handAng: -2.6, bend: 1, k2: .85 } } },
  // lying on his back: the arms out a little from the body, the hands palm down on the bed
  flat: { front: { R: { W: [-5.4, -.6], hand: 'rest', handAng: .25, bend: 1, thumb: -1 }, L: { W: [5.4, -.6], hand: 'rest', handAng: -.25, bend: -1, thumb: 1 } } },
  // lying on his back, his right hand on the phone lying on his chest (03B)
  chest: { front: { R: { W: [-.9, -4.6], hand: 'rest', handAng: Math.PI - .55, bend: 1, thumb: 1, k2: .8 } } },
  // lying on his side: the top arm lies on the covers in front of him
  onCovers: { side: { R: { W: [3.9, -3.0], hand: 'rest', handAng: -1.0, bend: 1, thumb: -1 } }, q: { R: { W: [3.6, -3.2], hand: 'rest', handAng: -1.0, bend: 1, thumb: -1 } } },
  // the ten fingers spread, pointing up (the puppeteer, 10C)
  puppet: { front: { R: { W: [-4.6, -15.6], hand: 'spread', handAng: Math.PI + .2, bend: -1, thumb: -1 }, L: { W: [4.6, -15.6], hand: 'spread', handAng: Math.PI - .2, bend: 1, thumb: 1 } },
            q:     { R: { W: [2.4, -16.4], hand: 'spread', handAng: Math.PI - .2, bend: -1 }, L: { W: [5.4, -16.0], hand: 'spread', handAng: Math.PI - .3, bend: -1 } },
            side:  { R: { W: [3.6, -16.4], hand: 'spread', handAng: Math.PI - .25, bend: -1 }, L: { W: [4.6, -16.0], hand: 'spread', handAng: Math.PI - .3, bend: -1 } } },
};
// A target in the caller's coordinates → the wrist (torso-local units) in the current frame, then IK.
function himArmResolve(sp, S, u) {
  if (!sp || !sp.toC || sp.W) return sp;
  const p = himFromCaller(sp.toC[0], sp.toC[1]), q = [p[0] / u, p[1] / u], d = himDir(S, q), hl = .9 * (sp.handSc || 1);
  Object.assign(sp, himArmIK(S, [q[0] - d[0] * hl, q[1] - d[1] * hl], sp.bend || 0, sp.k1, sp.k2));
  if (sp.handAng == null) sp.handAng = Math.atan2(d[0], d[1]);
  return sp;
}
// Arm spec for one arm: preset (o.arms), per-arm overrides (o.armR / o.armL: a preset name or a spec object), targets
// in the caller's coordinates (o.toR / o.toL: [x, y] for the hand), the wave, the walk/run swing, the lever, the glass.
function himArmSpec(o, view, side, S, mode, u, gait) {
  const v = view === 'q' ? 'q' : view === 'side' ? 'side' : 'front', t = T;
  const def = mode === 'bed' ? 'lap' : mode === 'lie' ? (o.phone === 'chest' && side === 'R' ? 'chest' : 'flat') : mode === 'sidelie' ? 'onCovers' : null;
  let pre = o['arm' + side] || o.arms || def, sp = null;
  if (typeof pre === 'string' && def && !o['arm' + side] && HIM_ARMS[def][v] && HIM_ARMS[def][v][side]) {   // o.arms: 'plug' etc. pose one arm; the other keeps the bed's / lying default
    const one = { wave: 'R', lever: 'R', glass: 'R', finger: 'R', plug: 'R' }[pre];
    if (one ? one !== side : pre !== 'strung' && !(HIM_ARMS[pre] && HIM_ARMS[pre][v] && HIM_ARMS[pre][v][side])) pre = def;
  }
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
    // front / 3/4: the hand up beside his face, the elbow down in front of the chest (the upper arm foreshortened toward
    // the camera); profile (side-lying 02G): the hand raised in front of his face
    const W = v === 'front' ? [-2.9, -10.7] : v === 'q' ? [S[0] - .3, S[1] - 2.0] : [S[0] + 2.4, S[1] - .4], fs = v === 'side' ? 1 : .42;
    return { ...himArmIK(S, W, v === 'side' ? 1 : 0, fs), hand: 'point', handAng: Math.PI - .2 + .06 * Math.sin(t * TAU * 1.4) };
  }
  else if (pre === 'plug' && side === 'R') {   // holding the unplugged headphone jack up in front of his eyes (04H)
    const W = v === 'front' ? [-1.4, -7.4] : v === 'q' ? [3.6, -7.2] : [4.4, -7.4];
    return { ...himArmIK(S, W, v === 'front' ? 1 : 1, 1, .8), hand: 'pinch', handAng: v === 'front' ? Math.PI + .6 : -2.3, plug: true };
  }
  else if (typeof pre === 'string' && HIM_ARMS[pre]) { const e = HIM_ARMS[pre][v] && HIM_ARMS[pre][v][side]; if (e) sp = { ...e }; }
  // the walk / run swing (angles), unless a preset owns this arm
  if (!sp && gait && gait.arms) return { a: gait.arms[side], hand: gait.hand || null };
  if (!sp && gait && gait.armW && !o['to' + side]) { const g = gait.armW[side]; return { ...himArmIK(S, g.W, g.bend ?? 1), hand: o['hand' + side] || g.hand, handAng: g.handAng ?? undefined }; }
  // targets in the caller's coordinates (the hand's centre)
  const to = o['to' + side];
  if (to) {   // resolved where the arm is drawn (himArmResolve), since it needs that frame's matrix
    sp = { ...(sp || {}), toC: to, W: null, E: null };
    if (o['hand' + side]) sp.hand = o['hand' + side];
  }
  if (!sp) return null;
  if (sp.W && !sp.E) Object.assign(sp, himArmIK(S, sp.W, sp.bend || 0, sp.k1, sp.k2));
  if (o['hand' + side] && pre) sp.hand = o['hand' + side];
  if (o['handAng' + side] != null) sp.handAng = o['handAng' + side];
  return sp;
}

// ---------- the covers (sitting up in bed) ----------
// Drawn in the torso's frame without the lean: hip joint at the origin, the mattress surface at y = +1.3 (the anchor).
// o.coverW / o.coverD scale the spread and the depth (default 1), o.coverCol the duvet colour (hospital white), o.knees
// (0..1) raises the knees under it. Returns the covers' top edge as a function x(px) → y(px) (for clipping arms).
function himCovers(K, c, o, view, u, mode) {
  const base = himCol(c, o.coverCol || '#E7EAF2'), sh = mixCol(base, himCol(c, '#7E89A6'), .42), dk = mixCol(base, himCol(c, '#4C5677'), .5), hi = mixCol(base, '#FFFFFF', .6);
  const sheet = himCol(c, o.sheetCol || '#F6F4EE'), cw = o.coverW ?? 1, cd = o.coverD ?? 1, kn = o.knees ?? .25;
  const X = x => x * cw, Y = y => y < 1.3 ? y : 1.3 + (y - 1.3) * cd;
  const pp = P => P.map(([x, y, k]) => [X(x), Y(y), k]);
  let top, out, shade, folds, ridges, hiL;
  if (mode === 'lie') {   // lying on his back, seen from above: the duvet from the chest (o.coverTop, u above the hips) to the feet
    const ct = -(o.coverTop ?? 6.4);
    top = [[-6.4, ct + .8], [-3.6, ct + .1], [0, ct - .15], [3.6, ct + .1], [6.4, ct + .8]];
    out = [[6.4, ct + .8], [7.0, 4.0], [7.1, 10.0], [6.8, 15.6, 1], [3.0, 16.0], [1.7, 15.2], [.2, 16.1], [-1.6, 15.2], [-3.0, 16.0], [-6.8, 15.6, 1], [-7.1, 10.0], [-7.0, 4.0]];
    ridges = [[-1.7, 8.0, 1.25, 6.4, 0], [1.7, 8.0, 1.25, 6.4, 0], [0, -1.5, 3.4, 2.4, 0]];
    shade = [[[-.4, 2.0], [.4, 2.0], [.7, 9], [.5, 15.6], [-.5, 15.6], [-.7, 9]], [[4.2, 0], [7.0, 1.0], [7.1, 15.4], [4.0, 15.6], [3.6, 8.0]], [[-4.2, 0], [-7.0, 1.0], [-7.1, 15.4], [-4.0, 15.6], [-3.6, 8.0]]];
    folds = [[[-.3, 3], [-.5, 7], [-.3, 12]], [[.4, 3.2], [.55, 7.4], [.3, 12.4]], [[-3.4, 1], [-4.4, 5], [-5.2, 10]], [[3.4, 1], [4.4, 5], [5.2, 10]], [[-3.0, ct + 1.6], [-4.0, ct + 4.0]], [[3.0, ct + 1.6], [4.0, ct + 4.0]]];
    hiL = [[[-2.6, 3.0], [-2.7, 8.0], [-2.5, 13.0]], [[.9, 3.0], [.8, 8.0], [.95, 13.0]]];
  } else if (mode === 'sidelie') {   // lying on his side (seen from above, facing screen right), knees drawn up under the duvet
    const kk = o.curlK ?? .5;
    top = [[-5.6, -7.2], [-3.2, -7.9], [-.4, -8.25], [2.4, -8.0], [5.2, -7.1], [7.2, -6.6]];
    out = [[7.2, -6.6], [8.4, -4.0], [8.9, -.5], [8.6 + kk, 3.2], [9.2 + kk, 6.6], [9.0, 10.5], [8.7, 14.8, 1], [3.0, 15.4], [-2.0, 15.0], [-6.4, 14.8, 1], [-6.9, 10.0], [-6.6, 4.0], [-6.8, -1.0], [-6.5, -4.6]];
    ridges = [[-1.8, .4, 2.3, 1.6, .2], [5.6 + kk * .6, 4.4, 1.7, 1.3, .5], [2.6, 2.0, 3.4, 1.0, .62], [1.4, 9.8, 1.6, 2.4, -.2]];
    shade = [[[-3.6, -3.0], [-4.6, 1.2], [-4.0, 5.5], [-3.0, 10.4], [-1.6, 13.4], [-.6, 10], [-2.0, 5.4], [-2.4, 1.0]], [[4.0, 6.6], [7.0 + kk * .6, 6.8], [5.0, 8.2], [3.4, 10.8], [2.8, 13.2], [2.0, 11.2], [2.8, 8.4]],
             [[-6.6, -4.6], [-5.2, -4.2], [-5.6, 4.0], [-5.2, 14.8], [-6.4, 14.8], [-6.9, 10.0], [-6.6, 4.0]], [[8.4, -4.0], [7.6, 0], [8.0, 6.0], [7.8, 14.7], [8.7, 14.8], [9.0, 10.5], [9.2 + kk, 6.6], [8.6 + kk, 3.2], [8.9, -.5]]];
    folds = [[[.6, -6.4], [1.4, -4.6], [1.6, -2.6]], [[-1.6, -5.8], [-2.2, -3.0]], [[1.0, 2.6], [2.2, 4.6], [2.6, 7.4]], [[5.0, 2.6], [6.0, 4.6]], [[-.6, 7.6], [.4, 10.8]], [[3.0, -.6], [4.6, 1.6]]];
    hiL = [[[-2.8, -1.0], [-1.6, -.3], [-.4, .3]], [[5.2, 2.6], [6.6 + kk * .6, 3.4], [7.4 + kk, 4.6]]];
  } else if (view === 'front') {   // the legs run toward the viewer: two ridges down the duvet, a valley between them, the flat
    // parts beyond, the drape over the bed's sides
    top = [[-5.4, -.2], [-4.0, -.8], [-2.1, -1.1], [0, -1.18], [2.1, -1.08], [4.0, -.78], [5.4, -.18]];
    out = [[5.4, -.18], [6.6, .3], [7.7, .9], [8.3, 2.2], [8.5, 4.4], [8.3, 6.5, 1], [4.8, 6.75], [2.2, 7.1], [0, 6.75], [-2.2, 7.1], [-4.8, 6.8], [-8.3, 6.5, 1], [-8.5, 4.4], [-8.3, 2.2], [-7.7, .92], [-6.6, .32]];
    ridges = [[-2.15, 5.0, 1.25, .9, -.1], [2.15, 5.0, 1.25, .9, .1]];   // the knees, nearest the camera
    shade = [[[-.3, .4], [.3, .4], [.95, 4.0], [.9, 6.7], [-.9, 6.7], [-.95, 4.0]], [[4.0, .3], [6.2, .5], [7.8, 1.3], [8.4, 4.0], [8.2, 6.5], [5.4, 6.7], [4.2, 5.6], [3.6, 3.0]], [[-4.0, .3], [-6.2, .5], [-7.8, 1.3], [-8.4, 4.0], [-8.2, 6.5], [-5.4, 6.75], [-4.2, 5.6], [-3.6, 3.0]],
             [[-3.3, 5.4], [-1.0, 5.6], [-.9, 6.7], [-2.2, 7.0], [-3.6, 6.6]], [[3.3, 5.4], [1.0, 5.6], [.9, 6.7], [2.2, 7.0], [3.6, 6.6]]];   // under the knees
    folds = [[[-.3, .8], [-.7, 3.0], [-1.0, 5.4]], [[.35, .9], [.75, 3.1], [1.0, 5.4]], [[-3.3, .5], [-4.4, 2.2], [-5.6, 3.8]], [[3.4, .45], [4.5, 2.1], [5.7, 3.7]], [[-5.8, .7], [-6.9, 1.9], [-7.6, 3.4]], [[5.8, .65], [6.9, 1.9], [7.6, 3.3]],
             [[-3.4, 5.6], [-4.8, 6.3]], [[3.4, 5.5], [4.8, 6.3]], [[-1.4, .3], [-2.2, 1.1]], [[1.5, .25], [2.3, 1.1]]];
    hiL = [[[-2.5, 1.0], [-2.75, 3.0], [-3.05, 4.6]], [[1.4, 1.0], [1.45, 3.0], [1.4, 4.6]], [[-3.0, 4.7], [-2.2, 4.3], [-1.3, 4.6]], [[1.3, 4.6], [2.2, 4.3], [3.0, 4.7]]];
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
  // the shading, ridges and folds stay inside the duvet's outline
  const keep0 = K.keep, outl = himS(all, true, 4).map(([x, y]) => [x * u, y * u]);
  K.keep = p => { let d = 1e9; for (let i = 0; i < outl.length; i++) { const a = outl[i], b = outl[(i + 1) % outl.length], ex = b[0] - a[0], ey = b[1] - a[1], t = clamp(((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)); d = Math.min(d, Math.hypot(p[0] - a[0] - ex * t, p[1] - a[1] - ey * t)); }
    return himInPoly(outl, p[0], p[1]) ? -d : d; };
  for (const S of shade) K.shape(pp(S), { wash: sh, op: 95, ink: null, n: 3, wc: .8, gran: false });
  // o.coverRidges === false: no pale ridge ovals (they read as holes on a pale duvet); a soft lit wash along each ridge and
  // a crease either side instead, so the cloth still has its rises
  if (o.coverRidges === false) for (const [x, y, rx, ry, a] of ridges) {
    const ca = Math.cos(a), sa = Math.sin(a), at = (d, e) => [x + ca * d * rx - sa * e * ry, y + sa * d * rx + ca * e * ry];
    K.shape(pp([at(-1, -.25), at(-.4, -.55), at(.5, -.5), at(1, -.15), at(.4, .1), at(-.5, .05)]), { wash: hi, op: 55, ink: null, n: 3 });
    K.line(pp([at(-.95, .35), at(-.1, .55), at(.8, .4)]), .3, sh, { n: 3 });
    K.line(pp([at(-.7, -.75), at(.2, -.85), at(.9, -.6)]), .26, dk, { n: 3 });
  } else
  for (const [x, y, rx, ry, a] of ridges) K.shape(ellPts(X(x), Y(y), rx * cw, ry * cd, 18, 0, a), { wash: hi, op: 110, ink: null, raw: true, j: 0 });
  for (const L of hiL) K.line(pp(L), .4, hi, { n: 3 });
  for (const F of folds) K.line(pp(F), .32, dk, { n: 3 });
  K.keep = keep0;
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
  if (view === 'side' && o.rise != null && o.walk == null && o.run == null) return himRise(o);
  if (view === 'side' && o.yank != null && o.walk == null && o.run == null) return himYank(o);
  if (view !== 'side' || (o.walk == null && o.run == null)) return null;
  const run = o.run != null, ph = frac(run ? o.run : o.walk), st = (o.stride ?? 1) * (run ? 6.2 : 4.4);
  const hipH = run ? 14.9 : 15.3, L = {};
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
  const arms = run ? { R: [-sw * s + .1, 1.35], L: [sw * s + .1, 1.35] } : { R: [-sw * s, .18 + .12 * Math.max(0, -s)], L: [sw * s, .18 + .12 * Math.max(0, s)] };
  return { hipH, legs: L, bob, lean: run ? .2 : .04, arms, hand: run ? 'fist' : null, order: [['L', true], ['R', false]] };
}

// Getting up (04C), profile: o.rise 0..1 goes from sitting on the bed's edge (feet on the floor, hands on the thighs) to
// standing (the same drawing as stand / side with contra 0, so it cuts straight into walk, wave, ...). Anchor = the
// standing anchor (the ground point under his feet); the seat (the bed's top edge) is 4u behind it at height o.seatH
// (u, default 8.2, as for 'edge'); the hips sit 1.6u in from the edge. Phases: 0–.3 the feet slide back under the
// knees and he leans forward over them; .3–.85 the hips lift forward and up; .85–1 he straightens.
const HIM_STANDH = 14.7 * Math.sqrt(.997) + .95;   // the standing hip height (soles → hip centre), as himStand computes it
const HIM_FEET_SIDE = { R: [.05, -.95], L: [1.1, -.95] };   // the standing feet in profile (contra 0), anchor units
function himRise(o) {
  const k = clamp(o.rise), sh = o.seatH ?? 8.2, s0 = [-5.6, -(sh + 1.2)];
  const a = ease(seg(k, 0, .3)), b = seg(k, .3, .85), c2 = ease(seg(k, .85, 1));
  let hx = lerp(s0[0], s0[0] + .35, a), hy = s0[1];
  if (k > .3) { const e1 = 1 - Math.pow(1 - b, 2.2), e2 = b * b * (3 - 2 * b); hx = lerp(s0[0] + .35, -.45, e1); hy = lerp(s0[1], -(HIM_STANDH - .5), e2); }
  if (k > .85) { hx = lerp(-.45, 0, c2); hy = lerp(-(HIM_STANDH - .5), -HIM_STANDH, c2); }
  const lean = k <= .3 ? lerp(.1, .78, a) : k <= .85 ? lerp(.78, .1, ease(b)) : lerp(.1, 0, c2);
  const slide = lerp(1.4, 0, ease(seg(k, 0, .25))), F = HIM_FEET_SIDE;
  const legs = {}, hipH = -hy;
  for (const sd of ['R', 'L']) legs[sd] = { A: [F[sd][0] + slide - hx, hipH - .95], lift: 0 };
  // the hands: pushing on the thighs, then hanging (torso frame: the arm IK runs in himArmSpec)
  const L0 = lean + (o.lean || 0), cl = Math.cos(-L0), sl = Math.sin(-L0), toT = p => [p[0] * cl - p[1] * sl, p[0] * sl + p[1] * cl];
  const armW = {}, push = 1 - ease(seg(k, .45, .8));
  for (const sd of ['R', 'L']) {
    const H = HIM_RIG.side.hip[sd], A = legs[sd].A, N = himIK(H, A, HIM_THIGH, HIM_SHIN, -1), d = himDir(H, N);
    const onThigh = toT([lerp(H[0], N[0], .62) + d[1] * .55, lerp(H[1], N[1], .62) - Math.abs(d[0]) * .55]);
    const S = HIM_RIG.side.sh[sd], hang = himChain(S, sd === 'R' ? .06 : -.02, 4.9, sd === 'R' ? .16 : .1, 4.3)[2], td = toT(d);
    armW[sd] = { W: [lerp(hang[0], onThigh[0], push), lerp(hang[1], onThigh[1], push)], hand: push > .5 ? 'rest' : 'relax', handAng: push > .5 ? Math.atan2(td[0], td[1]) : null };
  }
  return { hipH, hipX: hx, legs, bob: 0, lean, armW, order: [['L', true], ['R', false]] };
}
// Yanked backward off his feet (04C: the IV line snaps him back to the bed like a rubber band), profile: o.yank 0..1
// throws him back — the legs swing forward and up, the torso tips back, the head lags forward, the near arm (the IV
// arm, o.iv) is pulled back toward the bed and the far arm flails forward. Combine with dx / dy along the arc and
// o.rot (whole figure, about the hips) for the flight; land with pose 'edge', fall 1, and dy / sq for the bounces.
function himYank(o) {
  const k = clamp(o.yank), e = ease(k), legs = {};
  const sp = [[1.3, .75, 0], [1.02, .45, .25]];   // [thigh angle from vertical, knee bend, delay] per leg (R near, L far)
  ['R', 'L'].forEach((sd, i) => {
    const [th0, kb, dl] = sp[i], kk = ease(seg(k, dl * .5, 1)), th = th0 * kk, ph = kb * kk, H = HIM_RIG.side.hip[sd];
    const N = [H[0] + Math.sin(th) * HIM_THIGH, H[1] + Math.cos(th) * HIM_THIGH], A = [N[0] + Math.sin(th - ph) * HIM_SHIN * .995, N[1] + Math.cos(th - ph) * HIM_SHIN * .995];
    legs[sd] = { A: [A[0] + (sd === 'L' ? lerp(1.05, 0, kk) : 0), A[1]], lift: 0 };
  });
  // the arms, aimed in the figure's upright frame (the near arm back and up toward the bed, the far arm flung forward), then
  // turned into the leaning torso's frame
  const lean = -.48 * e, L0 = lean + (o.lean || 0), cl = Math.cos(-L0), sl = Math.sin(-L0), toT = p => [p[0] * cl - p[1] * sl, p[0] * sl + p[1] * cl];
  const S = HIM_RIG.side.sh, sw = .5 * Math.sin(T * 9) * e;
  const W = (S0, a0, a1, L) => { const s0 = [S0[0] * Math.cos(L0) - S0[1] * Math.sin(L0), S0[0] * Math.sin(L0) + S0[1] * Math.cos(L0)], a = lerp(a0, a1, e);
    return toT([s0[0] + Math.sin(a) * L, s0[1] + Math.cos(a) * L]); };   // shoulder → upright frame, aim, back to the torso frame
  const armW = { R: { W: W(S.R, .06, -2.2, lerp(8.9, 8.8, e)), hand: e > .4 ? 'open' : 'relax', bend: 1 },
                 L: { W: W(S.L, -.02, 2.3 + sw, lerp(8.9, 7.4, e)), hand: e > .4 ? 'open' : 'relax', bend: -1 } };
  return { hipH: HIM_STANDH, legs, bob: 0, lean, tilt: .34 * e, armW, order: [['L', true], ['R', false]] };
}

// ---------- sitting and lying poses ----------
// A sock-clad foot in profile (in bed, on the floor), around the ankle A, toes toward +x.
function himSock(K, c, A, far) {
  const P = Q => Q.map(([x, y, k]) => [A[0] + x, A[1] + y, k]), sk = far ? mixCol(c.sock, c.ink, .25) : c.sock, dk = mixCol(c.sock, c.ink, .35);
  K.shape(P([[-.52, -.42], [.45, -.36], [1.2, .08], [2.05, .42], [2.42, .62], [2.4, .9], [2.05, .98], [-.42, .98], [-.74, .74], [-.7, .15]]), { wash: sk, sw: .55, n: 4 });
  K.shape(P([[-.42, .98], [2.05, .98], [2.4, .9], [2.0, .8], [-.6, .8]]), { wash: dk, op: 140, ink: null, n: 3 });
  if (K.det) { K.line(P([[1.75, .3], [1.95, .62], [1.9, .92]]), .22, dk, { n: 2 }); K.line(P([[-.52, -.3], [.45, -.24]]), .22, dk, { raw: true }); }
}
// Socks for any view: 'front' (the toes toward the viewer; turn ±1 turns them out), 'side' / 'q' (profile).
function himSockAny(K, c, A, view, far, turn = 0) {
  if (view !== 'front') return himSock(K, c, [A[0] - .1, A[1] - .02], far);
  const P = Q => Q.map(([x, y, k]) => [A[0] + x + turn * .32 * clamp((y + .3) / 1.2), A[1] + y, k]), sk = far ? mixCol(c.sock, c.ink, .25) : c.sock, dk = mixCol(c.sock, c.ink, .35);
  K.shape(P([[-.62, -.5], [.62, -.5], [.86, -.05], [1.0, .42], [.92, .82], [.5, 1.0], [0, 1.04], [-.5, 1.0], [-.92, .82], [-1.0, .42], [-.86, -.05]]), { wash: sk, sw: .55, n: 4 });
  K.shape(P([[.4, -.4], [.86, -.05], [1.0, .42], [.92, .82], [.5, 1.0], [.55, .5]]), { wash: dk, op: 130, ink: null, n: 3 });
  if (K.det) { K.line(P([[-.7, .55], [-.2, .72], [.3, .72], [.75, .55]]), .22, dk, { n: 3 }); K.line(P([[-.5, -.38], [.5, -.38]]), .22, dk, { raw: true }); }
}
// The seated profile (facing screen right) used by 'edge' and 'knees': far arm, far leg, torso, near leg, near arm,
// head. S = { hip: [x, y] (anchor units), lean, legs: { R: ankle, L: ankle }, knee (IK side), feet ('shoe'|'sock'),
// arms: { R: spec, L: spec } (torso frame), cut (torso cut, u below the hips) }.
function himSitProfile(K, c, f, o, outfit, u, sw, rs, S) {
  const hip = S.hip, lean = S.lean, band = o.band === false ? '' : (o.flip ? 'R' : 'L'), R = HIM_RIG.side;
  HIM_SPECS = { view: 'side', mode: 'sit', R: S.arms.R, L: S.arms.L };
  const legAt = (side, far) => {
    rs('leg' + side);
    const H = [hip[0] + (far ? -.3 : 0), hip[1]], A = S.legs[side], N = himIK(H, A, HIM_THIGH, HIM_SHIN, S.knee ?? -1);
    rs('shoe' + side);
    if (S.feet === 'sock') himSock(K, c, [A[0], A[1] + .02], far); else himShoe(K, c, [A[0], A[1] + .05], 'side', far, outfit);
    rs('leg' + side); himLeg(K, c, H, N, A, HIM_LEG.side, { far, hem: 'side', outer: -1 });
  };
  const arm = (side, far) => {
    const sp = S.arms[side]; if (!sp) return;
    rs('arm' + side);
    himArm(K, c, { S: R.sh[side], E: sp.E, W: sp.W, outfit, hand: sp.hand || 'relax', handAng: sp.handAng, thumb: sp.thumb || 1, band: band === side, far, side, o, u });
    HIM_W['wrist' + side] = himToCaller(sp.W[0] * u, sp.W[1] * u); HIM_W['hand' + side] = himToCaller(himHandAt(sp)[0] * u, himHandAt(sp)[1] * u);
  };
  const frame = fn => { push(); translate(hip[0] * u, hip[1] * u); rotate(lean); fn(); pop(); };
  if (S.farArmFirst !== false) frame(() => arm('L', true));
  legAt('L', true);
  frame(() => { rs('torso'); K.cut = (S.cut ?? .9) * u; himTorsoSide(K, c, o, outfit); K.cut = null; himTorsoProps(K, c, o, 'side', u); });
  legAt('R', false);
  frame(() => {
    if (S.phone) { rs('phone'); himHeldPhone(K, c, { ...o, phone: 'two' }, 'side', u); }
    arm('R', false);
    rs('head');
    push(); translate(R.neck[0] * u, R.neck[1] * u); rotate(o.tilt ?? 0); translate(R.head[0] * u * HIM_HS, (R.head[1] + (o.nod || 0)) * u * HIM_HS); scale(HIM_HS);
    HIM_W.head = himToCaller(0, 0);
    himHeadProps(K, c, f, o, 'side', u, 'pre'); himHead(K, c, f, u, sw / HIM_HS * 1.05, 'side'); rs('headprops'); himHeadProps(K, c, f, o, 'side', u, 'post');
    pop();
  });
}
// a point given in the anchor frame → the torso frame of a seated profile (hip, lean)
const himToTorso = (p, hip, lean) => { const dx = p[0] - hip[0], dy = p[1] - hip[1], cl = Math.cos(-lean), sl = Math.sin(-lean); return [dx * cl - dy * sl, dx * sl + dy * cl]; };
// Sitting on the bed's edge in profile, both hands holding the phone (03A); o.fall 0..1 lets him fall back onto the
// bed, pivoting at the hips, the phone sliding onto his chest. Anchor: the floor under the bed's edge; o.seatH: the
// mattress height (u, default 8.2). The mattress top is at y = -seatH, his hips 1.2u above it, 1.6u in from the edge.
function himEdge(K, c, f, o, outfit, u, sw, rs) {
  const fl = ease(clamp(o.fall || 0)), sh = o.seatH ?? 8.2, hip = [-1.6, -sh - 1.2 + .3 * fl];   // lying back, the pelvis rolls onto its back: a little lower
  const lean = lerp(o.lean ?? .1, -1.52, fl), th = lerp(0, -.32, fl);   // the thighs lift a little as he goes over
  const knee = [hip[0] + Math.cos(th) * HIM_THIGH, hip[1] + Math.sin(th) * HIM_THIGH];
  const ank = dx => [knee[0] + dx + lerp(-.3, 1.4, fl), Math.min(-.95, knee[1] + HIM_SHIN * .98)];
  const arms = {}, hold = o.arms !== 'lap';
  for (const [sd, sh2] of [['R', HIM_RIG.side.sh.R], ['L', HIM_RIG.side.sh.L]]) {
    const W0 = sd === 'R' ? [3.75, -5.75] : [4.05, -6.05], W1 = sd === 'R' ? [2.2, -7.2] : [2.5, -7.5];
    const W = hold ? [lerp(W0[0], W1[0], fl), lerp(W0[1], W1[1], fl)] : sd === 'R' ? [3.2, -1.0] : [3.6, -1.2];
    arms[sd] = { ...himArmIK(sh2, W, 1), hand: hold ? 'hold' : 'rest', handAng: hold ? lerp(-2.25, -2.6, fl) : -1.3 };
  }
  himSitProfile(K, c, f, { ...o, phoneAng: lerp(-.75, -1.4, fl) }, outfit, u, sw, rs, { hip, lean, legs: { R: ank(0), L: ank(-.5) }, knee: -1, feet: o.feet || (outfit === 'home' ? 'sock' : 'shoe'), arms, phone: hold && o.phone !== false, cut: .9 });
}
// Sitting on the bed (or the floor) hugging his knees, in profile (06A, 06H). o.curl 0..1 folds him tighter, the head
// down on his knees (07D: curled on the floor, o.phone = 'forehead' presses the phone to his forehead); o.rock 0..1
// rocks him on the beat; o.reach 0..1 sends his near hand out to the side toward a phone (06H). Anchor: the point
// under his seat on the bed / floor.
function himKnees(K, c, f, o, outfit, u, sw, rs) {
  const ck = clamp(o.curl ?? (o.pose === 'curl' ? 1 : 0)), rock = (o.rock || 0) * Math.sin(bpOf(T) * Math.PI) * .06;
  const hip = [0, -1.25], lean = (o.lean ?? 0) + lerp(.5, .7, ck) + rock;
  const A = [lerp(5.5, 5.0, ck), -.98], legs = { R: A, L: [A[0] - .35, A[1]] };
  const N = himIK(hip, A, HIM_THIGH, HIM_SHIN, -1);
  // the arms: wrapped round the shins (the near forearm across their front), or both hands at his forehead with the phone
  const arms = {}, sh = HIM_RIG.side.sh, fh = o.phone === 'forehead', rk = ease(clamp(o.reach || 0));
  const shinPt = (k, dx = 0) => himToTorso([lerp(N[0], A[0], k) + dx, lerp(N[1], A[1], k)], hip, lean);
  const tilt = (o.tilt ?? 0) + lerp(.18, .62, ck), nod = (o.nod ?? 0) + lerp(.1, .4, ck);
  // the forehead's front in the torso frame (the head hangs on the neck pivot, tilted)
  const Rg = HIM_RIG.side, hx = (Rg.head[0] + 1.25) * HIM_HS, hy = (Rg.head[1] + nod - 1.2) * HIM_HS, fhd = [Rg.neck[0] + hx * Math.cos(tilt) - hy * Math.sin(tilt), Rg.neck[1] + hx * Math.sin(tilt) + hy * Math.cos(tilt)];
  if (fh) {
    const ph = [fhd[0] + .55 * Math.cos(tilt), fhd[1] + .55 * Math.sin(tilt)];
    arms.R = { ...himArmIK(sh.R, [ph[0] - .9, ph[1] + 1.3], 1, 1, .85), hand: 'hold', handAng: -2.5 };
    arms.L = { ...himArmIK(sh.L, [ph[0] - .6, ph[1] + 1.1], 1, 1, .85), hand: 'hold', handAng: -2.45 };
    arms.ph = ph;
  } else {
    const wr = shinPt(.42, .9), wl = shinPt(.36, 1.0);
    arms.L = { ...himArmIK(sh.L, wl, 1), hand: 'fist', handAng: -1.0 };
    const reachW = himToTorso([A[0] + 4.5, -1.4], hip, lean);
    arms.R = { ...himArmIK(sh.R, [lerp(wr[0], reachW[0], rk), lerp(wr[1], reachW[1], rk)], 1), hand: rk > .5 ? 'rest' : 'fist', handAng: lerp(-1.6, -.6, rk), k2: 1 };
  }
  const oo = { ...o, tilt, nod };
  himSitProfile(K, c, f, oo, outfit, u, sw, rs, { hip, lean, legs, knee: -1, feet: o.feet || 'sock', arms, cut: .6 });
  if (fh) {   // the phone pressed to his forehead, its light on his face
    const m = arms.ph;
    push(); translate(hip[0] * u, hip[1] * u); rotate(lean); translate(m[0] * u, m[1] * u); rotate(tilt - .2);
    himPhoneBody(himKit(u * 1.25, c, clamp(.28 + u * 1.25 / 120, .32, 1.7), Math.max(.4, u * .006), false), c, 'edge', { screen: o.screen || 'white' });
    glow(-.6 * u, 0, 3.6 * u, (HIM_SCREENS[o.screen] || HIM_SCREENS.white)[0], .7 * (o.glowK ?? 1));
    HIM_W.phone = himToCaller(0, 0);
    pop();
  }
}
// pose dispatcher for the round-8 poses (called by him() for poses other than stand / bust / bed / desk)
function himPose(K, c, f, o, pose, view, outfit, u, sw, rs) {
  if (pose === 'lie' || pose === 'sidelie') {
    push(); rotate(o.rot ?? (pose === 'lie' ? -Math.PI / 2 : 0));
    himStand(K, c, f, { ...o, contra: 0, handR: o.handR || (pose === 'lie' ? 'rest' : undefined), handL: o.handL || (pose === 'lie' ? 'rest' : undefined), tilt: (o.tilt || 0) + (pose === 'sidelie' ? .12 : 0) }, pose === 'lie' ? 'front' : view === 'front' ? 'side' : view, outfit, u, sw, rs, pose);
    pop();
  } else if (pose === 'edge') himEdge(K, c, f, o, outfit, u, sw, rs);
  else if (pose === 'knees' || pose === 'curl') himKnees(K, c, f, { ...o, pose }, outfit, u, sw, rs);
}
