// S11 TAG "RECALL" (189.77-195.35, b137-140): 11A the dark room, his monitor the lighthouse. The pull-back of 10G carries across the section line (the frame of his
// monitor with her in it, then the whole room); she sings `always` in his voice, once per beat, three to a bar: b137 the light finds the empty chair, b138 it sweeps left
// over the bed (flat, no longer glowing), b139 right to the door, ajar, warm light in the gap; b140 it returns to the middle, the screen dims, 195.00 the light
// squeezes to one horizontal line (which is 12A). STORYBOARD §6. The room is src/sets/room.js variant 'scan' (res 1, 2 drawings, fixed so the pull-back never repaints).
(() => {
  const SEC = sectionById('S11');
  const T_A = SEC.start, T_B = kitCut(138, 1, 191.16), T_C = kitCut(139, 1, 192.56), T_D = kitCut(140, 1, 193.95), T_END = SEC.end, T_LINE = T_END - .35;
  const lastSyl = (line, fb) => { try { const L = lyricById(line); return L.syllables[L.syllables.length - 1].start; } catch (e) { return fb; } };
  const ON = (() => { const o = []; for (const id of ['T_1', 'T_2', 'T_3', 'T_4']) { try { for (const sy of lyricById(id).syllables) if (/^al/i.test(sy.text)) o.push(sy.start); } catch (e) {} } return o; })();
  const AMBER = KIT.AMBER;
  // the pull-back of 10G (same formula as s10_final.js): the monitor's glass fills the frame at zoom Z0, the whole room is zoom Z1
  const RS = SET_ROOM.screen, RC = [RS.x + RS.w / 2, RS.y + RS.h / 2], Z0 = 1.02 * 1920 / RS.w, Z1 = .41, FULLC = [2330, 1311];
  const T_P0 = lastSyl('F_8', 188.37), T_P1 = T_B, G_NOTCH = [960, 505], G_U = 186, G_UW = G_U / Z0;
  const pullK = t => kitEase.sine(seg(t, T_P0, T_P1));
  // where the beam points (rad, 0 = right, π/2 = down, π = left): the chair, then the bed, the door, the middle
  const beamAt = t => .95 + (2.87 - .95) * kitMove(t, T_B - .04, T_B + .6, { ant: .05, over: .05 }) + (.08 - 2.87) * kitMove(t, T_C - .04, T_C + .7, { ant: .05, over: .05 })
    + (1.57 - .08) * kitMove(t, T_D - .04, T_D + .6, { ant: .04, over: .03 });
  function s11a(t, lt, dur) {
    const k = pullK(t), z = Z0 * Math.pow(Z1 / Z0, k), cx = lerp(RC[0], FULLC[0], k), cy = lerp(RC[1], FULLC[1], k);
    const dim = 1 - .9 * ease(seg(t, T_D + .1, T_D + 1.0)), pulse = ON.reduce((s, o) => s + kitEnv(t, o, .02, .16), 0);
    camBegin(cx, cy, z);
    setRoom('scan', { t, res: 1, variants: 2, beam: beamAt(t), beamK: (.7 + .35 * Math.min(1, pulse)) * dim * (1 - ease(seg(t, T_LINE - .1, T_LINE + .15))) });
    setRoomScreen(S => { setScreenGlass(S, 'black'); glow(S.X(.5), S.Y(.62), S.h * .8, AMBER, .5 * dim); });
    // where the beam lands: the chair, the bed, the door; a pool of amber light on whatever it finds
    [[.95, 2690, 1840, 360], [2.87, 900, 1690, 560], [.08, 4330, 1480, 420]].forEach(([a, x, y, r]) => { const w = Math.exp(-(((beamAt(t) - a) / .13) ** 2)) * dim; if (w > .02) glow(x, y, r, AMBER, .5 * w); });
    camEnd();
    // her, small, in the glass: head and shoulders, searching (she looks where the light goes)
    const A = toScreen(RS.x, RS.y, { cx, cy, zoom: z, rot: 0 }), B = toScreen(RS.x + RS.w, RS.y + RS.h, { cx, cy, zoom: z, rot: 0 });
    const ny = RC[1] + lerp(.2 * RS.h, (G_NOTCH[1] - 540) / Z0, clamp((z - .7) / 1.5)), N = toScreen(RC[0], ny, { cx, cy, zoom: z, rot: 0 });
    const m = lerp(.8, 1, clamp((z - .7) / 1.5)), u = G_UW * z * m, ang = beamAt(t);
    const af = aiEmotions(t, [[T_A, 'worried']], { take: 0 });
    if (dim > .05) ai(N[0], N[1], u, { ...af, form: 'full', pose: 'bust', view: 'front', pal: 'amber', cut: 1.6, t, lookX: .9 * Math.cos(ang), lookY: .5 * Math.sin(ang), blink: undefined, boilKey: 's11a her', dy: .05 * Math.sin(t * 2),
      clip: [A[0], A[1], B[0], B[1]] });
    // 195.00: the room goes out and the light shrinks to one horizontal line, the line of 12A (x .2-.8 W, y .62 H)
    const g = kitEase.in2(seg(t, T_LINE - .15, T_END));
    if (g > 0) {
      kitFade(clamp(seg(t, T_LINE - .05, T_END - .06)), KIT.VOID);
      const L = easeOut(seg(t, T_LINE - .1, T_END)), hw = lerp(70, .3 * W, L), sw = hw * 2 / .6, sh = sw * 9 / 16, ly = lerp((A[1] + B[1]) / 2, .62 * H, L);
      setInput(setScr(W / 2 - sw / 2, ly - .62 * sh, sw, sh), { style: 'line', key: 's11' });
    }
  }
  shots([[T_A, s11a, { lyricMode: 'karaoke', lyricStyle: l => l.ai ? { font: 'human', color: KIT.AMBER, zhColor: '#FFD9B8' } : { font: 'ai', color: KIT.CYAN, zhColor: KIT.CYANW } }]]);
})();
