import enum

class CharacterClass(enum.Enum):
    WARRIOR = "warrior"
    MAGE = "mage"
    ROGUE = "rogue"
    PRIEST = "priest"
    PALADIN = "paladin"
    HUNTER = "hunter"
    SHAMAN = "shaman"
    DRUID = "druid"
    WARLOCK = "warlock"
    MONK = "monk"
    EVOKER = "evoker"
    DEMONHUNTER = "demonhunter"
    DEATH_KNIGHT = "death_knight"

class CharacterFunction(enum.Enum):
    DPS_MELEE = "dps_melee"
    DPS_RANGED = "dps_ranged"
    HEALER = "healer"
    TANK = "tank"

class CharacterProfession(enum.Enum):
    BLACKSMITHING = "blacksmithing"
    LEATHERWORKING = "leatherworking"
    TAILORING = "tailoring"
    ENGINEERING = "engineering"
    INSCRIPTION = "inscription"
    HERBALISM = "herbalism"
    MINING = "mining"
    SKINNING = "skinning"
    FISHING = "fishing"
    ALCHEMY = "alchemy"
    JEWELCRAFTING = "jewelcrafting"
    ENCHANTING = "enchanting"
    COOKING = "cooking"

class EventCategory(enum.Enum):
    MYTHIC_PLUS = "mythic_plus"
    RAID = "raid"
    GUILD_EVENT = "guild_event"
    TIMEWALKING = "timewalking"
    HOUSING = "housing"
    LORE_POST = "lore_post"
    ACHIEVEMENT = "achievement"
    PVP = "pvp"
    FARMING = "farming"
    PROFESSION = "profession"