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