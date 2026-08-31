#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"
TZ="${TZ:-Europe/Moscow}"
DATE="$(TZ="$TZ" date +%Y-%m-%d)"
DIR="$BACKUP_ROOT/$DATE"
LATEST_LINK="$BACKUP_ROOT/latest"

MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-rocketchat}"

mkdir -p "$DIR"

echo "[rocket backup] $DATE — start"

mongodump \
  --host "${MONGO_HOST}:${MONGO_PORT}" \
  --db "$MONGO_DB" \
  --gzip \
  --archive="$DIR/rocketchat.archive.gz"
echo "[rocket backup] MongoDB: rocketchat.archive.gz"

if [ -d /uploads ] && [ -n "$(ls -A /uploads 2>/dev/null || true)" ]; then
  tar czf "$DIR/uploads.tar.gz" -C /uploads .
  echo "[rocket backup] uploads: uploads.tar.gz"
else
  echo "[rocket backup] Skip uploads: empty or missing"
fi

ln -sfn "$DATE" "$LATEST_LINK"

find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20??-??-??' -mtime +"$RETENTION" -exec rm -rf {} + 2>/dev/null || true

echo "[rocket backup] Done: $DIR (retention ${RETENTION}d)"
