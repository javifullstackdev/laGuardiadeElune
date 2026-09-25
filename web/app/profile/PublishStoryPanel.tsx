"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { StoryMine } from "@/lib/stories";
import { RELATION_TYPES } from "@/lib/relations";

type Mention = {
  to_name: string;
  to_realm: string;
  owner_username: string;
  relation_type: string;
  met_at: string;
  note: string;
};

type SearchHit = {
  name: string;
  realm: string;
  wow_class: string | null;
  owner_username: string;
};

const STATUS_LABEL: Record<StoryMine["status"], string> = {
  pending: "Pendiente",
  approved: "Publicada",
  rejected: "Rechazada",
};

const STATUS_CLASS: Record<StoryMine["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PublishStoryPanel({
  name,
  realm,
  onSubmitted,
}: {
  name: string;
  realm: string;
  onSubmitted?: (story: StoryMine) => void;
}) {
  const [stories, setStories] = useState<StoryMine[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stories/mine?name=${encodeURIComponent(name)}&realm=${encodeURIComponent(realm)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStories(Array.isArray(d) ? d : d ? [d] : []))
      .finally(() => setLoading(false));
  }, [name, realm]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function search(v: string) {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    if (!v.trim()) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/characters/search?q=${encodeURIComponent(v)}`);
      const data: SearchHit[] = res.ok ? await res.json() : [];
      setHits(data.filter((c) => !(c.name === name && c.realm === realm)));
    }, 250);
  }

  function addHit(hit: SearchHit) {
    if (mentions.some((m) => m.to_name === hit.name && m.to_realm === hit.realm)) return;
    setMentions((prev) => [
      ...prev,
      {
        to_name: hit.name,
        to_realm: hit.realm,
        owner_username: hit.owner_username,
        relation_type: "friend",
        met_at: "",
        note: "",
      },
    ]);
    setQuery("");
    setHits([]);
  }

  function update(i: number, patch: Partial<Mention>) {
    setMentions((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  function onCover(file: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function submit() {
    setSending(true);
    setError(null);
    const fd = new FormData();
    fd.append("name", name);
    fd.append("realm", realm);
    if (title.trim()) fd.append("title", title.trim());
    fd.append("body", body);
    fd.append(
      "mentions",
      JSON.stringify(
        mentions.map((m) => ({
          to_name: m.to_name,
          to_realm: m.to_realm,
          relation_type: m.relation_type,
          met_at: m.met_at || null,
          note: m.note || null,
        })),
      ),
    );
    if (cover) fd.append("cover", cover);
    const res = await fetch("/api/stories", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo enviar");
    } else {
      setStories((prev) => [data, ...prev]);
      setOpenId(data.id);
      setTitle("");
      setBody("");
      onCover(null);
      if (fileRef.current) fileRef.current.value = "";
      setMentions([]);
      onSubmitted?.(data);
    }
    setSending(false);
  }

  if (loading) return null;

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-6">
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Envíos anteriores</h3>
        <p className="text-sm text-gray-400">
          Relatos que escribes tú. El Eremita los revisa antes de publicarlos en Historias. No sustituyen la ficha.
        </p>
      </div>

      {stories.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no has enviado ninguna historia de este personaje.</p>
      ) : (
        <ul className="space-y-3">
          {stories.map((story) => {
            const open = openId === story.id;
            return (
              <li key={story.id} className="rounded-lg border border-gray-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : story.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-800/50"
                >
                  <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                    {story.cover_url ? (
                      <img src={story.cover_url} alt="" className="w-full h-full object-cover object-top" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-100 truncate">{story.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatShort(story.submitted_at)}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CLASS[story.status]}`}>
                    {STATUS_LABEL[story.status]}
                  </span>
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
                    {story.awaiting_relations && (
                      <p className="text-xs text-amber-400">
                        Aún faltan confirmaciones de los personajes mencionados.
                      </p>
                    )}
                    {story.status === "rejected" && story.rejection_reason && (
                      <p className="text-xs text-red-300">{story.rejection_reason}</p>
                    )}
                    {story.biography && (
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{story.biography}</p>
                    )}
                    {story.personality && (
                      <p className="text-sm text-gray-400">
                        <span className="text-gray-500">Personalidad: </span>
                        {story.personality}
                      </p>
                    )}
                    {story.appearance && (
                      <p className="text-sm text-gray-400">
                        <span className="text-gray-500">Aspecto: </span>
                        {story.appearance}
                      </p>
                    )}
                    <Link
                      href={`/lore/${story.id}`}
                      className="inline-block text-xs text-yellow-400 hover:underline"
                    >
                      Abrir en página completa
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-gray-800 pt-4 space-y-4">
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Nueva historia</h3>
          <p className="text-sm text-gray-400">
            Escribe el relato aquí. Si nombra a alguien de la hermandad, elígelo debajo — no hace falta un @.
            Si no adjuntas imagen, se usará la del personaje.
          </p>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Título (opcional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Historia de ${name}`}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Relato</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="Cuenta una historia de este personaje..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 resize-y leading-relaxed"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Portada (opcional)</label>
          <p className="text-xs text-gray-600 mb-2">JPEG, PNG o WebP. Máximo 5 MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => onCover(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-sm file:text-gray-200"
          />
          {coverPreview && (
            <div className="mt-3 relative w-full max-w-xs overflow-hidden rounded-lg border border-gray-800">
              <img src={coverPreview} alt="" className="w-full max-h-40 object-cover object-top" />
              <button
                type="button"
                onClick={() => {
                  onCover(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/70 text-gray-200"
              >
                Quitar
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <label className="text-xs text-gray-500 block mb-1">Personajes de la hermandad mencionados</label>
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Buscar en el roster..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600"
          />
          {query && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
              {hits.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500">Sin resultados en la hermandad</p>
              ) : (
                hits.map((h) => (
                  <button
                    key={`${h.name}-${h.realm}`}
                    type="button"
                    onClick={() => addHit(h)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                  >
                    {h.name} <span className="text-gray-500">{h.realm}</span>
                    <span className="text-gray-600 text-xs ml-2">{h.owner_username}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {mentions.map((m, i) => (
          <div key={`${m.to_name}-${m.to_realm}`} className="rounded-lg border border-gray-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-200">
                {m.to_name} <span className="text-gray-500 text-xs">({m.owner_username})</span>
              </p>
              <button type="button" onClick={() => setMentions((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-gray-500">
                Quitar
              </button>
            </div>
            <select
              value={m.relation_type}
              onChange={(e) => update(i, { relation_type: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
            >
              {RELATION_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <input
              value={m.met_at}
              onChange={(e) => update(i, { met_at: e.target.value })}
              placeholder="Dónde se conocieron (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
            />
            <input
              value={m.note}
              onChange={(e) => update(i, { note: e.target.value })}
              placeholder="Nota breve (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
            />
          </div>
        ))}

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={sending || body.trim().length < 80}
          className="px-3 py-1.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
        >
          {sending ? "Enviando..." : body.trim().length < 80 ? "Escribe la historia primero" : "Enviar a revisión"}
        </button>
      </div>
    </section>
  );
}
