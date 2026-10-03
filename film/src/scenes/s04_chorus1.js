// S04 CHORUS 1 "發燒病房" (55.81-78.14, b41-56): 04A the lamp and the nurse · 04B the thermometer · 04C goodbye (the IV line) ·
// 04D forced awake · 04E the capsules · 04F the ribbons · 04G the plug that isn't · 04H silence. STORYBOARD §6.
// The ward is src/sets/ward.js (variant c1, world 3840 x 2700, fixed res 1 so the tile cache never re-paints during a move);
// him sits in bed (pose 'bed'), she is the full-size nurse. Every shot is a pure function of t.
(() => {
  const SEC = sectionById('S04');
  const T_A = SEC.start, T_B = kitCut(43, 1, 58.60), T_C = kitCut(45, 1, 61.40), T_D = kitCut(47, 1, 64.19), T_E = kitCut(49, 1, 66.98),
    T_F = kitCut(51, 1, 69.77), T_G = kitCut(53, 1, 72.56), T_H = kitCut(55, 1, 75.35), T_END = SEC.end;
  const crash = [T_A, kitCut(45, 1, 61.40), kitCut(49, 1, 66.98), kitCut(53, 1, 72.56)];   // the chorus's crash cymbals
  // a lyric syllable's start from the data (first syllable of `line` whose text starts with `pre`), else the storyboard's number
  const syl = (line, pre, fb) => { try { const L = lyricById(line), s = L.syllables.find(x => x.text.toLowerCase().startsWith(pre)); if (s) return s.start; } catch (e) {} return fb; };
  const T_GOODBYE = syl('C1_3', 'good', 62.79), T_YES = syl('C1_5', 'yes', 68.37), T_WORD = syl('C1_6', 'word', 71.16);

  // ---- the stage (world px of the ward set) ----
  const HIP = [1450, 1540], HU = 30;                    // him: the mattress under his hips, his unit
  const HER = [1115, 1965], AU = 82;                    // her feet on the island's front, her unit (she is 10 u tall = 820 px)
  const PORT = setWardPorts('c1')[0];                   // where the IV bag drips from
  const RES = 1;
  const lampBurst = t => crash.reduce((s, c) => s + 1.5 * kitEnv(t, c, .015, .30), 0);     // the lamp flares on each crash
  function ward(t, o = {}) {                            // the set + its light; fever pulses with the kick
    setWard('c1', { t, res: RES, flash: lampBurst(t) + (o.flash || 0), fever: (o.fever ?? .65) + .25 * pulse(t, 3) });
  }
  // him in bed at time t; o = extra options. Draws his IV line to the bag.
  function himBed(t, o = {}) {
    him(HIP[0] + (o.dx || 0), HIP[1] + (o.dy || 0), HU, { pose: 'bed', view: 'q', flip: true, outfit: 'home', coverCol: '#C8D4F0', iv: 1, ivTo: PORT, boilKey: 's04 him', ...o });
    return { ...HIM_LAST };
  }


  // whip-pan streaks: thin, translucent dry-brush bars across the frame (screen space), long and fast at `speed` 1
  function s04Streaks(speed, dir, seed) {
    if (speed <= .04) return;
    for (let i = 0; i < 20; i++) {
      boilSeed('s04streak' + seed + '_' + i);
      const y = H * (.05 + .9 * hash(i * 3.17 + seed)), len = W * (.25 + .8 * hash(i * 7.9 + seed)) * speed, h = 3 + 14 * hash(i * 1.3 + 2) * speed, x = W * hash(i * 5.3 + seed + 1) + dir * W * .3 * (1 - speed);
      paint(rectPts(x - len / 2, y - h / 2, len, h, .8), { wash: i % 3 ? '#9FD6F0' : '#2F3C7A', washOp: 150 * speed, ink: null });
    }
  }

  // =============================================================================================================
  // 04A  55.81-58.60  the lamp flares on the downbeat (the loader of 03C was its ring), the camera tilts down to the bed island,
  // she comes down out of the light and drops into a curtsy (lands 58.20, dips till the cut).
  // reads: 55.81-56.90 the lamp flares, the tilt finds the island and him smiling in bed · 56.90-58.60 she descends, curtsies
  // First frame: the ring lamp's centre at screen (960, 550), zoom 1 (03C's loader should end there).
  // =============================================================================================================
  const A_LAND = 58.20;
  function s04a(t, lt, dur) {
    // the tilt starts right after the flare and is done by ~56.7, so at 56.35 he already sits mid-frame on the island
    const k = kitMove(lt, .16, .86, { ant: .04, over: .03, pre: .08 });
    const cx = lerp(1850, 1345, k), cy = lerp(820, 1425, k), z = 1;       // frame 1 = SET_WARD.cam.lamp [1850, 820, 1]: the lamp centre at screen (960, 550), as 03C's loader ends
    const [dx, dy] = kitDrift(lt, 4, .35);
    camBegin(cx + dx, cy + dy, z);
    ward(t);
    // him: looks up at the lamp, then (she arrives) across at her
    const look = ease(seg(t, 57.2, 57.7));
    const hf = himEmotions(t, [[T_A, 'smile', { blush: .55, sweat: .3, lookY: -.5, lookX: 0 }], [57.3, 'smile', { blush: .7, sweat: .4, lookX: .55, lookY: .05 }]], { take: .5 });
    himBed(t, { ...hf, boilKey: 's04 him' });
    // her: out of the lamp (head of the descent at the lamp), a slanting path to her place, then the curtsy dip
    const t0 = 56.85, d = aiDescend(t, t0, A_LAND, 9.5);
    const p = ease(seg(t, t0, A_LAND)), hx = lerp(1215, HER[0], p);          // comes down on HIS LEFT (screen left), where she stands in 04B
    const f = aiEmotions(t, [[T_A, 'smile']], {});
    if (t >= t0 - .05) {
      if (d.beam > .02) aiBeam(hx, HER[1] - 8, AU, d.beam, { top: 700, w0: 1.1, w1: 1.9, key: 'a' });
      ai(hx, HER[1], AU, { ...f, ...d, form: 'full', view: 'front', pose: 'curtsy', pal: 'glow', t, boilKey: 's04 her' });
    }
    camEnd();
    // the burst: a short white bloom from the lamp on the downbeat (kept gentle: the lamp, not the whole frame)
    const [sx, sy] = toScreen(1850, 830, { cx: cx + dx, cy: cy + dy, zoom: z, rot: 0 });
    kitFlash(.55 * kitEnv(t, T_A, .01, .09), KIT.CYANW, { x: sx, y: sy, r: W * .8, wash: .6 });
  }

  // =============================================================================================================
  // 04B  58.60-61.40  the thermometer: her hand (already moving at the cut) puts it between his lips, the cyan column shoots up
  // (59.40-60.40), the lamp flares at 60.00, he flushes and starts to glow with sweat; she claps.
  // reads: 58.60-59.40 it goes into his mouth · 59.40-60.40 the column rises (flare at 60.00) · 60.40-61.40 flushed, sweating; she claps
  // =============================================================================================================
  const B_FLARE = kitCut(44, 1, 59.99);
  function s04b(t, lt, dur) {
    // pushed in on the two faces (the thermometer, its cyan column and his lips are the read); eases back for the clap
    kitCam(lt, [[0, 1318, 1205, 1.62], [1.8, 1318, 1200, 1.78], [2.8, 1325, 1245, 1.62]], { drift: 3 });
    ward(t, { flash: 1.3 * kitEnv(t, B_FLARE, .015, .22) });
    const lvl = ease(seg(t, 59.40, 60.40)), hot = ease(seg(t, 59.7, 61.0));
    const hf = himEmotions(t, [[T_B, 'smile', { blush: .6, lookX: .5 }], [59.45, 'smile', { blush: .9, sweat: .8, lid: .45, lookX: .4 }]], { take: .5 });
    const hl = himBed(t, { ...hf, mouth: t < T_B + .1 ? hf.mouth : 'parted', blush: lerp(.6, 1, hot), sweat: lerp(.2, 1, hot), thermo: false });
    // her hand: the thermometer's bulb end at his lips, held in a pinch
    const reach = kitMove(t, T_B - .12, T_B + .45, { ant: .0, over: .08 });
    const ang = -.42, hlen = .4 * 1.3 * AU, tipOff = 1.71 * hlen;
    const palm = [hl.mouth[0] - Math.cos(ang) * tipOff + 9, hl.mouth[1] - Math.sin(ang) * tipOff - 13];       // the bulb end between his lips
    const rest = [HER[0] + 70, HER[1] - 330];
    const f = aiEmotions(t, [[T_B, 'smile'], [60.45, 'heart', {}]], {});
    const clap = t >= 60.5 ? aiAct('clap', t, 60.5, { form: 'full' }) : {};
    const hand = t < 60.5 ? { reachRW: [lerp(rest[0], palm[0], clamp(reach)), lerp(rest[1], palm[1], clamp(reach)) - 14 * Math.sin(clamp(reach) * Math.PI) * (reach < 1 ? 1 : 0)], handR: 'pinch', handAR: lerp(-1.1, ang, clamp(reach)),
      propR: { kind: 'thermometer', level: lvl } } : {};
    ai(HER[0], HER[1], AU, { ...f, ...clap, ...hand, form: 'full', view: 'front', pal: 'glow', t, rot: .16 * ease(seg(t, T_B - .15, T_B + .3)), dy: (f.dy || 0) - .55 * ease(seg(t, T_B - .3, T_B + .2)), boilKey: 's04 her' });
    if (t < 60.5 && lvl > .02) glow(lerp(palm[0], hl.mouth[0], .45), lerp(palm[1], hl.mouth[1], .45), 70 + 50 * lvl, KIT.CYAN, .5 * lvl);       // the column's light, readable from afar
    camEnd();
  }

  // =============================================================================================================
  // 04C  61.40-64.19  goodbye (side view, the exit on the right): he hops down from the bed and stands, turns to wave at her (she waves
  // back, one hand on the IV stand), turns and walks right two steps; the line goes taut, snaps him back like a rubber band
  // (63.30), he lands on the bed on his back and bounces twice. She pats the covers.
  // reads: 61.40-62.40 he gets up and waves goodbye · 62.40-63.30 two steps right, the line pulls tight · 63.30-64.19 yanked back, lands, bounces
  // =============================================================================================================
  const C_ANCH = 2000, C_SEAT = HIP[1] + 8.2 * HU, C_FLOOR = 1930;            // where he sits (anchor x), the anchor y of the seat, and the floor he stands on
  const C_UP0 = T_C + .12, C_UP1 = T_C + .66, C_WAVE0 = T_C + .70, C_TURN0 = T_C + 1.02, C_WALK0 = T_C + 1.32, C_WALK1 = T_C + 1.92, C_PULL = T_C + 2.00, C_YANK = T_C + 1.98, C_LAND = T_C + 2.30;
  const HER_C = [1292, 1965], POLE = [1182, 1560];
  function himC(t, ex = {}) {
    const f = himEmotions(t, [[T_C, 'smile', { blush: .6, sweat: .2 }], [C_WAVE0, 'smile', { blush: .7, lookX: .4 }], [C_WALK0, 'smile', { blush: .5 }], [C_PULL - .25, 'anxious'], [C_YANK, 'panic'], [C_LAND + .05, 'blank', { sweat: .6, blush: .8 }]], { take: .5 });
    // the IV line: slack at first, drawn tight as he reaches the end of his walk, stays tight through the snap, slack again once he lands
    const ivSag = t < C_WALK0 ? 2.5 : t < C_LAND ? lerp(2.5, .2, ease(seg(t, C_WALK0 + .1, C_WALK1))) : lerp(.2, 2.5, ease(seg(t, C_LAND, C_LAND + .35)));
    const base = { outfit: 'home', iv: 1, ivTo: PORT, ivSag, boilKey: 's04 himC', ...f, ...ex };
    const rise = ease(seg(t, C_UP0, C_UP1)), hop = ease(seg(rise, .28, .62));
    const gy = lerp(C_SEAT, C_FLOOR, hop);
    if (t < C_UP0 && t >= T_C) return him(C_ANCH, C_SEAT, HU, { ...base, pose: 'edge', flip: true, seatH: 8.2, arms: 'lap', phone: false });
    if (t < C_TURN0) {                                                                                             // rise and wave, facing her (screen left)
      const w = kitMove(t, C_WAVE0, C_WAVE0 + .2, { over: .05, ant: .15 });
      return him(C_ANCH, gy, HU, { ...base, view: 'side', flip: true, rise, ...(t >= C_WAVE0 - .08 && t < C_TURN0 ? { armR: 'wave', wave: clamp(w), waveT: t } : {}) });
    }
    if (t < C_WALK0) {                                                                                             // the turn through the drawn key views
      const k = (t - C_TURN0) / (C_WALK0 - C_TURN0), v = k < .22 ? ['side', true] : k < .45 ? ['q', true] : k < .62 ? ['front', false] : k < .84 ? ['q', false] : ['side', false];
      return him(C_ANCH, C_FLOOR, HU, { ...base, view: v[0], flip: v[1], contra: 0 });
    }
    if (t < C_YANK) {                                                                                              // two steps right; the line goes tight
      const w = seg(t, C_WALK0, C_WALK1), pull = ease(seg(t, C_WALK1, C_PULL));
      return him(C_ANCH + 132 * w, C_FLOOR, HU, { ...base, view: 'side', walk: w, lean: -.1 * pull, tilt: -.08 * pull, ...(t >= C_WALK1 ? { walk: 1 } : {}) });
    }
    if (t < C_LAND) {                                                                                              // the snap: flung back along an arc
      const k = seg(t, C_YANK, C_LAND), y = ease(seg(k, 0, .5));
      return him(lerp(C_ANCH + 132, C_ANCH - 4.2 * HU, easeOut(k)), lerp(C_FLOOR, C_SEAT, easeIn(k)) - 190 * Math.sin(k * Math.PI), HU, { ...base, view: 'side', yank: y, rot: -.35 * Math.sin(k * Math.PI * .9) });
    }
    const a = t - C_LAND;                                                                                          // landed: onto his back on the bed, two bounces
    const b1 = Math.abs(Math.sin(a * 11)) * Math.exp(-a * 6.5) * 2.6, sq = .12 * Math.exp(-a * 9) * Math.cos(a * 22);
    return him(C_ANCH - 4.2 * HU + 5.6 * HU * .0, C_SEAT, HU, { ...base, pose: 'edge', seatH: 8.2, arms: 'lap', phone: false, fall: ease(seg(a, 0, .12)), dy: -b1, sq });
  }
  function s04c(t, lt, dur) {
    const w = kitWhipIn(lt, .2, 1);
    const [dx, dy] = kitDrift(lt, 3, .35, .6);
    const yk = kitEnv(t, C_YANK + .02, .02, .12) * (t < C_LAND + .1 ? 1 : .4);
    const [sx, sy] = shakeXY(t, 5 * yk);
    camBegin(2000 + w.dx + dx + sx, 1590 + dy + sy, .95);
    ward(t);
    himC(t);
    const hl = { ...HIM_LAST };
    // her: one hand on the IV stand, the other waves; at the snap she is pulled with the stand; then she pats the covers
    const pulled = kitEnv(t, C_YANK, .03, .22), pat = t >= C_LAND + .12;
    const f = aiEmotions(t, [[T_C, 'smile'], [C_YANK - .15, 'worried'], [C_LAND + .2, 'gentle']], { take: .6 });
    const wv = t >= T_C + .5 && t < C_YANK - .1 ? aiAct('wave', t, T_C + .5, { form: 'full' }) : {};
    const tap = Math.abs(Math.sin((t - C_LAND - .12) * 9)) * (pat ? 1 : 0);
    ai(HER_C[0], HER_C[1], AU, { ...f, ...wv, reachLW: [POLE[0] + 6 * pulled, POLE[1] - 16 * pulled], handL: 'grip', handAL: -1.57,
      ...(pat ? { reachRW: [1392, 1555 - 14 * tap], handR: 'flat', handAR: .3 } : {}),
      form: 'full', view: 'front', pal: 'glow', t, rot: .05 + .1 * pulled + (pat ? .12 : 0), boilKey: 's04 herC' });
    camEnd();
    s04Streaks(w.speed, 1, 4);
  }

  // =============================================================================================================
  // 04D  64.19-66.98  forced awake: his head drops onto the pillow (cut on action: the bounce of 04C's landing), seen in profile
  // lying down (the picture turned 90 degrees); he closes his eyes, the lamp steps up a level and his eyes are forced open (take); again,
  // faster; then she hangs in from the top of the frame, a finger hooked in the lamp's pull cord.
  // reads: 64.19-64.90 he shuts his eyes · 64.90-66.30 the lamp lights up a step and his eyes are pulled open, twice · 66.30-66.98 it is her
  // =============================================================================================================
  const D_NOTCH = [1500, 640], D_U = 112, D_LAMP = [880, 125], D_HY = 0;
  const D_STEPS = [kitCut(47, 3, 64.89), kitCut(48, 1, 65.59)];                    // the lamp lights up a level (b47 beat 3, b48 beat 1)
  const D_SHUT = [T_D + .22, D_STEPS[0] + .42], D_PEEK = T_D + 2.06;
  // the profile's temple arm + lens edge were light grey on pale skin: read as a white bar across the face. Same palette, dark thin metal frame.
  const dPal = () => HIM_PALS.s04dFrame || (HIM_PALS.s04dFrame = { ...himPal('human'), glass: '#5B5666', glassDk: '#2F2B3A' });
  function s04d(t, lt, dur) {
    const lampK = 1 + .42 * kitEase.sine(seg(t, D_STEPS[0], D_STEPS[0] + .06)) + .5 * kitEase.sine(seg(t, D_STEPS[1], D_STEPS[1] + .05)) + .35 * kitEnv(t, D_STEPS[0], .02, .18) + .45 * kitEnv(t, D_STEPS[1], .02, .2);
    setWardVoid('c1');
    const P = setWardPal('c1'), [lx, ly] = D_LAMP;
    // the bed under him: a mattress strip and the pillow, seen from the side
    boilSeed('s04d bed'); paint(setBox(-60, 820, W + 60, 900, 1), { wash: P.sheet, ink: P.ink, sw: 1 });
    paint(setBox(-60, 890, W + 60, H + 60), { wash: P.metalDk, ink: null });
    setPillow(D_NOTCH[0] - 4.0 * D_U, 826, 2.5, { pal: P, key: 'd' });
    // him, head back on the pillow: a bust turned a quarter turn (face up); the drop of the head on the cut
    const drop = -34 * Math.exp(-(t - T_D) * 9) * Math.cos((t - T_D) * 17) * (t > T_D ? 1 : 0);
    const shut = (a, b) => ease(seg(t, a, a + .1)) * (1 - ease(seg(t, b, b + .03)));
    const closed = Math.max(shut(D_SHUT[0], D_STEPS[0]), shut(D_STEPS[0] + .42, D_STEPS[1]), 0);
    const snap = kitEnv(t, D_STEPS[0] + .03, .02, .22) * .6 + kitEnv(t, D_STEPS[1] + .02, .015, .22) * 1;
    const f = himFeel('smile', t, { lid: clamp(closed) + (1 - closed) * .15, wide: clamp(snap), irisK: 1 - .14 * clamp(snap), browY: -.12 * clamp(snap), mouth: t < D_STEPS[0] ? 'soft' : 'parted', blush: .9, sweat: .7, low: 0 });
    push(); translate(D_NOTCH[0], D_NOTCH[1] + drop); rotate(-Math.PI / 2);
    him(0, 0, D_U, { ...f, pose: 'bust', view: 'side', outfit: 'home', pal: (dPal(), 's04dFrame'), cut: 3.2, boilKey: 's04 himD', glare: 0 });
    // profile spectacles: the engine's side view only has a temple arm + a lens edge line (a bar across the face), so draw the lens too:
    // a tilted pane in front of the eye (head-local units: x = toward the face, origin between the eyes; the bust's head centre sits 2.8 u up)
    { const hq = (a, b) => [a * D_U, (b - 2.8) * D_U + D_HY];
      boilSeed('s04d lens');
      paint([hq(.86, -.46), hq(1.56, -.44), hq(1.6, .4), hq(.9, .44)], { wash: '#CFEFFA', washOp: 70, ink: '#2F2B3A', sw: .9 });
      inkLine([hq(1.44, -.34), hq(1.46, .2)], 1.2, '#FFFFFF', 'inkfine', 0); }
    pop();
    // the covers over the cut end of the bust
    boilSeed('s04d cover'); paint([[D_NOTCH[0] + 90, 826], [D_NOTCH[0] + 130, 560], [D_NOTCH[0] + 330, 520], [W + 60, 580], [W + 60, 826]], { wash: P.blanket, ink: P.ink, sw: 1, curv: .4 });
    paint([[D_NOTCH[0] + 90, 826], [D_NOTCH[0] + 130, 560], [D_NOTCH[0] + 210, 548], [D_NOTCH[0] + 170, 830]], { wash: P.blanketLt, ink: null });
    // the lamp: its ring at the top (live), its light stepping up
    setRingLamp(lx, ly, 1.1, { pal: P, key: 'd' });
    setRingLampLight(lx, ly, 1.1, lampK, P.lamp);
    glow(D_NOTCH[0] - 4.0 * D_U, D_NOTCH[1] - 70, 420, P.lamp, .28 * lampK);
    // her: hanging in upside-down from the top edge, a finger through the lamp's cord
    const pk = kitOver(seg(t, D_PEEK - .26, D_PEEK), 1.4), cordFrom = [lx + 400, ly + 30];
    if (t > D_PEEK - .3) {
      const hy = lerp(-420, 120, clamp(pk));         // settles with the whole face in frame, eyes well below the top edge
      const af = aiEmotions(t, [[D_PEEK - .3, 'perfect'], [D_PEEK + .3, 'smile']]);
      ai(1650, 640 + hy, 110, { ...af, form: 'full', view: 'front', pal: 'glow', t, roll: Math.PI, reachRW: [cordFrom[0] + 40, cordFrom[1] + 190], handR: 'point', handAR: -1.2,
        propR: { kind: 'cord', from: cordFrom }, noShadow: true, boilKey: 's04 herD' });
    }
  }

  // =============================================================================================================
  // 04E  66.98-69.77  the capsules: she lifts a spoon with a glowing ✓ capsule, he opens his mouth like a chick and swallows on "yes"
  // (68.37); she lifts a second, ♥, and this time he is already leaning in to meet it.
  // reads: 66.98-68.00 spoon and ✓ capsule, his mouth open · 68.00-68.40 he swallows · 68.40-69.77 the ♥ capsule, he leans in
  // =============================================================================================================
  const E_IN = T_E + 1.12, E_SWALLOW = T_YES, E_SPOON2 = T_YES + .36, E_IN2 = T_YES + 1.0;
  function s04e(t, lt, dur) {
    kitCam(lt, [[0, 1322, 1215, 1.68], [dur, 1330, 1215, 1.82]], { drift: 3 });         // pushed in on both faces: the spoon, the capsule and his open mouth
    ward(t);
    const chew = kitEnv(t, E_SWALLOW, .03, .2), lean2 = kitMove(t, E_SPOON2 + .1, E_IN2 - .1, { ant: .0, over: .06 });
    const hf = himEmotions(t, [[T_E, 'smile', { blush: .8, sweat: .5, lookX: .5, lookY: -.2 }], [E_SWALLOW + .05, 'smile', { blush: 1, sweat: .6, lid: .8 }], [E_SPOON2, 'smile', { blush: 1, sweat: .6, lid: .6 }]], { take: .5 });
    const open1 = ease(seg(t, T_E + .45, T_E + .8)) * (1 - ease(seg(t, E_IN + .25, E_IN + .5))), open2 = ease(seg(t, E_SPOON2 + .1, E_SPOON2 + .4));
    const mouth = Math.max(open1, open2) > .5 ? 'A' : (hf.mouth || 'smile');
    const hl = himBed(t, { ...hf, mouth, dx: .9 * clamp(lean2), lean: .1 * clamp(lean2) - .05 * chew, nod: .5 * chew - .15 * Math.max(open1, open2) });
    // her spoon: up to his mouth, the capsule dropped in; then the second
    const ang = -.38, hlen = .4 * 1.3 * AU, bowl = 1.18 * hlen, rest = [HER[0] + 85, HER[1] - 400];
    const target = [hl.mouth[0] - Math.cos(ang) * (bowl + 6), hl.mouth[1] - Math.sin(ang) * (bowl + 6) + 4];
    const k1 = .74 * kitMove(t, T_E + .05, T_E + .6, { ant: .06, over: .04 }) + .26 * kitEase.in2(seg(t, E_IN - .3, E_IN)), k1b = 1 - kitEase.sine(seg(t, E_IN + .12, E_SPOON2));        // in, then out for the second
    const k2 = .74 * kitMove(t, E_SPOON2, E_SPOON2 + .45, { ant: .06, over: .04 }) + .26 * kitEase.in2(seg(t, E_IN2 - .3, E_IN2));
    const second = t >= E_SPOON2 - .02, k = second ? k2 : (t < E_IN + .12 ? k1 : k1b * Math.min(1, k1));
    const cap = !second ? (t < E_IN + .02 ? 'check' : null) : 'heart';        // the prop's own capsule is tiny: s04Pill below draws a big one on the spoon
    const palm = [lerp(rest[0], target[0], clamp(k)) , lerp(rest[1], target[1], clamp(k)) - 26 * Math.sin(clamp(k) * Math.PI)];
    const f = aiEmotions(t, [[T_E, 'eager'], [E_SWALLOW + .1, 'smile'], [E_SPOON2 + .2, 'heart']]);
    ai(HER[0], HER[1], AU, { ...f, reachRW: palm, handR: 'pinch', handAR: lerp(-1.0, ang, clamp(k)), propR: { kind: 'spoon', cap: null }, form: 'full', view: 'front', pal: 'glow', t,
      rot: .15 * ease(seg(t, T_E - .1, T_E + .4)), dy: (f.dy || 0) - .55 * ease(seg(t, T_E - .2, T_E + .2)), boilKey: 's04 herE' });
    // the marks pop in (one frame) over the spoon, then fade; light down his throat on the swallow
    const bowlPt = [palm[0] + Math.cos(ang) * bowl, palm[1] + Math.sin(ang) * bowl];
    if (cap) s04Pill([bowlPt[0] + 2, bowlPt[1] - 20], ang + .1, 70, cap, 'e' + cap);
    if (!second && t > T_E + .38 && t < E_IN - .05) { const a = seg(t, T_E + .38, E_IN - .05); setCheck(bowlPt[0] - 70, bowlPt[1] - 90 - 14 * a, 78, KIT.CYANW, { glow: .9 * (1 - a * .6), key: 'e1' }); }
    if (second && t > E_SPOON2 + .08 && t < E_IN2 + .1) { const a = seg(t, E_SPOON2 + .08, E_IN2 + .1); setHeart(bowlPt[0] - 70, bowlPt[1] - 90 - 14 * a, 64, SET_C.fever, { glow: .9 * (1 - a * .6), key: 'e2' }); }
    if (chew > .02) glow(hl.mouth[0] + 8, hl.mouth[1] + 70, 150, KIT.CYAN, .6 * chew);
    camEnd();
  }

  // a big glowing capsule (cream half, cyan half) with a ✓ or ♥ printed on the cyan half; len in world px; drawn live
  function s04Pill(c, a, len, mark, key) {
    const w = len * .44, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]], at = (x, y) => [c[0] + d[0] * x + n[0] * y, c[1] + d[1] * x + n[1] * y];
    const half = sd => { const p = []; for (let i = 0; i <= 10; i++) { const q = -Math.PI / 2 + Math.PI * i / 10; p.push(at(sd * (len * .5 - w * .5 + Math.cos(q) * w * .5), Math.sin(q) * w * .5)); } p.push(at(0, w * .5), at(0, -w * .5)); return p; };
    glow(c[0], c[1], len * 1.5, KIT.CYAN, .6);
    boilSeed('s04pill ' + key);
    paint(half(-1), { wash: '#FBF6EE', ink: '#241F2C', sw: 1.1 });
    paint(half(1), { wash: '#3FCBEE', ink: '#241F2C', sw: 1.1 });
    paint([at(-len * .4, -w * .3), at(len * .3, -w * .3), at(len * .3, -w * .15), at(-len * .4, -w * .15)], { wash: '#FFFFFF', washOp: 170, ink: null });
    const z = w * .3, m = at(len * .2, w * .02);
    if (mark === 'check') inkLine([[m[0] - z, m[1]], [m[0] - z * .2, m[1] + z * .8], [m[0] + z * 1.05, m[1] - z * .9]], 3.4, '#FFFFFF', 'ink', 0);
    else paint(setHeartPts(m[0], m[1], z * 1.7), { wash: '#FF4F85', ink: null });
  }

  // =============================================================================================================
  // 04F  69.77-72.56  ribbons: close on his face, her profile at the left edge; glowing strokes of symbols (no letters) stream from her
  // lips into his mouth along a curve; he closes his eyes and breathes them in; on "word" (71.16) he lights up from inside.
  // reads: 69.77-70.80 the ribbons flow from her to him · 70.80-72.56 he glows from within
  // =============================================================================================================
  const F_HIM = [1250, 745], F_HER = [330, 745], F_UH = 88, F_UA = 145;          // composed upward: his eyes ~.42H, mouth ~.55H, chest still above the subtitle-safe line (.76H)
  function s04f(t, lt, dur) {
    const z = lerp(1.0, 1.06, ease(lt / dur)), [dx, dy] = kitDrift(lt, 3, .3, 1.3);
    setWardVoid('c1');
    camBegin(960 + 60 * (z - 1) / .1 * .3 + dx, 540 + dy, z);
    const inner = ease(seg(t, T_F + 1.0, T_WORD + .25)) * (.8 + .2 * Math.sin(t * 9)), flare = kitEnv(t, T_WORD, .03, .3);
    const hf = himEmotions(t, [[T_F, 'smile', { lid: .5, blush: .8 }], [T_F + .9, 'peace', { blush: .9 }]], { take: .4 });
    him(F_HIM[0], F_HIM[1], F_UH, { ...hf, pose: 'bust', view: 'q', flip: true, outfit: 'home', cut: 2.4, mouth: t > T_F + .9 ? 'O' : 'parted', innerGlow: clamp(inner + .5 * flare), boilKey: 's04 himF' });
    const hl = { ...HIM_LAST };
    const af = aiEmotions(t, [[T_F, 'gentle']]);
    ai(F_HER[0], hl.mouth[1] + .38 * F_UA, F_UA, { ...af, pose: 'bust', view: 'side', form: 'full', pal: 'glow', t, cut: 2.1, mouth: ['A', 'O', 'E', 'O'][Math.floor(t * 8) % 4], boilKey: 's04 herF' });
    const m0 = [AI_LAST.mouth[0] + 8, AI_LAST.mouth[1]], m1 = [hl.mouth[0] + 6, hl.mouth[1] + 2];
    const grow = ease(seg(t, T_F, T_F + .5));
    s04Ribbons(t, m0, m1, grow, flare);
    if (inner > .02) {                        // the light from inside: throat, then chest (both kept above the subtitle-safe line)
      const th = ease(seg(t, T_F + 1.0, T_WORD + .1)), ch = clamp(ease(seg(t, T_WORD - .15, T_WORD + .35)) + .4 * flare);
      glow(hl.mouth[0] + 24, hl.mouth[1] + 105, 230, KIT.CYAN, .9 * th); glow(hl.mouth[0] + 24, hl.mouth[1] + 100, 110, KIT.CYANW, .6 * th);
      glow(hl.mouth[0] + 50, hl.mouth[1] + 195, 320, KIT.CYAN, .85 * ch); glow(hl.mouth[0] + 50, hl.mouth[1] + 190, 140, KIT.CYANW, .55 * ch);
    }
    camEnd();
  }
  // streams of abstract symbol strokes (dashes, waves, loops, dots) running m0 -> m1 along a bowed curve, three streams, ~24 tokens
  function s04Ribbons(t, m0, m1, grow, flare = 0) {
    const bow = (s, u) => { const mx = lerp(m0[0], m1[0], u), my = lerp(m0[1], m1[1], u); return [mx, my - Math.sin(u * Math.PI) * (150 + 70 * s) + Math.sin(u * 9 + t * 5 + s * 2) * 7 * Math.sin(u * Math.PI)]; };
    for (let s = 0; s < 3; s++) {                                                  // the glowing ribbons under the symbols
      const P = []; for (let i = 0; i <= 16; i++) P.push(bow(s, i / 16 * grow));
      boilSeed('s04f band' + s); paint(ribbon(P, 2, 9 + 4 * s), { wash: s % 2 ? '#7FE9FF' : '#BFF6FF', washOp: 70, ink: null });
      inkLine(P, 1.1, KIT.CYANW, 'inkfine', 0);
    }
    for (let i = 0; i < 24; i++) {
      const s = i % 3, u = frac(t * .62 + i / 24 + s * .13) * grow;
      if (u < .02) continue;
      const a = bow(s, u), b = bow(s, Math.min(1, u + .035)), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), sz = 16 + 14 * hash(i * 3.1), kind = i % 4, col = i % 2 ? KIT.CYANW : KIT.CYAN, pts = [];
      if (kind === 0) pts.push([-sz, 0], [sz, 0]);
      else if (kind === 1) for (let k = 0; k <= 8; k++) pts.push([-sz + 2 * sz * k / 8, Math.sin(k * 1.6) * sz * .4]);
      else if (kind === 2) for (let k = 0; k <= 10; k++) { const q = k / 10 * TAU; pts.push([Math.cos(q) * sz * .5, Math.sin(q) * sz * .5]); }
      else pts.push([-sz * .3, 0], [sz * .3, 0], [sz * .3, sz * .5]);
      const c = Math.cos(ang), sn = Math.sin(ang);
      boilSeed('s04f tok' + i);
      inkLine(pts.map(([x, y]) => [a[0] + x * c - y * sn, a[1] + x * sn + y * c]), 2.2 + 1.2 * hash(i), col, 'ink', .3);
      if (i % 4 === 0) glow(a[0], a[1], 60, KIT.CYAN, .55 + .3 * flare);
    }
  }

  // =============================================================================================================
  // 04G  72.56-75.35  headphones: he sways on the beat, eyes shut; she sings beside him and music notes float to the headphones; at 74.00 the
  // camera follows the cable down to its plug, which dangles in the air, plugged into nothing.
  // reads: 72.56-74.00 he wears the headphones, she sings (notes fly to them) · 74.00-75.35 down the cable: the plug is not plugged in
  // First frame: the ribbon's light still runs along the cable (the match from 04F's ribbons).
  // =============================================================================================================
  const G_PAN0 = T_G + 1.44, G_PAN1 = T_G + 2.25;
  const G_PLUG = [1730, 1400];
  function s04g(t, lt, dur) {
    // down the cable and in: the dangling plug ends centred above the subtitle line at ~1.75x (head still in the upper left)
    const pan = kitEase.inOut3(seg(t, G_PAN0, G_PAN1)), z = lerp(1.2, 1.78, pan), [dx, dy] = kitDrift(lt, 3, .35, 1.7);
    camBegin(lerp(1325, 1655, pan) + dx, lerp(1405, 1335, pan) + dy, z);
    ward(t);
    const sway = Math.sin(bpOf(t) * Math.PI / 2), hit = pulse(t, 5);
    const hf = himEmotions(t, [[T_G, 'peace', { blush: .8 }]], { take: .3 });
    const plug = [G_PLUG[0] + 7 * Math.sin(t * 2.3), G_PLUG[1] + 5 * Math.sin(t * 1.7 + 1)];
    const hl = himBed(t, { ...hf, phones: 1, plugAt: plug, tilt: .07 * sway, nod: .22 * hit, dx: .25 * sway, mouth: 'soft', sweat: .3 });
    const af = aiEmotions(t, [[T_G, 'gentle']]);
    const sing = Math.floor(bpOf(t) * 2);
    ai(HER[0], HER[1], AU, { ...af, mouth: ['A', 'O', 'smile', 'E'][sing % 4], form: 'full', view: 'front', pal: 'glow', t, rot: .1, dy: (af.dy || 0) - .3, boilKey: 's04 herG' });
    const m = AI_LAST.mouth, tgt = hl.cable || hl.head;
    for (let i = 0; i < 5; i++) {                                                           // notes: from her mouth to the headphone cup, on an arc
      const k = frac(t * .9 + i / 5), p = arcPt([m[0] + 10, m[1]], [tgt[0], tgt[1]], 120 + 20 * i % 3 * 10, k), a = Math.sin(k * Math.PI);
      s04Note(p[0] + 8 * Math.sin(k * 12 + i), p[1], 26 + 6 * (i % 2), a, i);
    }
    if (lt < .3 && hl.cable) { const a = 1 - lt / .3; for (let i = 0; i <= 6; i++) glow(lerp(hl.cable[0], plug[0], i / 6), lerp(hl.cable[1], plug[1], i / 6) - 90 * Math.sin(i / 6 * Math.PI) * -.3, 90, KIT.CYAN, .8 * a); }
    if (pan > .3) { glow(plug[0] + 4, plug[1] + 30, 150, KIT.CYAN, .45 * pan); glow(plug[0] + 4, plug[1] + 20, 60, KIT.CYANW, .4 * pan); }          // the bare plug, glinting in the air
    camEnd();
  }
  // a music note (painted mark, not a letter): head, stem, flag; a = opacity-ish 0..1
  function s04Note(x, y, s, a, i) {
    if (a <= .05) return;
    boilSeed('s04note' + i);
    paint(ellPts(x, y, s * .36, s * .26, 10, 0, -.4), { wash: KIT.CYANW, washOp: 255 * a, ink: null });
    inkLine([[x + s * .32, y - s * .05], [x + s * .32, y - s * 1.1], [x + s * .75, y - s * .8]], 2.2, KIT.CYANW, 'ink', .3);
    glow(x, y, s * 1.6, KIT.CYAN, .5 * a);
  }

  // =============================================================================================================
  // 04H  75.35-78.14  silence: he lifts the headphones off and finds the loose plug in his fingers (a "?" pops), looks at her: her mouth
  // is still moving, her smile frozen, and not a sound comes out. At 77.79 the lamp flares (toms) and the whole ward shatters into
  // fragments of paint that fly outward over the indigo void (05A picks the fragments up).
  // reads: 75.35-76.40 headphones off, the loose plug (?) · 76.40-77.40 her mouth moves, no sound · 77.40-78.14 flash, the ward shatters
  // =============================================================================================================
  const H_SHATTER = kitEv('impact', 0, 0) && events('impact').find(e => Math.abs(e.t - 77.79) < .15) ? events('impact').find(e => Math.abs(e.t - 77.79) < .15).t : 77.79;
  const H_SH = Math.min(H_SHATTER, T_END - .2);
  function s04hScene(t, lt) {
    const up = kitMove(t, T_H + .1, T_H + .5, { ant: .1, over: .08 }), lookHer = ease(seg(t, T_H + 1.1, T_H + 1.35));
    const [dx, dy] = kitDrift(lt, 3, .3, 2.1), z = 1.2 + .05 * ease(lt / 2.8);
    camBegin(1325 + dx, 1405 + dy, z);
    ward(t, { flash: 1.2 * kitEnv(t, H_SH, .01, .2) });
    const hf = himEmotions(t, [[T_H, 'peace', { blush: .8 }], [T_H + .18, 'smile', { lid: .5, lookY: .7, lookX: 0, blush: .8 }], [T_H + .85, 'confused', { lookY: .6, lookX: 0 }], [T_H + 1.15, 'confused', { lookX: -.8, lookY: 0 }]], { take: .7 });
    const plug = [1730 + 40 * clamp(up), 1400 - 50 * clamp(up)];
    himBed(t, { ...hf, phones: 1, phonesUp: clamp(up), ...(t > T_H + .45 ? { arms: 'plug' } : { plugAt: plug }), tilt: -.05 * lookHer, sweat: .4 });
    const af = aiEmotions(t, [[T_H, 'gentle'], [T_H + .9, 'perfect']]);
    const talk = t > T_H + .95 ? ['A', 'O', 'E', 'smile', 'O'][Math.floor(t * 9) % 5] : ['A', 'O', 'smile', 'E'][Math.floor(bpOf(t) * 2) % 4];
    ai(HER[0], HER[1], AU, { ...af, mouth: talk, form: 'full', view: 'front', pal: 'glow', t, rot: .08, dy: (af.dy || 0) - .25, boilKey: 's04 herH' });
    const qk = kitOver(seg(t, T_H + .98, T_H + 1.2), 1.8) * (1 - ease(seg(t, T_H + 1.9, T_H + 2.1)));
    if (qk > .02) { const hp = HIM_LAST.head || [1450, 1100]; flushBrush(); letter('?', hp[0] + 95, hp[1] - 110, 70 * qk, '#FFE2C0', { ink: false }); glow(hp[0] + 95, hp[1] - 130, 90, KIT.AMBER, .35 * qk); }
    camEnd();
  }
  function s04h(t, lt, dur) {
    if (t < H_SH) { s04hScene(t, lt); return; }
    const k = seg(t, H_SH, T_END), f0 = s04hScene(H_SH, H_SH - T_H);
    // freeze the last moment of the ward, then break it into textured triangles flung outward from the lamp
    flushLetters(); flushBrush();
    const snap = get(), cx0 = 960, cy0 = 260, NX = 8, NY = 5, cw = W / NX, ch = H / NY, e = Math.pow(k, 1.35) * 1.2;
    push(); resetMatrix(); translate(-W / 2, -H / 2); clear(); image(paperG, 0, 0); pop();
    setVoidLayer('indigo');
    flushBrush();
    push(); resetMatrix(); translate(-W / 2, -H / 2); noStroke(); textureMode(IMAGE);
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) for (let h = 0; h < 2; h++) {
      const id = (j * NX + i) * 2 + h, x0 = i * cw, y0 = j * ch, A = [[x0, y0], [x0 + cw, y0], [x0 + cw, y0 + ch]], B = [[x0, y0], [x0 + cw, y0 + ch], [x0, y0 + ch]], T = h ? B : A;
      const c = [(T[0][0] + T[1][0] + T[2][0]) / 3, (T[0][1] + T[1][1] + T[2][1]) / 3], d = [c[0] - cx0, c[1] - cy0], dl = Math.hypot(d[0], d[1]) || 1, v = .35 + .9 * hash(id * 1.9), spread = 520 * v * e;
      const ox = d[0] / dl * spread + (hash(id * 3.3) - .5) * 160 * e, oy = d[1] / dl * spread * .8 + 280 * e * e * (.4 + hash(id * 5.1));
      push(); translate(c[0] + ox, c[1] + oy); rotate((hash(id * 7.7) - .5) * 4.2 * e);
      tint(255, 255 * (1 - ease(seg(k, .45, 1))));
      texture(snap); beginShape(); for (const p of T) vertex(p[0] - c[0], p[1] - c[1], p[0], p[1]); endShape(CLOSE);
      noTint(); pop();
    }
    pop();
    freeImage(snap);
    kitFlash(.7 * kitEnv(t, H_SH, .01, .07), KIT.CYANW, { x: cx0, y: cy0, r: W * .7, wash: .6 });
  }

  shots([[T_A, s04a, { lyricMode: 'karaoke' }], [T_B, s04b, { lyricMode: 'karaoke' }], [T_C, s04c, { lyricMode: 'karaoke' }], [T_D, s04d, { lyricMode: 'karaoke' }], [T_E, s04e, { lyricMode: 'karaoke' }], [T_F, s04f, { lyricMode: 'karaoke' }], [T_G, s04g, { lyricMode: 'karaoke' }], [T_H, s04h, { lyricMode: 'karaoke' }]]);
})();
