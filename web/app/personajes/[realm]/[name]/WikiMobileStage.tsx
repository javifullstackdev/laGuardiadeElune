"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Breadcrumb, { type Crumb } from "@/app/components/Breadcrumb";

type Fact = {
  label: string;
  value: string;
  color?: string;
};

export default function WikiMobileStage({
  coverUrl,
  prefixTitle,
  displayName,
  title,
  facts,
  crumbs,
  children,
}: {
  coverUrl: string | null;
  prefixTitle?: string | null;
  displayName: string;
  title?: string | null;
  facts: Fact[];
  crumbs: Crumb[];
  children?: ReactNode;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const hasLore = Boolean(children);
  const lastPage = hasLore ? 1 : 0;

  pageRef.current = page;

  useEffect(() => {
    const root = deckRef.current;
    if (!root || !hasLore) return;

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
      const atStart = pageRef.current === 0 && dx > 0;
      const atEnd = pageRef.current === lastPage && dx < 0;
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
        const next = pageRef.current + (dx < 0 ? 1 : -1);
        setPage(Math.max(0, Math.min(lastPage, next)));
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

    root.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    root.addEventListener("touchend", end, { capture: true });
    root.addEventListener("touchcancel", end, { capture: true });
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);

    return () => {
      root.removeEventListener("touchstart", onTouchStart, true);
      root.removeEventListener("touchmove", onTouchMove, true);
      root.removeEventListener("touchend", end, true);
      root.removeEventListener("touchcancel", end, true);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [hasLore, lastPage]);

  return (
    <section
      id="wiki-cover"
      className="sm:hidden relative h-[calc(100dvh-3rem)] overflow-hidden"
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-[50%_8%]"
          style={{ opacity: 0.62 }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#030712]" />
      )}
      <div
        className="absolute inset-0"
        style={{
          background: [
            "linear-gradient(to top, rgba(3,7,18,0.45) 0%, rgba(3,7,18,0.18) 14%, transparent 32%)",
            "linear-gradient(to bottom, rgba(3,7,18,0.28) 0%, transparent 18%)",
          ].join(", "),
        }}
      />

      <div className="absolute top-0 inset-x-0 z-30 px-4 pt-3">
        <Breadcrumb className="mb-0" items={crumbs} />
      </div>

      <div className="absolute top-14 inset-x-0 bottom-0 z-20 flex flex-col">
        <div className="relative min-h-0 flex-1">
          <div ref={deckRef} className="h-full overflow-hidden touch-pan-y">
            <div
              className={`flex h-full w-full ${dragging ? "" : "transition-transform duration-300 ease-out"}`}
              style={{ transform: `translateX(calc(${-page * 100}% + ${offset}px))` }}
            >
              <div className="w-full h-full shrink-0 px-4 pb-7 overflow-y-auto flex flex-col justify-end">
                <h1 className="mb-4 text-center text-[#f3eee4]">
                  {prefixTitle ? (
                    <span className="block text-[1.15rem] font-semibold tracking-wide opacity-90">
                      {prefixTitle}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[2rem] font-bold leading-tight tracking-wide">
                    {displayName}
                  </span>
                  {title ? (
                    <span className="mt-1.5 block text-[1.2rem] font-semibold leading-snug tracking-wide text-[#e4ddd0]">
                      {title}
                    </span>
                  ) : null}
                </h1>
                <div className="flex flex-col gap-2">
                  {facts.map((f) => (
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
                {hasLore && (
                  <p className="mt-3 mb-1 text-center text-[11px] tracking-wide text-white/55">
                    Desliza para la biografía
                  </p>
                )}
              </div>

              {hasLore && (
                <div className="wiki-mobile-lore w-full h-full shrink-0 px-2 flex items-end justify-center">
                  {children}
                </div>
              )}
            </div>
          </div>

          {hasLore && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center gap-1.5">
              <button
                type="button"
                aria-label="Datos del personaje"
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${page === 0 ? "w-5 bg-[#e4ddd0]" : "w-1.5 bg-gray-500"}`}
                onClick={() => setPage(0)}
              />
              <button
                type="button"
                aria-label="Biografía"
                className={`pointer-events-auto h-1.5 rounded-full transition-all ${page === 1 ? "w-5 bg-[#e4ddd0]" : "w-1.5 bg-gray-500"}`}
                onClick={() => setPage(1)}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
