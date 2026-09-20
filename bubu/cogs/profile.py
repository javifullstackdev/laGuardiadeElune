from discord.ext import commands


class ProfileCog(commands.Cog, name="Profile"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(ProfileCog(bot))

