#!/usr/bin/env bash
# Install the two DiffSinger voicebanks into music/diffsinger/voicebanks/ (git-ignored).
#
#   music/diffsinger/fetch_voicebanks.sh                 # download from the official pages
#   music/diffsinger/fetch_voicebanks.sh --from DIR      # use zips already downloaded to DIR
#   music/diffsinger/fetch_voicebanks.sh --delete-zips   # remove the zips after extracting
#
# Zips are looked for (in this order) in --from DIR, $VOICEBANK_ZIPS and voicebanks/_zips/;
# missing ones are downloaded there from the official sources:
#   TIGER v106 (tigermeat)      github.com/spicytigermeat/tiger_diffsinger, release v106,
#                               TIGER_DS_v106_PACK.zip (the voice library is a zip inside it)
#   Hoshino Hanami ~AI❤dol~     lottev.moe (2024-09 release post) -> MediaFire,
#   for DiffSinger v1.0 (Lotte V) Hoshino_Hanami_~AIdol~_for_DiffSinger_v1.0.zip
#
# Licences: non-commercial use, credit required ("TIGER (tigermeat)",
# "Hoshino Hanami ~AI❤dol~ (Lotte V)"); both forbid re-uploading or redistributing the
# models — never commit voicebanks/ (it is git-ignored) and do not share the folder.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${DIFFSINGER_VOICEBANKS:-$HERE/voicebanks}"
ZIPS="$DEST/_zips"
FROM="${VOICEBANK_ZIPS:-}"
DELETE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --from) FROM="$2"; shift 2 ;;
    --delete-zips) DELETE=1; shift ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown option $1" >&2; exit 2 ;;
  esac
done

TIGER_ZIP="TIGER_DS_v106_PACK.zip"
TIGER_URL="${TIGER_URL:-https://github.com/spicytigermeat/tiger_diffsinger/releases/download/v106/$TIGER_ZIP}"
TIGER_API="https://api.github.com/repos/spicytigermeat/tiger_diffsinger/releases/tags/v106"
HANAMI_ZIP="Hoshino_Hanami_AIdol_for_DiffSinger_v1.0.zip"
HANAMI_PAGE="${HANAMI_PAGE:-https://www.mediafire.com/file/ks3hpb5zldabo3s/Hoshino_Hanami_%257EAIdol%257E_for_DiffSinger_v1.0.zip/file}"
TIGER_DIR="$DEST/TIGER_DS_v106"
HANAMI_DIR="$DEST/Hoshino Hanami ~AIdol~ for DiffSinger v1.0"

mkdir -p "$DEST" "$ZIPS"

# find_zip <glob>: first match in --from, $VOICEBANK_ZIPS, voicebanks/_zips
find_zip() {
  local pat="$1" d f
  for d in "$FROM" "$ZIPS"; do
    [ -n "$d" ] && [ -d "$d" ] || continue
    for f in "$d"/$pat; do [ -f "$f" ] && { echo "$f"; return 0; }; done
  done
  return 1
}

download() {  # download <url> <out>
  echo "  downloading $1"
  curl -fL --retry 3 -o "$2.part" "$1" && mv "$2.part" "$2"
}

# ---------------------------------------------------------------- TIGER
if [ -f "$TIGER_DIR/dsconfig.yaml" ]; then
  echo "TIGER: installed ($TIGER_DIR)"
else
  z="$(find_zip 'TIGER_DS_v106*.zip' || true)"
  if [ -z "$z" ]; then
    z="$ZIPS/$TIGER_ZIP"
    if ! download "$TIGER_URL" "$z"; then
      # the asset name may differ: ask the release API
      url="$(curl -fsSL "$TIGER_API" | python3 -c 'import json,sys; a=[x["browser_download_url"] for x in json.load(sys.stdin)["assets"] if x["name"].endswith(".zip")]; print(a[0] if a else "")')"
      [ -n "$url" ] && download "$url" "$z" || { echo "TIGER: download failed (github.com release assets blocked?). Put $TIGER_ZIP in $ZIPS or use --from DIR." >&2; exit 1; }
    fi
  fi
  echo "TIGER: extracting $(basename "$z")"
  tmp="$(mktemp -d "$DEST/.tiger.XXXX")"
  unzip -q -o "$z" -d "$tmp"
  inner="$(find "$tmp" -iname 'TIGER_DS_v106*.zip' ! -path "$z" | head -1)"
  mkdir -p "$TIGER_DIR"
  if [ -n "$inner" ]; then                           # the pack: voice library zip + plugins
    unzip -q -o "$inner" -d "$TIGER_DIR"
    plug="$(find "$tmp" -type d -name 'OpenUTAU Plugins' | head -1)"
    if [ -n "$plug" ]; then mkdir -p "$DEST/_extras"; rm -rf "$DEST/_extras/tiger_openutau_plugins"; mv "$plug" "$DEST/_extras/tiger_openutau_plugins"; fi
  else                                               # a bare voice library zip
    unzip -q -o "$z" -d "$TIGER_DIR"
  fi
  rm -rf "$tmp"
  # a voice library zip with a top-level folder: flatten it
  if [ ! -f "$TIGER_DIR/dsconfig.yaml" ]; then
    sub="$(dirname "$(find "$TIGER_DIR" -maxdepth 3 -name dsconfig.yaml -path '*/dsconfig.yaml' | awk '{print length, $0}' | sort -n | head -1 | cut -d' ' -f2-)")"
    [ -n "$sub" ] && [ "$sub" != "$TIGER_DIR" ] && { shopt -s dotglob; mv "$sub"/* "$TIGER_DIR"/; rmdir "$sub" 2>/dev/null || true; shopt -u dotglob; }
  fi
  [ -f "$TIGER_DIR/dsconfig.yaml" ] || { echo "TIGER: no dsconfig.yaml after extraction" >&2; exit 1; }
  [ "$DELETE" = 1 ] && rm -f "$z"
fi

# ---------------------------------------------------------------- Hanami
if [ -f "$HANAMI_DIR/dsconfig.yaml" ]; then
  echo "Hanami: installed ($HANAMI_DIR)"
else
  z="$(find_zip 'Hoshino*Hanami*DiffSinger*v1.0*.zip' || true)"
  if [ -z "$z" ]; then
    z="$ZIPS/$HANAMI_ZIP"
    echo "  resolving MediaFire link"
    direct="$(curl -fsSL "$HANAMI_PAGE" | grep -oE 'https://download[0-9]*\.mediafire\.com/[^"]+' | head -1 || true)"
    [ -n "$direct" ] && download "$direct" "$z" || { echo "Hanami: download failed (MediaFire blocked?). Download it from $HANAMI_PAGE and put it in $ZIPS or use --from DIR." >&2; exit 1; }
  fi
  echo "Hanami: extracting $(basename "$z")"
  tmp="$(mktemp -d "$DEST/.hanami.XXXX")"
  unzip -q -o "$z" -d "$tmp"
  root="$(dirname "$(find "$tmp" -maxdepth 3 -name dsconfig.yaml | awk '{print length, $0}' | sort -n | head -1 | cut -d' ' -f2-)")"
  [ -n "$root" ] && [ -f "$root/dsconfig.yaml" ] || { echo "Hanami: no dsconfig.yaml in the zip" >&2; exit 1; }
  rm -rf "$HANAMI_DIR"; mv "$root" "$HANAMI_DIR"
  mkdir -p "$DEST/_extras"; find "$tmp" -maxdepth 1 -type f -exec mv {} "$DEST/_extras/" \;
  rm -rf "$tmp"
  [ "$DELETE" = 1 ] && rm -f "$z"
fi

if [ -x "$HERE/bin/ourender" ]; then
  echo "== OpenUtau sees:"
  "$HERE/bin/ourender" singers --voicebanks "$DEST" | python3 -c 'import json,sys
for l in sys.stdin:
    if l.startswith("{"):
        for s in json.loads(l).get("singers", []): print("  ", s["id"], "|", s["name"], "|", ", ".join(b["color"] for b in s["subbanks"] or []))'
else
  echo "(build the renderer with music/diffsinger/setup.sh)"
fi
