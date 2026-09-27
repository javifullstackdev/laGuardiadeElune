"use client";

import { useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/hero";
import { heroObjectPosition } from "@/lib/hero";
import { useHomeIntro } from "./HomeReveal";

const INTERVAL_MS = 7000;

function ChevronLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="7,5 19,12 7,19" />
    </svg>
  );
}

export default function HomeHero({ slides }: { slides: HeroSlide[] }) {
  const { revealed } = useHomeIntro();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!revealed || slides.length < 2 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [revealed, slides.length, paused]);

  if (slides.length === 0) return null;

  const current = slides[index];
  const thumbs = slides.slice(0, 4).map((slide, i) => ({ slide, i }));

  function prev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }
  function next() {
    setIndex((i) => (i + 1) % slides.length);
  }

  useEffect(() => {
    const root = bannerRef.current;
    if (!root || slides.length < 2) return;

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

    const move = (x: number, y: number, event: Event) => {
      if (!active) return;
      const dx = x - x0;
      const dy = y - y0;
      if (!axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (axis === "x") event.preventDefault();
    };

    const end = (x: number) => {
      if (!active) return;
      active = false;
      if (axis === "x" && Math.abs(x - x0) > 40) {
        if (x < x0) next();
        else prev();
      }
      axis = null;
    };

    const onTouchStart = (event: TouchEvent) => {
      start(event.touches[0].clientX, event.touches[0].clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      move(event.touches[0].clientX, event.touches[0].clientY, event);
    };
    const onTouchEnd = (event: TouchEvent) => {
      end(event.changedTouches[0]?.clientX ?? x0);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      start(event.clientX, event.clientY);
    };
    const onPointerMove = (event: PointerEvent) => {
      move(event.clientX, event.clientY, event);
    };
    const onPointerUp = (event: PointerEvent) => {
      end(event.clientX);
    };

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd);
    root.addEventListener("touchcancel", onTouchEnd);
    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [slides.length]);

  return (
    <section className="bg-transparent px-3 sm:px-6 lg:px-8 pt-[50vh] sm:pt-16 lg:pt-20 pb-10 sm:pb-14">
      <div className="max-w-7xl mx-auto">
        {/* Banner */}
        <div
          ref={bannerRef}
          id="home-carousel"
          className="relative rounded-2xl overflow-hidden h-[280px] sm:h-[380px] lg:h-[440px] touch-pan-y"
        >
          {slides.map((slide, i) => (
            <img
              key={slide.id ?? `${slide.src}-${i}`}
              src={slide.src}
              alt=""
              style={{ objectPosition: heroObjectPosition(slide) }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
            />
          ))}

          <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/70 via-black/15 to-transparent sm:from-black/50 sm:via-transparent sm:to-black/10" />

          {/* Copy: abajo en móvil, centrada en desktop */}
          <div className="absolute z-[3] inset-y-0 left-0 flex flex-col justify-end sm:justify-center max-w-lg px-5 pb-8 sm:px-12 sm:pb-0 lg:px-16">
            <h1 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-bold leading-tight text-white">
              {current.title}
            </h1>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-gray-200/90 leading-relaxed">
              {current.subtitle}
            </p>
            <a
              href={current.href || "#tablon"}
              className="mt-3 sm:mt-5 inline-flex items-center self-start rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              {current.cta || "Descubre las novedades"}
            </a>
          </div>

          {/* Flechas */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="hidden sm:flex absolute z-[4] left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-black/35 hover:bg-black/55 text-white items-center justify-center backdrop-blur-sm"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Siguiente"
                className="hidden sm:flex absolute z-[4] right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-black/35 hover:bg-black/55 text-white items-center justify-center backdrop-blur-sm"
              >
                <ChevronRight />
              </button>
            </>
          )}
          {/* Pause dentro del banner */}
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
            className="hidden sm:flex absolute z-[4] left-4 bottom-4 w-9 h-9 rounded-md bg-black/45 hover:bg-black/65 text-white items-center justify-center backdrop-blur-sm"
          >
            {paused ? <IconPlay /> : <IconPause />}
          </button>

          {slides.length > 1 && (
            <div className="sm:hidden absolute z-[4] inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id ?? `${slide.src}-${i}`}
                  type="button"
                  aria-label={`Ir a la diapositiva ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-5 bg-white" : "w-1.5 bg-white/45"
                  }`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-[5] -mt-12 sm:-mt-16 mb-6 sm:mb-8 px-4 sm:px-16 lg:px-24 hidden sm:block">
          <div
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${thumbs.length}, minmax(0, 1fr))` }}
          >
            {thumbs.map(({ slide, i }) => (
              <button
                key={slide.id ?? `${slide.src}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`group text-left rounded-lg overflow-hidden bg-gray-900 border transition-colors shadow-lg ${
                  i === index
                    ? "border-white/45"
                    : "border-gray-800 hover:border-gray-500"
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={slide.src}
                    alt=""
                    style={{ objectPosition: heroObjectPosition(slide) }}
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/45 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                    <p className="text-[9px] sm:text-[10px] tracking-widest uppercase text-gray-400 truncate">
                      {slide.kicker}
                    </p>
                    <p className="text-[11px] sm:text-sm font-semibold text-white leading-snug line-clamp-2">
                      {slide.title}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
