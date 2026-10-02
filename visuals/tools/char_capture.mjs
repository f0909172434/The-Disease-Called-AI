// Capture any tools/*.html preview page to a JPEG (headless Chromium via the shared harness).
//   node tools/char_capture.mjs --page char_ai_preview.html [--out f.jpg] [--query "a=1"] [--width 1800 --height 1000]
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, parseArgs, VISUALS } from './harness.mjs';

const args = parseArgs(process.argv.slice(2), {
  out: path.join(VISUALS, '..', 'output', 'sheets', 'char_design.jpg'), page: 'char_ai_preview.html', query: '', quality: '92', width: '1800', height: '1000',
});
const srv = await serve(VISUALS);
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: Number(args.width), height: Number(args.height) }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  await page.goto(`${srv.url}/tools/${args.page}?${args.query}`);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 180000 });
  const b64 = await page.evaluate((q) => document.getElementById('c').toDataURL('image/jpeg', q).split(',')[1], Number(args.quality) / 100);
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, Buffer.from(b64, 'base64'));
  console.log('wrote', args.out);
} finally {
  await browser.close();
  await srv.close();
}
