#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DATE="${RESTORE_DATE:-}"

if [ -z "$DATE" ]; then
  if [ -L "$BACKUP_ROOT/latest" ]; then
    DATE="$(readlink "$BACKUP_ROOT/latest")"
  elif [ -f "$BACKUP_ROOT/latest" ]; then
    DATE="$(cat "$BACKUP_ROOT/latest")"
  else
    echo "[alexol restore] Set RESTORE_DATE=YYYY-MM-DD or create backups/latest" >&2
    exit 1
  fi
fi

DIR="$BACKUP_ROOT/$DATE"

if [ ! -d "$DIR" ]; then
  echo "[alexol restore] Backup not found: $DIR" >&2
  exit 1
fi

echo "[alexol restore] From $DIR"

export PGPASSWORD="${POSTGRES_PASSWORD}"

restore_pg() {
  local dump="$1"
  if [ ! -f "$dump" ]; then
    echo "[alexol restore] Skip PostgreSQL: dump missing"
    return 0
  fi

  pg_restore -h postgres -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --clean --if-exists --no-owner --no-acl "$dump" || true
  echo "[alexol restore] PostgreSQL restored"
}

restore_tar() {
  local archive="$1"
  local dest="$2"
  local label="$3"

  if [ ! -f "$archive" ]; then
    echo "[alexol restore] Skip $label: archive missing"
    return 0
  fi

  if [ ! -d "$dest" ]; then
    mkdir -p "$dest"
  fi

  find "$dest" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
  tar xzf "$archive" -C "$dest"
  echo "[alexol restore] $label restored"
}

restore_pg "$DIR/alexol_db.dump"
restore_tar "$DIR/minio_data.tar.gz" /minio_data "MinIO volume"
restore_tar "$DIR/uploads.tar.gz" /uploads "uploads"
restore_tar "$DIR/bot_data.tar.gz" /bot_data "bot/data"
restore_tar "$DIR/bot_tdata.tar.gz" /bot_tdata "bot/tdata"

echo "[alexol restore] Done. Run: docker compose up -d"
