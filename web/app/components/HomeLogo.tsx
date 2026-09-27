"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import EluneLogoReveal, { TOTAL } from "./EluneLogoReveal";

const MAX = 460;
const GUTTER = 16;
const DEFAULT_BOX = {
  mobile: false,
  size: MAX,
  left: Math.round(108 - 173 * (MAX / 1040)),
};

export function getWatermarkBox(innerWidth: number, innerHeight = 800) {
  const mobile = innerWidth < 640;
  const size = mobile
    ? Math.round(Math.min(innerWidth * 1.06, innerHeight * 0.6))
    : Math.min(MAX, innerWidth - GUTTER * 2);
  const left = mobile
    ? Math.round((innerWidth - size) / 2)
    : Math.round(108 - 173 * (size / 1040));
  return { mobile, size, left };
}

export function useWatermarkBox() {
  const [box, setBox] = useState(DEFAULT_BOX);

  useEffect(() => {
    const fit = () => setBox(getWatermarkBox(window.innerWidth, window.innerHeight));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return box;
}

function introPlaying() {
  return document.documentElement.dataset.eluneIntro === "playing";
}

export default function HomeLogo() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onHistorias = pathname === "/lore" || pathname.startsWith("/lore/");
  const { mobile, size, left } = useWatermarkBox();
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
    if (!mobile) {
      setCovered(false);
      return;
    }
    if (onHistorias) {
      setCovered(false);
      return;
    }
    if (!onHome) {
      setCovered(true);
      return;
    }
    const tick = () => {
      const banner = document.getElementById("home-carousel");
      if (!banner) {
        setCovered(false);
        return;
      }
      setCovered(banner.getBoundingClientRect().top < window.innerHeight * 0.48);
    };
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, [mobile, onHome, onHistorias]);

  const visible = ready && !covered;

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed z-0 left-1/2 -translate-x-1/2 top-[calc((3rem+50vh)/2)] -translate-y-1/2 sm:left-[var(--wm-left)] sm:translate-x-0 sm:top-[calc(6rem+140px)] lg:top-[calc(8rem+220px)]"
      style={{ ["--wm-left" as string]: `${left}px` }}
    >
      <div
        className={`transition-all duration-700 ease-out ${
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
