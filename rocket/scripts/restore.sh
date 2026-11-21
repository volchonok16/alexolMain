#!/bin/bash
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-/backups}"
DATE="${RESTORE_DATE:-}"

MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-rocketchat}"

if [ -z "$DATE" ]; then
  if [ -L "$BACKUP_ROOT/latest" ]; then
    DATE="$(readlink "$BACKUP_ROOT/latest")"
  elif [ -f "$BACKUP_ROOT/latest" ]; then
    DATE="$(cat "$BACKUP_ROOT/latest")"
  else
    echo "[rocket restore] Set RESTORE_DATE=YYYY-MM-DD or create backups/latest" >&2
    exit 1
  fi
fi

DIR="$BACKUP_ROOT/$DATE"

if [ ! -d "$DIR" ]; then
  echo "[rocket restore] Backup not found: $DIR" >&2
  exit 1
fi

echo "[rocket restore] From $DIR"

if [ -f "$DIR/rocketchat.archive.gz" ]; then
  mongorestore \
    --host "${MONGO_HOST}:${MONGO_PORT}" \
    --gzip \
    --archive="$DIR/rocketchat.archive.gz" \
    --drop \
    --nsInclude="${MONGO_DB}.*"
  echo "[rocket restore] MongoDB restored"
else
  echo "[rocket restore] Skip MongoDB: archive missing"
fi

if [ -f "$DIR/uploads.tar.gz" ]; then
  mkdir -p /uploads
  find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
  tar xzf "$DIR/uploads.tar.gz" -C /uploads
  echo "[rocket restore] uploads restored"
else
  echo "[rocket restore] Skip uploads: archive missing"
fi

echo "[rocket restore] Done. Run: docker compose up -d"
