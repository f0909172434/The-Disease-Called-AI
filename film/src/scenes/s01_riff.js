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
  const WU = 150, WX = 700, WY = 600, WANG = 3.04;                          // his wrist: u 150, hand pointing up (a little right)
  const WD = [Math.sin(WANG), Math.cos(WANG)], WN = [-WD[1], WD[0]];       // along the hand, and across the wrist (the band's far -> near)
  const WAT = [WX + WD[0] * .2 * WU, WY + WD[1] * .2 * WU], WNEAR = [WAT[0] + WN[0] * .78 * WU, WAT[1] + WN[1] * .78 * WU];
  const PX = 1230, PY = 830, PH = 640, PW = PH * .5, PTOP = PY - PH / 2 + PW * .1;      // the phone lying on the desk (screen top edge = her ground while she climbs)
  const HER_U = 36, CLIMB0 = T_A + .02, CLIMB = .6, CLICK = kitCut(10, 1, 12.56);
  const herPos = t => {                                                     // where she stands (feet), world px
    const hop = seg(t, 11.74, 12.02), run = seg(t, 12.2, CLICK - .02), back = seg(t, CLICK + .6, CLICK + .9);
    let x = lerp(PX, 1010, kitEase.sine(hop)), y = lerp(PTOP, 715, kitEase.sine(hop)) - 90 * Math.sin(hop * Math.PI) * (hop < 1 ? 1 : 0);
    x = lerp(x, 975, kitEase.in2(run)) + 50 * kitEase.sine(back); y += 6 * kitEase.in2(run) + 20 * kitEase.sine(back);
    return [x, y];
  };
  function s01a(t, lt, dur) {
    const pk = kitEase.inOut3(seg(t, CLICK, T_B)), z = kitZoom(t, CLICK, T_B, 1, 1.5, kitEase.inOut3), cEnd = kitAnchor(WAT[0], WAT[1], 700, 560, 1.5);
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
    else if (t >= 13.55) act = aiAct('salute', t, 13.58);
    if (climbing || t < 11.2 + CLIMB) ai(PX, PTOP, HER_U, { ...f, ...aiClimb(t, CLIMB0, CLIMB), form: 'chibi', view: 'front', pal: 'glow', t, seed: 4, clip: climbing ? [PX - 300, PTOP - 700, PX + 300, PTOP] : null, noShadow: true, boilKey: 's01a her' });
    else ai(her[0], her[1], HER_U, { ...f, ...act, ...(t < 12.0 ? { dy: -.35 * Math.sin(seg(t, 11.74, 12.0) * Math.PI) } : {}), form: 'chibi', view: 'front', flip: false, pal: 'glow', t, seed: 4, noShadow: false, boilKey: 's01a her' });
    camEnd();
  }
  function lerp2(a, b, k) { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }

  shots([[T_A, s01a, { lyricMode: 'karaoke' }]]);
})();
