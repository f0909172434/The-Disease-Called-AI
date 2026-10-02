// harness.mjs: what render.mjs and tools/check_determinism.mjs share: arguments, Chrome discovery and flags,
// a static file server over the repo root (studio.html reads ../music/build/*.json and assets/fonts over XHR), and
// opening studio.html in a page that is ready to render.
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { existsSync, readdirSync, statSync, createReadStream, readFileSync } from 'node:fs';
import { dirname, resolve, join, normalize, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';

export const FILM = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ROOT = resolve(FILM, '..');

// --key=value / --flag (a bare --flag is true)
export function parseArgs(argv = process.argv.slice(2)) {
  return Object.fromEntries(argv.map(a => { const m = /^--?([^=]+)(?:=([\s\S]*))?$/.exec(a); return m ? [m[1], m[2] ?? true] : [a, true]; }));
}

// Chromium builds Playwright downloaded (~/.cache/ms-playwright/chromium-NNNN), newest first
function playwrightChromes() {
  const dirs = [`${homedir()}/.cache/ms-playwright`, '/opt/pw-browsers'];
  return dirs.filter(existsSync).flatMap(dir => readdirSync(dir).filter(n => /^chromium-\d+$/.test(n)).sort((a, b) => b.split('-')[1] - a.split('-')[1])
    .flatMap(n => [`${dir}/${n}/chrome-linux64/chrome`, `${dir}/${n}/chrome-linux/chrome`]));
}
export function findChrome(args = {}) {
  const c = [args.chrome, process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', ...playwrightChromes()].find(p => p && existsSync(p));
  if (!c) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }
  return c;
}

// WebGL backend. --soft-gl: SwiftShader (CPU), which Chrome only allows when asked; the default on Linux when there is no
// GPU device (/dev/dri/renderD*, /dev/nvidia*). --gpu-angle=vulkan|gl-egl: headless Linux on an NVIDIA GPU (cloud or
// cluster node), where plain --use-gl=angle gets no WebGL context; check with gpu_probe.mjs. --hw-gl: platform default.
const ANGLE = { vulkan: ['--use-angle=vulkan', '--enable-features=Vulkan'], 'gl-egl': ['--use-angle=gl-egl'] };
export function hasGPU() {
  if (process.platform !== 'linux') return true;
  try { return readdirSync('/dev').some(n => /^nvidia\d/.test(n)) || (existsSync('/dev/dri') && readdirSync('/dev/dri').some(n => n.startsWith('renderD'))); } catch (e) { return false; }
}
export function glFlags(args = {}) {
  if (args['gpu-angle'] && !ANGLE[args['gpu-angle']]) { console.error(`--gpu-angle must be one of ${Object.keys(ANGLE)}`); process.exit(1); }
  const soft = args['soft-gl'] || (!args['hw-gl'] && !args['gpu-angle'] && process.platform === 'linux' && !hasGPU());
  return soft ? { name: 'swiftshader', flags: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }
    : args['gpu-angle'] ? { name: 'angle-' + args['gpu-angle'], flags: ANGLE[args['gpu-angle']] }
    : { name: 'platform', flags: process.platform === 'win32' ? ['--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-gl=angle'] };
}

export async function launch(args = {}) {
  const gl = glFlags(args);
  return puppeteer.launch({
    executablePath: findChrome(args), headless: true, protocolTimeout: 0,
    args: [...(process.platform === 'linux' ? ['--no-sandbox'] : []),   // Ubuntu 23.10+ blocks Chrome's user-namespace sandbox
      '--allow-file-access-from-files', '--ignore-gpu-blocklist', ...gl.flags, '--enable-gpu-rasterization', '--window-size=1920,1080',
      '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
      '--force-color-profile=srgb', '--font-render-hinting=none', ...String(args['chrome-flags'] || '').split(' ').filter(Boolean),
      // Determinism. Chrome 141 adds fingerprinting noise to canvas readbacks (toDataURL/getImageData); and whether a
      // 2D canvas (paper, grain, lettering, the compositor) is GPU- or CPU-rasterized is decided per process by
      // heuristics, and the two differ by ±1 here and there: same t, different pixels in different workers.
      '--disable-features=CanvasNoise,CanvasInterventions', '--disable-accelerated-2d-canvas']
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.css': 'text/css' };
// Static server over `root` on 127.0.0.1 (read-only, local only). Returns { url, close }.
export function serve(root = ROOT, port = 0) {
  const server = http.createServer((req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const file = normalize(join(root, p));
      if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
      let st; try { st = statSync(file); } catch (e) { res.writeHead(404); res.end('not found'); return; }
      if (!st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      createReadStream(file).pipe(res);
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(r => server.close(r)) })));
}
// URL of studio.html: through the server, or (--file) straight from disk as the original kit did
export function studioURL(server, args = {}) {
  const q = new URLSearchParams({ render: '' });
  if (args.lyrics) q.set('lyrics', args.lyrics);
  if (args.nocache) q.set('nocache', '');
  if (args.timeline) q.set('timeline', args.timeline);
  const base = server ? `${server.url}/${FILM.slice(ROOT.length + 1).split(sep).join('/')}/studio.html` : pathToFileURL(join(FILM, 'studio.html')).href;
  return `${base}?${q.toString().replace(/=(&|$)/g, '$1')}`;
}

// Open studio.html, wait for window.ready, inject throwaway scripts (--inject=a.js,b.js: e.g. a test shot that
// isn't in studio.html), and select a loop (--loop=name).
export async function openPage(browser, url, args = {}, tag = '') {
  const page = await browser.newPage();
  // not errors: optional data files that don't exist yet (data/timeline.json) show up as 404s; data.js loads with sync XHR
  page.on('console', m => { if (['error', 'warn', 'warning'].includes(m.type()) && !/404 \(Not Found\)|Synchronous XMLHttpRequest|willReadFrequently/.test(m.text())) console.log(`[page${tag}]`, m.text()); });
  page.on('pageerror', e => console.log(`[page error${tag}]`, e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.ready === true', { timeout: 180000, polling: 100 });
  for (const f of String(args.inject || '').split(',').filter(Boolean)) await page.addScriptTag({ content: readFileSync(resolve(f), 'utf8') + `\n//# sourceURL=${f}` });
  if (args.loop) {
    const ok = await page.evaluate(name => { if (!LOOPS[name]) return false; window.LOOP = LOOPS[name]; return true; }, args.loop);
    if (!ok) { console.error(`no loop named "${args.loop}"`); process.exit(1); }
  }
  return page;
}
