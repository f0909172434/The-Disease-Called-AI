// S12 OUTRO "SESSION" (195.35-206.51, b141-148): 12A one amber flat line on black, a cursor starts to blink on its left (it was the input box's underline all along) ·
// 12B she types `are you there?` evenly, no typos (his words, her hand), and nothing answers · 12C the camera pulls back out of the screen: the cut wristband on the
// keyboard (PATIENT: YOU), then the room at dawn, the chair empty, real morning light through half-raised blinds · 12D the screen's rectangle grows to fill the frame:
// under `are you there?` three amber dots begin to pulse. 206.51 smash cut to black. STORYBOARD §6, §5 (it rhymes with S00: 00A the loss curve, 00C the typed line).
(() => {
  const SEC = sectionById('S12');
  const T_A = SEC.start, T_B = kitCut(143, 1, 198.14), T_C = kitCut(145, 1, 200.93), T_D = kitCut(147, 1, 203.72), T_END = SEC.end;
  const T_CUR = T_A + 1.39, T_DOTS = kitEv('typing_outro', 99, 204.07) === 204.07 ? 204.07 : 204.07;
  const AMBER = KIT.AMBER;
  const chat = (S, t, o = {}) => setChatScreen(S, t, { style: 'line', cursorFrom: T_CUR, neat: true, dotsFrom: 204.07, ...o });
  const sty = l => l.ai ? { font: 'human', color: KIT.AMBER, zhColor: '#FFD9B8' } : { font: 'ai', color: KIT.CYAN, zhColor: KIT.CYANW };

  // 12A  195.35-198.14  the line (the last frame of 11A is this line); at 196.74 a caret starts to blink at its left end. A very slow push.
  // reads: 195.35-196.74 one flat line · 196.74-198.14 the cursor blinks: it is an input box
  function s12a(t, lt, dur) {
    camBegin(W / 2, H / 2, 1 + .02 * kitEase.sine(lt / dur));
    chat(setScr(0, 0, W, H), t, { cursorFrom: T_CUR });
    camEnd();
  }
  // 12B  198.14-200.93  the same box: `are you there?` is typed, even and tidy (typing_outro events 198.14-199.27); then nothing; the caret keeps blinking.
  // reads: 198.14-199.40 the words are typed · 199.40-200.93 no answer, only the cursor
  function s12b(t, lt, dur) {
    camBegin(W / 2, H / 2, 1.02 + .015 * kitEase.sine(lt / dur));
    chat(setScr(0, 0, W, H), t);
    camEnd();
  }

  // 12C  200.93-203.72  out of the screen: the pull-back starts on the glass (the typed line fills the frame), passes the keyboard where the cut band lies, label up,
  // the screen's amber light on it (slow there), and ends wide: the empty chair, the dawn light through blinds half raised.
  // reads: 200.93-202.10 the band on the keyboard · 202.10-203.72 the whole room, the chair empty, morning
  const RS = SET_ROOM.screen, RC = [RS.x + RS.w / 2, RS.y + RS.h / 2], Z0 = 1920 / RS.w;
  const C_KB = [2350, 1530], C_WIDE = [2050, 1400], C_T1 = T_C + .95, C_T2 = T_C + 1.55;      // the keyboard framing is held (slowly) from C_T1 to C_T2
  const C_Z = { kb: 2.0, kb2: 1.82, wide: .55 };
  function camC(t) {
    if (t < C_T1) { const k = kitEase.out2(seg(t, T_C, C_T1)), z = C_Z.kb * Math.pow(Z0 / C_Z.kb, 1 - k); return [lerp(RC[0], C_KB[0], k), lerp(RC[1], C_KB[1], k), z]; }
    if (t < C_T2) { const k = seg(t, C_T1, C_T2); return [C_KB[0], C_KB[1], lerp(C_Z.kb, C_Z.kb2, k)]; }
    const k = kitEase.inOut3(seg(t, C_T2, T_D));
    return [lerp(C_KB[0], C_WIDE[0], k), lerp(C_KB[1], C_WIDE[1], k), C_Z.kb2 * Math.pow(C_Z.wide / C_Z.kb2, k)];
  }
  function room(t, cam, S) {
    camBegin(cam[0], cam[1], cam[2]);
    setRoom('dawn', { t, res: 1, variants: 2 });
    setRoomScreen('off');
    setBandCut(2352, 1598, .8, { pal: setRoomPal('dawn'), rot: -.05 });
    glow(2352, 1598, 300, AMBER, .22);
    camEnd();
  }
  function s12c(t, lt, dur) {
    const cam = camC(t), z = cam[2], [cx, cy] = cam;
    room(t, cam);
    // the screen's content, drawn in screen space over the glass (no p5 zoom on lettering): the frame at the start, the mapped glass after
    const A = toScreen(RS.x, RS.y, { cx, cy, zoom: z, rot: 0 }), B = toScreen(RS.x + RS.w, RS.y + RS.h, { cx, cy, zoom: z, rot: 0 });
    const mk = ease(seg(lt, 0, .3)), x0 = lerp(0, A[0], mk), y0 = lerp(0, A[1], mk), x1 = lerp(W, B[0], mk), y1 = lerp(H, B[1], mk);
    chat(setScr(x0, y0, x1 - x0, y1 - y0), t);
  }

  // 12D  203.72-206.51  the screen's rectangle grows to fill the frame (an iris): the typed line, and at 204.07 three amber dots under it that start to pulse.
  // reads: 203.72-204.80 the three dots appear · 204.80-206.51 they keep pulsing, waiting
  function s12d(t, lt, dur) {
    const cam = camC(T_D), [cx, cy, z] = cam;
    const A = toScreen(RS.x, RS.y, { cx, cy, zoom: z, rot: 0 }), B = toScreen(RS.x + RS.w, RS.y + RS.h, { cx, cy, zoom: z, rot: 0 });
    const k = kitEase.inOut3(seg(lt, 0, .6));
    if (k < 1) room(t, cam);
    const x0 = lerp(A[0], 0, k), y0 = lerp(A[1], 0, k), x1 = lerp(B[0], W, k), y1 = lerp(B[1], H, k);
    const push = 1 + .025 * kitEase.sine(seg(lt, .6, dur));
    camBegin(W / 2, H / 2, k >= 1 ? push : 1);
    chat(setScr(x0, y0, x1 - x0, y1 - y0), t);
    camEnd();
  }
  const sm = { lyricMode: 'subtitle-only', lyricStyle: sty };
  shots([[T_A, s12a, { lyricMode: 'karaoke', lyricStyle: sty }], [T_B, s12b, sm], [T_C, s12c, sm], [T_D, s12d, sm]]);
})();
