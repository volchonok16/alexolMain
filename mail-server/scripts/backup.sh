#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"
TZ="${TZ:-Europe/Moscow}"
DATE="$(TZ="$TZ" date +%Y-%m-%d)"
DIR="$BACKUP_ROOT/$DATE"
LATEST_LINK="$BACKUP_ROOT/latest"

POSTGRES_USER="${POSTGRES_USER:-mailuser}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-mailpass}"
POSTGRES_DB="${POSTGRES_DB:-maildb}"

mkdir -p "$DIR"

echo "[mail backup] $DATE — start"

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump -h postgres -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "$DIR/maildb.dump"
echo "[mail backup] PostgreSQL: maildb.dump"

if [ -d /minio_data ] && [ -n "$(ls -A /minio_data 2>/dev/null || true)" ]; then
  tar czf "$DIR/minio_data.tar.gz" -C /minio_data .
  echo "[mail backup] MinIO volume: minio_data.tar.gz"
else
  echo "[mail backup] Skip MinIO: empty or missing"
fi

if [ -d /dkim ] && [ -n "$(ls -A /dkim 2>/dev/null || true)" ]; then
  tar czf "$DIR/dkim.tar.gz" -C /dkim .
  echo "[mail backup] DKIM: dkim.tar.gz"
fi

ln -sfn "$DATE" "$LATEST_LINK"

find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20??-??-??' -mtime +"$RETENTION" -exec rm -rf {} + 2>/dev/null || true

echo "[mail backup] Done: $DIR (retention ${RETENTION}d)"
