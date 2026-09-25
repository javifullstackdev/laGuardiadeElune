import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

const SOURCE_OPTIONS = [
  { value: "rank",        label: "Rango" },
  { value: "achievement", label: "Logro" },
  { value: "points",      label: "Puntos" },
  { value: "custom",      label: "Personalizado" },
];

const SOURCE_BADGE: Record<string, string> = {
  rank:        "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  achievement: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  points:      "bg-blue-500/20   text-blue-300   border-blue-500/30",
  custom:      "bg-gray-500/20   text-gray-300   border-gray-500/30",
};

type CharacterBrief = {
  name: string;
  realm: string;
  wow_class: string | null;
};

type TitleWithHolders = {
  id: string;
  name: string;
  source: string;
  description: string | null;
  holders: CharacterBrief[];
};

export default async function AdminTitlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  // Verificar que es admin/officer
  const userRes = await fetch("http://localhost:8000/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!userRes.ok) redirect("/");
  const user = await userRes.json();
  if (user.role !== "admin" && user.role !== "officer") redirect("/");

  // Cargar títulos con sus poseedores
  const titlesRes = await fetch("http://localhost:8000/titles/admin", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const titles: TitleWithHolders[] = titlesRes.ok ? await titlesRes.json() : [];

  const params   = await searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Gestión de títulos</h1>
            <p className="text-gray-400 text-sm mt-1">{titles.length} títulos en el catálogo</p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-300">
            &larr; Panel admin
          </Link>
        </div>

        {errorMsg && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Formulario de creación */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-5">Nuevo título</h2>
          <form action="/api/admin/titles" method="POST" className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre del título *</label>
              <input
                name="name"
                placeholder='p.ej. "Líder de la Guardia"'
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Origen</label>
              <select
                name="source"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Descripción</label>
              <input
                name="description"
                placeholder="Descripción breve del título (opcional)"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <button
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Crear título
            </button>
          </form>
        </section>

        {/* Formulario de asignación */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-2">Otorgar título a un personaje</h2>
          <p className="text-gray-500 text-sm mb-5">
            El personaje debe estar registrado en la BD. El realm debe coincidir exactamente
            (p.ej. <span className="text-gray-400">dun-modr</span>).
          </p>
          <form action="/api/admin/titles/award" method="POST" className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Título *</label>
              <select
                name="title_id"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              >
                <option value="">-- Selecciona un título --</option>
                {titles.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre del personaje *</label>
                <input
                  name="character_name"
                  placeholder="Deyk"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Realm *</label>
                <input
                  name="character_realm"
                  placeholder="dun-modr"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Otorgar título
            </button>
          </form>
        </section>

        {/* Lista de títulos */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Títulos creados</h2>
          {titles.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay títulos todavía.</p>
          ) : (
            <ul className="space-y-3">
              {titles.map((title) => {
                const badgeClass =
                  SOURCE_BADGE[title.source] ?? SOURCE_BADGE.custom;
                return (
                  <li
                    key={title.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{title.name}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}
                          >
                            {SOURCE_OPTIONS.find((s) => s.value === title.source)?.label ?? title.source}
                          </span>
                        </div>
                        {title.description && (
                          <p className="text-sm text-gray-400">{title.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Personajes con este título */}
                    {title.holders.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-800">
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
                          Portadores ({title.holders.length})
                        </p>
                        <ul className="space-y-2">
                          {title.holders.map((h) => (
                            <li
                              key={`${h.name}-${h.realm}`}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-200">{h.name}</span>
                                <span className="text-gray-500">·</span>
                                <span className="text-gray-400">{h.realm}</span>
                                {h.wow_class && (
                                  <span className="text-gray-600 text-xs">{h.wow_class}</span>
                                )}
                              </div>
                              {/* Formulario de revocación */}
                              <form action="/api/admin/titles/revoke" method="POST">
                                <input type="hidden" name="title_id" value={title.id} />
                                <input type="hidden" name="character_name" value={h.name} />
                                <input type="hidden" name="character_realm" value={h.realm} />
                                <button
                                  type="submit"
                                  className="text-xs text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                                >
                                  Revocar
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {title.holders.length === 0 && (
                      <p className="text-xs text-gray-600 mt-3">
                        Sin portadores todavía.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
