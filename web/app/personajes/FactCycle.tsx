"use client";

import { useEffect, useState } from "react";

export type FactChip = {
  label: string;
  value: string;
  color?: string;
};

const HOLD_MS = 2800;
const LEAVE_MS = 520;

export default function FactCycle({ facts }: { facts: FactChip[] }) {
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
    if (facts.length === 0) return;
    if (reduced || facts.length < 2) {
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
      setIndex((current) => (current + 1) % facts.length);
      setPhase("enter");
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, index, paused, reduced, facts.length]);

  if (facts.length === 0) return null;
  const fact = facts[Math.min(index, facts.length - 1)];
  const motion =
    phase === "show" ? "is-in" : phase === "leave" ? "is-out" : "";

  function show(next: number) {
    setIndex(next);
    setPhase("enter");
  }

  return (
    <div
      className="mx-auto w-full max-w-xs"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        key={`${fact.label}-${index}`}
        className={`fact-cycle-card rounded-lg px-3 py-2 border border-white/20 bg-white/15 backdrop-blur-[2px] ${motion}`}
        aria-live="polite"
      >
        <p className="text-xs text-white/55 mb-0.5">{fact.label}</p>
        <p
          className="text-sm font-medium truncate text-white"
          style={fact.color ? { color: fact.color } : undefined}
        >
          {fact.value}
        </p>
      </div>
      {facts.length > 1 && (
        <div className="mt-2 flex gap-1.5">
          {facts.map((item, dot) => (
            <button
              key={item.label}
              type="button"
              aria-label={item.label}
              onClick={() => show(dot)}
              className={`h-1.5 rounded-full transition-all ${
                dot === index ? "w-5 bg-[#e4ddd0]" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
