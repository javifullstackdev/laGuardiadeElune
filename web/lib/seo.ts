import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const DEFAULT_SHARE_IMAGE = { url: "/elune/elune.png", width: 512, height: 256 };

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

type ShareMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article" | "profile";
  publishedTime?: string | null;
};

/**
 * Metadatos para compartir un contenido concreto. Next.js solo hereda `twitter` y
 * `alternates` del layout (el `openGraph` de la página lo sustituye entero), así que
 * hay que declarar siempre los tres juntos para que X y WhatsApp lean la misma imagen
 * y la misma URL canónica que la página.
 */
export function buildShareMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  publishedTime,
}: ShareMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image || DEFAULT_SHARE_IMAGE.url);
  const sized = image ? {} : { width: DEFAULT_SHARE_IMAGE.width, height: DEFAULT_SHARE_IMAGE.height };

  const openGraph = {
    title,
    description,
    url,
    siteName: SITE_NAME,
    locale: "es_ES",
    type,
    images: [{ url: imageUrl, alt: title, ...sized }],
    ...(publishedTime ? { publishedTime } : {}),
  } as NonNullable<Metadata["openGraph"]>;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph,
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
