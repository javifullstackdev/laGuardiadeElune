# Guía de uso de la web

La web se ve en [http://localhost:3000](http://localhost:3000). Necesita PostgreSQL (Docker) y la API FastAPI. Abre **Docker Desktop** antes del primer comando.

## Arranque (PowerShell)

Tres terminales, en este orden.

### 1. PostgreSQL

Desde la raíz del repo:

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune
docker compose up -d
```

### 2. API FastAPI (puerto 8000)

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune\api
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Si faltan columnas en la base de datos (error de schema al abrir la web):

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune\api
.\venv\Scripts\Activate.ps1
python -m alembic upgrade head
```

### 3. Web Next.js (puerto 3000)

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune\web
npm run dev
```

### Bubu (opcional)

Solo si vas a usar comandos de Discord (`/registrar_personaje`, etc.):

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune\bubu
.\venv\Scripts\Activate.ps1
python main.py
```

Después de mergear en GitHub, actualiza el código local:

```powershell
cd C:\Users\elchi\OneDrive\Escritorio\DAM\laGuardiadeElune
git checkout main
git pull
```

## Cómo usarla

- **Entrar:** botón Entrar (Discord). Hay que estar en el servidor de la hermandad.
- **Público (sin login):** Inicio, Tablón, Personajes, Historias, Ranking.
- **Perfil** (`/profile`): elige un personaje a la derecha. Pestañas: Bio, Puntos, Logros, Títulos, Historias, Relaciones, Profesiones.
- **Añadir personaje:** en el perfil, *+ Añadir desde Battle.net*, o `/characters`. Retail se importa de la cuenta; Forever pide apellido. Desde Discord, `/registrar_personaje` (solo admin) valida Retail en la armería.
- **Admin** (líder / oficial): posts, títulos, jugadores, avatares, bios, historias, carrusel.

La visión de producto está en [vision.md](vision.md).
