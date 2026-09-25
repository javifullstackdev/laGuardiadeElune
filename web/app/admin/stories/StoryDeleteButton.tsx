"use client";

export default function StoryDeleteButton({
  storyId,
  redirectTo = "/admin/stories",
}: {
  storyId: string;
  redirectTo?: string;
}) {
  async function handle() {
    if (!confirm("¿Seguro que quieres eliminar esta historia? Esta acción no se puede deshacer.")) {
      return;
    }
    const res = await fetch(`/api/admin/stories/${storyId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      window.location.href = redirectTo;
      return;
    }
    const data = await res.json().catch(() => null);
    alert(data?.detail ?? "No se pudo eliminar la historia.");
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
    >
      Eliminar
    </button>
  );
}
