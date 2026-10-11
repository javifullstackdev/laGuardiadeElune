import type { ReactNode } from "react";
import Breadcrumb from "@/app/components/Breadcrumb";

export default function LegalDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-[calc(100dvh-3rem)] text-white">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { label: title },
          ]}
        />
        <h1 className="text-3xl font-quest-display font-bold tracking-wide">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Última actualización: 11 de octubre de 2026
        </p>
        <div className="mt-8 space-y-6 text-sm sm:text-[15px] leading-relaxed text-gray-300 [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-quest [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-yellow-400/90 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-yellow-300">
          {children}
        </div>
      </div>
    </main>
  );
}
