// _kit.js: the shared shot helpers every src/scenes/sNN_*.js file builds on. Loaded first among the scenes (studio.html).
// Everything here is a pure function of time (no state survives between frames, no Math.random) and every global is
// prefixed `kit` / `KIT`. Conventions and examples: src/scenes/README.md.
//
//   time       kitWin(t, a, b)  kitCut(bar, beat, fallback)  kitEv(name, i, fallback)  kitEnv(t, t0, atk, dec)
//              kitMove(t, t0, t1, {ant, over})  kitOver(x, s)  kitEase.*
//   camera     kitCam(lt, keys, {drift, shake})  kitZoom(lt, a, b, z0, z1)  kitAnchor(wx, wy, sx, sy, zoom)  kitDrift(t, amp, f)
//              kitWhipOut / kitWhipIn (camera offset + speed)  kitSmear(speed, dir)
//   transition kitFade  kitFadeIn  kitFadeOut  kitFlash  kitSpill  kitXfade(k, drawA, drawB)
//   debug      kitGuide()  (the subtitle-safe line y = .76 H; off by default: ?safe in the studio URL, or window.KIT_DEBUG = true)

const KIT = {
  SAFE: .76 * H,                    // while someone sings or speaks, faces / hands / key props stay ABOVE this y (STORYBOARD §0)
  EN: .865 * H, ZH: .925 * H,       // the lyric baselines (lyrics.js)
  VOID: '#05060A', CYAN: '#7FE9FF', CYANW: '#E8FDFF', AMBER: '#FFB070', WHITE: '#FFFDF6'
};

// ---------------------------------------------------------------------------------------------------- time
// Progress of t through [a, b]: { k 0..1 (clamped), on (inside the window), age (t - a), left (b - t) }.
// The reads in the storyboard are windows: kitWin(t, 5.20, 5.58).on is "the Enter read is playing".
function kitWin(t, a, b) { return { k: clamp((t - a) / (b - a)), on: t >= a && t < b, age: t - a, left: b - t }; }
// A bar / beat time from the song's data (tAt follows the analysed beats, pinned to the score grid). Falls back to the
// score grid (172 BPM, first downbeat 0) if the data did not load: kitCut(3) = 2.79, kitCut(10, 3) = 12.56.
function kitCut(bar, beat = 1, fallback = null) {
  try { if (MV.ready && MV.beatMap.length > 1) { const v = tAt(bar, beat); if (isFinite(v)) return v; } } catch (e) {}
  return fallback ?? OFF + ((bar - 1) * 4 + (beat - 1)) * BEAT;
}
// The i-th event of a kind from events.json (typing, heartbeat, ...), or the storyboard's number when it is missing.
function kitEv(name, i, fallback) { const e = events(name); return e[i] ? e[i].t : fallback; }
// An impact envelope: 0 before t0, rises to 1 in `atk`, then decays with time constant `dec`.
function kitEnv(t, t0, atk = .05, dec = .25) { if (t < t0) return 0; const a = t - t0; return a < atk ? ease(a / atk) : Math.exp(-(a - atk) / dec); }
// Easings beyond core.js (ease, easeIn, easeOut, backOut, elasticOut are there). All take x in 0..1.
const kitEase = {
  in2: x => clamp(x) ** 2, out2: x => 1 - (1 - clamp(x)) ** 2,
  inOut3: x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  expoIn: x => (x = clamp(x)) <= 0 ? 0 : Math.pow(2, 10 * (x - 1)),                 // slow, then very fast (a push through the toms)
  expoOut: x => (x = clamp(x)) >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  sine: x => .5 - .5 * Math.cos(clamp(x) * Math.PI)
};
// Ease out with overshoot s (backOut is s = 1.9): comes in past 1 and settles back.
function kitOver(x, s = 1.4) { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); }
// A move 0 → 1 between t0 and t1 with the principles built in: a small step the other way before it (anticipation,
// `ant` = fraction of the distance, over `pre` s), an eased travel, an overshoot (`over`) that rings back to 1 (follow
// through). Use it for arms, props, a head dip: x = lerp(a, b, kitMove(t, 12.2, 12.5)).
function kitMove(t, t0, t1, o = {}) {
  const ant = o.ant ?? .12, over = o.over ?? .1, pre = o.pre ?? .09, k = o.ring ?? 9, w = o.w ?? 17;
  if (t < t0 - pre) return 0;
  if (t < t0) return -ant * Math.sin(seg(t, t0 - pre, t0) * Math.PI * .5);
  if (t < t1) return lerp(-ant, 1 + over, ease(seg(t, t0, t1)));
  const a = t - t1; return 1 + over * Math.exp(-k * a) * Math.cos(w * a);
}

// ---------------------------------------------------------------------------------------------------- camera
// Camera from keyframes [[lt, cx, cy, zoom, rot?], ...] (eased between keys), plus optional hand-held drift and impact
// shake: kitCam(lt, keys, { ease, drift: px, driftF: Hz, shake: px }). Calls camBegin: pair it with camEnd().
// Returns { cx, cy, zoom, rot }. Zoom stays <= 2 (p5.brush collapses outlines past that); for more, draw bigger (u).
function kitCam(lt, keys, o = {}) {
  let [cx, cy, z, r] = kf(lt, keys.map(k => [k[0], [k[1], k[2], k[3], k[4] ?? 0]]), o.ease || ease);
  if (o.drift) { const [dx, dy] = kitDrift(lt, o.drift, o.driftF); cx += dx / z; cy += dy / z; }
  if (o.shake) { const [sx, sy] = shakeXY(lt, o.shake); cx += sx / z; cy += sy / z; }
  camBegin(cx, cy, z, r); return { cx, cy, zoom: z, rot: r };
}
// Zoom between a and b from z0 to z1 by equal ratios per second (a push or pull looks even; a plain lerp seems to
// slow down). e = the easing of the progress (default ease; kitEase.expoIn = an accelerating push).
function kitZoom(lt, a, b, z0, z1, e = ease) { return z0 * Math.pow(z1 / z0, e(seg(lt, a, b))); }
// camBegin arguments that put the WORLD point (wx, wy) at the SCREEN point (sx, sy) at this zoom: [cx, cy, zoom].
// Match cuts: end shot A with its landmark at (sx, sy), start shot B with its own landmark at the same (sx, sy).
function kitAnchor(wx, wy, sx, sy, zoom) { return [wx - (sx - W / 2) / zoom, wy - (sy - H / 2) / zoom, zoom]; }
// Slow hand-held float: [dx, dy] in px, never still, never a loop you can see.
function kitDrift(t, amp = 6, f = .3, seed = 0) { return [amp * (Math.sin((t * f + seed) * TAU) * .7 + Math.sin((t * f * 2.3 + seed * 1.7 + .3) * TAU) * .3), amp * .7 * (Math.sin((t * f * 1.37 + seed * .6 + .2) * TAU) * .7 + Math.sin((t * f * 2.9 + seed) * TAU) * .3)]; }
// Whip pan: the camera slides sideways fast (accelerating out of shot A, decelerating into shot B). Add .dx to cx;
// .speed 0..1 drives the smear. dir +1 = the camera moves right (the picture streaks left).
//   shot A, last `dur` s:   const w = kitWhipOut(lt - (shotDur - dur), dur, dir);     camBegin(cx + w.dx, ...)   ... kitSmear(w.speed, dir)
//   shot B, first `dur` s:  const w = kitWhipIn(lt, dur, dir);
function kitWhipOut(a, dur = .2, dir = 1, dist = W * 1.2) { const k = clamp(a / dur); return { dx: dir * dist * kitEase.in2(k), speed: k <= 0 ? 0 : k, k }; }
function kitWhipIn(a, dur = .2, dir = 1, dist = W * 1.2) { const k = clamp(a / dur); return { dx: -dir * dist * (1 - kitEase.out2(k)) , speed: 1 - k, k }; }
// The streaks a whip pan leaves: long dry-brush strokes across the frame, in screen space (call after camEnd()).
// cols = the colours of what is on screen (the stripes borrow them).
function kitSmear(speed, dir = 1, cols = [KIT.CYAN, KIT.CYANW], seed = 0) {
  if (speed <= .03) return;
  for (let i = 0; i < 18; i++) {
    boilSeed('kitsmear' + seed + '_' + i);
    const y = H * (.04 + .92 * hash(i * 3.17 + seed)), len = W * (.35 + .85 * hash(i * 7.9 + seed)) * speed, cx = W * hash(i * 5.3 + seed + 1) + dir * W * .25 * (1 - speed);
    inkLine([[cx - len / 2, y], [cx + len / 2, y + (hash(i * 2.2) - .5) * 14]], 4 + 22 * speed * hash(i * 1.3 + 2), cols[i % cols.length], 'dry', 0);
  }
}

// ---------------------------------------------------------------------------------------------------- transitions
// Draw these last, in screen space (after camEnd()). k = cover 0..1.
function kitFade(k, col = KIT.VOID) { flash(k, col); }                       // cover the frame in `col` (a fade to / from black: never pure black)
function kitFadeIn(lt, dur = .6, col = KIT.VOID) { if (lt < dur) kitFade(1 - kitEase.sine(lt / dur), col); }                     // first shot of a section: from black
function kitFadeOut(lt, dur, total, col = KIT.VOID) { if (lt > total - dur) kitFade(kitEase.sine((lt - (total - dur)) / dur), col); }   // last `dur` s of a shot: to black
// A flash of light: the frame washed with `col`, with a glow from the middle so it reads as light, not paint. k 0..1.
function kitFlash(k, col = KIT.CYANW, o = {}) {
  if (k <= .01) return;
  flash(Math.min(1, k * (o.wash ?? .9)), col);
  glow(o.x ?? W / 2, o.y ?? H / 2, (o.r ?? W * .9) * (.6 + .4 * k), o.glowCol || KIT.CYAN, Math.min(1, k * 1.2));
}
// Light spilling out of a source: a big additive glow that grows to swallow the frame (00C's flash onto his face, 00D's
// cyan riser). (x, y) the source in screen px, k 0..1 the spill, o.r the radius at k = 1.
function kitSpill(k, x = W / 2, y = H / 2, col = KIT.CYAN, o = {}) {
  if (k <= .01) return;
  const r = (o.r ?? W * 1.1) * (.25 + .75 * k);
  glow(x, y, r, col, Math.min(1, k * 1.3)); glow(x, y, r * .55, o.core || KIT.CYANW, Math.min(1, k * 1.1));
  if (k > .6) flash((k - .6) / .4 * (o.cover ?? .8), o.core || KIT.CYANW);
}
// Cross dissolve between two drawings of the frame: drawA() and drawB() each paint a whole frame (a shot, called with
// its own t / lt). k 0..1 (0 = all A, 1 = all B). Costs both drawings plus a framebuffer read, so keep it to ~6 frames.
// Both are pure functions of t, so it stays deterministic.
function kitXfade(k, drawA, drawB) {
  if (k <= 0) { drawA(); return; }
  if (k >= 1) { drawB(); return; }
  drawA(); flushLetters(); flushBrush();
  const snap = get();
  push(); resetMatrix(); translate(-W / 2, -H / 2); clear(); image(paperG, 0, 0); pop();
  drawB(); flushLetters(); flushBrush();
  push(); resetMatrix(); translate(-W / 2, -H / 2); tint(255, 255 * (1 - ease(k))); image(snap, 0, 0, W, H); noTint(); pop();
  freeImage(snap);
}

// ---------------------------------------------------------------------------------------------------- debug
// The subtitle-safe guide: a magenta line at y = .76 H (faces, hands and key props above it while someone sings or
// speaks) and ticks at the two lyric baselines. Off by default. On in the studio with ?safe, and in a render with
// `--inject=tools/safe_guide.js`. It wraps drawWorld() so no shot has to call it.
let KIT_DEBUG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('safe');
function kitGuide() {
  flushBrush();
  push(); noStroke();
  fill(255, 0, 170, 210); rect(0, KIT.SAFE - 1.5, W, 3);
  fill(255, 0, 170, 120); rect(0, KIT.EN - 1, 60, 2); rect(W - 60, KIT.EN - 1, 60, 2); rect(0, KIT.ZH - 1, 60, 2); rect(W - 60, KIT.ZH - 1, 60, 2);
  fill(255, 0, 170, 60); rect(0, KIT.SAFE, W, H - KIT.SAFE);
  pop();
}
if (typeof drawWorld === 'function' && !drawWorld.kitWrapped) {
  const kitDrawWorld0 = drawWorld;
  window.drawWorld = function (t) { kitDrawWorld0(t); if (KIT_DEBUG || window.KIT_DEBUG) kitGuide(); };
  window.drawWorld.kitWrapped = true;
}
