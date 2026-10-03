// S05 POST "ALWAYS" (78.14-83.72, b57-60): 05A her face sings "always"; every one pushes a ring of light off her lips; the rings gather into a
// vortex; at b60 (82.33) the cyan fades to grey and her face and the rings fall away as ash. STORYBOARD §6.
// First frames: the fragments of 04H's shattered ward, still flying, over the same indigo void. Last frames: grey ash falling toward
// (06A's ash-grey void).
(() => {
  const SEC = sectionById('S05');
  const T_A = SEC.start, T_END = SEC.end, T_GATHER1 = T_A + 1.39, T_SWIRL = T_A + 2.79, T_ASH = kitCut(60, 1, 82.33);
  // the "always" onsets from the data (first syllable "al" of each PO line), else every 0.52 s from the downbeat
  const ONS = (() => { const o = []; for (const id of ['PO_1', 'PO_2', 'PO_3', 'PO_4']) { try { for (const sy of lyricById(id).syllables) if (/^al/i.test(sy.text)) o.push(sy.start); } catch (e) {} } return o.length ? o : Array.from({ length: 11 }, (_, i) => T_A + i * .52); })();
  const CX = 960, NOTCH = 790, U = 190, MOUTH_Y = NOTCH - .36 * U, FACE_Y = NOTCH - 1.0 * U;
  function s05a(t, lt, dur) {
    const gather = ease(seg(t, T_A, T_GATHER1)), ash = ease(seg(t, T_ASH, T_END - .1)), pan = kitEase.in2(seg(t, T_ASH + .2, T_END)) * 420;
    setVoidLayer('indigo');
    camBegin(960, 540 + pan, 1);
    setShards(t, { gather, ash, n: 34, cx: CX, cy: FACE_Y, r: 330 });
    // the face: gathers out of the fragments (dissolve 1 -> 0), then sings; at b60 it greys and crumbles
    const dis = 1 - ease(seg(t, T_A + .35, T_GATHER1 + .2)) + ease(seg(t, T_ASH + .1, T_END - .15));
    const mv = (() => { try { return vox('ai', t); } catch (e) { return 0; } })();
    const sy = ONS.some(o => t >= o && t < o + .2) ? 1 : 0;
    const ashK = ash, grey = ease(seg(t, T_ASH - .1, T_ASH + .5));
    if (t >= T_SWIRL) { const n = Math.round(lerp(8, 56, ease(seg(t, T_SWIRL, T_ASH))));          // behind her face: the vortex winds round her
      setHaloSwirl(CX, FACE_Y + 60, t, n, { a: .75 * ease(seg(t, T_SWIRL, T_SWIRL + .3)) * (1 - ashK * .8), ash: grey, r: 560 }); }
    const f = aiEmotions(t, [[T_A, 'perfect']]);
    ai(CX, NOTCH, U, { ...f, pose: 'bust', form: 'full', view: 'front', pal: 'glow', pal2: 'mirror', palK: grey, cut: 2.2, t, mouth: Math.max(mv, sy) > .55 ? 'A' : Math.max(mv, sy) > .25 ? 'O' : 'perfect',
      dissolve: clamp(dis), dissolveTo: [CX, 1500], dy: .08 * Math.sin(t * 2.2), boilKey: 's05 her' });
    // the rings: one off her lips on every "always", growing and fading; from 80.93 they wind into a vortex
    for (let i = 0; i < ONS.length; i++) {
      const a = t - ONS[i]; if (a < 0 || a > 2.4) continue;
      const k = easeOut(a / 2.4);
      setHalo(CX, MOUTH_Y - 40 * k, 50 + 560 * k, { a: (1 - k) * (t < T_SWIRL ? 1 : .6) * (1 - ashK), ash: grey, key: 'r' + i, ry: .3 });
    }
    camEnd();
    if (t > T_END - .45) kitFade(kitEase.sine((t - (T_END - .45)) / .45) * .85, '#2A2A30');
  }
  shots([[T_A, s05a, { lyricMode: 'karaoke' }]]);
})();
