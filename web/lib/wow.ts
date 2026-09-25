export const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador",
  ROGUE: "Pícaro", PRIEST: "Sacerdote", DEATH_KNIGHT: "Caballero de la Muerte",
  SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo",
  MONK: "Monje", DRUID: "Druida", DEMONHUNTER: "Cazador de Demonios", EVOKER: "Evocador",
};

export const RACE_NAME_ES: Record<string, string> = {
  HUMAN: "Humano", ORC: "Orco", DWARF: "Enano", NIGHT_ELF: "Elfo de la noche",
  UNDEAD: "No-muerto", TAUREN: "Tauren", GNOME: "Gnomo", TROLL: "Troll",
  BLOOD_ELF: "Elfo de sangre", DRAENEI: "Draenei", WORGEN: "Huargen",
  PANDAREN: "Pandaren", NIGHTBORNE: "Nacido de la noche",
  HIGHMOUNTAIN_TAUREN: "Tauren de la Cima", VOID_ELF: "Elfo del vacío",
  LIGHTFORGED: "Forjado a la Luz", DARK_IRON_DWARF: "Enano Hierro Negro",
  KUL_TIRAN: "Kul Tirano", MECHAGNOME: "Mecagnomo", ZANDALARI: "Trol zandalari",
  GOBLIN: "Goblin", VULPERA: "Vulpera", MAGHAR_ORC: "Orco Mag'har", DRACTHYR: "Dracthyr",
};

export const FACTION_ES: Record<string, string> = {
  ALLIANCE: "Alianza", HORDE: "Horda", NEUTRAL: "Neutral",
};

export const CLASS_COLOR: Record<string, string> = {
  WARRIOR: "#C79C6E", PALADIN: "#F58CBA", HUNTER: "#ABD473",
  ROGUE: "#FFF569", PRIEST: "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN: "#0070DE", MAGE: "#69CCF0", WARLOCK: "#9482C9",
  MONK: "#00FF96", DRUID: "#FF7D0A", DEMONHUNTER: "#A330C9", EVOKER: "#33937F",
};

function lookup(map: Record<string, string>, value: string) {
  return map[value] ?? map[value.toUpperCase()] ?? map[value.toLowerCase()] ?? value;
}

export function classLabel(value: string | null | undefined) {
  if (!value) return null;
  return lookup(CLASS_NAME_ES, value);
}

export function raceLabel(value: string | null | undefined) {
  if (!value) return null;
  return lookup(RACE_NAME_ES, value);
}

export function factionLabel(value: string | null | undefined) {
  if (!value) return null;
  return lookup(FACTION_ES, value);
}

export function classColor(value: string | null | undefined) {
  if (!value) return "#888888";
  return CLASS_COLOR[value] ?? CLASS_COLOR[value.toUpperCase()] ?? CLASS_COLOR[value.toLowerCase()] ?? "#888888";
}
