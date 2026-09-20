import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Leer los datos del formulario HTML
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const realm = formData.get("realm") as string;
  const class_id = parseInt(formData.get("class_id") as string);
  const race_id_raw = formData.get("race_id");
  const race_id = race_id_raw ? parseInt(race_id_raw as string) : undefined;
  const level_raw = formData.get("level");
  const level = level_raw ? parseInt(level_raw as string) : undefined;
  const bchar_raw = formData.get("blizzard_character_id");
  const blizzard_character_id = bchar_raw ? parseInt(bchar_raw as string) : undefined;
  const faction = (formData.get("faction") as string) || undefined;
  const game    = (formData.get("game")    as string) || "retail";
  const surname = (formData.get("surname") as string) || undefined;
  const is_main = formData.get("is_main") === "true";

  const res = await fetch("http://localhost:8000/characters/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ name, realm, class_id, race_id, level, blizzard_character_id, faction, game, surname, is_main }),
  });

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.redirect(
      new URL(`/characters?error=${encodeURIComponent(error.detail)}`, request.url)
    );
  }

  return NextResponse.redirect(new URL("/characters", request.url));
}
