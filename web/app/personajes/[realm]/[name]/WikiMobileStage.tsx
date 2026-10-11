"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Breadcrumb, { type Crumb } from "@/app/components/Breadcrumb";

type Fact = {
  label: string;
  value: string;
  color?: string;
};

const FACTS_PER_PAGE = 3;

function chunkFacts(facts: Fact[], size: number): Fact[][] {
  if (facts.length === 0) return [[]];
  const pages: Fact[][] = [];
  for (let i = 0; i < facts.length; i += size) {
    pages.push(facts.slice(i, i + size));
  }
  return pages;
}

export default function WikiMobileStage({
  coverUrl,
  prefixTitle,
  displayName,
  title,
  facts,
  crumbs,
  onBack,
  children,
}: {
  coverUrl: string | null;
  prefixTitle?: string | null;
  displayName: string;
  title?: string | null;
  facts: Fact[];
  crumbs: Crumb[];
  onBack?: () => void;
  children?: ReactNode;
}) {
  const hasLore = Boolean(children);
  const factPages = useMemo(() => chunkFacts(facts, FACTS_PER_PAGE), [facts]);
  const factPageCount = factPages.length;

  const [factPage, setFactPage] = useState(0);
  const [factOffset, setFactOffset] = useState(0);
  const [factDragging, setFactDragging] = useState(false);
  const [loreOpen, setLoreOpen] = useState(false);

  const factDeckRef = useRef<HTMLDivElement>(null);
  const factPageRef = useRef(0);
  const factOffsetRef = useRef(0);
  const loreBodyRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLElement>(null);

  factPageRef.current = factPage;

  // Horizontal swipe between fact pages (3 + 3)
  useEffect(() => {
    const root = factDeckRef.current;
    if (!root || factPageCount < 2 || loreOpen) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      x0 = x;
      y0 = y;
      axis = null;
      active = true;
      factOffsetRef.current = 0;
      setFactDragging(true);
      setFactOffset(0);
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
      const atStart = factPageRef.current === 0 && dx > 0;
      const atEnd = factPageRef.current === factPageCount - 1 && dx < 0;
      const next = atStart || atEnd ? dx * 0.28 : dx;
      factOffsetRef.current = next;
      setFactOffset(next);
    };

    const end = () => {
      if (!active) return;
      active = false;
      setFactDragging(false);
      const width = root.clientWidth || 1;
      const dx = factOffsetRef.current;
      if (axis === "x" && Math.abs(dx) > width * 0.16) {
        const next = factPageRef.current + (dx < 0 ? 1 : -1);
        setFactPage(Math.max(0, Math.min(factPageCount - 1, next)));
      }
      factOffsetRef.current = 0;
      setFactOffset(0);
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
  }, [factPageCount, loreOpen]);

  // Vertical: swipe up on facts → open lore; swipe down on lore (at top) → close
  useEffect(() => {
    if (!hasLore) return;
    const stage = stageRef.current;
    if (!stage) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      x0 = x;
      y0 = y;
      axis = null;
      active = true;
    };

    const end = (x: number, y: number) => {
      if (!active) return;
      active = false;
      const dx = x - x0;
      const dy = y - y0;
      if (!axis && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axis !== "y" || Math.abs(dy) < 48) {
        axis = null;
        return;
      }

      if (!loreOpen && dy < 0) {
        // Finger up → open parchment
        setLoreOpen(true);
      } else if (loreOpen && dy > 0) {
        const body = loreBodyRef.current;
        if (!body || body.scrollTop <= 2) {
          setLoreOpen(false);
        }
      }
      axis = null;
    };

    const move = (x: number, y: number) => {
      if (!active || axis) return;
      const dx = x - x0;
      const dy = y - y0;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      start(event.touches[0].clientX, event.touches[0].clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      move(event.touches[0].clientX, event.touches[0].clientY);
    };
    const onTouchEnd = (event: TouchEvent) => {
      const t = event.changedTouches[0];
      end(t?.clientX ?? x0, t?.clientY ?? y0);
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    stage.addEventListener("touchend", onTouchEnd);
    stage.addEventListener("touchcancel", onTouchEnd);

    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [hasLore, loreOpen]);

  // Cache lore scroll body when sheet opens
  useEffect(() => {
    if (!loreOpen) {
      loreBodyRef.current = null;
      return;
    }
    const id = window.setTimeout(() => {
      loreBodyRef.current = stageRef.current?.querySelector(
        ".wiki-mobile-lore-sheet .quest-parchment-body",
      ) as HTMLElement | null;
    }, 80);
    return () => clearTimeout(id);
  }, [loreOpen, children]);

  // Lock page scroll while sheet is open
  useEffect(() => {
    if (!loreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loreOpen]);

  return (
    <section
      ref={stageRef}
      id="wiki-cover"
      className="sm:hidden relative h-[calc(100dvh-3rem)] overflow-hidden"
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[50%_18%]"
          style={{ opacity: 0.68 }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#030712]" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(to top, rgba(3,7,18,0.72) 0%, rgba(3,7,18,0.35) 22%, transparent 48%)",
            "linear-gradient(to bottom, rgba(3,7,18,0.22) 0%, transparent 14%)",
          ].join(", "),
        }}
      />

      <div className="absolute top-0 inset-x-0 z-30 px-4 pt-3">
        <Breadcrumb className="mb-0" items={crumbs} onBack={onBack} />
      </div>

      {/* Nombre pegado a las tarjetas → imagen libre arriba */}
      <div
        className={`absolute top-14 inset-x-0 bottom-0 z-20 flex flex-col justify-end px-4 pb-7 transition-opacity duration-300 ${
          loreOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <h1 className="mb-3 shrink-0 text-center text-[#f3eee4]">
          {prefixTitle ? (
            <span className="block font-quest text-[1.15rem] font-semibold tracking-wide opacity-90">
              {prefixTitle}
            </span>
          ) : null}
          <span className="mt-1 block font-quest-display text-[2rem] font-bold leading-tight tracking-wide">
            {displayName}
          </span>
          {title ? (
            <span className="mt-1.5 block font-quest text-[1.2rem] font-semibold leading-snug tracking-wide text-[#e4ddd0]">
              {title}
            </span>
          ) : null}
        </h1>

        <div ref={factDeckRef} className="overflow-hidden shrink-0">
          <div
            className={`flex w-full ${factDragging ? "" : "transition-transform duration-300 ease-out"}`}
            style={{
              transform: `translateX(calc(${-factPage * 100}% + ${factOffset}px))`,
            }}
          >
            {factPages.map((pageFacts, pageIndex) => (
              <div
                key={`facts-${pageIndex}`}
                className="w-full shrink-0 flex flex-col gap-2"
              >
                {pageFacts.map((f) => (
                  <div
                    key={f.label}
                    className="rounded-lg px-3 py-2.5 border border-white/20 bg-white/15 backdrop-blur-[2px]"
                  >
                    <p className="text-xs text-white/55 mb-0.5">{f.label}</p>
                    <p
                      className="text-sm font-medium truncate text-white"
                      style={f.color ? { color: f.color } : undefined}
                    >
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {factPageCount > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 shrink-0">
            {factPages.map((_, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                aria-label={`Datos ${i + 1} de ${factPageCount}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === factPage ? "w-5 bg-[#e4ddd0]" : "w-1.5 bg-white/40"
                }`}
                onClick={() => setFactPage(i)}
              />
            ))}
          </div>
        )}

        {hasLore && (
          <button
            type="button"
            onClick={() => setLoreOpen(true)}
            className="mt-3 mb-1 shrink-0 text-center text-[11px] tracking-wide text-white/55"
          >
            Desliza hacia arriba para la biografía
          </button>
        )}
      </div>

      {/* Pergamino: sube desde abajo y llena el área bajo la navbar */}
      {hasLore && (
        <div
          className={`wiki-mobile-lore-sheet absolute inset-0 z-40 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            loreOpen ? "translate-y-0" : "translate-y-[108%]"
          }`}
          aria-hidden={!loreOpen}
        >
          <div className="wiki-mobile-lore absolute inset-0 overflow-hidden">
            {children}
          </div>
          {loreOpen && (
            <button
              type="button"
              onClick={() => setLoreOpen(false)}
              className="absolute top-2 left-1/2 z-50 -translate-x-1/2 rounded-full border border-black/15 bg-[#f3eee4]/90 px-3 py-1 text-[11px] font-medium tracking-wide text-[#2a1c10] shadow-md"
            >
              Desliza abajo para volver
            </button>
          )}
        </div>
      )}
    </section>
  );
}
