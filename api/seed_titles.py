"""
Script de seed: crea los títulos iniciales y los asigna a los personajes.
Ejecutar con: python seed_titles.py

Requiere:
- La API corriendo en http://localhost:8000
- Un token JWT de un usuario con rol admin o officer
  (cópialo de la cookie 'token' en el navegador)
"""

import httpx
import sys

BASE = "http://localhost:8000"

# ─── Pega aquí tu token JWT de admin ───────────────────────────────────────
TOKEN = "PEGA_AQUI_TU_TOKEN_JWT"
# ───────────────────────────────────────────────────────────────────────────

HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

TITLES_TO_CREATE = [
    {
        "name": "Líder de la Guardia",
        "source": "rank",
        "description": "Ostentado por el fundador y líder de La Guardia de Elune.",
    },
    {
        "name": "La elegida de los Naaru",
        "source": "achievement",
        "description": "Título concedido por devoción y sacrificio en nombre de la Luz.",
    },
]

AWARDS = [
    {"title_name": "Líder de la Guardia",       "character_name": "Deyk",  "realm": "dun-modr"},
    {"title_name": "La elegida de los Naaru",   "character_name": "Naari", "realm": "dun-modr"},
]

def main():
    if TOKEN == "PEGA_AQUI_TU_TOKEN_JWT":
        print("ERROR: Debes pegar tu token JWT en la variable TOKEN.")
        sys.exit(1)

    client = httpx.Client(headers=HEADERS)

    # 1. Crear títulos
    title_map: dict[str, str] = {}
    for t in TITLES_TO_CREATE:
        print(f"Creando título '{t['name']}'...")
        r = client.post(f"{BASE}/titles/", json=t)
        if r.status_code == 201:
            tid = r.json()["id"]
            title_map[t["name"]] = tid
            print(f"  -> Creado con ID {tid}")
        elif r.status_code == 400 and "existe" in r.json().get("detail", ""):
            # Ya existe, obtener el ID de la lista
            all_titles = client.get(f"{BASE}/titles/").json()
            found = next((x for x in all_titles if x["name"] == t["name"]), None)
            if found:
                title_map[t["name"]] = found["id"]
                print(f"  -> Ya existe, ID {found['id']}")
        else:
            print(f"  ERROR: {r.status_code} {r.text}")

    # 2. Otorgar títulos a los personajes
    for award in AWARDS:
        tid = title_map.get(award["title_name"])
        if not tid:
            print(f"No se encontró el título '{award['title_name']}', saltando.")
            continue

        print(f"Otorgando '{award['title_name']}' a {award['character_name']}-{award['realm']}...")
        r = client.post(
            f"{BASE}/titles/{tid}/award",
            json={"character_name": award["character_name"], "character_realm": award["realm"]},
        )
        if r.status_code == 201:
            print(f"  -> Otorgado correctamente.")
        elif r.status_code == 400:
            print(f"  -> Ya tenia el título (o error): {r.json().get('detail')}")
        else:
            print(f"  ERROR: {r.status_code} {r.text}")

    print("\nSeed completado. Ahora cada jugador puede seleccionar su título favorito")
    print("desde su perfil web o puedes usar PATCH /characters/{name}/{realm}/favorite-title")

if __name__ == "__main__":
    main()
