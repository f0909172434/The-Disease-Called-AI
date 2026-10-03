#!/usr/bin/env bash
# Download a Colab render (tools/colab_render.ipynb) from its GitHub release into output/colab/.
#
#   tools/fetch_colab_render.sh <tag>            e.g. mv-render-1a2b3c4 (the notebook prints it at the end)
#   tools/fetch_colab_render.sh <tag> --list     only list the release's assets, download nothing
#
# Uses the GitHub REST API through curl: lists the release's assets, then downloads each one with
# "Accept: application/octet-stream" (resumable; a finished file of the right size is skipped).
# A video that the notebook had to upload in raw parts (video_<sha>.mp4.part001, ...) is put back together
# and every MP4 is checked against the sha256 in render_log.json.
#
# Optional environment:
#   GH_TOKEN / GITHUB_TOKEN   only needed for a private repo or a draft release (the default repo is public)
#   COLAB_RENDER_REPO         default f0909172434/voicebank-cache
#   OUT_DIR                   default <repo>/output/colab
#   GITHUB_API_URL            default https://api.github.com
set -euo pipefail

REPO="${COLAB_RENDER_REPO:-f0909172434/voicebank-cache}"
API="${GITHUB_API_URL:-https://api.github.com}"
tag="${1:-}"; mode="${2:-}"
if [ -z "$tag" ] || [ "$tag" = "-h" ] || [ "$tag" = "--help" ]; then sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 2; fi
command -v curl >/dev/null || { echo "curl is required" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 is required (it reads the API's JSON)" >&2; exit 1; }

root="$(cd "$(dirname "$0")/.." && pwd)"
out="${OUT_DIR:-$root/output/colab}"
token="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
auth=(); [ -n "$token" ] && auth=(-H "Authorization: Bearer $token")
hdr=(-H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28")
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT

# GET $1 into $tmp; echoes the HTTP status
get() { curl -sSL ${auth[@]+"${auth[@]}"} "${hdr[@]}" -o "$tmp" -w '%{http_code}' "$1"; }

status="$(get "$API/repos/$REPO/releases/tags/$tag" || true)"
if [ "$status" = "404" ] && [ -n "$token" ]; then
  # a draft release is not reachable by tag: look for it in the list
  status="$(get "$API/repos/$REPO/releases?per_page=100" || true)"
  if [ "$status" = "200" ]; then
    python3 - "$tag" "$tmp" <<'PY' > "$tmp.rel" || { echo "no release tagged $tag in $REPO" >&2; exit 1; }
import json, sys
tag, path = sys.argv[1], sys.argv[2]
rel = next((r for r in json.load(open(path)) if r.get("tag_name") == tag), None)
if not rel: sys.exit(1)
print(json.dumps(rel))
PY
    mv "$tmp.rel" "$tmp"; status=200
  fi
fi
case "$status" in
  200) ;;
  404) echo "no release tagged $tag in $REPO (a draft or private release needs GH_TOKEN)" >&2; exit 1 ;;
  401|403) echo "GitHub answered HTTP $status for $REPO (bad token, or rate limit: set GH_TOKEN)" >&2; exit 1 ;;
  *) echo "GitHub answered HTTP ${status:-none} for $REPO@$tag" >&2; exit 1 ;;
esac

assets="$(python3 - "$tmp" <<'PY'
import json, sys
r = json.load(open(sys.argv[1]))
print(f"# {r['html_url']}  ({'draft' if r.get('draft') else 'published'}, {r.get('created_at', '')})")
for a in sorted(r.get("assets", []), key=lambda a: a["name"]):
    print(f"{a['id']}\t{a['name']}\t{a['size']}\t{a.get('state', '')}")
PY
)"
echo "$assets" | sed -n '1p'
n=$(echo "$assets" | grep -vc '^#' || true)
if [ "$n" -eq 0 ]; then echo "release $tag has no assets yet" >&2; exit 1; fi
echo "$assets" | grep -v '^#' | while IFS=$'\t' read -r id name size state; do
  printf '  %-48s %10s MiB  %s\n' "$name" "$(( (size + 1048575) / 1048576 ))" "$state"
done
[ "$mode" = "--list" ] && exit 0

mkdir -p "$out"
fsize() { wc -c < "$1" | tr -d ' '; }
echo "$assets" | grep -v '^#' | while IFS=$'\t' read -r id name size state; do
  dest="$out/$name"
  if [ -f "$dest" ] && [ "$(fsize "$dest")" = "$size" ]; then echo "have      $name"; continue; fi
  case "$name" in *.part[0-9][0-9][0-9])        # a part whose joined MP4 is already here (the parts are deleted after joining)
    if [ -s "$out/${name%.part[0-9][0-9][0-9]}" ]; then echo "have      ${name%.part[0-9][0-9][0-9]} (joined)"; continue; fi ;;
  esac
  echo "download  $name"
  for attempt in 1 2 3; do
    rc=0
    curl -fL --progress-bar --retry 5 --retry-delay 3 -C - ${auth[@]+"${auth[@]}"} -H "Accept: application/octet-stream" \
         -o "$dest.part" "$API/repos/$REPO/releases/assets/$id" || rc=$?
    [ "$rc" = 0 ] && [ "$(fsize "$dest.part")" = "$size" ] && break
    echo "  attempt $attempt failed (curl exit $rc); retrying" >&2
    [ "$rc" = 33 ] && rm -f "$dest.part"          # the server refused to resume: start the file again
    [ "$attempt" = 3 ] && { echo "could not download $name" >&2; exit 1; }
  done
  mv "$dest.part" "$dest"
done

# raw parts -> the MP4 again
for first in "$out"/*.part001; do
  [ -e "$first" ] || continue
  base="${first%.part001}"
  echo "joining   $(basename "$base") from $(ls "$base".part[0-9][0-9][0-9] | wc -l | tr -d ' ') parts"
  cat "$base".part[0-9][0-9][0-9] > "$base.joining" && mv "$base.joining" "$base"
done

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1; else shasum -a 256 "$1" | cut -d' ' -f1; fi; }
bad=0
for log in "$out"/render_log*.json; do
  [ -e "$log" ] || continue
  vid="$out/$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['video_file'])" "$log")"
  [ -f "$vid" ] || continue
  want="$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['video_sha256'])" "$log")"
  if [ "$(sha256 "$vid")" = "$want" ]; then
    echo "sha256 ok $(basename "$vid")"
    rm -f "$vid".part[0-9][0-9][0-9]
  else
    echo "SHA256 MISMATCH for $vid: delete it (and its .part files) and run this again" >&2; bad=1
  fi
  python3 - "$log" <<'PY'
import json, sys
j = json.load(open(sys.argv[1])); f = j.get("ffprobe", {})
print(f"\n  commit {j['sha'][:12]}  {j.get('commit_subject', '')}\n  GPU {j['gpu']} (driver {j.get('gpu_driver')}), WebGL: {j.get('gl_renderer')}\n"
      f"  {j['workers']} workers, CRF {j['crf']}, {j['frames']} frames, {j.get('s_per_frame_wall')} s/frame overall, {j.get('wall_seconds_this_run')} s wall\n"
      f"  {f.get('size')} {f.get('codec')} {f.get('fps')} fps, {f.get('duration_s')} s, {f.get('frames')} frames")
PY
done
echo
echo "files are in $out"
echo "next: python3 tools/assemble.py --video <the video_*.mp4 above>     (muxes music/build/master.wav and encodes the deliverables)"
exit $bad
