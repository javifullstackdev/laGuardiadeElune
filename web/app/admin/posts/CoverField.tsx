"use client";

import { useState } from "react";

const INPUT_CLASS =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500";

export default function CoverField({ defaultValue = "" }: { defaultValue?: string }) {
  const [url, setUrl] = useState(defaultValue);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/posts/cover", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "No se pudo subir la imagen");
      setUrl(data.cover_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-700 file:px-3 file:py-1.5 file:text-sm file:text-white hover:file:bg-gray-600"
      />
      <input
        name="cover_url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Sube un archivo o pega una URL"
        className={INPUT_CLASS}
      />
      {uploading && <p className="text-xs text-gray-400">Subiendo imagen...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {url && !uploading && (
        <img src={url} alt="Vista previa de la portada" className="h-24 rounded-lg border border-gray-800 object-cover" />
      )}
    </div>
  );
}
