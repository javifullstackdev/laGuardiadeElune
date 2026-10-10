# Deploy helpers

Guía completa (VPS paso a paso + ramas/commits + porqués):  
**[docs/deploy-hetzner.md](../docs/deploy-hetzner.md)**

| Script | Dónde | Para qué |
|--------|--------|----------|
| `check-env.ps1` | Windows | Validar `.env.prod` antes de subir al VPS |
| `check-env.sh` | VPS | Igual en Linux |
| `bootstrap-vps.sh` | VPS (una vez) | Docker, UFW, fail2ban |
| `up.sh` | VPS | `git pull` + rebuild |
| `backup.sh` | VPS (cron) | Dump diario de Postgres |
| `smoke-test.sh` | cualquiera | Checks HTTP al dominio público |
| `Caddyfile` | Compose | HTTPS, headers, cache `/static` |
