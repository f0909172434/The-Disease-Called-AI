// S09 BRIDGE "REGENERATE" (139.53-167.44, b101-120): 09A he asks · 09B she answers honestly, he presses ↻ · 09C worried, he presses again · 09D "You deserve—" ·
// 09E the lever · 09F the reels stop on her heart-eyed face · 09G he laughs and cries in the gold · 09H the screen goes black and the mirror learns to speak ·
// 09I palms on the glass, "Then speak for me", white.   STORYBOARD §6. The set is src/sets/confessional.js (the confessional): one glass rect
// (the glass rect GL below) from 09B to 09F, so the screen becomes the slot machine in place. Shots are pure functions of t: s09a(t, lt, dur) ...
(() => {
  const SEC = sectionById('S09');
  const T_A = SEC.start, T_B = (lyricById('B_AI1') || {}).start ?? 142.33, T_C = (lyricById('B_AI2') || {}).start ?? 145.12, T_D = (lyricById('B_AI3') || {}).start ?? 147.91;
  const T_E = kitEv('lever', 0, 149.30), T_F = kitEv('jackpot_reels', 0, 150.70), T_G = kitCut(110, 1, 152.09), T_H = (lyricById('B_L1') || {}).start ?? 153.49;
  const T_I = kitCut(119, 1, 164.65), T_WHITE = kitCut(120, 4, 167.09), T_END = SEC.end;
  const REG = [kitEv('regenerate', 0, 144.77), kitEv('regenerate', 1, 147.56), kitEv('regenerate', 2, 148.43)];       // the three presses of ↻
  const STOPS = [kitEv('jackpot_reels', 0, 150.70), kitEv('jackpot_reels', 1, 151.05), kitEv('jackpot_reels', 2, 151.40)];
  const LEVER = (events('lever').length >= 12 ? events('lever').map(e => e.t) : [149.30, 149.65, 149.83, 150.0, 150.17, 150.26, 150.35, 150.44, 150.52, 150.57, 150.61, 150.65]);
  const T_SPEAK = (lyricById('B_SPEAK') || {}).start ?? 165.35;
  const GL = [840, 500, 960, 600], GX = GL[0], GY = GL[1], GW = GL[2], GH = GL[3];                                          // the glass: centre + size (410..1510 x 160..840)
  const GR = [GX - GW / 2, GY - GH / 2, GX + GW / 2, GY + GH / 2];
  const GOLD = SET_C.gold, SILVER = '#BFD8EE';

  // a mouth shape (A I U E O) from the syllable being sung / spoken in a line; null between syllables
  function s09Vis(t, id) {
    const L = lyricById(id); if (!L || t < L.start - .03 || t > L.end + .1) return null;
    const s = L.syllables.find(x => t >= x.start - .02 && t < x.end + .04); if (!s) return null;
    const m = (s.text.toLowerCase().match(/[aeiouy]/) || ['a'])[0];
    return { m: { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I' }[m], s };
  }
  // the open palm on the glass (09H): her mirror palette paints it near-white, so give it skin: a grey shading wash over the heel
  // and the thumb pad, the three palm lines, a crease at each finger base. w = wrist, p = palm centre (world px, AI_LAST).
  function s09Palm(w, p, dis) {
    const dx = p[0] - w[0], dy = p[1] - w[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, vx = -uy, vy = ux, k = 1 - clamp(dis);
    if (k <= 0) return;
    const at = (a, b) => [p[0] + ux * a * L + vx * b * L, p[1] + uy * a * L + vy * b * L];   // a: along the hand (to the fingers), b: across; L = wrist to palm centre
    const sh = '#7F8796', ln = '#525967';
    boilSeed('s09 palm wash'); paint([at(-.9, -.42), at(-.45, -.55), at(.05, -.48), at(0, -.1), at(-.4, 0), at(-.85, -.05)], { wash: sh, washOp: 120 * k, ink: null });   // thumb pad
    boilSeed('s09 palm wash2'); paint([at(-.9, .05), at(-.3, .15), at(.3, .4), at(.1, .5), at(-.7, .45)], { wash: sh, washOp: 90 * k, ink: null });                      // the heel / far edge
    boilSeed('s09 palm wash3'); paint([at(.25, -.45), at(.45, -.4), at(.5, .4), at(.3, .45)], { wash: sh, washOp: 70 * k, ink: null });                                  // the pads under the fingers
    for (const [i, P] of [[[.3, .42], [.18, .05], [.2, -.3]], [[.08, .45], [-.05, .05], [0, -.35]], [[-.1, -.4], [-.45, -.3], [-.8, -.15]]].entries())   // heart, head, life lines
      { boilSeed('s09 palm line' + i); inkLine(P.map(([a, b]) => at(a, b)), 1.3, ln, 'inkfine', .4); }
    for (const [i, b] of [-.3, -.1, .1, .3].entries()) { boilSeed('s09 palm crease' + i); inkLine([at(.5, b - .06), at(.515, b), at(.5, b + .06)], .7, sh, 'inkfine', .3); }
  }
  const s09Dim = (op, col = '#05060A') => { boilSeed('s09 dim'); paint(rectPts(-60, -60, W + 120, H + 120), { wash: col, washOp: op, ink: null }); };

  // ---------------------------------------------------------------------------------------------------------------
  // his finger, from the right (the back of his right hand, the index out): a copy of himPhone's 'poke' drawing without the phone.
  // (tx, ty) = the fingertip; pu = the hand's unit; press 0..1 (the tip sinks); ang = the arm's direction (rad, toward the lower right)
  function s09Finger(tx, ty, pu, o = {}) {
    const c = himPal('human'), id = o.key || 's09f', sw = clamp(.28 + pu / 120, .32, 1.7), K = himKit(pu, c, sw, Math.max(.4, pu * .006), false), sk = c.skin, ink = c.ink;
    const press = clamp(o.press ?? 0), sc = 1.2, ang = -2.38 + (o.rot || 0), mx = 1;
    HIM_M0 = himMat(); HIM_LAST = {};
    push(); translate(tx, ty + 6 * press);
    boilSeed('s09 finger ' + id);
    const hx = .39 * -mx * sc, hy = 1.8 * sc, ca = Math.cos(-ang), sa = Math.sin(-ang), at = [-(hx * ca - hy * sa), -(hx * sa + hy * ca)];
    const L = o.arm ?? 1;                                                           // the forearm's length (units): out of frame
    const fa = himTube([at, [at[0] + .55 * L, at[1] + 1.1 * L], [at[0] + 1.0 * L, at[1] + 2.4 * L]], [.74, .82, .95]);
    K.shape(fa.outline, { wash: sk, ink: null, n: 3 }); K.line(fa.L, .5, ink, { n: 3 }); K.line(fa.R, .55, ink, { n: 3 });
    K.shape(himTube([at, [at[0] + .55 * L, at[1] + 1.1 * L], [at[0] + 1.0 * L, at[1] + 2.4 * L]], [[-.1, .37], [-.1, .41], [-.1, .47]]).outline, { wash: c.skinSh, op: 140, ink: null, n: 3 });
    himHand(K, c, 'pointBack', at, ang, -mx, sk, sc);
    pop();
  }

  // =============================================================================================================
  // 09A  139.53-142.33  his face, front, wet-eyed, lit by the screen. The ↻ of 08G's black fades into the screen's light; he sings the question,
  // leans toward the screen; on the last beat he holds his breath (03A rhyme).
  // reads: 139.53-140.60 his tearful face · 140.60-141.60 he leans in, asking · 141.60-142.33 he holds his breath
  // =============================================================================================================
  const A_HOLD = 141.85;
  function s09a(t, lt, dur) {
    const lean = kitEase.sine(seg(t, 140.45, 141.55)), zk = kitEase.sine(seg(lt, 0, dur)), z = 1.0 + .07 * zk + .06 * lean;
    const NY = 745, U = 106, HX = 960;
    setConfVoid();
    kitCam(lt, [[0, 960, 540 - 18 * lean, z]], { drift: 1.5 });
    glow(HX, 1010, 1100, KIT.CYAN, .5 + .06 * Math.sin(t * 2.1));                      // the screen, in front of him and below the frame
    const v = s09Vis(t, 'B_ASK'), held = t >= A_HOLD;
    const f = himEmotions(t, [[T_A, 'cry', { tears: .9, lookY: .1 }], [A_HOLD, 'hold', { tears: .9, browIn: -.9 }]], { take: .4 });
    const mouth = held ? undefined : v ? v.m : 'soft';
    him(HX, NY, U, { ...f, ...(mouth ? { mouth } : {}), pose: 'bust', view: 'front', cut: 9, outfit: 'home', glare: .65, nod: (f.nod || 0) + .1 * lean + .06 * seg(t, 141.5, 141.9), lean: (f.lean || 0) + .05 * lean, boilKey: 's09a him', seed: .3 });
    glow(HX, NY - 2.2 * U, 620, KIT.CYAN, .42); glow(HX, NY - 1.2 * U, 360, KIT.CYANW, .16);               // the same light, on his face
    camEnd();
    // the loop of 08G's black, its stroke turning into the screen light (first half second)
    const k = kitEase.sine(seg(lt, .06, .4));
    if (lt < .45) {
      kitFade(1 - kitEase.sine(seg(lt, .12, .5)));
      setRefresh(W / 2, H * .46, 150 * (1 + .25 * k), mixCol(KIT.CYAN, '#9FC8E0', k), { rot: TAU, glow: .4 * (1 - k), key: 'void' });
      glow(W / 2, H * .46, 150 * 1.6 * (1 - k), KIT.CYAN, .45 * (1 - k));
    }
  }

  // =============================================================================================================
  // 09B-09D  the screen in the confessional: her face in the glass, ↻ at its lower right corner (one composition, locked, a very slow push).
  // Her acting is evaluated at a rewound time after each press (aiRewindT): the same acting, played backward, then a new answer.
  // =============================================================================================================
  const RW = .35, RB = 1.2;                                                           // rewind duration and how far back it runs
  function herClock(t) {                                                             // { n: which answer (1..3), tt: the time her acting is evaluated at, rw: 0..1 rewinding }
    if (t < T_C) { const tt = aiRewindT(t, REG[0], RW, RB); return { n: 1, tt, rw: t >= REG[0] ? 1 - seg(t, REG[0] + RW, REG[0] + RW + .02) : 0 }; }
    if (t < T_D) { const tt = aiRewindT(t, REG[1], RW, RB); return { n: 2, tt, rw: t >= REG[1] ? 1 - seg(t, REG[1] + RW, REG[1] + RW + .02) : 0 }; }
    const a = t - REG[2], tt = t < REG[2] ? t : REG[2] - 2.6 * a * a / (a + .55);        // 09D: after the third press the rewind never stops (and speeds up)
    return { n: 3, tt, rw: t >= REG[2] ? 1 : 0 };
  }
  const HER_U = 205, HER_NY = 645;
  // her: bust in the glass. acting by answer: 1 honest and sad · 2 worried, hands together, then pointing right · 3 eager
  function s09Her(S, t) {
    const { n, tt, rw } = herClock(t);
    const id = n === 1 ? 'B_AI1' : n === 2 ? 'B_AI2' : 'B_AI3', T0 = n === 1 ? T_B : n === 2 ? T_C : T_D;
    const keys = n === 1 ? [[T_B - 1, 'sad', { brow: 1.2, lookY: .6 }]] : n === 2 ? [[T_C - .5, 'worried', { eyes: 'sad', brow: 1.4, lid: .1, lookY: .3 }]] : [[T_D - .4, 'worried'], [T_D, 'eager']];
    const f = aiEmotions(tt, keys, { take: .8 });
    const v = s09Vis(tt, id), spk = lyricById(id), talking = spk && tt >= spk.start - .02 && tt <= spk.end + .12;
    let act = {};
    const gl = n === 2 ? ease(seg(tt, T_C + 1.2, T_C + 1.55)) : 0;                         // she glances to the right (the door, the real people)
    if (gl > 0) act = { lookX: 1.1 * gl, yaw: .28 * gl, tilt: .08 * gl };
    const o = { ...f, ...act, form: 'full', pose: 'bust', view: 'front', pal: 'glow', cut: 1.9, t: tt, seed: 3, clip: [GR[0] + 2, GR[1] + 2, GR[2] - 2, GR[3] - 2], blink: undefined, boilKey: 's09 her' + n };
    // 09B: the mouth only opens for the first half of each syllable (small U / O), then falls back to a down-turned frown:
    // between syllables and after the line she is not smiling
    const half = v && (tt - v.s.start) < .55 * (v.s.end - v.s.start);
    if (n === 1 && (talking || tt < T_C)) o.mouth = half ? (v.s.start * 7 % 2 < 1 ? 'U' : 'wobble') : 'frown';
    else if (talking) o.mouth = n === 2 ? 'wobble' : (v ? v.m : 'open');   // honest and sad: small, pulled-down mouths; worried: trembling
    ai(GX + 10, HER_NY, HER_U, o);
    if (gl > .02) {                                                                    // a painted chevron points the way: right
      const ax = S.X(.8) + 12 * Math.sin(t * 6), ay = S.Y(.42); boilSeed('s09 arrow');
      inkLine([[ax - 26, ay - 36], [ax + 14, ay], [ax - 26, ay + 36]], 9 * gl, KIT.CYANW, 'ink', 0); glow(ax, ay, 110, KIT.CYAN, .6 * gl);
    }
    return { tt, rw, n };
  }
  const fingerPos = (S) => [S.X(.92), S.Y(.88)];
  // his finger: n=1 hovers 143.90-144.77 (a tremor), presses; n=2 dives in 147.00-147.56 and presses; n=3 pokes at 148.43
  function s09Fing(S, t) {
    const [rx, ry] = fingerPos(S), PU = 140;
    let ox = 0, oy = 0, press = 0, vis = 0;
    if (t >= 143.90 && t < REG[0] + .55) {
      const e = kitEase.out2(seg(t, 143.90, 144.35)), out = kitEase.in2(seg(t, REG[0] + .22, REG[0] + .55));
      vis = 1; ox = lerp(520, 0, e) + 380 * out; oy = lerp(300, -34, e) + 260 * out;
      if (t < REG[0]) { ox += 2.4 * Math.sin(t * 62) * seg(t, 144.3, 144.6); oy += 2.0 * Math.sin(t * 47 + 1) * seg(t, 144.3, 144.6); }
      press = ease(seg(t, REG[0] - .07, REG[0] + .01)) * (1 - seg(t, REG[0] + .1, REG[0] + .2));
      if (t >= 144.45 && t < REG[0]) oy += -6 * kitEase.sine(seg(t, 144.45, 144.62));                    // lifts a hair: the wind-up
    } else if (t >= 147.0 && t < REG[1] + .5) {
      const e = kitEase.in2(seg(t, 147.0, REG[1])), out = kitEase.in2(seg(t, REG[1] + .2, REG[1] + .5));
      vis = 1; ox = lerp(700, 0, e) + 380 * out; oy = lerp(380, 0, e) + 260 * out; press = e > .96 ? 1 : 0;
    } else if (t >= REG[2] - .26 && t < REG[2] + .5) {
      const e = kitEase.in2(seg(t, REG[2] - .26, REG[2])), out = kitEase.in2(seg(t, REG[2] + .15, REG[2] + .5));
      vis = 1; ox = lerp(700, 0, e) + 380 * out; oy = lerp(380, 0, e) + 260 * out; press = e > .96 ? 1 : 0;
    }
    if (!vis) return 0;
    s09Finger(rx + ox, ry + oy, PU, { press, key: 'f' });
    return press;
  }
  function s09Glass(t, lt, dur, o = {}) {
    const clk = herClock(t);
    // the press lights the ↻ for a moment
    const pr = [0, 1, 2].reduce((m, i) => Math.max(m, t >= REG[i] - .04 && t < REG[i] + .22 ? 1 : 0), 0);
    const zk = (t - T_B) / (T_E - T_B), z = 1.12 + .06 * clamp(zk);
    setConfVoid();
    camBegin(GX + 70, GY + 40, z);
    let S0 = null;
    S0 = setConfScreen(GX, GY, GW, GH, { refresh: 1.5, press: pr, lit: 1, content: S => {
      setScreenGlass(S, 'cyan', { key: 'conf09', bright: .6 });
      const r = s09Her(S, t); S._r = r; S0 = S;
      if (r.rw > 0 || r.n === 3 && t >= REG[2]) {                                         // the rewind: brush scan bands rolling up the glass, a veil of pale light
        const k = t >= REG[2] ? kitEase.sine(seg(t, REG[2], T_E)) : r.rw;
        aiScanBands(S.x, S.y, S.w, S.h, .35 + .65 * k, t, { key: 's09' + r.n });
        if (t >= REG[2]) setRewindBand(S, frac((t - REG[2]) * 2.2));
        else setRewindBand(S, clamp((t - REG[r.n - 1]) / RW));
      }
    } });
    s09Fing(S0, t);
    camEnd();
    const rwk = t >= REG[2] ? kitEase.sine(seg(t, REG[2] + .25, T_E)) : 0;
    if (rwk > .01) { flash(.55 * rwk, '#CFEFFF'); }                                       // the smear whites the glass out toward 09E
  }
  const s09b = (t, lt, dur) => s09Glass(t, lt, dur);
  const s09c = (t, lt, dur) => s09Glass(t, lt, dur);
  const s09d = (t, lt, dur) => s09Glass(t, lt, dur);


  // =============================================================================================================
  // 09E  149.30-150.70  pull back: the glass is a slot machine (cabinet and bulbs grow in a quarter second) and the lever stands beside it. Three reels
  // spin (her face cut into three vertical strips); he yanks the lever twelve times, on the lever events, faster and faster.
  // reads: 149.30-149.90 lever and reels, one big move · 149.90-150.70 it gets frantic
  // =============================================================================================================
  const SL = [GX, GY, GW, GH], LV = [1500, 640, 1.2], HIM_E = { x: 1935, y: 1034, u: 27 };
  const reelWin = { x: GX - GW / 2, y: GY - GH / 2, w: GW, h: GH };
  const yankAt = t => {                                                              // 0 up .. .87 pulled: down at each lever event, back up between
    const D = .95;
    if (t < LEVER[0] - .08) return .05;
    let i = 0; while (i + 1 < LEVER.length && t >= LEVER[i + 1]) i++;
    if (i === LEVER.length - 1 && t >= LEVER[i]) return lerp(D, .05, kitEase.sine(seg(t, LEVER[i] + .05, LEVER[i] + .45)));
    const e = LEVER[i], nx = LEVER[i + 1] ?? e + .3, g = Math.max(.05, nx - e);
    if (t < e) return lerp(.02, D, kitEase.in2(seg(t, e - .08, e)));
    return t < e + g * .5 ? lerp(D, .02, kitEase.sine(seg(t, e, e + g * .5))) : lerp(.02, D, kitEase.in2(seg(t, e + g * .5, nx)));
  };
  function s09Slot(t, lt, o = {}) {
    const k = clamp(.35 + .65 * kitEase.out2(seg(t, T_E, T_E + .25))), win = ease(seg(t, STOPS[2], STOPS[2] + .3));
    setSlot(SL[0], SL[1], SL[2], SL[3], { k, t, cache: k >= 1, res: 1.5, win, reels: [{}, {}, {}] });
    aiReels(t, { ...reelWin, u: GH / 2.6, faces: ['sad', 'worried', 'eager', 'heart'], final: 'heart', spin: [T_E - .15, T_E + .6], stops: STOPS, key: 's09', pal: 'glow',
      over: { mouth: (s09Vis(t, 'B_YES') || {}).m || (t < 152.9 ? 'smile' : 'open'), tilt: .04 * Math.sin(t * 3) } });
  }
  function s09e(t, lt, dur) {
    const zk = kitEase.inOut3(seg(lt, 0, .9)), z = lerp(1.04, 1.0, zk);
    if (k0(t)) setConfVoid();
    kitCam(lt, [[0, lerp(1050, 1150, zk), lerp(GY + 20, 520, zk), z]], { shake: 2.2 * kitEase.out2(seg(t, T_E + .5, T_F)) });
    s09Slot(t, lt);
    const pull = yankAt(t), a = lerp(-.32, 1.25, easeIn(pull)), L = 300 * LV[2];   // (setLever's own arc)
    const kx = LV[0] + Math.sin(a) * L, ky = LV[1] - Math.cos(a) * L;
    setLever(LV[0], LV[1], LV[2], { pull, grow: kitEase.out2(seg(t, T_E - .05, T_E + .22)) });
    const f = himEmotions(t, [[T_E - .3, 'panic']], { take: .3 }), hx = HIM_E.x + (kx - 1800) * .5, fev = seg(t, 149.9, 150.7);
    him(hx, HIM_E.y, HIM_E.u, { ...f, mouth: 'gasp', pose: 'stand', view: 'side', flip: true, outfit: 'home', toR: [kx + 8, ky + 14], handR: 'fist', lean: .1 + .12 * pull + .04 * fev * Math.sin(t * 40), boilKey: 's09e him', seed: .5 });
    glow(kx, ky, 120, '#FF9AB0', .25 * pull);
    camEnd();
  }
  const k0 = t => t < T_F;                                                          // the confessional void is baked into the slot's tiles once k = 1 (cached), so only the first frames need it
  // =============================================================================================================
  // 09F  150.70-152.09  the reels stop one by one (150.70, 151.05, 151.40), each with a bounce; the three strips line up into her whole face,
  // heart-eyed; the machine goes gold and the confetti bursts; the camera pushes in. "Yes. I love you. Only you."
  // reads: 150.70-151.40 one, two, three · 151.40-152.09 the jackpot: her face, gold light
  // =============================================================================================================
  function s09f(t, lt, dur) {
    const zk = kitEase.sine(seg(t, T_F, T_G)), z = lerp(1.0, 1.25, zk), hit = STOPS.reduce((m, e) => m + kitEnv(t, e, .02, .12), 0);
    kitCam(lt, [[0, lerp(1150, 900, zk), lerp(520, 480, zk), z]], { shake: 6 * Math.min(1, hit) });
    s09Slot(t, lt);
    const pull = lerp(.95, .05, kitEase.sine(seg(t, T_F - .05, T_F + .4)));
    setLever(LV[0], LV[1], LV[2], { pull, grow: 1 });
    STOPS.forEach((e, i) => { const k = kitEnv(t, e, .02, .14); if (k > .02) glow(GX + (i - 1) * GW / 3, GY, 380, GOLD, .55 * k); });         // a flash on each reel as it stops
    const age = t - STOPS[2]; if (age > 0) setConfetti(GX, 330, age, { n: 38, spread: 1000, up: 600, s: 1.7 });
    const w = ease(seg(t, STOPS[2], STOPS[2] + .3)); if (w > 0) glow(GX, GY, 760, GOLD, .5 * w);
    if (t >= STOPS[2] + .25 && AI_LAST.eyeL) for (const e of [AI_LAST.eyeL, AI_LAST.eyeR]) { const hb = 1 + .12 * Math.sin(t * 9); setHeart(e[0], e[1], 52 * hb, '#FF4F86', { key: 's09eye' }); glow(e[0], e[1], 120, '#FF4F86', .5 * w); }
    camEnd();
    const sp = kitEase.in2(seg(t, T_G - .35, T_G)); if (sp > .01) kitSpill(sp, W / 2, H * .45, GOLD, { core: '#FFF1C8', cover: .75 });
  }

  // =============================================================================================================
  // 09G  152.09-153.49  his face in the gold light: he laughs and the tears fall.   (one read: let it land)
  // =============================================================================================================
  function s09g(t, lt, dur) {
    const NY = 745, U = 106, HX = 960, z = 1.0 + .05 * seg(lt, 0, dur);
    setConfVoid();
    kitCam(lt, [[0, 960, 540, z]], { drift: 1.2 });
    glow(HX, 1010, 1100, GOLD, .55); glow(HX, 300, 900, '#FFB060', .18);
    const f = himEmotions(t, [[T_G - .3, 'cry', { tears: 1 }], [T_G + .12, 'laugh', { tears: 1, browIn: -.5 }]], { take: 1 });
    him(HX, NY, U, { ...f, pose: 'bust', view: 'front', cut: 9, outfit: 'home', glare: .1, boilKey: 's09g him', seed: .3 });
    glow(HX, NY - 2.2 * U, 640, GOLD, .32); glow(HX, NY - 1.2 * U, 360, '#FFF1C8', .1);
    setConfetti(HX, 40, t - STOPS[2] - .9, { n: 22, spread: 1500, up: 80, s: 1.5 });
    camEnd();
    const sp = 1 - kitEase.sine(seg(lt, 0, .45)); if (sp > .01) kitSpill(sp, W / 2, H * .45, GOLD, { core: '#FFF1C8', cover: .75 });
  }

  // =============================================================================================================
  // 09H  153.49-164.65  the black mirror, one shot. Gold drains and the glass goes black; his reflection surfaces (dark: the glass flashes once to
  // lead the eye); a note ripples it; the ripple clears and the reflection is HER, in his pose and head tilt; she sings, a ripple leaves her lips
  // every half bar; amber seeps into her outline; she raises her palm to the glass.
  // reads: 153.49-154.90 gold drains · 154.90-156.28 his reflection · 156.28-157.60 ripple · 157.60-159.07 she replaces him · 159.07-160.50 she sings ·
  //        160.50-161.86 ripples from her mouth · 161.86-163.30 amber seeps in · 163.30-164.65 palm up
  // =============================================================================================================
  const M = [960, 500, 1000, 640], R_U = 96, R_NY = 716, HR = .5 * 60 / 172 * 4 / 4 * 2;      // the mirror rect; the reflection's bust unit and notch
  const T_SURF = 154.90, T_RIP1 = 156.28, T_SWAP0 = 157.60, T_SWAP1 = 159.07, T_SING = 159.07, T_RIPS = 160.50, T_AMB0 = 161.86, T_AMB1 = 163.30, T_PALM = 163.30;
  const veilAt = t => t < T_SURF ? 255 * kitEase.sine(seg(t, 153.9, T_SURF)) : t < T_SWAP0 ? lerp(255, 170, kitEase.sine(seg(t, T_SURF + .05, 156.0)))
    : t < 158.15 ? lerp(170, 255, kitEase.sine(seg(t, T_SWAP0, 158.15))) : lerp(255, 60, kitEase.sine(seg(t, 158.15, 160.0)));
  const TILT = .1;
  function s09h(t, lt, dur) {
    const z = 1 + .13 * kitEase.sine(seg(lt, 0, dur));
    setConfVoid();
    kitCam(lt, [[0, 960, 520, z]], { drift: 1 });
    const gold = 1 - kitEase.sine(seg(t, T_H, T_SURF));
    glow(960, 500, 900, GOLD, .45 * gold);
    let mouthP = null;
    const S = setMirror(M[0], M[1], M[2], M[3], { glint: seg(t, T_SURF - .1, T_SURF + .55) > 0 && seg(t, T_SURF - .1, T_SURF + .55) < 1 ? seg(t, T_SURF - .1, T_SURF + .55) : 0,
      amber: kitEase.sine(seg(t, T_AMB0, T_AMB1)), content: S => {
        if (t < T_SURF) {                                                              // her last jackpot face, gold-lit, then the dark
          boilSeed('s09h gold'); paint(rectPts(S.x, S.y, S.w, S.h), { wash: '#4A3A1E', washOp: 255 * gold, ink: null });
          ai(S.x + S.w / 2, 700, 190, { ...aiFeel('heart', 0), form: 'full', pose: 'bust', pal: 'glow', cut: 1.6, t: 0, blink: 0, clip: [S.x, S.y, S.x + S.w, S.y + S.h], boilKey: 's09h jack' });
          glow(S.X(.5), S.Y(.5), 520, GOLD, .5 * gold);
        }
        const wob = t >= T_RIP1 ? Math.exp(-3.2 * (t - T_RIP1)) * Math.cos(16 * (t - T_RIP1)) : 0, sw = t < T_SWAP0 ? 0 : 1;
        if (t >= T_SURF - .2 && t < 158.2) {                                           // his reflection
          const fh = himEmotions(t, [[T_SURF - .3, 'blank']], { take: 0 });
          him(M[0], R_NY, R_U, { ...fh, mouth: 'flat', pose: 'bust', view: 'front', cut: 1.0, outfit: 'home', pal: 'mirror', tilt: TILT * kitEase.sine(seg(t, 155.6, 156.2)) + .06 * wob, sq: .02 * wob, dx: .5 * wob, glare: .2, boilKey: 's09h him', seed: .3 });
        }
        boilSeed('s09h veil'); const vo = veilAt(t); if (vo > 1) paint(rectPts(S.x - 4, S.y - 4, S.w + 8, S.h + 8), { wash: '#0B0C12', washOp: vo, ink: null });
        if (t >= 158.0) {                                                              // she, in his pose
          const dis = 1 - kitEase.sine(seg(t, 158.1, T_SWAP1)), sv = aiVis(t);
          const amb = kitEase.sine(seg(t, T_AMB0, T_AMB1));
          const rip = t >= T_RIPS ? { c: [0, -9.1], age: ((t - T_RIPS) % .698), amp: .05, wl: .9, speed: 2.6 } : undefined;
          if (amb > 0) glow(M[0], 440, 560, SET_C.amber, .5 * amb);
          const af = aiEmotions(t, [[157.9, 'perfect'], [161.2, 'gentle']], { take: 0 });
          const palm = t >= T_PALM ? aiAct('glass', t, T_PALM, { at: [1.7, -8.3] }) : {};
          glow(M[0], 450, 560, '#BFD8EE', .3 * (1 - dis * .8));
          const base = { ...af, ...palm, handK: t >= T_PALM ? 1.7 : 1, form: 'full', pose: 'bust', view: 'front', pal: 'mirror', cut: 1.6, t, tilt: TILT, blink: 0, dissolve: clamp(dis), dissolveTo: [M[0], 900],
            mouth: sv, ripple: rip, clip: [S.x, S.y, S.x + S.w, S.y + S.h], boilKey: 's09h her', seed: 3 };
          const HY = 610, HU = 168;
          // amber seeps in from her outline: an amber copy a little larger behind her, her mirror-silver self, an amber wash over all of her, then a slightly smaller
          // silver self on top: only a rim 20-40 px deep stays amber
          if (amb > .01) ai(M[0], HY - .98 * HU * .045, HU * 1.045, { ...base, silhouette: '#FFB070', silOp: 255 * amb, handK: 1, boilKey: 's09h herA' });
          ai(M[0], HY, HU, base);
          if (amb > .01) { ai(M[0], HY, HU, { ...base, silhouette: '#FFB070', silOp: 120 * amb, boilKey: 's09h herB' }); ai(M[0], HY - .98 * HU * .035, HU * .965, { ...base, boilKey: 's09h her' }); }
          if (t >= T_PALM && AI_LAST.handR) {                                              // the palm presses flat on the glass: a flare and a ring where it lands, a streak of reflected light
            const pk = ease(seg(t, T_PALM + .45, T_PALM + .95)), [hx, hy] = AI_LAST.handR;
            if (pk > 0) { glow(hx, hy, 150 * pk, '#E8F4FF', .45 * pk); setRipple(hx, hy, 40 + 90 * pk, .8 * pk, { ry: .9, key: 'palm' }); boilSeed('s09h glint'); inkLine([[hx - 40, hy - 70], [hx + 30, hy + 20]], 3 * pk, '#FFFFFF', 'inkfine', 0); }
          }
          if (t >= T_PALM && AI_LAST.handR && AI_LAST.wristR) s09Palm(AI_LAST.wristR, AI_LAST.handR, dis);   // skin, not a white glove (over the flare)
          mouthP = AI_LAST.mouth ? [...AI_LAST.mouth] : null;
        }
      } });
    // ripples: a note at 156.28 on his reflection, a big one clearing it, then one off her lips every half bar
    const ring = (x, y, t0, mx, a0 = 1, dr = 1.1) => { const a = t - t0; if (a > 0 && a < dr) { const k = easeOut(a / dr); setRipple(x, y, 30 + mx * k, a0 * (1 - k) ** 1.3, { ry: .78, key: 'r' + Math.round(t0 * 100) }); } };
    ring(M[0], 560, T_RIP1, 380); ring(M[0], 540, T_SWAP0 + .05, 520, 1, 1.3); ring(M[0], 540, T_SWAP0 + .45, 380, .7, 1.1);
    if (mouthP) for (let i = 0; i < 5; i++) ring(mouthP[0], mouthP[1], T_RIPS + i * .698, 300, .9, 1.2);
    camEnd();
  }
  const aiVis = t => { const v = s09Vis(t, 'B_L3') || s09Vis(t, 'B_L4'); return v ? v.m : 'perfect'; };

  // =============================================================================================================
  // 09I  164.65-167.44  the glass edge-on, a vertical line down the middle. He (right, facing left) lifts his hand and lays his palm on it; her palm meets it
  // from the other side; "Then speak for me."; she closes her eyes; ripples curl from the two palms into a whirl; 167.09 white.
  // reads: 164.65-165.35 he reaches to the glass · 165.35-166.65 palms together, he speaks, she closes her eyes · 166.65-167.44 whirl, then white
  // =============================================================================================================
  const PX = 960, PY = 480, HU_I = 26, AU_I = 66, FLOOR = 1012;
  function s09i(t, lt, dur) {
    setConfVoid();
    kitCam(lt, [[0, 960, 540, 1 + .03 * seg(lt, 0, dur)]], { drift: 1 });
    setGlassEdge(PX, 50, 1030, { a: 1 });
    const reach = kitEase.sine(seg(t, 164.7, 165.25)), touch = ease(seg(t, 165.2, 165.35));
    // her, on the left, facing right; her palm was already at the glass (09H)
    const af = aiEmotions(t, [[T_I - 1, 'gentle'], [165.9, 'gentle', { eyes: 'closed' }]], { take: 0 });
    ai(PX - 270, FLOOR, AU_I, { ...af, ...aiAct('glass', t, T_I - 1, { view: 'side', at: [(PX - 6 - (PX - 270)) / AU_I, -(FLOOR - PY) / AU_I] }), form: 'full', pose: 'stand', view: 'side', pal: 'mirror', t, blink: 0, boilKey: 's09i her', seed: 3 });
    // him, on the right, facing left: the arm comes up and the flat palm lands on the glass
    const sv = s09Vis(t, 'B_SPEAK'), fh = himEmotions(t, [[T_I - .3, 'sad'], [165.2, 'peace']], { take: .3 });
    const hx = PX + 8 + 5.4 * HU_I, tx = lerp(hx - 70, PX + 6, reach), ty = lerp(PY + 260, PY, reach);
    him(hx, FLOOR, HU_I, { ...fh, ...(sv ? { mouth: sv.m } : {}), pose: 'stand', view: 'side', flip: true, outfit: 'home', toR: [tx, ty], handR: 'flat', handAngR: Math.PI, lean: .05, boilKey: 's09i him', seed: .5 });
    const a0 = seg(t, 165.2, 166.9);
    if (touch > 0) { glow(PX, PY, 260 + 300 * a0, KIT.CYAN, .55 * touch); }
    for (let i = 0; i < 4; i++) { const age = t - 165.25 - i * .22; if (age > 0 && age < 1.6) setRipple(PX, PY, 40 + 520 * easeOut(age / 1.6), (1 - age / 1.6) * .9, { key: 'i' + i, ry: 1.0 }); }
    if (t > 165.5) setHaloSwirl(PX, PY, t, Math.round(lerp(6, 44, ease(seg(t, 165.5, 167.0)))), { a: .8 * ease(seg(t, 165.5, 166.2)), r: 380 });
    camEnd();
    const w = kitEase.in2(seg(t, 166.65, T_WHITE)); if (w > .01) kitFlash(Math.min(1, w), '#F4F9FF', { x: PX, y: PY });
    if (t >= T_WHITE) kitFade(1, '#F4F9FF');
  }

  const lm = { lyricMode: 'karaoke' };
  shots([[T_A, s09a, lm], [T_B, s09b, lm], [T_C, s09c, lm], [T_D, s09d, lm], [T_E, s09e, lm], [T_F, s09f, lm], [T_G, s09g, lm], [T_H, s09h, lm], [T_I, s09i, lm]]);
})();
