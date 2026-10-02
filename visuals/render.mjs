#!/usr/bin/env node
// Frame renderer (docs/06_tech_spec.md §7).
//
//   node visuals/render.mjs --fps 30 --from 0 --to 215 --out output/video_noaudio.mp4 [--workers 2] [--scale 1]
//
// Options:
//   --fps N          frame rate (default 30). Frame i shows t = i / fps.
//   --from S --to S  time range in seconds (default 0 .. timeline duration). Frames [round(from*fps), round(to*fps)).
//   --out FILE       output mp4 (default output/video_noaudio.mp4)
//   --workers N      parallel Chromium instances (default 2). Each owns a GPU (SwiftShader) process.
//   --scale X        render at 1920x1080*X (default 1)
//   --chunk N        frames per intermediate chunk (default 90). Chunks are resumable: finished chunks
//                    are kept in <out>.chunks/ and skipped on re-run (delete the dir to force).
//   --crf N --preset P   x264 settings for intermediates (default 14 / slow, per spec)
//   --capture M      blob | cdp | screenshot   (default blob: canvas.toBlob in page, fastest)
//   --query "k=v&k2=v2"  extra engine URL params (e.g. "gallery=1", "timeline=data/x.json")
//   --keep-chunks    keep the chunk dir after a successful concat (default: keep; use --clean to delete)
//   --bench N        render N frames from --from with one worker, print s/frame, no video
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { serve, launch, openEngine, captureJpeg, parseArgs, fmtTime } from './tools/harness.mjs';

const args = parseArgs(process.argv.slice(2), {
  fps: '30', from: '0', to: '', out: 'output/video_noaudio.mp4', workers: '2', scale: '1', chunk: '90',
  crf: '14', preset: 'slow', capture: 'blob', query: '', clean: false, bench: '',
});
const fps = parseFloat(args.fps);
const scale = parseFloat(args.scale);
const W = Math.round(1920 * scale), H = Math.round(1080 * scale);
const workers = Math.max(1, parseInt(args.workers, 10));
const chunkSize = Math.max(1, parseInt(args.chunk, 10));
const query = Object.fromEntries(new URLSearchParams(args.query));
query.fps = String(fps);
const T0 = process.hrtime.bigint();
const log = (...a) => console.log(`[${fmtTime(Number(process.hrtime.bigint() - T0) / 1e9)}]`, ...a);

function ffmpegChunk(file) {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', args.preset, '-crf', String(args.crf), '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-fps_mode', 'cfr', '-video_track_timescale', String(Math.round(fps * 1000)),
    '-movflags', '+faststart', '-threads', '2', '-f', 'mp4', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  let failed = null;
  ff.stdin.on('error', (e) => { failed = e; });
  const done = new Promise((res, rej) => ff.on('exit', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const write = (buf) => new Promise((res, rej) => {
    if (failed) { rej(failed); return; }
    if (ff.stdin.write(buf)) res(); else ff.stdin.once('drain', res);
  });
  return { write, end: () => { ff.stdin.end(); return done; } };
}

async function bench(server) {
  const n = parseInt(args.bench, 10);
  const browser = await launch();
  const eng = await openEngine(browser, server.url, { W, H, query, log: (m) => log(m) });
  const t0 = parseFloat(args.from);
  await captureJpeg(eng, t0, { method: args.capture });   // warm-up frame (lazy GPU state)
  const start = process.hrtime.bigint();
  let bytes = 0;
  for (let i = 0; i < n; i++) bytes += (await captureJpeg(eng, t0 + i / fps, { method: args.capture })).length;
  const sec = Number(process.hrtime.bigint() - start) / 1e9;
  log(`bench: ${n} frames @ ${W}x${H} capture=${args.capture}: ${(sec / n).toFixed(3)} s/frame (avg jpeg ${(bytes / n / 1024).toFixed(0)} KiB)`);
  await browser.close();
}

async function main() {
  const server = await serve();
  if (args.bench) { await bench(server); await server.close(); return; }

  // probe duration from the engine if --to not given
  let to = args.to ? parseFloat(args.to) : NaN;
  const from = parseFloat(args.from);
  const outFile = path.resolve(process.cwd(), args.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const chunkDir = `${outFile}.chunks`;
  fs.mkdirSync(chunkDir, { recursive: true });

  const browsers = [];
  const engines = [];
  log(`launching ${workers} Chromium worker(s) at ${W}x${H} ...`);
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const b = await launch();
    browsers[k] = b;
    engines[k] = await openEngine(b, server.url, { W, H, query, log: (m) => log(`w${k} ${m}`) });
  }));
  const info = engines[0].info;
  if (!isFinite(to)) to = info.duration;
  log(`timeline: ${info.timeline}  duration ${info.duration}s`);

  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const total = f1 - f0;
  const chunks = [];
  for (let a = f0; a < f1; a += chunkSize) chunks.push({ a, b: Math.min(f1, a + chunkSize) });
  const tag = `${W}x${H}_${fps}fps`;
  const chunkPath = (c) => path.join(chunkDir, `chunk_${tag}_${String(c.a).padStart(6, '0')}_${String(c.b).padStart(6, '0')}.mp4`);
  const todo = chunks.filter((c) => !fs.existsSync(chunkPath(c)));
  const skipped = total - todo.reduce((s, c) => s + c.b - c.a, 0);
  log(`${total} frames (${f0}..${f1 - 1}) in ${chunks.length} chunks; ${chunks.length - todo.length} chunk(s) already done (${skipped} frames)`);

  let doneFrames = 0;
  const tStart = process.hrtime.bigint();
  let lastLog = 0;
  const progress = () => {
    const el = Number(process.hrtime.bigint() - tStart) / 1e9;
    if (el - lastLog < 5 && doneFrames < total - skipped) return;
    lastLog = el;
    const rate = doneFrames / el;
    const remain = (total - skipped - doneFrames) / rate;
    log(`progress ${doneFrames + skipped}/${total} frames (${(100 * (doneFrames + skipped) / total).toFixed(1)}%)  ` +
      `${rate.toFixed(2)} fps  ${(el / Math.max(1, doneFrames) * workers).toFixed(3)} s/frame/worker  ETA ${fmtTime(remain)}`);
  };

  const queue = todo.slice();
  await Promise.all(engines.map(async (eng, k) => {
    while (queue.length) {
      const c = queue.shift();
      const file = chunkPath(c);
      const part = file.replace(/\.mp4$/, '.part.mp4');
      const enc = ffmpegChunk(part);
      for (let i = c.a; i < c.b; i++) {
        const jpg = await captureJpeg(eng, i / fps, { method: args.capture });
        await enc.write(jpg);
        doneFrames++;
        progress();
      }
      await enc.end();
      fs.renameSync(part, file);
    }
  }));
  await Promise.all(browsers.map((b) => b.close()));
  await server.close();

  const list = path.join(chunkDir, `list_${tag}.txt`);
  fs.writeFileSync(list, chunks.map((c) => `file '${chunkPath(c).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  log('concatenating chunks ...');
  await new Promise((res, rej) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list,
      '-c', 'copy', '-movflags', '+faststart', outFile], { stdio: 'inherit' });
    ff.on('exit', (c) => (c === 0 ? res() : rej(new Error(`concat failed (${c})`))));
  });
  const el = Number(process.hrtime.bigint() - tStart) / 1e9;
  log(`wrote ${outFile} (${total} frames, ${(total / fps).toFixed(2)} s) in ${fmtTime(el)}` +
    (doneFrames ? `  avg ${(el / doneFrames).toFixed(3)} s/frame wall, ${(el / doneFrames * workers).toFixed(3)} s/frame/worker` : ''));
  if (args.clean) fs.rmSync(chunkDir, { recursive: true, force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
