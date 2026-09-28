"use client";

import { useEffect, useRef, useState, type TransitionEvent } from "react";
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

const SLIDE_MS = 700;

export default function HomeHero({ slides }: { slides: HeroSlide[] }) {
  const { revealed } = useHomeIntro();
  const bannerRef = useRef<HTMLDivElement>(null);
  const n = slides.length;
  const looping = n > 1;
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(looping ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const locked = useRef(false);
  const offsetRef = useRef(offset);
  const goRef = useRef<(dir: 1 | -1) => void>(() => {});
  offsetRef.current = offset;

  const track = looping ? [slides[n - 1], ...slides, slides[0]] : slides;

  function go(dir: 1 | -1) {
    if (!looping || locked.current) return;
    locked.current = true;
    setAnimate(true);
    setIndex((i) => (i + dir + n) % n);
    setOffset((o) => o + dir);
  }

  function goTo(i: number) {
    if (!looping || locked.current || i === index) return;
    locked.current = true;
    setAnimate(true);
    setIndex(i);
    setOffset(i + 1);
  }

  goRef.current = go;

  function onTrackTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || !looping) {
      locked.current = false;
      return;
    }
    const o = offsetRef.current;
    if (o === 0 || o === n + 1) {
      setAnimate(false);
      setOffset(o === 0 ? n : 1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimate(true);
          locked.current = false;
        });
      });
    } else {
      locked.current = false;
    }
  }

  useEffect(() => {
    if (!revealed || n < 2 || paused) return;
    const id = setInterval(() => goRef.current(1), INTERVAL_MS);
    return () => clearInterval(id);
  }, [revealed, n, paused]);

  useEffect(() => {
    const root = bannerRef.current;
    if (!root || n < 2) return;

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
        goRef.current(x < x0 ? 1 : -1);
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
  }, [n]);

  if (n === 0) return null;

  const current = slides[index];
  const thumbs = slides.slice(0, 4).map((slide, i) => ({ slide, i }));

  return (
    <section className="bg-transparent flex flex-col flex-1 min-h-0 px-3 sm:px-6 lg:px-8 pt-[46vh] sm:pt-5 lg:pt-6 pb-0">
      <div className="flex flex-col flex-1 min-h-0 w-full">
        {/* Banner */}
        <div
          ref={bannerRef}
          id="home-carousel"
          className="relative rounded-2xl overflow-hidden h-[220px] sm:h-0 sm:flex-1 sm:min-h-0 touch-pan-y"
        >
          <div
            className="flex h-full"
            style={{
              transform: `translate3d(-${offset * 100}%, 0, 0)`,
              transition: animate ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none",
            }}
            onTransitionEnd={onTrackTransitionEnd}
          >
            {track.map((slide, i) => (
              <img
                key={`${slide.id ?? slide.src}-strip-${i}`}
                src={slide.src}
                alt=""
                draggable={false}
                style={{ objectPosition: heroObjectPosition(slide) }}
                className="h-full w-full min-w-full shrink-0 object-cover pointer-events-none select-none"
              />
            ))}
          </div>

          <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/70 via-black/15 to-transparent sm:from-black/50 sm:via-transparent sm:to-black/10" />

          {/* Copy: abajo en móvil, centrada en desktop */}
          <div className="absolute z-[3] inset-y-0 left-0 flex flex-col justify-end sm:justify-center max-w-lg px-5 pb-8 sm:px-12 sm:pb-0 lg:px-16">
            <h1 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-quest-display font-bold leading-tight text-white">
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
                onClick={() => go(-1)}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Anterior"
                className="hidden sm:flex absolute z-[4] left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-black/35 hover:bg-black/55 text-white items-center justify-center backdrop-blur-sm"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                onPointerDown={(e) => e.stopPropagation()}
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
            onPointerDown={(e) => e.stopPropagation()}
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
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-[5] -mt-10 sm:-mt-12 mb-1 sm:mb-2 px-4 sm:px-16 lg:px-24 hidden sm:block shrink-0">
          <div
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${thumbs.length}, minmax(0, 1fr))` }}
          >
            {thumbs.map(({ slide, i }) => {
              const isCharacter = slide.kind === "character";
              const isStory = slide.kind === "story";
              const centered = isCharacter || isStory;
              const storyKicker = slide.kicker || "Historia";
              const charKicker = slide.kicker && slide.kicker !== "Personaje" ? slide.kicker : null;
              return (
              <button
                key={slide.id ?? `${slide.src}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={
                  isStory
                    ? `${storyKicker}, ${slide.title}`
                    : slide.kicker
                      ? `${slide.title}, ${slide.kicker}`
                      : slide.title
                }
                className={`group rounded-lg overflow-hidden bg-gray-900 border transition-colors shadow-lg ${
                  centered ? "text-center" : "text-left"
                } ${
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
                  {centered ? (
                    <div className="absolute inset-0 flex flex-col">
                      <div className="flex-1" />
                      <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-3">
                        {isStory && (
                          <p className="text-[11px] sm:text-xs tracking-[0.16em] uppercase text-gray-300 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                            {storyKicker}
                          </p>
                        )}
                        <p className={`text-sm sm:text-base lg:text-lg font-quest-display font-bold tracking-wide text-white leading-snug line-clamp-2 drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)] ${isStory ? "mt-1" : ""}`}>
                          {slide.title}
                        </p>
                        {isCharacter && charKicker && (
                          <p className="mt-1 text-[11px] sm:text-xs tracking-[0.16em] uppercase text-gray-300 truncate max-w-full drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
                            {charKicker}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <p className="text-[11px] sm:text-sm font-quest-display font-bold tracking-wide text-white leading-snug line-clamp-2">
                        {slide.title}
                      </p>
                      {slide.kicker && (
                        <p className="mt-0.5 text-[9px] sm:text-[10px] tracking-widest uppercase text-gray-400 truncate">
                          {slide.kicker}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
