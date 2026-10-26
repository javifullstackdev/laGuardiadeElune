"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { useRouter } from "next/navigation";
import Breadcrumb, { type Crumb } from "@/app/components/Breadcrumb";
import FactCycle from "@/app/personajes/FactCycle";
import type { WikiNeighbor } from "@/lib/wiki";

type Fact = {
  label: string;
  value: string;
  color?: string;
};

const SLIDE_MS = 700;
const NAME_FADE_MS = 650;
/** Open / close sheet — slower than a snap, same family as home fades */
const SHEET_MS = 1100;
const SHEET_EASE = "cubic-bezier(0.33, 0.2, 0.25, 1)";
const DISMISS_DISTANCE = 140;
const DISMISS_VELOCITY = 900;

function CoverArt({
  url,
  label,
}: {
  url: string | null | undefined;
  label: string;
}) {
  return (
    <>
      {url ? (
        <img
          src={url}
          alt={label}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-[50%_18%] pointer-events-none select-none"
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
    </>
  );
}

function SlideHeading({
  prefixTitle,
  displayName,
  title,
  ready = true,
}: {
  prefixTitle?: string | null;
  displayName: string;
  title?: string | null;
  /** Fade in from the background at the final layout position (no Y jump) */
  ready?: boolean;
}) {
  return (
    <h1
      className="mb-3 shrink-0 text-center text-[#f3eee4]"
      style={{
        opacity: ready ? 1 : 0,
        transition: `opacity ${NAME_FADE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      {prefixTitle ? (
        <span className="block font-quest text-[1.15rem] md:text-[1.4rem] font-semibold tracking-wide opacity-90">
          {prefixTitle}
        </span>
      ) : null}
      <span className="mt-1 block font-quest-display text-[2rem] md:text-[2.75rem] font-bold leading-tight tracking-wide">
        {displayName}
      </span>
      {title ? (
        <span className="mt-1.5 block font-quest text-[1.2rem] md:text-[1.5rem] font-semibold leading-snug tracking-wide text-[#e4ddd0]">
          {title}
        </span>
      ) : null}
    </h1>
  );
}

export default function WikiMobileStage({
  coverUrl,
  prefixTitle,
  displayName,
  title,
  facts,
  crumbs,
  onBack,
  prev,
  next,
  children,
}: {
  coverUrl: string | null;
  prefixTitle?: string | null;
  displayName: string;
  title?: string | null;
  facts: Fact[];
  crumbs: Crumb[];
  onBack?: () => void;
  prev?: WikiNeighbor;
  next?: WikiNeighbor;
  children?: ReactNode;
}) {
  const router = useRouter();
  const hasLore = Boolean(children);
  const canSlide = Boolean(prev || next);

  const [loreOpen, setLoreOpen] = useState(false);
  const [loreDragY, setLoreDragY] = useState(0);
  const [loreDragging, setLoreDragging] = useState(false);
  const [nameReady, setNameReady] = useState(false);
  const [cardsReady, setCardsReady] = useState(false);

  // Carousel strip: [prev?, current, next?] — offset points at current
  const track = useMemo(() => {
    const slides: {
      key: string;
      coverUrl: string | null;
      displayName: string;
      title?: string | null;
      prefixTitle?: string | null;
      href?: string;
      current?: boolean;
    }[] = [];
    if (prev) {
      slides.push({
        key: `prev-${prev.href}`,
        coverUrl: prev.coverUrl,
        displayName: prev.displayName,
        title: prev.title,
        href: prev.href,
      });
    }
    slides.push({
      key: `current-${displayName}`,
      coverUrl,
      displayName,
      title,
      prefixTitle,
      current: true,
    });
    if (next) {
      slides.push({
        key: `next-${next.href}`,
        coverUrl: next.coverUrl,
        displayName: next.displayName,
        title: next.title,
        href: next.href,
      });
    }
    return slides;
  }, [prev, next, coverUrl, displayName, title, prefixTitle]);

  const currentIndex = prev ? 1 : 0;
  const [offset, setOffset] = useState(currentIndex);
  const [animate, setAnimate] = useState(true);
  const locked = useRef(false);
  const pendingHref = useRef<string | null>(null);

  const cardsZoneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const loreSheetRef = useRef<HTMLDivElement>(null);
  const loreHandleRef = useRef<HTMLDivElement>(null);
  const loreDragYRef = useRef(0);
  const loreClosingRef = useRef(false);
  const goRef = useRef<(dir: 1 | -1) => void>(() => {});

  // Reset strip: name fades in from background, then the fact card rises
  useEffect(() => {
    locked.current = false;
    pendingHref.current = null;
    setAnimate(false);
    setOffset(currentIndex);
    setNameReady(false);
    setCardsReady(false);
    let readyId = 0;
    let cardsTimer = 0;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true);
        readyId = requestAnimationFrame(() => {
          setNameReady(true);
          cardsTimer = window.setTimeout(
            () => setCardsReady(true),
            Math.round(NAME_FADE_MS * 0.45),
          );
        });
      });
    });
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(readyId);
      window.clearTimeout(cardsTimer);
    };
  }, [displayName, currentIndex]);

  function go(dir: 1 | -1) {
    if (!canSlide || locked.current || loreOpen) return;
    const target = currentIndex + dir;
    const slide = track[target];
    if (!slide?.href) return;
    locked.current = true;
    pendingHref.current = slide.href;
    setAnimate(true);
    setOffset(target);
  }

  goRef.current = go;

  function onTrackTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const href = pendingHref.current;
    if (!href) {
      locked.current = false;
      return;
    }
    pendingHref.current = null;
    router.push(href);
  }

  useEffect(() => {
    if (prev?.href) router.prefetch(prev.href);
    if (next?.href) router.prefetch(next.href);
  }, [router, prev?.href, next?.href]);

  // Carousel swipe on background (same gesture as HomeHero)
  useEffect(() => {
    if (!canSlide || loreOpen) return;
    const stage = stageRef.current;
    if (!stage) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const inCardsZone = (target: EventTarget | null) => {
      const node = target as Node | null;
      return Boolean(node && cardsZoneRef.current?.contains(node));
    };

    const start = (x: number, y: number, target: EventTarget | null) => {
      if (locked.current || inCardsZone(target)) {
        active = false;
        return;
      }
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
      start(event.touches[0].clientX, event.touches[0].clientY, event.target);
    };
    const onTouchMove = (event: TouchEvent) => {
      move(event.touches[0].clientX, event.touches[0].clientY, event);
    };
    const onTouchEnd = (event: TouchEvent) => {
      end(event.changedTouches[0]?.clientX ?? x0);
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd);
    stage.addEventListener("touchcancel", onTouchEnd);

    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [canSlide, loreOpen]);

  // Swipe up on the stage (while closed) → open parchment
  useEffect(() => {
    if (!hasLore || loreOpen) return;
    const stage = stageRef.current;
    if (!stage) return;

    let x0 = 0;
    let y0 = 0;
    let axis: "x" | "y" | null = null;
    let active = false;

    const start = (x: number, y: number) => {
      if (locked.current) return;
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
      if (axis === "y" && dy < -48) {
        loreClosingRef.current = false;
        loreDragYRef.current = 0;
        setLoreDragY(0);
        setLoreOpen(true);
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

  // Drag from parchment header only → sheet follows finger; release to dismiss / snap back
  useEffect(() => {
    if (!loreOpen) return;
    const handle = loreHandleRef.current;
    if (!handle) return;

    let y0 = 0;
    let active = false;
    let lastY = 0;
    let lastT = 0;
    let vel = 0;

    const start = (y: number) => {
      if (loreClosingRef.current) return;
      y0 = y;
      lastY = y;
      lastT = performance.now();
      vel = 0;
      active = true;
      setLoreDragging(true);
    };

    const move = (y: number, event: Event) => {
      if (!active) return;
      event.preventDefault();
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vel = ((y - lastY) / dt) * 1000;
      lastY = y;
      lastT = now;
      const dy = Math.max(0, y - y0);
      loreDragYRef.current = dy;
      setLoreDragY(dy);
    };

    const end = () => {
      if (!active) return;
      active = false;
      setLoreDragging(false);
      const dy = loreDragYRef.current;
      const shouldClose = dy > DISMISS_DISTANCE || vel > DISMISS_VELOCITY;
      if (shouldClose) {
        loreClosingRef.current = true;
        const h = loreSheetRef.current?.clientHeight || window.innerHeight;
        loreDragYRef.current = h;
        setLoreDragY(h);
      } else {
        loreDragYRef.current = 0;
        setLoreDragY(0);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      start(event.touches[0].clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      move(event.touches[0].clientY, event);
    };
    const onTouchEnd = () => end();

    handle.addEventListener("touchstart", onTouchStart, { passive: true });
    handle.addEventListener("touchmove", onTouchMove, { passive: false });
    handle.addEventListener("touchend", onTouchEnd);
    handle.addEventListener("touchcancel", onTouchEnd);

    return () => {
      handle.removeEventListener("touchstart", onTouchStart);
      handle.removeEventListener("touchmove", onTouchMove);
      handle.removeEventListener("touchend", onTouchEnd);
      handle.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [loreOpen]);

  useEffect(() => {
    if (!loreOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [loreOpen]);

  function onLoreSheetTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (!loreClosingRef.current) return;
    loreClosingRef.current = false;
    // Reset off-screen without a second animated jump
    setLoreDragging(true);
    setLoreOpen(false);
    loreDragYRef.current = 0;
    setLoreDragY(0);
    requestAnimationFrame(() => setLoreDragging(false));
  }

  return (
    <section
      ref={stageRef}
      id="wiki-cover"
      className="min-[1440px]:hidden relative h-[calc(100dvh-3rem)] overflow-hidden touch-pan-y"
    >
      <div
        className="flex h-full"
        style={{
          transform: `translate3d(-${offset * 100}%, 0, 0)`,
          transition: animate
            ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : "none",
        }}
        onTransitionEnd={onTrackTransitionEnd}
      >
        {track.map((slide) => (
          <div
            key={slide.key}
            className="relative h-full w-full min-w-full shrink-0"
          >
            <CoverArt url={slide.coverUrl} label={slide.displayName} />

            <div
              className={`absolute top-14 inset-x-0 bottom-0 z-20 flex flex-col justify-end px-4 md:px-8 pb-7 md:pb-10 transition-opacity duration-300 ${
                loreOpen && slide.current
                  ? "opacity-0 pointer-events-none"
                  : "opacity-100"
              }`}
            >
              {/* Neighbour slides: cover only — name fades in once when the page settles */}
              {slide.current ? (
                <>
                  <SlideHeading
                    key={`heading-${displayName}`}
                    prefixTitle={slide.prefixTitle}
                    displayName={slide.displayName}
                    title={slide.title}
                    ready={nameReady}
                  />

                  <div
                    ref={cardsZoneRef}
                    className={`shrink-0 home-fade-up ${cardsReady ? "is-in" : ""}`}
                  >
                    <FactCycle facts={facts} />

                    {hasLore && (
                      <button
                        type="button"
                        onClick={() => {
                          loreClosingRef.current = false;
                          loreDragYRef.current = 0;
                          setLoreDragY(0);
                          setLoreOpen(true);
                        }}
                        className="mt-3 mb-1 w-full text-center text-[11px] tracking-wide text-white/55"
                      >
                        Desliza hacia arriba para la biografía
                      </button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-0 inset-x-0 z-50 px-4 pt-3">
        <Breadcrumb className="mb-0" items={crumbs} onBack={onBack} jsonLd={false} />
      </div>

      {hasLore && (
        <div
          ref={loreSheetRef}
          className="wiki-mobile-lore-sheet absolute inset-0 z-40 will-change-transform"
          style={{
            transform: loreOpen
              ? `translate3d(0, ${loreDragY}px, 0)`
              : "translate3d(0, 108%, 0)",
            transition: loreDragging
              ? "none"
              : `transform ${SHEET_MS}ms ${SHEET_EASE}`,
          }}
          aria-hidden={!loreOpen}
          onTransitionEnd={onLoreSheetTransitionEnd}
        >
          <div className="wiki-mobile-lore absolute inset-0 overflow-hidden">
            {children}
          </div>
          {/* Solo cabecera: arrastrar baja el pergamino sin pelear con el scroll del cuerpo */}
          {loreOpen && (
            <div
              ref={loreHandleRef}
              className="absolute inset-x-0 top-0 z-50 h-[36%]"
              style={{ touchAction: "none" }}
              aria-hidden
            />
          )}
        </div>
      )}
    </section>
  );
}
