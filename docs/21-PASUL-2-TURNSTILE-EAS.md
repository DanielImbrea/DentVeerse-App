# Pasul 2 — Turnstile (signup) + EAS secrets (iOS)

> **Pasul 1 ✓** — `db:prod-sync`: migrări la zi, Edge Functions deployate (inclusiv `verify-captcha`).

---

## 2.1 Cloudflare Turnstile (obligatoriu pentru înregistrare în build release)

Fără asta, în **TestFlight / App Store** utilizatorii **nu pot crea cont** (CAPTCHA lipsește).

### A. Creează widget

1. [Cloudflare Dashboard → Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile)
2. **Add site**
   - **Widget mode:** Managed (recomandat)
   - **Domains:** poți lăsa gol sau adaugă `dentveerse.com` (WebView-ul din app nu folosește domeniul tău, dar nu strică)
   - Pentru **mobile WebView**, Turnstile funcționează fără domeniu strict pe widget-ul embedded — dacă apare eroare, folosește mod **Non-interactive** sau contactează Cloudflare docs pentru mobile

3. Notează:
   - **Site key** → `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (public, în app)
   - **Secret key** → `TURNSTILE_SECRET_KEY` (doar server)

### B. Secret pe Supabase

```bash
cd /Users/daniel/Downloads/dental-platform
TURNSTILE_SECRET_KEY='paste_secret_aici' ./scripts/set-turnstile-secret.sh
```

Sau Dashboard → Project → **Edge Functions** → **Secrets** → `TURNSTILE_SECRET_KEY`.

### C. Site key în mobile + EAS

**Local** (`apps/mobile/.env`):

```env
EXPO_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
```

**EAS** (build iOS production):

```bash
cd apps/mobile
eas secret:create --scope project --name EXPO_PUBLIC_TURNSTILE_SITE_KEY --value "0x4AAAAAAA..." --type string
```

Repetă pentru (dacă nu sunt deja setate):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://tfgtpmfzddipeamlxams.supabase.co" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon_key>" --type string
eas secret:create --scope project --name EXPO_PUBLIC_SITE_URL --value "https://dentveerse.com" --type string
```

Listă:

```bash
eas env:list
# sau
eas secret:list
```

---

## 2.2 Test signup (înainte de TestFlight)

1. Pune `EXPO_PUBLIC_TURNSTILE_SITE_KEY` în `apps/mobile/.env`
2. `cd apps/mobile && npx expo start --clear`
3. **Înregistrare** → widget Turnstile vizibil → cont creat
4. Dacă verificarea eșuează: Dashboard → Functions → `verify-captcha` → Logs (secret lipsă = 500 „not configured”)

---

## 2.3 Build iOS internal (TestFlight pregătire)

```bash
cd apps/mobile
eas build --platform ios --profile production
```

Prima dată: `eas init`, Apple credentials, bundle `ro.dentalconnect.app`.

După build:

```bash
eas submit --platform ios --profile production
```

---

## 2.4 Checklist Pasul 2

- [x] Turnstile widget (site key `0x4AAAAAAFDJMlWn3V3XcAui`)
- [x] `TURNSTILE_SECRET_KEY` pe Supabase (Edge Functions secrets)
- [x] `EXPO_PUBLIC_TURNSTILE_SITE_KEY` în `apps/mobile/.env` + `eas.json` production env
- [x] Mobile signup: `CaptchaWidget` + `verify-captcha` (action `signup`)
- [x] Web: `apps/web/components/TurnstileWidget.tsx` (când adăugați formular web)
- [ ] Signup testat pe telefon (Expo Go sau dev client)
- [ ] EAS secrets Supabase + SITE_URL
- [ ] (Opțional acum) `GOOGLE_MAPS_API_KEY` + `EXPO_PUBLIC_PROJECT_ID` pentru hartă/push

---

## Pasul 3 (următor)

TestFlight + scenarii E2E din `docs/18-URMATORII-PASI-SI-STATUS.md`.
