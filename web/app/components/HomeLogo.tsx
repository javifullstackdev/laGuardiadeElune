"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import EluneLogoReveal, { TOTAL } from "./EluneLogoReveal";

const MAX = 460;
const MAX_MOBILE = 360;
const GUTTER = 16;

export function getWatermarkBox(innerWidth: number) {
  const mobile = innerWidth < 640;
  const size = Math.min(mobile ? MAX_MOBILE : MAX, innerWidth - GUTTER * 2);
  const left = mobile
    ? Math.round((innerWidth - size) / 2)
    : Math.round(108 - 173 * (size / 1040));
  return { mobile, size, left };
}

export function useWatermarkBox() {
  const [box, setBox] = useState(() =>
    typeof window === "undefined"
      ? { mobile: false, size: MAX, left: Math.round(108 - 173 * (MAX / 1040)) }
      : getWatermarkBox(window.innerWidth),
  );

  useEffect(() => {
    const fit = () => setBox(getWatermarkBox(window.innerWidth));
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
  const { mobile, size, left } = useWatermarkBox();
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [covered, setCovered] = useState(false);

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
  }, [mobile]);

  const visible = ready && !covered;

  return (
    <aside
      aria-hidden
      className={
        mobile
          ? "pointer-events-none fixed left-1/2 top-[calc(3rem+22vh)] z-0 -translate-x-1/2 -translate-y-1/2"
          : "pointer-events-none fixed top-[calc(6rem+140px)] sm:top-[calc(7rem+190px)] lg:top-[calc(8rem+220px)] z-0 -translate-y-1/2"
      }
      style={mobile ? undefined : { left }}
    >
      <div
        className={`transition-all duration-700 ease-out ${
          visible ? (mobile ? "opacity-70 translate-y-0" : "opacity-55 translate-y-0") : "opacity-0 translate-y-8"
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
