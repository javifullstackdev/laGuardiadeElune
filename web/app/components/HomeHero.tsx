"use client";

import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/hero";
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
  const thumbs = slides
    .map((slide, i) => ({ slide, i }))
    .filter(({ i }) => i !== index)
    .slice(0, 4);

  function prev() {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }
  function next() {
    setIndex((i) => (i + 1) % slides.length);
  }

  return (
    <section className="bg-transparent px-3 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20">
      <div className="max-w-7xl mx-auto">
        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden h-[280px] sm:h-[380px] lg:h-[440px]">
          {slides.map((slide, i) => (
            <img
              key={slide.src}
              src={slide.src}
              alt=""
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-700 ${
                i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
              }`}
            />
          ))}

          <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-transparent to-black/10" />

          {/* Copy izquierda */}
          <div className="absolute z-[3] inset-y-0 left-0 flex flex-col justify-center max-w-lg px-6 sm:px-12 lg:px-16">
            <h1 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-bold leading-tight text-white">
              {current.title}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-gray-200/90 leading-relaxed">
              {current.subtitle}
            </p>
            <a
              href="#tablon"
              className="mt-5 inline-flex items-center self-start rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              Descubre las novedades
            </a>
          </div>

          {/* Flechas */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Anterior"
                className="absolute z-[4] left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Siguiente"
                className="absolute z-[4] right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-md bg-black/35 hover:bg-black/55 text-white flex items-center justify-center backdrop-blur-sm"
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
            className="absolute z-[4] left-4 bottom-4 w-9 h-9 rounded-md bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm"
          >
            {paused ? <IconPlay /> : <IconPause />}
          </button>
        </div>

        {/* 4 tarjetas de las otras imágenes */}
        <div className="relative z-[5] -mt-12 sm:-mt-16 px-4 sm:px-16 lg:px-24">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {thumbs.map(({ slide, i }) => (
              <button
                key={slide.src}
                type="button"
                onClick={() => setIndex(i)}
                className="group text-left rounded-lg overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-500 transition-colors shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={slide.src}
                    alt=""
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
