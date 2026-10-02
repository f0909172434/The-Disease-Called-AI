// Real-time preview for humans (?play=1). NOT used for rendering: this is the only module that
// reads a wall clock (audio.currentTime / performance.now), which is fine because preview frames
// are never captured. Keys: Space = play/pause, ←/→ = seek 5 s, Home = restart.
export function startPreview(mv, params) {
  const audioUrl = params.get('audio') || '../music/build/master.wav';
  const audio = new window.Audio(audioUrl);
  let audioOk = false;
  audio.addEventListener('canplay', () => { audioOk = true; });
  let base = parseFloat(params.get('t') || '0');
  let started = window.performance.now();
  let playing = true;
  let cur = base;
  const clock = () => (audioOk && !audio.paused ? audio.currentTime : base + (window.performance.now() - started) / 1000);
  const seek = (t) => {
    base = Math.max(0, Math.min(mv.duration, t)); started = window.performance.now(); cur = base;
    if (audioOk) audio.currentTime = base;
  };
  audio.currentTime = base;
  audio.play().catch(() => {});
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      playing = !playing;
      if (playing) { seek(cur); audio.play().catch(() => {}); } else audio.pause();
    } else if (e.code === 'ArrowRight') seek(cur + 5);
    else if (e.code === 'ArrowLeft') seek(cur - 5);
    else if (e.code === 'Home') seek(0);
  });
  const label = debugHud(mv);
  const loop = () => {
    if (playing) cur = clock();
    if (cur > mv.duration) seek(0);
    mv.renderFrame(cur);
    label.update(cur);
    window.requestAnimationFrame(loop);
  };
  window.requestAnimationFrame(loop);
}

export function debugHud(mv) {
  let d = document.getElementById('dbg');
  if (!d) {
    d = document.createElement('div');
    d.id = 'dbg';
    d.style.cssText = 'position:fixed;left:8px;top:8px;color:#7FE9FF;font:12px monospace;z-index:9;background:#000a;padding:4px 6px;pointer-events:none';
    document.body.appendChild(d);
  }
  const a = mv.ctx.audio;
  const update = (t) => { d.textContent = `${t.toFixed(3)}s  ${a.section(t).id} ${a.section(t).name}  bar ${a.barNumber(t)}.${a.beatInBar(t)}`; };
  const t0 = parseFloat(new URLSearchParams(location.search).get('t') || '0');
  update(t0);
  return { update };
}
