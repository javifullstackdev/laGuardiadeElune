from discord.ext import commands


class BirthdaysCog(commands.Cog, name="Birthdays"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(BirthdaysCog(bot))

