"use client";

import { useEffect, useState } from "react";
import EluneLogoReveal, { TOTAL } from "./EluneLogoReveal";

const MAX = 460;
const GUTTER = 16;

export default function HomeLogo({ visible = false }: { visible?: boolean }) {
  const [ready, setReady] = useState(false);
  const [size, setSize] = useState(MAX);

  useEffect(() => {
    const fit = () => setSize(Math.min(MAX, window.innerWidth - GUTTER * 2));
    fit();
    window.addEventListener("resize", fit);
    setReady(true);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <aside
      aria-hidden
      className="pointer-events-none fixed top-[calc(6rem+140px)] sm:top-[calc(7rem+190px)] lg:top-[calc(8rem+220px)] z-0 -translate-y-1/2"
      style={{ left: Math.round(108 - 173 * (size / 1040)) }}
    >
      <div
        className={`transition-all duration-1000 ease-out ${
          visible ? "opacity-55 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {ready ? (
          <EluneLogoReveal size={size} background="transparent" time={TOTAL} startOnView={false} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </div>
    </aside>
  );
}
