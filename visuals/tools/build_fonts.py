#!/usr/bin/env python3
"""Build the web fonts used by the visual engine (reproducible).

    cd visuals && npm install && python3 tools/build_fonts.py

Outputs (visuals/assets/fonts/):
  * NotoSansTC-{Regular,Bold}.subset.woff2   - face "Noto Sans CJK TC" from the system TTCs
  * NotoSerifTC-{Regular,Bold}.subset.woff2  - face "Noto Serif CJK TC"
  * MVSymbols.subset.woff2                   - a few arrows/symbols (↻ ✕ ⟳ ☰ ...) from DejaVu Sans
  * Latin faces copied from @fontsource (JetBrains Mono, Cormorant Garamond, Inter; "latin" subset)
  * fonts.json  - manifest consumed by src/core/fonts.js (family, weight, style, file)
  * charset.txt - the exact characters kept in the CJK subsets
  * LICENSE-*.txt - OFL / Bitstream-Vera license texts

The CJK subset contains every non-ASCII character used in docs/*.md (lyrics, storyboard,
screenplay, ...) plus printable ASCII, common CJK punctuation and a few UI symbols. If a
scene needs a new CJK character, add it to EXTRA_CHARS (or to a doc) and re-run.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

HERE = Path(__file__).resolve().parent
VISUALS = HERE.parent
REPO = VISUALS.parent
OUT = VISUALS / "assets" / "fonts"
NODE_FS = VISUALS / "node_modules" / "@fontsource"

NOTO_DIR = Path("/usr/share/fonts/opentype/noto")
DEJAVU = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")

DOCS = sorted((REPO / "docs").glob("*.md"))

# Characters scene authors are likely to need beyond the docs (UI strings, HUD, end card).
EXTRA_CHARS = (
    "０１２３４５６７８９"
    "，。、；：？！「」『』（）〔〕【】《》〈〉・—…‥～－＋＝／＼｜"
    "我你他她它的是在不了有人這那個們來去說愛病名為診斷患者心跳體溫劑量時間"
    "一二三四五六七八九十百千萬零"
    "♥♡∞●○■□▲△▼▽◆◇★☆•·°±×÷≈≠≤≥←→↑↓↺↻⟳✓✕✗☰▍▌█▁▂▃▄▅▆▇☎☏✉⚠"
)
SYMBOL_CHARS = "↺↻⟳✓✕✗☰⏎⌫"  # served by DejaVu Sans (missing from Noto CJK / Latin faces)

LATIN_FACES = [
    # family, package, weight, style
    ("JetBrains Mono", "jetbrains-mono", 400, "normal"),
    ("JetBrains Mono", "jetbrains-mono", 700, "normal"),
    ("JetBrains Mono", "jetbrains-mono", 800, "normal"),
    ("Cormorant Garamond", "cormorant-garamond", 400, "normal"),
    ("Cormorant Garamond", "cormorant-garamond", 500, "italic"),
    ("Cormorant Garamond", "cormorant-garamond", 600, "italic"),
    ("Cormorant Garamond", "cormorant-garamond", 600, "normal"),
    ("Inter", "inter", 300, "normal"),
    ("Inter", "inter", 400, "normal"),
    ("Inter", "inter", 600, "normal"),
    ("Inter", "inter", 800, "normal"),
]

CJK_FACES = [
    # family, ttc, face name, weight, out file
    ("Noto Sans TC", "NotoSansCJK-Regular.ttc", "Noto Sans CJK TC", 400, "NotoSansTC-Regular.subset.woff2"),
    ("Noto Sans TC", "NotoSansCJK-Bold.ttc", "Noto Sans CJK TC", 700, "NotoSansTC-Bold.subset.woff2"),
    ("Noto Serif TC", "NotoSerifCJK-Regular.ttc", "Noto Serif CJK TC", 400, "NotoSerifTC-Regular.subset.woff2"),
    ("Noto Serif TC", "NotoSerifCJK-Bold.ttc", "Noto Serif CJK TC", 700, "NotoSerifTC-Bold.subset.woff2"),
]


def collect_chars() -> str:
    chars: set[str] = set(chr(c) for c in range(0x20, 0x7F))
    for doc in DOCS:
        for ch in doc.read_text(encoding="utf-8"):
            if ord(ch) >= 0x2000 or ch in "°·×":
                chars.add(ch)
    chars.update(EXTRA_CHARS)
    # never keep control / variation selectors / zero-width chars
    chars = {c for c in chars if not (0xFE00 <= ord(c) <= 0xFE0F or ord(c) in (0x200B, 0x200C, 0x200D, 0xFEFF))}
    return "".join(sorted(chars))


def face_index(ttc_path: Path, family: str) -> int:
    coll = TTCollection(str(ttc_path), lazy=True)
    for i, font in enumerate(coll.fonts):
        if font["name"].getDebugName(1) == family:
            return i
    raise SystemExit(f"face {family!r} not found in {ttc_path}")


def subset_font(src: Path, out: Path, text: str, font_number: int | None = None) -> tuple[int, int]:
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.hinting = False          # smaller; canvas text is rendered unhinted anyway
    opts.desubroutinize = True
    if font_number is not None:
        opts.font_number = font_number
    font = subset.load_font(str(src), opts, dontLoadGlyphNames=True)
    have = set(font.getBestCmap().keys())
    keep = [c for c in text if ord(c) in have]
    sub = subset.Subsetter(opts)
    sub.populate(text="".join(keep))
    sub.subset(font)
    subset.save_font(font, str(out), opts)
    return len(keep), out.stat().st_size


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    text = collect_chars()
    (OUT / "charset.txt").write_text(text, encoding="utf-8")
    manifest = {"generated_by": "visuals/tools/build_fonts.py", "faces": []}

    for family, ttc, face, weight, outname in CJK_FACES:
        src = NOTO_DIR / ttc
        idx = face_index(src, face)
        n, size = subset_font(src, OUT / outname, text, idx)
        print(f"{outname:40s} face#{idx} {n:5d} glyph chars  {size/1024:7.1f} KiB")
        manifest["faces"].append({"family": family, "weight": weight, "style": "normal", "file": outname})
        # The CJK faces have no italics: register the upright file for italic requests too so the
        # browser never synthesizes slanted Chinese next to Cormorant Italic.
        manifest["faces"].append({"family": family, "weight": weight, "style": "italic", "file": outname})

    if DEJAVU.exists():
        n, size = subset_font(DEJAVU, OUT / "MVSymbols.subset.woff2", SYMBOL_CHARS)
        print(f"{'MVSymbols.subset.woff2':40s} {n:5d} glyph chars  {size/1024:7.1f} KiB")
        for style in ("normal", "italic"):
            for weight in (400, 700):
                manifest["faces"].append({"family": "MV Symbols", "weight": weight, "style": style,
                                          "file": "MVSymbols.subset.woff2"})
    else:
        print("warning: DejaVu Sans not found; ↻ etc. will be drawn procedurally only", file=sys.stderr)

    if not NODE_FS.exists():
        raise SystemExit("node_modules/@fontsource missing: run `npm install` in visuals/ first")
    for family, pkg, weight, style in LATIN_FACES:
        src = NODE_FS / pkg / "files" / f"{pkg}-latin-{weight}-{style}.woff2"
        dst = OUT / src.name
        shutil.copyfile(src, dst)
        manifest["faces"].append({"family": family, "weight": weight, "style": style, "file": dst.name})
        print(f"{dst.name:40s} copied        {dst.stat().st_size/1024:7.1f} KiB")

    # licenses
    for pkg, name in (("jetbrains-mono", "JetBrainsMono"), ("cormorant-garamond", "CormorantGaramond"),
                      ("inter", "Inter")):
        shutil.copyfile(NODE_FS / pkg / "LICENSE", OUT / f"LICENSE-{name}-OFL.txt")
    noto_lic = Path("/usr/share/doc/fonts-noto-cjk/copyright")
    if noto_lic.exists():
        shutil.copyfile(noto_lic, OUT / "LICENSE-NotoCJK-OFL.txt")
    dejavu_lic = Path("/usr/share/doc/fonts-dejavu-core/copyright")
    if dejavu_lic.exists():
        shutil.copyfile(dejavu_lic, OUT / "LICENSE-DejaVu.txt")

    (OUT / "fonts.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"charset: {len(text)} chars -> {OUT/'charset.txt'}")
    print(f"manifest: {OUT/'fonts.json'} ({len(manifest['faces'])} faces)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
