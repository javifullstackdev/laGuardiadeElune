# OAuth producción (Discord + Blizzard)

Hazlo **en paralelo** al VPS. No borres los redirects de localhost.

## Discord

1. https://discord.com/developers/applications
2. Tu app de La Guardia → **OAuth2** → **Redirects**
3. **Add Redirect**:

```
https://www.laguardiadeelune.com/api/auth/discord/callback
```

4. Save

## Blizzard / Battle.net

1. https://develop.battle.net/access/clients
2. Tu cliente → Redirect URLs
3. Añade:

```
https://www.laguardiadeelune.com/api/auth/blizzard/callback
```

4. Save

## Comprobar después del deploy

- Abrir `https://www.laguardiadeelune.com`
- Login Discord
- Vincular Battle.net desde perfil / personajes
