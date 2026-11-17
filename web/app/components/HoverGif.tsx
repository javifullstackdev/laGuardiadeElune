"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { isGif, stillFrameUrl } from "@/lib/images";

export function useCanPlayGif() {
  const [canHover, setCanHover] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    const hoverMq = window.matchMedia("(hover: hover) and (min-width: 1024px)");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setCanHover(hoverMq.matches);
      setReduce(reduceMq.matches);
    };
    sync();
    hoverMq.addEventListener("change", sync);
    reduceMq.addEventListener("change", sync);
    return () => {
      hoverMq.removeEventListener("change", sync);
      reduceMq.removeEventListener("change", sync);
    };
  }, []);

  return canHover && !reduce;
}

/** True mientras el puntero está sobre el `[data-gif-hover]` más cercano. */
export function useGroupHover(
  anchorRef: { readonly current: HTMLElement | null },
  enabled: boolean,
) {
  const [hot, setHot] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const node = anchorRef.current;
    if (!node) return;
    const target = node.closest("[data-gif-hover]") ?? node;
    const enter = () => setHot(true);
    const leave = () => setHot(false);
    target.addEventListener("mouseenter", enter);
    target.addEventListener("mouseleave", leave);
    return () => {
      target.removeEventListener("mouseenter", enter);
      target.removeEventListener("mouseleave", leave);
    };
  }, [anchorRef, enabled]);

  return hot;
}

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  /** Si es false, se queda en el primer fotograma. */
  live?: boolean;
};

export default function HoverGif({ src, alt = "", live = true, ...rest }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const gif = isGif(src);
  const motionOk = useCanPlayGif();
  const hot = useGroupHover(ref, gif);
  const play = gif && live && hot && motionOk;

  useEffect(() => {
    if (!gif || !motionOk) return;
    const preload = new Image();
    preload.src = src;
  }, [gif, motionOk, src]);

  return (
    <img
      {...rest}
      ref={ref}
      src={play ? src : gif ? stillFrameUrl(src) : src}
      alt={alt}
    />
  );
}
