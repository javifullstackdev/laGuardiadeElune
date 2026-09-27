"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export default function Parchment({
  title,
  author,
  actions,
  children,
}: {
  title?: string;
  author?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

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
    const topInset = Math.max(0, parseFloat(pad.paddingTop) - 8);
    const botInset = Math.max(0, parseFloat(pad.paddingBottom) - 8);

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
          src="/parchment/frame.png"
          alt=""
          className="quest-parchment-frame"
          draggable={false}
        />
      </div>
      <header className="quest-parchment-head">
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
