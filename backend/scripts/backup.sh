#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-7}"
TZ="${TZ:-Europe/Moscow}"
DATE="$(TZ="$TZ" date +%Y-%m-%d)"
DIR="$BACKUP_ROOT/$DATE"
LATEST_LINK="$BACKUP_ROOT/latest"

mkdir -p "$DIR"

echo "[alexol backup] $DATE — start"

export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump -h postgres -U "${POSTGRES_USER}" -Fc "${POSTGRES_DB}" > "$DIR/alexol_db.dump"
echo "[alexol backup] PostgreSQL: alexol_db.dump"

archive_dir() {
  local src="$1"
  local out="$2"
  local label="$3"

  if [ ! -d "$src" ]; then
    echo "[alexol backup] Skip $label: directory missing"
    return 0
  fi

  if [ -z "$(ls -A "$src" 2>/dev/null || true)" ]; then
    echo "[alexol backup] Skip $label: empty"
    return 0
  fi

  tar czf "$out" -C "$src" .
  echo "[alexol backup] $label: $(basename "$out")"
}

archive_dir /minio_data "$DIR/minio_data.tar.gz" "MinIO volume"
archive_dir /uploads "$DIR/uploads.tar.gz" "uploads"
archive_dir /bot_data "$DIR/bot_data.tar.gz" "bot/data"
archive_dir /bot_tdata "$DIR/bot_tdata.tar.gz" "bot/tdata"

ln -sfn "$DATE" "$LATEST_LINK"

find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20??-??-??' -mtime +"$RETENTION" -exec rm -rf {} + 2>/dev/null || true

echo "[alexol backup] Done: $DIR (retention ${RETENTION}d)"
