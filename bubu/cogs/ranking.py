"""
Cog: Ranking
Leaderboard command showing top guild members with their main characters.
"""

import discord
from discord import app_commands
from discord.ext import commands

# Medallas para los tres primeros puestos
MEDALS = {1: "🥇", 2: "🥈", 3: "🥉"}

# Icono por clase de WoW (emoji aproximado)
CLASS_ICON = {
    "WARRIOR":     "⚔️",
    "PALADIN":     "🛡️",
    "HUNTER":      "🏹",
    "ROGUE":       "🗡️",
    "PRIEST":      "✨",
    "DEATH_KNIGHT":"💀",
    "SHAMAN":      "⚡",
    "MAGE":        "🔮",
    "WARLOCK":     "🔥",
    "MONK":        "🥋",
    "DRUID":       "🌿",
    "DEMONHUNTER": "👁️",
    "EVOKER":      "🐉",
}


class RankingCog(commands.Cog, name="Ranking"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ranking", description="Muestra el ranking de puntos de la hermandad")
    @app_commands.describe(limite="Número de miembros a mostrar (máx. 20, por defecto 10)")
    async def ranking(self, interaction: discord.Interaction, limite: int = 10):
        if limite < 1 or limite > 20:
            await interaction.response.send_message(
                "❌ El límite debe estar entre 1 y 20.", ephemeral=True
            )
            return

        await interaction.response.defer()

        top = await self.bot.db.get_ranking(limit=limite)

        if not top:
            await interaction.followup.send("No hay miembros en el ranking todavía.")
            return

        embed = discord.Embed(
            title="🏆 Ranking — La Guardia de Elune",
            color=0xFFD700,
        )

        lines = []
        for pos, row in enumerate(top, start=1):
            medal = MEDALS.get(pos, f"`{pos:>2}.`")

            # Personaje main (si tiene)
            if row["char_name"]:
                wow_class = row["wow_class"] or "WARRIOR"
                class_icon = CLASS_ICON.get(wow_class, "⚔️")
                char_info = f"{class_icon} *{row['char_name']}-{row['char_realm']}*"
            else:
                char_info = "*sin personaje*"

            lines.append(
                f"{medal} **{row['username']}** — {row['total_points']} pts\n"
                f"　　{char_info}"
            )

        embed.description = "\n".join(lines)
        embed.set_footer(text=f"Top {len(top)} miembros por puntos totales")

        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(RankingCog(bot))
