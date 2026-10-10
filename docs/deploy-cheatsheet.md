# Deploy cheatsheet (finde)

Detalle y porqués → [`deploy-hetzner.md`](./deploy-hetzner.md)

## A. En tu PC (ahora)

Rama (si aún no estás en ella):
```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune
git checkout feat/hetzner-deploy
```

**Atajo (tú ejecutas el script; crea los 4 commits):**
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\commit-hetzner-deploy.ps1
git push -u origin HEAD
```

O commits manuales: sección 2 de `deploy-hetzner.md`.  
Merge a `main` antes de clonar en el VPS.

## B. Hetzner (panel)

1. Server: Ubuntu 24.04 · EU · **≥4 GB** · SSH key  
2. Firewall: TCP **22, 80, 443**  
3. Anota la **IPv4**

## C. DNS (registrador)

- `A` `@` → IP  
- `A` `www` → IP  
- TTL 300

## D. En el VPS (SSH)

```bash
git clone https://github.com/javifullstackdev/laGuardiadeElune.git /opt/laguardia
cd /opt/laguardia && git checkout main
sudo bash deploy/bootstrap-vps.sh

cp .env.prod.example .env.prod && chmod 600 .env.prod
nano .env.prod          # secrets + redirects HTTPS
./deploy/check-env.sh

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
./deploy/smoke-test.sh
```

OAuth redirects (portales Discord / Blizzard):

- `https://www.laguardiadeelune.com/api/auth/discord/callback`
- `https://www.laguardiadeelune.com/api/auth/blizzard/callback`

## E. Después

```bash
# backup diario
crontab -e
# 15 3 * * * /opt/laguardia/deploy/backup.sh >> /var/log/laguardia-backup.log 2>&1

# redesplegar
./deploy/up.sh
```
