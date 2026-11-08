import type { Metadata } from "next";

import Breadcrumb from "@/app/components/Breadcrumb";
import { buildShareMetadata } from "@/lib/seo";
import RecruitForm from "./RecruitForm";

export const metadata: Metadata = {
  ...buildShareMetadata({
    title: "Reclutamiento",
    description: "Pide unirte a La Guardia de Elune. Deja tu nombre, tu apellido y por qué quieres entrar.",
    path: "/reclutamiento",
  }),
};

export default function ReclutamientoPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { href: "/", label: "Inicio" },
            { label: "Reclutamiento" },
          ]}
        />
        <h1 className="text-3xl font-quest-display font-bold">Reclutamiento</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
          Si quieres unirte a La Guardia de Elune, deja tu nombre y la razón por la que te gustaría entrar.
          La hermandad lee cada solicitud.
        </p>
        <RecruitForm />
      </div>
    </main>
  );
}
