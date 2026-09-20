import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AddCharacterRow from "./AddCharacterRow";

type MyCharacter = {
  name: string;
  realm: string;
  game: string;
  surname: string | null;
  wow_class: string | null;
  is_main: boolean;
  is_verified: boolean;
  blizzard_character_id: number | null;
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

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };

  const myRes = await fetch("http://localhost:8000/characters/my", { headers, cache: "no-store" });
  if (!myRes.ok && myRes.status === 401) redirect("/");
  const myCharacters: MyCharacter[] = myRes.ok ? await myRes.json() : [];

  // Auto-sincronizar blizzard_character_id de los personajes retail existentes
  // Es idempotente: solo rellena los que tienen NULL
  const needsSync = myCharacters.some(
    (c) => c.game !== "forever" && !c.blizzard_character_id
  );
  if (needsSync) {
    fetch("http://localhost:8000/characters/sync-blizzard-ids", {
      method: "POST", headers, cache: "no-store",
    }).catch(() => {/* silencioso */});
  }

  const bnetRes = await fetch("http://localhost:8000/characters/blizzard", { headers, cache: "no-store" });
  const bnetCharacters: BlizzardCharacter[] = bnetRes.ok ? await bnetRes.json() : [];
  const bnetError = !bnetRes.ok ? (await bnetRes.json()).detail : null;

  // Personajes de Blizzard aún no añadidos en ninguna línea temporal
  const registeredKeys = new Set(myCharacters.map((c) => `${c.name}-${c.realm}`));
  const unregistered = bnetCharacters.filter(
    (c) => !registeredKeys.has(`${c.name}-${c.realm}`)
  );

  const params = await searchParams;
  const formError = params.error;

  // Agrupar personajes registrados por juego
  const retailChars   = myCharacters.filter((c) => c.game !== "forever");
  const foreverChars  = myCharacters.filter((c) => c.game === "forever");

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-8">Mis Personajes</h1>

      {formError && (
        <p className="text-red-500 mb-4 text-sm">{decodeURIComponent(formError)}</p>
      )}

      {/* ── Personajes registrados ── */}
      {myCharacters.length > 0 && (
        <section className="mb-10 space-y-6">

          {retailChars.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">
                World of Warcraft
              </h2>
              <ul className="space-y-2">
                {retailChars.map((c) => (
                  <CharacterBadge key={`${c.name}-${c.realm}-retail`} char={c} />
                ))}
              </ul>
            </div>
          )}

          {foreverChars.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-3">
                Warcraft Forever
              </h2>
              <ul className="space-y-2">
                {foreverChars.map((c) => (
                  <CharacterBadge key={`${c.name}-${c.realm}-forever`} char={c} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Importar desde Battle.net ── */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Importar desde Battle.net</h2>
        <p className="text-gray-500 text-sm mb-4">
          Selecciona el juego en cada personaje. Para <strong>Warcraft Forever</strong> se requiere apellido.
          Un mismo personaje puede registrarse en ambas líneas temporales.
        </p>

        {bnetError ? (
          <div className="border rounded-lg p-4">
            <p className="text-gray-500 text-sm mb-3">{bnetError}</p>
            <a
              href="http://localhost:8000/auth/blizzard/login"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
            >
              Conectar Battle.net
            </a>
          </div>
        ) : bnetCharacters.length === 0 ? (
          <p className="text-gray-500 text-sm">No se encontraron personajes en esta cuenta.</p>
        ) : (
          <ul className="space-y-3">
            {bnetCharacters.map((c) => (
              <AddCharacterRow key={c.blizzard_character_id} c={c} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CharacterBadge({ char }: { char: MyCharacter }) {
  const isForever = char.game === "forever";
  return (
    <li className="flex items-center gap-2 border rounded px-4 py-2">
      <span className="font-semibold">{char.name}</span>
      {char.surname && <span className="text-gray-500 text-sm">{char.surname}</span>}
      <span className="text-gray-400 text-sm">· {char.realm}</span>
      {char.is_main && (
        <span className="text-xs text-yellow-600 border border-yellow-400/40 rounded-full px-2 py-0.5">main</span>
      )}
      {char.is_verified && (
        <span className="text-xs text-blue-500 border border-blue-400/30 rounded-full px-2 py-0.5">verificado</span>
      )}
      {isForever && (
        <span className="ml-auto text-xs text-amber-600 border border-amber-400/40 rounded-full px-2 py-0.5 font-medium">Forever</span>
      )}
    </li>
  );
}
