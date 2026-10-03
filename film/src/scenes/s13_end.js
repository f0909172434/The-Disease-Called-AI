// S13 END CARD (206.51-215.00): 13A dark paper, two cards written with letter() (they boil): the AI disclosure, then `Did it move you?`, and at the end her amber
// • • • in the lower right blink twice (214.00). Fades up from black (12D smash-cuts to black at 206.51) and out to black at 215.00. lyricMode hidden. STORYBOARD §6.
(() => {
  const SEC = sectionById('S13'), T_A = (SEC && SEC.start) || 206.51, T_END = (SEC && SEC.end) || 215.00, D = T_END - T_A;
  function s13a(t, lt, dur) {
    setEndCard(lt, { t1: 206.90 - T_A, t2: 211.00 - T_A, t2end: 213.60 - T_A + .4, dots: 214.00 - T_A, fade: .5 });
    kitFadeIn(lt, .4);
    kitFadeOut(lt, .4, dur);
  }
  shots([[T_A, s13a, { lyricMode: 'hidden' }]]);
})();
