from discord.ext import commands


class AchievementsCog(commands.Cog, name="Achievements"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(AchievementsCog(bot))

