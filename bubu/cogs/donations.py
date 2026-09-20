from discord.ext import commands


class DonationsCog(commands.Cog, name="Donations"):
    def __init__(self, bot: commands.Bot):
        self.bot = bot


async def setup(bot: commands.Bot):
    await bot.add_cog(DonationsCog(bot))

