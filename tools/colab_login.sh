#!/usr/bin/env bash
# Colab CLI login helper for a headless cloud session.
#
# The Colab CLI (~/.local/bin/colab) logs in with Google's copy-paste OAuth flow: it prints an
# authorization URL, then waits on stdin for the code Google shows after you approve. In a
# non-interactive session nothing can type into that prompt, so this helper gives the waiting
# process an input pipe and lets the code be delivered to it later. It does nothing else.
#
#   tools/colab_login.sh start        run the login (blocks until done; run it in the background)
#                                     and print the authorization URL to the log as soon as it appears
#   tools/colab_login.sh url          print the authorization URL of the pending login
#   tools/colab_login.sh code CODE    hand the pasted authorization code to the pending login
#   tools/colab_login.sh status       show the pending login's log and whether a token exists
#   tools/colab_login.sh cleanup      stop a pending login and remove the pipe
#
# The resulting token is stored by the Colab CLI itself in ~/.config/colab-cli/token.json
# (inside this ephemeral container only). Revoke it any time at
# https://myaccount.google.com/permissions
set -euo pipefail

DIR="${HOME}/.cache/colab-login"
FIFO="${DIR}/code.fifo"
LOG="${DIR}/login.log"
COLAB="${HOME}/.local/bin/colab"
TIMEOUT_S=1800   # a pending login gives up after 30 minutes

auth_url() { grep -o 'https://accounts.google.com/[^[:space:]]*' "${LOG}" 2>/dev/null | head -n 1; }

case "${1:-}" in
  start)
    mkdir -p "${DIR}"
    rm -f "${FIFO}" "${LOG}"
    mkfifo -m 600 "${FIFO}"
    # stdin opened read-write on the pipe: the CLI holds its own writer, so it waits for a line
    # instead of seeing end-of-file, and `code` can deliver one later.
    timeout "${TIMEOUT_S}" "${COLAB}" sessions <>"${FIFO}" >"${LOG}" 2>&1 || true
    rm -f "${FIFO}"
    if [ -f "${HOME}/.config/colab-cli/token.json" ]; then echo "login finished: token stored"; else echo "login ended without a token"; fi
    ;;
  url)
    u="$(auth_url)"; if [ -n "${u}" ]; then echo "${u}"; else echo "no pending login URL yet" >&2; exit 1; fi
    ;;
  code)
    [ -n "${2:-}" ] || { echo "usage: $0 code CODE" >&2; exit 2; }
    [ -p "${FIFO}" ] || { echo "no pending login (run: $0 start)" >&2; exit 1; }
    printf '%s\n' "$2" >"${FIFO}"
    echo "code delivered"
    ;;
  status)
    [ -f "${LOG}" ] && sed -e 's#https://accounts.google.com/[^[:space:]]*#<auth url>#' "${LOG}" | tail -n 20 || echo "no login log"
    [ -f "${HOME}/.config/colab-cli/token.json" ] && echo "token: present" || echo "token: none"
    ;;
  cleanup)
    pkill -f "${COLAB} sessions" 2>/dev/null || true
    rm -f "${FIFO}"
    echo "cleaned up"
    ;;
  *)
    sed -n '2,19p' "$0"; exit 2
    ;;
esac
