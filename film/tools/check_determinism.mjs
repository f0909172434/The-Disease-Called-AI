// Determinism check: the same t must give identical pixels whatever page renders it and in whatever order (frames
// render in parallel, out of order, with warm or cold cachedLayer caches). Renders the times in two separate Chromium
// processes, forward in one and shuffled in the other (which also re-renders its first frame at the end, warm), and
// compares SHA-256 hashes of the composited frame (paint + lyrics + grain). Exits 1 on any difference.
//
//   node tools/check_determinism.mjs                                  a spread over the film
//   node tools/check_determinism.mjs --times=55.5,55.54,56.2,58.7     chosen times
//   node tools/check_determinism.mjs --range=55:60:0.25               a:b:step
//   node tools/check_determinism.mjs --loop=him_test --times=0,0.1    a loop (times are loop times)
// Also takes render.mjs's --inject=, --lyrics=, --nocache, --soft-gl/--gpu-angle/--hw-gl, --chrome=, --file.
import { parseArgs, serve, launch, openPage, studioURL } from './harness.mjs';

const args = parseArgs();
let times = [];
if (args.times) times = String(args.times).split(',').map(Number);
else if (args.range) { const [a, b, s] = String(args.range).split(':').map(Number); for (let t = a; t <= b + 1e-9; t += s) times.push(+t.toFixed(4)); }
else times = [0.3, 4.9, 5.6, 5.65, 12, 23.5, 46, 56.2, 56.25, 60, 79, 90, 109.5, 113, 125, 146, 151, 175, 181, 192, 199, 211];

// deterministic shuffle (the checker itself must not use Math.random either)
let s = 7 >>> 0; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const shuffled = times.map(t => [rnd(), t]).sort((a, b) => a[0] - b[0]).map(x => x[1]);

const server = args.file ? null : await serve(), url = studioURL(server, args);
async function hashes(order, tag) {
  const browser = await launch(args), page = await openPage(browser, url, args, tag), out = {}, t0 = Date.now();
  for (const t of order) { const h = await page.evaluate(t => window.frameHash(t), t); if (t in out && out[t] !== h) out[t] = 'WARM-COLD MISMATCH ' + out[t].slice(0, 8) + '/' + h.slice(0, 8); else out[t] = h; }
  console.log(`${tag}: ${order.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await browser.close();
  return out;
}
const [a, b] = await Promise.all([hashes(times, 'A forward'), hashes([...shuffled, shuffled[0]], 'B shuffled')]);
await server?.close();
let bad = 0;
for (const t of times) {
  const ok = a[t] === b[t];
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'DIFF'} t=${String(t).padEnd(8)} ${a[t].slice(0, 16)} ${b[t].slice(0, 16)}`);
}
console.log(bad ? `\n${bad}/${times.length} frames differ between render orders/processes: NOT deterministic`
  : `\nall ${times.length} frames identical across render orders and processes`);
process.exit(bad ? 1 : 0);
