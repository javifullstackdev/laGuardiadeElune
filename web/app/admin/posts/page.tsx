import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) redirect("/");

  const userRes = await fetch("http://localhost:8000/users/me", {
    headers: { Cookie: `token=${token}` },
    cache: "no-store",
  });
  if (!userRes.ok) redirect("/");

  const user = await userRes.json();
  if (user.role !== "admin" && user.role !== "officer") redirect("/");

  const postsRes = await fetch("http://localhost:8000/posts/", {
    cache: "no-store",
  });
  const posts = await postsRes.json();

  const { edit: editId } = await searchParams;

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Panel — Gestión de posts</h1>

      <form action="/api/admin/posts" method="POST" className="flex flex-col gap-4 mb-12 border rounded-lg p-6">
        <h2 className="text-xl font-semibold">Crear nuevo post</h2>
        <input
          name="title"
          placeholder="Título"
          required
          className="border rounded px-3 py-2"
        />
        <input
          name="category"
          placeholder="Categoría (ej: noticias, lore...)"
          className="border rounded px-3 py-2"
        />
        <textarea
          name="content"
          placeholder="Contenido"
          required
          rows={5}
          className="border rounded px-3 py-2"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg self-start"
        >
          Publicar
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-4">Posts existentes</h2>
      <ul className="flex flex-col gap-4">
        {posts.map((post: any) => (
          <li key={post.id} className="border rounded-lg p-4">
            {editId === post.id ? (
              <form
                action={`/api/admin/posts/${post.id}`}
                method="POST"
                className="flex flex-col gap-3"
              >
                <input
                  name="title"
                  defaultValue={post.title}
                  required
                  className="border rounded px-3 py-2 font-semibold"
                />
                <input
                  name="category"
                  defaultValue={post.category ?? ""}
                  className="border rounded px-3 py-2 text-sm"
                />
                <textarea
                  name="content"
                  defaultValue={post.content}
                  rows={4}
                  className="border rounded px-3 py-2"
                />
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Guardar
                  </button>
                  <a
                    href="/admin/posts"
                    className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </a>
                </div>
              </form>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-sm text-gray-500">{post.category}</p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`/admin/posts?edit=${post.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    Editar
                  </a>
                  <form action={`/api/admin/posts/${post.id}/delete`} method="POST">
                    <button
                      type="submit"
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}