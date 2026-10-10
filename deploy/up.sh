#!/usr/bin/env bash
# Pull + rebuild + restart production stack on the VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT}"

if [[ ! -f .env.prod ]]; then
  echo "Missing .env.prod — copy from .env.prod.example first"
  exit 1
fi

git pull --ff-only
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build "$@"
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
curl -fsS "${SITE_URL:-https://www.laguardiadeelune.com}/health" && echo " health OK"
