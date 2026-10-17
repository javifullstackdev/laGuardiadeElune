# Convenciones del repo

La UI, los comandos de Discord y los textos para el jugador van en **español**.
El código y Git van en **inglés**.

## Ramas

Nombres en inglés, kebab-case, con prefijo:

- `feat/profile-details-tab`
- `fix/bubu-register-character`
- `docs/web-guide`

No uses español: `feat/profile-datos-tab` no.

## Archivos y carpetas

Nombres en inglés: `ProfileClient.tsx`, `web-guide.md`, `entitlements.ts`.

## Commits y PRs

Mensajes de commit, **título y descripción de PR** en inglés. Estilo conventional commits, explicando el porqué. El chat con el usuario puede ir en español.

```
feat: add a Details tab and hide profile scrollbars

Keep the public sheet in Bio and move editable identity fields to their own tab.
```

## Git: el usuario ejecuta los comandos

Cuando pida **subir, hacer commit, crear rama o abrir un PR**, dale los comandos de PowerShell para copiarlos y ejecutarlos. No los lances tú salvo que lo pida de forma explícita.

Así aprende Git. Recuérdalo en cada sesión.

## Deploy / producción

Guía operativa y de aprendizaje (VPS Hetzner, ramas, commits, OAuth, smoke):  
`docs/deploy-hetzner.md`.
