import Link from "next/link";

export default async function Home() {

  const res = await fetch("http://127.0.0.1:8000/posts/", { cache: "no-store" });
  const posts = await res.json();
  
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Posts de la hermandad</h1>
      <ul className="flex flex-col gap-4">
        {posts.map((post: any) => (
          <li key={post.id} className="border rounded-lg p-4">
            <Link href={`/posts/${post.id}`}>
              <h2 className="text-xl font-semibold">{post.title}</h2>
            </Link>
            <p className="text-gray-500 text-sm mt-1">{post.category}</p>
            <p className="mt-2">{post.content}</p>
          </li>
        ))}
      </ul>
    </main>
  );

}
