import type { Metadata } from "next";
import Breadcrumb from "@/app/components/Breadcrumb";
import { FAQS, faqPageJsonLd } from "@/lib/faqs";
import { buildShareMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...buildShareMetadata({
    title: "Preguntas frecuentes",
    description:
      "Qué es La Guardia de Elune, qué sentido tiene, qué significa ser miembro y cómo entrar en la hermandad.",
    path: "/preguntas",
  }),
};

export default function PreguntasPage() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd()) }}
      />
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { label: "Preguntas" },
          ]}
        />
        <h1 className="text-3xl font-quest-display font-bold">Preguntas</h1>

        <div className="mt-8 max-w-3xl">
          {FAQS.map((item) => (
            <details key={item.question} name="faq" className="group border-b border-gray-800">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left font-quest text-base font-semibold text-white sm:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden
                  className="shrink-0 text-lg leading-none text-gray-500 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-4 pr-8 text-sm leading-relaxed text-gray-300 sm:text-[15px]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </main>
  );
}
