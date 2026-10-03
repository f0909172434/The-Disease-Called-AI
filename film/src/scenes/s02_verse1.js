// S02 VERSE 1 "CONVENIENCE" (22.33-44.65, b17-32): 02A the glowing duvet · 02B she picks · 02C the calendar · 02D the cobweb ·
// 02E she types faster · 02F the split screen · 02G three a.m. STORYBOARD §6. Shots are pure functions of t: s02a(t, lt, dur) ...
// The cuts come from the song's data (kitCut), the cues from the lyric timing (lyricById) and events.json (notification).
(() => {
  const SEC = sectionById('S02');
  const T_A = SEC.start, T_B = kitCut(21, 1, 27.91), T_C = kitCut(23, 1, 30.70), T_D = kitCut(25, 1, 33.49), T_E = kitCut(27, 1, 36.28),
    T_F = kitCut(29, 1, 39.07), T_G = kitCut(31, 1, 41.86), T_END = SEC.end;
  const ly = (id, fb) => (lyricById(id) || {}).start ?? fb;
  const sylT = (id, i, fb) => { const l = lyricById(id); return l && l.syllables && l.syllables[i] ? l.syllables[i].start : fb; };
  const N1 = kitEv('notification', 0, 28.2558), N2 = kitEv('notification', 1, 29.6512), N3 = kitEv('notification', 2, 44.1628);
  const beatT = (t) => Math.floor(bpOf(t) + 1e-6);                              // integer beat index
  const HP = () => himPal('human');

  // a duvet-coloured wash that swallows the frame (02A's end) and falls away again (02B's start): the object wipe between them
  function s02Duvet(k, cx, cy, P, o = {}) {
    if (k <= .005) return;
    const r = lerp(260, 2300, kitEase.in2(k)), n = 14, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * TAU, wob = 1 + .16 * Math.sin(a * 3 + 1.1) + .08 * hash(i * 3.7); pts.push([clamp(cx + Math.cos(a) * r * wob * 1.25, -90, W + 90), clamp(cy + Math.sin(a) * r * wob * .8, -90, H + 90)]); }
    boilSeed('s02 duvet'); paint(pts, { wash: P.cover, ink: P.ink, sw: 1.6, curv: .4 });
    boilSeed('s02 duvet shade'); paint(pts.map(([x, y]) => [lerp(cx, x, .8), clamp(lerp(cy, y, .8) + r * .06, -90, H + 90)]), { wash: P.coverDk, washOp: 110, ink: null, curv: .4 });
    for (let i = 0; i < 7; i++) {
      boilSeed('s02 duvet fold' + i); const a = (i / 7 + .05) * TAU, r0 = r * .25, r1 = r * (.85 + .2 * hash(i));
      inkLine([[cx + Math.cos(a) * r0 * 1.25, cy + Math.sin(a) * r0 * .8], [cx + Math.cos(a + .12) * (r0 + r1) / 2 * 1.25, cy + Math.sin(a + .12) * (r0 + r1) / 2 * .8], [cx + Math.cos(a + .05) * r1 * 1.25, cy + Math.sin(a + .05) * r1 * .8]], 1.1, P.coverDk, 'inkfine', .5);
    }
    glow(cx, cy, r * .9, SET_C.cyan, .22 * (1 - k));
    if (k > .96) flash(1, P.cover);
  }
  // a reaching arm (sleeve + bare forearm + a mitten hand) from a shoulder to a hand, painted with the figure's own colours
  function s02Arm(sh, hand, o = {}) {
    const c = HP(), L1 = o.L1 ?? 270, L2 = o.L2 ?? 270, el = himIK(sh, hand, L1, L2, o.bend ?? -1), d = Math.hypot(hand[0] - el[0], hand[1] - el[1]) || 1;
    const dir = [(hand[0] - el[0]) / d, (hand[1] - el[1]) / d], wr = [hand[0] - dir[0] * 34, hand[1] - dir[1] * 34], k = o.s ?? 1;
    const up = himTube([sh, el, [lerp(el[0], wr[0], .45), lerp(el[1], wr[1], .45)]], [50 * k, 44 * k, 38 * k]);
    boilSeed('s02 arm sleeve' + (o.key || '')); paint(up.outline, { wash: o.sleeve || '#DCD8E4', ink: c.ink, sw: 1.1, curv: .3 });
    const fa = himTube([[lerp(el[0], wr[0], .4), lerp(el[1], wr[1], .4)], wr], [36 * k, 28 * k]);
    boilSeed('s02 arm fore' + (o.key || '')); paint(fa.outline, { wash: c.skin, ink: c.ink, sw: 1, curv: .3 });
    inkLine([up.L[1], up.L[2]].map(p => p), .7, c.inkSoft, 'inkfine', .3);
    // the hand: a palm and four fingers laid along `dir`, fingers curled by o.curl 0..1 (a slap is open and flat)
    const nx = -dir[1], ny = dir[0], cv = o.curl ?? 0, hs = 30 * k;
    const P = (a, b) => [hand[0] + dir[0] * a * hs + nx * b * hs, hand[1] + dir[1] * a * hs + ny * b * hs];
    boilSeed('s02 hand palm' + (o.key || '')); paint([P(-1.1, -.9), P(.1, -1.05), P(.7, -.8), P(.8, .75), P(.05, 1.0), P(-1.1, .85)], { wash: c.skin, ink: c.ink, sw: 1, curv: .5 });
    for (let i = 0; i < 4; i++) {
      const b = -.78 + i * .52, len = (1.15 + (i === 1 || i === 2 ? .2 : 0) - .05 * i) * (1 - .35 * cv);
      boilSeed('s02 hand finger' + i + (o.key || ''));
      paint([P(.55, b - .2), P(.55 + len, b - .18 + .1 * cv), P(.62 + len, b + .08 + .1 * cv), P(.55, b + .24)], { wash: c.skin, ink: c.ink, sw: .8, curv: .6 });
    }
    boilSeed('s02 hand thumb' + (o.key || '')); paint([P(-.5, -.9), P(.25, -1.55), P(.7, -1.55), P(.35, -.95)], { wash: c.skin, ink: c.ink, sw: .8, curv: .5 });
    inkLine([P(-.1, -.2), P(.4, -.05)], .5, c.skinDk, 'inkfine', .3);
  }

  // =============================================================================================================
  // 02A  22.33-27.91  7 a.m., the blinds closed, the duvet glowing. The alarm clock hops and rings (22.33); a hand slides out
  // of the duvet and slaps it quiet (~23.7); the glow does not move. The hand goes back (24.2-24.9). From 25.29 the duvet's
  // glow pulses up and beats the thin sun at the blinds ("your glow's the only sun"). 26.34 ("sun") a shadow-puppet her waves on
  // the duvet. 27.50 he throws the duvet up: it swells over the lens and covers the frame (the cut to 02B hides inside it).
  // reads: 22.33-23.40 room, thin sun, glowing duvet · 23.40-24.60 clock hops, the hand slaps it (the glow stays) · 24.60-25.29
  //        the hand goes back · 25.29-26.34 the duvet's glow beats the sun · 26.34-27.50 the puppet · 27.50-27.91 the duvet covers the lens
  // =============================================================================================================
  const A_SLAP = 23.72, A_BACK = 24.30, A_PUPPET = sylT('V1_2', 5, 26.22), A_THROW = 27.50;
  const R = SET_ROOM, A_LX = 640, A_CLOCK = [R.clock[0], R.clock[1]], A_SH = [R.bed[0] + 340, R.bed[1] - 345];
  function s02a(t, lt, dur) {
    const P = setRoomPal('morning'), cx = lerp(800, 940, kitEase.sine(lt / dur)), cy = lerp(1440, 1420, kitEase.sine(lt / dur));
    // the clock: rings and hops from the first beat; the slap stops it with a wobble
    const slap = kitEnv(t, A_SLAP, .04, .12), rung = t < A_SLAP ? 1 : 0, still = t >= A_SLAP + .12;
    const hop = rung ? 26 * Math.abs(Math.sin((t - T_A) * 9.5)) * (.55 + .45 * Math.sin((t - T_A) * 2.1)) : 0;
    // the hand: up and over the pillow, down on the clock, held, then back under the duvet
    const reach = kitMove(t, 23.34, A_SLAP, { ant: .12, over: .04, pre: .08 }) * (t < A_BACK ? 1 : 1 - kitMove(t, A_BACK, A_BACK + .55, { ant: .06, over: 0, pre: .05 }));
    const away = [A_SH[0] + 8, A_SH[1] + 4], onClock = [A_CLOCK[0] + 6, A_CLOCK[1] - 105 + 18 * slap];
    const lift = Math.sin(clamp(reach) * Math.PI) * 70 * (t < A_SLAP ? 1 : .3);
    const hand = [lerp(away[0], onClock[0], clamp(reach, -.2, 1.06)), lerp(away[1], onClock[1], clamp(reach, -.2, 1.06)) - lift];
    kitCam(lt, [[0, cx, cy, .78]], { drift: 4 });
    setRoom('morning', { t, res: .78, clock: false, covers: 'none', lights: false });
    setClock(R.clock[0], R.clock[1], 1, { pal: P, ring: rung ? 1 : still ? 0 : .5 * (1 - seg(t, A_SLAP, A_SLAP + .12)), jump: hop + 14 * slap, rot: still ? .09 * spring(t, A_SLAP + .1, 7, 22) : 0, t, key: 'live' });
    if (reach > .02) s02Arm(A_SH, hand, { curl: .15, bend: -1, key: 'a' });
    const lumpGone = t >= A_THROW + .05;
    if (!lumpGone) setCovers(R.bed[0], R.bed[1], 1, { pal: P, state: 'lump', key: 'live' });
    else setCovers(R.bed[0], R.bed[1], 1, { pal: P, state: 'flat', key: 'live' });
    // the light: thin sun at the blinds, the glow inside the duvet. After the slap the glow beats up and the sun fades behind it
    const beat = kitEnv(t, 25.29, .08, 1) , gk = t < 25.29 ? .62 : lerp(.62, 1, kitEase.sine(seg(t, 25.29, 26.2))) * (.8 + .2 * pulse(t, 4));
    setRoomLights('morning', { t, coverGlow: lumpGone ? 0 : gk, lump: A_LX, stripes: lerp(1, .35, kitEase.sine(seg(t, 25.29, 26.3))) });
    if (!lumpGone && t >= 25.29) glow(R.bed[0] + A_LX, R.bed[1] - 420, 760 * kitEase.sine(seg(t, 25.29, 26.3)), SET_C.cyan, .35 * (.7 + .3 * pulse(t, 4)));
    // the shadow puppet: a one-colour silhouette of the little her, waving, lit from inside the duvet
    if (t >= A_PUPPET && !lumpGone) {
      const k = kitOver(seg(t, A_PUPPET, A_PUPPET + .22), 1.5);
      const sw = Math.sin((t - A_PUPPET) * TAU * 1.9), wv = kitEase.sine(seg(t, A_PUPPET + .1, A_PUPPET + .35));
      ai(R.bed[0] + A_LX - 120, R.bed[1] - 250, 25 * k, { ...aiAct('wave', t, A_PUPPET + .1, { high: true }), reachR: [lerp(.55, 7.2 + 1.7 * sw, wv), lerp(-3.55, -7.0 - 1.0 * Math.abs(sw), wv)], handAR: -Math.PI / 2 + .8 * sw * wv, handKR: 3.4, armStretch: 5,
        form: 'chibi', t, seed: 22, silhouette: '#2A5A86', silOp: 225, noShadow: true, boilKey: 's02a puppet' });
    }
    camEnd();
    const lp = toScreen(R.bed[0] + A_LX, R.bed[1] - 330, { cx, cy, zoom: .78, rot: 0 });
    if (t >= A_THROW) s02Duvet(seg(t, A_THROW, T_B), lp[0], lp[1], P);
    // 01B's last frame is a cyan-white flash: it clears here
    kitFlash(.9 * (1 - kitEase.sine(seg(lt, 0, .3))), KIT.CYANW, { x: lp[0], y: lp[1] });
  }


  // =============================================================================================================
  // 02B  27.91-30.70  "What do I wear? What do I eat?" Two layers: the big phone in his hand (left, the little her inside) and him
  // at the wardrobe (right). The duvet falls away (27.91-28.17). He holds up two shirts; she points; the notification (28.26)
  // drops a cyan ✓ on the grey one and he throws the other away; he lifts a noodle cup and an apple (28.95); the second chime
  // (29.65) puts the ✓ on the noodles and he stands there slurping, face blank: she decides, he stopped choosing.
  // reads: 27.91-28.26 two shirts held up · 28.26-28.95 ✓ on the grey one, the other thrown · 28.95-29.65 noodles and apple (the same
  //        sentence again, read faster) · 29.65-30.70 ✓ on the noodles, he eats
  // =============================================================================================================
  const B_CAM = [3215, 1690, .9], B_X = 3290, B_Y = 2150, B_U = 27;
  const B_GREY = [B_X - 250, 1440], B_WARM = [B_X + 250, 1440], B_SH = .74;
  function s02DuvetOff(k, P) {                                              // the duvet slides down off the frame: its top edge travels from above the frame to below it
    if (k <= 0 || k >= 1) return;
    const y = lerp(-140, H + 200, kitEase.in2(k)), pts = [[-100, -140]];
    for (let i = 0; i <= 10; i++) pts.push([lerp(-100, W + 100, i / 10), y + 36 * Math.sin(i * 1.3 + 1) + 14 * hash(i * 2.2)]);
    pts.push([W + 100, -140]);
    boilSeed('s02 duvetoff'); paint(pts, { wash: P.cover, ink: P.ink, sw: 1.6, curv: .3 });
    for (let i = 0; i < 5; i++) { boilSeed('s02 duvetoff fold' + i); const x = W * (i + .5) / 5 + 40 * Math.sin(i * 2.7); inkLine([[x, -100], [x + 30 * Math.sin(i), y * .5], [x + 14, y - 30]], 1.1, P.coverDk, 'inkfine', .5); }
  }
  function s02b(t, lt, dur) {
    const P = setRoomPal('morning'), PD = setRoomPal('day');
    const lift = kitMove(t, 27.82, 28.10, { ant: .1, over: .07, pre: .08 });
    const tossK = seg(t, 28.46, 28.98), toss = t >= 28.46;
    const slingK = kitEase.sine(seg(t, 28.62, 28.95)), hung0 = t >= 28.95;
    const up2 = kitMove(t, 28.88, 29.12, { ant: .08, over: .06, pre: .07 });          // noodles and apple come up (the same gesture, smaller wind-up)
    const toMouth = kitEase.sine(seg(t, 29.78, 30.12)), eating = t >= 30.12;
    const slurp = eating ? Math.abs(Math.sin((t - 30.12) * 9)) : 0;
    // hands (world px). left = screen-left hand (his right when flipped)
    const lowL = [B_X - 170, 1900], lowR = [B_X + 170, 1900];
    let hL = [lerp(lowL[0], B_GREY[0], clamp(lift, -.2, 1.07)), lerp(lowL[1], B_GREY[1], clamp(lift, -.2, 1.07))];
    let hR = [lerp(lowR[0], B_WARM[0], clamp(lift, -.2, 1.07)), lerp(lowR[1], B_WARM[1], clamp(lift, -.2, 1.07))];
    if (toss) { const th = kitEase.in2(seg(t, 28.46, 28.62)); hR = [lerp(B_WARM[0], B_X + 420, th), lerp(B_WARM[1], 1380, th)]; if (t >= 28.62) hR = [lerp(B_X + 420, lowR[0], seg(t, 28.62, 28.95)), lerp(1380, 1800, seg(t, 28.62, 28.95))]; }
    if (t >= 28.62) hL = [lerp(B_GREY[0], 2700, slingK), lerp(B_GREY[1], 1590, slingK) - 140 * Math.sin(slingK * Math.PI)];                     // the grey shirt over his shoulder
    if (t >= 28.95) { hL = [lerp(B_X - 100, B_X - 250, up2), lerp(1800, 1450, up2)]; hR = [lerp(lowR[0], B_X + 250, up2), lerp(1800, 1440, up2)]; }
    if (t >= 29.78) hR = [lerp(B_X + 250, B_X - 96, toMouth), lerp(1440, 1462, toMouth) - 10 * slurp];
    if (t >= 29.95) hL = [lerp(hL[0], B_X - 250, seg(t, 29.95, 30.3)), lerp(hL[1], 1900, seg(t, 29.95, 30.3))];
    const face = himEmotions(t, [[T_B, 'neutral'], [29.0, 'neutral', { lid: .22, browIn: .05 }]], { take: .3 });
    kitCam(lt, [[0, B_CAM[0], B_CAM[1], B_CAM[2]], [dur, B_CAM[0] + 24, B_CAM[1] - 6, B_CAM[2] * 1.02]], { drift: 3 });
    setRoom('morning', { t, res: .78, clock: false, covers: 'none', stripes: .5, lights: false });
    setRoomLights('morning', { t, coverGlow: 0, stripes: .5 });
    if (hung0) setShirt(2700, 1590, .8, { pal: PD, kind: 'grey', rot: .06, key: 'live' });
    him(B_X, B_Y, B_U, { ...face, pose: 'stand', view: 'q', flip: true, outfit: 'home', toL: hL, toR: hR, handL: 'fist', handR: 'fist',
      mouth: eating ? (slurp > .5 ? 'A' : 'closed') : face.mouth, boilKey: 's02b him', seed: .2 });
    // the grey shirt he keeps: in his hand, then back on its hook in the wardrobe (ticked)
    const GH = [2700, 1590], hung = t >= 28.95;
    if (!hung) {
      const gx = t < 28.62 ? hL[0] : lerp(hL[0], GH[0], slingK), gy = t < 28.62 ? hL[1] : lerp(hL[1], GH[1], slingK), gs = lerp(B_SH, .8, slingK), gr = lerp(.04, .06, slingK);
      const c = setShirt(gx, gy, gs, { pal: PD, kind: 'grey', rot: gr, key: 'live' });
      if (t >= N1) { const k = kitOver(seg(t, N1, N1 + .12), 1.6); setCheck(c[0], c[1] - 20, 150 * k * gs, SET_C.cyan, { glow: .8 }); }
    }
    if (t < 28.96) {
      let wx, wy, wr = -.05;
      if (!toss) { wx = hR[0]; wy = hR[1]; } else if (t < 28.62) { wx = hR[0]; wy = hR[1]; wr = lerp(-.05, .5, seg(t, 28.46, 28.62)); }
      else { const k = seg(t, 28.62, 28.96), p = arcPt([B_X + 330, 1440], [B_X + 1100, 2300], 260, k); wx = p[0]; wy = p[1]; wr = .5 + 5 * k; }
      setShirt(wx, wy, B_SH, { pal: PD, kind: 'warm', rot: wr, key: 'live2' });
    }
    if (t >= 28.88 && t < 30.4) {                                           // the apple (left hand) and the noodles (right hand)
      const drop = seg(t, 29.95, 30.3), ay = lerp(hL[1] + 20, 2130, kitEase.in2(drop)), ax = hL[0] - 20 * drop;
      if (drop < 1) setApple(ax, ay + 70, .8, { pal: PD });
      else setApple(ax, 2200 - 14 * Math.abs(Math.sin((t - 30.3) * 8)) * Math.exp(-(t - 30.3) * 5), .8, { pal: PD });
    }
    if (t >= 28.88) {
      const nx = hR[0], ny = hR[1] + 70;
      setNoodles(nx, ny, .76, { pal: PD, t, key: 'live', steam: eating ? 0 : 1 });
      if (eating) { boilSeed('s02b noodles'); for (let i = 0; i < 2; i++) { const a = [nx - 10 - 14 * i, ny - 170 * .76 + 4], b = [nx - 70 - 6 * i, 1395 + 4 * i + 8 * slurp]; inkLine([a, [lerp(a[0], b[0], .5) - 10, lerp(a[1], b[1], .5) + 22 * (1 - slurp)], b], 1.3, SET_C.amber, 'ink', .5); } }
      if (t >= N2) { const k = kitOver(seg(t, N2, N2 + .12), 1.6); setCheck(nx + 36, ny - 80, 120 * k, SET_C.cyan, { glow: .5, key: 'n' }); }
    }
    camEnd();
    // the foreground: his hand holding the phone, the little her inside it (u 32)
    const PX = 360, PY = 560, PU = 235;
    glow(PX, PY, 520, SET_C.cyan, .35);
    const ptT = seg(t, 28.0, 28.2), pointing = t >= 28.0 && t < 29.62, hint = t >= 28.9 && t < 29.62;
    himPhone(PX, PY, PU, { grip: 'hold', outfit: 'home', screen: 'off', ang: -.06, thumb: [.2, .9], tap: pulse2(t, 9) * .0, boilKey: 's02b phone',
      content: S => {
        boilSeed('s02b glass'); paint(rectPts(-S.w / 2, -S.h / 2, S.w, S.h), { wash: '#10285A', ink: null });
        glow(0, S.h * .1, S.h * .7, SET_C.cyan, .5);
        const f = aiEmotions(t, [[T_B, 'eager'], [N2 + .25, 'smile']]);
        const act = t < 28.0 ? {} : t < N2 ? aiAct('point', t, hint ? 28.88 : 28.0, { dir: hint ? -.5 : -.05 }) : aiAct('nod', t, N2);
        ai(0, S.h * .46, 26, { ...f, ...act, form: 'chibi', view: 'front', pal: 'glow', t, seed: 6, noShadow: true, boilKey: 's02b her' });
      } });
    if (t < 28.17) s02DuvetOff(lt / .26, P);
  }


  // =============================================================================================================
  // 02D  33.49-36.28  the friend's phone on the desk, seen from above: grey bubbles, three grey dots that never move, and the
  // cyan light of the monitor along the top edge. Time-lapse: the day sweeps over it, night, day again (two shafts); a cobweb grows
  // over the phone and a little spider lets itself down. No character: the event is the picture. (Also drawn, sliding up, at the end of 02C.)
  // reads: 33.49-34.60 the grey dots do not move (against the cyan at the top edge) · 34.60-36.28 time-lapse, the web, the spider
  // =============================================================================================================
  const D_PH = [640, 580, 560];                                             // x, y, h of the grey phone (02E's phone lies on the same spot)
  function s02dScene(t, cy) {
    const night = kitEase.sine(seg(t, 34.15, 34.75)) * (1 - kitEase.sine(seg(t, 35.2, 35.75)));
    const PD = setRoomPal('day');
    camBegin(960, cy, 1);
    setSurface('desk', 'day', { res: 1 });
    glow(D_PH[0] + 60, D_PH[1] + 40, 520, '#FFF2D8', .12 * (1 - night));
    setPhone(D_PH[0], D_PH[1], D_PH[2], { rot: -.1, body: '#8E9099', key: 'friend', screen: S => setGroupScreen(S) });
    const wk = kitEase.sine(seg(t, 34.6, 36.1));
    const PW = { ...PD, web: '#5A5266', spider: '#2B2233' };
    setCobweb(D_PH[0] + 170, D_PH[1] - 250, 3.1, { pal: PW, k: wk, r: 150, a0: Math.PI * .42, a1: Math.PI * 1.02 });
    setSpider(D_PH[0] + 70, D_PH[1] - 270, 2.6, { pal: PW, drop: 180 * kitEase.sine(seg(t, 35.0, 36.2)) + 6, t });
    // the day sweeping over: a long warm shaft each side of the night
    const s1 = seg(t, 33.45, 34.55), s2 = seg(t, 35.2, 36.3);
    if (s1 > 0 && s1 < 1) { const x = lerp(-320, 2300, s1); setShaft([x - 350, -150], [x + 500, 1250], 360, '#FFC27A', .38 * Math.sin(s1 * Math.PI)); }
    if (s2 > 0 && s2 < 1) { const x = lerp(2300, -320, s2); setShaft([x - 500, -150], [x + 350, 1250], 360, '#FFF2D8', .38 * Math.sin(s2 * Math.PI)); }
    if (night > .01) { boilSeed('s02d night'); paint(rectPts(-60, -240, W + 120, H + 480), { wash: '#0A1030', washOp: 175 * night, ink: null }); }
    glow(W / 2, -90, 1250, SET_C.cyan, .5 + .3 * night);                    // her monitor, just above the frame
    glow(W / 2, 10, 520, SET_C.cyanW, .18 + .15 * night);
    camEnd();
  }
  function s02d(t, lt, dur) {
    const e = kitEase.sine(seg(lt, 0, .22));
    s02dScene(t, 540 - 90 * (1 - e));
  }

  // =============================================================================================================
  // 02C  30.70-33.49  the week calendar, face on (the little her in the left margin). Each beat she puts a cyan block into an empty
  // cell, then the rest fall in at once ("you fill the blanks": 31.40, nothing empty). 32.09 his amber fingertip comes in from the
  // right and presses the corner ↻ (32.26); 32.44 the picture rewinds (a brush scan band) and the same blocks go in again. The camera
  // tilts down to the desk in the last third of a second (02D slides up under it).
  // reads: 30.70-31.40 she fills cells · 31.40-32.09 all full · 32.09-32.44 the fingertip presses ↻ · 32.44-33.49 rewind, the same again
  // =============================================================================================================
  const C_S = setScr(430, 60, 1400, 740), C_N0 = 6;
  const C_CELL = i => { const S = C_S, gx0 = S.X(.1), gx1 = S.X(.9), gy0 = S.Y(.2), gy1 = S.Y(.88), cw = (gx1 - gx0) / 7, ch = (gy1 - gy0) / 4; return [gx0 + (i % 7) * cw, gy0 + Math.floor(i / 7) * ch, cw, ch]; };
  const C_FLY = [[-.06, .30], [.15, .50], [.36, .66]];                       // [throw, land] in the local time of the fill
  const C_HER = [215, 745, 40], C_PALM = [3.05, -4.75];
  function s02cBlock(x, y, w, h, k = 1) {
    boilSeed('s02c block' + Math.round(x / 7));
    setP(rrPts(x - w / 2, y - h / 2, w, h, C_S.h * .01), { wash: '#4FD4F5', ink: null });
    glow(x, y, w * .9, SET_C.cyan, .35 * k);
  }
  function s02cFill(u) {                                                    // how many cells are full at local time u
    let n = C_N0; C_FLY.forEach(f => { if (u >= f[1]) n++; });
    if (u >= .66) n = C_N0 + 3 + Math.floor(19 * kitEase.out2(seg(u, .66, .84)));
    return Math.min(28, n);
  }
  function s02c(t, lt, dur) {
    const rep = t >= 32.44, u = rep ? t - 32.44 : t - T_C, e = kitEase.sine(seg(t, T_D - .34, T_D));
    const filled = s02cFill(u), S = C_S;
    if (e > 0) {
      s02dScene(t, 540 - 90 * (1 - e));
      const sy = H * (1 - e);
      boilSeed('s02c glass'); paint(rectPts(-60, -60, W + 120, sy + 60), { wash: '#0D1530', ink: null });
      glow(W / 2, sy, 1100, SET_C.cyan, .55 * (1 - e * .5));
      inkLine([[-20, sy], [W / 2, sy + 2], [W + 20, sy]], 1.4, '#3C5E8A', 'inkfine', 0);
    } else setScreenFull('night');
    camBegin(960, 540 + H * e, 1);
    // the calendar. A press on ↻ lights it amber; the rewind band sweeps down it
    const press = kitEase.sine(seg(t, 32.26, 32.34)) * (1 - kitEase.sine(seg(t, 32.55, 32.8)));
    const cal = setCalendar(S, { filled, refresh: press, rewind: rep ? seg(t, 32.44, 32.8) : 0 });
    // her, in the left margin: carry a block, throw it (she faces the grid)
    let act = aiAct('clap', t, 1e9), blk = [];
    const ord = SET_CAL_ORDER;
    C_FLY.forEach((f, j) => {
      const cell = C_CELL(ord[C_N0 + j]), [cx, cy, cw, ch] = cell, tx = cx + cw / 2, ty = cy + ch / 2;
      if (u >= f[0] - .2 && u < f[0]) act = aiAct('carry', t, T_C + f[0] - .2 + (rep ? 32.44 - T_C : 0), { at: C_PALM });
      if (u >= f[0] && u < f[0] + .17) act = { ...aiAct('push', t, (rep ? 32.44 : T_C) + f[0]), propR: undefined };
      if (u >= f[0] && u < f[1]) blk.push([arcPt([C_HER[0] + C_PALM[0] * C_HER[2] + 40, C_HER[1] + C_PALM[1] * C_HER[2]], [tx, ty], 120, ease(seg(u, f[0], f[1]))), cw * .84, ch * .8, seg(u, f[0], f[1])]);
    });
    if (u >= .86) act = aiAct('clap', t, (rep ? 32.44 : T_C) + .84);
    if (t >= 32.0 && t < 32.44) act = { lookX: .8, lookY: -.7 };
    const f = aiEmotions(t, [[T_C - .3, 'eager'], [T_C + .75, 'smile'], [32.0, 'eager']]);
    ai(C_HER[0], C_HER[1], C_HER[2], { ...f, ...act, form: 'chibi', view: 'front', pal: 'glow', t: rep ? t - 32.44 + T_C : t, seed: 8, noShadow: true, boilKey: 's02c her' });
    blk.forEach(b => s02cBlock(b[0][0], b[0][1], b[1], b[2], b[3]));
    // his fingertip (amber), in from the right edge to the corner ↻
    const fin = seg(t, 32.0, 32.26), out = seg(t, 32.5, 32.8);
    if (t >= 32.0 && t < 32.85) {
      const tip0 = [2060, 330], tip1 = [cal.refresh[0] - 30, cal.refresh[1] - 22], k = kitEase.sine(fin) * (1 - kitEase.sine(out)), pr = Math.sin(clamp((t - 32.26) / .26) * Math.PI);
      const tip = [lerp(tip0[0], tip1[0], k), lerp(tip0[1], tip1[1], k) + 10 * pr], base = [tip[0] + 560, tip[1] + 360], mid = [lerp(tip[0], base[0], .45), lerp(tip[1], base[1], .45) - 20];
      const dl = Math.hypot(base[0] - tip[0], base[1] - tip[1]), dir = [(base[0] - tip[0]) / dl, (base[1] - tip[1]) / dl], ang = Math.atan2(dir[1], dir[0]);
      const tc = [tip[0] + dir[0] * 34, tip[1] + dir[1] * 34], fg = himTube([tc, mid, base], [68, 82, 112]), c = HP(), tipA = Math.atan2(-dir[1], -dir[0]);
      let cap = []; for (let i = 1; i < 8; i++) { const a = tipA + (i / 8 - .5) * Math.PI; cap.push([tc[0] + Math.cos(a) * 34, tc[1] + Math.sin(a) * 34]); }
      const R0 = fg.R[0], d0 = Math.hypot(cap[0][0] - R0[0], cap[0][1] - R0[1]), d1 = Math.hypot(cap[6][0] - R0[0], cap[6][1] - R0[1]); if (d1 < d0) cap.reverse();
      boilSeed('s02c finger'); paint(fg.outline.concat(cap), { wash: '#FFB070', washOp: 240, ink: c.ink, sw: 1.1, curv: .3 });
      boilSeed('s02c nail'); paint(ellPts(tc[0] + dir[0] * 4, tc[1] + dir[1] * 4, 15, 22, 12, 0, ang + Math.PI / 2), { wash: '#FFE4C8', washOp: 200, ink: '#8A4E2A', sw: .5 });
      glow(tip[0], tip[1], 120, SET_C.amber, .4 + .5 * pr);
    }
    camEnd();
  }


  // =============================================================================================================
  // 02E  36.28-39.07  "you're there before I'm even through". Front-left: his hand and the phone (the same spot the grey phone had in
  // 02D, now cyan); behind it, right: his face. His thumb writes a slow amber line; at 37.00 a cyan line starts behind it, passes
  // it, finishes the sentence and sends it; her little ♥ comes back at once and his thumb is still in the air. 37.85 he freezes
  // (a take), then laughs. A light push onto his face from 37.85.
  // reads: 36.28-37.00 he types slowly · 37.00-37.85 the cyan line passes his, finishes, sends; ♥ · 37.85-39.07 he freezes, then laughs
  // =============================================================================================================
  const E_AM = 37.00, E_SEND = 37.52, E_HEART = 37.70, E_TAKE = 37.85, E_LAUGH = 38.30;
  const E_PH = [D_PH[0], D_PH[1]], E_PU = 272;
  function s02eLine(w, h, n, x0, y0, ph) {                                  // a cursive line (loops), the same curve for both colours
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = i / 64; pts.push([x0 + i * w * .84 / 64 + w * .028 * Math.cos(i * .95 + ph), y0 + h * .028 * Math.sin(i * .95 + ph)]); }
    return pts;
  }
  function s02e(t, lt, dur) {
    const push = kitEase.sine(seg(t, E_TAKE, T_F)), zoom = 1.5 * (1 + .03 * push), P = setRoomPal('day');
    kitCam(lt, [[0, 2300, 1440, zoom]], { drift: 2 });
    setRoom('day', { t, res: 1.4, covers: 'none', clock: false, stripes: 0 });
    camEnd();
    boilSeed('s02e dim'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: '#1A1430', washOp: 130, ink: null });
    // his face (3/4, looking left at the phone): the screen's light on it
    const face = himEmotions(t, [[T_E, 'focused', { lookX: -.35, lookY: .3 }], [E_TAKE, 'blank'], [E_LAUGH, 'laugh']], { take: 1 });
    const U = 70 + 4 * push;
    glow(1330, 420, 560, SET_C.cyan, .3 + .25 * seg(t, E_AM, E_SEND));
    him(1340, 640, U, { ...face, pose: 'bust', view: 'q', flip: true, outfit: 'home', cut: 4.2, boilKey: 's02e him', seed: .5, glare: .5 });
    // the phone in his hand
    const typing = t < E_AM + .05, p = clamp((t - T_E - .08) / .72) * .4, thumbX = lerp(.2, .6, clamp(p / .4)), tap = typing ? Math.pow(Math.abs(Math.sin((t - T_E) * 8.5)), 3) : 0;
    const q = kitEase.in2(seg(t, E_AM, E_AM + .45)), sent = kitEase.sine(seg(t, E_SEND, E_SEND + .2)), hv = t >= E_HEART;
    glow(E_PH[0], E_PH[1], 520, SET_C.cyan, .3 * kitEase.sine(seg(t, T_E, T_E + .3)));
    himPhone(E_PH[0], E_PH[1], E_PU, { grip: 'hold', outfit: 'home', screen: 'off', ang: -.1, thumb: [typing ? thumbX : .62, typing ? .78 : .7], tap: typing ? tap : 0, boilKey: 's02e phone',
      content: S => {
        const w = S.w, h = S.h, g = kitEase.sine(seg(t, T_E, T_E + .28));
        boilSeed('s02e glass'); paint(rectPts(-w / 2, -h / 2, w, h), { wash: mixCol('#C4C6CC', '#0D1530', g), ink: null });
        glow(0, h * .05, h * .7, SET_C.cyan, .45 * g);
        const x0 = -w * .42, y0 = h * .3 - 90 * sent;
        const amber = s02eLine(w, h, Math.floor(64 * p), x0, y0, 0), cy = s02eLine(w, h, Math.floor(64 * q * (t >= E_AM ? 1 : 0)), x0, y0, 0);
        if (sent < 1) {
          if (amber.length > 1) { boilSeed('s02e amber'); inkLine(amber, 2.6, KIT.AMBER, 'ink', .5); }
          if (cy.length > 1) { boilSeed('s02e cyan'); inkLine(cy, 3.1, SET_C.cyan, 'ink', .5); glow(cy[cy.length - 1][0], cy[cy.length - 1][1], 60, SET_C.cyanW, .7); }
        }
        if (sent > 0) {   // the line becomes a bubble on his side
          const bw = w * .74, bx = w * .46;
          boilSeed('s02e bubble'); paint(rrPts(bx - bw, -h * .26, bw * sent, h * .12, h * .05), { wash: '#1A2550', ink: KIT.AMBER, sw: 1.2 });
          for (let i = 0; i < 2; i++) { boilSeed('s02e bar' + i); paint(rrPts(bx - bw + w * .06, -h * .245 + i * h * .045, (bw - w * .12) * (i ? .55 : .9) * sent, h * .02, h * .01), { wash: SET_C.cyan, washOp: 220, ink: null }); }
        }
        if (hv) {   // her answer, at once: the little her and a heart
          const f = aiFeel('heart', t);
          ai(-w * .2, h * .46, 17, { ...f, form: 'chibi', view: 'front', pal: 'glow', t, seed: 9, lod: 'thumb', noShadow: true, boilKey: 's02e her' });
          const k = kitOver(seg(t, E_HEART, E_HEART + .14), 1.7);
          setHeart(w * .14, h * .03, w * .46 * k, SET_C.fever, { glow: .7, key: 'e' });
        }
      } });
  }


  // =============================================================================================================
  // 02F  39.07-41.86  split screen. A vertical brush stroke cuts the frame (39.07). Left: the little her (u 48), bright cyan, never blinks,
  // still waving. Right: him at the desk, the window behind him going from sunset to deep night while he yawns (39.60), nods off, and
  // jerks awake (41.16). At the end the left panel shrinks into the phone on the pillow (02G) while the picture dissolves to it.
  // reads: 39.07-39.90 the two panels side by side · 39.90-41.16 he yawns, dozes, wakes · 41.16-41.86 she has not changed at all
  // =============================================================================================================
  const F_SPLIT = 960, F_YAWN = 39.60, F_WAKE = 41.16;
  const G_PH = [700, 330, 640];                                             // 02G: the pillow phone (centre x, y, height)
  function s02fWall() {                                                     // static painted wall of the right panel (the window is live)
    boilSeed('s02f wall'); paint(rectPts(-40, -40, W + 80, H + 80), { wash: '#2C2540', ink: null });
    for (let i = 0; i < 4; i++) { boilSeed('s02f bloom' + i); paint(ellPts(1100 + 300 * i, 300 + 220 * (i % 2), 420, 260, 22, 20), { fill: i % 2 ? '#3E3358' : '#241C38', fillOp: 90, bleed: .3, tex: .6, ink: null }); }
    boilSeed('s02f floorline'); inkLine([[900, 840], [1400, 846], [1980, 838]], 1.2, '#14102A', 'ink', .3);
    boilSeed('s02f desk'); paint(rectPts(900, 842, 1100, 260, .6), { wash: '#3A2A22', ink: '#14102A', sw: 1 });
  }
  function s02fRight(t, lt) {
    const dk = seg(t, T_F, T_G), dusk = mixCol('#D9806A', '#121838', kitEase.sine(clamp(dk * 1.25))), duskLt = mixCol('#F4B484', '#1E2858', kitEase.sine(clamp(dk * 1.25)));
    setScreenLayer('s02f wall', s02fWall);
    const PA = setRoomPal(dk < .5 ? 'dusk' : 'night');
    setBlinds(1080, 130, 620, 520, { pal: PA, open: 0, s: 1.1, key: 'f', sky: dusk, skyLt: duskLt });
    glow(1390, 380, 760 * (1 - dk), '#FF9A6A', .45 * (1 - dk));            // the sunset in the window, going out
    glow(1000, 760, 800 * (.4 + .6 * dk), SET_C.cyan, .25 + .3 * dk);      // the monitor, off to his left: the only light left
    // him: a yawn, eyes sinking, three dips of the head, a jerk awake
    const yawn = kitEnv(t, F_YAWN, .25, .55) * (t < F_YAWN + 1 ? 1 : 0), yk = Math.sin(clamp((t - F_YAWN) / .8) * Math.PI);
    const dips = Math.max(0, Math.sin(clamp((t - 40.0) / .5) * Math.PI)) * .5 + Math.max(0, Math.sin(clamp((t - 40.5) / .5) * Math.PI)) * .7 + Math.max(0, Math.sin(clamp((t - 40.95) / .35) * Math.PI)) * .85;
    const wake = kitEnv(t, F_WAKE, .06, .22), lid = clamp(.1 + .75 * kitEase.sine(seg(t, F_YAWN + .5, F_WAKE - .1)) * (t < F_WAKE ? 1 : 0) - .5 * wake);
    const face = himEmotions(t, [[T_F, 'tired'], [F_YAWN - .1, 'tired', { eye: 'squeeze' }], [F_YAWN + .75, 'tired']], { take: .4 });
    him(1440, 700, 74, { ...face, pose: 'bust', view: 'q', flip: true, outfit: 'home', cut: 4.2, lid: Math.max(face.lid || 0, lid), mouth: yk > .15 ? 'gasp' : face.mouth,
      nod: (face.nod || 0) + .55 * dips + .6 * yk * .3 - .8 * wake, tilt: (face.tilt || 0) - .12 * wake, boilKey: 's02f him', seed: .9, glare: .3 + .4 * dk });
  }
  function s02fLeft(t, lt, k) {                                             // the left panel; k 0..1 shrinks it into the phone
    const rect = [lerp(0, G_PH[0] - G_PH[1] * 0 - G_PH[2] * .22, k), lerp(0, G_PH[1] - G_PH[2] * .42, k), lerp(F_SPLIT, G_PH[0] + G_PH[2] * .22, k), lerp(H, G_PH[1] + G_PH[2] * .44, k)];
    const w = rect[2] - rect[0], h = rect[3] - rect[1], cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2, rot = -.32 * k;
    push(); translate(cx, cy); rotate(rot); translate(-cx, -cy);
    boilSeed('s02f panel'); paint(rrPts(rect[0], rect[1], w, h, lerp(0, w * .08, k), 1), { wash: '#123A5A', ink: k > 0 ? SET_C.ink : null, sw: 1.2 });
    boilSeed('s02f panel bloom'); paint(ellPts(cx, cy + h * .08, w * .46, h * .4, 24, 18), { fill: '#2B6A98', fillOp: 120, bleed: .3, tex: .6, ink: null });
    glow(cx, cy, Math.max(w, h) * .8, SET_C.cyan, .5);
    const u = lerp(48, 30, k), f = aiEmotions(t, [[T_F - .3, 'perfect']]);
    ai(cx, rect[3] - h * lerp(.12, .1, k), u * h / H * lerp(1, 1.0, k) + u * (1 - h / H) * 0 , { ...f, ...aiAct('wave', t, T_F + .25), blink: 0, form: 'chibi', view: 'front', pal: 'glow', t, seed: 4, noShadow: true, boilKey: 's02f her' });
    pop();
  }
  function s02f(t, lt, dur) {
    const endK = kitEase.inOut3(seg(t, T_G - .26, T_G)), draw = (k) => { s02fRight(t, lt); s02fLeft(t, lt, k); if (k < .02) {   // the divider
        const cut = kitEase.sine(seg(lt, 0, .14)); boilSeed('s02f cut'); inkLine([[F_SPLIT, -20], [F_SPLIT + 4, H * cut * 1.1]], 9 * (1 - .7 * seg(lt, .1, .5)), KIT.CYANW, 'dry', 0);
        inkLine([[F_SPLIT - 2, -20], [F_SPLIT + 1, H]], 3, '#0B2A4A', 'ink', 0); if (lt < .3) glow(F_SPLIT, H / 2, 700 * (1 - lt / .3), SET_C.cyanW, .8 * (1 - lt / .3)); } };
    if (endK <= 0) draw(0);
    else kitXfade(seg(t, T_G - .24, T_G), () => draw(endK), () => s02g(T_G, 0, T_END - T_G));
  }

  // =============================================================================================================
  // 02G  41.86-44.65  three a.m. From above: he lies on his side on the pillow, the phone leaning beside his face with the little her in
  // it (u 30). He holds up one finger ("one more?"); she nods eagerly on every beat. 44.16 "Never.": she shakes her head, sweet, and a
  // heart pops; the camera starts to push into the phone and goes through its glass into the next shot's three dots.
  // reads: 41.86-42.90 him and the phone on the pillow · 42.90-44.13 the finger, her nods · 44.16-44.65 the shake and the heart, the push
  // =============================================================================================================
  const G_HAND = 42.90;
  function s02g(t, lt, dur) {
    const push = kitEase.expoIn(seg(t, N3 - .05, T_END)), zoom = lerp(1 + .06 * seg(lt, 0, dur), 2.05, push);
    const cx = lerp(960, G_PH[0] + 20, kitEase.sine(seg(t, N3 - .05, T_END))), cy = lerp(540, G_PH[1] + 30, kitEase.sine(seg(t, N3 - .05, T_END)));
    kitCam(lt, [[0, cx, cy, zoom]], { drift: 2 });
    setSurface('bed', 'night', { res: 1.25 });
    glow(G_PH[0], G_PH[1] + 40, 760, SET_C.cyan, .35);
    const f = himEmotions(t, [[T_G, 'tired'], [G_HAND, 'tired', { mouth: 'smile', browIn: -.5 }]], { take: .5 });
    const PN = setRoomPal('night');
    him(1080, 705, 34, { ...f, pose: 'sidelie', flip: true, outfit: 'home', armR: 'finger', coverW: .78, coverD: .66, coverCol: PN.cover, sheetCol: PN.sheet, boilKey: 's02g him', seed: .4 });
    // the phone on the pillow; the little her inside nods on every beat, and shakes at "Never."
    const sh = t >= N3;
    setPillowPhone(G_PH[0], G_PH[1], G_PH[2], { k: .8 + .2 * pulse(t, 4), screen: S => {
      boilSeed('s02g glass'); setP(setBox(S.x, S.y, S.x + S.w, S.y + S.h), { wash: '#10285A', ink: null });
      glow(S.X(.5), S.Y(.6), S.h * .6, SET_C.cyan, .5);
      const f2 = aiEmotions(t, [[T_G - .3, 'eager'], [N3, 'smile']]);
      ai(S.X(.5), S.Y(.88), 31 * S.h / 600, { ...f2, ...(sh ? aiAct('shake', t, N3) : aiAct('nod', t, T_G)), form: 'chibi', view: 'front', pal: 'glow', t, seed: 6, noShadow: true, boilKey: 's02g her' });
      if (sh) { const k = kitOver(seg(t, N3 + .1, N3 + .24), 1.7); setHeart(S.X(.5) + S.w * .22, S.Y(.34), S.w * .42 * k, SET_C.fever, { glow: .7, key: 'g' }); }
    } });
    camEnd();
    if (t > T_END - .14) kitFade(kitEase.sine(seg(t, T_END - .14, T_END)), '#0D1530');
  }

  const stub = (name) => (t, lt, dur) => { kitFade(1, '#1B2036'); letter(name, W / 2, H / 2, 60, '#E8FDFF', { screen: true, ink: false }); };
  shots([[T_A, s02a, { lyricMode: 'karaoke' }], [T_B, s02b, { lyricMode: 'karaoke' }], [T_C, s02c, { lyricMode: 'karaoke' }], [T_D, s02d, { lyricMode: 'karaoke' }], [T_E, s02e, { lyricMode: 'karaoke' }], [T_F, s02f, { lyricMode: 'karaoke' }], [T_G, s02g, { lyricMode: 'karaoke' }]]);
})();
