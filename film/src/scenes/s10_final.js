// S10 FINAL CHORUS "數位化病房" (167.44-189.77, b121-136, D minor): 10A he sees his own hands are light, she is amber · 10B the chart: `A.` falls, `I` stays ·
// 10C he holds the strings · 10D the picture rolls over: she holds them · 10E his head in her lap, she sings in his voice · 10F his heart goes offline,
// he comes undone into threads · 10G the threads fall into her hair, she looks at us; the frame of his monitor closes round her. STORYBOARD §6.
// The swap: the ward is src/sets/ward.js variant 'final' (a clean cyan line drawing on navy, 1 drawing, no boil); he is `pal: 'swapped'` (clean cyan line, no boil),
// she is `pal: 'amber'` (the hand-painted one). From F_5 on only her mouth moves. Every shot is a pure function of t.
(() => {
  const SEC = sectionById('S10');
  const T_A = SEC.start, T_B = kitCut(123, 1, 170.23), T_C = kitCut(125, 1, 173.02), T_D = kitCut(127, 1, 175.81), T_E = kitCut(129, 1, 178.60),
    T_F = kitCut(131, 1, 181.40), T_G = kitCut(133, 1, 184.19), T_END = SEC.end;
  const syl = (line, pre, fb) => { try { const L = lyricById(line), s = L.syllables.find(x => x.text.toLowerCase().startsWith(pre)); if (s) return s.start; } catch (e) {} return fb; };
  const lastSyl = (line, fb) => { try { const L = lyricById(line); return L.syllables[L.syllables.length - 1].start; } catch (e) { return fb; } };
  const T_FALL = lastSyl('F_2', 171.63), T_HEART = syl('F_6', 'heart', 181.57), T_OFF = syl('F_6', 'off', 182.44), T_YOURS = syl('F_8', 'is', 186.98), T_MINE = lastSyl('F_8', 188.37);
  const T_LOOK = syl('F_1', 'a', 168.84), T_UP = T_FALL + .35;                       // 168.84 he looks up and she is amber · 171.98 he looks up from the chart (wide)
  const AMBER = KIT.AMBER, CY = KIT.CYAN;

  // ---- the stage (world px of the ward set; same marks as S04 / S08) ----
  const HIP = [1450, 1540], HU = 30;                    // him: the mattress under his hips, his unit
  const HER = [1080, 1965], AU = 76;                    // her feet on the island's front, her unit
  const RES = 1;
  function s10Ward(t, o = {}) { setWard('final', { t, res: RES, ...o }); }
  // a mouth shape (A I U E O) from the syllable being sung in one of the lines; null between syllables
  function s10Vis(t, ids) {
    for (const id of ids) {
      const L = lyricById(id); if (!L || t < L.start - .03 || t > L.end + .1) continue;
      const s = L.syllables.find(x => t >= x.start - .02 && t < x.end + .05); if (!s) return null;
      const m = (s.text.toLowerCase().match(/[aeiouy]/) || ['a'])[0];
      return { m: { a: 'A', e: 'E', i: 'I', o: 'O', u: 'U', y: 'I' }[m], k: clamp(Math.min((t - s.start + .06) / .08, 1)), s };
    }
    return null;
  }
  const FL1 = ['F_1', 'F_2', 'F_3', 'F_4'];
  function s10Him(t, o = {}) {
    him(HIP[0] + (o.dx || 0), HIP[1] + (o.dy || 0), HU, { pose: 'bed', view: 'front', outfit: 'home', pal: 'swapped', boilKey: 's10 him', ...o });
    return { ...HIM_LAST };
  }
  // keyframed camera [[lt, cx, cy, zoom, rot]] plus a pan offset (drift, whip) in world px
  function s10Cam(lt, keys, dx = 0, dy = 0, rotAdd = 0) {
    const [cx, cy, z, r] = kf(lt, keys.map(k => [k[0], [k[1], k[2], k[3], k[4] ?? 0]]), ease);
    camBegin(cx + dx, cy + dy, z, r + rotAdd);
    return { cx, cy, zoom: z, rot: r + rotAdd };
  }
  // thin dry-brush whip streaks (screen space): fast at speed 1
  function s10Streaks(speed, dir, seed, cols) {
    if (speed <= .04) return;
    for (let i = 0; i < 16; i++) {
      boilSeed('s10streak' + seed + '_' + i);
      const y = H * (.05 + .9 * hash(i * 3.17 + seed)), len = W * (.25 + .8 * hash(i * 7.9 + seed)) * speed, h = 2 + 7 * hash(i * 1.3 + 2) * speed, x = W * hash(i * 5.3 + seed + 1) + dir * W * .3 * (1 - speed);
      paint(rectPts(x - len / 2, y - h / 2, len, h, .8), { wash: cols[i % cols.length], washOp: 120 * speed, ink: null });
    }
  }
  // short blueprint glow behind the line drawing's bed so the clean cyan figure is the brightest thing
  function s10Lit(t, k = 1) { glow(HIP[0] + 60, HIP[1] - 160, 520, CY, .16 * k); }

  // =============================================================================================================
  // 10A  167.44-170.23  fade up from white on the line-drawn ward, third time here. He sits in bed looking at his own hands: they are light, clean
  // cyan lines. 168.84 he looks up: she (left, at the foot of the bed) has turned into the hand-painted amber one (a small take). The picture rolls slowly
  // and pushes in; the last .2 s whip right to the chart.
  // reads: 167.44-168.84 he looks at his hands (they are lines) · 168.84-170.23 he looks up: she is amber
  // =============================================================================================================
  function s10a(t, lt, dur) {
    const [dx0, dy0] = kitDrift(lt, 3, .35);
    const w = kitWhipOut(lt - (dur - .2), .2, 1);
    s10Cam(lt, [[0, 1480, 1330, 1.42, .05], [1.3, 1470, 1350, 1.34, .03], [2.1, 1390, 1440, 1.0, .0], [dur, 1380, 1450, .95, -.012]], dx0 + w.dx, dy0);
    s10Ward(t);
    s10Lit(t);
    const look = ease(seg(t, T_LOOK - .12, T_LOOK + .3)), hands = t < T_LOOK + .35;
    const v = s10Vis(t, FL1);
    const hf = himEmotions(t, [[T_A, 'blank', { lookY: .85, lookX: 0 }], [T_LOOK - .06, 'wide', { lookY: 0, lookX: -.8 }]], { take: .5 });
    s10Him(t, { ...hf, lookY: lerp(.95, -.05, look), lookX: lerp(0, -.8, look), coverW: .72, arms: hands ? 'look' : 'lap', mouth: v ? v.m : hf.mouth, swapGlow: 1, nod: .16 * (1 - look) - .08 * look, boilKey: 's10a him' });
    if (hands) { const a = HIM_LAST; [a.handR, a.handL].forEach(h => { if (h) glow(h[0], h[1], 120, CY, .5 * (1 - look * .6)); }); }
    // her: cyan at first (the colour of every chorus before), amber from 168.84
    const sw = ease(seg(t, T_LOOK, T_LOOK + .5));
    const af = aiEmotions(t, [[T_A, 'smile']], {});
    ai(HER[0], HER[1], AU, { ...af, mouth: v ? v.m : af.mouth, form: 'full', pose: 'stand', view: 'q', pal: 'glow', pal2: 'amber', palK: sw, t, boilKey: 's10a her',
      dy: -.55 * kitEnv(t, T_LOOK, .05, .25) });
    if (t >= T_LOOK && t < T_LOOK + 1) { const k = kitEnv(t, T_LOOK, .04, .22); glow(HER[0], HER[1] - 380, 520, AMBER, .75 * k); glow(HER[0], HER[1] - 380, 260, '#FFE2C0', .5 * k); }
    glow(HER[0], HER[1] - 380, 460, AMBER, .22 * sw);
    camEnd();
    s10Streaks(w.speed, 1, 1, [CY, '#BFE9FF']);
    const fk = 1 - kitEase.sine(seg(lt, 0, .7)); if (fk > .005) kitFade(fk, '#F4F9FF');
  }


  // =============================================================================================================
  // 10B  170.23-173.02  whip pan from her to the chart on the footboard (the same one as 01B) and a push in on `THE DISEASE CALLED A.I.`; at "I" (171.63) `A.`
  // lets go and drops out of the frame, `I.` stays; he (behind the chart, right) looks up, lucid for the first time (wide).
  // reads: 170.23-171.30 pushing in on A.I. · 171.30-171.98 `A.` falls, `I` stays · 171.98-173.02 he looks up, awake
  // =============================================================================================================
  const B_CH = [760, 560, 1.12];
  let B_APOS = null;
  function s10APos() {       // where `A.` sits on the chart (screen px at zoom 1), from the same text metrics the chart uses
    if (!B_APOS) {
      const s = B_CH[2], font = fontCSS('ui', 44 * s, { weight: 800 }), wl = setTextW('THE DISEASE CALLED ', font), wa = setTextW('A.', font), wi = setTextW('I.', font), tot = wl + wa + wi;
      B_APOS = [B_CH[0] - tot / 2 + wl + wa / 2, B_CH[1] + SET_CHART.title2[1] * s];
    }
    return B_APOS;
  }
  function s10b(t, lt, dur) {
    const w = kitWhipIn(lt, .22, 1);
    s10Cam(lt, [[0, 720, 575, 1.0, .02], [1.1, 1010, 580, 1.5, 0], [dur, 1020, 582, 1.52, 0]], w.dx * .6, 0);
    setChart(B_CH[0], B_CH[1], B_CH[2], { cache: true, bg: 'final', style: 'line', stamp1: 99, stamp2: 99, fall: t - T_FALL, ecg: { t }, res: 1.5 });
    const [ax, ay] = s10APos(), fl = kitEnv(t, T_FALL - .02, .03, .2);
    if (t < T_FALL + .5) glow(ax, ay, 150, CY, .25 + .6 * fl);
    { const f = t - T_FALL; if (f > .08 && f < 1.1) { const sc = B_CH[2], dy = .5 * 2600 * sc * (f - .08) ** 2, k = clamp(1 - f / 1.1); glow(ax + 30 * sc * (f - .08), ay + dy, 90, CY, .7 * k); glow(ax + 30 * sc * (f - .08), ay + dy - 80, 60, KIT.CYANW, .35 * k); } }
    // him, behind the chart, right: a clean cyan bust
    const up = ease(seg(t, T_UP - .12, T_UP + .2)), v = s10Vis(t, FL1);
    const hf = himEmotions(t, [[T_B, 'blank', { lookY: .6, lookX: -.9 }], [T_UP - .15, 'wide', { lookY: -.2, lookX: -.5 }]], { take: .7 });
    glow(1362, 560, 300, CY, .16 + .1 * up);
    him(1362, 700, 56, { ...hf, mouth: v ? v.m : hf.mouth, pose: 'bust', view: 'q', flip: true, cut: 2.4, outfit: 'home', pal: 'swapped', swapGlow: 1, nod: .12 * (1 - up) - .05 * up, boilKey: 's10b him' });
    camEnd();
    s10Streaks(w.speed, 1, 2, [CY, '#BFE9FF']);
  }

  // =============================================================================================================
  // 10C  173.02-175.81  he sits up, ten fingers spread; a light thread runs from each fingertip to her head and wrists (they grow out of his hands); he moves a
  // finger and she curtsies, he moves another and she tilts her head: a good little puppet.
  // reads: 173.02-174.20 the threads find her · 174.20-175.81 he moves, she does what she is told
  // =============================================================================================================
  const C_CAM = [1450, 1200, .8], C_HIM = [1450, 1000], C_HU = 22, C_HER = [1450, 1520], C_AU = 46;   // the mirror of 10D: he above, she below, threads straight down
  const C_DIP1 = T_C + 1.38, C_DIP2 = T_C + 2.12;          // the two commands (174.40, 175.14)
  // ten threads (his fingertips) -> her head and wrists; k 0..1 grows them from his fingers; flick 0..1 lifts the one finger that gives the command
  function s10Threads(from, to, k, col, o = {}) {
    const sc = o.sc ?? 1;
    if (k <= .01) return;
    const [hr, hl] = from, tips = [];
    [[hr, -1], [hl, 1]].forEach(([h, sd]) => { if (!h) return; for (let j = 0; j < 5; j++) tips.push([h[0] + ((j - 2) * 19 + sd * 4) * sc, h[1] - (58 + 14 * (2 - Math.abs(j - 2))) * sc + (o.flick && j === (o.flickJ ?? 1) && sd === (o.flickSide ?? -1) ? -26 * o.flick : 0)]); });
    const tg = [to.wR, to.wR, to.head, to.head, to.wL, to.wL, to.head, to.head, to.wR, to.wL];
    boilSeed('s10 threads' + (o.key || ''));
    for (let i = 0; i < tips.length; i++) {
      const a = tips[i], b = tg[i] || to.head, p = [], n = 10, lead = clamp(k * 1.25 - .25 * (i % 3) / 3);
      for (let q = 0; q <= n; q++) { const v = q / n * lead; p.push([lerp(a[0], b[0], v), lerp(a[1], b[1], v) + (o.sag ?? 26) * Math.sin(Math.PI * v) * (1 - clamp(o.taut || 0))]); }
      inkLine(p, 1.2, col, 'inkfine', 0);
    }
    for (let i = 0; i < tips.length; i += 2) glow(tips[i][0], tips[i][1], 34, col, .5 * k);
  }
  function s10c(t, lt, dur) {
    const spin = seg(lt, dur - .36, dur), spk = kitEase.in2(spin);
    s10Cam(lt, [[0, C_CAM[0], C_CAM[1], C_CAM[2] * 1.05, 0], [dur, C_CAM[0], C_CAM[1] + 10, C_CAM[2], 0]], ...kitDrift(lt, 2, .3), -Math.PI * spk);
    setWardVoid('final');
    glow(C_HIM[0], C_HIM[1] - 200, 700, CY, .22);
    const v = s10Vis(t, ['F_3', 'F_4']);
    const hf = himEmotions(t, [[T_C, 'focused']], { take: .3 });
    const flick1 = kitEnv(t, C_DIP1 - .1, .06, .18), flick2 = kitEnv(t, C_DIP2 - .1, .06, .18);
    him(C_HIM[0], C_HIM[1], C_HU, { ...hf, pose: 'bed', view: 'front', outfit: 'home', pal: 'swapped', coverW: .6, arms: 'puppet', mouth: v ? v.m : hf.mouth, boilKey: 's10c him', nod: .03 * Math.sin(t * 3) });
    const hl = { ...HIM_LAST };
    const dip = kitEnv(t, C_DIP1, .1, .34), tilt = kitEnv(t, C_DIP2, .12, .5);
    const af = aiEmotions(t, [[T_C, 'smile']], {});
    ai(C_HER[0], C_HER[1], C_AU, { ...af, mouth: v ? v.m : af.mouth, form: 'full', pose: 'curtsy', pal: 'amber', t, boilKey: 's10c her', dy: .85 * dip, tilt: .22 * tilt - .04 * dip, seed: 5 });
    const L = { ...AI_LAST };
    s10Threads([hl.handR, hl.handL], { wR: L.wristR, wL: L.wristL, head: L.crown || L.head }, ease(seg(t, T_C + .08, T_C + 1.15)), CY,
      { flick: flick1 + flick2, flickJ: 1, flickSide: -1, taut: .5 * (dip + tilt), key: 'c', sc: C_HU / 30, sag: 8 });
    camEnd();
    s10Streaks(spk, -1, 7, [CY, AMBER]);
  }

  // =============================================================================================================
  // 10D  175.81-178.60  the picture rolls half a turn in the frame (upside down -> upright again) and the puppeteer is now the one above: she hangs high in
  // the light of the lamp and lifts a hand; the amber threads snap taut; he is pulled up off the bed by the wrists and swings, blank.
  // reads: 175.81-176.90 she lifts her hand, the strings go taut · 176.90-178.60 he is hauled up and sways (he is the puppet now)
  // =============================================================================================================
  const D_CAM = [1500, 1075, .8], D_HER = [1450, 1030], D_AU = 58, D_TAUT = T_D + 1.0, D_UP = T_D + 1.08;
  function s10d(t, lt, dur) {
    const rk = seg(lt, 0, .72), roll = rk >= 1 ? 0 : -Math.PI - Math.PI * kitEase.out2(rk), sp = clamp(1 - lt / .3);
    s10Cam(lt, [[0, D_CAM[0], D_CAM[1], D_CAM[2] * .9, 0], [.8, D_CAM[0], D_CAM[1], D_CAM[2], 0], [dur, D_CAM[0] + 10, D_CAM[1] - 14, D_CAM[2] * 1.05, 0]], ...kitDrift(lt, 2.5, .3), roll);
    s10Ward(t);
    s10Lit(t, .8);
    // the lamp's light on her
    const lift = ease(seg(t, D_UP, D_UP + .55)), raise = kitMove(t, T_D + .35, T_D + .95, { ant: .1, over: .08 });
    const hf = himEmotions(t, [[T_D, 'blank']], { take: 0 });
    const hl = s10Him(t, { ...hf, view: 'front', coverW: .72, arms: 'strung', lift: clamp(lift), sway: 1.2 * lift, mouth: 'closed', tilt: .05 * Math.sin(t * 2.3) * lift, dy: -.2 * Math.sin(t * 2.3) * lift, boilKey: 's10d him', swapGlow: 1 });
    glow(D_HER[0], D_HER[1] - 330, 500, AMBER, .3);
    const v = s10Vis(t, ['F_4']);
    const af = aiEmotions(t, [[T_D, 'perfect']], { take: 0 });
    ai(D_HER[0], D_HER[1], D_AU, { ...af, mouth: v ? v.m : af.mouth, form: 'full', pose: 'stand', view: 'front', pal: 'amber', t, boilKey: 's10d her', dy: -.2 * Math.sin(t * 2),
      reachRW: [D_HER[0] + 120 * (1 - clamp(raise)) - 40 * clamp(raise), D_HER[1] - 300 - 150 * clamp(raise)], handR: 'open', handAR: -Math.PI / 2,
      reachLW: [D_HER[0] - 120 * (1 - clamp(raise)) + 40 * clamp(raise), D_HER[1] - 300 - 150 * clamp(raise)], handL: 'open', handAL: -Math.PI / 2 });
    const L = { ...AI_LAST };
    // amber threads from her fingers to his wrists (his arms are pulled up by them)
    const k = ease(seg(t, T_D + .55, D_TAUT)), tw = [[L.handR, hl.wristR || hl.handR], [L.handL, hl.wristL || hl.handL]];
    boilSeed('s10d threads');
    tw.forEach(([a, b], i) => { if (!a || !b) return; for (let j = 0; j < 5; j++) {
      const p = [], n = 10, ax = a[0] + (j - 2) * 10, ay = a[1] - 24; for (let q = 0; q <= n; q++) { const vv = q / n * k; p.push([lerp(ax, b[0] + (j - 2) * 5, vv), lerp(ay, b[1], vv) + 30 * Math.sin(Math.PI * vv) * (1 - lift)]); }
      inkLine(p, .9, AMBER, 'inkfine', 0); } glow(a[0], a[1] - 24, 70, AMBER, .6 * k); });
    camEnd();
    s10Streaks(sp, -1, 3, [AMBER, CY]);
  }

  // =============================================================================================================
  // 10E  178.60-181.40  the strings go slack on the toms and he falls forward into her lap: she sits on the edge of the bed, his head on her knees, the clean
  // cyan line of him lying across the bed. She sings "So rest now, love" and the voice that comes out is his; his own mouth is shut; he closes his eyes and she
  // strokes his hair (warm, and not quite right).
  // reads: 178.60-179.80 she sings in his voice, his mouth is closed · 179.80-181.40 he shuts his eyes, she strokes his hair
  // =============================================================================================================
  const E_SEAT = [1330, 1540], E_AU = 80, E_HU = 27, E_HIP = [1930, 1498];
  const E_ARML = { W: [.9, -4.6], hand: 'rest', handAng: -(Math.PI - .55), bend: -1, thumb: -1, k2: .8 };
  function s10e(t, lt, dur) {
    // the last .45 s push in on his heart (1648, 1437): 10F starts on the same light at screen (1015, 711)
    const pk = kitEase.in2(seg(lt, dur - .45, dur)), ac = kitAnchor(1648, 1437, 1015, 711, 1.9), bc = [1655, 1325, 1.3];
    const [ddx, ddy] = kitDrift(lt, 2, .3);
    camBegin(lerp(1650 + (bc[0] - 1650) * seg(lt, 0, dur), ac[0], pk) + ddx, lerp(1335 + (bc[1] - 1335) * seg(lt, 0, dur), ac[1], pk) + ddy, 1.22 * Math.pow(1.9 / 1.22, 0) * Math.pow(ac[2] / bc[2], pk) * (1 + (bc[2] / 1.22 - 1) * seg(lt, 0, dur)), 0);
    s10Ward(t);
    s10Lit(t, .8);
    const fall = kitMove(t, T_E - .12, T_E + .38, { ant: 0, over: .06, w: 22, k: 11 });
    const v = s10Vis(t, ['F_5']);
    const af = { ...aiEmotions(t, [[T_E, 'perfect'], [179.7, 'gentle']], { take: 0 }), mouth: v ? v.m : undefined };
    const herP = { form: 'full', pose: 'sit', view: 'q', pal: 'amber', t, seed: 4, boilKey: 's10e her', ...af };
    const hf = himEmotions(t, [[T_E, 'blank'], [179.75, 'peace']], { take: .3 });
    const kf_ = clamp(fall), fy = -430 * (1 - kf_) * (1 - kf_), fr = -.6 * (1 - kf_);
    // she first (her hand reaches over his hair), then he lies beside / across her lap, in front of her skirt
    const head = [1590, 1432];
    const sw_ = Math.sin((t - 179.8) * 3.1), reach = ease(seg(t, 179.6, 179.95)), stroke = t >= 179.5 ? { reachRW: [lerp(1400, head[0] + 14 * sw_, reach), lerp(1380, head[1], reach)], handR: 'flat', handAR: .5 + .15 * sw_, reachL: [-.15, -6.05], tilt: .14, lookY: .7 } : {};
    const hb = ease(seg(t, T_F - .42, T_F - .1));
    him(E_HIP[0], E_HIP[1] + fy, E_HU, { ...hf, heart: .85 * hb, mouth: 'closed', pose: 'lie', rot: -Math.PI / 2 + .1 + fr, outfit: 'home', pal: 'swapped', swapGlow: 1, covers: false, armR: 'chest', armL: E_ARML, boilKey: 's10e him' });
    ai(E_SEAT[0], E_SEAT[1], E_AU, { ...herP, ...stroke });
    if (HIM_LAST.heart && hb > 0) glow(HIM_LAST.heart[0], HIM_LAST.heart[1], 160 + 60 * pk, '#FF6F86', .6 * hb);
    camEnd();
  }

  // =============================================================================================================
  // 10F  181.40-184.19  his chest, close: the heart of light beats once (181.57); at "offline" (182.44) it greys out to one small dot; his clean line body comes
  // loose from the edge in, into thin threads that drift up and to the right toward her. The camera pushes in, then from 183.20 pulls back.
  // reads: 181.40-182.44 his heart beats · 182.44-183.20 it goes grey and out · 183.20-184.19 he comes undone into threads and drifts to her
  // =============================================================================================================
  const F_NOTCH = [900, 485], F_U = 74;
  function s10f(t, lt, dur) {
    const z = 1 + .2 * kitEase.sine(seg(t, T_F, T_OFF + .1)) - .2 * kitEase.sine(seg(t, T_F + 1.8, T_END)) + 0;
    const zz = t < 183.2 ? 1 + .1 * kitEase.sine(seg(t, T_F, 183.2)) : 1.1 - .12 * kitEase.sine(seg(t, 183.2, T_G));
    setWardVoid('final');
    kitCam(lt, [[0, 960, 540, zz]], { drift: 1.5 });
    const beat = kitEnv(t, T_HEART, .02, .22), grey = ease(seg(t, T_OFF - .02, T_OFF + .5)), und = ease(seg(t, 183.2, 184.15));
    const hf = himEmotions(t, [[T_F, 'peace']], { take: 0 });
    const hpulse = grey < .5 ? (.55 + .4 * beat + .2 * Math.exp(-((t - T_F) ** 2) * 6)) : .5;
    him(F_NOTCH[0], F_NOTCH[1], F_U, { ...hf, mouth: 'closed', pose: 'bust', view: 'front', cut: 6, outfit: 'home', pal: 'swapped', swapGlow: 1, heart: hpulse, heartGrey: grey, unravel: und, unravelDir: [.7, -.72], boilKey: 's10f him' });
    if (HIM_LAST.heart && grey < .9) glow(HIM_LAST.heart[0], HIM_LAST.heart[1], 220 + 200 * beat, '#FF6F86', (.5 + .5 * beat) * (1 - grey));
    camEnd();
  }

  // =============================================================================================================
  // 10G  184.19-189.77  her face, amber and hand-painted, close: the threads fall into her hair; she looks down at where he was, 185.41 up at us, and sings; "is
  // yours" (186.98) her hand goes to her throat; 188.37 ("mine") the picture pulls back and a monitor's frame closes round her: she was always on his screen.
  // reads: 184.19-185.41 the threads fall into her hair · 185.41-186.98 she looks at us, singing · 186.98-188.37 her hand on her throat · 188.37-189.77 pull back: the frame
  // =============================================================================================================
  const G_NOTCH = [960, 505], G_U = 186;
  const sty = l => l.ai ? { font: 'human', color: KIT.AMBER, zhColor: '#FFD9B8' } : { font: 'ai', color: KIT.CYAN, zhColor: KIT.CYANW };
  // the pull-back from her face to the whole room, continued by S11 (11A): the monitor's glass fills the frame at zoom Z0, the full room is zoom Z1
  const RS = SET_ROOM.screen, RC = [RS.x + RS.w / 2, RS.y + RS.h / 2], Z0 = 1.02 * 1920 / RS.w, Z1 = .41, FULLC = [2330, 1311];
  const T_P0 = T_MINE, T_P1 = kitCut(138, 1, 191.16), G_UW = G_U / Z0, G_NW = [RC[0], RC[1] + (G_NOTCH[1] - 540) / Z0];
  const pullK = t => kitEase.sine(seg(t, T_P0, T_P1));
  // the threads of 10F coming down into her hair: ≤ 36 thin ribbons that arrive one after another and are taken up (screen space)
  function s10Fall(t) {
    boilSeed('s10g threads');
    const tips = [];
    for (let i = 0; i < 34; i++) {
      const d = .35 * hash(i * 3.7), dr = 1.2 + .3 * hash(i * 8.3), p = (t - T_G - d) / dr, q = ease(clamp(p));
      if (p <= 0 || p >= 1.3) continue;
      const e = [G_NOTCH[0] + (hash(i * 5.1) - .5) * 280, G_NOTCH[1] - 330 + 70 * hash(i * 2.9)], s0 = [1500 + 520 * hash(i * 1.7), -40 + 260 * hash(i * 6.3)],
        c1 = [s0[0] - 300 - 150 * hash(i), s0[1] - 160 - 60 * hash(i * 2.2)], c2 = [e[0] + 260 * (hash(i * 4.4) - .2), e[1] - 120];
      const pts = [], tail = Math.max(0, q - .6);
      for (let j = 0; j <= 12; j++) {
        const v = lerp(tail, q, j / 12), a = 1 - v, x = a * a * a * s0[0] + 3 * a * a * v * c1[0] + 3 * a * v * v * c2[0] + v * v * v * e[0], y = a * a * a * s0[1] + 3 * a * a * v * c1[1] + 3 * a * v * v * c2[1] + v * v * v * e[1];
        pts.push([x + 14 * Math.sin(v * 14 + i * 2 + t * 3) * (1 - v), y]);
      }
      inkLine(pts, 1.5, mixCol(CY, '#BFE9FF', .2), 'inkfine', 0);
      if (i % 4 === 0 && p < 1) tips.push([pts[12][0], pts[12][1], 1]);
      if (p >= .95 && i % 3 === 0) tips.push([e[0], e[1], clamp(1 - (p - .95) * 3)]);
    }
    tips.forEach(([x, y, f]) => glow(x, y, 50, CY, .5 * f));
  }
  function s10g(t, lt, dur) {
    const k = pullK(t), z = Z0 * Math.pow(Z1 / Z0, k), cx = lerp(RC[0], FULLC[0], k), cy = lerp(RC[1], FULLC[1], k);
    // the room round his monitor, camera locked on the glass until "mine"
    camBegin(cx, cy, z);
    setRoom('scan', { t, res: 1, variants: 2, beam: .95, beamK: ease(seg(t, T_MINE + .5, T_MINE + 1.2)) });
    setRoomScreen(S => { setScreenGlass(S, 'black'); glow(S.X(.5), S.Y(.62), S.h * .8, AMBER, .5); });
    camEnd();
    const A = toScreen(RS.x, RS.y, { cx, cy, zoom: z, rot: 0 }), B = toScreen(RS.x + RS.w, RS.y + RS.h, { cx, cy, zoom: z, rot: 0 }), N = toScreen(G_NW[0], G_NW[1], { cx, cy, zoom: z, rot: 0 });
    const m = lerp(.6, 1, clamp((z - .7) / 1.5)), u = G_UW * z * m;
    const hy = clamp((t - T_G) / 1), look = ease(seg(t, 185.3, 185.6)), v = s10Vis(t, ['F_7', 'F_8']);
    glow(N[0], N[1] - 200 * z / Z0, 900 * z / Z0, AMBER, .22);
    const af = { ...aiEmotions(t, [[T_G, 'perfect'], [185.41, 'gentle']], { take: 0 }), mouth: v ? v.m : 'smile' };
    const thr = t >= T_YOURS - .3 ? aiAct('throat', t, T_YOURS - .3, { form: 'full' }) : {};
    const worried = ease(seg(t, T_P0 + .6, T_P1));
    ai(N[0], N[1] + (z < Z0 ? (G_NOTCH[1] - 585) : 0), u, { ...af, ...(t >= T_YOURS - .3 && t < T_P0 + .6 ? thr : {}), lookY: lerp(.8, 0, look), lookX: lerp(-.15, 0, look), form: 'full', pose: 'bust', view: 'front', pal: 'amber', cut: 3.2, t,
      boilKey: 's10g her', dy: .05 * Math.sin(t * 2), clip: [A[0], A[1], B[0], B[1]] });
    if (t < T_P0 + .3) s10Fall(t);
  }


  const sm = { lyricMode: 'karaoke', lyricStyle: sty };
  shots([[T_A, s10a, sm], [T_B, s10b, sm], [T_C, s10c, sm], [T_D, s10d, sm], [T_E, s10e, sm], [T_F, s10f, sm], [T_G, s10g, sm]]);
})();
