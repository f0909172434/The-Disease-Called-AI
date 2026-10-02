#!/usr/bin/env node
// Contact sheet: render frames at given times and lay them out in a labeled grid JPEG.
//
//   node visuals/contact_sheet.mjs --times 1,5,12.5,30 --out output/sheets/x.jpg
//   node visuals/contact_sheet.mjs --range 0:11:1.25 --out output/sheets/S00.jpg      (start:end:step)
//   node visuals/contact_sheet.mjs --times 0,1,2 --query gallery=1 --cols 2 --tile 960 --out output/sheets/kit.jpg
//
// Options: --cols N (default 4)  --tile PX tile width (default 640)  --scale X render scale (default 1)
//          --query "k=v&..." extra engine params  --frames-dir DIR also save each full-size frame
//          --title "text" sheet title
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openEngine, captureJpeg, parseArgs } from './tools/harness.mjs';

const args = parseArgs(process.argv.slice(2), { times: '', range: '', out: 'output/sheets/sheet.jpg', cols: '4', tile: '640', scale: '1', query: '', title: '' });
let times = [];
if (args.times) times = String(args.times).split(',').map((s) => parseFloat(s.trim())).filter((x) => isFinite(x));
if (args.range) {
  const [a, b, st] = String(args.range).split(':').map(parseFloat);
  for (let t = a; t <= b + 1e-9; t += st) times.push(Math.round(t * 1000) / 1000);
}
if (!times.length) { console.error('give --times a,b,c or --range start:end:step'); process.exit(1); }

const scale = parseFloat(args.scale);
const W = Math.round(1920 * scale), H = Math.round(1080 * scale);
const cols = parseInt(args.cols, 10), tileW = parseInt(args.tile, 10), tileH = Math.round(tileW * 9 / 16);
const query = Object.fromEntries(new URLSearchParams(args.query));

const server = await serve();
const browser = await launch();
const eng = await openEngine(browser, server.url, { W, H, query });
const frames = [];
const t0 = process.hrtime.bigint();
for (const t of times) {
  const jpg = await captureJpeg(eng, t, { method: 'blob' });
  const label = await eng.page.evaluate((tt) => {
    const a = window.__mv.ctx.audio; const s = a.section(tt);
    return `${tt.toFixed(3)}s  ${s.id} ${s.name}  b${a.barNumber(tt)}.${a.beatInBar(tt)}`;
  }, t);
  frames.push({ t, jpg, label });
  if (args['frames-dir']) {
    fs.mkdirSync(args['frames-dir'], { recursive: true });
    fs.writeFileSync(path.join(args['frames-dir'], `f_${t.toFixed(3)}.jpg`), jpg);
  }
}
const sec = Number(process.hrtime.bigint() - t0) / 1e9;

// compose in a blank page
const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
const rows = Math.ceil(frames.length / cols);
const pad = 10, labelH = 26, titleH = args.title ? 44 : 0;
const sheetW = cols * tileW + (cols + 1) * pad, sheetH = titleH + rows * (tileH + labelH) + (rows + 1) * pad;
const b64 = await page.evaluate(async ({ frames, cols, tileW, tileH, pad, labelH, titleH, sheetW, sheetH, title }) => {
  const cv = document.createElement('canvas');
  cv.width = sheetW; cv.height = sheetH;
  const c = cv.getContext('2d');
  c.fillStyle = '#0d0f14'; c.fillRect(0, 0, sheetW, sheetH);
  if (title) { c.fillStyle = '#cfefff'; c.font = '600 22px sans-serif'; c.fillText(title, pad, 30); }
  for (let i = 0; i < frames.length; i++) {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + frames[i].b64;
    await img.decode();
    const x = pad + (i % cols) * (tileW + pad), y = titleH + pad + Math.floor(i / cols) * (tileH + labelH + pad);
    c.drawImage(img, x, y, tileW, tileH);
    c.fillStyle = '#9fb3c8'; c.font = '13px monospace';
    c.fillText(frames[i].label, x + 2, y + tileH + 18);
  }
  return cv.toDataURL('image/jpeg', 0.92).split(',')[1];
}, { frames: frames.map((f) => ({ b64: f.jpg.toString('base64'), label: f.label })), cols, tileW, tileH, pad, labelH, titleH, sheetW, sheetH, title: args.title });
const out = path.resolve(process.cwd(), args.out);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
console.log(`wrote ${out}  (${frames.length} frames, ${(sec / frames.length).toFixed(3)} s/frame render+capture)`);
await browser.close();
await server.close();
