// Font loading (local woff2 only; see tools/build_fonts.py) and CSS font strings per role.
//
// Roles (style guide §2):
//   ai     JetBrains Mono 400/700  + Noto Sans TC    (tracking +2%)
//   human  Cormorant Garamond Italic 500/600 + Noto Serif TC
//   ui     Inter 400/600 + Noto Sans TC               (ALL CAPS, tracking +12%)
//   title  Noto Serif TC 700 (heaviest available) + Cormorant
//   sans   Noto Sans TC + Inter (end card, CJK body)
//   serif  Cormorant Garamond (upright) + Noto Serif TC
// The "MV Symbols" face (DejaVu subset) provides ↻ ✓ ✕ ☰ etc. at the end of every stack.

export const STACKS = {
  ai: '"JetBrains Mono", "Noto Sans TC", "MV Symbols", monospace',
  human: '"Cormorant Garamond", "Noto Serif TC", "MV Symbols", serif',
  ui: '"Inter", "Noto Sans TC", "MV Symbols", sans-serif',
  title: '"Noto Serif TC", "Cormorant Garamond", "MV Symbols", serif',
  sans: '"Noto Sans TC", "Inter", "MV Symbols", sans-serif',
  serif: '"Cormorant Garamond", "Noto Serif TC", "MV Symbols", serif',
  mono: '"JetBrains Mono", "Noto Sans TC", "MV Symbols", monospace',
};

export const ROLE_DEFAULTS = {
  ai: { weight: 400, italic: false, tracking: 0.02 },
  human: { weight: 500, italic: true, tracking: 0.0 },
  ui: { weight: 600, italic: false, tracking: 0.12, caps: true },
  title: { weight: 700, italic: false, tracking: 0.0 },
  sans: { weight: 400, italic: false, tracking: 0.0 },
  serif: { weight: 400, italic: false, tracking: 0.0 },
  mono: { weight: 400, italic: false, tracking: 0.0 },
};

/** CSS font shorthand for canvas: cssFont('human', 46) -> 'italic 500 46px "Cormorant Garamond", ...' */
export function cssFont(role, sizePx, opts = {}) {
  const d = ROLE_DEFAULTS[role] || ROLE_DEFAULTS.sans;
  const weight = opts.weight ?? d.weight;
  const italic = opts.italic ?? d.italic;
  const stack = STACKS[role] || role;
  return `${italic ? 'italic ' : ''}${weight} ${sizePx}px ${stack}`;
}

let loaded = null;

/** Load every face in assets/fonts/fonts.json and wait until usable. Idempotent. */
export function loadFonts(base = 'assets/fonts/') {
  if (loaded) return loaded;
  loaded = (async () => {
    const res = await fetch(base + 'fonts.json');
    if (!res.ok) throw new Error('fonts.json missing: run python3 tools/build_fonts.py');
    const manifest = await res.json();
    const faces = manifest.faces.map((f) => new FontFace(f.family, `url(${base}${f.file})`, {
      weight: String(f.weight), style: f.style, display: 'block',
    }));
    await Promise.all(faces.map((f) => f.load()));
    for (const f of faces) document.fonts.add(f);
    await document.fonts.ready;
    // warm up glyph rasterization for each stack (first canvas use of a face can be lazy)
    const c = document.createElement('canvas').getContext('2d');
    for (const role of Object.keys(STACKS)) {
      for (const w of [400, 700]) {
        c.font = cssFont(role, 20, { weight: w });
        c.fillText('Aa你在嗎↻♥∞', 0, 20);
        c.font = cssFont(role, 20, { weight: w, italic: true });
        c.fillText('Aa你在嗎↻', 0, 20);
      }
    }
    return manifest.faces.length;
  })();
  return loaded;
}
