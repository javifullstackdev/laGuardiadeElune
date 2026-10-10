#!/usr/bin/env bash
# Run ONCE on a fresh VPS after: ssh root@TU_IP
# Requires: PR #9 already merged into main on GitHub.
set -euo pipefail

REPO="https://github.com/javifullstackdev/laGuardiadeElune.git"
ROOT="/opt/laguardia"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: bash first-boot.sh"
  exit 1
fi

apt-get update
apt-get install -y git curl

if [[ ! -d "${ROOT}/.git" ]]; then
  git clone "${REPO}" "${ROOT}"
fi
cd "${ROOT}"
git fetch origin
git checkout main
git pull --ff-only origin main

bash deploy/bootstrap-vps.sh

if [[ ! -f .env.prod ]]; then
  cp .env.prod.example .env.prod
  chmod 600 .env.prod
  echo
  echo "Generated secrets (paste into .env.prod):"
  echo "  JWT_SECRET=$(openssl rand -hex 32)"
  echo "  DB_PASSWORD=$(openssl rand -hex 24)"
  echo
  echo "Edit secrets now:"
  echo "  nano ${ROOT}/.env.prod"
  echo "Then:"
  echo "  cd ${ROOT} && ./deploy/check-env.sh"
  echo "  docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
  echo "  ./deploy/smoke-test.sh"
  exit 0
fi

chmod +x deploy/*.sh
./deploy/check-env.sh
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
./deploy/smoke-test.sh
