from discord.ext import commands


class OrdersCog(commands.Cog, name="Orders"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(OrdersCog(bot))

