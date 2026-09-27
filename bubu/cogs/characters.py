"""
Cog: Characters
Management of WoW characters linked to Discord users.
"""

import discord
from discord import app_commands
from discord.ext import commands

from utils.blizzard import lookup_wow_character

CLASS_CHOICES = [
    app_commands.Choice(name=label, value=value)
    for label, value in [
        ("Guerrero", "WARRIOR"),
        ("Paladín", "PALADIN"),
        ("Cazador", "HUNTER"),
        ("Pícaro", "ROGUE"),
        ("Sacerdote", "PRIEST"),
        ("Caballero de la Muerte", "DEATH_KNIGHT"),
        ("Chamán", "SHAMAN"),
        ("Mago", "MAGE"),
        ("Brujo", "WARLOCK"),
        ("Monje", "MONK"),
        ("Druida", "DRUID"),
        ("Cazador de Demonios", "DEMONHUNTER"),
        ("Evocador", "EVOKER"),
    ]
]

ROLE_ALIASES = {
    "MELEE_DPS": "DPS_MELEE",
    "RANGED_DPS": "DPS_RANGED",
    "DPS": "DPS_MELEE",
}


class CharactersCog(commands.Cog, name="Characters"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="registrar_personaje", description="(Admin) Vincula un personaje WoW a un usuario de Discord")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(
        miembro="Usuario de Discord al que vincular el personaje",
        nombre="Nombre exacto del personaje",
        realm="Realm del personaje (ej: dun-modr)",
        juego="Retail o Warcraft Forever",
        apellido="Obligatorio si el juego es Forever",
        clase="Clase del personaje",
        funcion="Rol: TANK, HEALER, DPS_MELEE, DPS_RANGED",
        principal="¿Es su personaje principal?",
    )
    @app_commands.choices(
        juego=[
            app_commands.Choice(name="Retail", value="retail"),
            app_commands.Choice(name="Warcraft Forever", value="forever"),
        ],
        clase=CLASS_CHOICES,
        funcion=[
            app_commands.Choice(name="Tank", value="TANK"),
            app_commands.Choice(name="Healer", value="HEALER"),
            app_commands.Choice(name="DPS melé", value="DPS_MELEE"),
            app_commands.Choice(name="DPS a distancia", value="DPS_RANGED"),
        ],
    )
    async def register_character(
        self,
        interaction: discord.Interaction,
        miembro: discord.Member,
        nombre: str,
        realm: str = "dun-modr",
        juego: str = "retail",
        apellido: str | None = None,
        clase: str | None = None,
        funcion: str | None = None,
        principal: bool = False,
    ):
        await interaction.response.defer(ephemeral=True)
        try:
            role = ROLE_ALIASES.get((funcion or "").upper(), funcion.upper() if funcion else None)
            wow_class = clase.upper() if clase else None
            bnet_id = None
            verified = False
            stored_name = nombre
            stored_realm = realm

            if juego != "forever":
                found = await lookup_wow_character(nombre, realm)
                stored_name = found["name"]
                stored_realm = found["realm"]
                bnet_id = found["blizzard_character_id"]
                wow_class = wow_class or found["wow_class"]
                verified = True

            await self.bot.db.upsert_user(str(miembro.id), miembro.display_name)
            await self.bot.db.register_character(
                discord_id=str(miembro.id),
                name=stored_name,
                realm=stored_realm,
                wow_class=wow_class,
                role_function=role,
                is_main=principal,
                game=juego,
                surname=apellido.strip() if apellido else None,
                blizzard_character_id=bnet_id,
                is_verified=verified,
            )
            linea = "Forever" if juego == "forever" else "Retail"
            extra = f" {apellido}" if apellido else ""
            await interaction.followup.send(
                f"**{stored_name}{extra}-{stored_realm}** ({linea}) vinculado a {miembro.mention}.",
                ephemeral=True,
            )
        except Exception as e:
            await interaction.followup.send(f"No se pudo registrar: {e}", ephemeral=True)

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
