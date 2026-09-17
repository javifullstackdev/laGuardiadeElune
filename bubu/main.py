# Bubu — Bot de La Guardia de Elune
# Archivo principal: solo configuración del bot, carga de cogs y eventos globales

import os
import logging
from pathlib import Path

import discord
from discord.ext import commands
from dotenv import load_dotenv

from db.database import Database

# ======= ENV =======
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")
TOKEN = os.getenv("DISCORD_TOKEN")
if not TOKEN:
    raise RuntimeError("DISCORD_TOKEN no está configurado en .env")

# ======= LOGGING =======
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)5s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("bubu")

# ======= BOT =======
intents = discord.Intents.default()
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)
bot.db: Database = None  # Se inicializa en setup_hook

COGS = [
    "cogs.admin",
    "cogs.personajes",
    "cogs.puntos",
    "cogs.logros",
    "cogs.ranking",
    "cogs.perfil",
    "cogs.piedra",
    "cogs.raid",
    "cogs.cumpleanos",
    "cogs.misiones",
    "cogs.sorteos",
    "cogs.pedidos",
    "cogs.donaciones",
]

# ======= EVENTOS =======

@bot.event
async def setup_hook():
    bot.db = Database()
    await bot.db.connect()
    log.info("Conexión a PostgreSQL establecida")

    for cog in COGS:
        try:
            await bot.load_extension(cog)
            log.info(f"Cog cargado: {cog}")
        except Exception as e:
            log.error(f"Error cargando {cog}: {e}")

    await bot.tree.sync()
    log.info("Slash commands sincronizados")


@bot.event
async def on_ready():
    log.info(f"Bot conectado como {bot.user} (ID: {bot.user.id})")


@bot.event
async def on_member_join(member: discord.Member):
    # TODO: migrar lógica de bienvenida
    pass


# ======= ARRANQUE =======
if __name__ == "__main__":
    bot.run(TOKEN)
