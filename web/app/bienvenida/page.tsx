import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import MainPicker from "./MainPicker";
import PathPicker from "./PathPicker";

export default async function BienvenidaPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/");

  const headers = { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" };

  const [userRes, charsRes] = await Promise.all([
    fetch("http://localhost:8000/users/me",      { headers, cache: "no-store" }),
    fetch("http://localhost:8000/characters/my", { headers, cache: "no-store" }),
  ]);

  if (!userRes.ok) redirect("/");

  const user       = await userRes.json();
  const characters = charsRes.ok ? await charsRes.json() : [];
  const hasMain    = characters.some((c: { is_main: boolean }) => c.is_main);

  const step1Done = true;
  const step2Done = user.has_blizzard;
  const step3Done = step2Done && hasMain;
  // Paso 4: siempre tiene un path (default HYBRID), pero mostramos la opción de elegirlo
  const step4Done = step3Done;
  const allDone   = step1Done && step2Done && step3Done && step4Done;

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">

        {/* Cabecera */}
        <div className="text-center mb-10">
          <p className="text-4xl mb-3">⚔️</p>
          <h1 className="text-3xl font-bold">
            Bienvenido/a, {user.username}
          </h1>
          <p className="text-gray-400 mt-2">
            Configura tu perfil en La Guardia de Elune
          </p>
        </div>

        {/* Pasos */}
        <div className="space-y-4">

          {/* Paso 1 — Discord */}
          <StepCard
            number={1}
            title="Conectado con Discord"
            done={step1Done}
            active={false}
          >
            <div className="flex items-center gap-3 mt-2">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <div>
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-gray-400">{user.guild_title}</p>
              </div>
            </div>
          </StepCard>

          {/* Paso 2 — Battle.net */}
          <StepCard
            number={2}
            title="Conecta tu cuenta de Battle.net"
            done={step2Done}
            active={!step2Done}
          >
            {step2Done ? (
              <p className="text-sm text-blue-400 mt-2">
                ⚔️ {user.blizzard_battletag}
              </p>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-3">
                  Vincula tu cuenta de Blizzard para verificar tus personajes
                  de WoW automáticamente.
                </p>
                <a
                  href="http://localhost:8000/auth/blizzard/login"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
                >
                  🔗 Conectar Battle.net
                </a>
              </div>
            )}
          </StepCard>

          {/* Paso 3 — Personaje main */}
          <StepCard
            number={3}
            title="Elige tu personaje principal"
            done={step3Done}
            active={step2Done && !step3Done}
            locked={!step2Done}
          >
            {!step2Done ? (
              <p className="text-sm text-gray-600 mt-2">
                Disponible tras conectar Battle.net
              </p>
            ) : characters.length === 0 ? (
              <div className="mt-3">
                <p className="text-sm text-gray-400 mb-3">
                  Primero añade tus personajes desde Battle.net.
                </p>
                <Link
                  href="/personajes"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  + Añadir personajes
                </Link>
              </div>
            ) : step3Done ? (
              <div className="mt-2">
                {(() => {
                  const main = characters.find((c: { is_main: boolean }) => c.is_main);
                  return main ? (
                    <p className="text-sm text-yellow-400">
                      ⭐ {main.name}-{main.realm}
                    </p>
                  ) : null;
                })()}
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-sm text-gray-400 mb-1">
                  Selecciona cuál es tu main:
                </p>
                <MainPicker characters={characters} />
              </div>
            )}
          </StepCard>

          {/* Paso 4 — Itinerario */}
          <StepCard
            number={4}
            title="Elige tu itinerario"
            done={step4Done}
            active={step3Done}
            locked={!step3Done}
          >
            {!step3Done ? (
              <p className="text-sm text-gray-600 mt-2">
                Disponible tras elegir tu personaje principal
              </p>
            ) : (
              <div>
                <p className="text-xs text-gray-500 mt-2 mb-1">
                  Bloqueado al inicio de cada temporada · Puedes cambiarlo ahora
                </p>
                <PathPicker currentPath={user.path} />
              </div>
            )}
          </StepCard>

        </div>

        {/* CTA final */}
        <div className="mt-8 text-center">
          {allDone ? (
            <div>
              <p className="text-green-400 font-medium mb-4">
                🎉 ¡Todo listo! Tu perfil está configurado.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-colors"
              >
                Ver mi perfil →
              </Link>
            </div>
          ) : (
            <Link
              href="/profile"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Saltar por ahora →
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}

// ── Componente de tarjeta de paso ─────────────────────────────────────────

function StepCard({
  number,
  title,
  done,
  active,
  locked = false,
  children,
}: {
  number: number;
  title: string;
  done: boolean;
  active: boolean;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  const borderColor = done
    ? "border-green-500/50"
    : active
    ? "border-blue-500/50"
    : "border-gray-800";

  const bgGlow = done
    ? "bg-green-500/5"
    : active
    ? "bg-blue-500/5"
    : "bg-gray-900/50";

  return (
    <div className={`rounded-xl border px-5 py-4 transition-all ${borderColor} ${bgGlow}`}>
      <div className="flex items-center gap-3">
        {/* Indicador */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
            done
              ? "bg-green-500 text-white"
              : active
              ? "bg-blue-500 text-white"
              : "bg-gray-800 text-gray-500"
          }`}
        >
          {done ? "✓" : number}
        </div>

        {/* Título */}
        <p
          className={`font-semibold text-sm ${
            locked ? "text-gray-600" : "text-gray-100"
          }`}
        >
          {title}
        </p>

        {/* Badge */}
        {done && (
          <span className="ml-auto text-xs text-green-400 font-medium">
            Completado
          </span>
        )}
        {active && (
          <span className="ml-auto text-xs text-blue-400 font-medium">
            Pendiente
          </span>
        )}
        {locked && (
          <span className="ml-auto text-xs text-gray-600">🔒</span>
        )}
      </div>

      {children}
    </div>
  );
}
