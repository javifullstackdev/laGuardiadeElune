export const CLASS_NAME_ES: Record<string, string> = {
  WARRIOR: "Guerrero", PALADIN: "Paladín", HUNTER: "Cazador",
  ROGUE: "Pícaro", PRIEST: "Sacerdote", DEATH_KNIGHT: "Caballero de la Muerte",
  SHAMAN: "Chamán", MAGE: "Mago", WARLOCK: "Brujo",
  MONK: "Monje", DRUID: "Druida", DEMONHUNTER: "Cazador de Demonios", EVOKER: "Evocador",
};

const CLASS_NAME_ES_F: Record<string, string> = {
  WARRIOR: "Guerrera", PALADIN: "Paladina", HUNTER: "Cazadora",
  ROGUE: "Pícara", PRIEST: "Sacerdotisa", DEATH_KNIGHT: "Caballera de la Muerte",
  SHAMAN: "Chamán", MAGE: "Maga", WARLOCK: "Bruja",
  MONK: "Monja", DRUID: "Druida", DEMONHUNTER: "Cazadora de Demonios", EVOKER: "Evocadora",
};

export const RACE_NAME_ES: Record<string, string> = {
  HUMAN: "Humano", ORC: "Orco", DWARF: "Enano", NIGHT_ELF: "Elfo de la noche",
  UNDEAD: "No-muerto", TAUREN: "Tauren", GNOME: "Gnomo", TROLL: "Troll",
  BLOOD_ELF: "Elfo de sangre", DRAENEI: "Draenei", WORGEN: "Huargen",
  PANDAREN: "Pandaren", NIGHTBORNE: "Nacido de la noche",
  HIGHMOUNTAIN_TAUREN: "Tauren de la Cima", VOID_ELF: "Elfo del vacío",
  LIGHTFORGED: "Forjado por la Luz", DARK_IRON_DWARF: "Enano Hierro Negro",
  KUL_TIRAN: "Kul Tirano", MECHAGNOME: "Mecagnomo", ZANDALARI: "Trol zandalari",
  GOBLIN: "Goblin", VULPERA: "Vulpera", MAGHAR_ORC: "Orco Mag'har", DRACTHYR: "Dracthyr",
};

const RACE_NAME_ES_F: Record<string, string> = {
  HUMAN: "Humana", ORC: "Orca", DWARF: "Enana", NIGHT_ELF: "Elfa de la noche",
  UNDEAD: "No-muerta", TAUREN: "Tauren", GNOME: "Gnoma", TROLL: "Troll",
  BLOOD_ELF: "Elfa de sangre", DRAENEI: "Draenei", WORGEN: "Huargen",
  PANDAREN: "Pandaren", NIGHTBORNE: "Nacida de la noche",
  HIGHMOUNTAIN_TAUREN: "Tauren de la Cima", VOID_ELF: "Elfa del vacío",
  LIGHTFORGED: "Forjada por la Luz", DARK_IRON_DWARF: "Enana Hierro Negro",
  KUL_TIRAN: "Kul Tirana", MECHAGNOME: "Mecagnoma", ZANDALARI: "Trol zandalari",
  GOBLIN: "Goblin", VULPERA: "Vulpera", MAGHAR_ORC: "Orca Mag'har", DRACTHYR: "Dracthyr",
};

export const FACTION_ES: Record<string, string> = {
  ALLIANCE: "Alianza", HORDE: "Horda", NEUTRAL: "Neutral",
};

export const FACTION_COLOR: Record<string, string> = {
  ALLIANCE: "#6699FF", HORDE: "#CC3300", NEUTRAL: "#aaa",
};

export const CLASS_COLOR: Record<string, string> = {
  WARRIOR: "#C79C6E", PALADIN: "#F58CBA", HUNTER: "#ABD473",
  ROGUE: "#FFF569", PRIEST: "#FFFFFF", DEATH_KNIGHT: "#C41F3B",
  SHAMAN: "#0070DE", MAGE: "#69CCF0", WARLOCK: "#9482C9",
  MONK: "#00FF96", DRUID: "#FF7D0A", DEMONHUNTER: "#A330C9", EVOKER: "#33937F",
};

const KEY_ALIASES: Record<string, string> = {
  DEMON_HUNTER: "DEMONHUNTER",
  DEATHKNIGHT: "DEATH_KNIGHT",
};

/** Normaliza valores de API (`paladin`, `night_elf`) y de PostgreSQL (`PALADIN`). */
export function wowKey(value: string | null | undefined): string {
  if (!value) return "";
  const key = value.trim().replace(/[-\s]+/g, "_").toUpperCase();
  return KEY_ALIASES[key] ?? key;
}

export function isFemale(gender: string | null | undefined) {
  const key = wowKey(gender);
  return key === "FEMALE" || key === "F";
}

function lookup(map: Record<string, string>, value: string) {
  const key = wowKey(value);
  return map[key] ?? map[value] ?? value;
}

export function classLabel(value: string | null | undefined, gender?: string | null) {
  if (!value) return null;
  const key = wowKey(value);
  if (isFemale(gender) && CLASS_NAME_ES_F[key]) return CLASS_NAME_ES_F[key];
  return lookup(CLASS_NAME_ES, value);
}

export function raceLabel(value: string | null | undefined, gender?: string | null) {
  if (!value) return null;
  const key = wowKey(value);
  if (isFemale(gender) && RACE_NAME_ES_F[key]) return RACE_NAME_ES_F[key];
  return lookup(RACE_NAME_ES, value);
}

export function factionLabel(value: string | null | undefined) {
  if (!value) return null;
  return lookup(FACTION_ES, value);
}

export function factionColor(value: string | null | undefined) {
  if (!value) return "#aaa";
  const key = wowKey(value);
  return FACTION_COLOR[key] ?? "#aaa";
}

export function genderLabel(value: string | null | undefined) {
  if (!value) return null;
  return isFemale(value) ? "Femenino" : wowKey(value) === "MALE" ? "Masculino" : null;
}

export function classColor(value: string | null | undefined) {
  if (!value) return "#888888";
  const key = wowKey(value);
  return CLASS_COLOR[key] ?? "#888888";
}

const REALM_NAME_ES: Record<string, string> = {
  zuljin: "Zul'jin",
  "zul-jin": "Zul'jin",
};

/** `dun-modr` → `Dun Modr`. */
export function realmLabel(slug: string | null | undefined) {
  if (!slug) return null;
  const key = slug.trim().toLowerCase();
  if (REALM_NAME_ES[key]) return REALM_NAME_ES[key];
  return key
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
