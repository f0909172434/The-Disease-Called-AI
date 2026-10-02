// Entry point. Exposes window.__mv = { ready, renderFrame(t), captureFrame(t, q), duration, fps, W, H }.
//
// URL params:
//   ?t=55.8          render one frame at t (seconds) once ready
//   ?play=1          real-time preview (humans only; uses rAF + <audio>), &audio=../music/build/master.wav
//   ?gallery=1       kit gallery debug scene (combine with &t=)
//   ?scale=0.5       render resolution = 1920x1080 * scale   (or &w=..&h=..)
//   ?fps=30          frame rate used for frame-indexed effects (grain seed)
//   ?timeline=data/x.json   force a timeline file
//   ?samples=0       MSAA samples for scene render targets (default 0: costly on SwiftShader; kit draws its own AA)
//   ?hud=1           debug overlay (time / bar / section) — never use for renders
import * as THREE from 'three';
import { loadFonts } from './core/fonts.js';
import { TextSystem } from './core/text.js';
import { Audio } from './core/audio.js';
import { Post } from './core/post.js';
import { Director } from './core/director.js';
import { LyricsOverlay } from './core/lyrics.js';
import * as ease from './core/ease.js';
import * as R from './core/rng.js';
import * as cam from './core/camera.js';
import * as palette from './core/palette.js';
import * as kit from './kit/index.js';
import { buildScenes } from './scenes/index.js';

const params = new URLSearchParams(location.search);
const scale = parseFloat(params.get('scale') || '1');
const W = parseInt(params.get('w') || String(Math.round(1920 * scale)), 10);
const H = parseInt(params.get('h') || String(Math.round(1080 * scale)), 10);
const FPS = parseFloat(params.get('fps') || '30');

async function loadTimeline() {
  const forced = params.get('timeline');
  const candidates = forced ? [forced] : ['data/timeline.json', 'data/timeline.placeholder.json'];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (r.ok) { const j = await r.json(); j._source = url; return j; }
    } catch (e) { /* try next */ }
  }
  throw new Error('no timeline found (run analysis/make_placeholder_timeline.py)');
}

function makeRenderer() {
  const canvas = document.getElementById('mv');
  canvas.width = W; canvas.height = H;
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: false, preserveDrawingBuffer: true,
    powerPreference: 'high-performance', stencil: false, depth: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.autoClear = true;
  renderer.sortObjects = true;
  return renderer;
}

async function boot() {
  const [timeline] = await Promise.all([loadTimeline(), loadFonts('assets/fonts/')]);
  const renderer = makeRenderer();
  const audio = new Audio(timeline);
  const text = new TextSystem();
  const samples = parseInt(params.get('samples') || '0', 10);
  const post = new Post(renderer, W, H, { fps: FPS, samples });
  const lyrics = new LyricsOverlay(renderer, text, timeline, W, H);
  const hudCam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -1000, 1000);
  hudCam.position.z = 10;

  const ctx = {
    THREE, renderer, W, H, u: H / 1080, aspect: W / H, fps: FPS, duration: timeline.duration || 215,
    params, timeline, audio, text, post, lyrics, kit, ease, cam, palette,
    C: palette.C, col: palette.col, rgba: palette.rgba,
    rng: R.rng, hash01: R.hash01, hash: R.hash, noise1: R.noise1, fbm1: R.fbm1, noise2: R.noise2,
    clearColor: new THREE.Color(palette.C.VOID),
    time: 0, frame: 0, target: null, scene: null,
    hudCamera: hudCam,
    /** render into the director-bound target (keeps the frame's clear) */
    renderScene(scene, camera) {
      renderer.setRenderTarget(ctx.target);
      const prev = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = prev;
    },
    /** screen-space overlay scene in pixels (origin center, y up) drawn on top, before post */
    renderHUD(hud) {
      renderer.setRenderTarget(ctx.target);
      const prev = renderer.autoClear;
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(hud, hudCam);
      renderer.autoClear = prev;
    },
    /** offscreen render (e.g. a screen texture); restores the director's target */
    renderToTarget(rt, scene, camera, clear = palette.C.VOID, alpha = 1) {
      renderer.setRenderTarget(rt);
      renderer.setClearColor(clear, alpha);
      renderer.clear(true, true, false);
      const prev = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(scene, camera);
      renderer.autoClear = prev;
      renderer.setRenderTarget(ctx.target);
      renderer.setClearColor(ctx.clearColor, 1);
    },
    makeRT(w, h, opts = {}) {
      return new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: true, ...opts });
    },
  };
  window.__ctx = ctx; // debugging only

  const scenes = buildScenes(ctx, { gallery: params.has('gallery') });
  const director = new Director(ctx, scenes);
  await director.init();

  // warm-up: compile every scene's programs + post variants (does not affect determinism)
  director.warmup();
  for (const s of director.schedule) {
    const tt = Math.min(s.end - 1e-3, s.start + 0.5);
    director.renderFrame(Math.max(0, tt));
  }

  const gl = renderer.getContext();
  const api = {
    duration: ctx.duration, fps: FPS, W, H, timelineSource: timeline._source,
    renderFrame(t) { director.renderFrame(t); gl.finish(); return true; },
    /** render + encode in-page; returns base64 (no data: prefix) */
    async captureFrame(t, quality = 0.95, type = 'image/jpeg') {
      director.renderFrame(t);
      const blob = await new Promise((res) => renderer.domElement.toBlob(res, type, quality));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
      return btoa(s);
    },
    sections: audio.sections,
    director, ctx,
  };
  return api;
}

const ready = boot().then((api) => {
  Object.assign(window.__mv, api);
  document.body.dataset.ready = '1';
  if (params.has('play')) startPlayback();
  else if (params.has('t')) window.__mv.renderFrame(parseFloat(params.get('t')));
  if (params.has('hud')) debugHud();
  return true;
}).catch((err) => {
  console.error(err);
  document.body.dataset.error = String(err && err.stack || err);
  throw err;
});
window.__mv = { ready, renderFrame: () => { throw new Error('not ready'); } };

// Human real-time preview lives in its own module: the deterministic engine never reads a clock.
async function startPlayback() {
  const { startPreview } = await import('./preview.js');
  startPreview(window.__mv, params);
}
function debugHud() {
  import('./preview.js').then((m) => m.debugHud(window.__mv));
}
