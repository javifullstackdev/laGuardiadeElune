/** Public site origin (SEO, sitemap, Open Graph). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  process.env.SITE_URL?.trim() ||
  "https://www.laguardiadeelune.com"
).replace(/\/$/, "");

export const SITE_NAME = "La Guardia de Elune";

export const SITE_DESCRIPTION =
  "Web oficial de la hermandad La Guardia de Elune: tablón, fichas de personajes e historias.";

export const CONTACT_EMAIL_PLACEHOLDER = "info@laguardiadeelune.com";
