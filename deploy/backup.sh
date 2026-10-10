#!/usr/bin/env bash
# Daily Postgres dump. Cron example (as root):
#   15 3 * * * /opt/laguardia/deploy/backup.sh >> /var/log/laguardia-backup.log 2>&1
set -euo pipefail

ROOT="${LAGUARDIA_ROOT:-/opt/laguardia}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/laguardia}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE=(docker compose --env-file "${ROOT}/.env.prod" -f "${ROOT}/docker-compose.prod.yml")

mkdir -p "${BACKUP_DIR}"

# shellcheck disable=SC1091
set -a
source "${ROOT}/.env.prod"
set +a

STAMP="$(date +%F_%H%M)"
OUT="${BACKUP_DIR}/pg-${STAMP}.sql.gz"

"${COMPOSE[@]}" exec -T db \
  pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
  | gzip -c > "${OUT}"

chmod 600 "${OUT}"
find "${BACKUP_DIR}" -name 'pg-*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

echo "[backup] wrote ${OUT}"
