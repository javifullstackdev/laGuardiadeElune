"""
Prueba puntual: ¿Raider.io da lo necesario para puntuar M+ automáticamente?

Para cada miembro del roster de la hermandad pide sus partidas recientes y, de unas
cuantas, el detalle con los 5 integrantes. Informa de cuántos eran de la hermandad.

    python scripts/spike_raiderio.py [--realm dun-modr] [--members 40] [--details 10]
"""

import argparse
import asyncio
from collections import Counter

import httpx

BASE = "https://raider.io/api/v1"
GUILD = "La Guardia de Elune"


def key(name: str, realm: str) -> tuple[str, str]:
    return name.casefold(), realm.casefold().replace("'", "").replace(" ", "-")


async def get(client: httpx.AsyncClient, path: str, **params) -> dict | None:
    try:
        res = await client.get(f"{BASE}{path}", params=params)
    except httpx.HTTPError as exc:
        print(f"  {type(exc).__name__} {path} {params.get('name', params.get('id'))}")
        return None
    if res.status_code != 200:
        print(f"  {res.status_code} {path} {params}")
        return None
    return res.json()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--realm", default="dun-modr")
    parser.add_argument("--members", type=int, default=40)
    parser.add_argument("--details", type=int, default=10)
    args = parser.parse_args()

    async with httpx.AsyncClient(timeout=20.0) as client:
        guild = await get(
            client, "/guilds/profile", region="eu", realm=args.realm, name=GUILD, fields="members"
        )
        if not guild:
            return
        members = guild["members"]
        roster = {key(m["character"]["name"], m["character"]["realm"]) for m in members}
        realms = Counter(m["character"]["realm"] for m in members)
        print(f"Roster: {len(members)} personajes. Reinos: {dict(realms)}\n")

        sem = asyncio.Semaphore(3)

        async def recent(m: dict) -> tuple[dict, list]:
            c = m["character"]
            async with sem:
                p = await get(
                    client, "/characters/profile", region="eu", realm=c["realm"],
                    name=c["name"], fields="mythic_plus_recent_runs",
                )
            return c, (p or {}).get("mythic_plus_recent_runs", [])

        results = await asyncio.gather(*(recent(m) for m in members[: args.members]))

        runs: dict[int, dict] = {}
        per_char = []
        for c, rs in results:
            if rs:
                per_char.append((c["name"], len(rs), rs[0]["completed_at"]))
            for r in rs:
                runs.setdefault(r["keystone_run_id"], r)

        print("Personajes con partidas recientes (nombre, nº, última):")
        for row in sorted(per_char, key=lambda r: r[2], reverse=True):
            print("  ", *row)
        print(f"\nPartidas únicas: {len(runs)}")
        if runs:
            sample = next(iter(runs.values()))
            print("Campos de una partida reciente:", sorted(sample.keys()))

        detailed = sorted(runs.values(), key=lambda r: r["completed_at"], reverse=True)
        print(f"\nDetalle de las {args.details} más recientes:")
        for r in detailed[: args.details]:
            # url: https://raider.io/mythic-plus-runs/<season>/<id>-...
            season = r["url"].split("/mythic-plus-runs/", 1)[1].split("/", 1)[0]
            async with sem:
                d = await get(
                    client, "/mythic-plus/run-details", season=season, id=r["keystone_run_id"],
                )
            if not d:
                continue
            roster_run = d.get("roster", [])
            names = [
                (x["character"]["name"], x["character"]["realm"]["name"]) for x in roster_run
            ]
            guildies = sum(1 for n, rl in names if key(n, rl) in roster)
            print(
                f"  {season} {r['completed_at']} {r['short_name']} +{r['mythic_level']} "
                f"timed={r['num_keystone_upgrades'] > 0} hermandad={guildies}/{len(names)} "
                f"{'PUNTÚA' if guildies >= 3 else ''}"
            )
            print("     ", ", ".join(f"{n}-{rl}" for n, rl in names))


if __name__ == "__main__":
    asyncio.run(main())
