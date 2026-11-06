"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type DrawEntry = {
  user_id: string;
  name: string;
  share_cents: number | null;
  paid: boolean;
  dropped: boolean;
  is_organizer: boolean;
};

export type GuildDraw = {
  id: string;
  title: string;
  summary: string | null;
  price_cents: number;
  draw_at: string;
  signup_closes_at: string;
  payment_due_at: string;
  status: "open" | "closed" | "drawn" | "cancelled";
  signup_open: boolean;
  ticket_number: string | null;
  ticket_series: string | null;
  bizum_phone: string;
  bizum_name: string;
  image_url: string | null;
  organizer_id: string;
  organizer_name: string;
  participant_count: number;
  buyer_retained_cents: number;
  my_joined: boolean;
  my_share_cents: number | null;
  my_paid: boolean;
  entries: DrawEntry[];
};

const STATUS: Record<GuildDraw["status"], string> = {
  open: "Lista abierta",
  closed: "Cuotas fijadas",
  drawn: "Sorteado",
  cancelled: "Cancelado",
};

function shareLine(draw: GuildDraw) {
  const amounts = draw.entries
    .filter((entry) => !entry.dropped && entry.share_cents != null)
    .map((entry) => entry.share_cents as number);
  if (amounts.length === 0) return "Sin partes";
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) return euros(min);
  return `${euros(min)} a ${euros(max)}`;
}

function euros(cents: number) {
  const abs = Math.abs(cents);
  const text = `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")} €`;
  return cents < 0 ? `-${text}` : text;
}

function madridInput(iso: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function detail(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "detail" in data) {
    const value = (data as { detail: unknown }).detail;
    if (typeof value === "string") return value;
  }
  return fallback;
}

async function send(path: string, method: string, body?: unknown) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(detail(data, "No se ha podido guardar"));
  return data;
}

export default function SorteosClient({
  initialDraws,
  loadError,
  isAdmin,
}: {
  initialDraws: GuildDraw[];
  loadError: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [draws, setDraws] = useState(initialDraws);
  const [error, setError] = useState(loadError);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setDraws(initialDraws);
  }, [initialDraws]);

  async function applyList(next: unknown) {
    if (Array.isArray(next)) setDraws(next as GuildDraw[]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {isAdmin && (
        <CreateDraw
          busy={busy === "create"}
          onCreate={async (body, file) => {
            setBusy("create");
            setError("");
            try {
              const previous = new Set(draws.map((draw) => draw.id));
              const next = (await send("/api/sorteos", "POST", body)) as GuildDraw[];
              const created = Array.isArray(next) ? next.find((draw) => !previous.has(draw.id)) : undefined;
              if (file && created) {
                const image = new FormData();
                image.append("file", file);
                const res = await fetch(`/api/sorteos/${created.id}/image`, { method: "POST", body: image });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  await applyList(next);
                  throw new Error(detail(data, "El sorteo se ha creado, pero la imagen no"));
                }
              }
              if (created) {
                router.push(`/sorteos/${created.id}`);
                router.refresh();
                return;
              }
              await applyList(next);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se ha podido guardar");
            } finally {
              setBusy("");
            }
          }}
        />
      )}

      {draws.length === 0 ? (
        <p className="text-sm text-gray-400">
          Todavía no hay ningún sorteo. Cuando se abra una peña, aparecerá aquí.
        </p>
      ) : (
        draws.map((draw) => <DrawSummary key={draw.id} draw={draw} />)
      )}
    </div>
  );
}

function CreateDraw({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (body: Record<string, unknown>, file: File | null) => void;
}) {
  const [accepted, setAccepted] = useState(true);

  function submit(form: FormData) {
    const file = form.get("image");
    onCreate(
      {
        title: String(form.get("title") || ""),
        summary: String(form.get("summary") || ""),
        price_euros: Number(form.get("price_euros") || 0),
        signup_closes_at: String(form.get("signup_closes_at") || ""),
        payment_due_at: String(form.get("payment_due_at") || ""),
        draw_at: String(form.get("draw_at") || ""),
        bizum_phone: String(form.get("bizum_phone") || ""),
        bizum_name: String(form.get("bizum_name") || ""),
        organizer_participates: accepted,
      },
      file instanceof File && file.size > 0 ? file : null,
    );
  }

  return (
    <details className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
      <summary className="cursor-pointer text-sm font-medium text-white">Abrir una peña</summary>
      <form
        className="mt-4 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit(new FormData(event.currentTarget));
        }}
      >
        <label className="sm:col-span-2 text-sm text-gray-300">
          Título
          <input
            name="title"
            required
            maxLength={160}
            placeholder="Lotería de Navidad 2026"
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="sm:col-span-2 text-sm text-gray-300">
          Nota
          <textarea
            name="summary"
            rows={2}
            maxLength={2000}
            placeholder="Décimo oficial, sin recargo. El número se publica al cerrar la lista."
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="text-sm text-gray-300">
          Precio del décimo
          <input
            name="price_euros"
            type="number"
            min={0.5}
            max={100}
            step={0.01}
            defaultValue={20}
            required
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
          <span className="mt-1 block text-xs text-gray-500">Navidad 2026: 20 €. Sin recargo.</span>
        </label>
        <label className="text-sm text-gray-300">
          Cierre de la lista
          <input
            name="signup_closes_at"
            type="datetime-local"
            required
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="text-sm text-gray-300">
          Límite del Bizum
          <input
            name="payment_due_at"
            type="datetime-local"
            required
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="text-sm text-gray-300">
          Sorteo
          <input
            name="draw_at"
            type="datetime-local"
            required
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="text-sm text-gray-300">
          Teléfono Bizum
          <input
            name="bizum_phone"
            required
            inputMode="tel"
            placeholder="600000000"
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="text-sm text-gray-300">
          Titular
          <input
            name="bizum_name"
            required
            maxLength={120}
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </label>
        <label className="sm:col-span-2 text-sm text-gray-300">
          Imagen
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-sm file:text-gray-200"
          />
          <span className="mt-1 block text-xs text-gray-500">JPEG, PNG o WebP. Hasta 5 MB. Opcional.</span>
        </label>
        <label className="sm:col-span-2 flex items-start gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-1"
          />
          Yo también participo. Mi parte es lo que ya pago al comprar el décimo, sin Bizum.
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
          >
            Publicar lista
          </button>
        </div>
      </form>
    </details>
  );
}

function DrawSummary({ draw }: { draw: GuildDraw }) {
  return (
    <Link
      href={`/sorteos/${draw.id}`}
      className="block overflow-hidden rounded-xl border border-white/10 hover:border-white/25"
    >
      {draw.image_url && (
        <img src={draw.image_url} alt="" className="h-44 w-full bg-black/40 object-cover" />
      )}
      <div className="space-y-2 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-semibold">{draw.title}</h2>
          <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-gray-300">{STATUS[draw.status]}</span>
        </div>
        <p className="text-xs text-gray-500">
          Sorteo {when(draw.draw_at)} · {euros(draw.price_cents)} · {draw.participant_count}{" "}
          {draw.participant_count === 1 ? "parte" : "partes"}
        </p>
        {draw.summary && <p className="line-clamp-2 text-sm text-gray-400">{draw.summary}</p>}
      </div>
    </Link>
  );
}

export function SorteoDetail({
  draw: initial,
  userId,
  isAdmin,
}: {
  draw: GuildDraw;
  userId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [draw, setDraw] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setDraw(initial);
  }, [initial]);

  async function applyList(next: unknown) {
    if (Array.isArray(next)) {
      const updated = (next as GuildDraw[]).find((item) => item.id === initial.id);
      if (!updated) {
        router.push("/sorteos");
        router.refresh();
        return;
      }
      setDraw(updated);
    }
    router.refresh();
  }

  async function run(key: string, path: string, method: string, body?: unknown) {
    setBusy(key);
    setError("");
    try {
      await applyList(await send(path, method, body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar");
    } finally {
      setBusy("");
    }
  }

  async function uploadImage(drawId: string, file: File) {
    setBusy(`${drawId}:image`);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/sorteos/${drawId}/image`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(detail(data, "No se ha podido guardar la imagen"));
      await applyList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se ha podido guardar la imagen");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <DrawCard
        page
        draw={draw}
        userId={userId}
        isAdmin={isAdmin}
        busy={busy}
        onRun={run}
        onUpload={uploadImage}
      />
    </div>
  );
}

function DrawShare({ title, path }: { title: string; path: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  const text = `${title} — La Guardia de Elune`;
  const wa = url ? `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` : "#";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={wa}
        target="_blank"
        rel="noreferrer"
        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-200"
      >
        WhatsApp
      </a>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-gray-200"
      >
        {copied ? "Enlace copiado" : "Copiar enlace"}
      </button>
    </div>
  );
}

function DrawCard({
  draw,
  userId,
  isAdmin,
  busy,
  onRun,
  onUpload,
  page = false,
}: {
  draw: GuildDraw;
  userId: string;
  isAdmin: boolean;
  busy: string;
  onRun: (key: string, path: string, method: string, body?: unknown) => void;
  onUpload: (drawId: string, file: File) => void;
  page?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);
  const mine = draw.organizer_id === userId;
  const concept = draw.ticket_number
    ? `Décimo ${draw.ticket_number}${draw.ticket_series ? ` serie ${draw.ticket_series}` : ""}`
    : draw.title;
  const showPayment =
    draw.status === "closed" &&
    draw.my_joined &&
    !mine &&
    !draw.my_paid &&
    Boolean(draw.ticket_number);

  return (
    <article className="rounded-xl border border-white/10 p-4 sm:p-6 space-y-4">
      {draw.image_url && (
        <img
          src={draw.image_url}
          alt={draw.title}
          className={`w-full rounded-lg bg-black/40 object-contain ${page ? "max-h-[70vh]" : "max-h-72"}`}
        />
      )}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {page ? (
            <h1 className="text-3xl font-quest-display font-bold sm:text-4xl">{draw.title}</h1>
          ) : (
            <h2 className="text-xl font-semibold">{draw.title}</h2>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Compra {draw.organizer_name} · sorteo {when(draw.draw_at)}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-gray-300">{STATUS[draw.status]}</span>
      </header>
      {page && <DrawShare title={draw.title} path={`/sorteos/${draw.id}`} />}

      {draw.summary && <p className="text-sm text-gray-300 whitespace-pre-wrap">{draw.summary}</p>}

      <dl className="grid gap-3 sm:grid-cols-3 text-sm">
        <div>
          <dt className="text-gray-500">Décimo</dt>
          <dd className="text-white">{euros(draw.price_cents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">{draw.my_joined ? "Tu parte" : "Por persona"}</dt>
          <dd className="text-white">
            {draw.my_joined && draw.my_share_cents != null ? euros(draw.my_share_cents) : shareLine(draw)}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Bizum</dt>
          <dd className="text-white">
            {draw.status === "open" ? `Como muy tarde el ${when(draw.payment_due_at)}` : when(draw.payment_due_at)}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-gray-400">
        {draw.status === "open"
          ? `La lista se cierra el ${when(draw.signup_closes_at)}. Hasta entonces el importe cambia si entra o sale alguien.`
          : draw.ticket_number
            ? `Décimo ${draw.ticket_number}${draw.ticket_series ? `, serie ${draw.ticket_series}` : ""}.`
            : "La cuota ya está fijada. El número del décimo se publicará aquí antes del Bizum."}
        {draw.buyer_retained_cents > 0 &&
          ` ${euros(draw.buyer_retained_cents)} se quedan en quien compra, porque el precio no divide en partes iguales o alguien quedó fuera.`}
      </p>

      <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
        {draw.entries.length === 0 && (
          <li className="px-4 py-3 text-sm text-gray-500">Nadie se ha apuntado.</li>
        )}
        {draw.entries.map((entry) => (
          <li key={entry.user_id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={entry.dropped ? "text-gray-500 line-through" : "text-white"}>
              {entry.name}
              {entry.is_organizer ? " · compra el décimo" : ""}
              {entry.dropped ? " · fuera" : ""}
            </span>
            <span className="flex items-center gap-3 text-gray-300">
              {entry.dropped ? "Su parte vuelve a quien compra" : entry.share_cents != null ? euros(entry.share_cents) : ""}
              {!entry.dropped && entry.is_organizer && draw.status !== "open" && " · pagado al comprar"}
              {!entry.dropped && !entry.is_organizer && entry.paid && " · Bizum recibido"}
              {isAdmin && draw.status === "closed" && !entry.is_organizer && !entry.dropped && (
                <>
                  <button
                    type="button"
                    disabled={busy === `${draw.id}:paid:${entry.user_id}`}
                    onClick={() =>
                      onRun(
                        `${draw.id}:paid:${entry.user_id}`,
                        `/api/sorteos/${draw.id}/entries/${entry.user_id}/paid`,
                        entry.paid ? "DELETE" : "POST",
                      )
                    }
                    className="px-2 py-1 rounded border border-white/15 text-xs text-gray-200"
                  >
                    {entry.paid ? "Quitar pago" : "Marcar Bizum"}
                  </button>
                  {!entry.paid && (
                    <button
                      type="button"
                      disabled={busy === `${draw.id}:drop:${entry.user_id}`}
                      onClick={() =>
                        onRun(
                          `${draw.id}:drop:${entry.user_id}`,
                          `/api/sorteos/${draw.id}/entries/${entry.user_id}/drop`,
                          "POST",
                        )
                      }
                      className="px-2 py-1 rounded border border-white/15 text-xs text-gray-400"
                    >
                      Sacar por impago
                    </button>
                  )}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {showPayment && draw.my_share_cents != null && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 space-y-2">
          <p>
            Envía {euros(draw.my_share_cents)} por Bizum a {draw.bizum_name}, {draw.bizum_phone}, antes
            del {when(draw.payment_due_at)}. Concepto: {concept}.
          </p>
          <button
            type="button"
            className="px-3 py-1.5 rounded border border-yellow-500/40 text-xs"
            onClick={() => navigator.clipboard.writeText(concept).catch(() => undefined)}
          >
            Copiar concepto
          </button>
        </div>
      )}

      {draw.status === "closed" && draw.my_joined && !mine && draw.my_paid && (
        <p className="text-sm text-gray-300">Tu Bizum está marcado. Conserva el resguardo del décimo que publique quien lo compró.</p>
      )}

      {draw.signup_open && !draw.my_joined && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1"
            />
            Soy mayor de 18 años. Acepto la parte igual que quede fijada al cerrar la lista, y que si
            no hago el Bizum ese día quedo fuera y esa parte se queda con quien compró el décimo.
          </label>
          <button
            type="button"
            disabled={!accepted || busy === `${draw.id}:join`}
            onClick={() => onRun(`${draw.id}:join`, `/api/sorteos/${draw.id}/join`, "POST", { accepted: true })}
            className="px-4 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
          >
            Apuntarme
          </button>
        </div>
      )}

      {draw.signup_open && draw.my_joined && (
        <button
          type="button"
          disabled={busy === `${draw.id}:leave`}
          onClick={() => onRun(`${draw.id}:leave`, `/api/sorteos/${draw.id}/join`, "DELETE")}
          className="px-4 py-2 rounded-lg border border-white/15 text-sm text-gray-300"
        >
          Salir de la lista
        </button>
      )}

      {draw.status === "open" && !draw.signup_open && (
        <p className="text-sm text-gray-400">
          El plazo para apuntarse ha terminado. Falta cerrar la lista para fijar las cuotas.
        </p>
      )}

      {isAdmin && <AdminTools draw={draw} busy={busy} onRun={onRun} onUpload={onUpload} />}
    </article>
  );
}

function AdminTools({
  draw,
  busy,
  onRun,
  onUpload,
}: {
  draw: GuildDraw;
  busy: string;
  onRun: (key: string, path: string, method: string, body?: unknown) => void;
  onUpload: (drawId: string, file: File) => void;
}) {
  const open = draw.status === "open";
  return (
    <div className="border-t border-white/10 pt-4 space-y-3">
      <details className="rounded-lg border border-white/10 px-3 py-2">
        <summary className="cursor-pointer text-sm text-gray-200">Modificar</summary>
        <form
          key={`${draw.id}-${draw.title}-${draw.price_cents}-${draw.draw_at}`}
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const body: Record<string, unknown> = {
              title: String(form.get("title") || ""),
              summary: String(form.get("summary") || ""),
              bizum_phone: String(form.get("bizum_phone") || ""),
              bizum_name: String(form.get("bizum_name") || ""),
            };
            if (open) {
              body.price_euros = Number(form.get("price_euros") || 0);
              body.signup_closes_at = String(form.get("signup_closes_at") || "");
              body.payment_due_at = String(form.get("payment_due_at") || "");
              body.draw_at = String(form.get("draw_at") || "");
            }
            onRun(`${draw.id}:edit`, `/api/sorteos/${draw.id}`, "PATCH", body);
          }}
        >
          <label className="sm:col-span-2 text-sm text-gray-300">
            Título
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={draw.title}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="sm:col-span-2 text-sm text-gray-300">
            Nota
            <textarea
              name="summary"
              rows={2}
              maxLength={2000}
              defaultValue={draw.summary ?? ""}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          {open && (
            <>
              <label className="text-sm text-gray-300">
                Precio del décimo
                <input
                  name="price_euros"
                  type="number"
                  min={0.5}
                  max={100}
                  step={0.01}
                  defaultValue={(draw.price_cents / 100).toFixed(2)}
                  required
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-sm text-gray-300">
                Cierre de la lista
                <input
                  name="signup_closes_at"
                  type="datetime-local"
                  required
                  defaultValue={madridInput(draw.signup_closes_at)}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-sm text-gray-300">
                Límite del Bizum
                <input
                  name="payment_due_at"
                  type="datetime-local"
                  required
                  defaultValue={madridInput(draw.payment_due_at)}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-sm text-gray-300">
                Sorteo
                <input
                  name="draw_at"
                  type="datetime-local"
                  required
                  defaultValue={madridInput(draw.draw_at)}
                  className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </label>
            </>
          )}
          <label className="text-sm text-gray-300">
            Teléfono Bizum
            <input
              name="bizum_phone"
              required
              defaultValue={draw.bizum_phone}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-sm text-gray-300">
            Titular
            <input
              name="bizum_name"
              required
              maxLength={120}
              defaultValue={draw.bizum_name}
              className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy === `${draw.id}:edit`}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-200 disabled:opacity-50"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </details>
      <label className="block text-sm text-gray-300">
        Imagen
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy === `${draw.id}:image`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(draw.id, file);
          }}
          className="mt-1 block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-sm file:text-gray-200"
        />
      </label>
      {draw.image_url && (
        <button
          type="button"
          disabled={busy === `${draw.id}:image`}
          onClick={() => onRun(`${draw.id}:image`, `/api/sorteos/${draw.id}/image`, "DELETE")}
          className="text-xs text-gray-500 hover:text-red-300 disabled:opacity-50"
        >
          Quitar imagen
        </button>
      )}
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onRun(`${draw.id}:ticket`, `/api/sorteos/${draw.id}`, "PATCH", {
            ticket_number: String(form.get("ticket_number") || ""),
            ticket_series: String(form.get("ticket_series") || ""),
          });
        }}
      >
        <label className="text-sm text-gray-300">
          Número
          <input
            name="ticket_number"
            defaultValue={draw.ticket_number ?? ""}
            maxLength={32}
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-gray-300">
          Serie
          <input
            name="ticket_series"
            defaultValue={draw.ticket_series ?? ""}
            maxLength={32}
            className="mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy === `${draw.id}:ticket`}
            className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-200 disabled:opacity-50"
          >
            Guardar décimo
          </button>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {draw.status === "open" && (
          <button
            type="button"
            disabled={busy === `${draw.id}:close`}
            onClick={() => onRun(`${draw.id}:close`, `/api/sorteos/${draw.id}/close`, "POST")}
            className="px-3 py-2 rounded-lg bg-yellow-500/90 hover:bg-yellow-400 text-black text-sm font-medium disabled:opacity-50"
          >
            Cerrar lista y fijar cuotas
          </button>
        )}
        {draw.status === "closed" && (
          <button
            type="button"
            disabled={busy === `${draw.id}:drawn`}
            onClick={() => onRun(`${draw.id}:drawn`, `/api/sorteos/${draw.id}/drawn`, "POST")}
            className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-200"
          >
            Marcar como sorteado
          </button>
        )}
        {draw.status !== "drawn" && draw.status !== "cancelled" && (
          <button
            type="button"
            disabled={busy === `${draw.id}:cancel`}
            onClick={() => onRun(`${draw.id}:cancel`, `/api/sorteos/${draw.id}/cancel`, "POST")}
            className="px-3 py-2 rounded-lg border border-white/15 text-sm text-gray-400"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          disabled={busy === `${draw.id}:delete`}
          onClick={() => {
            if (!window.confirm(`¿Borrar «${draw.title}»? Desaparece de la lista.`)) return;
            onRun(`${draw.id}:delete`, `/api/sorteos/${draw.id}`, "DELETE");
          }}
          className="px-3 py-2 rounded-lg border border-red-500/40 text-sm text-red-200 disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
