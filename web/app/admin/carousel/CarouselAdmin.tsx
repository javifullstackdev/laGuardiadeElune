"use client";

import { useRef, useState, type PointerEvent } from "react";
import type { StoryPublic } from "@/lib/stories";
import type { WikiListItem } from "@/lib/wiki";

type Slide = {
  id: string;
  kind: "story" | "character" | "custom";
  src: string;
  kicker: string;
  title: string;
  subtitle: string;
  href: string;
  cta: string;
  is_active: boolean;
  sort_order: number;
  focus_x: number;
  focus_y: number;
};

const KIND_LABEL: Record<Slide["kind"], string> = {
  story: "Historia",
  character: "Personaje",
  custom: "Personalizado",
};

export default function CarouselAdmin({
  initialSlides,
  stories,
  characters,
}: {
  initialSlides: Slide[];
  stories: StoryPublic[];
  characters: WikiListItem[];
}) {
  const [slides, setSlides] = useState(initialSlides);
  const [kind, setKind] = useState<Slide["kind"]>("story");
  const [storyId, setStoryId] = useState(stories[0]?.id ?? "");
  const [characterKey, setCharacterKey] = useState(
    characters[0] ? `${characters[0].name}::${characters[0].realm}` : "",
  );
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [kicker, setKicker] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [href, setHref] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [framingId, setFramingId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/admin/hero");
    const data = res.ok ? await res.json() : [];
    setSlides(Array.isArray(data) ? data : []);
  }

  async function add() {
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      kind,
      title: title.trim() || null,
      subtitle: subtitle.trim() || null,
      kicker: kicker.trim() || null,
      image_url: imageUrl.trim() || null,
      href: href.trim() || null,
    };
    if (kind === "story") payload.story_id = storyId;
    if (kind === "character") {
      const [name, realm] = characterKey.split("::");
      payload.character_name = name;
      payload.character_realm = realm;
    }
    const res = await fetch("/api/admin/hero", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) setError(typeof data.detail === "string" ? data.detail : "No se pudo añadir");
    else {
      setTitle("");
      setSubtitle("");
      setKicker("");
      setImageUrl("");
      setHref("");
      await reload();
    }
    setBusy(false);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/hero/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await reload();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/hero/${id}`, { method: "DELETE" });
    if (res.ok) setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  async function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= slides.length) return;
    const ids = slides.map((s) => s.id);
    const [item] = ids.splice(index, 1);
    ids.splice(next, 0, item);
    const res = await fetch("/api/admin/hero/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = res.ok ? await res.json() : null;
    if (Array.isArray(data)) setSlides(data);
  }

  return (
    <div className="space-y-10">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Añadir al carrusel</h2>
        <p className="text-sm text-gray-400">
          Destaca una historia publicada, una ficha de personaje o un anuncio propio.
          Si no rellenas título o imagen, se usan los de esa historia o ficha.
        </p>

        <div className="flex flex-wrap gap-2">
          {(["story", "character", "custom"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                kind === value
                  ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                  : "border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>

        {kind === "story" && (
          <select
            value={storyId}
            onChange={(e) => setStoryId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {stories.length === 0 && <option value="">No hay historias publicadas</option>}
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} · {s.character_name}
              </option>
            ))}
          </select>
        )}

        {kind === "character" && (
          <select
            value={characterKey}
            onChange={(e) => setCharacterKey(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {characters.length === 0 && <option value="">No hay fichas publicadas</option>}
            {characters.map((c) => (
              <option key={`${c.name}-${c.realm}`} value={`${c.name}::${c.realm}`}>
                {c.display_name} · {c.realm}
              </option>
            ))}
          </select>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <input
            value={kicker}
            onChange={(e) => setKicker(e.target.value)}
            placeholder="Etiqueta (opcional)"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "custom" ? "Título *" : "Título (opcional)"}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
          />
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Subtítulo (opcional)"
            className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
          />
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Imagen (URL, opcional)"
            className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
          />
          {kind === "custom" && (
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="Enlace (/personajes/... o https://...)"
              className="sm:col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm placeholder:text-gray-600"
            />
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="button"
          onClick={add}
          disabled={busy || (kind === "story" && !storyId) || (kind === "character" && !characterKey)}
          className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold disabled:opacity-40"
        >
          {busy ? "Añadiendo..." : "Añadir al carrusel"}
        </button>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Orden del carrusel</h2>
        {slides.length === 0 ? (
          <p className="text-sm text-gray-500">
            Vacío. Mientras no haya diapositivas, la portada usa las imágenes de ambiente por defecto.
          </p>
        ) : (
          <ul className="space-y-3">
            {slides.map((slide, index) => (
              <li
                key={slide.id}
                className={`rounded-xl border p-3 space-y-3 ${
                  slide.is_active ? "border-gray-800 bg-gray-900" : "border-gray-800/60 bg-gray-950 opacity-60"
                }`}
              >
                <div className="flex gap-3">
                  <img
                    src={slide.src}
                    alt=""
                    style={{ objectPosition: `${slide.focus_x ?? 50}% ${slide.focus_y ?? 28}%` }}
                    className="w-28 h-16 rounded-md object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">
                      {KIND_LABEL[slide.kind]} · {slide.kicker}
                    </p>
                    <p className="text-sm text-white truncate">{slide.title}</p>
                    <p className="text-xs text-gray-500 truncate">{slide.href}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button type="button" onClick={() => move(index, -1)} className="text-xs text-gray-400 hover:text-white">
                      Subir
                    </button>
                    <button type="button" onClick={() => move(index, 1)} className="text-xs text-gray-400 hover:text-white">
                      Bajar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFramingId(framingId === slide.id ? null : slide.id)}
                      className="text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      Encuadrar
                    </button>
                    <button
                      type="button"
                      onClick={() => patch(slide.id, { is_active: !slide.is_active })}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {slide.is_active ? "Ocultar" : "Mostrar"}
                    </button>
                    <button type="button" onClick={() => remove(slide.id)} className="text-xs text-red-400 hover:text-red-300">
                      Quitar
                    </button>
                  </div>
                </div>
                {framingId === slide.id && (
                  <FrameEditor
                    slide={slide}
                    onSave={async (focus_x, focus_y) => {
                      await patch(slide.id, { focus_x, focus_y });
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function clampFocus(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function FrameEditor({
  slide,
  onSave,
}: {
  slide: Slide;
  onSave: (x: number, y: number) => Promise<void>;
}) {
  const savedX = slide.focus_x ?? 50;
  const savedY = slide.focus_y ?? 28;
  const [x, setX] = useState(savedX);
  const [y, setY] = useState(savedY);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const dirty = x !== savedX || y !== savedY;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x, y };
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = clampFocus(drag.current.x - ((e.clientX - drag.current.px) / rect.width) * 100);
    const ny = clampFocus(drag.current.y - ((e.clientY - drag.current.py) / rect.height) * 100);
    setX(nx);
    setY(ny);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  async function save() {
    setSaving(true);
    await onSave(x, y);
    setSaving(false);
  }

  return (
    <div className="space-y-3 border-t border-gray-800 pt-3">
      <p className="text-sm text-gray-300">Así se verá en la portada</p>
      <p className="text-xs text-gray-500">
        Arrastra la imagen con el ratón para moverla dentro del recuadro. Cuando quede bien, pulsa Guardar.
      </p>
      <div
        role="application"
        aria-label="Encuadrar imagen arrastrando"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative w-full overflow-hidden rounded-lg border border-gray-700 h-44 sm:h-56 select-none touch-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <img
          src={slide.src}
          alt=""
          draggable={false}
          style={{ objectPosition: `${x}% ${y}%` }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_2px_rgba(250,204,21,0.35)]" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold disabled:opacity-40"
        >
          {saving ? "Guardando..." : "Guardar encuadre"}
        </button>
        <button
          type="button"
          onClick={() => {
            setX(savedX);
            setY(savedY);
          }}
          disabled={!dirty || saving}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
        >
          Deshacer
        </button>
      </div>
    </div>
  );
}
