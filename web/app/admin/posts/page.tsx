import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import { CATEGORIES, getCategoryStyle, formatDate } from "@/lib/posts";

type Post = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  published_at: string;
  subtitle: string | null;
  cover_url: string | null;
};

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

  const postsRes = await fetch("http://localhost:8000/posts/", { cache: "no-store" });
  const posts: Post[] = postsRes.ok ? await postsRes.json() : [];
  const { edit: editId } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Panel de posts</h1>
            <p className="text-gray-400 text-sm mt-1">{posts.length} posts publicados</p>
          </div>
          <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-300">
            &larr; Panel admin
          </Link>
        </div>

        {/* Formulario de creación */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-10">
          <h2 className="text-lg font-semibold mb-5">Nuevo post</h2>
          <form action="/api/admin/posts" method="POST" className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Título *</label>
              <input
                name="title"
                placeholder="Título del post"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Subtítulo</label>
              <input
                name="subtitle"
                placeholder="Una línea que se muestra en la home"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Imagen de portada (URL)</label>
              <input
                name="cover_url"
                placeholder="https://... o /hero/01.jpg"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Categoría</label>
              <select
                name="category"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
              >
                <option value="">Sin categoría</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Contenido *{" "}
                <span className="text-gray-600">
                  (separa párrafos con una línea en blanco)
                </span>
              </label>
              <textarea
                name="content"
                placeholder={"Escribe el contenido aquí...\n\nUsa líneas en blanco para separar párrafos."}
                required
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-y"
              />
            </div>
            <button
              type="submit"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Publicar
            </button>
          </form>
        </section>

        {/* Posts existentes */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Posts publicados</h2>
          {posts.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay posts todavía.</p>
          ) : (
            <ul className="space-y-3">
              {posts.map((post) => {
                const cat = getCategoryStyle(post.category);
                return (
                  <li key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    {editId === post.id ? (
                      <form action={`/api/admin/posts/${post.id}`} method="POST" className="p-5 space-y-3">
                        <input
                          name="title"
                          defaultValue={post.title}
                          required
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-semibold"
                        />
                        <input
                          name="subtitle"
                          defaultValue={post.subtitle ?? ""}
                          placeholder="Subtítulo"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                        />
                        <input
                          name="cover_url"
                          defaultValue={post.cover_url ?? ""}
                          placeholder="URL de portada"
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                        />
                        <select
                          name="category"
                          defaultValue={post.category ?? ""}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="">Sin categoría</option>
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <textarea
                          name="content"
                          defaultValue={post.content}
                          rows={6}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm resize-y"
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm">
                            Guardar
                          </button>
                          <Link href="/admin/posts" className="bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded-lg text-sm">
                            Cancelar
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <div className="p-5 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.badge}`}>
                              {cat.label}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(post.published_at)}</span>
                          </div>
                          <h3 className="font-semibold text-sm">{post.title}</h3>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{post.content}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link href={`/admin/posts?edit=${post.id}`} className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors">
                            Editar
                          </Link>
                          <DeleteButton postId={post.id} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
