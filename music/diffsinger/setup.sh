#!/usr/bin/env bash
# Build the headless DiffSinger renderer (music/diffsinger/bin/ourender).
#
#   music/diffsinger/setup.sh            # install .NET if needed, fetch OpenUtau, build
#   OPENUTAU_SRC=/path/to/clone music/diffsinger/setup.sh   # use an existing checkout
#
# Steps
#   1. .NET 10 SDK from the Ubuntu archive (apt: dotnet-sdk-10.0) unless `dotnet` exists.
#   2. OpenUtau (MIT) at the pinned commit below -> music/diffsinger/vendor/OpenUtau
#      (git-ignored; partial clone, blobs fetched on checkout).
#   3. dotnet publish ourender (Release, framework-dependent, linux-x64) with
#      ourender/cpu-onnxruntime.targets: OpenUtau.Core's Linux CUDA ONNX Runtime package
#      is replaced by the CPU package (Microsoft.ML.OnnxRuntime). No OpenUtau file is edited.
# Nothing here touches the system Python.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENUTAU_REPO="${OPENUTAU_REPO:-https://github.com/stakira/OpenUtau}"
OPENUTAU_COMMIT="${OPENUTAU_COMMIT:-ec7ba520583173c67aabfc5feab33390b4f720a4}"   # 2026-10-02
VENDOR="$HERE/vendor/OpenUtau"
OUT="$HERE/bin"

if ! command -v dotnet >/dev/null 2>&1; then
  echo "== installing dotnet-sdk-10.0 (apt)"
  if [ "$(id -u)" = 0 ]; then SUDO=""; else SUDO="sudo"; fi
  $SUDO apt-get update -q
  $SUDO apt-get install -y -q dotnet-sdk-10.0
fi
echo "== dotnet $(dotnet --version)"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

if [ ! -d "$VENDOR/.git" ]; then
  echo "== cloning OpenUtau @ ${OPENUTAU_COMMIT:0:10}"
  mkdir -p "$HERE/vendor"
  src="${OPENUTAU_SRC:-$OPENUTAU_REPO}"
  git clone --filter=blob:none --no-checkout "$src" "$VENDOR"
fi
if [ "$(git -C "$VENDOR" rev-parse HEAD 2>/dev/null || true)" != "$OPENUTAU_COMMIT" ] \
   || [ ! -f "$VENDOR/OpenUtau.Core/OpenUtau.Core.csproj" ]; then
  git -C "$VENDOR" cat-file -e "$OPENUTAU_COMMIT^{commit}" 2>/dev/null \
    || git -C "$VENDOR" fetch -q origin "$OPENUTAU_COMMIT"
  git -C "$VENDOR" -c advice.detachedHead=false checkout -q -f "$OPENUTAU_COMMIT"
fi

echo "== building ourender"
t0=$(date +%s)
dotnet publish "$HERE/ourender/ourender.csproj" -c Release -r linux-x64 --self-contained false \
  -p:CustomAfterMicrosoftCommonTargets="$HERE/ourender/cpu-onnxruntime.targets" \
  -p:OpenUtauDir="$VENDOR" -o "$OUT" -nologo -v:minimal
echo "== built $OUT/ourender in $(( $(date +%s) - t0 )) s"
# the CUDA provider must not have slipped in
if ls "$OUT" | grep -qi cuda; then echo "warning: CUDA libraries in $OUT" >&2; fi
"$OUT/ourender" version
