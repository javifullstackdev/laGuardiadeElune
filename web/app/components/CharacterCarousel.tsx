"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { WikiListItem } from "@/lib/wiki";
import WikiTile from "./WikiTile";

const GAP = 12;
const STEP_MS = 4500;
const EASE_MS = 900;

function layoutFor(width: number, count: number) {
  if (count <= 1) return { per: 1, card: width };
  if (width >= 1024) {
    const per = Math.min(4, count);
    return { per, card: (width - GAP * (per - 1)) / per };
  }
  // Igual que el tablón y las historias: cabe una y se asoma la siguiente.
  if (width >= 768) return { per: 1, card: Math.min(width * 0.72, 26 * 16) };
  return { per: 1, card: width * 0.8 };
}

function glide(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export default function CharacterCarousel({ items }: { items: WikiListItem[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardWidthRef = useRef(0);
  const pausedRef = useRef(false);
  const touchingRef = useRef(false);
  const glidingRef = useRef(false);
  const glideToken = useRef(0);
  const holdTimer = useRef(0);
  const placedRef = useRef(false);
  const suppressClick = useRef(false);
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [reduce, setReduce] = useState(false);

  const count = items.length;
  const looping = count > 1 && !reduce;
  const slides = looping ? [...items, ...items, ...items] : items;

  useEffect(() => {
    cardWidthRef.current = cardWidth;
  }, [cardWidth]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduce(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const measure = () => {
      const next = layoutFor(viewport.clientWidth, count);
      setCardWidth((current) => (Math.abs(current - next.card) < 0.5 ? current : next.card));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [count, looping]);

  function stepSize() {
    return cardWidthRef.current + GAP;
  }

  function setSnapEnabled(enabled: boolean) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.style.scrollSnapType = enabled ? "" : "none";
  }

  function normalize() {
    const viewport = viewportRef.current;
    if (!viewport || !looping || touchingRef.current || glidingRef.current) return;
    const set = count * stepSize();
    if (set <= 0) return;
    const left = viewport.scrollLeft;
    if (left < set) viewport.scrollLeft = left + set;
    else if (left >= set * 2) viewport.scrollLeft = left - set;
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !looping || cardWidth <= 0 || placedRef.current) return;
    viewport.scrollLeft = count * (cardWidth + GAP);
    placedRef.current = true;
  }, [looping, cardWidth, count]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !looping) return;

    const onScrollEnd = () => normalize();
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(normalize, 160);
    };
    viewport.addEventListener("scrollend", onScrollEnd);
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scrollend", onScrollEnd);
      viewport.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [looping, count, cardWidth]);

  function hold() {
    pausedRef.current = true;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, STEP_MS);
  }

  useEffect(() => {
    if (!looping || cardWidth <= 0) return;
    const timer = window.setInterval(() => {
      const viewport = viewportRef.current;
      if (!viewport || pausedRef.current || touchingRef.current || glidingRef.current) return;
      const distance = cardWidth + GAP;
      const token = ++glideToken.current;
      const start = viewport.scrollLeft;
      const t0 = performance.now();
      glidingRef.current = true;
      setSnapEnabled(false);
      const frame = (now: number) => {
        if (glideToken.current !== token || touchingRef.current) {
          glidingRef.current = false;
          setSnapEnabled(true);
          return;
        }
        const t = Math.min(1, (now - t0) / EASE_MS);
        viewport.scrollLeft = start + distance * glide(t);
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        glidingRef.current = false;
        setSnapEnabled(true);
        normalize();
      };
      requestAnimationFrame(frame);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [looping, cardWidth, count]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    touchingRef.current = true;
    glideToken.current += 1;
    glidingRef.current = false;
    hold();
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    dragRef.current = { x: event.clientX, left: viewport.scrollLeft, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    drag.moved = true;
    suppressClick.current = true;
    setSnapEnabled(false);
    if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
    viewport.scrollLeft = drag.left - dx;
  }

  function finishPointer(event: React.PointerEvent<HTMLDivElement>) {
    touchingRef.current = false;
    const drag = dragRef.current;
    dragRef.current = null;
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    if (!drag?.moved) {
      setSnapEnabled(true);
      return;
    }
    const distance = stepSize();
    const nearest = Math.round(viewport.scrollLeft / distance) * distance;
    setSnapEnabled(true);
    viewport.scrollTo({ left: nearest, behavior: "smooth" });
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (!looping) {
    return (
      <ul className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain [touch-action:pan-x_pan-y] lg:grid lg:grid-cols-4 lg:overflow-visible">
        {items.map((item) => (
          <li
            key={`${item.realm}-${item.name}`}
            className="h-full w-[80%] shrink-0 snap-start md:w-[min(72%,26rem)] lg:w-auto"
          >
            <WikiTile item={item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div
      ref={viewportRef}
      className="snap-x snap-mandatory overflow-x-auto scrollbar-none overscroll-x-contain [touch-action:pan-x_pan-y]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onWheel={hold}
      onClickCapture={onClickCapture}
    >
      <ul className="flex items-stretch" style={{ gap: GAP }}>
        {slides.map((item, slideIndex) => {
          const copy = Math.floor(slideIndex / count);
          const clone = copy !== 1;
          return (
            <li
              key={`${item.realm}-${item.name}-${slideIndex}`}
              aria-hidden={clone || undefined}
              className="h-full w-[80%] shrink-0 snap-start md:w-[min(72%,26rem)]"
              style={{ width: cardWidth > 0 ? cardWidth : undefined }}
            >
              <WikiTile item={item} tabbable={!clone} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
