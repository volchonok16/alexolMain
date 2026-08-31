#!/bin/sh
# VM entrypoint for GitHub deploy-rocket (no nested quotes in the workflow).
set -e
cd /var/www/rocket

sed -i "s/\r$//" configure.sh install-jitsi-app.sh start.sh .env env.example 2>/dev/null || true
chmod +x configure.sh install-jitsi-app.sh start.sh

if docker compose version >/dev/null 2>&1; then
  dc="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  dc="docker-compose"
else
  echo "Docker Compose not found"
  exit 1
fi

if [ ! -f .env ]; then
  echo "rocket/.env missing — add GitHub secret ROCKET_ENV"
  exit 1
fi

# RELEASE=latest (or empty / EOL 7.x–8.1) → newest GitHub stable at deploy time.
# Pin a number (8.5.3) to freeze. Docker tag "latest" can be an RC; we write a
# concrete stable tag into .env before compose pull.
CURRENT_RELEASE="$(grep -E '^RELEASE=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r"' | tr '[:upper:]' '[:lower:]')"
NEED_LATEST=0
case "$CURRENT_RELEASE" in
  latest|stable|'') NEED_LATEST=1 ;;
  7.*|8.0*|8.1*) NEED_LATEST=1 ;;
esac
if [ "$NEED_LATEST" = "1" ]; then
  RESOLVED=""
  if command -v python3 >/dev/null 2>&1; then
    RESOLVED="$(python3 - <<'PY'
import json, urllib.request

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "alexol-rocket-deploy"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.load(resp)

tag = ""
try:
    tag = (fetch("https://api.github.com/repos/RocketChat/Rocket.Chat/releases/latest").get("tag_name") or "").lstrip("v")
except Exception:
    tag = ""
if tag.endswith("-develop") or "-rc." in tag:
    tag = ""
if not tag:
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        best = None

        def key(s):
            out = []
            for part in str(s).split("."):
                try:
                    out.append(int(part))
                except ValueError:
                    out.append(0)
            return out

        data = fetch("https://releases.rocket.chat/v2/server/supportedVersions")
        for item in data.get("versions") or []:
            if item.get("releaseType") != "stable":
                continue
            ver = item.get("version") or ""
            if "develop" in ver or "-rc" in ver:
                continue
            exp = item.get("expiration") or ""
            if exp:
                try:
                    if datetime.fromisoformat(exp.replace("Z", "+00:00")) < now:
                        continue
                except Exception:
                    pass
            if best is None or key(ver) > key(best):
                best = ver
        tag = best or ""
    except Exception:
        tag = ""
print(tag)
PY
)"
  fi
  RESOLVED="$(printf '%s' "$RESOLVED" | tr -d '\r\n')"
  if [ -z "$RESOLVED" ]; then
    RESOLVED="8.5.3"
    echo "start: could not resolve latest Rocket.Chat release, using $RESOLVED"
  else
    echo "start: latest stable Rocket.Chat is $RESOLVED"
  fi
  if grep -qE '^RELEASE=' .env; then
    sed -i "s/^RELEASE=.*/RELEASE=$RESOLVED/" .env
  else
    printf '\nRELEASE=%s\n' "$RESOLVED" >> .env
  fi
fi

docker network inspect alexol_mail_sync >/dev/null 2>&1 || docker network create alexol_mail_sync
$dc stop rocketchat >/dev/null 2>&1 || true
$dc pull
$dc up -d mongodb
$dc up -d --force-recreate mongodb-init || true
docker exec rocket_mongo mongosh --quiet --eval 'try { db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true }) } catch (e) { print(e) }' || true
unlock_password_trap() {
  echo "configure: clear unverified-email password trap"
  docker exec rocket_mongo mongosh --quiet rocketchat --eval '
    try {
      const a = db.users.updateMany(
        {},
        { $set: { requirePasswordChange: false }, $unset: { requirePasswordChangeReason: 1 } }
      );
      const b = db.users.updateMany(
        { "emails.0": { $exists: true } },
        { $set: { "emails.$[].verified": true } }
      );
      print("requirePasswordChange cleared", a.modifiedCount, "emails verified", b.modifiedCount);
      const c = db.users.updateMany(
        {},
        { $unset: { failedLoginAttempts: 1, lastFailedLogin: 1 } }
      );
      print("failed login counters cleared", c.modifiedCount);
    } catch (e) { print(e); }
  ' || true
}

write_rc_string_setting() {
  sid="$1"
  src="$2"
  [ -f "$src" ] || return 0
  python3 - "$sid" "$src" <<'PY'
import json, sys
sid, path = sys.argv[1], sys.argv[2]
open("/tmp/alexol-rc-setting.js", "w").write(
    "db.rocketchat_settings.updateOne({_id: %s}, {$set: {value: %s, _updatedAt: new Date()}});\n"
    % (json.dumps(sid), json.dumps(open(path, encoding="utf-8").read()))
)
PY
  docker cp /tmp/alexol-rc-setting.js rocket_mongo:/tmp/alexol-rc-setting.js >/dev/null
  docker exec rocket_mongo mongosh --quiet rocketchat /tmp/alexol-rc-setting.js || true
}

write_rc_empty_setting() {
  sid="$1"
  python3 - "$sid" <<'PY'
import json, sys
sid = sys.argv[1]
open("/tmp/alexol-rc-setting.js", "w").write(
    "const r = db.rocketchat_settings.updateOne({_id: %s}, {$set: {value: '', _updatedAt: new Date()}});\n"
    "print(%s, 'matched', r.matchedCount, 'modified', r.modifiedCount);\n"
    % (json.dumps(sid), json.dumps(sid))
)
PY
  docker cp /tmp/alexol-rc-setting.js rocket_mongo:/tmp/alexol-rc-setting.js >/dev/null
  docker exec rocket_mongo mongosh --quiet rocketchat /tmp/alexol-rc-setting.js || true
}

push_custom_scripts() {
  write_rc_empty_setting Custom_Script_Logged_In
  write_rc_empty_setting Custom_Script_Logged_Out
  write_rc_empty_setting theme-custom-css
  write_rc_empty_setting css
  write_rc_empty_setting Layout_Sidenav_Footer
  write_rc_empty_setting Layout_Sidenav_Footer_Dark
  echo "configure: cleared custom login/sidebar/Jitsi-picker scripts"
}

$dc up -d
unlock_password_trap
# Deploy uses ADMIN_PASS via API. Authenticator/email 2FA on the service admin
# makes configure and profile-sync 401, then 429 from retries.
docker exec rocket_mongo mongosh --quiet rocketchat --eval '
  try {
    const u = db.users.findOne({ username: "admin" });
    if (!u) { print("no admin user yet"); }
    else {
      const r = db.users.updateOne(
        { _id: u._id },
        { $unset: { "services.totp": 1, "services.email2fa": 1 } }
      );
      print("admin authenticator/email 2FA cleared for API deploys", r.modifiedCount);
    }
  } catch (e) { print(e); }
' || true
echo "configure: re-apply OAuth, LDAP, Jitsi settings"
$dc run --rm --no-deps configure || $dc up -d --force-recreate configure
push_custom_scripts

if [ -f install-jitsi-app.sh ] && grep -qE "^JITSI_JWT_APP_SECRET=.+" .env 2>/dev/null; then
  echo "install-jitsi-app: installing/updating Jitsi Marketplace app"
  sh install-jitsi-app.sh || echo "install-jitsi-app: non-fatal — chat is up; Jitsi needs Cloud register"
else
  echo "install-jitsi-app: skipped (no JITSI_JWT_APP_SECRET in .env)"
fi
unlock_password_trap
push_custom_scripts
# Direct Mongo wipes do not unload Custom_Script_* already in the Node process.
echo "configure: recreate rocketchat so the Jitsi picker script is not served"
$dc up -d --force-recreate --no-deps rocketchat
HOST_PORT="$(grep -E '^HOST_PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2- | tr -d '\r\"' )"
HOST_PORT="${HOST_PORT:-18300}"
i=0
while [ "$i" -lt 60 ]; do
  if curl -sf "http://127.0.0.1:${HOST_PORT}/api/info" >/dev/null 2>&1; then
    echo "configure: chat API is up after recreate"
    break
  fi
  i=$((i + 1))
  sleep 3
done
RC_API="http://rocket_chat:3000"
echo "sync chat profiles from mail"
if [ -f /var/www/mail/.env ]; then
  if grep -q "^ROCKETCHAT_API_URL=" /var/www/mail/.env; then
    sed -i "s|^ROCKETCHAT_API_URL=.*|ROCKETCHAT_API_URL=${RC_API}|" /var/www/mail/.env
  else
    printf "\nROCKETCHAT_API_URL=%s\n" "$RC_API" >> /var/www/mail/.env
  fi
  (cd /var/www/mail && $dc up -d backend) || true
fi
sleep 10
if docker ps --format "{{.Names}}" | grep -qx mail_backend; then
  docker exec -e "ROCKETCHAT_API_URL=${RC_API}" mail_backend python /app/scripts/sync_chat_profiles.py || true
fi
$dc ps
