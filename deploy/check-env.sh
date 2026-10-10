#!/usr/bin/env bash
# Validate .env.prod before the first compose up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-${ROOT}/.env.prod}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}"
  echo "Copy: cp .env.prod.example .env.prod"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

need() {
  local key="$1"
  local val="${!key:-}"
  if [[ -z "${val}" ]]; then
    echo "FAIL  ${key} is empty"
    return 1
  fi
  echo "OK    ${key}"
}

fail=0
need SITE_URL || fail=1
need PUBLIC_BASE_URL || fail=1
need ACME_EMAIL || fail=1
need DB_USER || fail=1
need DB_PASSWORD || fail=1
need DB_NAME || fail=1
need JWT_SECRET || fail=1
need DISCORD_CLIENT_ID || fail=1
need DISCORD_CLIENT_SECRET || fail=1
need DISCORD_REDIRECT_URI || fail=1
need DISCORD_GUILD_ID || fail=1
need DISCORD_TOKEN || fail=1
need BLIZZARD_CLIENT_ID || fail=1
need BLIZZARD_CLIENT_SECRET || fail=1
need BLIZZARD_REDIRECT_URI || fail=1
need CORS_ORIGINS || fail=1

if [[ "${JWT_SECRET}" == "dev-secret-change-in-production" ]] || [[ "${JWT_SECRET}" == CHANGE_ME* ]]; then
  echo "FAIL  JWT_SECRET looks like a placeholder"
  fail=1
fi
if [[ "${DB_PASSWORD}" == CHANGE_ME* ]]; then
  echo "FAIL  DB_PASSWORD looks like a placeholder"
  fail=1
fi
if [[ "${DISCORD_REDIRECT_URI}" != https://* ]]; then
  echo "FAIL  DISCORD_REDIRECT_URI must be https in prod"
  fail=1
fi
if [[ "${BLIZZARD_REDIRECT_URI}" != https://* ]]; then
  echo "FAIL  BLIZZARD_REDIRECT_URI must be https in prod"
  fail=1
fi
if [[ "${PUBLIC_BASE_URL}" != https://* ]]; then
  echo "FAIL  PUBLIC_BASE_URL must be https in prod"
  fail=1
fi

if [[ "${fail}" -ne 0 ]]; then
  echo
  echo "Fix the FAIL lines, then re-run: bash deploy/check-env.sh"
  exit 1
fi

echo
echo "All required .env.prod keys look set."
