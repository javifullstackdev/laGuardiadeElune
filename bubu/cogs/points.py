"""
Cog: Points
Commands to award, remove and check guild points.
"""

import discord
from discord import app_commands
from discord.ext import commands

# Categorías disponibles para clasificar por qué se dan puntos.
# Deben coincidir exactamente con el enum EventCategory de PostgreSQL.
CATEGORIAS = [
    app_commands.Choice(name="Mythic+",        value="MYTHIC_PLUS"),
    app_commands.Choice(name="Raid",           value="RAID"),
    app_commands.Choice(name="Evento de hermandad", value="GUILD_EVENT"),
    app_commands.Choice(name="Timewalking",    value="TIMEWALKING"),
    app_commands.Choice(name="Housing",        value="HOUSING"),
    app_commands.Choice(name="Post de lore",   value="LORE_POST"),
    app_commands.Choice(name="Logro",          value="ACHIEVEMENT"),
    app_commands.Choice(name="PvP",            value="PVP"),
    app_commands.Choice(name="Farmeo",         value="FARMING"),
    app_commands.Choice(name="Profesión",      value="PROFESSION"),
]


class PointsCog(commands.Cog, name="Points"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    # ── /dar_puntos ────────────────────────────────────────────────────────

    @app_commands.command(name="dar_puntos", description="(Admin) Otorga puntos a un miembro")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        miembro="Miembro al que dar puntos",
        cantidad="Cantidad de puntos (número positivo)",
        motivo="Razón por la que se otorgan",
        categoria="Tipo de actividad",
    )
    @app_commands.choices(categoria=CATEGORIAS)
    async def dar_puntos(
        self,
        interaction: discord.Interaction,
        miembro: discord.Member,
        cantidad: int,
        motivo: str,
        categoria: app_commands.Choice[str],
    ):
        if cantidad <= 0:
            await interaction.response.send_message(
                "❌ La cantidad debe ser mayor que 0.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True)

        try:
            # Garantizar que el usuario existe en la BD
            await self.bot.db.upsert_user(str(miembro.id), miembro.display_name)

            new_total = await self.bot.db.add_points(
                discord_id=str(miembro.id),
                amount=cantidad,
                reason=motivo,
                event_category=categoria.value,
            )

            await interaction.followup.send(
                f"✅ **+{cantidad} puntos** otorgados a {miembro.mention}\n"
                f"📝 Motivo: *{motivo}* ({categoria.name})\n"
                f"🏆 Total: **{new_total} pts**",
                ephemeral=True,
            )

            # Notificación pública en el canal
            await interaction.channel.send(
                f"🎖️ {miembro.mention} ha recibido **+{cantidad} puntos** "
                f"por *{motivo}*! (**{new_total} pts** en total)"
            )

        except ValueError as e:
            await interaction.followup.send(f"❌ {e}", ephemeral=True)

    # ── /quitar_puntos ─────────────────────────────────────────────────────

    @app_commands.command(name="quitar_puntos", description="(Admin) Quita puntos a un miembro")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        miembro="Miembro al que quitar puntos",
        cantidad="Cantidad de puntos a quitar",
        motivo="Razón",
    )
    async def quitar_puntos(
        self,
        interaction: discord.Interaction,
        miembro: discord.Member,
        cantidad: int,
        motivo: str,
    ):
        if cantidad <= 0:
            await interaction.response.send_message(
                "❌ La cantidad debe ser mayor que 0.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True)

        try:
            await self.bot.db.upsert_user(str(miembro.id), miembro.display_name)

            # Guardamos la resta como un amount negativo
            new_total = await self.bot.db.add_points(
                discord_id=str(miembro.id),
                amount=-cantidad,
                reason=f"[RESTA] {motivo}",
                event_category="GUILD_EVENT",
            )

            await interaction.followup.send(
                f"✅ **-{cantidad} puntos** quitados a {miembro.mention}\n"
                f"📝 Motivo: *{motivo}*\n"
                f"🏆 Total: **{new_total} pts**",
                ephemeral=True,
            )

        except ValueError as e:
            await interaction.followup.send(f"❌ {e}", ephemeral=True)

    # ── /mis_puntos ────────────────────────────────────────────────────────

    @app_commands.command(name="mis_puntos", description="Consulta tus puntos y actividad reciente")
    async def mis_puntos(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)

        # Crear usuario si es la primera vez que usa el bot
        user = await self.bot.db.upsert_user(
            str(interaction.user.id), interaction.user.display_name
        )
        transactions = await self.bot.db.get_user_transactions(
            str(interaction.user.id), limit=5
        )

        # Buscar personaje main si lo tiene
        characters = await self.bot.db.get_user_characters(str(interaction.user.id))
        main_char = next((c for c in characters if c["is_main"]), None)

        embed = discord.Embed(
            title=f"🏆 Puntos de {interaction.user.display_name}",
            color=0xFFD700,
        )

        # Personaje main (si tiene)
        if main_char:
            verified = " 🛡️" if main_char["is_verified"] else ""
            wow_class = main_char["wow_class"] or "?"
            embed.add_field(
                name="⚔️ Personaje principal",
                value=f"**{main_char['name']}**-{main_char['realm']} ({wow_class}){verified}",
                inline=False,
            )

        # Total de puntos
        embed.add_field(
            name="🌟 Puntos totales",
            value=f"**{user['total_points']}**",
            inline=True,
        )

        # Últimas transacciones
        if transactions:
            historial = "\n".join(
                f"{'🟢' if t['amount'] > 0 else '🔴'} "
                f"{'+ ' if t['amount'] > 0 else ''}{t['amount']} — {t['reason']}"
                for t in transactions
            )
            embed.add_field(
                name="📋 Actividad reciente",
                value=historial,
                inline=False,
            )
        else:
            embed.add_field(
                name="📋 Actividad reciente",
                value="Sin actividad registrada aún.",
                inline=False,
            )

        await interaction.followup.send(embed=embed, ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(PointsCog(bot))
