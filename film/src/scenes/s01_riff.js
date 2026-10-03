// S01 RIFF "DIAGNOSIS" (11.16-22.33, b9-16, instrumental): 01A the band · 01B the chart. STORYBOARD §6.
// No vocals: the lower frame is free, but text still sits in the middle. Read src/scenes/README.md first.
(() => {
  const SEC = sectionById('S01');
  const T_A = SEC.start, T_B = kitCut(11, 1, 13.95), T_END = SEC.end;
  const kick = onsets('kick').filter(x => x >= T_A - .01 && x <= T_END + .3);       // the kick drum (S01 has the full kit)

  // =============================================================================================================
  // 01A  11.16-13.95  the desk from above, his left wrist beside the keyboard, the phone. Smash cut on the big drum: the
  // phone lights, the little her climbs out of it (11.16-11.76) dragging his patient band, hops across (11.8-12.0), pulls
  // it round his wrist and it snaps shut on b10's downbeat (12.56). His fingers twitch once. She pats it. The camera
  // pushes onto the band (12.56 on), and she salutes at the end (13.60).
  // reads: 11.16-11.90 she climbs out of the phone · 11.90-12.56 the band goes round the wrist and clasps · 12.56-13.60
  //        push in: the barcode and PATIENT: YOU · 13.60-13.95 she salutes
  // =============================================================================================================
  const WU = 165, WX = 700, WY = 650, WANG = 3.04;                          // his wrist: u 165, hand pointing up (a little right)
  const WD = [Math.sin(WANG), Math.cos(WANG)], WN = [-WD[1], WD[0]];       // along the hand, and across the wrist (the band's far -> near)
  const WAT = [WX + WD[0] * .2 * WU, WY + WD[1] * .2 * WU], WNEAR = [WAT[0] + WN[0] * .78 * WU, WAT[1] + WN[1] * .78 * WU];
  const PX = 1230, PY = 830, PH = 640, PW = PH * .5, PTOP = PY - PH / 2 + PW * .1;      // the phone lying on the desk (screen top edge = her ground while she climbs)
  const A_ZEND = 1.7;                                                      // the push ends here: the band's barcode is what 01B's chart takes over
  const BARCODE_A = [WAT[0] - WN[0] * .42 * WU, WAT[1] - WN[1] * .42 * WU];   // the band's barcode (world px; himWrist: at - n * .42 u)
  const HER_U = 36, CLIMB0 = T_A + .02, CLIMB = .6, CLICK = kitCut(10, 1, 12.56);
  const herPos = t => {                                                     // where she stands (feet), world px
    const hop = seg(t, 11.74, 12.02), run = seg(t, 12.2, CLICK - .02), back = seg(t, CLICK + .6, CLICK + .9);
    let x = lerp(PX, 1010, kitEase.sine(hop)), y = lerp(PTOP, 760, kitEase.sine(hop)) - 90 * Math.sin(hop * Math.PI) * (hop < 1 ? 1 : 0);
    x = lerp(x, 975, kitEase.in2(run)) + 50 * kitEase.sine(back); y += 6 * kitEase.in2(run) + 20 * kitEase.sine(back);
    return [x, y];
  };
  function s01a(t, lt, dur) {
    const pk = kitEase.inOut3(seg(t, CLICK, T_B)), z = kitZoom(t, CLICK, T_B, 1, A_ZEND, kitEase.inOut3), cEnd = kitAnchor(WAT[0], WAT[1], 700, 560, A_ZEND);
    camBegin(lerp(960, cEnd[0], pk), lerp(540, cEnd[1], pk), z);
    setSurface('desk', 'night', { res: 1 });
    // the phone: lit on the cut, settling to a steady glow
    const flare = kitEnv(t, T_A, .02, .35), lit = .75 + .25 * flare;
    glow(PX, PY - 150, 900, KIT.CYAN, .55 * lit + .3 * flare);
    setPhone(PX, PY, PH, { screen: S => { setP(setBox(S.x, S.y, S.x + S.w, S.y + S.h), { wash: mixCol('#1D6A96', '#CFF8FF', .25 + .6 * flare), ink: null });
      glow(S.X(.5), S.Y(.3), S.h * .6, KIT.CYANW, .6 * lit); }, glow: 0 });
    // his wrist, band and fingers
    const s = seg(t, CLICK - .36, CLICK), bandK = t < 11.74 ? 0 : t < CLICK - .36 ? .3 : .6 + .4 * s;
    const her = herPos(t), chest = [her[0] - 3.5 * HER_U, her[1] - 3.7 * HER_U];      // her left hand, stretched out to the band's end
    const end = t < 11.98 ? lerp2(WNEAR, chest, ease(seg(t, 11.74, 11.98))) : chest;
    himWrist(WX, WY, WU, { ang: WANG, bandK, bandEnd: end, clickT: CLICK, twitch: seg(t, CLICK + .12, CLICK + .42), outfit: 'launch', boilKey: 's01a wrist' });
    // her
    const p = (t - CLIMB0) / CLIMB, climbing = p < 1.05, f = aiEmotions(t, [[T_A, 'eager'], [CLICK + .3, 'smile']]);
    const grab = t >= 11.74 && t < CLICK + .5, pat = t >= CLICK + .1 && t < CLICK + .6;
    let act = {};
    if (!climbing && t < CLICK) act = { reachLW: end, reachR: [.7, -3.4], handL: 'fist', handR: 'fist', handAL: Math.PI, handAR: 1.9 };
    else if (t >= CLICK && t < 13.55) { const tap = Math.abs(Math.sin((t - CLICK - .1) * 10)) * (pat ? 1 : 0); act = { reachLW: [WNEAR[0] + 14, WNEAR[1] - 6 - 20 * tap], reachR: [.7, -3.3], handL: 'flat', handR: 'fist', handAL: Math.PI - .6, handAR: 1.9 }; }
    else if (t >= 13.55) act = { ...aiAct('salute', t, 13.58), handKR: 1.45, dy: -.25 * kitEnv(t, 13.62, .04, .12) };
    if (climbing || t < 11.2 + CLIMB) ai(PX, PTOP, HER_U, { ...f, ...aiClimb(t, CLIMB0, CLIMB), form: 'chibi', view: 'front', pal: 'glow', t, seed: 4, clip: climbing ? [PX - 300, PTOP - 700, PX + 300, PTOP] : null, noShadow: true, boilKey: 's01a her' });
    else ai(her[0], her[1], HER_U, { ...f, ...act, ...(t < 12.0 ? { dy: -.35 * Math.sin(seg(t, 11.74, 12.0) * Math.PI) } : {}), form: 'chibi', view: 'front', flip: false, pal: 'glow', t, seed: 4, noShadow: false, boilKey: 's01a her' });
    glow(PX, PY - 150, 1100, KIT.CYAN, .22 * lit + .12 * flare);                // the phone's light on his hand and on her
    camEnd();
  }
  function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }

  // =============================================================================================================
  // 01B  13.95-22.33  the patient chart on its clipboard (the same chart that hangs on the ward's footboard), match-cut from
  // the band's barcode to the chart's barcode, then a pull back that shows the whole chart and the heartbeat strip under it.
  // The title stamps land on the kicks (15.35 `病名為AI`, 16.74 `THE DISEASE CALLED A.I.`, the crash); the ECG trace beats
  // with the kick drum; from 19.53 its last three beats freeze into • • • and pulse. 20.93 a push toward the middle dot
  // that speeds up through the toms (21.63-22.24); 21.98 a cyan-white flash covers the cut.
  // reads: 13.95-15.35 pull back: a chart, a heartbeat line under it · 15.35-16.74 `病名為AI` · 16.74-18.14 `THE DISEASE
  //        CALLED A.I.` · 18.14-19.53 the ECG beats with the kick · 19.53-20.93 the last three beats become • • • ·
  //        20.93-21.98 push to the middle dot · 21.98-22.33 flash
  // End state for 02A's match cut: the middle dot at the screen centre (960, 540), radius ~35 px, cyan with a glow.
  // =============================================================================================================
  const CH = { x: 960, y: 530, s: .96 };                                    // the chart: centre and scale. Placed so every framing of the film stays inside the one 1920 x 1080 cache tile (res 1; the view never leaves it for z >= 1.02)
  const CHART_BARCODE = [CH.x + SET_CHART.barcode[0] * CH.s, CH.y + SET_CHART.barcode[1] * CH.s];
  const T_STAMP1 = kitCut(12, 1, 15.35), T_STAMP2 = kitCut(13, 1, 16.74), T_DOTS = kitCut(15, 1, 19.534) + .006, T_PUSH = kitCut(16, 1, 20.93), T_FLASH = 21.98;
  const BZ0 = 1.55, BZ1 = 1.02;                                              // pull back from the band's barcode (BZ0) to the framed chart (BZ1)
  const ecgRect = [CH.x + SET_CHART.ecg[0] * CH.s, CH.y + SET_CHART.ecg[1] * CH.s, SET_CHART.ecg[2] * CH.s, SET_CHART.ecg[3] * CH.s];
  function s01b(t, lt, dur) {
    const beats = Array.from(kick).filter(b => b <= t + .01 && b >= T_B - 3);
    // the camera. 1) the barcode stays where the band's barcode ended on screen, and the camera pulls back to frame the chart
    const cA = kitAnchor(WAT[0], WAT[1], 700, 560, A_ZEND), sx = 960 + (BARCODE_A[0] - cA[0]) * A_ZEND, sy = 540 + (BARCODE_A[1] - cA[1]) * A_ZEND;
    const a0 = kitAnchor(CHART_BARCODE[0], CHART_BARCODE[1], sx, sy, BZ0), ZOOM = (k0, k1, a, b) => k0 * Math.pow(k1 / k0, a) ;
    const pb = kitEase.sine(seg(t, T_B, T_B + 1.5));
    let cx = lerp(a0[0], CH.x, pb), cy = lerp(a0[1], CH.y, pb), z = ZOOM(BZ0, BZ1, pb);
    // 2) a very slow push while the stamps land, then toward the heartbeat strip as the last three beats turn into dots
    const slow = seg(t, T_B + 1.5, T_DOTS - .4), toStrip = kitEase.sine(seg(t, T_DOTS - .3, T_PUSH));
    z = ZOOM(z, 1.1, slow); z = ZOOM(z, 1.5, toStrip);
    cy = lerp(cy, CH.y + 180, toStrip); cx = lerp(cx, CH.x + 60, toStrip);
    // 3) the final push at the middle dot: slow, then faster and faster through the toms
    const [dotX, dotY] = ecgDots()[1], zEnd = 1.95, f = seg(t, T_PUSH, T_FLASH + .1), cEnd = kitAnchor(dotX, dotY, 960, 540, zEnd);
    if (t >= T_PUSH) { const z1 = 1.5, c1 = [CH.x + 60, CH.y + 180], p3 = kitEase.expoIn(f); z = z1 * Math.pow(zEnd / z1, p3); cx = lerp(c1[0], cEnd[0], easeIn(f)); cy = lerp(c1[1], cEnd[1], easeIn(f)); }
    const dr = kitDrift(t, 4, .25, 3), live = t < T_PUSH ? 1 : 0;
    camBegin(cx + live * dr[0] / z, cy + live * dr[1] / z, z);
    setChart(CH.x, CH.y, CH.s, { cache: true, bg: 'indigo', res: 1, stamp1: t - T_STAMP1, stamp2: t - T_STAMP2, ecg: { t, dotsT: T_DOTS, beats } });
    // the trace's head thumps with every kick
    const kk = Math.max(0, ...beats.map(b => kitEnv(t, b, .01, .09))), [ex, ey, ew, eh] = ecgRect;
    if (t < T_DOTS) glow(ex + ew, ey + eh * .62, eh * .6, KIT.CYAN, .7 * kk);
    camEnd();
    kitFlash(kitEnv(t, T_FLASH - .04, .04, .22) * (t >= T_FLASH - .04 ? 1 : 0), KIT.CYANW, { glowCol: KIT.CYAN });
  }
  // the three dots' screen-free (chart) positions: the same arithmetic as setECG, for aiming the camera at the middle one
  function ecgDots() {
    const [x, y, w, h] = ecgRect, span = 2.8, now = T_DOTS, last3 = Array.from(kick).filter(b => b <= T_DOTS).slice(-3), base = y + h * .62, amp = h * .42;
    return last3.map(b => [x + w * (1 - (now - b) / span), base - amp * .35]);
  }

  shots([[T_A, s01a, { lyricMode: 'karaoke' }], [T_B, s01b, { lyricMode: 'karaoke' }]]);
})();
