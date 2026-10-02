// Copies the exact three.js r170 files the engine uses from node_modules into vendor/.
// Re-run after changing the ADDONS list:  node tools/vendor_three.mjs
// Relative imports inside each addon are followed recursively, so only the files
// actually reachable from ADDONS are vendored.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const three = path.join(root, 'node_modules', 'three');
const jsm = path.join(three, 'examples', 'jsm');
const outAddons = path.join(root, 'vendor', 'addons');

const ADDONS = [
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/ShaderPass.js',
  'postprocessing/UnrealBloomPass.js',
];

const pkg = JSON.parse(fs.readFileSync(path.join(three, 'package.json'), 'utf8'));
if (pkg.version !== '0.170.0') console.warn(`warning: three ${pkg.version} installed, expected 0.170.0`);

fs.mkdirSync(outAddons, { recursive: true });
fs.copyFileSync(path.join(three, 'build', 'three.module.js'), path.join(root, 'vendor', 'three.module.js'));
fs.copyFileSync(path.join(three, 'LICENSE'), path.join(root, 'vendor', 'LICENSE.three.txt'));

const seen = new Set();
function copy(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const src = path.join(jsm, rel);
  const code = fs.readFileSync(src, 'utf8');
  const dst = path.join(outAddons, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, code);
  const re = /from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(code))) copy(path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])));
}
ADDONS.forEach(copy);
console.log(`vendored three ${pkg.version}: three.module.js + ${seen.size} addons:\n  ` + [...seen].join('\n  '));
