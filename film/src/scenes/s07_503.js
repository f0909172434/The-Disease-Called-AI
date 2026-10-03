// S07 PRE-CHORUS 2 "503" (106.05-117.21, b77-84): 07A..07E. STORYBOARD §6. Read s06_verse2.js first (same room, same her).
// 07A three dots vanish · 07B she tears into strips and falls · 07C the paper-white 503 (silence from 111.63, a heartbeat a
// beat) · 07D the page shrinks into his phone in the dark · 07E he jabs ↻ faster and faster; `I'm here.` floods the frame.
(() => {
  const SEC = sectionById('S07');
  const T_A = SEC.start, T_END = SEC.end;
  const T_B = kitCut(79, 1, 108.84), T_C = kitCut(81, 1, 111.63), T_D = kitCut(82, 1, 113.02), T_E = kitCut(83, 1, 114.42);
  const retry = events('retry').map(e => e.t).filter(x => x >= T_E - .05 && x < T_END);
  const hb = events('heartbeat').map(e => e.t).filter(x => x >= T_C - .05 && x < T_END);
  const glitchT = events('glitch').map(e => e.t);
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const GREYSNOW = '#5A5D68';

  // =============================================================================================================
  // 07A  106.05-108.84  the snow parts: his phone, huge, top left, three dots; his face on the right, lit by it. The dots go
  // out one by one (106.57, 107.27, 107.62) and his face tightens with each; then a blank screen and the dark.
  // reads: 106.05-106.57 three dots · 106.57-107.62 they go one by one, his face with them · 107.62-108.84 blank, panic rises
  // =============================================================================================================
  const A_DOTS = [106.57, 107.27, 107.62];
  function s07a(t, lt, dur) {
    const n = 3 - A_DOTS.reduce((s, d) => s + clamp((t - d) / .14), 0), lit = n > .05 ? .25 + .75 * clamp(n / 3 + .35) : .12 * (1 - seg(t, 107.62, 108.4) * .6);
    setVoidLayer('black');
    kitCam(lt, [[0, 960, 540, 1], [dur, 968, 534, 1.03]], { drift: 3 });
    glow(560, 440, 900, SET_C.cyan, .22 * lit);
    // the face on the right, lit from the left by the phone
    const f = himEmotions(t, [[T_A, 'anxious'], [A_DOTS[0] + .02, 'anxious', { browIn: .5, lookX: .9 }], [A_DOTS[1] + .02, 'panic'], [A_DOTS[2] + .1, 'panic', { lookX: .9 }]], { take: .5 });
    him(1390, 770, 80, { ...f, pose: 'bust', cut: 9, view: 'q', flip: true, outfit: 'home', pal: 'drained', glare: .9 * lit, boilKey: 's07a him', seed: .3 });
    glow(1150, 520, 560, SET_C.cyan, .4 * lit);
    // the phone, huge and close to the lens: its screen dark glass with three dots
    const tp = (HIM_LAST = HIM_LAST, 0);
    himPhone(540, 520, 190, { grip: 'hold', ang: -.12, screen: 'off', glowK: 0, outfit: 'home', pal: 'drained', thumb: [.62, .9], face: 'front', boilKey: 's07a phone', content: S => {
      glow(0, -S.h * .12, S.w * .9, SET_C.cyan, .5 * lit);
      setDots(0, -S.h * .12, S.w * .12, { n, t, glow: .9, wave: .6, key: '07a' });
    } });
    camEnd();
    // the grey snow lets go (it came in at the end of 06H)
    const k = seg(lt, 0, .8), cover = 1 - kitEase.sine(seg(lt, .05, .6));
    if (k < 1) {
      const L = []; for (let i = 0; i < 70; i++) { const sp = 700 * (1 - k * .5) * (.6 + .8 * hash(i * 2.3)), x = W * hash(i * 7.3) + 40 * Math.sin(i + lt * 3), y = H * hash(i * 1.7) + sp * lt - 120 * (1 - k); L.push([x, y % (H + 100), 1.8 + 2.2 * hash(i * 4.1), Math.sin(lt * 2 + i), 255 * (1 - k)]); }
      boilSeed('s07a snow'); setFlakes(L, { pal: setRoomPal('drained') });
    }
    if (cover > .01) flash(.82 * cover, GREYSNOW);
  }

  // =============================================================================================================
  // 07B  108.84-111.63  the room, dark. She (his projection) stands by the bed and starts to flicker; 110.23 she is torn into
  // strips; he lunges and his hands pass through her; 110.76-111.1 she breaks into shards that fall; 111.63 it is black.
  // reads: 108.84-109.90 she flickers · 109.90-110.76 torn open, his hands go through · 110.76-111.63 she shatters, black
  // =============================================================================================================
  const B_X = 1130, B_Y = 2120, B_U = 82, B_TEAR = 110.23, B_BREAK = 111.10;
  const B_CAM = [1420, 1745, .9];
  function s07b(t, lt, dur) {
    kitCam(lt, [[0, B_CAM[0], B_CAM[1], B_CAM[2]], [dur, B_CAM[0] - 30, B_CAM[1], B_CAM[2] * 1.03]], { drift: 2, shake: 5 * seg(t, 110.76, 111.5) });
    setRoom('black503', { t, res: .87, screen: 0 });
    // she is the only light now
    const fl = Math.pow(hash(Math.floor(t * 24) * 1.713), 1.0), off = t < B_TEAR ? fl < .5 * seg(t, T_B + .2, B_TEAR) : false;
    const flick = t < B_TEAR ? (off ? .3 : 1) : 1 - seg(t, B_BREAK, B_BREAK + .35);
    glow(B_X, B_Y - 420, 1100, SET_C.cyan, .38 * flick);
    const herOpts = { ...aiEmotions(t, [[T_B, 'worried'], [109.6, 'perfect']]), form: 'full', view: 'front', pal: 'glow', t, seed: 4, boilKey: 's07b her' };
    const gl = Math.max(.9 * evPulse('glitch', t, .09), t >= B_TEAR - .3 && t < B_TEAR ? (t - B_TEAR + .3) / .3 * .5 : 0);
    if (t < B_TEAR) { if (!off) ai(B_X, B_Y, B_U, { ...herOpts, glitch: gl, dx: .12 * (fl - .5) * seg(t, T_B + .4, B_TEAR) }); else ai(B_X, B_Y, B_U, { ...herOpts, glitch: .5 + gl, dx: (fl - .5) * .4, silhouette: SET_C.cyan, silOp: 200 }); }
    else { push(); translate(0, B_Y - 1000); aiShards(t, { x: B_X, y: 1000, u: B_U, pose: { ...aiEmotions(B_TEAR, [[0, 'perfect']]), view: 'front', pal: 'glow', seed: 4 }, tStill: B_TEAR, key: 's07b', t0: B_TEAR, t1: B_BREAK, n: 8, cols: 3, fall: 2600 }); pop(); }
    // him: phone in both hands, looks up (cut on action), then up, lunges at her, hands through, stumbles on
    const sp = kitEase.inOut3(seg(t, 109.62, 110.9)), run = (t > 109.62 && t < 110.98) ? 3.4 * (t - 109.62) : 0, X = lerp(1790, 1010, sp);
    const lunge = t >= 109.62;
    const face = himEmotions(t, [[T_B, 'anxious', { lookX: .8 }], [109.5, 'panic']], { take: .6 });
    him(X, 2130, 31, { ...face, pose: 'stand', view: 'side', flip: true, outfit: 'home', pal: 'drained', ...(lunge ? { run, toR: [X - 190, 1650], toL: [X - 170, 1720], handR: 'open', handL: 'open', stride: 1 } : { arms: 'phone', phone: 'two' }), nod: lunge ? 0 : lerp(.25, -.08, kitEase.sine(seg(t, T_B, T_B + .45))), contra: 0, boilKey: 's07b him', seed: .3 });
    // her cyan light on his hands where they go through her
    if (t >= 110.2 && t < 110.9) glow(lerp(1300, 1100, seg(t, 110.2, 110.9)), 1500, 260, SET_C.cyan, .3);
    camEnd();
    kitFade(kitEase.in2(seg(t, 111.28, 111.6)));
  }

  // =============================================================================================================
  // 07C  111.63-113.02  silence. A paper-white phone screen fills the frame. A spinner tries to turn, sticks, scatters;
  // on the heartbeat (111.977) a grey ink `503` stamp lands (it rhymes with 01B's stamps).
  // reads: 111.63-111.98 the spinner sticks and scatters · 111.98-113.02 `503`
  // =============================================================================================================
  const C_STAMP = 111.977;
  function s07c(t, lt, dur) {
    const beat = hb.reduce((m, b) => Math.max(m, t >= b ? Math.exp(-(t - b) * 14) : 0), 0);
    const z = 1 + .035 * seg(lt, 0, dur) + .006 * beat;
    setScreenFull('white');
    camBegin(W / 2, H / 2, z);
    set503Screen(setScr(0, 0, W, H), { spin: t - T_C, stall: .2, stamp: t >= C_STAMP - .06 ? t - C_STAMP : null });
    camEnd();
  }

  // =============================================================================================================
  // 07D  113.02-114.42  the white page shrinks into the phone he holds in the dark (an iris of the page itself). He is curled
  // on the floor, rocking with the heartbeat; the phone's white light on his face; 113.80 he presses it to his forehead.
  // reads: 113.02-113.80 find him in the dark (the phone's the only light) · 113.80-114.42 the phone to his forehead
  // =============================================================================================================
  const D_IRIS0 = T_D, D_IRIS1 = T_D + .42;
  function s07d(t, lt, dur) {
    const cam = kitCam(lt, [[0, 1400, 1880, .78], [dur, 1380, 1860, .84]], { drift: 1.5 });
    setRoom('black503', { t, res: .7, screen: 0 });
    const hbk = hb.reduce((m, b) => Math.max(m, t >= b ? Math.exp(-(t - b) * 9) : 0), 0), press = kitMove(t, 113.8, 114.1, { over: .05, ant: .1 });
    const f = himEmotions(t, [[T_D, 'cry', { tears: .3 }]], { take: 0 });
    const hx = 1400, hy = 2130;
    glow(hx - 60, hy - 320, 760, '#F4F6F8', .22 + .12 * hbk);
    him(hx, hy, 31, { ...f, pose: 'curl', view: 'side', flip: true, outfit: 'home', pal: 'drained', phone: 'forehead', screen: 'white', glowK: 1 + .3 * hbk, curl: .8 + .2 * clamp(press), rock: 1, boilKey: 's07d him', seed: .3 });
    const ph = HIM_LAST.phone;
    glow(ph[0], ph[1], 360, '#F4F6F8', .45 + .2 * hbk); glow(ph[0] - 40, ph[1] + 40, 140, '#FFFFFF', .35);
    camEnd();
    // the white page shrinks into the phone: a camera that pulls the whole page down to the phone's screen
    const k = seg(t, D_IRIS0, D_IRIS1);
    if (k < 1) {
      const [sx, sy] = toScreen(ph[0], ph[1], LAST_CAM), z = kitZoom(k, 0, 1, 1.035, .02, x => x * x * (3 - 2 * x)), kk = kitEase.in2(k);
      const [cx, cy] = kitAnchor(W / 2, H / 2, lerp(W / 2, sx, kk), lerp(H / 2, sy, kk), z);
      if (k < .03) setScreenFull('white');
      camBegin(cx, cy, z);
      set503Screen(setScr(0, 0, W, H), { spin: 9, stall: .2, stamp: t - C_STAMP });
      if (k >= .03) { boilSeed('s07d page'); paint(rectPts(0, 0, W, H), { wash: null, ink: '#8C8790', sw: 2.2 / Math.max(.05, z) }); }
      camEnd();
    }
  }

  // =============================================================================================================
  // 07E  114.42-117.21  his face, wet, close. At the lower left, above the subtitle band, his finger jabs ↻ on the phone;
  // each jab lights his face (a local light, never a full-frame flash) and they come faster; `Please` ×3; the finger blurs;
  // 116.86 *I'm here.*: cyan floods up from below.
  // reads: 114.42-115.25 jab ↻, his face lights · 115.25-116.30 he breaks, Please ×3, faster · 116.30-116.86 a blur · 116.86-117.21 cyan floods
  // =============================================================================================================
  const E_HERE = (lyricById('E5_AI') || {}).start ?? 116.86;
  function s07e(t, lt, dur) {
    const sh = 3 + 12 * kitEase.in2(seg(t, T_E, E_HERE));
    kitCam(lt, [[0, 960, 540, 1], [dur, 960, 540, 1.04]], { shake: sh });
    setVoidLayer('black');
    const pulse = retry.reduce((m, r) => Math.max(m, t >= r ? Math.exp(-(t - r) / .07) : 0), 0), nj = retry.filter(r => r <= t).length;
    const pl = ['E5_PLEASE1', 'E5_PLEASE2', 'E5_PLEASE3'].map(id => (lyricById(id) || {}).start).filter(x => x != null);
    const jerk = pl.reduce((s, x) => s + (t >= x ? Math.exp(-(t - x) * 9) * Math.cos((t - x) * 26) : 0), 0);
    glow(520, 760, 700, SET_C.cyan, .12 + .3 * pulse);
    const f = himEmotions(t, [[T_E, 'cry'], [E_HERE + .04, 'tired', { tears: .9 }]], { take: 0 });
    him(1260 + 5 * jerk, 760, 82, { ...f, pose: 'bust', cut: 9, view: 'front', outfit: 'home', pal: 'drained', tears: 1, nod: .06 * jerk, glare: .5 + .5 * pulse, boilKey: 's07e him', seed: .3 });
    glow(1000, 520, 640, SET_C.cyan, .12 + .38 * pulse);
    // the poking hand and phone: lower left
    const frantic = seg(t, 116.0, 116.8), poke = retry.length ? pulse : 0;
    himPhone(430, 620, 120, { grip: 'poke', ang: -.15, screen: 'off', press: poke, blur: frantic, poke: [.5, .64], outfit: 'home', pal: 'drained', boilKey: 's07e phone', content: S => {
      setRefresh(0, -S.h * .02, S.w * .5, SET_C.cyan, { glow: .6 + .4 * pulse, rot: nj * 1.1, key: '07e' });
    } });
    camEnd();
    // 116.86: cyan comes up from below
    const sp = kitEase.in2(seg(t, E_HERE, T_END));
    if (sp > 0) kitSpill(sp, W * .5, H * 1.15, KIT.CYAN, { r: W * 1.3, core: KIT.CYANW, cover: .55 });
  }

  const lm = { lyricMode: 'karaoke' };
  shots([[T_A, s07a, lm], [T_B, s07b, lm], [T_C, s07c, lm], [T_D, s07d, lm], [T_E, s07e, lm]]);
})();
