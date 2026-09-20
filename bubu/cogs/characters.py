"""
Cog: Characters
Management of WoW characters linked to Discord users.
"""

import discord
from discord import app_commands
from discord.ext import commands


class CharactersCog(commands.Cog, name="Characters"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="registrar_personaje", description="(Admin) Vincula un personaje WoW a un usuario de Discord")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        miembro="Usuario de Discord al que vincular el personaje",
        nombre="Nombre exacto del personaje",
        realm="Realm del personaje (ej: dun-modr)",
        clase="Clase del personaje",
        funcion="Rol principal: TANK, HEALER, MELEE_DPS, RANGED_DPS",
        principal="¿Es su personaje principal?",
    )
    async def register_character(
        self,
        interaction: discord.Interaction,
        miembro: discord.Member,
        nombre: str,
        realm: str = "dun-modr",
        clase: str | None = None,
        funcion: str | None = None,
        principal: bool = False,
    ):
        await interaction.response.defer(ephemeral=True)
        try:
            await self.bot.db.upsert_user(str(miembro.id), miembro.display_name)
            await self.bot.db.register_character(
                discord_id=str(miembro.id),
                name=nombre,
                realm=realm,
                wow_class=clase.upper() if clase else None,
                role_function=funcion.upper() if funcion else None,
                is_main=principal,
            )
            await interaction.followup.send(
                f"✅ **{nombre}-{realm}** vinculado a {miembro.mention}.", ephemeral=True
            )
        except ValueError as e:
            await interaction.followup.send(f"❌ {e}", ephemeral=True)

    @app_commands.command(name="asignar_main", description="Marca un personaje como tu main")
    @app_commands.describe(nombre="Nombre del personaje", realm="Realm del personaje")
    async def set_main(self, interaction: discord.Interaction, nombre: str, realm: str = "dun-modr"):
        await interaction.response.defer(ephemeral=True)
        ok = await self.bot.db.set_main_character(str(interaction.user.id), nombre, realm)
        if ok:
            await interaction.followup.send(
                f"✅ **{nombre}-{realm}** es ahora tu personaje principal.", ephemeral=True
            )
        else:
            await interaction.followup.send(
                f"❌ No se encontró ese personaje vinculado a tu cuenta.", ephemeral=True
            )

    @app_commands.command(name="roster", description="Muestra el roster de personajes de la hermandad")
    async def roster(self, interaction: discord.Interaction):
        await interaction.response.defer()
        characters = await self.bot.db.get_guild_roster()
        if not characters:
            await interaction.followup.send("No hay personajes registrados aún.")
            return
        lines = []
        for c in characters:
            main_tag = " ⭐" if c["is_main"] else ""
            wow_class = c["wow_class"] or "?"
            role = c["role_function"] or "?"
            lines.append(
                f"**{c['name']}**-{c['realm']} ({wow_class} / {role}){main_tag} — {c['username']}"
            )
        embed = discord.Embed(
            title="🛡️ La Guardia de Elune — Roster",
            description="\n".join(lines),
            color=0x7289DA,
        )
        await interaction.followup.send(embed=embed)


async def setup(bot: commands.Bot):
    await bot.add_cog(CharactersCog(bot))
