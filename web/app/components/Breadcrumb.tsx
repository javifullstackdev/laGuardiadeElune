import Link from "next/link";
import { SITE_URL } from "@/lib/site";

export type Crumb = {
  href?: string;
  label: string;
};

function absoluteUrl(href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${SITE_URL}${href.startsWith("/") ? href : `/${href}`}`;
}

function breadcrumbJsonLd(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => {
      const entry: {
        "@type": "ListItem";
        position: number;
        name: string;
        item?: string;
      } = {
        "@type": "ListItem",
        position: i + 1,
        name: item.label,
      };
      if (item.href) entry.item = absoluteUrl(item.href);
      return entry;
    }),
  };
}

function ArrowLeft() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className="w-4 h-4 shrink-0"
    >
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const backClass =
  "inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-700 bg-gray-900/80 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-colors";

export default function Breadcrumb({
  items,
  className,
  onBack,
  jsonLd = true,
}: {
  items: Crumb[];
  className?: string;
  onBack?: () => void;
  /** Emit schema.org BreadcrumbList once per page (disable on duplicate mobile/desktop crumbs). */
  jsonLd?: boolean;
}) {
  const backHref = [...items].reverse().find((item) => item.href)?.href ?? "/";

  return (
    <nav aria-label="Ruta de navegación" className={className ?? "mb-8"}>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(items)) }}
        />
      ) : null}
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        <li>
          {onBack ? (
            <button type="button" onClick={onBack} className={backClass} aria-label="Volver">
              <ArrowLeft />
            </button>
          ) : (
            <Link href={backHref} className={backClass} aria-label="Volver">
              <ArrowLeft />
            </Link>
          )}
        </li>
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && (
                <span className="text-gray-600 select-none" aria-hidden>
                  /
                </span>
              )}
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="text-gray-400 hover:text-yellow-400 transition-colors truncate"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-200 truncate" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
