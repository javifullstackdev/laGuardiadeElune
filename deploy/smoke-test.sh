#!/usr/bin/env bash
# Run from a machine that can reach the public site (or the VPS itself).
set -euo pipefail

BASE="${1:-https://www.laguardiadeelune.com}"

check() {
  local path="$1"
  local code
  # No -L: we want the first hop (OAuth login is often 302 to Discord)
  code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE}${path}")"
  # 302 is normal for OAuth login redirects
  if [[ "${code}" != "200" && "${code}" != "302" && "${code}" != "307" && "${code}" != "308" ]]; then
    echo "FAIL ${path} → HTTP ${code}"
    exit 1
  fi
  echo "OK   ${path} → HTTP ${code}"
}

echo "Smoke test against ${BASE}"
check "/health"
check "/"
check "/posts"
check "/personajes"
check "/lore"
check "/ranking"
check "/auth/discord/login"

echo "All smoke checks passed."
echo "Manual: Discord login, Battle.net link, admin post, avatar upload."
