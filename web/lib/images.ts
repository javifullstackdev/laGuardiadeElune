export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function isGif(src: string): boolean {
  const path = src.split(/[?#]/)[0].toLowerCase();
  return path.endsWith(".gif");
}

/** El mismo GIF, sin la orden de repetirse. El navegador lo reproduce una vez. */
export function onceGifUrl(src: string): string {
  const marker = "/static/";
  const at = src.indexOf(marker);
  if (at < 0) return src;
  const rest = src.slice(at + marker.length);
  if (rest.startsWith("once/")) return src;
  return `${src.slice(0, at)}${marker}once/${rest}`;
}

/** Primer fotograma en JPEG. Es la misma ruta que ven WhatsApp y X. */
export function stillFrameUrl(src: string): string {
  const marker = "/static/";
  const at = src.indexOf(marker);
  if (at < 0) return src;
  const rest = src.slice(at + marker.length);
  if (rest.startsWith("share/")) return src;
  return `${src.slice(0, at)}${marker}share/${rest}`;
}
