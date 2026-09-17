"""
Cog: Admin
Comandos de administración y utilidades básicas.
"""

import discord
from discord import app_commands
from discord.ext import commands


class AdminCog(commands.Cog, name="Admin"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ping", description="Comprueba que el bot está activo")
    async def ping(self, interaction: discord.Interaction):
        latency = round(self.bot.latency * 1000)
        await interaction.response.send_message(
            f"🏓 Pong! Latencia: {latency}ms", ephemeral=True
        )

    @app_commands.command(name="sync", description="(Admin) Sincroniza los slash commands")
    @app_commands.default_permissions(administrator=True)
    async def sync_aqui(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        synced = await self.bot.tree.sync(guild=interaction.guild)
        await interaction.followup.send(
            f"✅ {len(synced)} comandos sincronizados en este servidor.", ephemeral=True
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(AdminCog(bot))
