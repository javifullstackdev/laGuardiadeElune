/** Límites del perfil. Hoy todos son free; premium se enchufa aquí más adelante. */
export type EntitlementTier = "free" | "premium";

export type Entitlements = {
  maxDisplayedTitles: number;
  maxBioChars: number;
  maxStoriesPerCharacter: number;
};

const TIERS: Record<EntitlementTier, Entitlements> = {
  free: {
    maxDisplayedTitles: 1,
    maxBioChars: 4000,
    maxStoriesPerCharacter: 3,
  },
  premium: {
    maxDisplayedTitles: 3,
    maxBioChars: 12000,
    maxStoriesPerCharacter: 20,
  },
};

export function getEntitlements(tier: EntitlementTier = "free"): Entitlements {
  return TIERS[tier];
}
