#!/usr/bin/env bash
# Run once on a fresh Ubuntu 24.04 Hetzner VPS as root (or with sudo).
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/bootstrap-vps.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban git

# Docker Engine + Compose plugin (official installer — avoids apt-source footguns)
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-plugin
fi

# Firewall: SSH + HTTP/HTTPS only
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable --now fail2ban
systemctl enable --now docker

mkdir -p /opt/laguardia /var/backups/laguardia
chmod 700 /var/backups/laguardia

echo
echo "Bootstrap OK."
echo "Next:"
echo "  1. git clone <repo> /opt/laguardia"
echo "  2. cp /opt/laguardia/.env.prod.example /opt/laguardia/.env.prod && chmod 600 /opt/laguardia/.env.prod"
echo "  3. Fill secrets + OAuth redirects"
echo "  4. cd /opt/laguardia && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
echo "  5. Install cron from deploy/backup.sh (see docs/deploy-hetzner.md)"
