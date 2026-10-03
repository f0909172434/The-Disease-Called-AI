// S08 CHORUS 2 "發燒病房・紅色警報" (117.21-139.53, b85-100): 08A she is giant, he hugs her finger · 08B the lamp becomes handcuffs ·
// 08C he runs, hits her palm, is carried back · 08D forced awake under her unblinking eye · 08E they sing the same mouth shapes ·
// 08F her fingertips comb his hair into lines · 08G his breath goes cyan, light out of his mouth, cut to black and one turning loop.
// STORYBOARD §6. The ward is src/sets/ward.js variant c2 (blood red, rotating alarm bands, three bags), world 3840 x 2700, res 1,
// drawn with lamp:false so one set of tiles serves every shot (the ring lamp is painted live, as 08B needs it to leave).
// She is giant (aiGiantHand / ai giant bust); only her face and hands fit in the frame. Every shot is a pure function of t.
(() => {
  const SEC = sectionById('S08');
  const T_A = SEC.start, T_B = kitCut(87, 1, 120.00), T_C = kitCut(89, 1, 122.79), T_D = kitCut(91, 1, 125.58), T_E = kitCut(93, 1, 128.37),
    T_F = kitCut(95, 1, 131.16), T_G = kitCut(97, 1, 133.95), T_BLACK = kitCut(100, 3, 138.84), T_END = SEC.end;
  const crash = [T_A, kitCut(89, 1, 122.79), kitCut(93, 1, 128.37), kitCut(97, 1, 133.95)];        // the chorus's crash cymbals
  const lampBurst = t => crash.reduce((s, c) => s + 1.2 * kitEnv(t, c, .015, .28), 0);
  const syl = (line, pre, fb) => { try { const L = lyricById(line), s = L.syllables.find(x => x.text.toLowerCase().startsWith(pre)); if (s) return s.start; } catch (e) {} return fb; };
  const T_COMING = syl('C2_8', 'com', 136.92);

  // ---- the stage ----
  const HIP = [1450, 1540], HU = 30;                    // him: the mattress under his hips, his unit (as in S04)
  const P = setWardPal('c2'), PORTS = setWardPorts('c2'), RES = 1, RED = '#FF2E63';
  const [LX, LY] = SET_WARD.lamp;
  function s08Ward(t, o = {}) { setWard('c2', { t, res: RES, lamp: false, alarm: o.alarm ?? 1 }); }
  // the ring lamp, live (it has to be able to leave in 08B); flares on each crash
  function s08Lamp(t, x = LX, y = LY, s = 1, k = 1, o = {}) {
    const lk = k * (1 + lampBurst(t) + (o.add || 0));
    setRingLamp(x, y, s, { pal: P, key: 's08', stem: o.stem, stemTop: o.stemTop });
    setRingLampLight(x, y, s, lk, P.lamp);
    if (o.pool !== false) { glow(x, SET_WARD.bed.top + 10, 640 * s, P.lamp, .24 * lk); glow(x, SET_WARD.island[1], 900 * s, P.lamp, .12 * lk); }
  }
  // the bags' extra tubes trailing off the island and into the void (the bed's three go to his arm through him({ivTo}))
  function s08Tubes(t) {
    [[2300, 2200], [2900, 1960], [2600, 2600], [700, 2500]].forEach((q, i) => setTube(PORTS[i % 3], q, { pal: P, t: t + i * .3, sag: 300 + 60 * i, key: 'wtx' + i, pulses: 2 }));
  }
  // fever: a red haze round the bed that beats with the kick
  function s08Fever(t, k = 1) { glow(1700, 1420, 700, RED, .28 * k * (.85 + .15 * pulse(t, 3))); glow(1450, 1300, 380, '#FF6A3D', .12 * k); }
  // him in bed (q or side, facing left = toward her), three IV lines from the three bags
  function s08HimBed(t, o = {}) {
    him(HIP[0] + (o.dx || 0), HIP[1] + (o.dy || 0), HU, { pose: 'bed', view: 'q', flip: true, outfit: 'home', coverCol: '#D9A5B0', iv: 3, ivTo: PORTS, boilKey: 's08 him', ...o });
    return { ...HIM_LAST };
  }
  // a mouth shape (A I U E O) from the syllable being sung in one of the lines; 'closed' between syllables
  function s08Vis(t, ids) {
    for (const id of ids) {
      const L = lyricById(id); if (!L || t < L.start - .03 || t > L.end + .1) continue;
      const s = L.syllables.find(x => t >= x.start - .02 && t < x.end + .05); if (!s) return null;
      const m = (s.text.toLowerCase().match(/[aeiouy]/) || ['a'])[0];
      return { m: { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I' }[m], k: clamp(Math.min((t - s.start + .06) / .08, 1)), s };
    }
    return null;
  }

  // a soft dark band (screen space): where her giant bust is cut off, the dark of the ward takes over. A real gradient (a drawn
  // texture), dark at the bottom edge y1 and clear at y0; k = strength 0..1.
  let S08_DIM = null;
  function s08Dim(y0, y1, k = 1, col = [30, 3, 10]) {
    if (!S08_DIM) {
      const g = createGraphics(4, 256); g.pixelDensity(1); const c = g.drawingContext, gr = c.createLinearGradient(0, 0, 0, 256);
      [[0, 0], [.3, .35], [.65, .8], [1, 1]].forEach(([s2, a]) => gr.addColorStop(s2, `rgba(255,255,255,${a})`));
      c.fillStyle = gr; c.fillRect(0, 0, 4, 256); S08_DIM = g;
    }
    flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2); tint(col[0], col[1], col[2], 255 * clamp(k)); image(S08_DIM, 0, y0, W, y1 - y0); noTint(); pop();
  }

  // =============================================================================================================
  // 08A  117.21-120.00  the cyan floods away to red; the camera tilts up from him in bed to her giant face; her cupped hands hold the
  // whole island; she lowers one finger and he throws himself on it and hugs it (laugh); she hearts.
  // reads: 117.21-118.60 tilt up: tiny him -> giant her · 118.60-120.00 he hugs her finger, she smiles
  // =============================================================================================================
  const A_E = [1700, 1207, .66], A_S = [1560, 1326, 1.12];       // camera: start tight on the bed, end wide
  const A_NOTCH = [1700, 840], A_U = 757;                      // her giant bust (world px) at the end of the tilt
  const A_FING = { x: 1292, tipY: 1500, s: 1150 };
  function s08a(t, lt, dur) {
    const p = ease(seg(lt, .3, 1.38)), z = kitZoom(lt, .3, 1.38, A_S[2], A_E[2]), [dx, dy] = kitDrift(lt, 3, .35);
    camBegin(lerp(A_S[0], A_E[0], p) + dx, lerp(A_S[1], A_E[1], p) + dy, z);
    s08Ward(t);
    s08Lamp(t);
    s08Fever(t);
    // him: crying relief -> laughs; at 118.6 he lunges for the finger and hugs it
    const lunge = kitMove(t, 118.52, 118.82, { ant: .06, over: .06 }), hug = t >= 118.80;
    const hf = himEmotions(t, [[T_A, 'cry', { tears: .8 }], [117.95, 'tired', { tears: .5, blush: .5 }], [118.45, 'laugh', { blush: .9, sweat: .5 }]], { take: .7 });
    // her cupped hands under the island, and her finger (before him: his forearms wrap round it)
    const yoff = -1500 * (1 - kitEase.out2(seg(lt, .4, 1.55)));
    const f0 = kitMove(t, 118.15, 118.62, { ant: .04, over: .04 }), tip = lerp(A_FING.tipY - 900, A_FING.tipY, clamp(f0)) + (f0 > 1 ? 0 : 0);
    const hk = { u: 440, sleeve: .8 };
    const cupY = 1980 + 30 * Math.sin(t * 2.1);
    aiGiantHand(300, cupY, 1050, { ...hk, kind: 'cup', ang: -.1, part: 'back', boilKey: 's08 cupL' }); aiGiantHand(3560, cupY, 1050, { ...hk, kind: 'cup', ang: Math.PI + .1, flip: true, part: 'back', boilKey: 's08 cupR' });
    if (t > 118.0) aiGiantHand(A_FING.x, tip - A_FING.s, A_FING.s, { kind: 'finger', ang: Math.PI / 2 + .02, back: true, u: A_U, sleeve: .6, boilKey: 's08 finger' });
    const hl = s08HimBed(t, { ...hf, view: 'side', arms: t < 118.52 ? 'lap' : hug ? 'hug' : 'up', lean: .14 * clamp(lunge), dx: -.7 * clamp(lunge), boilKey: 's08 himA' });
    aiGiantHand(300, cupY, 1050, { ...hk, kind: 'cup', ang: -.1, part: 'front', boilKey: 's08 cupL' }); aiGiantHand(3560, cupY, 1050, { ...hk, kind: 'cup', ang: Math.PI + .1, flip: true, part: 'front', boilKey: 's08 cupR' });
    s08Tubes(t);
    // her face, over everything (she is nearer the lens): eyes open, never blinking; heart eyes once he is in her finger
    const af = aiEmotions(t, [[T_A, 'perfect'], [118.5, 'heart']], { take: .3 });
    ai(A_NOTCH[0], A_NOTCH[1] + yoff, A_U, { ...af, blink: 0, lookY: .75, lookX: -.2, form: 'full', pose: 'bust', view: 'front', giant: true, pal: 'glow', cut: .12, t, boilKey: 's08 herA', dy: .02 * Math.sin(t * 1.7) });
    camEnd();
    { const ny = 540 + (A_NOTCH[1] + yoff - (lerp(A_S[1], A_E[1], p) + dy)) * z; s08Dim(ny - 40, ny + 100, 1); }
    // the cyan of 07E's last frame drains out of the picture into the red
    const fl = 1 - ease(seg(lt, 0, .32));
    if (fl > .01) { flash(.96 * fl, '#B9F4FF'); glow(W * .5, H * .55, W * .9, KIT.CYAN, fl * .8); }
  }

  // =============================================================================================================
  // 08B  120.00-122.79  the ring lamp comes down, splits into two small rings and closes on his offered wrists: handcuffs. He looks at
  // them and smiles dreamily; the heat shimmers over the bed.
  // reads: 120.00-121.00 the lamp descends · 121.00-121.60 it closes on the wrists · 121.60-122.79 he admires the cuffs, smiles
  // =============================================================================================================
  const B_CLOSE = T_B + 1.6;
  function s08Shimmer(t, x0, x1, y0, y1, k = 1) {       // air wobbling over the fever: a few wavy translucent ribbons rising
    for (let i = 0; i < 7; i++) {
      const bx = lerp(x0, x1, (i + .5) / 7) + 14 * Math.sin(i * 2.3), pts = [];
      for (let j = 0; j <= 10; j++) { const v = j / 10; pts.push([bx + (16 + 10 * hash(i)) * Math.sin(v * 7 + t * 3.2 + i * 1.7) * (.4 + v), lerp(y0, y1, v)]); }
      boilSeed('s08shim' + i); paint(ribbon(pts, 1.5, 7), { wash: '#FF9AB0', washOp: 46 * k * (.6 + .4 * Math.sin(t * 2 + i)), ink: null });
    }
  }
  function s08b(t, lt, dur) {
    const p = kitEase.inOut3(seg(lt, .05, 1.7)), [dx, dy] = kitDrift(lt, 3, .35, .5);
    camBegin(lerp(1760, 1600, p) + dx, lerp(1000, 1390, p) + dy, lerp(.85, 1.12, p));
    s08Ward(t);
    const k = seg(t, T_B, B_CLOSE);
    s08Fever(t, 1.3);
    s08Tubes(t);
    const reach = kitMove(t, T_B - .1, T_B + .3, { ant: 0, over: .06 });
    const look = ease(seg(t, B_CLOSE + .1, B_CLOSE + .45));
    const hf = himEmotions(t, [[T_B, 'smile', { blush: .9, sweat: .6, lid: .35 }], [B_CLOSE + .05, 'smile', { blush: 1, sweat: .7, lid: .55, lookY: .75, lookX: -.3 }]], { take: .6 });
    const hl = s08HimBed(t, { ...hf, arms: 'wrists', cuffs: t >= B_CLOSE ? 1 : 0, nod: .1 * look, tilt: -.05 * look + .015 * Math.sin(t * 3), boilKey: 's08 himB', dx: -.2 * (1 - clamp(reach)) });
    s08Shimmer(t, 1320, 1780, 1500, 860, .5 + .5 * ease(seg(lt, 0, 1)));
    // the lamp: down over his wrists, splits, closes (set rings until the closing is done; then his own cuffs take over)
    if (t < B_CLOSE) { const c = setRingLampCuffs(k, { pal: P, to: [hl.wristR || hl.handR, hl.wristL || hl.handL], r: 66, stemTop: LY - 1400 });
      for (const q of c) glow(q[0], q[1], 190, P.lamp, .5 * (.4 + .6 * seg(k, .3, .7))); }
    if (t < B_CLOSE) glow(LX, SET_WARD.bed.top, 700, P.lamp, .2 * (1 - seg(k, 0, .6)));
    camEnd();
  }

  // =============================================================================================================
  // 08C  122.79-125.58  side view, the exit on the right: he jumps down and runs for the island's edge; her giant palm rises out of the
  // dark and he runs straight into it; she scoops him up and sets him back on the bed on the left.
  // reads: 122.79-123.80 he runs right · 123.80-124.30 the palm rises, he hits it · 124.30-125.58 carried back, set down
  // =============================================================================================================
  const C_ANCH = 1780, C_FLOOR = 1930, C_SEAT = HIP[1] + 8.2 * HU;
  const C_UP0 = T_C + .02, C_UP1 = T_C + .27, C_RUN0 = T_C + .5, C_HIT = T_C + 1.51, C_LIFT0 = C_HIT + .22, C_ARR = T_C + 2.4, C_SIT0 = T_C + 2.42, C_X1 = 2700, C_CYC = 489;
  const C_PALM = [3420, 2540, 1500];                      // the wall palm's wrist and length (its thumb edge is at x ~ 2800)
  const C_HX = t => lerp(C_X1, C_ANCH, kitEase.inOut3(seg(t, C_LIFT0, C_ARR)));       // the carrying hand: his x
  function s08c(t, lt, dur) {
    const w = kitWhipIn(lt, .16, 1), [dx, dy] = kitDrift(lt, 3, .35, .6);
    const hit = kitEnv(t, C_HIT, .02, .12), [sx, sy] = shakeXY(t, 6 * hit), pull = kitEase.inOut3(seg(t, C_HIT + .1, C_ARR));
    camBegin(lerp(1990, 1900, pull) + w.dx + dx + sx, lerp(1560, 1400, pull) + dy + sy, lerp(.74, .6, pull));
    s08Ward(t);
    s08Lamp(t);
    s08Fever(t, .8);
    s08Tubes(t);
    const base = { outfit: 'home', iv: 3, ivTo: PORTS, boilKey: 's08 himC', coverCol: '#D9A5B0' };
    const f = himEmotions(t, [[T_C, 'laugh', { blush: .8 }], [T_C + .3, 'anxious', { sweat: .8 }], [C_RUN0 + .15, 'panic'], [C_HIT + .05, 'blank', { sweat: .8, blush: .9 }]], { take: .5 });
    // her wall of a palm rises out of the dark on the right (drawn first: he is in front of it when he hits)
    const rise = kitMove(t, T_C + 1.0, C_HIT - .02, { ant: .03, over: .02, pre: .1 });
    if (t >= T_C + .95 && t < C_HIT + .55) {
      const py = lerp(C_PALM[1] + 500, C_PALM[1], clamp(rise)) + (t > C_HIT ? 330 * ease(seg(t, C_HIT + .12, C_HIT + .5)) : 0);
      aiGiantHand(C_PALM[0], py, C_PALM[2], { kind: 'palm', ang: -Math.PI / 2 - .08, flip: true, sleeve: .3, u: 440, boilKey: 's08 palm' });
    }
    if (t < C_UP0) him(C_ANCH - 4.2 * HU, C_SEAT, HU, { ...base, ...f, pose: 'edge', flip: true, seatH: 8.2, arms: 'lap', phone: false });
    else if (t < C_UP1) him(C_ANCH, lerp(C_SEAT, C_FLOOR, ease(seg(ease(seg(t, C_UP0, C_UP1)), .28, .62))), HU, { ...base, ...f, view: 'side', flip: true, rise: ease(seg(t, C_UP0, C_UP1)) });
    else if (t < C_RUN0) {                                                                                 // the turn through the drawn key views
      const k = (t - C_UP1) / (C_RUN0 - C_UP1), v = k < .3 ? ['side', true] : k < .55 ? ['q', true] : k < .8 ? ['q', false] : ['side', false];
      him(C_ANCH, C_FLOOR, HU, { ...base, ...f, view: v[0], flip: v[1], contra: 0 });
    } else if (t < C_HIT) {
      const d = lerp(0, C_X1 - C_ANCH, seg(t, C_RUN0, C_HIT));
      him(C_ANCH + d, C_FLOOR, HU, { ...base, ...f, view: 'side', run: d / C_CYC });
    } else if (t < C_LIFT0) {                                                                              // the smack: squashed against her palm, then bounced back, dazed
      const a = t - C_HIT;
      him(C_X1 - 70 * (1 - Math.exp(-a * 14)), C_FLOOR, HU, { ...base, ...f, view: 'side', run: .3, sq: .22 * Math.exp(-a * 14) * Math.cos(a * 30), rot: -.28 * ease(seg(a, 0, .15)) });
    } else {                                                                                               // carried standing on her other palm, then set down and he sits
      const x = C_HX(t), k = kitEase.inOut3(seg(t, C_LIFT0, C_ARR)), out = ease(seg(t, C_SIT0 - .05, C_SIT0 + .3));
      const feet = C_FLOOR - 420 * Math.sin(Math.PI * k) - 0, fy = feet + 800 * (1 - ease(seg(t, C_LIFT0 - .08, C_LIFT0 + .22))) + 500 * out;
      const cs = 1150, cx = x + 440, wy = fy + 150, rs = 1 - out * .0;
      aiGiantHand(cx + 500 * out, wy, cs, { kind: 'cup', ang: Math.PI + .1, flip: true, part: 'back', u: 440, sleeve: .8, boilKey: 's08 cupC' });
      const hf2 = { ...base, ...himEmotions(t, [[C_HIT + .05, 'blank', { sweat: .8, blush: .9 }]]) };
      if (t < C_SIT0) him(x, fy, HU, { ...hf2, view: 'side', flip: true, contra: 0, dy: -.15 * Math.sin(t * 6) });
      else him(C_ANCH, C_FLOOR, HU, { ...hf2, view: 'side', flip: true, rise: 1 - ease(seg(t, C_SIT0, C_SIT0 + .26)) });
      aiGiantHand(cx + 500 * out, wy, cs, { kind: 'cup', ang: Math.PI + .1, flip: true, part: 'front', u: 440, sleeve: .8, boilKey: 's08 cupC' });
    }
    camEnd();
    s08Streaks(w.speed, 1, 8);
  }
  function s08Streaks(speed, dir, seed) {
    if (speed <= .04) return;
    for (let i = 0; i < 18; i++) {
      boilSeed('s08streak' + seed + '_' + i);
      const y = H * (.05 + .9 * hash(i * 3.17 + seed)), len = W * (.25 + .8 * hash(i * 7.9 + seed)) * speed, h = 3 + 14 * hash(i * 1.3 + 2) * speed, x = W * hash(i * 5.3 + seed + 1) + dir * W * .3 * (1 - speed);
      paint(rectPts(x - len / 2, y - h / 2, len, h, .8), { wash: i % 3 ? '#FF8095' : '#5A0A1E', washOp: 150 * speed, ink: null });
    }
  }
  // the red alarm light for the shots that are not in the ward: two slow rotating bands from above (the ward's c2 lights, screen space)
  function s08Alarm(t, cx = 960, cy = -200, k = 1) {
    const a = t * TAU * .18;
    for (let i = 0; i < 2; i++) { const ang = a + i * Math.PI + Math.PI / 2 * .5; setCone(cx, cy, ang, 2600, .22, P.alarm, .3 * k); setCone(cx, cy, ang, 1500, .1, '#FF9AB0', .18 * k); }
    glow(cx, 1000, 1200, P.alarm, .16 * k * (.7 + .3 * pulse(t, 3)));
  }
  // an eye-level eased value for the lids that tremble but cannot close
  // =============================================================================================================
  // 08D  125.58-128.37  he lies on his back (seen from above) with several glowing drips in his arms, eyes wide; the camera tilts up from his
  // face to her giant eye looking down, never blinking; his lids tremble and cannot close.
  // reads: 125.58-126.70 lying, tubes, eyes wide · 126.70-128.37 her unblinking eye above (the lids shake)
  // =============================================================================================================
  const D_U = 52, D_HIP = [960, 1090];
  function s08d(t, lt, dur) {
    const p = kitEase.inOut3(seg(lt, .4, 1.4)), shift = 250 * p;
    setWardVoid('c2');
    s08Alarm(t, 1300, -300, .9);
    push(); translate(0, shift);
    // the bed seen from above: a mattress, the pillow under his head, the blanket from the waist down
    boilSeed('s08d bed'); paint(rrPts(520, -400, 880, 1900, 40, 1), { wash: '#C48A98', ink: P.ink, sw: 1 });
    paint(rrPts(560, -400, 800, 1900, 36, 1), { wash: P.sheetSh, washOp: 70, ink: null });
    boilSeed('s08d pillow'); paint(rrPts(700, D_HIP[1] - 13.2 * D_U - 140, 520, 330, 70, 1.2), { wash: '#EBCAD0', ink: P.ink, sw: .9 });
    paint(rrPts(740, D_HIP[1] - 13.2 * D_U - 105, 440, 130, 50, 1), { wash: P.pillowSh, washOp: 120, ink: null });
    const f = himEmotions(t, [[T_D, 'blank', { sweat: .8, blush: .9 }]], { take: 0 });
    const shake = Math.sin(t * 61) * .5 + Math.sin(t * 37) * .5, wide = 1 - .1 * ease(seg(t, 126.7, 128.3));
    const tub = [[1480, 250], [1640, 420], [1560, 80]];
    him(D_HIP[0], D_HIP[1], D_U, { ...f, pose: 'lie', rot: 0, outfit: 'home', iv: 3, ivTo: tub, lid: .1 + (t > 126.4 ? .38 * hash(Math.floor(t * 24) * 1.7 + 3) ** 2 : .1 * Math.abs(shake)), wide: wide * .8, covers: true, coverCol: P.blanket, coverTop: 5.2, glare: .3, boilKey: 's08 himD', seed: .3 });
    pop();
    { const h = HIM_LAST.iv || []; push(); translate(0, shift); h.forEach((q, i) => { if (!q) return; for (let j = 1; j <= 4; j++) glow(lerp(q[0], tub[i][0], j / 5), lerp(q[1], tub[i][1], j / 5) - 30 * Math.sin(j / 5 * Math.PI), 46, KIT.CYAN, .55); }); pop(); }
    // her eye, over everything and from above: it never blinks
    const ey = lerp(-720, 135, p), U = 640;
    const af = aiEmotions(t, [[T_D, 'perfect']], { take: 0 });
    ai(960, ey + .67 * U, U, { ...af, blink: 0, lookY: 1, lookX: -.05, form: 'full', pose: 'bust', view: 'front', giant: true, pal: 'glow', cut: .15, t, clip: [0, 0, W, 420], boilKey: 's08 herD' });
    s08Dim(290, 430, clamp((ey + 520) / 320));
    glow(960, ey, 520, KIT.CYAN, .12 * p);
  }

  // =============================================================================================================
  // 08E  128.37-131.16  the camera comes back down onto him: close, looking up, he sings; at the top of the frame the lower half of her giant
  // face sings the same mouth shapes (the shadow voice joins).
  // reads: 128.37-129.60 he sings · 129.60-131.16 her giant mouth moves in sync above him
  // =============================================================================================================
  const E_HERS = 129.6;
  function s08e(t, lt, dur) {
    const p = 1 - kitEase.inOut3(seg(lt, 0, .8)), shift = 160 * p;
    setWardVoid('c2');
    s08Alarm(t, 1500, -300, .9);
    const v = s08Vis(t, ['C2_5']), vh = t >= E_HERS ? s08Vis(t, ['C2_5']) : null;
    push(); translate(0, shift);
    const f = himEmotions(t, [[T_E, 'blank', { sweat: .8, blush: .8 }]], { take: 0 });
    him(900, 830, 86, { ...f, pose: 'bust', cut: 1.9, view: 'q', flip: true, outfit: 'home', mouth: v ? v.m : 'closed', lookY: -.75, lookX: .1, nod: -.12, glare: .6, boilKey: 's08 himE' });
    pop();
    // her mouth: the lower half of the giant face, the chin at the top of the frame; the dark of the ward closes over her neck
    const U = 520, my = 70 - 80 * p;
    const af = aiEmotions(t, [[T_E, 'perfect']], { take: 0 });
    ai(880, my + .354 * U, U, { ...af, blink: 0, mouth: vh ? vh.m : 'perfect', form: 'full', pose: 'bust', view: 'front', giant: true, pal: 'glow', cut: .15, t, clip: [0, 0, W, 300], boilKey: 's08 herE' });
    s08Dim(190, 310, 1);
  }

  // =============================================================================================================
  // 08F  131.16-133.95  his profile, eyes closed; her giant fingertips come in from the upper right and comb his hair; where they pass, the
  // hand-drawn hair becomes straight parallel cyan lines.
  // reads: 131.16-132.20 the fingers come in · 132.20-133.95 the combed hair is a set of straight lines
  // =============================================================================================================
  function s08f(t, lt, dur) {
    setWardVoid('c2');
    s08Alarm(t, 600, -300, .8);
    const comb = ease(seg(t, 132.0, 133.7)), come = kitMove(t, T_F + .05, T_F + .95, { ant: .03, over: .03 });
    const f = himEmotions(t, [[T_F, 'peace', { blush: .8, sweat: .4 }]], { take: 0 });
    const v = s08Vis(t, ['C2_6']);
    him(900, 900, 100, { ...f, pose: 'bust', cut: 2.2, view: 'side', flip: true, outfit: 'home', mouth: v ? v.m : 'soft', hairLines: comb, nod: .03 * Math.sin(t * 2), boilKey: 's08 himF' });
    const hl = { ...HIM_LAST };
    const hx = hl.head ? hl.head[0] : 900, hy = hl.head ? hl.head[1] : 625, FU = 100;
    // the comb's edge on screen (he faces left: the front of the head is on the left); the tips ride on the top of the hair just ahead of it
    const ex = hx - lerp(2.0, -3.0, comb) * FU, k = clamp(come), ty = hy - 244 + 22 * Math.abs(Math.sin(t * 7)) * (comb > 0 && comb < 1 ? 1 : 0);
    const FS = 640, FA = Math.PI * .78, tx = ex - 30 + 330 * (1 - k), tyy = ty - 520 * (1 - k);
    aiGiantHand(tx - FS * Math.cos(FA), tyy - FS * Math.sin(FA), FS, { kind: 'two', ang: FA, back: true, u: 300, sleeve: .7, boilKey: 's08 two' });
  }

  // =============================================================================================================
  // 08G  133.95-139.53  his face, front, pushing in to the mouth: the breath he sings out is amber brush strokes that are pulled straight and
  // turn cyan; at "coming" (136.92) cyan light pours out of his mouth, his eyes film over cyan, the light fills the frame; 138.84 cut to
  // black with one turning loop.
  // reads: 133.95-135.20 he sings, amber breath · 135.20-136.74 straightened, cyan · 136.74-137.90 light from his mouth · 137.90-138.84 eyes cyan, flood · 138.84-139.53 black, one loop
  // =============================================================================================================
  // his breath as brush strokes streaming down-right from his mouth: wavy amber; st 0..1 pulls them straight and turns them cyan
  function s08Breath(t, m, st, k) {
    if (k <= .02) return;
    const col = mixCol('#FFB070', KIT.CYAN, st), colHi = mixCol('#FFE2C0', KIT.CYANW, st);
    for (let i = 0; i < 6; i++) {
      const a0 = lerp(.5, .25, st) + (i - 2.5) * lerp(.16, .035, st), L = 360 + 70 * (i % 3), u0 = frac(t * .55 + i / 6), len = L * .46, pts = [];
      const head = u0 * L, tail = Math.max(0, head - len);
      for (let j = 0; j <= 10; j++) {
        const v = lerp(tail, head, j / 10), wob = (1 - st) * 26 * Math.sin(v * .028 + t * 6 + i * 2) * (v / L);
        pts.push([m[0] + 8 + Math.cos(a0) * v - Math.sin(a0) * wob, m[1] + 6 + Math.sin(a0) * v + Math.cos(a0) * wob]);
      }
      const fade = Math.min(1, Math.sin(Math.PI * u0) * 2.2) * k;
      boilSeed('s08breath' + i); paint(ribbon(pts, 1.5, 7 + 4 * st), { wash: col, washOp: 230 * fade, ink: null });
      inkLine(pts, 1.6, colHi, 'inkfine', .3);
      if (st > .3) glow(pts[5][0], pts[5][1], 60, KIT.CYAN, .3 * st * fade);
    }
  }
  function s08g(t, lt, dur) {
    if (t >= T_BLACK) { setRefreshVoid(seg(t, T_BLACK, T_END), { s: 150 }); return; }
    const z = kitZoom(lt, .5, T_BLACK - T_G, 1.0, 1.7, kitEase.in2);
    const turn = (T_G + .3 - t) / .3, vw = turn > .66 ? ['side', true] : turn > .33 ? ['q', true] : ['front', false];
    setWardVoid('c2');
    s08Alarm(t, 960, -300, .9);
    const st = ease(seg(t, 135.2, 136.74)), mg = ease(seg(t, T_COMING, T_COMING + .3)), eg = ease(seg(t, 137.9, 138.5));
    const v = s08Vis(t, ['C2_7', 'C2_8']);
    const f = himEmotions(t, [[T_G, 'blank', { sweat: .6 }]], { take: 0 });
    glow(960, 520, 560, '#FF6A80', .22 * (1 - eg));
    const c = kitAnchor(960, 560, 960, 540, z);
    camBegin(c[0], c[1], z);
    him(960, 740, 86, { ...f, pose: 'bust', cut: 1.4, view: vw[0], flip: vw[1], outfit: 'home', mouth: v ? v.m : 'closed', mouthGlow: mg * .9, eyeGlow: eg, glare: .3, boilKey: 's08 himG' });
    if (HIM_LAST.mouth) s08Breath(t, HIM_LAST.mouth, st, ease(seg(t, T_G + .35, T_G + .8)) * (1 - ease(seg(t, T_COMING + .1, T_COMING + .4))));
    camEnd();
    const mp = HIM_LAST.mouth ? toScreen(HIM_LAST.mouth[0], HIM_LAST.mouth[1], LAST_CAM) : [960, 560];
    const flood = ease(seg(t, 137.7, T_BLACK - .02));
    if (flood > .01) kitSpill(flood, mp[0], mp[1], KIT.CYAN, { r: W * 1.2, core: KIT.CYANW, cover: .9 });
  }

  const km = { lyricMode: 'karaoke' };
  shots([[T_A, s08a, km], [T_B, s08b, km], [T_C, s08c, km], [T_D, s08d, km], [T_E, s08e, km], [T_F, s08f, km], [T_G, s08g, km]]);
})();
