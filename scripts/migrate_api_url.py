"""One-shot: replace localhost:8000 with apiUrl()/publicApiUrl()."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "web"


def ensure_import(text: str, names: list[str]) -> str:
    if "from \"@/lib/api\"" in text or "from '@/lib/api'" in text:
        # Merge into existing import if present
        def merge(m: re.Match[str]) -> str:
            existing = {n.strip() for n in m.group(1).split(",")}
            existing.update(names)
            ordered = [n for n in ("apiUrl", "publicApiUrl") if n in existing]
            return f'import {{ {", ".join(ordered)} }} from "@/lib/api";'

        return re.sub(
            r'import\s*\{\s*([^}]+)\s*\}\s*from\s*["\']@/lib/api["\']\s*;',
            merge,
            text,
            count=1,
        )

    import_line = f'import {{ {", ".join(names)} }} from "@/lib/api";\n'
    matches = list(re.finditer(r"^import .+;\s*\n", text, re.M))
    if matches:
        last = matches[-1]
        return text[: last.end()] + import_line + text[last.end() :]
    return import_line + text


def transform(text: str) -> str:
    text = text.replace(
        'href="http://localhost:8000/auth/blizzard/login"',
        'href={publicApiUrl("/auth/blizzard/login")}',
    )
    text = text.replace(
        'href="http://localhost:8000/auth/discord/login"',
        'href={publicApiUrl("/auth/discord/login")}',
    )
    text = text.replace(
        'const loginHref = "http://localhost:8000/auth/discord/login"',
        'const loginHref = publicApiUrl("/auth/discord/login")',
    )
    text = text.replace(
        'href: "http://localhost:8000/auth/discord/login"',
        'href: publicApiUrl("/auth/discord/login")',
    )

    text = re.sub(
        r'"http://localhost:8000(/[^"]*)"',
        lambda m: f'apiUrl("{m.group(1)}")',
        text,
    )
    text = re.sub(
        r"`http://localhost:8000(/[^`]*)`",
        lambda m: f"apiUrl(`{m.group(1)}`)",
        text,
    )

    text = text.replace(
        'NextResponse.redirect("http://localhost:3000/")',
        'NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"))',
    )
    return text


def main() -> None:
    changed: list[str] = []
    for path in list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx")):
        if path.name == "api.ts" and path.parent.name == "lib":
            continue
        orig = path.read_text(encoding="utf-8")
        if "localhost:8000" not in orig and "localhost:3000" not in orig:
            continue
        text = transform(orig)
        names: list[str] = []
        if "apiUrl(" in text:
            names.append("apiUrl")
        if "publicApiUrl(" in text:
            names.append("publicApiUrl")
        if names:
            text = ensure_import(text, names)
        if text != orig:
            path.write_text(text, encoding="utf-8")
            changed.append(str(path.relative_to(ROOT.parent)))

    print(f"Updated {len(changed)} files")
    for c in changed:
        print(c)

    leftover = []
    for path in list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx")):
        if path.name == "api.ts":
            continue
        t = path.read_text(encoding="utf-8")
        if "localhost:8000" in t:
            leftover.append(str(path))
    if leftover:
        print("LEFTOVER localhost:8000:")
        for p in leftover:
            print(p)
    else:
        print("No leftover localhost:8000 in web ts/tsx")


if __name__ == "__main__":
    main()
