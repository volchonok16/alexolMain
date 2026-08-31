#!/bin/sh
# Install official Jitsi as a Marketplace (public) app and set meet.alexol.io + JWT.
# Community forbids enabling private zip uploads (Apps_Error_license-prevented).
# Workspace must be able to reach Rocket.Chat Cloud (register once in the admin UI).
# Run on the VM from /var/www/rocket:  sh install-jitsi-app.sh
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
APP_INFO="$(echo "$APPS_JSON" | jq -c --arg id "$APP_ID" '
  (if type == "array" then .[-1] else . end)
  | (.apps // .)
  | (if type == "array" then .[] else empty end)
  | select((.id // .app.id // empty) == $id)
' 2>/dev/null | head -1)"
APP_STATUS="$(echo "${APP_INFO:-}" | jq -r '.status // .app.status // empty' 2>/dev/null || true)"
APP_SOURCE="$(echo "${APP_INFO:-}" | jq -r '.installationSource // .app.installationSource // empty' 2>/dev/null || true)"

need_marketplace=1
if [ -n "$APP_INFO" ]; then
  echo "install-jitsi: found app status=$APP_STATUS source=$APP_SOURCE"
  case "$APP_STATUS" in
    *license*|*prevented*)
      echo "install-jitsi: private/blocked install — removing so Marketplace can replace it"
      auth -X DELETE "$RC_URL/api/apps/$APP_ID" >/dev/null || true
      APP_INFO=""
      ;;
    *)
      if [ "$APP_SOURCE" = "private" ]; then
        echo "install-jitsi: private zip cannot be enabled on Community — removing"
        auth -X DELETE "$RC_URL/api/apps/$APP_ID" >/dev/null || true
        APP_INFO=""
      else
        need_marketplace=0
      fi
      ;;
  esac
fi

if [ "$need_marketplace" = "1" ] || [ "${FORCE_REBUILD:-0}" = "1" ]; then
  echo "install-jitsi: installing Jitsi $APP_VERSION from Marketplace"
  MP_BODY="$(jq -n --arg id "$APP_ID" --arg ver "$APP_VERSION" \
    '{appId:$id, marketplace:true, version:$ver}')"
  MP_OUT="$(auth -X POST "$RC_URL/api/apps" \
    -H "Content-Type: application/json" -d "$MP_BODY" || true)"
  echo "$MP_OUT" | jq -c '{status:.status,success:.success,app:.app.name,error:.error,errorType:.errorType}' 2>/dev/null \
    || echo "$MP_OUT" | head -c 400
  echo
  if ! echo "$MP_OUT" | jq -e '(.success == true) or (.app.id != null) or (.app.name != null)' >/dev/null 2>&1; then
    if echo "$MP_OUT" | grep -qi 'already'; then
      echo "install-jitsi: marketplace says already installed"
    else
      echo "install-jitsi: Marketplace install failed (workspace not registered with Cloud,"
      echo "install-jitsi: or the app zip URL is not available). Chat is already running."
      echo "install-jitsi: Register at https://cloud.rocket.chat as admin@alexol.io,"
      echo "install-jitsi: then Administration → Workspace → Connectivity Services → Register,"
      echo "install-jitsi: Sync, Marketplace → Jitsi → Install → Enable."
      exit 0
    fi
  fi
fi

echo "install-jitsi: syncing Cloud license (needed for Marketplace app slots)"
auth -X POST "$RC_URL/api/v1/cloud.syncWorkspace" \
  -H "Content-Type: application/json" -d '{}' || true

# Stale Deno runtime symlink after 8.5 upgrades blocks enable (license-prevented / compiler).
if command -v docker >/dev/null 2>&1; then
  docker exec rocket_chat rm -rf /tmp/apps-engine-temp 2>/dev/null || true
fi

echo "install-jitsi: enabling app"
ENABLE_OUT="$(auth -X POST "$RC_URL/api/apps/$APP_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"manually_enabled"}' || true)"
echo "$ENABLE_OUT" | jq -c '{status:.status,success:.success,error:.error,errorType:.errorType}' 2>/dev/null \
  || echo "$ENABLE_OUT" | head -c 300
echo

if echo "$ENABLE_OUT" | grep -qi 'license-prevented\|prevented'; then
  echo "install-jitsi: enable blocked by license — sync Cloud and retry"
  auth -X POST "$RC_URL/api/v1/cloud.syncWorkspace" \
    -H "Content-Type: application/json" -d '{}' || true
  sleep 3
  ENABLE_OUT="$(auth -X POST "$RC_URL/api/apps/$APP_ID/status" \
    -H "Content-Type: application/json" \
    -d '{"status":"manually_enabled"}' || true)"
  echo "$ENABLE_OUT" | jq -c '{status:.status,success:.success,error:.error,errorType:.errorType}' 2>/dev/null \
    || echo "$ENABLE_OUT" | head -c 300
  echo
  if echo "$ENABLE_OUT" | grep -qi 'license-prevented\|prevented'; then
    echo "install-jitsi: still license-prevented (Marketplace 0/0)."
    echo "install-jitsi: In chat admin open Marketplace → Enable unlimited apps"
    echo "install-jitsi: (Connectivity Services → Register), then Installed → Jitsi → Enable."
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
# RC 8: /api/v1/apps/:id/settings is 404; private apps use /api/apps/:id/settings
SETTINGS_JSON="$(jq -n \
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
    {id:"jitsi_chrome_extension_id", value:""}
  ]}')"
SETTINGS_OUT="$(auth -X POST "$RC_URL/api/apps/$APP_ID/settings" \
  -H "Content-Type: application/json" \
  -d "$SETTINGS_JSON" || true)"
if echo "$SETTINGS_OUT" | grep -q '404'; then
  SETTINGS_OUT="$(auth -X POST "$RC_URL/api/v1/apps/$APP_ID/settings" \
    -H "Content-Type: application/json" \
    -d "$SETTINGS_JSON" || true)"
fi
echo "$SETTINGS_OUT" | jq -c '{status:.status,success:.success,error:.error}' 2>/dev/null || echo "$SETTINGS_OUT" | head -c 200
echo

auth -X POST "$RC_URL/api/v1/settings/VideoConf_Default_Provider" \
  -H "Content-Type: application/json" \
  -d '{"value":"jitsi"}' >/dev/null || true

echo "install-jitsi: done — Default Provider should list Jitsi"
echo "install-jitsi: open Installed apps → Jitsi → Settings and confirm Domain=$JITSI_DOMAIN"
