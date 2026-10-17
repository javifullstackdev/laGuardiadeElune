"use client";

import { useEffect, useState } from "react";

type Dungeon = {
  slug: string;
  name: string;
  name_en: string;
  image_url: string | null;
  custom: boolean;
};

export default function DungeonCovers({ onUploaded }: { onUploaded?: () => void }) {
  const [items, setItems] = useState<Dungeon[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/points/dungeons");
    const data = await res.json().catch(() => []);
    if (res.ok && Array.isArray(data)) setItems(data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(slug: string, file: File) {
    setBusy(slug);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/admin/points/dungeons/${encodeURIComponent(slug)}/image`, {
      method: "POST",
      body,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(typeof data.detail === "string" ? data.detail : "No se pudo subir la imagen");
      return;
    }
    await load();
    onUploaded?.();
  }

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold">Imágenes de mazmorras</h2>
      <p className="text-sm text-gray-400 mt-1 mb-4">
        Por defecto se usa la de Raider.io. Sube aquí las que ya tienes y sustituyen esa portada en
        el historial.
      </p>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item) => (
          <li key={item.slug} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
            <div className="aspect-[16/9] bg-gray-800">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-gray-200 truncate">{item.name}</p>
              <label className="mt-2 block text-[11px] text-yellow-400/90 cursor-pointer hover:text-yellow-300">
                {busy === item.slug ? "Subiendo…" : item.custom ? "Cambiar imagen" : "Subir imagen"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={busy === item.slug}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void upload(item.slug, file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
