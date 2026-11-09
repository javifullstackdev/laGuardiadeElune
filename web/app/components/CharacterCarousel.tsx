"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { WikiListItem } from "@/lib/wiki";
import WikiTile from "./WikiTile";

const GAP = 12;
const STEP_MS = 4500;
const EASE_MS = 900;

function cardsPerView(width: number, count: number) {
  if (count <= 1) return 1;
  if (width >= 1024) return Math.min(4, count);
  return 1;
}

export default function CharacterCarousel({ items }: { items: WikiListItem[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const snappingRef = useRef(false);
  const perViewRef = useRef(1);
  const [cardWidth, setCardWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [easing, setEasing] = useState(true);
  const [reduce, setReduce] = useState(false);

  const count = items.length;
  const looping = count > 1 && !reduce;
  const slides = looping ? [...items, ...items] : items;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

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
      const width = viewport.clientWidth;
      const nextPerView = cardsPerView(width, count);
      const nextCard = nextPerView <= 1 ? width : (width - GAP * (nextPerView - 1)) / nextPerView;
      if (perViewRef.current !== nextPerView) {
        perViewRef.current = nextPerView;
        setIndex(0);
        setEasing(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setEasing(true));
        });
      }
      setCardWidth((current) => (Math.abs(current - nextCard) < 0.5 ? current : nextCard));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [count, looping]);

  const ready = cardWidth > 0;

  useEffect(() => {
    if (!looping || !ready) return;
    const timer = window.setInterval(() => {
      if (snappingRef.current) return;
      setEasing(true);
      setIndex((current) => (current >= count ? current : current + 1));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [looping, count, ready]);

  useEffect(() => {
    if (!looping || index < count) return;
    const timer = window.setTimeout(snapToStart, EASE_MS + 60);
    return () => window.clearTimeout(timer);
  }, [index, count, looping]);

  function snapToStart() {
    if (snappingRef.current || indexRef.current < count) return;
    snappingRef.current = true;
    setEasing(false);
    setIndex(0);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        snappingRef.current = false;
        setEasing(true);
      });
    });
  }

  function onTransitionEnd(event: React.TransitionEvent<HTMLUListElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    if (indexRef.current >= count) snapToStart();
  }

  const offset = cardWidth > 0 ? index * (cardWidth + GAP) : 0;

  if (!looping) {
    return (
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {items.map((item) => (
          <li key={`${item.realm}-${item.name}`} className="h-full">
            <WikiTile item={item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={viewportRef} className="overflow-hidden">
      <ul
        className="flex items-stretch"
        style={{
          gap: GAP,
          transform: cardWidth > 0 ? `translate3d(${-offset}px, 0, 0)` : undefined,
          transition: easing ? `transform ${EASE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : "none",
        }}
        onTransitionEnd={onTransitionEnd}
      >
        {slides.map((item, slideIndex) => {
          const clone = slideIndex >= count;
          return (
            <li
              key={`${item.realm}-${item.name}-${slideIndex}`}
              aria-hidden={clone || undefined}
              inert={clone ? true : undefined}
              className="h-full shrink-0"
              style={{ width: cardWidth > 0 ? cardWidth : "100%" }}
            >
              <WikiTile item={item} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
