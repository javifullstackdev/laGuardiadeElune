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
        """Crea el usuario si no existe, o lo devuelve si ya existe."""
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(
                """
                INSERT INTO users (id, discord_id, username, guild_title)
                VALUES (gen_random_uuid(), $1, $2, 'Miembro')
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
        """Devuelve el ranking de usuarios por puntos totales."""
        async with self.pool.acquire() as conn:
            return await conn.fetch(
                """
                SELECT username, discord_id, total_points
                FROM users
                WHERE deleted_at IS NULL
                ORDER BY total_points DESC
                LIMIT $1
                """,
                limit,
            )
