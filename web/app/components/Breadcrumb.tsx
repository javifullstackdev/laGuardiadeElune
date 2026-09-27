import Link from "next/link";

export type Crumb = {
  href?: string;
  label: string;
};

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

export default function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  const backHref = [...items].reverse().find((item) => item.href)?.href ?? "/";

  return (
    <nav aria-label="Ruta de navegación" className={className ?? "mb-8"}>
      <ol className="flex items-center gap-1.5 text-sm flex-wrap">
        <li>
          <Link
            href={backHref}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-700 bg-gray-900/80 text-gray-300 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft />
          </Link>
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
