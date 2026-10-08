# Activare „Continuă cu Google” / „Continuă cu Apple”

Butoanele nu sunt „magie în App Store” — trebuie **3 lucruri**: setări în Supabase + Google/Apple, variabile în app, **build nou** (TestFlight). Codul din app le folosește când variabilele există.

---

## Pe scurt (fără jargon)

| Pas | Unde | Ce faci tu |
|-----|------|------------|
| 1 | **Supabase** → Authentication → Providers | Pornești **Google** și **Apple**, lipești ID-urile de mai jos |
| 2 | **Google Cloud** | Creezi 3 clienți OAuth (Web + iOS + Android) |
| 3 | **Apple Developer** | Sign In with Apple e deja pe app; copiezi Key/Service ID în Supabase dacă cere |
| 4 | **EAS** (expo.dev → dentalconnect → Secrets, production) | Adaugi `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (+ iOS/Android dacă le ai) |
| 5 | **Terminal** | `eas build` iOS + TestFlight din nou |

Fără pasul 4, butonul Google rămâne dezactivat. Fără pasul 1, butoanele dau eroare la apăsare.

---

## Pas 1 — Supabase (producție)

Dashboard: proiect **tfgtpmfzddipeamlxams** → **Authentication** → **Providers**.

### Google

1. Enable Google.
2. **Client ID** = client OAuth tip **Web application** (din Google Cloud).
3. **Client Secret** = secretul aceluiași client Web.
4. Save.

### Apple

1. Enable Apple.
2. Completezi ce cere Supabase (Services ID, Secret Key `.p8`, Key ID, Team ID `TR36PR6252`).
3. Bundle ID app: `ro.dentalconnect.app` (rămâne — nu schimbăm la rebrand).

### URL-uri (Authentication → URL Configuration)

- Site URL: `https://www.dentveerse.com`
- Redirect URLs: `https://dentveerse.com/auth/callback`, `https://www.dentveerse.com/auth/callback`, `dentalconnect://**`

---

## Pas 2 — Google Cloud Console

[console.cloud.google.com](https://console.cloud.google.com) → același proiect ca Maps (sau unul nou) → **APIs & Services**.

1. **OAuth consent screen** — External, app name **DentVeerse**, email support, domeniu `dentveerse.com`.
2. **Credentials → Create OAuth client ID**:
   - **Web application** → copiezi Client ID + Secret → **Supabase Google provider**.
   - **iOS** → Bundle ID `ro.dentalconnect.app` → copiezi Client ID → `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - **Android** → Package `ro.dentalconnect.app`, SHA-1 din EAS (`eas credentials -p android`) → `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

**Important:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` trebuie să fie clientul **Web** (termină în `.apps.googleusercontent.com`). Fără el, login Google pe mobil nu merge cu Supabase.

---

## Pas 3 — Apple Developer

- App ID `ro.dentalconnect.app` → **Sign In with Apple** activ (de obicei deja e).
- Cheile pentru Supabase: **Keys** → Sign in with Apple → descarci `.p8` o singură dată.

---

## Pas 4 — Variabile EAS + local

În **EAS → Environment → production** (și `apps/mobile/.env` local):

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=yyyyy.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=zzzzz.apps.googleusercontent.com
```

Rebuild obligatoriu după ce le adaugi.

---

## Pas 5 — Test

- **TestFlight** (nu Expo Go).
- **Înregistrare:** alege Pacient/Clinică/Laborator, apoi Google/Apple.
- **Autentificare:** doar Google/Apple, fără tip cont.

---

## Numele aplicației (DentVeerse)

| Unde apare | Cum schimbi |
|----------|-------------|
| **Sub icon pe iPhone** | `name: 'DentVeerse'` în `apps/mobile/app.config.js` → build EAS nou |
| **App Store / TestFlight** | App Store Connect → app → **App Information** → **Name** → **DentVeerse** |
| **Texte în app** | `packages/i18n` + `SITE.productName` în `packages/config/site.ts` |
| **Bundle ID** `ro.dentalconnect.app` | **Nu schimba** fără app nouă în App Store |
| **Slug Expo** `dentalconnect` | Poate rămâne (link expo.dev); nu afectează userii |

După redenumire în App Store Connect, utilizatorii văd **DentVeerse**; build-ul #6 poate încă arăta „DentalConnect (8ec48d)” până actualizezi numele acolo.
