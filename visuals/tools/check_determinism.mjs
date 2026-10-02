#!/usr/bin/env node
// Determinism check: renders the same frames in two separate Chromium instances, forward order in
// one and shuffled order in the other, and compares SHA-256 hashes of the exact canvas pixels.
// Any mismatch means some state leaked between frames (a scene read last frame's value, a cache
// keyed on a rounded value but drawn from an exact one, a component state not set every frame...).
//
//   node visuals/tools/check_determinism.mjs                       # default spread over the timeline
//   node visuals/tools/check_determinism.mjs --times 5.6,6.0,6.5,30.2 --scale 0.5
//   node visuals/tools/check_determinism.mjs --range 0:11:0.5 --query gallery=1
import { serve, launch, openEngine, parseArgs } from './harness.mjs';

const args = parseArgs(process.argv.slice(2), { times: '', range: '', scale: '0.5', query: '', seed: '7' });
let times = [];
if (args.times) times = String(args.times).split(',').map(Number);
else if (args.range) { const [a, b, s] = String(args.range).split(':').map(Number); for (let t = a; t <= b + 1e-9; t += s) times.push(+t.toFixed(4)); }
else times = [0.3, 2.2, 3.4, 4.9, 5.6, 5.62, 6.0, 6.5, 7.6, 8.4, 9.3, 9.8, 10.3, 13, 31, 46, 60, 79, 90, 109.5, 112, 125, 146, 151, 175, 192, 200, 211];
const W = Math.round(1920 * parseFloat(args.scale)), H = Math.round(1080 * parseFloat(args.scale));
const query = Object.fromEntries(new URLSearchParams(args.query));

// deterministic shuffle (the checker itself must not use Math.random either)
let s = parseInt(args.seed, 10) >>> 0;
const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const shuffled = times.map((t) => [rnd(), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);

async function hashes(order) {
  const browser = await launch();
  const eng = await openEngine(browser, server.url, { W, H, query });
  const out = {};
  for (const t of order) {
    out[t] = await eng.page.evaluate(async (tt) => {
      window.__mv.renderFrame(tt);
      const gl = window.__ctx.renderer.getContext();
      const px = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const d = await crypto.subtle.digest('SHA-256', px);
      return Array.from(new Uint8Array(d)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
    }, t);
  }
  await browser.close();
  return out;
}

const server = await serve();
const [a, b] = await Promise.all([hashes(times), hashes(shuffled)]);
await server.close();
let bad = 0;
for (const t of times) {
  const ok = a[t] === b[t];
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} t=${String(t).padEnd(8)} ${a[t]} ${b[t]}`);
}
console.log(bad ? `\n${bad}/${times.length} frames differ between render orders: NOT deterministic` : `\nall ${times.length} frames identical across render orders and processes`);
process.exit(bad ? 1 : 0);
