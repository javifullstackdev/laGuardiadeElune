"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import EluneLogoReveal, { TOTAL } from "./EluneLogoReveal";
import { useLogoChrome } from "./logo-chrome";

const MAX = 460;
const GUTTER = 16;
/** El sello de fondo solo existe en escritorio ancho. El iPad Pro 13 (1032 / 1376) se queda con el wordmark de la navbar. */
const DESKTOP_MIN = 1440;
const DEFAULT_BOX = {
  mobile: false,
  size: MAX,
  left: Math.round(108 - 173 * (MAX / 1040)),
};

export function getWatermarkBox(innerWidth: number, innerHeight = 800) {
  const mobile = innerWidth < DESKTOP_MIN;
  const size = mobile
    ? Math.round(Math.min(innerWidth * 0.72, innerHeight * 0.32, 280))
    : Math.min(MAX, innerWidth - GUTTER * 2);
  const left = mobile
    ? Math.round((innerWidth - size) / 2)
    : Math.round(108 - 173 * (size / 1040));
  return { mobile, size, left };
}

export function useWatermarkBox() {
  const [box, setBox] = useState(DEFAULT_BOX);

  useEffect(() => {
    const fit = () => {
      const next = getWatermarkBox(window.innerWidth, window.innerHeight);
      setBox(next);
      // HomeHero móvil alinea el padding-top del carrusel con este tamaño
      document.documentElement.style.setProperty(
        "--wm-mobile-size",
        next.mobile ? `${next.size}px` : "0px",
      );
    };
    fit();
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      document.documentElement.style.removeProperty("--wm-mobile-size");
    };
  }, []);

  return box;
}

function introPlaying() {
  return document.documentElement.dataset.eluneIntro === "playing";
}

function rectsOverlap(a: DOMRect, b: DOMRect, pad = 0) {
  return (
    a.left < b.right + pad &&
    a.right + pad > b.left &&
    a.top < b.bottom + pad &&
    a.bottom + pad > b.top
  );
}

/**
 * Elementos reales de contenido (no el <main> a pantalla completa, que
 * siempre solaparía el logo y dejaría el wordmark de la nav siempre visible).
 */
function contentCollisionTargets(onHome: boolean): HTMLElement[] {
  const list: HTMLElement[] = [];
  const push = (el: Element | null) => {
    if (el instanceof HTMLElement && !list.includes(el)) list.push(el);
  };

  // Home: solo el carrusel decide el solape
  if (onHome) {
    push(document.getElementById("home-carousel"));
    return list;
  }

  push(document.getElementById("home-carousel"));

  document
    .querySelectorAll(
      [
        "#site-main .max-w-7xl",
        "#site-main .max-w-5xl",
        "#site-main .max-w-4xl",
        "#site-main .max-w-3xl",
        "#site-main .max-w-2xl",
        "#site-main article",
        "#site-main main > .flex",
        "#site-main main > section",
        "#site-main main > div",
      ].join(","),
    )
    .forEach(push);

  return list;
}

export default function HomeLogo() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  // Perfil: el layout ya deja hueco al watermark (--fact-pad); la columna
  // a pantalla completa no debe contarse como solape.
  const onProfile = pathname === "/profile" || pathname.startsWith("/profile/");
  const { mobile, size, left } = useWatermarkBox();
  const { setWatermarkHidden } = useLogoChrome();
  const asideRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [covered, setCovered] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const apply = () => setReady(!introPlaying());
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-elune-intro"],
    });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const tick = () => {
      const logoEl = asideRef.current;

      if (mobile) {
        setCovered(true);
        return;
      }

      if (onProfile) {
        setCovered(false);
        return;
      }

      // Desktop: ocultar si cualquier contenido principal toca el logo
      if (!logoEl) {
        setCovered(false);
        return;
      }
      const logoRect = logoEl.getBoundingClientRect();
      if (logoRect.width < 4 || logoRect.height < 4) {
        setCovered(false);
        return;
      }

      const targets = contentCollisionTargets(onHome);
      if (targets.length === 0) {
        setCovered(false);
        return;
      }

      let hit = false;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        // Ignorar contenedores que ocupan casi todo el viewport (falsos positivos)
        if (r.width > window.innerWidth * 0.92 && r.height > window.innerHeight * 0.85) {
          continue;
        }
        if (rectsOverlap(logoRect, r, 8)) {
          hit = true;
          break;
        }
      }
      setCovered(hit);
    };

    tick();
    const raf = requestAnimationFrame(tick);
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);

    const root = document.getElementById("site-main");
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(tick) : null;
    if (ro && root) ro.observe(root);
    const carousel = document.getElementById("home-carousel");
    if (ro && carousel) ro.observe(carousel);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      ro?.disconnect();
    };
  }, [mobile, onHome, onProfile, left, size, ready, mounted, pathname]);

  useEffect(() => {
    // En móvil y tablet el wordmark de la navbar es el único logo.
    setWatermarkHidden(mobile || (ready && covered));
  }, [mobile, covered, ready, setWatermarkHidden]);

  const visible = ready && !covered;

  return (
    <aside
      ref={asideRef}
      aria-hidden
      className="pointer-events-none fixed z-0 hidden min-[1440px]:block left-[var(--wm-left)] top-[calc(8rem+220px)] -translate-y-1/2"
      style={{ ["--wm-left" as string]: `${left}px` }}
    >
      <div
        className={`transition-all duration-500 ease-out ${
          visible ? (mobile ? "opacity-70 translate-y-0" : "opacity-55 translate-y-0") : "opacity-0 -translate-y-8"
        }`}
      >
        {mounted ? (
          <EluneLogoReveal size={size} background="transparent" time={TOTAL} startOnView={false} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </div>
    </aside>
  );
}
