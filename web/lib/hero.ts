export type HeroSlide = {
  id?: string;
  kind?: "story" | "character" | "custom";
  src: string;
  kicker: string;
  title: string;
  subtitle: string;
  href?: string;
  cta?: string;
  focus_x?: number;
  focus_y?: number;
};

export function heroObjectPosition(slide: Pick<HeroSlide, "focus_x" | "focus_y">) {
  return `${slide.focus_x ?? 50}% ${slide.focus_y ?? 28}%`;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1920&q=80",
    kicker: "Hermandad",
    title: "La Guardia de Elune",
    subtitle: "Noticias, crónicas y el pulso de la hermandad, siempre a la vista.",
    href: "#tablon",
    cta: "Descubre las novedades",
  },
  {
    src: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80",
    kicker: "Crónicas",
    title: "Historias de Azeroth",
    subtitle: "Raids, míticas y las páginas que escribimos juntos.",
    href: "#tablon",
    cta: "Descubre las novedades",
  },
  {
    src: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=1920&q=80",
    kicker: "Kalimdor",
    title: "Noche bajo Elune",
    subtitle: "Donde el bosque recuerda cada juramento.",
    href: "#tablon",
    cta: "Descubre las novedades",
  },
  {
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    kicker: "Temporada",
    title: "La temporada continúa",
    subtitle: "Puntos, logros y compañerismo en cada reset.",
    href: "#tablon",
    cta: "Descubre las novedades",
  },
  {
    src: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80",
    kicker: "Bienvenida",
    title: "Un hogar en Darnassus",
    subtitle: "Para quienes aún escuchan a Elune.",
    href: "#tablon",
    cta: "Descubre las novedades",
  },
];
