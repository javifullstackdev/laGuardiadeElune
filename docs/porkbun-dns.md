# DNS en Porkbun (tras tener la IPv4 del VPS)

1. https://porkbun.com/account/domains
2. Busca `laguardiadeelune.com` → **DNS**
3. Borra registros A/CNAME/ALIAS del parking que apunten a Porkbun (`uixie.porkbun.com` o IPs `207.207.210.*`)
4. Crea:

| Type | Host | Answer | TTL |
|------|------|--------|-----|
| A | (vacío) | `TU_IPV4` | 300 |
| A | `www` | `TU_IPV4` | 300 |

5. Comprueba desde PowerShell:

```powershell
nslookup laguardiadeelune.com
nslookup www.laguardiadeelune.com
```

Ambos deben devolver `TU_IPV4` (a veces tarda unos minutos).
