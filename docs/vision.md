# 1. Visión
Este proyecto se divide en dos partes clave:
1. La web: diseñar una web para la hermandad "La Guardia de Elune" de World of Warcraft que permita a los visitantes leer posts sobre lore oficial de Blizzard e historias escritas por los fans. Esta web también debe tener una zona de usuarios, donde los miembros de la hermandad podrán acceder con su usuario de discord, ver su perfil, con las historias de sus personajes, logros de hermandad, puntos conseguidos y el ranking de la temporada.
2. Unir y sincronizar esta web con Bubu, un bot de Discord desarrollado en Python que hasta ahora servía a los usuarios para apuntarse a míticas/raid con compañeros de la hermandad y ganar puntos y logros por ello.
La idea principal es que tanto la web como Bubu obtengan los datos de una sola fuente de verdad (la base de datos) y los usuarios ya no tengan que apuntarse de forma manual a las míticas para puntuar.
# 2. User Stories
1. Como **visitante**, quiero leer posts y conocer lore tanto de la guild como de Blizzard
2. Como **miembro**, quiero poder consultar el ranking de puntos, logros conseguidos y logros pendientes
3. Como **sistema** quiero poder sincronizar automáticamente las míticas/raids con compañeros de hermandad para asignar puntos sin que el jugador tenga que apuntarse
4. Como **Bubu**, quiero poder anunciar mítica/raid futura y permitir que los miembros se apunten para optimizar la organización
5. Como **admin** quiero poder escribir post y noticias en la web
6. Como **admin** quiero poder penalizar o premiar a los jugadores sumando o restando puntos
7. Como **miembro** quiero poder elegir qué itinerario quiero seguir para puntuar en el ranking de la season
# 3. Reglas de negocio
## 1. ¿Cuántos guildies mínimo en una party de 5?
Al menos 3 de los 5 personajes del grupo tienen que ser miembros de la hermandad para que los puntos se contabilicen.
## 2. ¿Cuántos puntos por nivel de key?
+2, +3, +4 y +5: 10 puntos
+6, +7, +8, +9: 20 puntos
+10 y +11: 30 puntos
+12 y +13: 40 puntos
+14: 80 puntos
+15: 100 puntos
+16: 120 puntos
+17: 140 puntos
+18: 160 puntos
## 3. ¿Bonus por timed en M+?
No exactamente, ya que los puntos que aparecen en la tabla anterior corresponden a M+ timed. En caso de que el grupo haya conseguido terminar la mítica pero lo haya hecho fuera del tiempo, los miembros obtendrán la mitad de puntos
## 4. ¿Sólo míticas al principio, o también raids?
Ambas al principio. Son la misma mecánica, pero las raids tienen solamente 3 dificultades: normal, heroico y mítico.
Otra de las diferencias principales es que cada raid tiene diferentes bosses y cada uno da una cantidad diferente de puntos en base a su dificultad. Lo ideal es que cada boss otorge una cantidad fija de puntos + x cantidad de puntos por la dificultad de la raid:
- Normal: 10 puntos
- Heroico: 40 puntos
- Mítico: 80 puntos
## 5. Puntos: ¿a nivel de cuenta o de personaje?
A nivel de cuenta
## 6. Logros: ¿a nivel de cuenta o de personaje?
La mayoría de logros son a nivel de cuenta, pero hay logros que sólamente se pueden conseguir con algunos personajes.
Por ejemplo: el logro "El mejor pollo de todos" solamente lo puede tener un personaje de clase "Druida". Este logro otorga el título "Elegido/a de Elune" solamente al personaje que lo haya conseguido.
## 7. Títulos: ¿a nivel de cuenta o de personaje?
Los títulos son a nivel de personaje.
## 8. Puntos de temporada y puntos totales
Cada temporada dura unos 3 meses aproximadamente. Al comenzar la temporada los puntos de season_points deberían reiniciarse, pero total_points no.
## 9. ¿Cuál es la fuente de verdad?
Los puntos registrados en base de datos.
## 10. Límite semanal de eventos puntuables
- Máximo de 8 eventos por jugador por semana
- Solo cuentan los 8 con mayor puntuación de esa semana
- Semana = reset WoW EU (miércoles 08:00 UTC+1)
- Desempate: el usuario elige desde su perfil que run mantener; si no resuelve antes del siguiente reset, el más antiguo mantiene su slot automáticamente
- Eventos que no entran en el top 8 se guardan como counted = false (visibles en perfil)
## 11. Itinerarios
Tres itinerarios, un único ranking:
- Competitivo: M+ y raids. Top 8 competitivos/semana
- Campaña e historia: eventos de rol, lore, logros. Top 8 campaña/semana
- Híbrido (Todo en todas partes): 4 mejores competitivos + 4 mejores campaña/semana
Bloqueado al inicio de cada temporada
Criterio de balance: un evento de campaña bien ejecutado debe equipararse en puntos a 3-4 míticas de nivel medio/alto
## 12. Premios de fin de season
- Automáticos por sistema: Mejor [rol] de M+ (calculado por season_points filtrado por character.role_function en itinerario competitivo)
- Por votación: premios creativos. Nominaciones a través de la web.
# 4. Entidades
- user: jugador de Discord vinculado a la hermandad
- character: personaje WoW del jugador
- achievement: catálogo de logros disponibles para los jugadores por conseguir objetivos con compañeros de la hermandad
- user achievement: logros conseguidos por un jugador
- point transaction: transacción de puntos al realizar raid/míticas o conseguir logros
- group: grupo de juego organizado a través de Bubu o la web (mítica, raid, evento)
- group member: cada uno de los participantes del gruipo
- post: publicación de noticias/historia/lore en la web
- character blizzard cache: datos de los personajes obtenidos de la API de Blizzard
- processed run: registro de las míticas/raid realizadas
- point rule: tabla de puntos a otorgar por cada mítica/raid finalizada
- guild roster cache: registro de los personajes de la hermandad
- guild event: evento de campaña creado por admin (rol, lore, logros) con su valor en puntos
- guild event participant: cada uno de los participantes del evento de hermandad
- season: temporada activa con nombre, fecha de inicio y fecha de fin
- season award: premio por categoría de final de temporada
- award vote: registro de votos de los miembros por categoría
# 5. Arquitectura de puntos (auto-sync)
- Job cada 6 horas revisa Raider.io
- Mínimo 3 miembros de la hermandad
- Idempotencia con processed run para no puntuar dos veces por la misma run
- Bubu solamente organiza grupos de run futuras
- Arquitectura de itinerarios + guild events
# 6. Temporadas
- Duración aproximada: 3 meses
- Reset de season_points al inicio
- Tabla season, season_id en transactions y bloqueo de itinerario
# 7. Diagramas
![Entidad-Relación](docs/diagrama-er.png)
![Flujo](docs/diagrama-flujo.png)
# 8. Estado del proyecto

## Base de datos — tablas activas (21 migraciones Alembic aplicadas)

| Tabla | Descripción |
|---|---|
| `users` | Jugadores: Discord OAuth, Blizzard OAuth, rol, path, puntos, birthday |
| `characters` | Personajes: Retail/Forever, lore, avatares, render_url Blizzard |
| `titles` | Catálogo de títulos de hermandad (source: achievement/points/rank/custom) |
| `character_titles` | Junction: qué personaje tiene qué título, cuándo y otorgado por quién |
| `character_relations` | Árbol de relaciones narrativas entre personajes (ally, rival, family, …) |
| `point_transactions` | Historial de puntos por categoría y temporada |
| `achievements` | Catálogo de logros disponibles |
| `user_achievements` | Junction: logros conseguidos por jugador |
| `posts` | Publicaciones: título, subtítulo, cover_url, categoría, contenido |
| `seasons` | Temporadas con fechas y estado activo |

## Fase 0 — Planificación y setup ✅
- Visión, user stories, reglas de negocio y entidades definidas
- Cuentas de developer en Discord y Blizzard
- Monorepo inicializado (`api/`, `web/`, `bubu/`)
- Docker Compose con PostgreSQL en puerto 5433
- Variables de entorno configuradas (`.env`, `.env.example`)

## Fase 1 — Web pública: listado y detalle de posts ✅
- FastAPI con SQLAlchemy + Alembic
- Modelos `Post`, `Season`; migraciones aplicadas
- Endpoints `GET /posts/` y `GET /posts/{id}` con esquemas Pydantic
- Next.js App Router con Server Components
- Home pública estilo Battle.net: hero carrusel + tablón en grid 4×2
- Posts con `subtitle` y `cover_url` (migración `f8c2a1b9e704`, une heads de Alembic)
- Ranking público en `/ranking`

## Fase 2 — Modelo de datos completo ✅
- Modelos ORM: `User`, `Character`, `Achievement`, `UserAchievement`, `PointTransaction`
- ENUMs centralizados en `enums.py`: `CharacterClass`, `CharacterFunction`, `CharacterProfession`, `EventCategory`, `UserRole`, `UserPath`
- 20 migraciones Alembic aplicadas en cadena lineal

## Fase 3 — OAuth2 Discord + JWT + páginas privadas ✅
- Endpoint `GET /auth/discord/login` → OAuth2 Discord con state CSRF
- Endpoint `GET /auth/discord/callback` → verifica membresía, upsert usuario, JWT en cookie httpOnly
- Sincronización automática de rol en login: `Lider → admin`, `Oficial → officer`, resto → `member`
- El nombre visible es el **apodo del servidor Discord** (`nick`); si no hay, el username
- Se refresca al abrir perfil y el panel de jugadores (Bot token)
- `guild_title` se asigna solo en creación (no se sobreescribe en logins posteriores)
- En perfil y jugadores ya no se muestra `guild_title` bajo el nombre (el rol va en la etiqueta)
- Dependencia `get_current_user` para proteger endpoints con JWT
- Endpoint `GET /users/me`, `PATCH /users/me/birthday`
- Página `/profile` privada con perfil completo del usuario

## Fase 4 — Roles admin + CRUD protegido ✅
- Dependencia `require_admin` encadenada sobre `get_current_user`
- CRUD completo de posts protegido (`POST`, `PATCH`, `DELETE /posts/{id}`)
- Panel `/admin` — hub central con secciones: Posts, Títulos, Jugadores, Avatares
- Panel `/admin/posts` — formulario de creación, edición inline y borrado
- Panel `/admin/titles` — crear títulos y otorgar/revocar a personajes
- Panel `/admin/players` — gestión de jugadores (tabla con roles y datos)
- Panel `/admin/avatars` — revisión y aprobación de avatares pendientes
- Navbar con botón Admin visible solo para admin/officer

## Fase 5 — Bot Bubu 🚧 En progreso
- Estructura de Cogs creada en `bubu/cogs/`
- Capa de base de datos `bubu/db/database.py` con asyncpg
- Cog `admin` con `/ping` y `/sync`
- Pendiente: conectar a PostgreSQL compartida y migrar comandos originales

## Fase 6 — Blizzard API + personajes ✅ (parcial)
- OAuth2 Blizzard: login, callback, tokens guardados en BD
- Importar personajes desde Battle.net con selector Retail / Warcraft Forever
- Sincronización de `blizzard_character_id` y `render_url` via Character Media API
- `render_url` prioriza: main > inset > avatar
- Re-sync automático si el render es de tipo avatar (baja calidad)
- Sistema de avatares custom: upload → pendiente → aprobación admin → activo
- Detección de token Blizzard caducado con aviso en perfil
- Profesiones en tiempo real: `GET /characters/{name}/{realm}/professions` llama a la Profile API de Blizzard (`primaries` + `secondaries`, skill por expansión, recetas)
- El tab Profesiones maneja Forever, token ausente, token caducado, vacío y datos normales

## Perfil de personaje — sistema completo ✅
- Datos de identidad: nombre, apellido (WF), antetítulo, título favorito, facción, origen, edad, residencia
- Lore: biografía, personalidad, aspecto (campos de texto libres)
- Árbol de relaciones narrativas con otros personajes de la hermandad
- Sistema de títulos: otorgar/revocar (admin), establecer favorito (jugador)
- Imagen de fondo: render de Blizzard o avatar custom con aprobación admin
- Tres tabs: Puntos y logros / Historia y relaciones / Profesiones (Blizzard API)

## Home pública — rediseño visual ✅
- Hero carrusel (7 s): texto a la izquierda, CTA, flechas, pause/play
- 4 miniaturas-tarjeta de las otras diapositivas, superpuestas al borde del banner
- Tablón: grid 4×2 con tarjeta tipo tienda (imagen, badge de categoría, kicker, título, subtítulo, fecha)
- Navbar estilo Battle.net: barra `h-12`, wordmark **LA GUARDIA DE ELUNE** a la izquierda, links en mayúsculas a la derecha, activo subrayado
- Admin de posts: campos subtítulo y URL de portada

## Layout del perfil — diseño fijo ✅
- Navbar: `sticky top-0 z-50 h-12`
- Aside: `md:sticky top-12 h-[calc(100vh-3rem)]` — solo la lista de personajes scrollea
- CharacterDetail: zona estática (cabecera + datos + tabs bar) + zona scrolleable (contenido del tab)
- Imagen de fondo desktop: `position: fixed` con fade multi-stop de 7 paradas
- Datos personales desktop: grid de 2 columnas limitado a `max-w-[48%]` para no tapar el render
- Mobile: banner de imagen corto; tocar la imagen abre cambiar/quitar; datos compactos a la derecha debajo del banner; el tab ocupa la mayor parte de la pantalla

## Fase 7 — Deploy 🚧 Pendiente
- Docker Compose completo
- Deploy: Vercel (web) + Railway o Render (API)
- README portfolio