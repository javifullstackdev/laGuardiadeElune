type Post = {
    id: string;
    title: string;
    content: string;
    category: string | null;
    published_at: string;
};

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const res = await fetch(`http://127.0.0.1:8000/posts/${id}`, { cache: "no-store" });

    if (!res.ok) {
        return <p>Post no encontrado.</p>;
    }

    const post: Post = await res.json();

    return (
        <main className="max-w-3xl mx-auto py-12 px-4">
          <p className="text-sm text-gray-500 mb-2">{post.category}</p>
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          <p className="text-gray-400 text-sm mb-8">{post.published_at}</p>
          <p>{post.content}</p>
        </main>
      );
    }