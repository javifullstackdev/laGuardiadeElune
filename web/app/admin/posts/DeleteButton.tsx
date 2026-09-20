"use client";

export default function DeleteButton({ postId }: { postId: string }) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("¿Seguro que quieres borrar este post? Esta acción no se puede deshacer.")) {
      e.preventDefault();
    }
  }

  return (
    <form
      action={`/api/admin/posts/${postId}/delete`}
      method="POST"
      onSubmit={handleSubmit}
    >
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
      >
        Borrar
      </button>
    </form>
  );
}
