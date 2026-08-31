#!/bin/sh
# Build official Apps.Jitsi and upload it as a private app (no Rocket.Chat Cloud).
# Run on the VM from /var/www/rocket:  sh install-jitsi-app.sh
# Autodeploy: .github/workflows/deploy.yml (job deploy-rocket).
# FORCE_REBUILD=1 — пересобрать .zip и загрузить даже если приложение уже стоит.
set -eu

RC_URL="${RC_URL:-http://127.0.0.1:18300}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASS="${ADMIN_PASS:-}"
JITSI_DOMAIN="${JITSI_DOMAIN:-meet.alexol.io}"
JITSI_APP_ID="${JITSI_JWT_APP_ID:-alexol}"
JITSI_APP_SECRET="${JITSI_JWT_APP_SECRET:-}"
APP_ID="3b387ba9-f57c-44c6-9810-8c0256abd64c"
APP_VERSION="2.1.1"

if [ -z "$ADMIN_PASS" ] && [ -f ./.env ]; then
  ADMIN_USERNAME="$(grep -E '^ADMIN_USERNAME=' .env | cut -d= -f2- | tr -d '\r')"
  ADMIN_PASS="$(grep -E '^ADMIN_PASS=' .env | cut -d= -f2- | tr -d '\r"')"
  JITSI_APP_SECRET="$(grep -E '^JITSI_JWT_APP_SECRET=' .env | cut -d= -f2- | tr -d '\r')"
  JITSI_APP_ID="$(grep -E '^JITSI_JWT_APP_ID=' .env | cut -d= -f2- | tr -d '\r')"
  JITSI_APP_ID="${JITSI_APP_ID:-alexol}"
  JITSI_DOMAIN="$(grep -E '^JITSI_PUBLIC_URL=' .env | cut -d= -f2- | tr -d '\r' | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*||')"
  JITSI_DOMAIN="${JITSI_DOMAIN:-meet.alexol.io}"
fi

if [ -z "$ADMIN_PASS" ]; then
  echo "install-jitsi: set ADMIN_PASS (same as rocket .env)"
  exit 1
fi

if [ -z "$JITSI_APP_SECRET" ]; then
  echo "install-jitsi: JITSI_JWT_APP_SECRET is empty — add to ROCKET_ENV"
  exit 1
fi

command -v curl >/dev/null
command -v jq >/dev/null
command -v docker >/dev/null

echo "install-jitsi: waiting for Rocket.Chat at $RC_URL"
i=0
while [ "$i" -lt 60 ]; do
  if curl -sf "$RC_URL/api/info" >/dev/null 2>&1; then
    echo "install-jitsi: API is up"
    break
  fi
  i=$((i + 1))
  sleep 5
done
if [ "$i" -ge 60 ]; then
  echo "install-jitsi: Rocket.Chat did not become ready"
  exit 1
fi

LOGIN="$(jq -n --arg u "$ADMIN_USERNAME" --arg p "$ADMIN_PASS" '{user:$u,password:$p}' \
  | curl -sf -X POST "$RC_URL/api/v1/login" \
      -H "Content-Type: application/json" -d @-)"
TOKEN="$(echo "$LOGIN" | jq -r '.data.authToken // empty')"
USER_ID="$(echo "$LOGIN" | jq -r '.data.userId // empty')"
if [ -z "$TOKEN" ] || [ -z "$USER_ID" ]; then
  echo "install-jitsi: admin login failed"
  echo "$LOGIN"
  exit 1
fi

auth() {
  HASH="$(printf '%s' "$ADMIN_PASS" | sha256sum | awk '{print $1}')"
  curl -sS "$@" \
    -H "X-Auth-Token: $TOKEN" \
    -H "X-User-Id: $USER_ID" \
    -H "X-2FA-Code: $HASH" \
    -H "X-2FA-Method: password"
}

# RC 8: GET /api/apps is gone. Cluster nodes may wrap as [status, body].
APPS_JSON="$(auth -s "$RC_URL/api/apps/installed" || auth -s "$RC_URL/api/apps" || echo '{}')"
APP_INSTALLED="$(echo "$APPS_JSON" | jq -r --arg id "$APP_ID" '
  (if type == "array" then .[-1] else . end)
  | (.apps // .)
  | (if type == "array" then .[] else empty end)
  | .id // .app.id // empty
  | select(. == $id)
' 2>/dev/null | head -1)"
SKIP_UPLOAD=0
if [ -n "$APP_INSTALLED" ] && [ "${FORCE_REBUILD:-0}" != "1" ]; then
  echo "install-jitsi: app already installed ($APP_ID), skipping package/upload"
  SKIP_UPLOAD=1
fi

if [ "$SKIP_UPLOAD" = "0" ]; then
  WORKDIR="$(mktemp -d)"
  cleanup() { rm -rf "$WORKDIR"; }
  trap cleanup EXIT

  echo "install-jitsi: packaging Apps.Jitsi $APP_VERSION"
  # Heredoc (not nested double-quotes): this file is run with dash (`sh`).
  docker run --rm -i -v "$WORKDIR:/out" -e APP_VERSION="$APP_VERSION" -w /tmp \
    node:22-bookworm bash -s <<'INNER'
set -euo pipefail
apt-get update -qq >/dev/null
apt-get install -y -qq git >/dev/null
npm install -g @rocket.chat/apps-cli >/dev/null
git clone --depth 1 --branch "$APP_VERSION" https://github.com/RocketChat/Apps.Jitsi.git app
cd app
# devDependencies (typescript, apps-engine) are required to build the .zip
npm install
rc-apps package
zipfile="$(find . -name '*.zip' -type f | head -1)"
test -n "$zipfile"
cp -a "$zipfile" /out/jitsi.rc-app.zip
INNER

  ZIP="$WORKDIR/jitsi.rc-app.zip"
  if [ ! -s "$ZIP" ]; then
    echo "install-jitsi: package failed"
    ls -la "$WORKDIR"
    exit 1
  fi

  echo "install-jitsi: uploading app to /api/apps"
  UPLOAD="$(auth -X POST "$RC_URL/api/apps" \
    -F "app=@$ZIP;type=application/zip")"
  echo "$UPLOAD" | jq -c '{status: .status, success: .success, app: .app.name, error: .error}' || echo "$UPLOAD"
  if ! echo "$UPLOAD" | jq -e '.success == true' >/dev/null 2>&1; then
    if echo "$UPLOAD" | grep -qi 'already'; then
      echo "install-jitsi: app already present, continuing with settings"
    else
      echo "install-jitsi: upload failed"
      exit 1
    fi
  fi
fi

set_app() {
  id="$1"
  value="$2"
  payload="$(jq -n --arg i "$id" --arg v "$value" '{settings:[{id:$i,value:$v,packageValue:$v,valueSource:"user",hidden:false,blocked:false,disabled:false}]}')"
  auth -X POST "$RC_URL/api/v1/apps/$APP_ID/settings" \
    -H "Content-Type: application/json" \
    -d "$payload" >/dev/null || true
}

echo "install-jitsi: writing meet.alexol.io + JWT"
# Setting IDs from Apps.Jitsi (domain, ssl, jwt, etc.) — best-effort; UI can still save them.
auth -X POST "$RC_URL/api/v1/apps/$APP_ID/settings" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg domain "$JITSI_DOMAIN" \
    --arg iss "$JITSI_APP_ID" \
    --arg secret "$JITSI_APP_SECRET" \
    '{settings:[
      {id:"jitsi_domain", value:$domain},
      {id:"jitsi_ssl", value:true},
      {id:"jitsi_auth_token", value:true},
      {id:"jitsi_application_id", value:$iss},
      {id:"jitsi_application_secret", value:$secret},
      {id:"jitsi_limit_token_to_room", value:true},
      {id:"jitsi_jitsi_room_hash", value:false},
      {id:"jitsi_chrome_extension_id", value:""},
      {id:"jitsi_application_id", value:$iss}
    ]}')" || true

auth -X POST "$RC_URL/api/v1/settings/VideoConf_Default_Provider" \
  -H "Content-Type: application/json" \
  -d '{"value":"jitsi"}' >/dev/null || true

echo "install-jitsi: done — Default Provider should list Jitsi"
echo "install-jitsi: open Installed apps → Jitsi → Settings and confirm Domain=$JITSI_DOMAIN"
