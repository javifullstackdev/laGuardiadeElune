"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import HoverGif from "@/app/components/HoverGif";
import { storyExcerpt, storyHref, type StoryMine } from "@/lib/stories";
import { RELATION_TYPES } from "@/lib/relations";
import EremitaNote from "./EremitaNote";

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
  changes_requested: "Cambios pedidos",
  approved: "Publicada",
  rejected: "Rechazada",
};

const STATUS_CLASS: Record<StoryMine["status"], string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  changes_requested: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
};

function canRevise(status: StoryMine["status"]) {
  return status === "changes_requested" || status === "rejected";
}

function formatShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function MentionFields({
  name,
  realm,
  mentions,
  onChange,
}: {
  name: string;
  realm: string;
  mentions: Mention[];
  onChange: (next: Mention[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/characters/search?q=${encodeURIComponent(value)}`);
      const data: SearchHit[] = res.ok ? await res.json() : [];
      setHits(data.filter((c) => !(c.name === name && c.realm === realm)));
    }, 250);
  }

  function addHit(hit: SearchHit) {
    if (mentions.some((m) => m.to_name === hit.name && m.to_realm === hit.realm)) return;
    onChange([
      ...mentions,
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
    onChange(mentions.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }

  return (
    <div className="space-y-2">
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
            <button type="button" onClick={() => onChange(mentions.filter((_, idx) => idx !== i))} className="text-xs text-gray-500">
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
    </div>
  );
}

function mentionsFromStory(story: StoryMine): Mention[] {
  return (story.relations ?? [])
    .filter((relation) => relation.relation_type !== "appears")
    .map((relation) => ({
      to_name: relation.name,
      to_realm: relation.realm,
      owner_username: relation.owner_username,
      relation_type: relation.relation_type,
      met_at: relation.met_at ?? "",
      note: relation.note ?? "",
    }));
}

function StoryRevision({
  story,
  name,
  realm,
  onSaved,
}: {
  story: StoryMine;
  name: string;
  realm: string;
  onSaved: (story: StoryMine) => void;
}) {
  const [title, setTitle] = useState(story.title);
  const [subtitle, setSubtitle] = useState(story.subtitle ?? "");
  const [body, setBody] = useState(story.biography ?? "");
  const [mentions, setMentions] = useState<Mention[]>(() => mentionsFromStory(story));
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const asked = story.status === "changes_requested";

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function onCover(file: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCover(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function resubmit() {
    setSending(true);
    setError(null);
    const fd = new FormData();
    fd.append("title", title.trim());
    if (subtitle.trim()) fd.append("subtitle", subtitle.trim());
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
    const res = await fetch(`/api/stories/${story.id}/resubmit`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo enviar");
      setSending(false);
      return;
    }
    onSaved(data);
    setSending(false);
  }

  return (
    <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
      <EremitaNote
        tone={asked ? "amber" : "red"}
        title={asked ? "El Eremita te pide cambios" : "El Eremita ha rechazado esta historia"}
        reason={story.rejection_reason}
        next={
          asked
            ? "Corrige el relato y pulsa Enviar de nuevo."
            : "No se ha publicado. Puedes reescribirla y enviarla de nuevo."
        }
      />
      <div>
        <label className="text-xs text-gray-500 block mb-1">Título</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Subtítulo (opcional)</label>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          maxLength={80}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Relato</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 resize-y leading-relaxed"
        />
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-1">Portada</label>
        <p className="text-xs text-gray-500 mb-2">Si no eliges otra, se mantiene la portada actual.</p>
        {story.cover_url && !coverPreview ? (
          <img src={story.cover_url} alt="" className="mb-2 w-full max-w-xs max-h-40 rounded-lg object-cover object-top border border-gray-800" />
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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
      <MentionFields name={name} realm={realm} mentions={mentions} onChange={setMentions} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="button"
        onClick={resubmit}
        disabled={sending || body.trim().length < 80}
        className="px-3 py-1.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
      >
        {sending ? "Enviando..." : "Enviar de nuevo"}
      </button>
    </div>
  );
}

export default function PublishStoryPanel({
  name,
  realm,
  onSubmitted,
  initialOpenId = null,
}: {
  name: string;
  realm: string;
  onSubmitted?: (story: StoryMine) => void;
  initialOpenId?: string | null;
}) {
  const [stories, setStories] = useState<StoryMine[]>([]);
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [mentions, setMentions] = useState<Mention[]>([]);
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
    if (subtitle.trim()) fd.append("subtitle", subtitle.trim());
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
      setSubtitle("");
      setBody("");
      onCover(null);
      if (fileRef.current) fileRef.current.value = "";
      setMentions([]);
      onSubmitted?.(data);
    }
    setSending(false);
  }

  if (loading) {
    return <p className="text-gray-600 text-sm">Cargando historias...</p>;
  }

  return (
    <section className="space-y-8">
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 space-y-4">
        <div>
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Nueva historia</h3>
          <p className="text-sm text-gray-400">
            Escríbela y envíala al Eremita. Si nombra a alguien de la hermandad, elígelo debajo — no hace falta un @.
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
          <label className="text-xs text-gray-500 block mb-1">Subtítulo (opcional)</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Capítulo I"
            maxLength={80}
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
          <p className="text-xs text-gray-600 mb-2">JPEG, PNG, WebP o GIF. Hasta 5 MB; un GIF, hasta 12 MB.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
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

        <MentionFields name={name} realm={realm} mentions={mentions} onChange={setMentions} />

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={sending || body.trim().length < 80}
          className="px-3 py-1.5 rounded-lg text-sm bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
        >
          {sending ? "Enviando..." : body.trim().length < 80 ? "Escribe la historia primero" : "Enviar al Eremita"}
        </button>
      </div>

      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Historias de este personaje</h3>
        <p className="text-sm text-gray-400 mb-4">
          El Eremita las revisa antes de publicarlas. Si pide cambios o la rechaza, ábrela, corrígela y envíala de nuevo. No sustituyen la ficha.
        </p>
      </div>

      {stories.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no ha enviado ninguna historia.</p>
      ) : (
        <ul className="space-y-3">
          {stories.map((story) => {
            const open = openId === story.id;
            const excerpt = storyExcerpt(story);
            return (
              <li key={story.id} data-gif-hover className={`rounded-lg border border-gray-800 ${open ? "overflow-visible" : "overflow-hidden"}`}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : story.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-800/50"
                >
                  <div className="w-14 h-14 shrink-0 rounded-md overflow-hidden bg-gray-800 border border-gray-700">
                    {story.cover_url ? (
                      <HoverGif src={story.cover_url} alt="" className="w-full h-full object-cover object-top" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-100 truncate">{story.title}</p>
                    {story.subtitle ? (
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 mt-0.5 truncate">
                        {story.subtitle}
                      </p>
                    ) : null}
                    {excerpt && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{excerpt}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">{formatShort(story.submitted_at)}</p>
                    {canRevise(story.status) && (
                      <p className={`text-xs mt-0.5 ${story.status === "rejected" ? "text-red-300" : "text-amber-300"}`}>
                        Ábrela para corregirla y enviarla de nuevo
                      </p>
                    )}
                  </div>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${STATUS_CLASS[story.status]}`}>
                    {STATUS_LABEL[story.status]}
                  </span>
                </button>
                {open && canRevise(story.status) && (
                  <StoryRevision
                    story={story}
                    name={name}
                    realm={realm}
                    onSaved={(next) => {
                      setStories((prev) => prev.map((row) => (row.id === next.id ? next : row)));
                    }}
                  />
                )}
                {open && !canRevise(story.status) && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-800 pt-3">
                    {story.status === "pending" && (
                      <p className="text-xs text-amber-300">
                        El Eremita está revisando esta historia. La respuesta llega al buzón.
                      </p>
                    )}
                    {story.awaiting_relations && (
                      <p className="text-xs text-amber-400">
                        Aún faltan confirmaciones de los personajes mencionados.
                      </p>
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
                      href={storyHref(story)}
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
    </section>
  );
}
