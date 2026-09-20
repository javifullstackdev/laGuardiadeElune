"""
Capa de acceso a PostgreSQL para Bubu.
Usa asyncpg — driver nativo async para PostgreSQL.
"""

import os
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")


class Database:
    """
    Wrapper sobre asyncpg. Gestiona el pool de conexiones
    y expone métodos para las operaciones más comunes.
    """

    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def connect(self):
        """Crea el pool de conexiones. Llamar una vez al arrancar el bot."""
        # asyncpg usa su propio DSN — convertimos el formato de SQLAlchemy si hace falta
        dsn = DATABASE_URL.replace("postgresql+pg8000://", "postgresql://")
        self.pool = await asyncpg.create_pool(dsn=dsn)

    async def close(self):
        """Cierra el pool al apagar el bot."""
        if self.pool:
            await self.pool.close()

    # ── Métodos de usuario ─────────────────────────────────────────────────

    async def get_user(self, discord_id: str) -> asyncpg.Record | None:
        """Devuelve el usuario por discord_id o None si no existe."""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                "SELECT * FROM users WHERE discord_id = $1", discord_id
            )

    async def upsert_user(self, discord_id: str, username: str) -> asyncpg.Record:
        """Creates the user if they don't exist, or returns them if they do."""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """
                INSERT INTO users (id, discord_id, username, guild_title, total_points, role, path)
                VALUES (gen_random_uuid(), $1, $2, 'Miembro', 0, 'MEMBER', 'HYBRID')
                ON CONFLICT (discord_id) DO UPDATE SET username = EXCLUDED.username
                RETURNING *
                """,
                discord_id,
                username,
            )

    # ── Métodos de puntos ──────────────────────────────────────────────────

    async def add_points(
        self,
        discord_id: str,
        amount: int,
        reason: str,
        event_category: str = "OTHER",
    ) -> int:
        """
        Añade puntos a un usuario y registra la transacción.
        Devuelve el nuevo total de puntos.
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                user = await conn.fetchrow(
                    "SELECT id, total_points FROM users WHERE discord_id = $1",
                    discord_id,
                )
                if not user:
                    raise ValueError(f"Usuario {discord_id} no encontrado")

                await conn.execute(
                    """
                    INSERT INTO point_transactions (id, user_id, amount, reason, event_category)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4::eventcategory)
                    """,
                    user["id"],
                    amount,
                    reason,
                    event_category,
                )

                new_total = await conn.fetchval(
                    """
                    UPDATE users SET total_points = total_points + $1
                    WHERE id = $2
                    RETURNING total_points
                    """,
                    amount,
                    user["id"],
                )
                return new_total

    async def get_ranking(self, limit: int = 10) -> list[asyncpg.Record]:
        """
        Devuelve el ranking de usuarios por puntos totales.
        Incluye el personaje main de cada usuario si lo tiene registrado.
        """
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """
                SELECT
                    u.username,
                    u.discord_id,
                    u.total_points,
                    c.name  AS char_name,
                    c.realm AS char_realm,
                    c.wow_class
                FROM users u
                LEFT JOIN characters c
                    ON c.user_id = u.id
                    AND c.is_main = true
                    AND c.deleted_at IS NULL
                WHERE u.deleted_at IS NULL
                ORDER BY u.total_points DESC
                LIMIT $1
                """,
                limit,
            )

    async def get_user_transactions(
        self, discord_id: str, limit: int = 5
    ) -> list[asyncpg.Record]:
        """Devuelve las últimas transacciones de puntos de un usuario."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """
                SELECT pt.amount, pt.reason, pt.event_category, pt.created_at
                FROM point_transactions pt
                JOIN users u ON pt.user_id = u.id
                WHERE u.discord_id = $1
                ORDER BY pt.created_at DESC
                LIMIT $2
                """,
                discord_id,
                limit,
            )

    # ── Métodos de personajes ──────────────────────────────────────────────

    async def get_user_characters(self, discord_id: str) -> list[asyncpg.Record]:
        """Devuelve todos los personajes vinculados a un usuario."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """
                SELECT c.*
                FROM characters c
                JOIN users u ON c.user_id = u.id
                WHERE u.discord_id = $1 AND c.deleted_at IS NULL
                ORDER BY c.is_main DESC, c.name
                """,
                discord_id,
            )

    async def register_character(
        self,
        discord_id: str,
        name: str,
        realm: str,
        wow_class: str | None = None,
        role_function: str | None = None,
        is_main: bool = False,
    ) -> asyncpg.Record:
        """
        Registra un personaje y lo vincula a un usuario.
        Si el personaje ya existe para ese usuario, lo devuelve sin duplicar.
        """
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                user = await conn.fetchrow(
                    "SELECT id FROM users WHERE discord_id = $1", discord_id
                )
                if not user:
                    raise ValueError(f"Usuario {discord_id} no encontrado en la base de datos")

                # Comprobar si ya existe este personaje vinculado a OTRO usuario
                conflict = await conn.fetchrow(
                    """
                    SELECT u.discord_id FROM characters c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.name = $1 AND c.realm = $2 AND u.discord_id != $3
                    AND c.deleted_at IS NULL
                    """,
                    name, realm, discord_id,
                )
                if conflict:
                    raise ValueError(f"El personaje {name}-{realm} ya está vinculado a otro usuario")

                # Upsert del personaje
                character = await conn.fetchrow(
                    """
                    INSERT INTO characters (id, user_id, name, realm, is_main, is_alt, wow_class, role_function)
                    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::characterclass, $7::characterfunction)
                    ON CONFLICT (user_id, name, realm) DO UPDATE
                        SET is_main = EXCLUDED.is_main,
                            updated_at = now()
                    RETURNING *
                    """,
                    user["id"], name, realm, is_main, not is_main,
                    wow_class, role_function,
                )
                return character

    async def set_main_character(self, discord_id: str, name: str, realm: str) -> bool:
        """Marca un personaje como main y el resto como alts."""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                user = await conn.fetchrow(
                    "SELECT id FROM users WHERE discord_id = $1", discord_id
                )
                if not user:
                    return False
                # Todos los personajes del usuario pasan a ser alts
                await conn.execute(
                    "UPDATE characters SET is_main = false, is_alt = true WHERE user_id = $1",
                    user["id"],
                )
                # El seleccionado pasa a ser main
                result = await conn.execute(
                    """
                    UPDATE characters SET is_main = true, is_alt = false
                    WHERE user_id = $1 AND name = $2 AND realm = $3 AND deleted_at IS NULL
                    """,
                    user["id"], name, realm,
                )
                return result == "UPDATE 1"

    async def get_guild_roster(self) -> list[asyncpg.Record]:
        """Devuelve todos los personajes registrados en la hermandad."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """
                SELECT c.name, c.realm, c.wow_class, c.role_function, c.is_main,
                       u.username, u.discord_id
                FROM characters c
                JOIN users u ON c.user_id = u.id
                WHERE c.deleted_at IS NULL
                ORDER BY u.username, c.is_main DESC
                """
            )
