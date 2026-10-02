// Shared helpers for render.mjs / contact_sheet.mjs: static file server + headless Chromium
// (SwiftShader WebGL) + page boot + frame capture.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const VISUALS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CHROME = process.env.MV_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const CHROME_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--force-color-profile=srgb', '--hide-scrollbars', '--mute-audio', '--font-render-hinting=none'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8', '.bin': 'application/octet-stream', '.css': 'text/css',
};

/** serve `root` on 127.0.0.1:<random port>. Returns { url, close } */
export function serve(root = VISUALS) {
  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      let p = decodeURIComponent(u.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(root, p));
      if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
      fs.stat(file, (err, st) => {
        if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Content-Length': st.size, 'Cache-Control': 'no-cache' });
        fs.createReadStream(file).pipe(res);
      });
    } catch (e) { res.writeHead(500); res.end(String(e)); }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => new Promise((r) => server.close(r)) });
    });
  });
}

export async function launch() {
  return chromium.launch({ executablePath: CHROME, headless: true, args: CHROME_ARGS });
}

/** open the engine page and wait for window.__mv.ready. query: extra URL params object */
export async function openEngine(browser, baseUrl, { W = 1920, H = 1080, query = {}, log = console.error } = {}) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', (m) => {
    if ((m.type() === 'error' || m.type() === 'warning') && !/404 \(Not Found\)/.test(m.text())) log(`[page ${m.type()}] ${m.text()}`);
  });
  let bootError = null;
  page.on('pageerror', (e) => { log(`[page error] ${e.message}`); if (!bootError) bootError = e; });
  const q = new URLSearchParams({ capture: '1', w: String(W), h: String(H), ...query });
  await page.goto(`${baseUrl}/index.html?${q}`);
  // wait for ready, but fail fast on module/load errors
  for (let waited = 0; ; waited += 250) {
    const st = await page.evaluate(() => (document.body.dataset.ready === '1' ? 'ok' : document.body.dataset.error ? 'err' : ''));
    if (st) break;
    if (bootError) throw new Error(`engine failed to load: ${bootError.message}`);
    if (waited > 300000) throw new Error('engine boot timeout');
    await new Promise((r) => setTimeout(r, 250));
  }
  const err = await page.evaluate(() => document.body.dataset.error || null);
  if (err) throw new Error(`engine failed to boot:\n${err}`);
  const info = await page.evaluate(() => ({ duration: window.__mv.duration, fps: window.__mv.fps, W: window.__mv.W, H: window.__mv.H, timeline: window.__mv.timelineSource }));
  const cdp = await page.context().newCDPSession(page);
  return { page, cdp, info };
}

/**
 * Render frame at t and return a JPEG Buffer.
 * method: 'blob' (canvas.toBlob in page, default, fastest) | 'cdp' (Page.captureScreenshot) | 'screenshot' (page.screenshot)
 */
export async function captureJpeg(eng, t, { method = 'blob', quality = 95 } = {}) {
  if (method === 'blob') {
    const b64 = await eng.page.evaluate(([tt, q]) => window.__mv.captureFrame(tt, q), [t, quality / 100]);
    return Buffer.from(b64, 'base64');
  }
  await eng.page.evaluate((tt) => window.__mv.renderFrame(tt), t);
  if (method === 'screenshot') return eng.page.screenshot({ type: 'jpeg', quality });
  const r = await eng.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality, optimizeForSpeed: true, captureBeyondViewport: false });
  return Buffer.from(r.data, 'base64');
}

export function parseArgs(argv, defaults) {
  const o = { ...defaults };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const nxt = argv[i + 1];
    if (nxt === undefined || nxt.startsWith('--')) o[k] = true;
    else { o[k] = nxt; i++; }
  }
  return o;
}

export function fmtTime(s) {
  if (!isFinite(s)) return '--:--';
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h ? `${h}:` : '') + `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
