// S03 PRE-CHORUS 1 "THE DOTS" (44.65-55.81, b33-40): 03A three dots → his held breath → the fall · 03B the stethoscope · 03C the spinner.
// STORYBOARD §6. Shots are pure functions of t: s03a(t, lt, dur) ...
(() => {
  const SEC = sectionById('S03');
  const T_A = SEC.start, T_B = kitCut(37, 1, 50.23), T_C = kitCut(39, 1, 53.02), T_END = SEC.end;
  const sylT = (id, i, fb) => { const l = lyricById(id); return l && l.syllables && l.syllables[i] ? l.syllables[i].start : fb; };
  const T_HOLD = sylT('P1_1', 5, 45.82), T_DEATH = 49.01, FEVER = SET_C.fever;
  const DOT_COL = SET_C.cyan;

  // =============================================================================================================
  // 03A  44.65-50.23  one take. (1) the three dots, huge, taking turns on the eighth notes; (2) the camera slides to his face, lit by them:
  // he breathes in ("I hold") and holds it, cheeks puffed, still, only the light on him flickers with the dots; (3) pull back: he sits on the
  // bed's edge holding the phone; the dots (a floating glyph over it) slow down and stop (48.50-49.01, the light on his face stops);
  // 49.01 "death": they turn fever red, red floods his face, and he falls slowly back into the bed (the phone slides to his chest).
  // reads: 44.65-45.70 the dots · 45.70-47.44 his face, the held breath · 47.44-48.50 pull back: he sits with the phone ·
  //        48.50-49.01 the dots slow and stop · 49.01-50.23 they turn red, he falls
  // =============================================================================================================
  const A_PAN0 = 45.30, A_PAN1 = 45.86, A_XF0 = 47.18, A_XF1 = 47.48, A_PULL0 = 47.44, A_PULL1 = 48.60, A_SLOW0 = 48.40, A_STOP = 48.86;
  const dotWave = (t) => t < A_SLOW0 ? 1 : 1 - kitEase.sine(seg(t, A_SLOW0, A_STOP));            // how much they take turns
  const faceLight = (t) => {                                                                     // the dots' light on his face: follows the dots, then dies, then goes red
    const w = .5 + .5 * Math.cos((bpOf(t) * 2 / 3) * TAU);
    return t < A_SLOW0 ? .35 + .3 * w : lerp(.35 + .3 * w, .2, kitEase.sine(seg(t, A_SLOW0, A_STOP)));
  };
  function s03Dots(x, y, r, t, o = {}) {                                                         // the glyph: the three capsule dots, instant colour change at "death"
    const dead = t >= T_DEATH, col = dead ? FEVER : DOT_COL, wv = dead ? 0 : dotWave(t);
    setDots(x, y, r, { t, wave: wv, col, glow: o.glow ?? .9, still: false, key: 's03' });
    if (dead) { const k = kitEnv(t, T_DEATH, .05, .5); glow(x, y, r * 9, FEVER, .5 * k + .15); }
  }
  // the bed's foot end: he sits on the mattress at the end of it facing right (the bed lies behind him, to his left), the window and the
  // pillow behind. (A mirrored room would put him facing the screen at the left, but the cached tiles do not draw under a flip.)
  const E_A = [432, 2046], E_U = 26;
  function s03a(t, lt, dur) {
    const pan = kitEase.sine(seg(t, A_PAN0, A_PAN1));
    const drawGlass = (ox) => {                                                                  // plane 1: the dots, macro (on the right)
      push(); translate(ox, 0);
      boilSeed('s03a glass'); paint(rectPts(-80, -80, W + 160, H + 160), { wash: '#0D1530', ink: null });
      boilSeed('s03a bloom'); paint(ellPts(W / 2, H * .5, W * .45, H * .42, 28, 24), { fill: '#2B4A8A', fillOp: 90, bleed: .3, tex: .5, ink: null });
      glow(W / 2, H / 2, 900, '#1B6FFF', .35);
      s03Dots(W / 2, H / 2, 92, t, { glow: .9 });
      pop();
    };
    const drawFace = (ox) => {                                                                   // plane 2: his face, lit by the glyph just off the right edge
      push(); translate(ox, 0);
      boilSeed('s03a void'); paint(rectPts(-80, -80, W + 160, H + 160), { wash: '#070B16', ink: null });
      const fl = faceLight(t);
      glow(-140, 450, 1300, DOT_COL, .8 * fl); glow(40, 520, 640, DOT_COL, .75 * fl);
      const f = himEmotions(t, [[T_A, 'focused'], [T_HOLD - .08, 'hold']], { take: .3 });
      him(900, 740, 96, { ...f, pose: 'bust', view: 'side', flip: true, outfit: 'home', cut: 9, boilKey: 's03a him', seed: .3, glare: .35 + .35 * fl, breath: kitEase.sine(seg(t, 45.45, T_HOLD)) * .8 });
      glow(680, 470, 700, DOT_COL, .6 * fl);                                                   // the light across his cheek
      pop();
    };
    const drawMedium = () => {
      const zk = kitEase.inOut3(seg(t, A_PULL0, A_PULL1)), z = lerp(1.62, 1.0, zk), cx = lerp(470, 700, zk), cy = lerp(1450, 1580, zk);
      kitCam(lt, [[0, cx, cy, z]], { drift: 2 });
      setRoom('night', { t, res: 1.6, lights: false, covers: 'rumpled' });
      setRoomLights('night', { t, screen: .9 });
      const fall = kitEase.in2(seg(t, T_DEATH + .05, T_DEATH + 1.18)) * (t >= T_DEATH ? 1 : 0), fl = faceLight(t);
      const f = himEmotions(t, [[T_A, 'hold'], [A_STOP, 'hold', { puff: .6 }], [T_DEATH + .15, 'blank']], { take: .5 });
      const dead = t >= T_DEATH, red = dead ? kitEnv(t, T_DEATH, .12, 1.4) : 0;
      glow(E_A[0] - 4 * E_U, E_A[1] - 21 * E_U, 520, DOT_COL, .5 * fl * (dead ? 0 : 1));
      him(E_A[0], E_A[1], E_U, { ...f, pose: 'edge', flip: true, outfit: 'home', seatH: 318 / E_U, fall, screen: dead ? 'amber' : 'cyan', glowK: dead ? 0 : .5, boilKey: 's03a him2', seed: .3, coverCol: setRoomPal('night').cover });
      if (!dead || fall < .35) s03Dots(E_A[0] - 5.3 * E_U, E_A[1] - 20.6 * E_U, 18 * (1 - .15 * fall), t, { glow: .9 });
      if (dead) { glow(E_A[0] - 3 * E_U, E_A[1] - 25 * E_U, 700 + 500 * red, FEVER, .55 * red + .1); glow(E_A[0] - 2 * E_U, E_A[1] - 22 * E_U, 300, FEVER, .45 * red); }
      camEnd();
    };
    if (t < A_XF0) {
      if (t < A_PAN1) { drawGlass(-W * pan); drawFace(W * (1 - pan)); }
      else drawFace(0);
    } else if (t < A_XF1) kitXfade(seg(t, A_XF0, A_XF1), () => drawFace(0), drawMedium);
    else drawMedium();
  }


  // =============================================================================================================
  // 03B  50.23-53.02  from above: he has landed on his back (a small bounce), the phone on his chest. The little her climbs out of the phone's
  // top edge (u 35), a light stethoscope round her neck; she steps onto his chest, puts the chest piece to his heart and listens, brow
  // furrowed ("Doctor, doctor, tell me why"). His heart light under the shirt is weak: it flickers on and goes dark again. Slow push to the chest.
  // reads: 50.23-50.90 the bounce · 50.90-51.90 she climbs out with the stethoscope · 51.90-53.02 she listens, frowns; the weak heart light
  // =============================================================================================================
  const L_P = [900, 620, 30];                                                  // the lying figure: hip x, y, u (head up, toward the pillow)
  const B_POP = 50.92, B_LISTEN = 51.92;
  function s03Lying(t, lt, extra = {}, lp = L_P) {                                       // him on his back, head up toward the pillow; contact points returned in the surface's coordinates
    const a = t - T_B, bounce = a < 0 ? 0 : Math.exp(-6.5 * a) * Math.max(0, Math.cos(15 * a)), sq = a < 0 ? 0 : .1 * Math.exp(-8 * a) * Math.cos(21 * a);
    const beat = kitEnv(t, 52.30, .02, .12) + kitEnv(t, 52.78, .02, .1);          // two feeble flickers
    const f = himEmotions(t, [[T_B - .4, 'blank', { lookY: -.6 }]], { take: .2 });
    const [hx, hy, u] = lp, th = Math.PI / 2, c = Math.cos(th), sn = Math.sin(th), W = q => q ? [hx - (q[1] - hy) * sn + (q[0] - hx) * c, hy + (q[0] - hx) * sn + (q[1] - hy) * c] : q;
    push(); translate(0, -bounce * u * 1.1); translate(hx, hy); rotate(th); translate(-hx, -hy);
    him(hx, hy, u, { ...f, pose: 'lie', rot: -Math.PI / 2, outfit: 'home', phone: 'chest', sq, heart: .08 + .38 * Math.min(1, beat) * (t >= B_LISTEN ? 1 : 0), heartCol: '#FF6F86', boilKey: 's03b him', seed: .6, ...extra });
    const P = { ...HIM_LAST };
    pop();
    const out = { heart: W(P.heart), screenC: W(P.screenC), screen: P.screen ? P.screen.map(W) : null, head: W(P.head) };
    out.dy = -bounce * u * 1.1;
    return out;
  }
  const ROLL = -Math.PI / 2;                                                   // the camera rolls a quarter turn: the pillow at the left, he lies across the frame head left
  function s03b(t, lt, dur) {
    const z = lerp(1.38, 1.55, kitEase.sine(seg(lt, .3, dur))), cx = lerp(1010, 1000, seg(lt, 0, dur)), cy = lerp(470, 500, seg(lt, 0, dur));
    kitCam(lt, [[0, cx, cy, z, ROLL]], { drift: 2 });
    s03BedTop(setRoomPal('dusk'), 900, 480, 1320, 540);
    const P = s03Lying(t, lt, { stetho: seg(t, B_LISTEN - .1, B_LISTEN + .3) }), heart = P.heart, ph = P.screenC;
    push(); resetMatrix(); translate(-W / 2, -H / 2); s03Dim(105); pop();
    // she stands upright on the screen: counter-rotate her round her feet. World offsets (dx, dy) become screen (dy, -dx).
    const HU = 33, AX1 = heart[0] + 18, AY1 = heart[1] + 70, popK = kitOver(seg(t, B_POP, B_POP + .3), 1.6), step = kitEase.sine(seg(t, B_POP + .55, B_POP + .95));
    if (t >= B_POP) {
      const AX = lerp(ph[0], AX1, step), AY = lerp(ph[1], AY1, step), u = HU * Math.min(1.05, popK), hop = 30 * Math.sin(step * Math.PI);
      const f = aiEmotions(t, [[B_POP, 'eager'], [B_LISTEN - .1, 'worried']], { take: .6 });
      const act = t < B_LISTEN ? {} : aiAct('stetho', t, B_LISTEN, { side: 'L', at: [Math.max(.8, (AY1 - heart[1]) / HU * -1 + 3.4), -1.0] });
      const ringK = seg(t, B_POP, B_POP + .35);
      if (ringK > 0 && ringK < 1) { const R = ellPts(ph[0], ph[1], 40 + 190 * ringK, 40 + 190 * ringK, 20); boilSeed('s03b burst'); inkLine(R.concat([R[0]]), 3.5 * (1 - ringK), SET_C.cyanW, 'ink', .4); }
      glow(ph[0], ph[1], 260 * (1 - .5 * seg(t, B_POP + .3, B_POP + .8)), SET_C.cyan, .8 * (1 - seg(t, B_POP + .3, B_POP + 1.1)) + .15);
      push(); translate(AX, AY); rotate(-ROLL); translate(0, -0); translate(-AX, -AY);
      ai(AX, AY + 0, u, { ...f, ...act, dy: -hop / HU, form: 'chibi', view: 'front', pal: 'glow', t, seed: 12, noShadow: false, boilKey: 's03b her' });
      pop();
    }
    const fl = kitEnv(t, 52.30, .02, .12) + kitEnv(t, 52.78, .02, .1);
    if (t >= B_LISTEN) glow(heart[0], heart[1], 120, '#FF6F86', .1 + .5 * Math.min(1, fl));
    camEnd();
  }

  // =============================================================================================================
  // 03C  53.02-55.81  his chest, extreme close-up. The heart's light has become a loading ring (a circle of dots) that turns and never arrives
  // (53.02-54.90). 54.90 the snare roll: the camera races back, the ring rises toward the top of the frame and flattens into the ellipse of the
  // lamp that 04A opens on (screen centre 960, 550); 55.47 a white flash covers the cut.
  // reads: 53.02-54.10 the heart becomes a spinner · 54.10-54.90 it turns, not going anywhere · 54.90-55.47 the pull back, the ring rises · 55.47-55.81 flash
  // =============================================================================================================
  const C_PULL0 = 54.90, C_FLASH = 55.47, C_LAMP = [960, 550];
  function s03Ring(x, y, rx, ry, t, o = {}) {                                  // a loading ring: 12 dots on an ellipse, one bright, chasing round
    const n = 14, spin = t * 1.6, col = o.col || SET_C.cyan, vis = o.vis ?? 1;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, br = Math.pow(frac(spin - i / n), 1.8), px = x + Math.cos(a) * rx, py = y + Math.sin(a) * ry, rr = Math.max(3, rx * .075 * (.55 + .55 * br)) * vis;
      boilSeed('s03c ring' + i); setP(ellPts(px, py, rr, rr * Math.max(.45, ry / Math.max(1, rx)), 10), { wash: mixCol(col, '#E8FDFF', .5 * br), washOp: 255 * (.35 + .65 * br) * vis, ink: null, line: true });
    }
    if (vis > .05) { const arc = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU; arc.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } boilSeed('s03c ringline'); inkLine(arc, 1.6, col, 'inkfine', .3); }
    glow(x, y, rx * 1.7 * vis, col, .5 * vis);
  }
  const s03Dim = op => { boilSeed('s03 dim'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#0A1030', washOp: op, ink: null }); };
  function s03c(t, lt, dur) {
    const pull = kitEase.expoIn(seg(t, C_PULL0, C_FLASH)), pushK = kitEase.sine(seg(lt, 0, .5));
    const u = lerp(lerp(30, 62, pushK), 28, pull), zoom = lerp(lerp(1.22, 1.9, pushK) * (1 + .03 * seg(lt, .5, 1.9)), 1.04, pull);
    const hip = [900, 620], HW = [hip[0] + 47 * u / 30, hip[1] - 219 * u / 30];            // the heart, from the lying figure's proportions
    const cx = lerp(HW[0] + 40 / zoom * 1.2, 960, pull), cy = lerp(HW[1] - 6, 540, pull), rot = ROLL - .1 * pull;
    const cam = kitCam(lt, [[0, cx, cy, zoom, rot]], { drift: pull < .01 ? 3 : 0 });
    s03BedTop(setRoomPal('dusk'), 900, 480, 1320, 540);
    const heartK = 1 - kitEase.sine(seg(t, T_C + .1, T_C + 1.0));
    const P = s03Lying(t, lt, { phone: false, heart: .3 * heartK, stetho: 0 }, [hip[0], hip[1], u]);
    push(); resetMatrix(); translate(-W / 2, -H / 2); s03Dim(150 * (1 - .6 * pull)); pop();
    camEnd();
    // the ring: grows out of the heart's light, turns, then flies up and flattens into the lamp's ellipse
    const hp = P.heart || HW, sp = toScreen(hp[0], hp[1], cam), k = seg(t, T_C + .2, T_C + .95);
    const rise = kitEase.in2(seg(t, C_PULL0, C_FLASH)), x = lerp(sp[0], C_LAMP[0], rise), y = lerp(sp[1], C_LAMP[1], rise);
    const r0 = 2.4 * u * zoom, rx = lerp(r0, 420, rise), ry = lerp(r0, 105, rise);
    s03Ring(x, y, rx, ry, t, { vis: kitEase.sine(k) });
    if (pull > .02) { boilSeed('s03c lines'); for (let i = 0; i < 22; i++) { const a = i / 22 * TAU + .1 * hash(i), r0l = 280 + 140 * hash(i * 2.1), r1 = r0l + 900 * pull * (.5 + hash(i)); inkLine([[W / 2 + Math.cos(a) * r0l, H / 2 + Math.sin(a) * r0l * .65], [W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1 * .65]], 1.2 + 3 * pull * hash(i + 4), i % 2 ? KIT.CYAN : KIT.CYANW, 'inkfine', 0); } }
    if (t > C_FLASH) kitFlash(kitEase.sine(seg(t, C_FLASH, T_END - .03)), KIT.CYANW, { x: C_LAMP[0], y: C_LAMP[1] });
  }


  // the bed from above, painted live in the (rolled) world: a washed sheet, one wide pillow under the head, and a duvet that rises in soft ridges
  // below `hem` (world y). hx = the head's x, px0/px1 the pillow's extent. Head up in the world = pillow at the left once the camera is rolled.
  function s03BedTop(P, hx, px0, px1, hem, o = {}) {
    const lt = mixCol(P.sheet, '#FFFFFF', .3), pil = mixCol(P.pillow, '#FFFFFF', .4), pl = mixCol(P.ink, P.pillowSh, .45), cv = o.cover || mixCol(P.cover, '#FFFFFF', .25), dk = mixCol(cv, P.ink, .22), cl = mixCol(P.coverLt, '#FFFFFF', .4);
    const cxm = (px0 + px1) / 2, x0 = px0 - 1400, x1 = px1 + 1400;
    boilSeed('s03bed  sheet'); paint(rectPts(x0, -900, x1 - x0, 3200), { wash: lt, ink: null });
    for (let i = 0; i < 6; i++) { boilSeed('s03bed  bloom' + i); paint(ellPts(cxm + (i - 2.5) * 360, 700 + 520 * hash(i + 2), 380, 200, 20, 12), { fill: P.sheetSh, fillOp: 50, bleed: .25, tex: .6, ink: null }); }
    for (let i = 0; i < 7; i++) { boilSeed('s03bed  crease' + i); const x = cxm - 1100 + i * 330 + 40 * hash(i), y = 420 + 600 * hash(i * 3.3); inkLine([[x, y], [x + 130, y + 30 * Math.sin(i)], [x + 300, y - 12]], .6, P.sheetSh, 'inkfine', .6); }
    // the pillow
    const T = -70, B = 340, O = [[px0 + 30, T + 30], [cxm, T - 14], [px1 - 30, T + 26], [px1 + 18, 130], [px1 + 4, B - 70], [px1 - 70, B + 6], [cxm, B + 22], [px0 + 70, B + 4], [px0 - 8, B - 70], [px0 - 16, 130]];
    boilSeed('s03bed  pillow shadow'); paint(O.map(([x, y]) => [x + 22, y + 26]), { wash: P.sheetSh, washOp: 120, ink: null, curv: .8 });
    boilSeed('s03bed  pillow'); paint(O, { wash: pil, ink: pl, sw: 1.1, curv: .8 });
    paint([[px0 + 20, B - 90], [cxm, B - 40], [px1 - 20, B - 90], [px1 - 60, B], [cxm, B + 18], [px0 + 60, B]], { wash: P.pillowSh, washOp: 110, ink: null, curv: .7 });
    boilSeed('s03bed  dent'); paint(ellPts(hx, 170, 190, 150, 22, 12), { wash: P.pillowSh, washOp: 85, ink: null, curv: .8 });
    for (const [a, b] of [[px0 + 70, 40], [px1 - 70, 40]]) inkLine([[a, b], [a + (a < cxm ? 26 : -26), 150], [a + (a < cxm ? 8 : -8), 270]], .6, P.pillowSh, 'inkfine', .6);
    // the duvet: a wavy hem, a wash, long soft ridges, a few cloth creases, the turned-down band
    const hemP = []; for (let i = 0; i <= 12; i++) { const x = lerp(x0, x1, i / 12); hemP.push([x, hem + 26 * Math.sin(i * 1.1 + 1) + 12 * Math.sin(i * 2.7)]); }
    boilSeed('s03bed  duvet'); paint(hemP.concat([[x1, 2400], [x0, 2400]]), { wash: cv, ink: null });
    boilSeed('s03bed  duvet tex'); paint([[x0, hem + 60], [x1, hem + 60], [x1, 2400], [x0, 2400]], { fill: dk, fillOp: 28, bleed: .2, tex: .8, ink: null });
    const rid = (x, w, op, col, key) => { boilSeed('s03bed  ' + key); for (const k of [1, .7, .42]) paint(ribbon([[x, hem + 60], [x - 20, hem + 360], [x + 30, hem + 700], [x + 10, hem + 1100]], w * k, w * k * 1.1), { wash: col, washOp: op, ink: null }); };
    for (const [dx, w] of [[-520, 300], [-60, 360], [440, 320], [900, 300]]) { rid(cxm + dx + 70, w, 40, dk, 'sh' + dx); rid(cxm + dx - 30, w * .8, 60, cl, 'lt' + dx); }
    boilSeed('s03bed  creases'); for (let i = 0; i < 9; i++) { const x = cxm - 760 + i * 190 + 30 * hash(i * 2.2), y = hem + 140 + 90 * hash(i * 1.7); inkLine([[x, y], [x - 14 + 28 * hash(i), y + 140], [x + 8, y + 300]], .55, dk, 'inkfine', .6); }
    const hb = hemP.map(([x, y]) => [x, y + 54 + 10 * Math.sin(x * .006)]);
    boilSeed('s03bed  hem'); paint(hb.map(([x, y]) => [x, y - 2]).concat(hb.map(([x, y]) => [x, y + 20]).reverse()), { wash: dk, washOp: 80, ink: null });
    paint(hemP.concat(hb.slice().reverse()), { wash: cl, ink: null }); inkLine(hemP, 1.2, P.ink, 'ink', .5); inkLine(hb, .5, dk, 'inkfine', .5);
  }

  const stub = (name) => (t, lt, dur) => { kitFade(1, '#1B2036'); letter(name, W / 2, H / 2, 60, '#E8FDFF', { screen: true, ink: false }); };
  shots([[T_A, s03a, { lyricMode: 'karaoke' }], [T_B, s03b, { lyricMode: 'karaoke' }], [T_C, s03c, { lyricMode: 'karaoke' }]]);
})();
