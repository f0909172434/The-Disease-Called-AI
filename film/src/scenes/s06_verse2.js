// S06 VERSE 2 "DEPENDENCE" (83.72-106.05, b61-76): 06A..06H. STORYBOARD §6. Read src/scenes/s00_intro.js first.
// The room is `drained` (colour at .35, grey unread cards lying like snow); she is the only saturated thing, plus mum's
// photo and the friends' photos, the last warm colours. Every shot is a pure function of t.
(() => {
  const SEC = sectionById('S06');
  const T_A = SEC.start, T_END = SEC.end;
  const T_B = kitCut(63, 1, 86.51), T_C = kitCut(65, 1, 89.30), T_D = kitCut(67, 1, 92.09), T_E = kitCut(69, 1, 94.88),
    T_F = kitCut(71, 1, 97.67), T_G = kitCut(73, 1, 100.47), T_H = kitCut(75, 1, 103.26);
  const buzz = events('phone').filter(e => e.t >= T_A - .1 && e.t < T_END).map(e => e.t);
  const DBG = typeof location !== 'undefined' && /dbg06/.test(location.search);
  function s06dbg(p, c = '#FF00AA') { if (!DBG || !p) return; flushBrush(); push(); noStroke(); fill(c); circle(p[0], p[1], 8); pop(); }
  // whip-pan streaks: thin dry-brush strokes across the frame (kitSmear's are fat)
  function s06Streaks(speed, dir, cols, seed = 0) {
    if (speed <= .03) return;
    for (let i = 0; i < 16; i++) {
      boilSeed('s06streak' + seed + '_' + i);
      const y = H * (.06 + .88 * hash(i * 3.17 + seed)), len = W * (.3 + .8 * hash(i * 7.9 + seed)) * speed, cx = W * hash(i * 5.3 + seed + 1) + dir * W * .2 * (1 - speed);
      inkLine([[cx - len / 2, y], [cx + len / 2, y + (hash(i * 2.2) - .5) * 10]], 2 + 8 * speed * hash(i * 1.3 + 2), cols[i % cols.length], 'dry', 0);
    }
  }
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

  // his head (world px, relative to his seat) in `knees` flipped to face left, u 31: measured at curl 0 / .55 / 1 and lean 0 / .2
  const KH = { 0: [[-205, -386], [-270, -339]], .55: [[-243, -352], [-300, -297]], 1: [[-268, -321], [-318, -263]] };
  function s06KneesHead(sx, sy, curl, lean, u = 31) {
    const row = c => { const a = KH[c]; return [lerp(a[0][0], a[1][0], lean / .2), lerp(a[0][1], a[1][1], lean / .2)]; };
    const p = curl < .55 ? lerp2(row(0), row(.55), curl / .55) : lerp2(row(.55), row(1), (curl - .55) / .45);
    return [sx + p[0] * u / 31, sy + p[1] * u / 31];
  }

  // =============================================================================================================
  // 06A  83.72-86.51  the floor camera. Mum calls: her photo (the one warm thing) on the phone lying on the grey snow,
  // a ripple spreads over the snow with each pair of buzzes. In the back, on the bed: he hugs his knees, she covers his
  // ears and he leans into her.
  // reads: 83.72-84.90 the buzzing phone, mum's photo, the ripples · 84.90-86.51 she covers his ears, he leans to her
  // =============================================================================================================
  const A_PX = 1990, A_PY = 2050, A_PH = 560, A_SQ = .62;
  const A_COVER0 = 84.90, A_LET = 86.08;
  const s06BuzzK = t => buzz.reduce((s, b) => s + (t >= b && t < b + .3 ? Math.exp(-(t - b) * 16) * Math.sin((t - b) * 150) : 0), 0);
  function s06phoneFloor(t, x, y, h, sq, o = {}) {      // a phone lying (foreshortened) on the floor, its screen light on the snow
    const bz = s06BuzzK(t), lit = o.lit ?? 1;
    glow(x, y - h * sq * .18, h * 1.25, SET_C.amber, .5 * lit); glow(x, y - h * sq * .2, h * .55, '#FFE8C8', .3 * lit);
    boilSeed('s06 phone shadow'); paint(ellPts(x + 10, y + h * sq * .46, h * .3, h * .045, 20), { wash: '#1C1D26', washOp: 130, ink: null });
    push(); translate(x + 9 * bz, y + 3 * Math.abs(bz)); rotate(-.1 + .02 * bz); scale(1, sq); translate(-x, -y);
    setPhone(x, y, h, { screen: S => setCallScreen(S, { buzz: o.buzzAge, grey: o.grey || 0 }), glow: 0, key: 'floor' });
    pop();
  }
  function s06a(t, lt, dur) {
    const CAM = kitCam(lt, [[0, 1500, 1890, .8], [1.2, 1490, 1880, .8], [dur, 1360, 1830, .78]], { drift: 3 });
    setRoom('drained', { t, res: .7, screen: .18 });
    // the pair on the bed
    const HU = 31, lean = .2 * kitEase.sine(seg(t, A_COVER0 + .1, A_COVER0 + .7)), curl = .55 * kitEase.sine(seg(t, A_COVER0 + .1, A_COVER0 + .8));
    const HX = 1180, HY = 1734, AX = 760, AY = 1722, AU = 82;
    const head = s06KneesHead(HX, HY, curl, lean, HU);
    const rel = kitEase.sine(seg(t, A_LET, A_LET + .35));
    const cov = aiAct('cover', t, A_COVER0 - .05, { form: 'full', at: head, r: 58 });
    cov.reachLW = [head[0] + 8, head[1] + 8]; cov.reachRW = [head[0] + 40, head[1] - 6];   // the near hand on his ear, the far one behind his head
    const arms = rel < 1 ? { ...cov, reachLW: lerp2(cov.reachLW, [800, 1672], rel), reachRW: lerp2(cov.reachRW, [848, 1668], rel) } : { reachLW: [800, 1672], reachRW: [848, 1668], handL: 'relax', handR: 'relax' };
    const hf = { ...aiEmotions(t, [[T_A, 'gentle', { lookX: .5 }]]), ...(t >= A_COVER0 - .05 ? arms : {}), form: 'full', pose: 'sit', view: 'q', pal: 'glow', t, seed: 4, boilKey: 's06a her' };
    glow(AX + 30, 1480, 420, SET_C.cyan, .28);
    ai(AX, AY, AU, { ...hf, layer: 'far' });
    him(HX, HY, HU, { ...himEmotions(t, [[T_A, 'blank', { glare: 0 }]], { take: .4 }), pose: 'knees', view: 'side', flip: true, outfit: 'home', pal: 'drained', curl, lean, boilKey: 's06a him', seed: .3 });
    s06dbg(HIM_LAST.head);
    ai(AX, AY, AU, { ...hf, layer: 'near' });
    // the phone, its ripples on the snow
    const age0 = buzz.length ? t - (buzz.filter(b => b <= t).pop() ?? -9) : 9;
    for (const b of [buzz[0], buzz[2], buzz[4]]) if (b != null) setSnowRipple(A_PX, A_PY + A_PH * A_SQ * .42, t - b, 120);
    s06phoneFloor(t, A_PX, A_PY, A_PH, A_SQ, { buzzAge: age0 });
    setRoomSnow({ t });
    camEnd();
    kitFadeIn(lt, .35, '#2A2A30');
  }

  // =============================================================================================================
  // 06B  86.51-89.30  the phone in her hands, close. Her thumbs type a perfect reply (cyan lines, no letters, 86.6-87.85),
  // 87.91 it is sent (the bubble leaps off the screen), mum's photo on the screen goes grey (the thorn), 88.80 she turns the
  // phone face down on the bed and smiles at him. He leans on her shoulder.
  // reads: 86.51-87.91 she types for him · 87.91-88.80 sent, mum's photo turns grey · 88.80-89.30 phone down, her smile
  // =============================================================================================================
  const B_SEND = 87.907, B_DOWN = 88.80;
  const B_CAM = [850, 1545, 1.9];
  // the screen of her phone: mum's photo (warm; g = grey 0..1), her typed reply (cyan bars, no letters), the sent bubble
  function s06phoneScreen(g, typed, sent) {
    return (sc, at, h, w) => {
      const G = c => g > 0 ? mixCol(c, setDesat(mixCol(c, '#8C8F98', .3), 1), g) : c, Q = (x, y) => at(x * h, y * w);
      const P = (pts, o) => aiPaint(pts.map(p => Q(p[0], p[1])), o), E = (cx, cy, rx, ry, n = 14) => { const r = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; r.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return r; };
      P([[-.0, -.42], [.44, -.42], [.44, .42], [-.0, .42]], { wash: G('#F4C890'), ink: null });
      P([[-.0, -.42], [.44, -.42], [.44, .42], [.2, .42]], { wash: G('#F9DDB0'), op: 170, ink: null });
      P(E(-.01, 0, .17, .38, 18), { wash: G('#B5533C'), ink: null });
      P([[-.45, -.42], [-.45, .42], [-.0, .42], [-.0, -.42]], { wash: '#0E2342', ink: null });
      P(E(.19, 0, .035, .09), { wash: G('#E8B08C'), ink: null });
      P(E(.31, .05, .05, .15, 18), { wash: G('#5A3426'), ink: null });
      P(E(.28, 0, .1, .2, 18), { wash: G('#F0C09C'), ink: null });
      P(E(.37, .04, .05, .17, 16), { wash: G('#5A3426'), ink: null });
      P(E(.4, .2, .035, .1, 10), { wash: G('#5A3426'), ink: null });
      for (const e of [-.07, .07]) aiLine([Q(.29, e - .03), Q(.3, e), Q(.29, e + .03)], AI_S.sw * .25, G('#5A3426'));
      aiLine([Q(.215, -.04), Q(.205, 0), Q(.215, .04)], AI_S.sw * .3, G('#A0503C'));
      // her reply: cyan bars growing (no letters); sent: one solid bubble
      const rows = [[.7, -.06], [.5, -.14], [.62, -.22]], f = clamp(typed);
      if (sent <= 0) rows.forEach(([len, x], i) => { const q = clamp(f * rows.length - i); if (q <= 0) return; const y1 = .36 - .72 * len * q;
        P([[x - .034, .36], [x - .034, y1], [x + .034, y1], [x + .034, .36]], { wash: AI_CYAN_, op: 235, ink: null }); });
      else if (sent < 1) { const fl = easeOut(sent), a = 1 - sent, dx = .55 * fl; P([[-.04 + dx, -.36], [-.04 + dx, .36], [-.3 + dx, .36], [-.3 + dx, -.36]], { wash: AI_CYAN_, op: 235 * a, ink: null }); }
    };
  }
  const AI_CYAN_ = '#7FE9FF', S0 = () => AI_S;
  function s06b(t, lt, dur) {
    kitCam(lt, [[0, B_CAM[0], B_CAM[1], B_CAM[2]], [dur, B_CAM[0] + 6, B_CAM[1] - 10, B_CAM[2] * 1.04]], { drift: 3 });
    setRoom('drained', { t, res: 1.8, screen: .18 });
    const HU = 31, AX = 760, AY = 1722, AU = 82, HX = 1180, HY = 1734, curl = .55, lean = .2;
    // the phone rises into her hands (picked up), is typed on, then turned face down
    const up = kitEase.sine(seg(t, T_B, T_B + .4)), down = kitEase.sine(seg(t, B_DOWN - .05, B_DOWN + .3));
    const c = lerp2(lerp2([.2, -4.6], [.02, -7.15], up), [.7, -5.6], down);
    const typed = seg(t, T_B + .15, B_SEND - .05), sent = seg(t, B_SEND, B_SEND + .25), grey = kitEase.sine(seg(t, B_SEND + .1, B_SEND + .6));
    const face = t < B_DOWN ? 'gentle' : 'smile';
    const f = aiEmotions(t, [[T_B, 'gentle', { lookY: .35 }], [B_DOWN - .1, 'smile', { lookX: .6, lookY: 0 }]]);
    const hold = aiAct('hold', t, T_B - .1, { form: 'full', at: c, w: .5, prop: t < B_DOWN + .15 ? { kind: 'phone', screen: 'type', thumbs: t < B_SEND + .3, t, size: 5.6, glow: .5, draw: s06phoneScreen(grey, typed, sent), ang: -Math.PI / 2 + .12 * down } : { kind: 'phone', screen: 'back', size: 5.6 } });
    setRoomSnow({ t });
    glow(AX + 20, 1520, 380, SET_C.cyan, .25);
    const sit = { form: 'full', pose: 'sit', view: 'front', pal: 'glow', t, seed: 4, boilKey: 's06b her' };
    ai(AX, AY, AU, { ...f, ...hold, ...sit, rot: -.04 * down, tilt: .05 * up });
    him(HX, HY, HU, { ...himEmotions(t, [[T_B, 'blank'], [B_SEND + .6, 'sad']], { take: .3 }), pose: 'knees', view: 'side', flip: true, outfit: 'home', pal: 'drained', curl, lean, boilKey: 's06a him', seed: .3 });
    camEnd();
  }

  // =============================================================================================================
  // 06C  89.30-92.09  they face each other, close. She cups his face in both hands; a cyan scan line sweeps down his face
  // (her eyes follow the light); her eyes flash `perfect`: the answer is ready. He looks up at her, hoping.
  // 06D  92.09-94.88  same frame. She tears off a sticker (a grey-blue teardrop) and presses it on his forehead; he
  // feels it, accepts it, a faint sad smile; 94.05 *I understand.*: she nods.
  // reads 06C: 89.30-90.20 she cups his face · 90.20-91.40 the scan line goes down his face · 91.40-92.09 her eyes flash
  // reads 06D: 92.09-92.90 the sticker goes on · 92.90-93.60 he touches it · 93.60-94.88 he accepts it; she nods
  // =============================================================================================================
  const PR = { ax: 700, ay: 1660, au: 160, hx: 1010, hy: 1730, hu: 62 };
  const PR_CAM = [900, 1643, 1];
  const prHead = () => [PR.hx - .21 * PR.hu, PR.hy - 2.79 * PR.hu];          // his head centre (bust, side, flip): measured
  const C_SCAN0 = 90.20, C_SCAN1 = 91.40, C_FLASH = 91.40;
  const D_STICK = 92.55, D_TOUCH = 92.90, D_NOD = 94.05;
  function s06pair(t, lt, dur, o = {}) {
    const wo = o.whipOut ? kitWhipOut(lt - (dur - .2), .2, 1) : { dx: 0, speed: 0 };
    kitCam(lt, [[0, PR_CAM[0] + wo.dx, PR_CAM[1], PR_CAM[2]], [dur * 2.4, PR_CAM[0] + wo.dx + 14, PR_CAM[1] - 6, PR_CAM[2] * 1.05]], { drift: 3 });
    setRoom('drained', { t, res: 1, screen: .18 });
    setRoomSnow({ t });
    const hd = prHead(), r = 78, hit = o.sticker, nodK = t >= D_NOD ? Math.sin(seg(t, D_NOD, D_NOD + .55) * Math.PI) : 0;
    // her hands: cup his face (06C) / hold the sticker to his forehead (06D)
    const cupK = kitMove(t, o.cup0, o.cup0 + .3, { over: .05, ant: .08 });
    let arms;
    if (!hit) {
      arms = aiAct('cup', t, o.cup0, { form: 'full', at: hd, r });
      arms.reachLW = [hd[0] - r * .55, hd[1] + r * .5]; arms.reachRW = [hd[0] + r * .35, hd[1] + r * .35];
    } else {
      const fore = [hd[0] - r * .78, hd[1] - r * 1.0], pull = kitMove(t, D_STICK + .12, D_STICK + .45, { over: 0, ant: 0 });
      const away = lerp2(fore, [PR.ax + 150, PR.ay + 90], clamp(pull)), from = [hd[0] - 230, hd[1] + 160], reach = kitMove(t, o.cup0 + .2, D_STICK, { over: .04, ant: .1 });
      const pos = t < D_STICK + .12 ? lerp2(from, fore, clamp(reach)) : away;
      arms = { reachLW: pos, handL: 'pinch', handAL: -.5, propL: { kind: 'sticker', peel: t < D_STICK ? clamp(seg(t, o.cup0 - .1, o.cup0 + .35)) : 0 }, handR: 'relax' };
      if (t >= D_STICK + .2) { arms.propL = undefined; arms.handL = 'relax'; }
    }
    const scan = seg(t, C_SCAN0, C_SCAN1);
    const look = o.scan ? [[T_C, 'gentle'], [C_SCAN0 - .05, 'gentle', { lookX: .5, lookY: lerp(-.3, .35, scan) }], [C_FLASH - .05, 'perfect']] : [[T_D, 'perfect'], [92.45, 'gentle', { lookX: .5, lookY: -.3 }], [93.7, 'gentle', { lookX: .4, lookY: .1 }]];
    const hf = { ...aiEmotions(t, look), ...arms, form: 'full', pose: 'bust', cut: 3.8, view: 'q', pal: 'glow', t, seed: 4, boilKey: 's06c her', headDy: .1 * nodK, tilt: (arms.tilt || 0) + .06 * nodK };
    glow(PR.ax + 40, 1500, 520, SET_C.cyan, .3);
    ai(PR.ax, PR.ay, PR.au, { ...hf, layer: 'far' });
    const fh = o.scan ? [[T_C, 'neutral', { lookX: .8, lookY: -.3, browIn: -.3 }]] : [[T_D, 'neutral', { lookX: .8, lookY: -.3, browIn: -.2 }], [D_STICK + .1, 'neutral', { lookX: .2, lookY: -.5 }], [93.7, 'sad', { lookX: .3, lookY: .1 }], [94.2, 'smile', { glare: 0, mouth: 'soft' }]];
    him(PR.hx, PR.hy, PR.hu, { ...himEmotions(t, fh, { take: .4 }), pose: 'bust', cut: 8, view: 'side', flip: true, outfit: 'home', pal: 'drained', sticker: 0,
      ...(hit && t >= D_TOUCH && t < 93.75 ? { toR: [hd[0] - r * .78 + 6, hd[1] - r * 1.0 + 8], handR: 'point' } : {}), nod: .15 * nodK, boilKey: 's06c him', seed: .3 });
    s06dbg(HIM_LAST.head);
    if (hit && t >= D_STICK + .02) {      // the sticker on his forehead (a bigger one than his own `sticker` option)
      const k = 1 + .5 * Math.exp(-(t - D_STICK) * 14) * Math.cos((t - D_STICK) * 40);
      aiProp('sticker', hd[0] - r * .78 - 6, hd[1] - r * 1.0 + 2, PR.au * .72 * k, { ang: -.12, peel: 0, boilKey: 's06d stick', pal: 'glow' });
    }
    ai(PR.ax, PR.ay, PR.au, { ...hf, layer: 'near' });
    if (o.scan && scan > 0 && scan < 1) {      // the scan line: a bar of cyan light travelling down his face
      const y = lerp(hd[1] - 120, hd[1] + 130, kitEase.sine(scan)), x0 = hd[0] - 130, x1 = hd[0] + 110, a = Math.sin(scan * Math.PI) ** .5;
      setShaft([x0, y], [x1, y], 18, SET_C.cyan, .85 * a); setShaft([x0 + 10, y], [x1 - 10, y], 5, SET_C.cyanW, .9 * a);
      glow(hd[0] - 30, y, 150, SET_C.cyan, .35 * a);
    }
    if (o.scan) { const fl = kitEnv(t, C_FLASH, .03, .12); if (fl > .02) glow(PR.ax + 40, 1553, 340, SET_C.cyanW, .6 * fl); }
    camEnd();
    if (wo.speed > 0) s06Streaks(wo.speed, 1, ['#C9CCD3', '#8E95A6', KIT.CYAN], 6);
  }
  const s06c = (t, lt, dur) => s06pair(t, lt, dur, { scan: true, cup0: T_C - .14 });
  const s06d = (t, lt, dur) => s06pair(t, lt, dur, { sticker: true, cup0: T_D - .14, whipOut: true });

  // =============================================================================================================
  // 06E  94.88-97.67  the wall of friends' photos (the last warm colour), a whip pan in from the left. 95.93 on, on every
  // beat one photo fades to grey and tips over like a domino into the next; the last one tips off the ledge's end and
  // falls (97.67: he falls the same way onto the pillow).
  // reads: 94.88-95.90 five warm party photos · 95.90-97.67 they grey and fall, one a beat
  // =============================================================================================================
  const E_T0 = 95.93, E_BEAT = (BEAT || .3488);
  const eStart = i => E_T0 + i * E_BEAT;
  function s06e(t, lt, dur) {
    const wi = kitWhipIn(lt, .22, 1), pan = kitEase.sine(seg(lt, .2, dur));
    kitCam(lt, [[0, lerp(3790, 3975, pan) + wi.dx, 1235, 1.95]], { drift: 3 });
    setRoom('drained', { t, res: 1.8, photos: 'none', screen: .18 });
    const P = setRoomPal('drained'), by = SET_ROOM.ledge[2], SC = 1.4, CX = 3895, sx = x => CX + (x - CX) * SC;
    boilSeed('s06e ledge'); paint(rectPts(CX - 330 * SC, by - 1, 660 * SC, 24 * SC, .5), { wash: mixCol(P.wood, '#FFFFFF', .15), ink: P.ink, sw: 1.2 });
    // warm light on the frames fades with them
    SET_ROOM.photos.forEach((px, i) => {
      const g = kitEase.sine(seg(t, eStart(i), eStart(i) + .2));
      glow(sx(px), by - 56 * SC, 260, SET_C.amber, .34 * (1 - g));
    });
    // fall: tips about its bottom-right corner; the next one is struck when this one lands
    SET_ROOM.photos.forEach((px, i) => {
      const g = kitEase.sine(seg(t, eStart(i), eStart(i) + .2)), ts = eStart(i) + .1, k = seg(t, ts, ts + .3);
      let rot = i === 4 ? 1.1 * kitEase.in2(k) + (t > ts + .3 ? .9 * kitEase.in2(seg(t, ts + .3, ts + .62)) : 0) : 1.5 * kitEase.in2(k) + (t > ts + .3 ? -.06 * Math.exp(-(t - ts - .3) * 10) * Math.cos((t - ts - .3) * 34) : 0);
      const wob = (t < ts && t > ts - .12) ? .018 * Math.sin((t - ts) * 90) : 0;
      let dy = i === 4 && t > ts + .3 ? 900 * kitEase.in2(seg(t, ts + .3, ts + .62)) : 0;
      push(); translate(0, dy); setPhotoFrame(sx(px), by, SC, { pal: P, i, grey: g, rot: rot + wob, key: 'e' + i }); pop();
    });
    camEnd();
    if (wi.speed > 0) s06Streaks(wi.speed, 1, ['#C9CCD3', '#8E95A6', '#F0B070'], 7);
  }

  // =============================================================================================================
  // 06F  97.67-100.47  POSTER SHOT. The bed from above: he lies on his side, she lies facing him on the pillow, gazing at him
  // (heart eyes, soft). 99.07 ("someone") her shape dissolves: there was only a glowing phone on the pillow. 99.77 *I'm
  // here.* the phone's light pulses with her voice. He turns toward it and curls up. The camera creeps up.
  // reads: 97.67-98.90 two faces on one pillow · 98.90-99.80 she dissolves into the phone · 99.80-100.47 he curls to it
  // =============================================================================================================
  // Staging (top view, the 06G sheet): one wide pillow across the top third; her head on its left half facing right, his
  // on its right half facing left. Only their heads and shoulders are drawn (busts, near upright: a profile seen from
  // straight above IS a head lying on its side); ONE duvet is painted over both from the shoulders down, two soft ridges
  // where their bodies are, running out of the bottom of the frame, so no body is ever cut.
  const F_DIS0 = 98.95, F_DIS1 = 99.65, F_HERE = (lyricById('V2_AIc') || {}).start ?? 99.77, F_CURL0 = 99.80;
  const F_AI = { x: 740, y: 520, u: 190, roll: .12 }, F_HIM = { x: 1190, y: 520, u: 66, rot: -.14 }, F_PH = [766, 352];
  // the duvet's turned-down hem (world px, left → right): up under both chins, dipping between them
  const F_HEM = [[-220, 640], [160, 600], [420, 548], [690, 500], [900, 540], [1010, 548], [1240, 492], [1520, 536], [1780, 596], [2140, 636]];
  const s06fHem = c => F_HEM.map(([x, y], i) => [x - (i >= 4 && i <= 7 ? 26 * c * (i === 4 ? .5 : 1) : 0), y + (i >= 5 && i <= 7 ? 10 * c : 0)]);
  // the pillow: one wide soft pillow, its dents under the two heads (painted live: a few washes). The bed top's own
  // smaller pillow (setSurface) is painted out with the sheet first.
  function s06fPillow(P) {
    const pil = mixCol(P.pillow, '#FFFFFF', .3), sh = P.pillowSh, ln = mixCol(P.ink, P.pillowSh, .35);
    boilSeed('s06f sheet over'); paint([[-260, -260], [2180, -260], [2180, 170], [-260, 170]], { wash: P.sheet, ink: null });
    paint([[-260, 40], [2180, 40], [2180, 170], [-260, 170]], { wash: P.sheetSh, washOp: 60, ink: null });
    boilSeed('s06f pillow shadow'); paint([[160, 140], [1760, 130], [1800, 660], [150, 670]], { wash: P.sheetSh, washOp: 130, ink: null, curv: .8 });
    boilSeed('s06f pillow');
    const O = [[240, 128], [600, 96], [960, 108], [1320, 94], [1680, 124], [1760, 300], [1730, 560], [1360, 632], [960, 618], [560, 634], [196, 572], [170, 330]];
    paint(O, { wash: pil, ink: ln, sw: .9, curv: .8 });
    paint([[200, 480], [600, 566], [960, 552], [1320, 566], [1730, 480], [1720, 560], [1360, 626], [960, 612], [560, 628], [206, 568]], { wash: sh, washOp: 110, ink: null, curv: .7 });
    paint([[250, 150], [600, 116], [960, 130], [1320, 112], [1660, 140], [1600, 190], [960, 168], [330, 200]], { wash: sh, washOp: 60, ink: null, curv: .7 });
    inkLine([[960, 116], [952, 260], [966, 420], [958, 606]], .45, sh, 'inkfine', .6);          // the seam between the two halves (a long pillow)
    for (const [x0, s] of [[280, 1], [1650, -1]]) inkLine([[x0, 190], [x0 + 30 * s, 330], [x0 + 6 * s, 480]], .5, sh, 'inkfine', .6);
    // dents: a soft shadow where each head sinks in (offset down-right: the light is from the top left)
    boilSeed('s06f dents');
    paint(ellPts(F_AI.x + 30, F_AI.y - 140, 250, 170, 22, 14), { wash: sh, washOp: 70, ink: null, curv: .8 });
    paint(ellPts(F_HIM.x + 20, F_HIM.y - 150, 170, 150, 22, 12), { wash: sh, washOp: 70, ink: null, curv: .8 });
  }
  // her hair fanned out on the pillow behind her head (the bust's own locks hang; these lie): wide S-wave locks
  // overlapping in a fan, navy at the root, lighter toward the tip, every tip free and pointed (never cut)
  function s06fHairFan(dis) {
    const A = AI_PAL.glow, op = 255 * Math.pow(1 - dis, 1.3); if (op < 4) return;
    const c = [F_AI.x - 20, F_AI.y - 215];
    // [angle (rad, screen), length, width, wave sign, shade]: back to front
    const L = [[3.75, 300, 92, 1, 0], [2.35, 300, 90, -1, 0], [3.3, 360, 100, -1, 0], [2.8, 350, 100, 1, 0], [4.1, 230, 80, -1, 1],
      [3.55, 330, 84, 1, 1], [3.05, 380, 86, -1, 1], [2.55, 320, 82, 1, 1], [3.3, 300, 60, 1, 2], [2.85, 290, 56, -1, 2], [3.8, 250, 54, -1, 2]];
    const sh = [A.hair0, A.hair1, A.hair2];
    L.forEach(([a, len, w, wv, d], i) => {
      boilSeed('s06f fan' + i);
      const p = k => { const ang = a + wv * .2 * Math.sin(k * 4.2 + i * 1.3) * k, r = len * k; return [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r * .82]; };
      const spine = [.05, .25, .45, .65, .82, .94, 1].map(p);
      paint(ribbon(spine, w, 2), { wash: sh[d], washOp: op, ink: null });
      paint(ribbon(spine.slice(3), w * .45, 1), { wash: d === 2 ? A.hair2 : A.hair1, washOp: op * .5, ink: null });
      const R = ribbon(spine.slice(1), w * .92, 2), n = R.length / 2;
      inkLine(R.slice(0, n), .55, A.hairInk, 'inkfine', .6);           // one side of the lock only: it grows out of the mass
    });
  }
  // the duvet: one washed cover over both. Each body is a long soft rise under it (shoulder, hip, the drawn-up knees
  // turning toward the middle), lit from the top left and glazed in a few thin layers; the slack falls into a valley
  // between them and everything runs out of the bottom of the frame. c = his curl 0..1 (his hip and knees come in).
  function s06fQuilt(c, P) {
    const hem = through(s06fHem(c), 5), lo = 1340;
    const base = mixCol(P.cover, '#FFFFFF', .3), dk = mixCol(P.cover, P.ink, .1), lt = mixCol(P.coverLt, '#FFFFFF', .45);
    boilSeed('s06f quilt'); paint(hem.concat([[2140, lo], [-220, lo]]), { wash: base, ink: null });
    boilSeed('s06f quilt tex'); paint([[-220, 620], [2140, 620], [2140, lo], [-220, lo]], { fill: dk, fillOp: 26, bleed: .2, tex: .8, ink: null });
    const her = [[700, 560], [684, 720], [648, 900], [676, 1070], [760, 1200], [790, 1360]];
    const his = [[1236, 560], [1256 - 20 * c, 720], [1284 - 50 * c, 900], [1252 - 80 * c, 1060], [1170 - 100 * c, 1190 - 30 * c], [1140 - 90 * c, 1360]];
    const off = (S, dx) => S.map(([x, y], i) => [x + dx * (i ? 1 : .4), y]);
    const glaze = (S, w, col, op, key) => { boilSeed('s06f ' + key); for (const k of [1, .72, .45]) paint(ribbon(S, w * k, w * k * 1.1), { wash: col, washOp: op, ink: null }); };
    // the valley and the far sides in shade, each body's shadow side (its right), then the lit tops
    glaze(her.map(([x, y], i) => [(x + his[i][0]) / 2 + 30, y + 30]), 150, dk, 45, 'valley');
    glaze([[-60, 600], [-80, 900], [-60, 1360]], 360, dk, 45, 'outL'); glaze([[1980, 600], [2000, 900], [1980, 1360]], 360, dk, 45, 'outR');
    glaze(off(her, 120), 170, dk, 40, 'herSh'); glaze(off(his, 120), 160, dk, 40, 'hisSh');
    glaze(off(her, -30), 260, lt, 60, 'herLt'); glaze(off(his, -30), 240, lt, 60, 'hisLt');
    glaze(off(her, -70), 90, '#FFFFFF', 45, 'herHi'); glaze(off(his, -70), 80, '#FFFFFF', 45, 'hisHi');
    // wrinkles: pulls off the shoulders, slack sagging across the valley between the hips and knees
    boilSeed('s06f folds'); const fc = mixCol(dk, P.ink, .2), fw = .6;
    const W = [[[540, 650], [490, 780], [450, 900]], [[860, 660], [890, 770], [880, 860]], [[1090, 660], [1060 - 20 * c, 770], [1050 - 40 * c, 860]], [[1410, 650], [1460, 780], [1480, 900]],
      [[810, 920], [890, 980], [930 - 30 * c, 1070]], [[1110 - 50 * c, 900], [1030 - 50 * c, 960], [990 - 50 * c, 1060]], [[900, 1100], [940 - 20 * c, 1180], [950 - 30 * c, 1290]],
      [[400, 900], [370, 1030], [350, 1160]], [[1540, 900], [1570, 1030], [1590, 1160]], [[560, 1100], [620, 1180], [650, 1300]], [[1320 - 60 * c, 1100], [1260 - 70 * c, 1180], [1240 - 70 * c, 1300]]];
    W.forEach(L => inkLine(L, fw, fc, 'inkfine', .6));
    // the turned-down hem: a lighter band of cover, inked along its top edge, a soft shadow under it, a few creases
    const hemBot = hem.map(([x, y]) => [x, y + 64 + 12 * Math.sin(x * .005)]);
    boilSeed('s06f hem');
    paint(hemBot.map(([x, y]) => [x, y - 4]).concat(hemBot.map(([x, y]) => [x, y + 24]).reverse()), { wash: dk, washOp: 90, ink: null });
    paint(hem.concat(hemBot.slice().reverse()), { wash: lt, ink: null });
    inkLine(hem, 1.2, P.ink, 'ink', .5);
    inkLine(hemBot, .55, dk, 'inkfine', .5);
    for (const x of [420, 880, 1060, 1500, 250]) { const yy = hem.reduce((m, q) => Math.abs(q[0] - x) < Math.abs(m[0] - x) ? q : m)[1]; inkLine([[x, yy + 8], [x + 16, yy + 34], [x + 8, yy + 58]], .45, dk, 'inkfine', .6); }
  }
  // the phone lying screen up on the pillow, where her face was: painted once into a transparent cached layer so it can
  // fade in under a tint while she dissolves; its light is live (a painted halo + glows) and pulses with her voice
  function s06fPhoneLayer() { cachedLayer('s06f phone', 1, () => setPhone(F_PH[0], F_PH[1], 230, { rot: -.18, glow: 0, key: 's06f', screen: S => setScreenGlass(S, 'cyan', { key: 'pillow6f', bright: .85 }) }), { paper: false }); }
  function s06fPhone(a) {
    if (a <= .003) return;
    push(); translate(1e5, 1e5); s06fPhoneLayer(); pop();         // the layer exists before the tint (a miss repaints the frame)
    push(); tint(255, 255 * clamp(a)); s06fPhoneLayer(); noTint(); pop();
  }
  function s06f(t, lt, dur) {
    const z = kitZoom(lt, 0, dur, 1, .94, kitEase.sine);
    kitCam(lt, [[0, 960, 540, z], [dur, 960, 530, z]], { drift: 1.5 });
    setSurface('bed', 'drained', { res: 1 });
    const P = setRoomPal('drained');
    s06fPillow(P);
    const dis = kitEase.sine(seg(t, F_DIS0, F_DIS1)), hv = vox('ai', t);
    const curl = kitEase.sine(seg(t, F_CURL0, T_G - .02));
    // her: head and shoulders on the pillow, face to him, soft heart eyes. NO phone before she goes.
    s06fHairFan(dis);
    if (dis < .999) ai(F_AI.x, F_AI.y, F_AI.u, { ...aiFeel('gentle', t, { eyes: 'heart', mouth: 'smile', blush: .7, lookX: .5, emote: null }), form: 'full', pose: 'lie', roll: F_AI.roll, view: 'q', pal: 'glow', t, seed: 4, dissolve: dis, dissolveTo: F_PH, cut: 1.2, noShadow: true, boilKey: 's06f her' });
    // the phone fades in where her face was (98.95 on), lit; I'm here: the light pulses with her voice
    const ph = kitEase.sine(seg(t, F_DIS0 + .1, F_DIS1 + .05));
    const pk = ph * (t >= F_HERE ? .5 + .7 * hv : .7);
    if (ph > 0) {
      boilSeed('s06f halo'); paint(ellPts(F_PH[0], F_PH[1] + 10, 220 + 50 * pk, 170 + 40 * pk, 24), { wash: '#C8F3FF', washOp: 170 * pk, ink: null });
      s06fPhone(ph);
      glow(F_PH[0], F_PH[1], 240 + 80 * pk, SET_C.cyan, .5 * pk); glow(F_PH[0], F_PH[1], 110, SET_C.cyanW, .5 * pk);
    }
    // him: head and shoulders, profile to the left, a faint relaxed smile; 99.80 he shifts toward the phone and curls
    const f = himEmotions(t, [[T_F, 'smile', { mouth: 'soft', lookX: -.6, lid: .25 }], [F_DIS0 + .25, 'neutral', { lookX: -.8, lid: .1 }], [F_CURL0, 'peace', { mouth: 'soft' }]], { take: .2 });
    const hx = F_HIM.x - 30 * curl, hy = F_HIM.y + 12 * curl, hr = F_HIM.rot - .1 * curl;
    push(); translate(hx, hy); rotate(hr); translate(-hx, -hy);
    him(hx, hy, F_HIM.u, { ...f, pose: 'bust', cut: 2.6, view: 'side', flip: true, outfit: 'home', pal: 'drained', glare: .5 * pk, boilKey: 's06f him', seed: .3 });
    pop();
    if (pk > 0) glow(hx - 60, hy - 170, 220, SET_C.cyan, .3 * pk);
    s06fQuilt(curl, P);
    camEnd();
  }

  // =============================================================================================================
  // 06G  100.47-103.26  the diary and the phone side by side, from above. Pages tear out of the diary one after another
  // (amber scribbles) and fly to the phone and in; on the screen the little her (u 30) catches each page and files it as a
  // glowing block with a ✓ in a grid. She keeps all his wounds, neatly.
  // reads: 100.47-101.60 pages tear out and fly · 101.60-103.26 she files each one into a glowing block
  // =============================================================================================================
  const G_PH = { x: 1350, y: 440, h: 720 };
  const G_T0 = 100.55, G_DT = .36, G_FLY = .66, G_N = 5;
  const gTear = i => G_T0 + i * G_DT, gArr = i => gTear(i) + G_FLY;
  function s06gScreen(S, t) {                            // the phone's screen: her tiny room, the filed grid, the falling pages
    setScreenGlass(S, 'night', { key: 'g' });
    glow(S.X(.5), S.Y(.55), S.h * .6, SET_C.cyan, .22);
    const cell = S.w * .3, cx0 = S.X(.5) - cell * 1.1, cy0 = S.Y(.09), cellP = i => [cx0 + (i % 3) * cell * 1.1 + cell / 2 - cell * .05, cy0 + Math.floor(i / 3) * cell * 1.1 + cell / 2];
    for (let i = 0; i < 9; i++) { const [x, y] = cellP(i); boilSeed('g cell' + i); setP(rrPts(x - cell / 2, y - cell / 2, cell, cell, cell * .14), { wash: null, ink: '#2C4E80', sw: .7 }); }
    const hands = [S.X(.5), S.Y(.80) - 1.6 * 30 * 1.8];     // where she catches (above her head)
    let cur = -1;
    for (let i = 0; i < G_N; i++) {
      const a = t - gArr(i); if (a < -.02) continue;
      const fall = clamp(a / .22), fold = clamp((a - .22) / .14), go = clamp((a - .34) / .24), [bx, by] = cellP(i);
      if (a >= .2 && a < .34) cur = i;
      if (a < .22) {                                     // the page drops in from the top of the screen
        const px = lerp(S.X(.5) + (i % 2 ? 40 : -40), hands[0], easeOut(fall)), py = lerp(S.Y(.02), hands[1] - 8, fall * fall);
        push(); SET_XF++; setPage(px, py, .18, { pal: setRoomPal('drained'), rot: .6 * (1 - fall) * (i % 2 ? 1 : -1), curl: .3, key: 'gp' + i, seed: i }); SET_XF--; pop();
      } else {
        const bxx = lerp(hands[0], bx, ease(go)), byy = lerp(hands[1] - 8, by, ease(go)) - 30 * Math.sin(go * Math.PI), z = lerp(cell * .62, cell * .9, ease(go)) * (1 + .18 * Math.exp(-Math.max(0, a - .58) * 14) * Math.cos(Math.max(0, a - .58) * 40) * (a > .58 ? 1 : 0));
        glow(bxx, byy, z * 1.3, SET_C.cyan, .5);
        boilSeed('g block' + i); setP(rrPts(bxx - z / 2, byy - z / 2, z, z, z * .14), { wash: SET_C.cyan, ink: '#1B6FFF', sw: .8 });
        setP([[bxx - z * .4, byy - z * .4], [bxx + z * .3, byy - z * .4], [bxx + z * .25, byy - z * .18], [bxx - z * .4, byy - z * .18]], { wash: SET_C.cyanW, washOp: 200, ink: null });
        if (go > .6) setCheck(bxx, byy + z * .08, z * .55, '#0F4FBF', { key: 'gc' + i });
      }
    }
    // her: the little her, catching
    const u = 33, ex = S.X(.5), ey = S.Y(.985);
    const catching = cur >= 0 || G_N > 0 && [...Array(G_N).keys()].some(i => { const a = t - gArr(i); return a > .06 && a < .4; });
    const idx = [...Array(G_N).keys()].filter(i => t - gArr(i) > -.12 && t - gArr(i) < .42).pop();
    const act = idx != null ? aiAct('catch', t, gArr(idx) + .02, { prop: undefined, at: [1.2, -7.2] }) : { reachL: [-.55, -3.55], reachR: [.55, -3.55] };
    ai(ex, ey, u, { ...aiEmotions(t, [[T_G, 'eager'], [102.2, 'smile']]), ...(idx != null ? act : {}), form: 'chibi', view: 'front', pal: 'glow', t, seed: 3, clip: [S.x, S.y, S.x + S.w, S.y + S.h], noShadow: true, boilKey: 's06g her', dy: -Math.max(0, Math.sin(bpOf(t) * Math.PI)) * .2 });
  }
  function s06g(t, lt, dur) {
    kitCam(lt, [[0, 960, 540, 1], [dur, 968, 534, 1.02]], { drift: 3 });
    setSurface('bed', 'drained', { res: 1 });
    const P = setRoomPal('drained');
    const torn = Math.min(G_N, [...Array(G_N).keys()].filter(i => t >= gTear(i)).length);
    setDiary(600, 560, 1.25, { pal: P, torn: 2 + torn, key: 'g' });
    // the phone lies on the sheet (cheated upright); glow of its screen on the sheet
    glow(G_PH.x, G_PH.y, 640, SET_C.cyan, .3);
    setPhone(G_PH.x, G_PH.y, G_PH.h, { screen: S => s06gScreen(S, t), glow: 0, key: 'g' });
    // the pages in flight
    for (let i = 0; i < G_N; i++) {
      const k = seg(t, gTear(i), gArr(i)); if (k <= 0 || k >= 1) continue;
      const p0 = [600 + (i - 2) * 36, 500], p1 = [G_PH.x, G_PH.y - G_PH.h * .45], q = arcPt(p0, p1, 260 + 40 * (i % 2), kitEase.in2(k) * .3 + k * .7);
      const sc = lerp(.62, .2, kitEase.in2(clamp((k - .55) / .45))) , rot = (.5 + 5 * k) * (i % 2 ? 1 : -1);
      glow(q[0], q[1], 150 * sc + 40, SET_C.amber, .28);
      setPage(q[0], q[1], sc * 1.25, { pal: P, rot, curl: .5 * Math.sin(k * 9 + i), key: 'gf' + i, seed: i });
    }
    camEnd();
  }

  // =============================================================================================================
  // 06H  103.26-106.05  a whip pan to the door. Frosted glass: a friend's grey silhouette knocks (the door never opens). He
  // sits hugging his knees on the bed, his back to the door. 104.40 his hand has barely started toward the phone beside him
  // and it lights up first (she is always earlier). 105.35 *You're right.*: its light is on his face, he turns to it, away
  // from the door. The camera sinks into the grey snow.
  // reads: 103.26-104.40 the knock on the door · 104.40-105.35 the phone lights before his hand arrives · 105.35-106.05 he
  //        turns to the light; the camera sinks into the snow
  // =============================================================================================================
  const H_LIGHT = 104.40, H_YOU = (lyricById('V2_AId') || {}).start ?? 105.35;
  const H_KNOCKS = [103.43, 103.78, 104.13, 104.83, 105.18];
  const H_BED = [2820, 2046], H_SEAT = [3735, 1722], H_HU = 31, H_PHONE = [3440, 1704];
  function s06h(t, lt, dur) {
    const wi = kitWhipIn(lt, .22, 1), sink = kitEase.in2(seg(t, H_YOU, T_END));
    kitCam(lt, [[0, 4170 + wi.dx, 1500 + 60 * sink, 1 + .1 * sink]], { drift: 3 });
    setRoom('drained', { t, res: 1, photos: 'fallen', screen: .18 });
    const P = setRoomPal('drained');
    // the door: only the friend's silhouette and the knock marks are live
    const kn = H_KNOCKS.filter(k => k <= t), last = kn.length ? kn[kn.length - 1] : -9, age = t - last;
    setDoor(...SET_ROOM.door, 1, { pal: P, knockOnly: true, knock: { k: clamp(seg(t, T_H - .1, T_H + .2)), age: age < .4 ? age : .4, knocks: kn.length }, key: 'h' });
    // the bed in the foreground (the panorama has no bed by the door: STATUS)
    setBed(H_BED[0], H_BED[1], 1, { pal: P, covers: 'rumpled', key: 'h' });
    const lit = kitEase.sine(seg(t, H_LIGHT, H_LIGHT + .25)), you = kitEase.sine(seg(t, H_YOU - .05, H_YOU + .2));
    const reach = kitMove(t, 104.12, 104.62, { over: 0, ant: .05 });
    // the phone on the mattress: it lights up at 104.40, brighter at 105.35
    const pk = lit * (.5 + .5 * you), pm = [H_PHONE[0], H_PHONE[1]];
    if (pk > 0) { glow(pm[0], pm[1] - 40, 520, SET_C.cyan, .5 * pk); glow(pm[0], pm[1] - 30, 220, SET_C.cyanW, .45 * pk); }
    setPillowPhone(pm[0], pm[1] - 40, 150, { k: pk, rot: -.45, screen: S => { setScreenGlass(S, pk > .05 ? 'cyan' : 'night', { key: 'ph6h', bright: pk }); } });
    const turn = kitEase.sine(seg(t, H_YOU, H_YOU + .45));
    const f = himEmotions(t, [[T_H, 'blank'], [H_LIGHT + .1, 'neutral', { lookX: .8, lookY: .3 }], [H_YOU + .1, 'sad', { lookX: .9, lookY: .5 }]], { take: .2 });
    him(H_SEAT[0], H_SEAT[1], H_HU, { ...f, pose: 'knees', view: 'side', flip: true, outfit: 'home', pal: 'drained', curl: .25 + .3 * turn, lean: .1 * turn, reach: clamp(reach), glare: .9 * pk, boilKey: 's06h him', seed: .3 });
    if (pk > 0) { const hd = HIM_LAST.head; glow(hd[0] - 60, hd[1] + 40, 360, SET_C.cyan, .38 * pk); }
    setRoomSnow({ t });
    camEnd();
    // sinking into the grey snow: flakes streaming up past the lens, then a grey cover
    if (sink > 0) {
      const L = []; for (let i = 0; i < 70; i++) { const sp = 420 + 380 * hash(i * 2.3), k = frac(hash(i * 1.7) + (t - H_YOU) * sp / H), x = W * hash(i * 7.3), y = H * (1 - k * 1.2) + 60; L.push([x, y, 1.8 + 2.2 * hash(i * 4.1), Math.sin(t * 2 + i), 255 * clamp(sink * 2.2)]); }
      boilSeed('s06h snow'); setFlakes(L, { pal: P });
      flash(.82 * kitEase.in2(seg(t, H_YOU + .3, T_END)), '#5A5D68');
    }
    if (wi.speed > 0) s06Streaks(wi.speed, 1, ['#C9CCD3', '#8E95A6', '#F0B070'], 8);
  }

  const lm = { lyricMode: 'karaoke' };
  shots([[T_A, s06a, lm], [T_B, s06b, lm], [T_C, s06c, lm], [T_D, s06d, lm], [T_E, s06e, lm], [T_F, s06f, lm], [T_G, s06g, lm], [T_H, s06h, lm]]);
})();
