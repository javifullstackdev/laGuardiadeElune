# Deploy en Hetzner — guía de aprendizaje

Dominio: `www.laguardiadeelune.com`  
Stack: **Caddy** (HTTPS) → **Next.js** + **FastAPI** + **Postgres** (+ **Bubu** opcional)

Esta guía es lo que **tú** haces con las manos. El código de soporte ya está en el repo (Dockerfiles, Compose, scripts); tú aprendes a operar un VPS como en un trabajo real.

---

## 1. Qué hay que entender (antes de tocar el panel)

En local tienes tres procesos sueltos (Docker Postgres + uvicorn + `npm run dev`).  
En producción quieres **un solo servidor** que:

1. Escuche 80/443 (HTTP/HTTPS) en internet.
2. Por dentro arranque contenedores: `caddy`, `web`, `api`, `db` (+ `bubu`).
3. Guarde datos en volúmenes (`postgres_data`, `api_uploads`) para que un rebuild no borre nada.
4. Renueve certificados SSL solo (Caddy + Let’s Encrypt).

```text
Internet
   │
   ▼
:443 Caddy  ──► web:3000   (Next.js, rutas /, /api/*, páginas)
         └──► api:8000  (/auth/*, /static/*, /health)
                │
                ▼
              db:5432   (solo red Docker, NO expuesto a internet)
```

**Por qué no Vercel + Railway aquí:** Bubu, Postgres y uploads en disco quieren vivir juntos. Un VPS es la forma más simple de aprender ops de verdad.

---

## 2. Git: ramas y commits (tú los haces)

Hoy el trabajo de deploy está **sin commit** (~96 paths) encima de `feature/parchment-improvements`.  
Un flujo profesional de portfolio:

### Opción A — limpia (recomendada)

| # | Rama | Qué metes | Commit message (EN) |
|---|------|-----------|---------------------|
| 1 | `feature/parchment-improvements` | Solo lo de pergamino que quede (si aún hay) | ya está en `9519c70` si no hay más |
| 2 | PR → `main` | merge del pergamino | vía GitHub PR |
| 3 | `feat/hetzner-deploy` (desde `main`) | Docker, Caddy, `apiUrl`, cookies, docs | ver commits abajo |
| 4 | PR → `main` | review + merge | |
| 5 | VPS clona `main` | | |

### Opción B — finde (más rápida, recomendada ahora)

Partes de `feature/parchment-improvements` (o de `main` si ya mergeaste el pergamino).  
Copia y pega **bloque a bloque**. Tras cada commit, `git status` debe ir quedando más limpio.

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune
git checkout -b feat/hetzner-deploy
```

#### Commit 1 — Web: API URLs, cookies, build prod
```powershell
git add web/lib/api.ts web/lib/auth-cookie.ts `
  web/app/components/EluneLogoReveal.d.ts `
  web/next.config.ts web/package.json web/package-lock.json web/tsconfig.json `
  web/app
git commit -m "feat(web): use env-based API URLs and secure session cookies"
```

#### Commit 2 — API: static URLs, CORS, health, imagen Docker
```powershell
git add api/app/urls.py api/app/main.py api/app/database.py `
  api/app/routers api/app/schemas/character.py api/requirements.txt `
  api/Dockerfile api/.dockerignore api/scripts
git commit -m "feat(api): add public static URLs, CORS, health, and Docker image"
```

#### Commit 3 — Compose, Caddy, scripts de ops
```powershell
git add docker-compose.prod.yml deploy `
  .env.prod.example .env.example .gitignore `
  bubu/Dockerfile bubu/.dockerignore `
  web/Dockerfile web/.dockerignore
git commit -m "feat(deploy): add Hetzner Compose stack, Caddy, and ops scripts"
```

#### Commit 4 — Docs (+ script one-shot de migración)
```powershell
git add docs/deploy-hetzner.md docs/deploy-cheatsheet.md `
  docs/vision.md docs/conventions.md `
  scripts/migrate_api_url.py
git commit -m "docs: add Hetzner deploy guide and update Fase 7"
```

#### Comprobar que no queda nada raro
```powershell
git status
# Debe estar limpio (o solo archivos que NO deban subirse: .env, uploads, etc.)
```

#### Push + PR a main
```powershell
git push -u origin HEAD
gh pr create --base main --title "feat: Hetzner production deploy stack" --body @"
## Summary
- Env-based API URLs and Secure cookies on the web
- API PUBLIC_BASE_URL, CORS, /health, production Docker image
- docker-compose.prod.yml + Caddy + bootstrap/backup/smoke scripts
- Learning guide in docs/deploy-hetzner.md

## Test plan
- [ ] ``npm run build`` in web/
- [ ] Review ``.env.prod.example`` (no real secrets)
- [ ] After merge: VPS ``compose up`` + ``deploy/smoke-test.sh``
"@
```

**Nunca** hagas `git add .env` ni `.env.prod` (secretos). Están en `.gitignore`.

Cuando el PR esté mergeado en `main`, el VPS clona/actualiza `main`.

---

## 3. Tu parte en el VPS — paso a paso

Hazlo en este orden. Cada bloque tiene un **por qué**.

### Paso 1 — Crear el Cloud Server (panel Hetzner)

Hazlo con la consola abierta; tarda ~2 minutos.

1. Entra en [console.hetzner.cloud](https://console.hetzner.cloud) e inicia sesión.
2. Arriba a la izquierda: elige o crea un **Project** (ej. `La Guardia de Elune`).
3. Menú izquierdo → **Servers** → **Add Server**.
4. Rellena la ficha:
   - **Location:** Falkenstein (`fsn1`), Nuremberg (`nbg1`) o Helsinki (`hel1`) — da igual cuál EU.
   - **Image:** Ubuntu → **24.04**.
   - **Type:** mira la columna **Memory**. Elige **≥ 4 GB** (nombres tipo CX23/CX33/CPX cambian; lo que importa es la RAM). Evita 2 GB.
   - **Networking:** deja IPv4. IPv6 opcional.
   - **SSH keys:** **Add SSH key** → pega tu clave `.pub` → selecciónala.  
     Si solo dejas password, es menos seguro y más frágil para automatizar.
   - **Name:** `laguardia-prod` (o similar).
5. **Create & Buy now**. Espera a que pase a estado **Running**.
6. Copia la **IPv4** de la tarjeta del server (la necesitas para DNS y para `ssh`).

**Por qué ≥4 GB:** en el mismo host convivirán Postgres + Next + FastAPI (+ Bubu). Con 2 GB el OOM killer te tumba contenedores en el build de Next.

**SSH key en Windows (si aún no tienes una):**
```powershell
ssh-keygen -t ed25519 -C "laguardia-hetzner"
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```
Copia la línea que empieza por `ssh-ed25519` y pégala en Hetzner.

### Paso 2 — Firewall en Hetzner Cloud

1. **Firewalls** → Create:
   - Inbound: TCP **22**, **80**, **443** (desde Anywhere, o 22 solo desde tu IP).
   - Outbound: Allow all.
2. Asigna el firewall al server.

**Por qué:** aunque UFW dentro del SO también ayuda, el firewall del cloud es la primera puerta.

### Paso 3 — DNS del dominio

En el panel DNS del sitio donde compraste `laguardiadeelune.com` (a veces se llama “Zona DNS”, “DNS management” o “Registros”):

| Tipo | Nombre / Host | Valor / Points to | TTL |
|------|---------------|-------------------|-----|
| A | `@` o vacío o `laguardiadeelune.com` | IP del VPS | 300 |
| A | `www` | misma IP | 300 |

Notas según el panel:
- Algunos ponen el host como `@` para el apex; otros dejan el campo vacío.
- No hace falta CNAME de `www` → apex si ya tienes dos registros A (más simple al empezar).
- Si el dominio usa nameservers de Cloudflare u otro DNS, los registros van **allí**, no en el registrador.

Comprueba desde tu PC (puede tardar minutos; a veces hasta 1 h con TTL bajo):
```powershell
nslookup www.laguardiadeelune.com
nslookup laguardiadeelune.com
```
Ambos deben devolver la IP del VPS.

**Por qué TTL 300:** si te equivocas de IP, el cambio se nota antes. Cuando todo sea estable, súbelo a 3600.

### Paso 4 — Primer SSH

```powershell
ssh root@TU_IP_DEL_VPS
```

Si entra con la clave, bien. Recomendado después:
```bash
# Crear usuario no-root (opcional pero profesional)
adduser deploy
usermod -aG sudo deploy
# Copiar tu authorized_keys a deploy, luego desactivar PasswordAuthentication
```

Para el finde, trabajar como `root` con clave SSH es aceptable; a medio plazo usa usuario `deploy`.

### Paso 5 — Bootstrap del sistema

Con el repo **ya en GitHub (`main`)**:

```bash
# Opción recomendada: clonar y luego bootstrap
apt-get update && apt-get install -y git
git clone https://github.com/javifullstackdev/laGuardiadeElune.git /opt/laguardia
cd /opt/laguardia
git checkout main
sudo bash deploy/bootstrap-vps.sh
```

Ese script instala **Docker**, **Compose**, **UFW** (22/80/443) y **fail2ban**.

**Por qué Docker en el VPS:** misma receta en tu PC y en prod; menos “en mi máquina funciona”.

### Paso 6 — OAuth en Discord y Blizzard (en paralelo al DNS)

En los developer portals, **añade** (no borres localhost aún):

| App | Redirect URI de producción |
|-----|----------------------------|
| Discord | `https://www.laguardiadeelune.com/api/auth/discord/callback` |
| Blizzard | `https://www.laguardiadeelune.com/api/auth/blizzard/callback` |

**Por qué esos paths:** el navegador vuelve a **Next.js** (`/api/auth/...`), que habla con FastAPI por la red Docker. El login **empieza** en FastAPI (`/auth/discord/login`), que Caddy enruta al contenedor `api`.

### Paso 7 — Secrets en el servidor

```bash
cd /opt/laguardia
cp .env.prod.example .env.prod
chmod 600 .env.prod
nano .env.prod
```

Genera valores fuertes **en el VPS**:
```bash
openssl rand -hex 32   # → JWT_SECRET
openssl rand -hex 24   # → DB_PASSWORD (solo letras/números; sin @ : # / ?)
```

Rellena también:
- `ACME_EMAIL` — tu email (Let’s Encrypt)
- `DISCORD_*` / `BLIZZARD_*` — los mismos Client ID/Secret que en local
- Redirects HTTPS como en el paso 6
- `PUBLIC_BASE_URL=https://www.laguardiadeelune.com`
- `CORS_ORIGINS=https://www.laguardiadeelune.com,https://laguardiadeelune.com`
- `SITE_URL=https://www.laguardiadeelune.com`

Valida:
```bash
chmod +x deploy/*.sh
./deploy/check-env.sh
```

**Por qué `.env.prod` no va a Git:** son llaves reales. El ejemplo (`.env.prod.example`) sí se versiona.

### Paso 8 — Primer arranque

```bash
cd /opt/laguardia
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

La primera vez tarda (build de Next + API). Sigue el progreso:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f caddy
```

Cuando Caddy tenga certificado:
```bash
curl -fsS https://www.laguardiadeelune.com/health
./deploy/smoke-test.sh
```

**Bubu** (misma Postgres), cuando quieras:
```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml --profile bot up -d --build
```

### Paso 9 — Smoke manual (aprendizaje real)

Abre el navegador y marca:

- [ ] Home, tablón, personajes, historias, ranking
- [ ] Login Discord → perfil / onboarding
- [ ] Vincular Battle.net
- [ ] Admin: crear/editar post
- [ ] Subir avatar → `docker compose ... restart api` → la imagen sigue (volumen)
- [ ] Reiniciar el VPS desde el panel → al volver, `docker ps` muestra los contenedores up

### Paso 10 — Backups

```bash
crontab -e
# una línea:
15 3 * * * /opt/laguardia/deploy/backup.sh >> /var/log/laguardia-backup.log 2>&1
```

**Por qué:** un VPS sin backup no es producción, es un experimento con fecha de caducidad.

### Redesplegar después de un `git push` a main

```bash
cd /opt/laguardia
./deploy/up.sh
```

---

## 4. Seguridad y rendimiento (qué ya hace el stack)

| Tema | Cómo lo cubrimos |
|------|------------------|
| HTTPS | Caddy + Let’s Encrypt |
| Headers | HSTS, X-Frame-Options, etc. en `deploy/Caddyfile` |
| Secrets | `.env.prod` mode 600, fuera de git; JWT fuerte obligatorio si `ENV=production` |
| Superficie | Solo 22/80/443; Postgres sin puerto público |
| Docs API | `/docs` desactivado en prod |
| Cookies | `Secure` + `httpOnly` + `SameSite=lax` |
| Uploads | Volumen `api_uploads` + `PUBLIC_BASE_URL` |
| Rendimiento | Next `standalone`, gzip/zstd, cache `/static`, `mem_limit`, healthchecks |

---

## 5. Estado actual del código en repo

| Pieza | Estado |
|-------|--------|
| `apiUrl` / cookies / Docker / Caddy / scripts | ✅ en working tree |
| Commit + push + merge a `main` | ⬜ **tú** (sección 2) |
| VPS + DNS + `.env.prod` + OAuth + compose | ⬜ **tú** (sección 3) |
| Sitio vivo `https://www.laguardiadeelune.com` | ⬜ pendiente |

---

## 6. Glosario rápido (para entrevistas)

- **VPS:** máquina virtual que alquilas; tú instalas el SO y los servicios.
- **Compose:** define multi-contenedor como código (`docker-compose.prod.yml`).
- **Reverse proxy (Caddy):** termina TLS y reparte rutas al servicio correcto.
- **Volumen:** disco persistente fuera del ciclo de vida del contenedor.
- **Healthcheck:** Compose reinicia si `/health` falla.
- **BFF:** Next `/api/*` habla con FastAPI con el JWT; el browser no necesita conocer `api:8000`.
