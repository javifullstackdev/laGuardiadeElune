# Deploy cheatsheet (finde)

Detalle y porqués → [`deploy-hetzner.md`](./deploy-hetzner.md)

## A. En tu PC (ahora)

Rama ya pusheada: `feat/hetzner-deploy` (4 commits de deploy en origin).

**1. Abrir PR y mergear a `main`:**  
https://github.com/javifullstackdev/laGuardiadeElune/compare/main...feat/hetzner-deploy?expand=1

**2. Clave SSH (si no tienes `.pub`):**
```powershell
ssh-keygen -t ed25519 -C "laguardia-hetzner"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```
Copia la línea `ssh-ed25519 ...` para Hetzner.

## B. Hetzner (panel)

1. Server: Ubuntu 24.04 · EU · **≥4 GB** · pega la SSH key  
2. Firewall: TCP **22, 80, 443**  
3. Anota la **IPv4**

## C. DNS (Porkbun)

Ahora el dominio apunta al parking de Porkbun (`uixie.porkbun.com`).  
Panel: https://porkbun.com/account/domains → `laguardiadeelune.com` → **DNS**

1. Borra o desactiva registros A/CNAME de parking que apunten a Porkbun.
2. Crea:

| Tipo | Host | Answer / IP | TTL |
|------|------|-------------|-----|
| A | (en blanco / `@`) | IPv4 del VPS | 300 |
| A | `www` | misma IPv4 | 300 |

```powershell
nslookup www.laguardiadeelune.com
nslookup laguardiadeelune.com
# Ambos deben devolver la IP del VPS (puede tardar minutos)
```

## D. OAuth (portales Discord / Blizzard)

Añade (no borres localhost aún):

- `https://www.laguardiadeelune.com/api/auth/discord/callback`
- `https://www.laguardiadeelune.com/api/auth/blizzard/callback`

## E. En el VPS (SSH) — tras merge a `main`

```bash
apt-get update && apt-get install -y git
git clone https://github.com/javifullstackdev/laGuardiadeElune.git /opt/laguardia
cd /opt/laguardia && git checkout main
sudo bash deploy/bootstrap-vps.sh

cp .env.prod.example .env.prod && chmod 600 .env.prod
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 24   # → DB_PASSWORD (solo hex = URL-safe)
nano .env.prod         # secrets + redirects HTTPS + ACME_EMAIL
chmod +x deploy/*.sh
./deploy/check-env.sh

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
./deploy/smoke-test.sh
```

## F. Después

```bash
# backup diario
crontab -e
# 15 3 * * * /opt/laguardia/deploy/backup.sh >> /var/log/laguardia-backup.log 2>&1

# redesplegar
./deploy/up.sh
```
