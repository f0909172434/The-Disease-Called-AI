// Adapted from ClaudeAnimationBase (https://github.com/JohnHeibel/ClaudeAnimationBase, MIT, (c) 2026 John Heibel).
// render.mjs: renders studio.html in headless Chrome. Length and fps come from the page (PROJECT in src/config.js: 215 s,
// 24 fps). The page is served from the repo root by a local server (it reads ../music/build/*.json and assets/fonts).
//
//   Look at it (open the images with your image viewer / Read tool):
//     node render.mjs --sheet=0.5,1,1.5,2 [--cols=4] [--w=480] --out=out/check/a.jpg        contact sheet of chosen times
//     node render.mjs --strip=2.0:2.5 [--cols=6] [--w=320] --out=out/check/strip.jpg        EVERY frame in a stretch (motion)
//     node render.mjs --sheet=2.1,2.2 --crop=760,300,400,400 --w=600 --out=out/check/face.jpg full-res crops (details)
//     node render.mjs --strip=2.0:2.5 --crop-at=960,780,500,400 --out=out/check/feet.jpg       crops that follow a WORLD point
//         (x,y in world px, may be page expressions like PLK.MX(1.38); w,h in screen px) through each frame's camera
//     node render.mjs --stills=1.2,3.4 --out=out/stills                                     full-res PNGs
//     node render.mjs --bench=24 --from=55                                                  s/frame (one worker, no encode)
//     node render.mjs --serve [--port=8123]                                                 scrub studio.html in a browser
//   Make the video (parallel workers = separate Chromium processes, resumable H.264 chunks, master.wav muxed if present):
//     node render.mjs --video [--from=0 --to=215] [--workers=3] [--chunk=24] [--out=../output/video.mp4]
//         chunks live in out/chunks/<W>x<H>_<fps>fps/ and are reused on re-runs: --redo re-renders the chunks in
//         [--from, --to) (after you change a shot), --clean deletes them all first; --no-audio skips the mux; --crf=16
//         --preset=medium for the chunks. The encode is H.264 High, yuv420p, CFR.
//     node render.mjs --clip [--from=0 --to=4] --out=out/video.mp4                          straight to MP4 (one worker)
//     node render.mjs --frames [--from=0 --to=8] --workers=4                                JPEG frames → out/frames (resumable)
//     node render.mjs --encode --out=out/video.mp4                                          out/frames → MP4
//   Standalone loops (LOOPS in the page): add --loop=<name> to any of the above (times are then loop times), or
//     node render.mjs --loop=emotions --png --out=out/loop_emotions                          one cycle as PNGs (for GIFs)
//   Other flags: --fps=24 (default PROJECT.fps), --range=a:b (= --from=a --to=b), --audio=<file> (default PROJECT.audio),
//   --lyrics=hidden|karaoke|subtitle-only (override the overlay), --nocache (paint cached layers every frame, for A/B),
//   --inject=a.js,b.js (add throwaway scripts, e.g. a test shot, after the page loads), --chrome=<path>,
//   --soft-gl (SwiftShader; the default on Linux without a GPU) | --gpu-angle=vulkan|gl-egl (NVIDIA, headless Linux) |
//   --hw-gl (platform default GL), --file (load studio.html from file:// instead of the local server).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { cpus } from 'node:os';
import { FILM, parseArgs, serve, launch, openPage, studioURL, glFlags } from './tools/harness.mjs';

const args = parseArgs();
const FRAMES_DIR = 'out/frames';
const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);
// comma-separated fields, keeping commas inside parentheses ('PLK.MX(1.38),PLK.WL,500,300'); numbers stay numbers
const fields = s => { const out = []; let d = 0, cur = ''; for (const ch of String(s)) { if (ch === ',' && !d) { out.push(cur); cur = ''; continue; } d += ch === '(' ? 1 : ch === ')' ? -1 : 0; cur += ch; } out.push(cur); return out.map(v => isNaN(+v) ? v : +v); };
const fmt = s => s < 90 ? `${s.toFixed(0)} s` : s < 5400 ? `${(s / 60).toFixed(1)} min` : `${(s / 3600).toFixed(2)} h`;
const ffmpegOK = a => new Promise(ok => { const p = spawn('ffmpeg', ['-v', 'error', ...a], { stdio: ['ignore', 'ignore', 'inherit'] }); p.on('close', c => ok(c === 0)); });

// the page's settings (fps, duration, audio) without rendering anything
let server = null, fps = +args.fps || 24, info = null;
const url = () => studioURL(server, args);
async function boot() {
  if (!args.file) server = await serve();
  const b = await launch(args), p = await openPage(b, url(), args);
  info = await p.evaluate(() => ({ fps: typeof FPS !== 'undefined' ? FPS : 24, dur: window.LOOP ? window.LOOP.len : DUR, audio: PROJECT.audio || '',
    mv: typeof window.mvInfo === 'function' ? window.mvInfo() : null, gpu: window.gpuInfo() }));
  fps = +args.fps || info.fps;
  return { b, p };
}
const frameOf = async (page, t, type, q) => {
  const u = await page.evaluate((t, type, q) => window.renderAt(t, type, q), t, type, q);
  return Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
};
// [first frame, end frame) of --from/--to (or --range, or a positional --clip=a:b), clipped to the length
function frameRange(len, def = null) {
  let [a, b] = args.range ? span(args.range) : def || [0, len];
  if (args.from != null) a = +args.from; if (args.to != null) b = +args.to;
  return [Math.max(0, Math.round(a * fps)), Math.min(Math.round(len * fps), Math.round(b * fps))];
}
const audioFile = () => {
  if (args['no-audio']) return '';
  const a = args.audio || info.audio; if (!a) return '';
  const p = args.audio ? resolve(a) : resolve(FILM, a);
  return existsSync(p) ? p : '';
};
const cleanup = async (...bs) => { for (const b of bs) await b?.close().catch(() => {}); await server?.close(); };

if (args.encode) {
  const out = args.out || 'out/video.mp4', n = readdirSync(FRAMES_DIR).filter(f => f.endsWith('.jpg')).length;
  const { b } = await boot(); await cleanup(b); const audio = audioFile();
  console.log(`encoding ${n} frames → ${out}${audio ? ' with ' + audio : ''}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(fps), '-i', `${FRAMES_DIR}/f%05d.jpg`,
    ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('wrote ' + out);
  process.exit(0);
}

if (args.serve) {
  server = await serve(undefined, +args.port || 0);
  console.log(`studio: ${studioURL(server, {}).replace('?render', '')}   (?t=55.8  ?loop=<name>  ?lyrics=hidden  ?nocache)  Ctrl-C to stop`);
  await new Promise(() => {});
}

const { b: browser, p: page0 } = await boot();
console.log(`GL: ${glFlags(args).name} (${info.gpu})  fps ${fps}${info.mv ? `  data: ${JSON.stringify(info.mv.sources)}  ${info.mv.lyrics} lyric lines, ${info.mv.fonts} font faces` : ''}`);
const extraPage = async (tag) => openPage(browser, url(), args, tag);

if (args.sheet || args.strip) {
  const page = page0, out = args.out || 'out/sheet.jpg'; mkdirSync(dirname(out), { recursive: true });
  let ts;
  if (args.strip) { const [a, b] = span(args.strip); ts = []; for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps); }
  else ts = times(args.sheet);
  const crop = args.crop ? times(args.crop) : null, at = args['crop-at'] ? fields(args['crop-at']) : null;
  const { url: u, ms } = await page.evaluate((ts, c, w, crop, at) => window.renderSheet(ts, c, w, crop, at), ts, +(args.cols || (args.strip ? 6 : 3)), +(args.w || (args.strip ? 320 : 640)), crop, at);
  writeFileSync(out, Buffer.from(u.slice(u.indexOf(',') + 1), 'base64'));
  console.log(`${out}  (${ts.length} frames)  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const out = args.out || 'out/stills'; mkdirSync(out, { recursive: true });
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page0, s, 'image/png');
    const f = `${out}/t${s.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.bench) {
  // wall-clock s/frame of the real capture path (render + composite + JPEG), one worker; the first frame is reported
  // apart because it pays for cold caches (cachedLayer variants, shader compiles).
  const n = args.bench === true ? 12 : +args.bench, [f0] = frameRange(info.dur, [+(args.from || 0), info.dur]), ms = [];
  for (let i = 0; i < n; i++) { const t0 = Date.now(); await frameOf(page0, (f0 + i) / fps, 'image/jpeg', .95); ms.push(Date.now() - t0); console.log(`frame ${f0 + i} (t=${((f0 + i) / fps).toFixed(3)})  ${ms[i]} ms`); }
  const rest = ms.slice(1), mean = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), med = [...rest].sort((a, b) => a - b)[rest.length >> 1] || 0;
  const st = await page0.evaluate(() => window.mvInfo ? window.mvInfo().layers : null);
  console.log(`bench${args.nocache ? ' (nocache)' : ''}: first ${(ms[0] / 1000).toFixed(2)} s, then ${(mean(rest) / 1000).toFixed(2)} s/frame over ${rest.length} frames` +
    `  (median ${(med / 1000).toFixed(2)}, min ${(Math.min(...rest) / 1000).toFixed(2)}, max ${(Math.max(...rest) / 1000).toFixed(2)})` +
    (st ? `  cachedLayer: ${st.misses} painted (${(st.ms / 1000 / Math.max(1, st.misses)).toFixed(1)} s each), ${st.hits} reused` : ''));
} else if (args.png) {
  // PNG sequence (for GIFs): a loop's full cycle (frame n equals frame 0, so it isn't rendered), or --from/--to.
  const [f0, f1] = frameRange(info.dur), n = f1 - f0;
  const out = args.out || `out/${args.loop ? 'loop_' + args.loop : 'png'}`, workers = +(args.workers || 3); mkdirSync(out, { recursive: true });
  let next = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = w ? await extraPage('#' + w) : page0;
    while (next < n) { const i = next++; writeFileSync(`${out}/f${String(i).padStart(4, '0')}.png`, await frameOf(page, (f0 + i) / fps, 'image/png')); }
  }));
  console.log(`${n} frames → ${out}  (${((Date.now() - start) / n).toFixed(0)} ms/frame)`);
} else if (args.frames) {
  // Parallel and resumable: each worker pulls the next missing frame; files are written atomically.
  const [f0, f1] = frameRange(info.dur), workers = +(args.workers || 4);
  mkdirSync(FRAMES_DIR, { recursive: true });
  const todo = []; for (let i = f0; i < f1; i++) { const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  console.log(`${todo.length} frames to render (${f1 - f0 - todo.length} already done), ${workers} workers`);
  let next = 0, done = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = w ? await extraPage('#' + w) : page0;
    while (next < todo.length) {
      const i = todo[next++], f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      const buf = await frameOf(page, i / fps, 'image/jpeg', .94);
      writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
      if (++done % 24 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame effective  eta ${fmt((todo.length - done) * el / done)}`);
      }
    }
  }));
} else if (args.clip) {
  const [f0, f1] = frameRange(info.dur, typeof args.clip === 'string' ? span(args.clip) : null), audio = audioFile();
  const out = args.out || 'out/clip.mp4'; mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(audio ? ['-ss', String(f0 / fps), '-t', String((f1 - f0) / fps), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = f1 - f0, start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frameOf(page0, (f0 + i) / fps, 'image/jpeg', .93);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}`);
} else if (args.video) {
  await renderVideo();
} else {
  console.log('nothing to do: see the usage notes at the top of render.mjs');
}
await cleanup(browser);

// ---------- --video: parallel workers over chunks, resumable, H.264 + optional audio ----------
async function renderVideo() {
  const [f0, f1] = frameRange(info.dur), K = Math.max(1, +(args.chunk || 24)), workers = Math.max(1, +(args.workers || Math.max(1, Math.min(4, cpus().length - 1))));
  const out = resolve(args.out || join(FILM, '..', 'output', 'video.mp4')), audio = audioFile();
  const dir = resolve(args['chunks-dir'] || join(FILM, 'out', 'chunks', `1920x1080_${fps}fps${args.loop ? '_' + args.loop : ''}${args.nocache ? '_nocache' : ''}`));
  if (args.clean) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true }); mkdirSync(dirname(out), { recursive: true });
  const name = (a, b) => join(dir, `c${String(a).padStart(6, '0')}-${String(b).padStart(6, '0')}.mp4`);
  if (args.redo) for (const f of readdirSync(dir)) {   // drop every chunk that overlaps the range
    const m = /^c(\d+)-(\d+)\.mp4$/.exec(f); if (m && +m[1] < f1 && +m[2] > f0) unlinkSync(join(dir, f));
  }
  const chunks = []; for (let a = Math.floor(f0 / K) * K; a < f1; a += K) chunks.push([Math.max(a, f0), Math.min(a + K, f1)]);
  const todo = chunks.filter(([a, b]) => !existsSync(name(a, b)));
  const total = todo.reduce((s, [a, b]) => s + b - a, 0);
  console.log(`${f1 - f0} frames (${(f0 / fps).toFixed(2)}–${(f1 / fps).toFixed(2)} s) in ${chunks.length} chunks of ${K}; ${chunks.length - todo.length} done already; ${workers} workers → ${relative(process.cwd(), out)}`);
  let done = 0; const start = Date.now(), queue = todo.slice();
  const pool = await Promise.all(Array.from({ length: Math.min(workers, Math.max(1, todo.length)) }, async (_, w) => {
    if (!w) return { b: null, p: page0 };
    const b = await launch(args); return { b, p: await openPage(b, url(), args, '#' + w) };   // own process = own GPU process
  }));
  await Promise.all(pool.map(async ({ p }, w) => {
    while (queue.length) {
      const [a, b] = queue.shift(), file = name(a, b), part = file.replace(/\.mp4$/, '.part.mp4');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', args.preset || 'medium', '-crf', String(args.crf || 16), '-profile:v', 'high', '-pix_fmt', 'yuv420p',
        '-r', String(fps), '-fps_mode', 'cfr', '-video_track_timescale', String(fps * 1000), '-threads', '2', '-movflags', '+faststart', '-f', 'mp4', part],
        { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise(r => ff.on('close', r));
      for (let i = a; i < b; i++) {
        const buf = await frameOf(p, i / fps, 'image/jpeg', .95);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        done++;
        if (done % 12 === 0 || done === total) {
          const el = (Date.now() - start) / 1000;
          console.log(`frame ${done}/${total}  ${(el / done).toFixed(2)} s/frame wall (${(el / done * pool.length).toFixed(2)} per worker)  eta ${fmt((total - done) * el / done)}`);
        }
      }
      ff.stdin.end();
      if (await closed !== 0) throw new Error(`ffmpeg failed on chunk ${a}-${b}`);
      renameSync(part, file);
    }
  }));
  await Promise.all(pool.map(({ b }) => b?.close()));
  // concat (stream copy), then mux the master's matching stretch
  const list = join(dir, `list_${f0}_${f1}.txt`), tmp = out.replace(/\.mp4$/, '') + '.partial.mp4';   // (.gitignore: output/*.partial.mp4)
  writeFileSync(list, chunks.map(([a, b]) => `file '${name(a, b).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  if (!await ffmpegOK(['-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', tmp])) throw new Error('concat failed');
  if (audio) {
    const vid = tmp.replace(/\.partial\.mp4$/, '.video.partial.mp4'); renameSync(tmp, vid);
    const ok = await ffmpegOK(['-y', '-i', vid, '-ss', String(f0 / fps), '-t', String((f1 - f0) / fps), '-i', audio, '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', tmp]);
    unlinkSync(vid); if (!ok) throw new Error('audio mux failed');
  }
  renameSync(tmp, out);
  const el = (Date.now() - start) / 1000;
  console.log(`wrote ${relative(process.cwd(), out)}  (${f1 - f0} frames @ ${fps} fps${audio ? ', audio: ' + relative(process.cwd(), audio) : ', no audio'})` +
    (done ? `  ${fmt(el)}, ${(el / done).toFixed(2)} s/frame wall with ${pool.length} workers` : ''));
}
