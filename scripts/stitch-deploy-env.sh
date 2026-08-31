#!/usr/bin/env bash
# Fill cross-service env: LDAP bind, Rocket.Chat admin API, shared OAuth/Jitsi secrets.
# Used in GitHub Actions before deploying mail-server, rocket, and jitsi.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIL_ENV_FILE="${MAIL_ENV_FILE:-$ROOT/mail-server/.env}"
ROCKET_ENV_FILE="${ROCKET_ENV_FILE:-$ROOT/rocket/.env}"
JITSI_ENV_FILE="${JITSI_ENV_FILE:-$ROOT/jitsi/.env}"

py() {
  python3 - "$@"
}

read_env() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  py <<'PY' "$file" "$key"
import pathlib, sys
file, key = pathlib.Path(sys.argv[1]), sys.argv[2]
if not file.exists():
    sys.exit(0)
for line in file.read_text().splitlines():
    if not line or line.lstrip().startswith("#"):
        continue
    if "=" not in line:
        continue
    k, _, v = line.partition("=")
    if k.strip() != key:
        continue
    v = v.strip().strip("\r")
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1]
    print(v, end="")
    sys.exit(0)
PY
}

set_env_var() {
  local file="$1" key="$2" value="$3"
  [[ -n "$value" ]] || return 0
  STITCH_VALUE="$value" py <<'PY' "$file" "$key"
import os, pathlib, sys
file = pathlib.Path(sys.argv[1])
key, value = sys.argv[2], os.environ["STITCH_VALUE"]
lines = file.read_text().splitlines() if file.exists() else []
out, found = [], False
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={value}")
file.parent.mkdir(parents=True, exist_ok=True)
file.write_text("\n".join(out) + ("\n" if out else ""))
PY
}

ensure_env() {
  local file="$1" key="$2" value="$3"
  local current
  current="$(read_env "$file" "$key")"
  if [[ -z "$current" && -n "$value" ]]; then
    set_env_var "$file" "$key" "$value"
    echo "stitch: set ${key} in $(basename "$file")"
  fi
}

sync_env() {
  local file="$1" key="$2" value="$3"
  local current
  [[ -n "$value" ]] || return 0
  current="$(read_env "$file" "$key")"
  if [[ "$current" != "$value" ]]; then
    set_env_var "$file" "$key" "$value"
    echo "stitch: synced ${key} in $(basename "$file")"
  fi
}

mail_admin="$(read_env "$MAIL_ENV_FILE" DEFAULT_ADMIN_PASSWORD)"
mail_admin_email="$(read_env "$MAIL_ENV_FILE" DEFAULT_ADMIN_EMAIL)"
rocket_admin="$(read_env "$ROCKET_ENV_FILE" ADMIN_PASS)"
oauth_mail="$(read_env "$MAIL_ENV_FILE" OAUTH_ROCKETCHAT_CLIENT_SECRET)"
oauth_rocket="$(read_env "$ROCKET_ENV_FILE" OAUTH_ROCKETCHAT_CLIENT_SECRET)"
jitsi_mail="$(read_env "$MAIL_ENV_FILE" JITSI_JWT_APP_SECRET)"
jitsi_rocket="$(read_env "$ROCKET_ENV_FILE" JITSI_JWT_APP_SECRET)"
jitsi_file="$(read_env "$JITSI_ENV_FILE" JWT_APP_SECRET)"

oauth="${oauth_mail:-$oauth_rocket}"
jitsi="${jitsi_mail:-$jitsi_rocket}"
jitsi="${jitsi:-$jitsi_file}"

ensure_env "$ROCKET_ENV_FILE" MAIL_LDAP_BIND_PASSWORD "$mail_admin"
ensure_env "$ROCKET_ENV_FILE" MAIL_LDAP_BIND_DN "${mail_admin_email:-admin@alexol.io}"
ensure_env "$ROCKET_ENV_FILE" MAIL_LDAP_HOST "host.docker.internal"
ensure_env "$ROCKET_ENV_FILE" MAIL_LDAP_PORT "389"
ensure_env "$ROCKET_ENV_FILE" MAIL_LDAP_BASE_DN "dc=alexol,dc=io"

ensure_env "$MAIL_ENV_FILE" ROCKETCHAT_ADMIN_PASSWORD "$rocket_admin"
ensure_env "$MAIL_ENV_FILE" ROCKETCHAT_ADMIN_USERNAME "admin"
ensure_env "$MAIL_ENV_FILE" ROCKETCHAT_API_URL "http://host.docker.internal:18300"
ensure_env "$MAIL_ENV_FILE" CHAT_PUBLIC_URL "https://chat.alexol.io"
ensure_env "$MAIL_ENV_FILE" OAUTH_ROCKETCHAT_CLIENT_ID "alexol-chat"
ensure_env "$MAIL_ENV_FILE" OAUTH_ROCKETCHAT_REDIRECT_URI "https://chat.alexol.io/_oauth/alexol"

if [[ -n "$oauth" ]]; then
  sync_env "$MAIL_ENV_FILE" OAUTH_ROCKETCHAT_CLIENT_SECRET "$oauth"
  sync_env "$ROCKET_ENV_FILE" OAUTH_ROCKETCHAT_CLIENT_SECRET "$oauth"
fi

if [[ -n "$jitsi" ]]; then
  sync_env "$MAIL_ENV_FILE" JITSI_JWT_APP_SECRET "$jitsi"
  sync_env "$ROCKET_ENV_FILE" JITSI_JWT_APP_SECRET "$jitsi"
  sync_env "$JITSI_ENV_FILE" JWT_APP_SECRET "$jitsi"
  ensure_env "$JITSI_ENV_FILE" JWT_APP_ID "alexol"
  ensure_env "$JITSI_ENV_FILE" ENABLE_IFRAME_API "1"
  ensure_env "$JITSI_ENV_FILE" JWT_ACCEPTED_ISSUERS "alexol,RocketChat"
  ensure_env "$JITSI_ENV_FILE" JWT_ACCEPTED_AUDIENCES "alexol,RocketChat"
fi

echo "stitch: done"
