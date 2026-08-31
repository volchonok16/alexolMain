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

docker network inspect alexol_mail_sync >/dev/null 2>&1 || docker network create alexol_mail_sync
$dc pull
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
