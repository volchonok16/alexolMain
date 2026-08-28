#!/bin/bash
# Бэкап обоих стеков (backend + mail-server). Запуск вручную или из cron.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT/backend}"
MAIL_DIR="${MAIL_DIR:-$ROOT/mail-server}"

run_backup() {
  local dir="$1"
  local name="$2"

  if [ ! -f "$dir/docker-compose.yml" ]; then
    echo "[skip] $name: $dir/docker-compose.yml not found"
    return 0
  fi

  echo "=== $name backup ==="
  (cd "$dir" && docker compose --profile backup run --rm backup)
}

run_backup "$BACKEND_DIR" "alexol backend"
run_backup "$MAIL_DIR" "mail-server"

echo "All backups done."
