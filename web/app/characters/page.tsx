import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type MyCharacter = {
  name: string;
  realm: string;
  wow_class: string | null;
  role_function: string | null;
  is_main: boolean;
  is_verified: boolean;
};

type BlizzardCharacter = {
  name: string;
  realm: string;
  realm_name: string;
  class_id: number;
  race_id: number;
  class_name: string;
  race_name: string;
  level: number;
  faction: string;
  blizzard_character_id: number;
};

export default async function PersonajesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) redirect("/");

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Cache-Control": "no-store",
  };

  const myRes = await fetch("http://localhost:8000/characters/my", { headers, cache: "no-store" });
  if (!myRes.ok && myRes.status === 401) redirect("/");
  const myCharacters: MyCharacter[] = myRes.ok ? await myRes.json() : [];

  const bnetRes = await fetch("http://localhost:8000/characters/blizzard", { headers, cache: "no-store" });
  const bnetCharacters: BlizzardCharacter[] = bnetRes.ok ? await bnetRes.json() : [];
  const bnetError = !bnetRes.ok ? (await bnetRes.json()).detail : null;

  const registeredKeys = new Set(myCharacters.map((c) => `${c.name}-${c.realm}`));
  const unregistered = bnetCharacters.filter(
    (c) => !registeredKeys.has(`${c.name}-${c.realm}`)
  );

  const params = await searchParams;
  const formError = params.error;

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">Mis Personajes</h1>

      {formError && (
        <p className="text-red-500 mb-4 text-sm">{decodeURIComponent(formError)}</p>
      )}

      {/* ── Personajes registrados en La Guardia ── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Registrados en La Guardia</h2>
        {myCharacters.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no tienes personajes registrados.</p>
        ) : (
          <ul className="space-y-2">
            {myCharacters.map((c) => (
              <li
                key={`${c.name}-${c.realm}`}
                className="flex items-center gap-2 border rounded px-4 py-2"
              >
                <span className="font-semibold">{c.name}</span>
                <span className="text-gray-400 text-sm">-{c.realm}</span>
                {c.is_main && (
                  <span className="text-xs text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
                    main
                  </span>
                )}
                {c.is_verified && (
                  <span className="text-xs text-blue-400 border border-blue-500/30 rounded-full px-2 py-0.5">
                    verificado
                  </span>
                )}
                {c.wow_class && (
                  <span className="ml-auto text-xs text-gray-500">{c.wow_class}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Personajes de Blizzard no añadidos ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Tus personajes en Battle.net</h2>

        {bnetError ? (
          <div className="border rounded p-4">
            <p className="text-gray-500 text-sm mb-3">{bnetError}</p>
            <a
              href="http://localhost:8000/auth/blizzard/login"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Conectar Battle.net
            </a>
          </div>
        ) : unregistered.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {bnetCharacters.length === 0
              ? "No se encontraron personajes en esta cuenta de Blizzard."
              : "Todos tus personajes de Blizzard ya están registrados."}
          </p>
        ) : (
          <ul className="space-y-2">
            {unregistered.map((c) => (
              <li
                key={c.blizzard_character_id}
                className="flex items-center gap-3 border rounded px-4 py-2"
              >
                <div className="flex-1">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-gray-400 text-sm ml-1">-{c.realm_name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    Nv.{c.level} {c.class_name} ({c.race_name})
                  </span>
                </div>

                <form method="POST" action="/api/characters/add" className="flex gap-2">
                  <input type="hidden" name="name" value={c.name} />
                  <input type="hidden" name="realm" value={c.realm} />
                  <input type="hidden" name="class_id" value={c.class_id} />
                  <input type="hidden" name="race_id" value={c.race_id} />
                  <input type="hidden" name="level" value={c.level} />
                  <input type="hidden" name="faction" value={c.faction} />
                  <input type="hidden" name="is_main" value="false" />
                  <button
                    type="submit"
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                  >
                    + Añadir
                  </button>
                </form>

                <form method="POST" action="/api/characters/add">
                  <input type="hidden" name="name" value={c.name} />
                  <input type="hidden" name="realm" value={c.realm} />
                  <input type="hidden" name="class_id" value={c.class_id} />
                  <input type="hidden" name="race_id" value={c.race_id} />
                  <input type="hidden" name="level" value={c.level} />
                  <input type="hidden" name="faction" value={c.faction} />
                  <input type="hidden" name="is_main" value="true" />
                  <button
                    type="submit"
                    className="text-xs bg-yellow-100 hover:bg-yellow-200 px-3 py-1 rounded"
                  >
                    Añadir como main
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
