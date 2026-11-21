#!/bin/bash
# Восстановление стеков из backups/latest (или RESTORE_DATE=YYYY-MM-DD).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${BACKEND_DIR:-$ROOT/backend}"
MAIL_DIR="${MAIL_DIR:-$ROOT/mail-server}"
ROCKET_DIR="${ROCKET_DIR:-$ROOT/rocket}"
RESTORE_DATE="${RESTORE_DATE:-}"

restore_stack() {
  local dir="$1"
  local name="$2"
  local stop_services="$3"

  if [ ! -f "$dir/docker-compose.yml" ]; then
    echo "[skip] $name: $dir/docker-compose.yml not found"
    return 0
  fi

  echo "=== $name restore ==="
  (
    cd "$dir"
    # shellcheck disable=SC2086
    docker compose stop $stop_services 2>/dev/null || true
    RESTORE_DATE="$RESTORE_DATE" docker compose --profile backup run --rm restore
  )
}

echo "Stop services before restore if they are running."
restore_stack "$BACKEND_DIR" "alexol backend" "minio backend"
restore_stack "$MAIL_DIR" "mail-server" "minio backend"
restore_stack "$ROCKET_DIR" "rocket chat" "rocketchat"

echo "Restore done. Start stacks:"
echo "  cd $BACKEND_DIR && docker compose up -d"
echo "  cd $MAIL_DIR && docker compose up -d"
echo "  cd $ROCKET_DIR && docker compose up -d"
