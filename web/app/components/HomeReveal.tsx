"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import EluneLogoReveal from "./EluneLogoReveal";

const STORAGE = "elune-intro-v3";
const DISSOLVE_MS = 1200;
const WATERMARK_MS = 1000;

type Phase = "intro" | "dissolve" | "content" | "ready";

const HomeIntroContext = createContext({ revealed: true });
export function useHomeIntro() {
  return useContext(HomeIntroContext);
}

function shouldSkipIntro() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE) === "1";
}

function IntroLogo({ fading, onComplete }: { fading: boolean; onComplete: () => void }) {
  const [size, setSize] = useState(880);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const fit = () => {
      const vmin = Math.min(window.innerWidth, window.innerHeight);
      setSize(Math.round(Math.min(880, vmin * 0.9)));
    };
    fit();
    setMounted(true);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-20 flex items-center justify-center mix-blend-screen transition-opacity ease-in ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ transitionDuration: `${DISSOLVE_MS}ms` }}
    >
      {mounted ? (
        <EluneLogoReveal size={size} background="transparent" onComplete={onComplete} />
      ) : (
        <div style={{ width: size, height: size }} />
      )}
    </div>
  );
}

export default function HomeReveal({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    sessionStorage.setItem(STORAGE, "1");
    setPhase("ready");
    delete document.documentElement.dataset.eluneIntro;
  }, []);

  const startDissolve = useCallback(() => {
    if (done.current) return;
    setPhase("dissolve");
  }, []);

  useLayoutEffect(() => {
    if (shouldSkipIntro()) {
      done.current = true;
      setPhase("ready");
      return;
    }
    document.documentElement.dataset.eluneIntro = "playing";
    return () => {
      delete document.documentElement.dataset.eluneIntro;
    };
  }, []);

  useEffect(() => {
    if (phase !== "dissolve") return;
    const id = window.setTimeout(() => {
      sessionStorage.setItem(STORAGE, "1");
      delete document.documentElement.dataset.eluneIntro;
      setPhase("content");
    }, DISSOLVE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "content") return;
    const id = window.setTimeout(() => setPhase("ready"), WATERMARK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  const revealed = phase === "content" || phase === "ready";
  const showIntro = phase === "intro" || phase === "dissolve";

  return (
    <HomeIntroContext.Provider value={{ revealed }}>
      <div className="relative" aria-busy={!revealed}>
        {showIntro && <IntroLogo fading={phase === "dissolve"} onComplete={startDissolve} />}
        <div
          className={`relative z-10 w-full max-w-7xl mx-auto transition-all duration-1000 ease-out ${
            revealed ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-8"
          }`}
        >
          {children}
        </div>
        {showIntro && (
          <button
            type="button"
            onClick={finish}
            className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 text-[11px] tracking-[0.22em] uppercase text-white/35 hover:text-white/70 transition-colors"
          >
            Saltar
          </button>
        )}
      </div>
    </HomeIntroContext.Provider>
  );
}
