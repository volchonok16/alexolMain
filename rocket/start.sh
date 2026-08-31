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

# Official apps block EOL servers (8.0.x / 8.1.x). Keep a supported LTS even if
# ROCKET_ENV still pins an old RELEASE.
if grep -qE '^RELEASE=(7\.|8\.0|8\.1)' .env 2>/dev/null; then
  echo "start: RELEASE in .env is past EOL, pinning 8.5.3 for mobile/desktop apps"
  sed -i 's/^RELEASE=.*/RELEASE=8.5.3/' .env
fi

docker network inspect alexol_mail_sync >/dev/null 2>&1 || docker network create alexol_mail_sync
$dc stop rocketchat >/dev/null 2>&1 || true
$dc pull
$dc up -d mongodb
$dc up -d --force-recreate mongodb-init || true
docker exec rocket_mongo mongosh --quiet --eval 'try { db.adminCommand({ setFeatureCompatibilityVersion: "8.0", confirm: true }) } catch (e) { print(e) }' || true
$dc up -d
echo "configure: re-apply OAuth, LDAP, Jitsi settings"
$dc run --rm --no-deps configure || $dc up -d --force-recreate configure

if [ -f install-jitsi-app.sh ] && grep -qE "^JITSI_JWT_APP_SECRET=.+" .env 2>/dev/null; then
  echo "install-jitsi-app: installing/updating Jitsi Marketplace app"
  sh install-jitsi-app.sh
else
  echo "install-jitsi-app: skipped (no JITSI_JWT_APP_SECRET in .env)"
fi

# mail_backend cannot use host.docker.internal:18300 (bound to 127.0.0.1)
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
