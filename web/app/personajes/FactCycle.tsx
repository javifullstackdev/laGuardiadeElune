"use client";

import { useEffect, useRef, useState } from "react";

export type FactChip = {
  label: string;
  value: string;
  color?: string;
};

const PAGE_SIZE = 3;

function chunkFacts(facts: FactChip[]): FactChip[][] {
  const pages: FactChip[][] = [];
  for (let i = 0; i < facts.length; i += PAGE_SIZE) {
    pages.push(facts.slice(i, i + PAGE_SIZE));
  }
  return pages;
}

function FactCard({ fact }: { fact: FactChip }) {
  return (
    <div className="rounded-lg px-3 py-2.5 border border-white/20 bg-white/15 backdrop-blur-[2px] text-center">
      <p className="text-xs text-white/55 mb-0.5">{fact.label}</p>
      <p
        className="text-sm font-medium leading-snug text-white"
        style={fact.color ? { color: fact.color } : undefined}
      >
        {fact.value}
      </p>
    </div>
  );
}

function FactGrid({ facts }: { facts: FactChip[] }) {
  if (facts.length === 0) return null;
  const lastSpans = facts.length % 2 === 1;
  return (
    <div className="flex w-full justify-center">
      <div className="grid w-[min(28rem,calc(100vw-3rem))] shrink-0 grid-cols-2 gap-2.5">
        {facts.map((fact, i) => (
          <div
            key={fact.label}
            className={`relative transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
              lastSpans && i === facts.length - 1 ? "col-span-2" : ""
            }`}
          >
            <FactCard fact={fact} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FactCycleDeck({ facts }: { facts: FactChip[] }) {
  const pages = chunkFacts(facts);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const offsetRef = useRef(0);
  const pageCountRef = useRef(pages.length);
  const signature = facts.map((fact) => `${fact.label}:${fact.value}`).join("|");

  indexRef.current = index;
  offsetRef.current = offset;
  pageCountRef.current = pages.length;

  useEffect(() => {
    setIndex(0);
    setOffset(0);
  }, [signature]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pages.length < 2) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      x0 = x;
      y0 = y;
      axis = null;
      active = true;
      offsetRef.current = 0;
      setDragging(true);
      setOffset(0);
    };

    const move = (x: number, y: number, event: Event) => {
      if (!active) return;
      const dx = x - x0;
      const dy = y - y0;
      if (!axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axis !== "x") return;
      event.preventDefault();
      const page = indexRef.current;
      const count = pageCountRef.current;
      const atStart = page === 0 && dx > 0;
      const atEnd = page === count - 1 && dx < 0;
      const next = atStart || atEnd ? dx * 0.28 : dx;
      offsetRef.current = next;
      setOffset(next);
    };

    const end = () => {
      if (!active) return;
      active = false;
      setDragging(false);
      const width = root.clientWidth || 1;
      const dx = offsetRef.current;
      if (axis === "x" && Math.abs(dx) > width * 0.16) {
        const dir = dx < 0 ? 1 : -1;
        setIndex((current) =>
          Math.max(0, Math.min(pageCountRef.current - 1, current + dir)),
        );
      }
      offsetRef.current = 0;
      setOffset(0);
      axis = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      start(event.touches[0].clientX, event.touches[0].clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      move(event.touches[0].clientX, event.touches[0].clientY, event);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      start(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      move(event.clientX, event.clientY, event);
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", end);
    root.addEventListener("touchcancel", end);
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", end);
      root.removeEventListener("touchcancel", end);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [pages.length]);

  if (pages.length === 0) return null;
  const pageIndex = Math.min(index, pages.length - 1);

  return (
    <div className="flex w-full justify-center">
      <div className="w-[min(24rem,calc(100vw-2.5rem))] shrink-0">
        <div ref={rootRef} className="overflow-hidden touch-pan-y">
          <div
            className={`flex ${dragging ? "" : "transition-transform duration-300 ease-out motion-reduce:transition-none"}`}
            style={{
              transform: `translateX(calc(${-pageIndex * 100}% + ${offset}px))`,
            }}
          >
            {pages.map((page) => (
              <div
                key={page.map((fact) => fact.label).join("-")}
                className="w-full shrink-0 flex flex-col gap-2"
                aria-hidden={page !== pages[pageIndex]}
              >
                {page.map((fact) => (
                  <FactCard key={fact.label} fact={fact} />
                ))}
              </div>
            ))}
          </div>
        </div>
        {pages.length > 1 && (
          <div className="mt-2.5 flex justify-center gap-1.5">
            {pages.map((group, dot) => (
              <button
                key={group.map((fact) => fact.label).join("-")}
                type="button"
                aria-label={`Datos ${dot + 1} de ${pages.length}`}
                onClick={() => {
                  setOffset(0);
                  setIndex(dot);
                }}
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

export default function FactCycle({
  facts,
  layout = "cycle",
}: {
  facts: FactChip[];
  layout?: "cycle" | "grid";
}) {
  if (layout === "grid") return <FactGrid facts={facts} />;
  return <FactCycleDeck facts={facts} />;
}
