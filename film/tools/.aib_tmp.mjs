// throwaway (deleted after use): interleaved per-figure timing of her modes, one browser
import { parseArgs, serve, launch, openPage, studioURL } from './harness.mjs';
const args = parseArgs(); const server = await serve(); const b = await launch(args);
const page = await openPage(b, studioURL(server, args), args);
const reps = +(args.reps || 3), only = String(args.only).split(',').map(Number);
await page.evaluate(() => { window.aibFrame = async t => { const t0 = performance.now(); T = t; await redraw(); const gl = drawingContext, px = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return Math.round(performance.now() - t0); }; });
const names = await page.evaluate(() => AIB_TESTS.map(x => x[0]));
for (const i of only) for (const w of (names[i].match(/reels|shards/) ? [.01, .1, .2] : [.01])) await page.evaluate(t => aibFrame(t), i * .5 + w);
const out = {};
for (let r = 0; r < reps; r++) for (const i of only) { const ms = await page.evaluate(t => aibFrame(t), i * .5 + .04 + (r % 6) / 12); (out[i] = out[i] || []).push(ms); console.log(`rep ${r} ${names[i]} ${ms}`); }
for (const i of only) { const s = [...out[i]].sort((a, b) => a - b); console.log('RESULT', names[i].padEnd(18), 'median', s[s.length >> 1], 'all', out[i].join(' ')); }
process.exit(0);
