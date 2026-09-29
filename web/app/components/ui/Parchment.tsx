"use client";

import { useContext, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { ParchmentScrollContext } from "@/app/components/ui/parchment-scroll";

export default function Parchment({
  title,
  titleFont = "quest",
  author,
  actions,
  children,
}: {
  title?: string;
  titleFont?: "quest" | "display";
  author?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const onScrollProgress = useContext(ParchmentScrollContext);

  useEffect(() => {
    const root = bodyRef.current;
    if (!root || !onScrollProgress) return;

    let raf = 0;
    const report = () => {
      if (root.getClientRects().length === 0) return;
      const max = root.scrollHeight - root.clientHeight;
      onScrollProgress(max <= 0 ? 0 : Math.min(1, Math.max(0, root.scrollTop / max)));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        report();
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    report();
    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [onScrollProgress]);

  useLayoutEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll("h2, p"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      items.forEach((el) => el.classList.add("is-in"));
      root.classList.add("is-ready");
      return;
    }

    const pad = getComputedStyle(root);
    const topInset = Math.max(0, (Number.parseFloat(pad.paddingTop) || 0) - 8);
    const botInset = Math.max(0, (Number.parseFloat(pad.paddingBottom) || 0) - 8);

    let armed = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target;
          el.classList.remove("is-in", "is-above");
          if (entry.isIntersecting) {
            el.classList.add("is-in");
          } else if (entry.rootBounds && entry.boundingClientRect.top < entry.rootBounds.top) {
            el.classList.add("is-above");
          }
        }
        if (!armed) {
          armed = true;
          root.classList.add("is-ready");
        }
      },
      { root, rootMargin: `${-topInset}px 0px ${-botInset}px 0px`, threshold: 0.08 },
    );

    for (const el of items) io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className={`quest-parchment${actions ? " quest-parchment-actions-foot" : ""}`}>
      <div className="quest-parchment-art" aria-hidden>
        <img
          src="/parchment/parchmentMidResize.png"
          alt=""
          className="quest-parchment-frame"
          draggable={false}
        />
      </div>
      <header
        className={`quest-parchment-head${titleFont === "display" ? " quest-parchment-head-display" : ""}`}
      >
        {title ? <h2>{title}</h2> : null}
        <div className="quest-parchment-rule" />
      </header>
      <div ref={bodyRef} className="quest-parchment-body scrollbar-none" lang="es">
        {children}
      </div>
      <footer className="quest-parchment-foot">
        <div className="quest-parchment-rule" aria-hidden />
        {actions || author ? (
          <div className="quest-parchment-foot-row">
            {actions ? <div className="quest-parchment-actions">{actions}</div> : <span />}
            {author ? <p className="quest-parchment-author">{author}</p> : null}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
