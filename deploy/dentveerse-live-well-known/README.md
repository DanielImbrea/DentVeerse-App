# Patch pentru dentveerse.com (site live)

Site-ul live de pe Vercel (`www.dentveerse.com`) are deja **auth** (`/auth/callback`, `/auth/reset-password`).
Lipsesc încă fișierele pentru **deep links** (verificat oct 2026):

- `/.well-known/apple-app-site-association` → 404
- `/.well-known/assetlinks.json` → 404

Fără ele, linkurile `https://dentveerse.com/auth/...` **nu deschid automat aplicația** pe iOS/Android.

## Ce copiezi în repo-ul site-ului tău (Next.js App Router)

Copiază folderele din acest director:

```text
app/.well-known/apple-app-site-association/route.ts
app/.well-known/assetlinks.json/route.ts
app/apple-app-site-association/route.ts
lib/apple-app-site-association.ts   # sau copiază logica din monorepo apps/web/lib/
```

Sau copiază direct din monorepo:

```text
dental-platform/apps/web/app/.well-known/
dental-platform/apps/web/app/apple-app-site-association/
dental-platform/apps/web/lib/apple-app-site-association.ts
```

Adaugă dependența `@dental/config/universal-links` **sau** înlocuiește importul cu JSON static (vezi `static/`).

## Env pe Vercel (proiectul dentveerse.com)

| Variabilă | Unde o găsești |
|-----------|----------------|
| `APPLE_TEAM_ID` | [Apple Developer → Membership](https://developer.apple.com/account) — Team ID (10 caractere) |
| `ANDROID_SHA256_FINGERPRINT` | `eas credentials -p android` sau Play Console → App signing |

Opțional (auth pe site — dacă nu sunt deja setate):

| Variabilă | Valoare |
|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://tfgtpmfzddipeamlxams.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → API → anon **public** |
| `NEXT_PUBLIC_SITE_URL` | `https://dentveerse.com` |

## După deploy

```bash
pnpm verify:live-site
# sau
bash scripts/verify-dentveerse-live.sh
```

## Variantă statică (fără env)

Editează `static/apple-app-site-association.json` (înlocuiește `TEAMID`) și pune fișierul în `public/.well-known/` pe site.
**Dezavantaj:** trebuie redeploy la fiecare schimbare de Team ID / certificat.
