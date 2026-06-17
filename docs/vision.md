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
# 3. Reglas de negocio
## 1. ¿Cuántos guildies mínimo en una party de 5?
Al menos 3 de los 5 personajes del grupo tienen que ser miembros de la hermandad para que los puntos se contabilicen.
## 2. ¿Cuántos puntos por nivel de key?
+2, +3, +4 y +5: 5 puntos
+6, +7, +8, +9: 10 puntos
+10: 20 puntos
+11: 25 puntos
+12: 30 puntos
+13: 35 puntos
+14: 40 puntos
+15: 50 puntos
+16: 60 puntos
+17: 70 puntos
+18: 80 puntos
## 3. ¿Sólo míticas al principio, o también raids?
Ambas al principio. Son la misma mecánica, pero las raids tienen solamente 3 dificultades: normal, heroico y mítico.
Otra de las diferencias principales es que cada raid tiene diferentes bosses y cada uno da una cantidad diferente de puntos en base a su dificultad. Lo ideal es que cada boss otorge una cantidad fija de puntos + x cantidad de puntos por la dificultad de la raid:
- Normal: 10 puntos
- Heroico: 40 puntos
- Mítico: 80 puntos
## 4. Puntos: ¿a nivel de cuenta o de personaje?
A nivel de cuenta
## 5. Logros: ¿a nivel de cuenta o de personaje?
La mayoría de logros son a nivel de cuenta, pero hay logros que sólamente se pueden conseguir con algunos personajes.
Por ejemplo: el logro "El mejor pollo de todos" solamente lo puede tener un personaje de clase "Druida". Este logro otorga el título "Elegido/a de Elune" solamente al personaje que lo haya conseguido.
## 6. Títulos: ¿a nivel de cuenta o de personaje?
Los títulos son a nivel de personaje.
## 7. Puntos de temporada y puntos totales
Cada temporada dura unos 3 meses aproximadamente. Al comenzar la temporada los puntos de season_points deberían reiniciarse, pero total_points no.
## 8. ¿Cuál es la fuente de verdad?
Los puntos registrados en base de datos.
# 4. Entidades
- user: jugador de Discord vinculado a la hermandad
- character: personaje WoW del jugador
- achievement: catálogo de logros disponibles para los jugadores por conseguir objetivos con compañeros de la hermandad
- user achievement: logros conseguidos por un jugador
- point transaction: transacción de puntos al realizar raid/míticas o conseguir logros
- group: grupo tanto de mítica como de raid formado por al menos 3 jugadores de la hermandad
- group member: cada uno de los participantes del gruipo
- post: publicación de noticias/historia/lore en la web
- character blizzard cache: datos de los personajes obtenidos de la API de Blizzard
- processed run: registro de las míticas/raid realizadas
- point rule: tabla de puntos a otorgar por cada mítica/raid finalizada
- guild roster cache: registro de los personajes de la hermandad
# 5. Arquitectura de puntos (auto-sync)
- Job cada 6 horas revisa Raider.io
- Mínimo 3 miembros de la hermandad
- Idempotencia con processed run para no puntuar dos veces por la misma run
- Bubu solamente organiza grupos de run futuras
# 6. Temporadas
- Duración aproximada: 3 meses
- Reset de season_points al inicio
# 7. Diagramas
![Entidad-Relación](docs/diagrama-er.png)
![Flujo](docs/diagrama-flujo.png)