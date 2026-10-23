"use client";

import { useEffect, useState } from "react";

export type FactChip = {
  label: string;
  value: string;
  color?: string;
};

const PAGE_SIZE = 3;
const HOLD_MS = 2800;
const LEAVE_MS = 520;

function chunkFacts(facts: FactChip[]): FactChip[][] {
  const pages: FactChip[][] = [];
  for (let i = 0; i < facts.length; i += PAGE_SIZE) {
    pages.push(facts.slice(i, i + PAGE_SIZE));
  }
  return pages;
}

export default function FactCycle({ facts }: { facts: FactChip[] }) {
  const pages = chunkFacts(facts);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"enter" | "show" | "leave">("enter");
  const [reduced, setReduced] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const signature = facts.map((fact) => `${fact.label}:${fact.value}`).join("|");

  useEffect(() => {
    setIndex(0);
    setPhase("enter");
  }, [signature]);

  useEffect(() => {
    if (pages.length === 0) return;
    if (reduced || pages.length < 2) {
      setPhase("show");
      return;
    }
    if (paused && phase === "show") return;

    if (phase === "enter") {
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setPhase("show"));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    if (phase === "show") {
      const timer = window.setTimeout(() => setPhase("leave"), HOLD_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % pages.length);
      setPhase("enter");
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, index, paused, reduced, pages.length]);

  if (pages.length === 0) return null;
  const pageIndex = Math.min(index, pages.length - 1);
  const page = pages[pageIndex];
  const motion =
    phase === "show" ? "is-in" : phase === "leave" ? "is-out" : "";

  function show(next: number) {
    setIndex(next);
    setPhase("enter");
  }

  return (
    <div className="flex w-full justify-center">
      <div
        className="w-[min(24rem,calc(100vw-2.5rem))] shrink-0"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          key={pageIndex}
          className={`fact-cycle-card flex flex-col gap-2 ${motion}`}
          aria-live="polite"
        >
          {page.map((fact) => (
            <div
              key={fact.label}
              className="rounded-lg px-4 py-2.5 border border-white/20 bg-white/15 backdrop-blur-[2px] text-center"
            >
              <p className="text-xs text-white/55 mb-0.5">{fact.label}</p>
              <p
                className="text-sm font-medium text-white"
                style={fact.color ? { color: fact.color } : undefined}
              >
                {fact.value}
              </p>
            </div>
          ))}
        </div>
        {pages.length > 1 && (
          <div className="mt-2.5 flex justify-center gap-1.5">
            {pages.map((group, dot) => (
              <button
                key={group.map((fact) => fact.label).join("-")}
                type="button"
                aria-label={`Datos ${dot + 1} de ${pages.length}`}
                onClick={() => show(dot)}
                className={`h-1.5 rounded-full transition-all ${
                  dot === pageIndex ? "w-5 bg-[#e4ddd0]" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
