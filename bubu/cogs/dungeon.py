from discord.ext import commands


class DungeonCog(commands.Cog, name="Dungeon"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(DungeonCog(bot))

