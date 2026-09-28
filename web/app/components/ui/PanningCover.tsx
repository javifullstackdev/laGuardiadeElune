"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ParchmentScrollContext } from "@/app/components/ui/parchment-scroll";

const START_AT = 0.04;
const TRAVEL = 0.92;

const PanProgressContext = createContext(0);

function easeInOut(t: number) {
  const p = Math.min(1, Math.max(0, t));
  return p * p * (3 - 2 * p);
}

const STORY_FADE_MOBILE = [
  "linear-gradient(to top, #030712 0%, rgba(3,7,18,0.62) 14%, transparent 34%)",
  "linear-gradient(to bottom, rgba(3,7,18,0.45) 0%, transparent 18%)",
].join(", ");

const STORY_FADE_DESKTOP = [
  "linear-gradient(to right, #030712 0%, rgba(3,7,18,0.92) 18%, rgba(3,7,18,0.72) 32%, rgba(3,7,18,0.40) 48%, rgba(3,7,18,0.10) 65%, transparent 78%)",
  "linear-gradient(to top, #030712 0%, rgba(3,7,18,0.7) 12%, transparent 30%)",
  "linear-gradient(to bottom, rgba(3,7,18,0.5) 0%, transparent 20%)",
].join(", ");

export function ParchmentPanRoot({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const onProgress = useCallback((value: number) => {
    setProgress(value);
  }, []);

  return (
    <ParchmentScrollContext.Provider value={onProgress}>
      <PanProgressContext.Provider value={progress}>{children}</PanProgressContext.Provider>
    </ParchmentScrollContext.Provider>
  );
}

export function PanningCover({
  src,
  className,
  opacity,
  focusY = 0.18,
}: {
  src: string;
  className?: string;
  opacity: number;
  focusY?: number;
}) {
  const progress = useContext(PanProgressContext);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const shownRef = useRef(0);
  const [shift, setShift] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [shown, setShown] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img?.naturalWidth) return;
    const cW = wrap.clientWidth;
    const cH = wrap.clientHeight;
    if (cW < 8 || cH < 8) return;
    const scale = Math.max(cW / img.naturalWidth, cH / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    setShift({
      x: Math.max(0, drawW - cW),
      y: Math.max(0, drawH - cH) * focusY,
      w: drawW,
      h: drawH,
    });
  }, [focusY]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) measure();
    else img.addEventListener("load", measure);
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      img.removeEventListener("load", measure);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, src]);

  useEffect(() => {
    if (reduced) {
      shownRef.current = progress;
      setShown(progress);
      return;
    }
    let raf = 0;
    const tick = () => {
      const current = shownRef.current;
      const next = current + (progress - current) * 0.065;
      const settled = Math.abs(progress - next) < 0.001;
      shownRef.current = settled ? progress : next;
      setShown(shownRef.current);
      if (!settled) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress, reduced]);

  const drift = START_AT + TRAVEL * easeInOut(shown);
  const tx = reduced ? -shift.x * START_AT : -shift.x * drift;

  return (
    <div
      ref={wrapRef}
      className={`overflow-hidden pointer-events-none select-none ${className ?? ""}`}
      aria-hidden
    >
      <img
        ref={imgRef}
        src={src}
        alt=""
        className="absolute top-0 left-0 max-w-none"
        style={{
          width: shift.w ? `${shift.w}px` : "100%",
          height: shift.h ? `${shift.h}px` : "100%",
          objectFit: shift.w ? "fill" : "cover",
          opacity,
          transform: `translate3d(${tx}px, ${-shift.y}px, 0)`,
          willChange: reduced ? undefined : "transform",
        }}
        draggable={false}
      />
      <div className="absolute inset-0 sm:hidden" style={{ background: STORY_FADE_MOBILE }} />
      <div className="absolute inset-0 hidden sm:block" style={{ background: STORY_FADE_DESKTOP }} />
    </div>
  );
}
