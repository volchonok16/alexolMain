#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="$(cd "$(dirname "$0")" && pwd)/.env"
test -f "$ENV_FILE"

fill() {
  local key="$1"
  local current
  current="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
  if [ -n "$current" ]; then
    return 0
  fi
  local value
  value="$(openssl rand -hex 16)"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

fill JICOFO_AUTH_PASSWORD
fill JVB_AUTH_PASSWORD
fill JIGASI_XMPP_PASSWORD
fill JIGASI_TRANSCRIBER_PASSWORD
fill JIBRI_RECORDER_PASSWORD
fill JIBRI_XMPP_PASSWORD
