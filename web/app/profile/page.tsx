import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        redirect("/");
    }

    const res = await fetch("http://localhost:8000/users/me", {
        headers: {
            "Cookie": `token=${token}`,
        },
        cache: "no-store",
    
    });

    if (!res.ok) {
        redirect("/");
    }

    const user = await res.json();

    return (
        <main className="max-w-2xl mx-auto py-12 px-4">
          <div className="flex items-center gap-4 mb-8">
            {user.avatar_url && (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{user.username}</h1>
              <p className="text-gray-500">{user.guild_title}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p><span className="font-semibold">Rol:</span> {user.role}</p>
            <p><span className="font-semibold">Itinerario:</span> {user.path}</p>
            <p><span className="font-semibold">Puntos totales:</span> {user.total_points}</p>
          </div>
        </main>
      );
    }