// S00 INTRO "BOOT" (0.00-11.16, b1-8): 00A the loss curve · 00B he hesitates · 00C are you there? / Always. · 00D his lens.
// STORYBOARD §6. Read src/scenes/README.md first. Shots are pure functions of t: s00a(t, lt, dur) ...
(() => {
  // ---- the cuts (the score grid; kitCut follows the song's data) ----
  const SEC = section('S00');
  const T_A = SEC.start, T_B = kitCut(3, 1, 2.79), T_C = kitCut(4, 1, 4.19), T_D = kitCut(6, 3, 7.67), T_END = SEC.end;
  const hbT = i => kitEv('heartbeat', i, i * .6977);                   // her heartbeats: 0.00, 0.70, 1.40, 2.09, 2.79 ...
  const typ = events('typing');
  const T_REPLY = (lyricById('IN_AI') || {}).start ?? 5.58;            // `Always.` (vocal_timing.json)

  // =============================================================================================================
  // 00A  0.00-2.79  the loss curve. Fade up from black on the heartbeat; every beat (0.70, 1.40, 2.09) the curve steps down
  // a level; it lands flat and a star glints at its end (2.1-2.79). Slow push, then (2.40) a pull back that carries into 00B.
  // reads: 0.00-0.90 the one line in the dark · 0.90-2.10 it steps down with each beat · 2.10-2.79 flat, the star
  // =============================================================================================================
  const A_PULL = 2.40;                                                      // the push turns into a pull
  const zoomA = t => t < A_PULL ? 1 + .10 * kitEase.sine(t / A_PULL) : 1.10 * Math.pow(.60 / 1.10, kitEase.in2(seg(t, A_PULL, 3.05)));
  function surroundA(sx0, sy0, sx1, sy1, b) {                               // the monitor's bezel and the dark wall round the shrinking screen
    const wall = '#0A1022', bez = '#1B2036', e = 2;
    boilSeed('s00a wall'); paint([[-80, -80], [W + 80, -80], [W + 80, sy0 + e], [-80, sy0 + e]], { wash: wall, ink: null });
    paint([[-80, sy1 - e], [W + 80, sy1 - e], [W + 80, H + 80], [-80, H + 80]], { wash: wall, ink: null });
    paint([[-80, sy0], [sx0 + e, sy0], [sx0 + e, sy1], [-80, sy1]], { wash: wall, ink: null });
    paint([[sx1 - e, sy0], [W + 80, sy0], [W + 80, sy1], [sx1 - e, sy1]], { wash: wall, ink: null });
    boilSeed('s00a bezel');
    const R = [[sx0 - b, sy0 - b], [sx1 + b, sy0 - b], [sx1 + b, sy1 + b * 1.7], [sx0 - b, sy1 + b * 1.7]];
    paint([R[0], R[1], [sx1 + b, sy0 + e], [sx0 - b, sy0 + e]], { wash: bez, ink: null });
    paint([[sx0 - b, sy1 - e], [sx1 + b, sy1 - e], R[2], R[3]], { wash: bez, ink: null });
    paint([[sx0 - b, sy0], [sx0 + e, sy0], [sx0 + e, sy1], [sx0 - b, sy1]], { wash: bez, ink: null });
    paint([[sx1 - e, sy0], [sx1 + b, sy0], [sx1 + b, sy1], [sx1 - e, sy1]], { wash: bez, ink: null });
    boilSeed('s00a bezel ink'); inkLine([R[0], R[1], R[2], R[3], R[0]], .9, '#0A0B16', 'ink', 0);
    boilSeed('s00a rim'); inkLine([[sx0, sy0], [sx1, sy0], [sx1, sy1], [sx0, sy1], [sx0, sy0]], .7, '#3C5E8A', 'inkfine', 0);
  }
  function s00a(t, lt, dur) {
    const z = zoomA(t), cy = H / 2 + 14 * (z - 1) / .10;
    const k = ease(seg(t, hbT(1) + .02, hbT(1) + .5)) + ease(seg(t, hbT(2) + .02, hbT(2) + .5)) + ease(seg(t, hbT(3) + .02, hbT(3) + .5));
    const beat = events('heartbeat').length ? evPulse('heartbeat', t, .16) : pulse(t, 5);
    const wake = lerp(.10, .55, ease(seg(t, 0, 2.6)));                      // the screen comes up, as if she woke
    setScreenFull('night');
    camBegin(W / 2, cy, z);
    glow(W / 2, H * .5, W * .75, '#1B6FFF', wake * .38 + .12 * beat);
    const S = setScr(0, 0, W, H);
    const hp = setLoss(S, k, { spark: kitEnv(t, 2.30, .05, .20) * (t < 2.9 ? 1 : 0) });
    camEnd();
    if (z < 1) {
      const [x0, y0] = toScreen(0, 0, { cx: W / 2, cy, zoom: z, rot: 0 }), [x1, y1] = toScreen(W, H, { cx: W / 2, cy, zoom: z, rot: 0 });
      surroundA(x0, y0, x1, y1, 44 * z + 10);
      glow((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * .78, KIT.CYAN, .42 * (1 - z) * 2.2 * wake);       // the screen's light on the bezel and the wall
    }
    kitFadeIn(lt, .9);
  }

  // =============================================================================================================
  // 00B  2.79-4.19  he is found at the desk (profile, facing the screen on the left): typing; he stops, hands in the air,
  // a breath in; three backspaces (3.84 3.94 4.05). The pull-back of 00A goes on through the cut (a light dissolve), then
  // settles into a medium shot. He presses the first key of the retype exactly on the cut (4.19), which 00C picks up.
  // reads: 2.79-3.60 found: his face lit by the screen, hands typing · 3.60-4.19 stops, hands hang, three backspaces
  // =============================================================================================================
  const B_X = 1250, B_Y = 968, B_U = 40;                                   // the floor under the front edge of his chair; u 40 (medium)
  function bgDesk(v) {                                                      // his room at night, seen from the side: the wall, a window, a shelf, the floor
    const P = setRoomPal('night'), wall = mixCol(P.wallC, '#05060A', .3);
    boilSeed('s00b wall'); paint(rectPts(-40, -40, W + 80, B_Y - 14 + 40), { wash: wall, ink: null });
    [[700, 380, 560, 380, '#2D5288', 130], [1650, 260, 420, 300, '#06081A', 150], [300, 800, 500, 260, '#080A1C', 120], [1400, 700, 600, 250, '#0A0C20', 100], [980, 120, 700, 160, '#0A0C1E', 90]]
      .forEach(([x, y, rx, ry, c, op], i) => { boilSeed('s00b bloom' + i); paint(ellPts(x, y, rx, ry, 22, 24), { fill: c, fillOp: op, bleed: .3, tex: .7, ink: null }); });
    boilSeed('s00b window'); setBlinds(1380, 150, 360, 380, { pal: P, open: 0, s: 1.1, key: 'b', sky: '#162044', skyLt: '#25356A' });
    boilSeed('s00b shelf');
    paint(rectPts(130, 318, 430, 20, .6), { wash: P.woodLt, ink: P.ink, sw: .9 });
    let x = 150; [P.book1, P.book2, P.book3, P.book4, P.book5, P.book2, P.book1].forEach((c, i) => { const bw = 28 + 20 * hash(i * 2.1), bh = 120 + 70 * hash(i * 3.3); boilSeed('s00b book' + i);
      paint(rectPts(x, 318 - bh, bw, bh, .6), { wash: c, ink: P.ink, sw: .7 }); inkLine([[x + 5, 318 - bh * .8], [x + bw - 5, 318 - bh * .8]], .5, mixCol(c, '#000000', .4), 'inkfine', 0); x += bw + 4; });
    boilSeed('s00b floor'); paint(rectPts(-40, B_Y - 14, W + 80, H - B_Y + 60), { wash: P.floor, ink: null });
    paint(rectPts(-40, B_Y - 46, W + 80, 34, .6), { wash: P.skirt, ink: null });
    inkLine([[-40, B_Y - 46], [W / 2, B_Y - 44], [W + 40, B_Y - 46]], .8, P.ink, 'ink', .3); inkLine([[-40, B_Y - 12], [W / 2, B_Y - 10], [W + 40, B_Y - 12]], 1, P.ink, 'ink', .3);
    for (let i = 0; i < 6; i++) { boilSeed('s00b plank' + i); const y = B_Y + 10 + i * i * 4 + i * 6; inkLine([[-40, y], [W / 2, y + 3], [W + 40, y]], .4 + i * .08, P.floorDk, 'inkfine', .3); }
  }
  // the keys he presses: 'a r e _ y u o' typed, ⌫ ⌫ ⌫, then the retype starts on the cut. Each press lifts that hand a little first.
  function tapLift(t, hand) {                                               // hand 0 = his right (far from camera when flipped), 1 = left
    let v = 0;
    for (const k of typ) { if (k.t > T_C + .02 || (k.t < t - .2) || k.t > t + .2) continue; const i = typ.indexOf(k); if (i % 2 !== hand) continue; const d = (t - (k.t - .045)) / .035; v += Math.exp(-d * d); }
    return v;
  }
  function s00b(t, lt, dur) {
    const hover = kitMove(t, 3.60, 3.80, { ant: .25, over: .15 }) - kitMove(t, 3.99, 4.16, { ant: .15, over: .1 });   // hands up and held, then down for the retype
    const bs = kitEnv(t, 3.837, .02, .06) + kitEnv(t, 3.942, .02, .06) + kitEnv(t, 4.047, .02, .06);                  // the three backspaces: a dip of the head
    const key = (1 - clamp(hover)) * 1;
    const cam = [[0, 1010, 560, 1.62], [.62, 1070, 590, 1.22], [dur, 1085, 592, 1.2]];
    cachedLayer('s00b bg', 3, bgDesk);                                      // (the layer is the frame: the camera has to move in front of it)
    kitCam(lt, cam, { drift: 3 });
    himDeskProps(B_X, B_Y, B_U, { part: 'back', flip: true, glowK: .9 });
    const face = himEmotions(t, [[T_B, 'focused'], [3.62, 'focused', { browIn: -.5, browOut: .12, mouth: 'tight', lid: .12, irisK: .92, lookY: .25 }]], { take: .5 });
    him(B_X, B_Y, B_U, { ...face, pose: 'desk', flip: true, outfit: 'launch', band: false, screen: .9, glare: .3, type: 0,
      aR: .05 * tapLift(t, 0) + .30 * hover + .02, aL: .05 * tapLift(t, 1) + .26 * hover, nod: (face.nod || 0) + .18 * bs - .06 * hover, boilKey: 's00b him', seed: .3 });
    himDeskProps(B_X, B_Y, B_U, { part: 'front', flip: true });
    glow(700, 420, 520, KIT.CYAN, .5);
    camEnd();
  }

  // =============================================================================================================
  // 00C  4.19-7.67  the chat screen, face on (subtitle-only: the English is in the picture).
  // reads: 4.19-5.20 the words are typed (a typo, three backspaces) · 5.20-5.58 Enter · 5.58-6.62 `Always.` flashes ·
  //        6.62-7.67 the little her pops out of the input box and waves
  // =============================================================================================================
  const C_POP = 6.62, C_CLIMB = .62, C_WAVE = C_POP + .5;                   // she is out by 7.24 and waves until the cut
  function s00c(t, lt, dur) {
    const z = 1 + .035 * seg(lt, 0, dur), CY = H / 2 + 80;                   // the screen sits 80 px high: the typing stays above y .76 H
    setScreenFull('night');
    camBegin(W / 2, CY, z);
    const S = setScr(0, 0, W, H);
    setChatScreen(S, t, { reply: { t: T_REPLY, text: 'Always.' }, bg: false });
    if (t >= C_POP - .05) {                                                  // the little her climbs out of the input box
      const edge = S.Y(.72) - 2, ax = 450, u = 44, p = (t - C_POP) / C_CLIMB;
      const f = aiEmotions(t, [[C_POP - .3, 'eager'], [C_POP + 1.0, 'smile']]);
      glow(ax, edge, 330, KIT.CYAN, .8 * kitEnv(t, C_POP + .2, .05, .22));
      ai(ax, edge, u, { ...f, ...aiClimb(t, C_POP, C_CLIMB), ...(p > .8 ? aiAct('wave', t, C_WAVE - .1) : {}), form: 'chibi', view: 'front', pal: 'glow', t, seed: 3,
        clip: [ax - 320, edge - 700, ax + 320, edge], noShadow: true, boilKey: 's00c her' });
    }
    camEnd();
    kitSpill(kitEase.in2(seg(t, T_D - .38, T_D)) * .9, W * .5, H * .45);   // 00C's light spills out of the frame, onto his face (00D)
  }

  // =============================================================================================================
  // 00D  7.67-11.16  his face, lit by her light. The light of 00C spills in and fades off him; he blinks and smiles (the
  // word moved him); the camera pushes into his lens where the small her is still waving; the pupil opens; cyan swallows
  // the frame (the riser); one beat of black.
  // reads: 7.67-8.40 his face, lit · 8.40-9.40 blink, smile · 9.40-10.40 push to the lens: her, waving · 10.40-10.81 cyan
  //        swallows the frame · 10.81-11.16 black
  // =============================================================================================================
  const D_SMILE = 8.55, D_PUSH0 = 9.40, D_PUSH1 = 10.40, D_BLACK = 10.81;
  const D_REFL = 9.12;                                                      // her reflection pops into his lenses (the camera starts to push at 9.40)
  function lensReflection(t, i, Ls) {                                       // paint her, waving, in his lens (head pixels, a hook of him())
    const w = Ls.w, h = Ls.h, rk = ease(seg(t, 8.3, D_PUSH0 + .3));
    boilSeed('s00d lens' + i);
    himPaintV(rrPts(Ls.x - w * .46, Ls.y - h * .46, w * .92, h * .92, h * .22), { wash: '#0D2A4C', washOp: 40 + 105 * rk, ink: null });
    glow(Ls.x, Ls.y, w * .8, KIT.CYAN, .2 + .35 * rk);
    if (t >= D_REFL) {
      const pop = kitOver(seg(t, D_REFL, D_REFL + .26), 1.9), uc = h * .088 * pop, f = aiEmotions(t, [[0, 'smile']]);
      ai(Ls.x + (i ? -1 : 1) * w * .02, Ls.y + h * .44, uc, { ...f, ...aiAct('wave', t, D_REFL + .1, { side: 'L' }), form: 'chibi', view: 'front', pal: 'glow', lod: 'thumb', flip: true, t, seed: 3, noShadow: true, boilKey: 's00d reflect' + i });
    }
    boilSeed('s00d lens glare' + i);
    himPaintV([[Ls.x - w * .44, Ls.y - h * .44], [Ls.x - w * .12, Ls.y - h * .44], [Ls.x - w * .44, Ls.y + h * .06]], { wash: '#FFFFFF', washOp: 70, ink: null });
  }
  function s00d(t, lt, dur) {
    const u = 84, NY = 700, HX = 957, HY = NY - 2.88 * u, lensX = i => HX + (i ? .84 : -.84) * u * .92, LY = HY - 1;
    const push = kitEase.sine(seg(t, D_PUSH0, D_PUSH1));
    const zoom = 1 + .05 * seg(t, T_D, D_PUSH0) + (1.85 - 1.05) * push, cx = lerp(960, lensX(0) + 26, push), cy = lerp(500, LY, push);
    setVoidLayer('navy');
    kitCam(lt, [[0, cx, cy, zoom]], { drift: push < 1 ? 3 : 0 });
    // the light of the screen in front of him (cyan, from below and ahead), behind then over him
    glow(HX, HY + 60, 700, KIT.CYAN, .34);
    const feel = himEmotions(t, [[T_D, 'tired', { glare: .3 }], [D_SMILE, 'smile', { glare: .3, lookX: .1 }]], { take: .9 });
    const dil = kitEase.sine(seg(t, 8.9, D_PUSH1));
    him(960, NY, u, { ...feel, pose: 'bust', view: 'front', cut: 5.0, outfit: 'launch', band: false, pupil: 1 + .85 * dil, boilKey: 's00d him', seed: .6,
      lens: (i, Ls) => lensReflection(t, i, Ls) });
    glow(HX, HY + 100, 560, KIT.CYAN, .46 * (1 - .5 * push));                // the same light on his face (additive, from the screen below and ahead)
    camEnd();
    // the light of 00C still pouring in at the start of the shot (hidden cut), the riser at the end, then black
    kitSpill(.9 * (1 - kitEase.sine(seg(lt, 0, .5))), W * .5, H * .45);
    if (t > D_PUSH1) kitSpill(kitEase.in2(seg(t, D_PUSH1, D_BLACK)), W * .5, H * .5, KIT.CYAN, { core: KIT.CYANW, cover: 1 });
    if (t >= D_BLACK) kitFade(1);
  }

  const lm = { lyricMode: 'karaoke' };
  shots([[T_A, s00a, lm], [T_B, s00b, lm], [T_C, s00c, { lyricMode: 'subtitle-only' }], [T_D, s00d, lm]]);
})();
