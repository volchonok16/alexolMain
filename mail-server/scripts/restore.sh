#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DATE="${RESTORE_DATE:-}"

POSTGRES_USER="${POSTGRES_USER:-mailuser}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-mailpass}"
POSTGRES_DB="${POSTGRES_DB:-maildb}"

if [ -z "$DATE" ]; then
  if [ -L "$BACKUP_ROOT/latest" ]; then
    DATE="$(readlink "$BACKUP_ROOT/latest")"
  elif [ -f "$BACKUP_ROOT/latest" ]; then
    DATE="$(cat "$BACKUP_ROOT/latest")"
  else
    echo "[mail restore] Set RESTORE_DATE=YYYY-MM-DD or create backups/latest" >&2
    exit 1
  fi
fi

DIR="$BACKUP_ROOT/$DATE"

if [ ! -d "$DIR" ]; then
  echo "[mail restore] Backup not found: $DIR" >&2
  exit 1
fi

echo "[mail restore] From $DIR"

export PGPASSWORD="${POSTGRES_PASSWORD}"

if [ -f "$DIR/maildb.dump" ]; then
  pg_restore -h postgres -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" \
    --clean --if-exists --no-owner --no-acl "$DIR/maildb.dump" || true
  echo "[mail restore] PostgreSQL restored"
fi

restore_tar() {
  local archive="$1"
  local dest="$2"
  local label="$3"

  if [ ! -f "$archive" ]; then
    echo "[mail restore] Skip $label: archive missing"
    return 0
  fi

  mkdir -p "$dest"
  find "$dest" -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
  tar xzf "$archive" -C "$dest"
  echo "[mail restore] $label restored"
}

restore_tar "$DIR/minio_data.tar.gz" /minio_data "MinIO volume"
restore_tar "$DIR/dkim.tar.gz" /dkim "DKIM keys"

echo "[mail restore] Done. Run: docker compose up -d"
