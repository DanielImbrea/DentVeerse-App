# 19 — Lansare producție (DentVeerse / DentalConnect)

> **Site live:** [https://dentveerse.com](https://dentveerse.com)  
> **Contact:** dentveerse@gmail.com  
> **Supabase (MVP = producție):** `tfgtpmfzddipeamlxams` — vezi **`docs/20-PASUL-1-SUPABASE-PRODUCTION.md`**

---

## Unde suntem acum

| Zonă | Status |
|------|--------|
| Site marketing | Live (dentveerse.com) |
| App mobile | Funcțional pe Expo Go / dev; **nu** încă pe App Store / Play Store |
| Auth email + reset | Necesită pagini `/auth/callback` și `/auth/reset-password` + env Supabase pe site |
| Backend | Supabase cloud + migrări în repo |

---

## Faza A — Blocker (înainte de useri reali)

### A1. Supabase Dashboard (Authentication)

- [ ] **Site URL:** `https://dentveerse.com`
- [ ] **Redirect URLs:**  
  `https://dentveerse.com/**`  
  `https://www.dentveerse.com/**`  
  `dentalconnect://**`
- [ ] **Email templates** — sender `noreply@dentveerse.com` (Resend), SMTP user `resend`
- [ ] **Confirm email** ON (sau OFF temporar doar pentru test intern)
- [ ] Rulează migrări pe proiectul cloud: `pnpm db:migrate` (sau push din CI)

### A2. Site (Vercel / hosting)

- [ ] Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL=https://dentveerse.com`
- [ ] Deploy rute: `/auth/callback`, `/auth/reset-password` (cod în `apps/web/app/auth/`)
- [ ] Test: signup → email → confirm → redirect în app `dentalconnect://sign-in?confirmed=1`
- [ ] Test: reset parolă → formular pe site → login app cu parola nouă
- [ ] Pagini legale: `/privacy`, `/terms`, `/cookie-policy` (conținut juridic de revizuit)
- [ ] `public/.well-known/apple-app-site-association` — înlocuiește `TEAMID` cu Apple Team ID
- [ ] `assetlinks.json` — SHA256 certificat din EAS/Play Console

### A3. Mobile env (EAS / build)

- [ ] `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (prod)
- [ ] `EXPO_PUBLIC_SITE_URL=https://dentveerse.com`
- [ ] `EXPO_PUBLIC_TURNSTILE_SITE_KEY` + secret în Edge Function `verify-captcha`
- [ ] `EXPO_PUBLIC_PROJECT_ID` (EAS) pentru push
- [ ] `GOOGLE_MAPS_API_KEY` — restricții iOS/Android bundle + API Maps

### A4. Asset-uri store

- [ ] Înlocuiește `apps/mobile/src/assets/icon.png` (1024×1024) din `logo-transparent-master.png`
- [ ] Splash cu logo pe fundal `#FAF9F7`
- [ ] Screenshot-uri App Store / Play (RO + EN)

---

## Faza B — Build & distribuție app

- [ ] `eas build --profile production` (iOS + Android)
- [ ] TestFlight + Google Play Internal Testing
- [ ] **Nu mai folosi Expo Go** pentru test final (push, deep links, maps keys)
- [ ] Link „Descarcă app” pe site → store URLs când sunt live

---

## Faza C — Test E2E obligatoriu

Copiază checklist din `docs/18-URMATORII-PASI-SI-STATUS.md` § Scenarii de test:

- Pacient: register → confirm email → onboarding → search → mesaj → recenzie
- Clinică: profil → hartă → portofoliu → postare → verificare documente
- Lab: opportunity → interested → accept → chat
- Setări: export GDPR, ștergere cont, reset parolă end-to-end

---

## Faza D — Calitate & spec rămasă (post-MVP polish)

Prioritate din doc 18:

- Google / Apple Sign-In (UI încă disabled)
- Telefon OTP
- Filtre search complete (rating, serviciu, specializare)
- Program lucru clinică
- Share post
- Push notifications (EAS build)
- Mux video (portofoliu/feed video)
- i18n EN pe toate ecranele

**Amânat:** PRO, plăți, Stripe.

---

## Faza E — Operațiuni & legal

- [ ] Admin panel deploy separat (`apps/admin`) — doar staff
- [ ] Sentry DSN (`EXPO_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`)
- [ ] PostHog doar după consent (web banner + setare app)
- [ ] DPIA / review avocat GDPR (Privacy/Terms pe site)
- [ ] Proces moderare raportări în admin

---

## Constante centralizate în cod

`packages/config/site.ts`:

- URL, email contact, nume produs, scheme app

Actualizează acolo dacă se schimbă domeniul sau emailul.

---

## Dacă site-ul live e alt repo decât `apps/web`

Sincronizează manual:

1. Paginile auth din `apps/web/app/auth/`
2. `logo-transparent-master.png` din `apps/web/public/`
3. Fișierele `.well-known`
4. Aceleași env Supabase pe hosting

---

## Comandă rapidă verificare locală web

```bash
cd apps/web && pnpm build
```

---

## Următorul pas recomandat (acum)

1. Verifică pe **dentveerse.com** că `/auth/reset-password` funcționează (deploy `apps/web` sau copie rute).
2. Bifează **A1** în Supabase.
3. Test complet **reset parolă + confirm email** pe telefon.
4. Pornește **prima build EAS production** când A1–A3 sunt verzi.
