# 22 — Checklist lansare + pilot clinică

> **Site:** [dentveerse.com](https://dentveerse.com) (marketing + auth web)  
> **Backend:** Supabase `tfgtpmfzddipeamlxams` — [doc 20](./20-PASUL-1-SUPABASE-PRODUCTION.md)  
> **Turnstile + EAS:** [doc 21](./21-PASUL-2-TURNSTILE-EAS.md)  
> **Verificare automată site:** `pnpm verify:live-site`

---

## Status rapid (oct 2026)

| Zonă | Status | Acțiune |
|------|--------|---------|
| Site marketing live | ✅ | www.dentveerse.com |
| `/auth/callback`, `/auth/reset-password` | ✅ pe site live | Test E2E cu email real |
| Universal Links (AASA) | ⚠️ Team ID în repo (`TR36PR6252`) | Patch pe site live + Vercel env sau redeploy |
| Android assetlinks | ❌ 404 pe live | `ANDROID_SHA256_FINGERPRINT` pe Vercel |
| Supabase migrări + Edge Functions | ✅ doc 20 | Re-rulează `pnpm db:prod-sync` după migrări noi |
| Auth URL-uri Dashboard | ⚠️ manual | §A1 mai jos |
| App iOS TestFlight | ⏳ | EAS secrets + primul build |
| Conținut clinici pilot | ⏳ | §Pilot clinică |
| Admin Vercel | ⚠️ | Env Supabase + redeploy |

---

## A — Blocker tehnic (înainte de useri reali)

### A1. Supabase → Authentication → URL Configuration

- [ ] **Site URL:** `https://dentveerse.com`
- [ ] **Redirect URLs:** `https://dentveerse.com/**`, `https://www.dentveerse.com/**`, `dentalconnect://**`
- [ ] Email confirm + reset folosesc `https://dentveerse.com/auth/callback` și `/auth/reset-password` (sau www — consistent cu linkurile din template)

### A2. Site dentveerse.com (Vercel)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tip **plain**, nu Secret pentru `NEXT_PUBLIC_*`)
- [ ] `NEXT_PUBLIC_SITE_URL=https://dentveerse.com`
- [ ] **Universal Links:** `APPLE_TEAM_ID` — vezi `deploy/dentveerse-live-well-known/README.md`
- [ ] **App Links Android:** `ANDROID_SHA256_FINGERPRINT`
- [ ] După deploy: `pnpm verify:live-site`

### A3. Mobile (EAS production)

- [ ] `EXPO_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SITE_URL`
- [ ] `EXPO_PUBLIC_TURNSTILE_SITE_KEY` (+ secret pe Supabase)
- [ ] `GOOGLE_MAPS_API_KEY` (build nativ — hartă)
- [ ] `EXPO_PUBLIC_PROJECT_ID` (push)
- [ ] `pnpm verify:supabase-prod`

### A4. Mux (video portofoliu / feed)

- [ ] Cont Mux + `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` în Supabase Edge secrets
- [ ] Test upload video din `clinic-admin → portofoliu`

### A5. Admin (`apps/admin` pe Vercel)

- [ ] Aceleași chei Supabase ca la doc 19 A2 admin
- [ ] Staff în `admin_users` + MFA

---

## B — Build & store

- [ ] Icon 1024 (`apps/mobile/src/assets/icon.png`) — verificat pe device după EAS
- [ ] `eas build --platform ios --profile production`
- [ ] TestFlight + scenarii §D
- [ ] Link App Store pe site (`packages/config/site.ts` → `storeUrls.ios`)

---

## C — Pilot clinică (conținut minim discoverable)

Ordine recomandată în app (cont **clinică** → Administrează clinica):

### C1. Profil public (obligatoriu pentru hartă/căutare)

- [ ] Nume clinică, descriere scurtă (RO)
- [ ] Adresă + oraș + **coordonate** (geocoding / pin pe hartă)
- [ ] Logo + cover
- [ ] Telefon / email contact (vizibil pacienților)
- [ ] Opțional: **Deschis la colaborări** (B2B)

### C2. Echipă

- [ ] Minim 1 medic: nume + specializare din catalog
- [ ] Poze medici (recomandat)

### C3. Servicii

- [ ] Minim 3 servicii reprezentative + descriere
- [ ] Imagini servicii (recomandat)

### C4. Portofoliu (marketing)

- [ ] Minim 5 lucrări / categorii
- [ ] Before/after unde e cazul
- [ ] 1 video (Mux) — opțional dar diferențiator

### C5. Feed & credibilitate

- [ ] 3 postări (text + foto)
- [ ] Cerere **badge Verificat** (documente în bucket privat)
- [ ] Răspuns la primele recenzii pacienți

### C6. B2B (dacă e relevant pilot)

- [ ] 1 **opportunity** publicată sau marcat „interesat” la opportunity lab
- [ ] Mesaj test clinic ↔ lab

**Definition of done pilot:** un pacient nou găsește clinica din **Căutare** sau **Hartă**, deschide profil complet, dă follow, vede postările în feed, poate trimite mesaj (dacă permis).

---

## D — Test E2E (manual, pe build TestFlight)

### Pacient

- [ ] Înregistrare + Turnstile + confirm email (site → deschide app)
- [ ] Onboarding (câmpuri obligatorii)
- [ ] Căutare oraș + filtre
- [ ] Profil clinică pilot + recenzie
- [ ] Mesaj către clinică

### Clinică (pilot)

- [ ] Edit profil → apare pe hartă
- [ ] Postare feed → vizibilă după refresh / paginare
- [ ] Ștergere postare → dispare din feed (soft delete — normal)

### Legal / cont

- [ ] Reset parolă end-to-end (email → site → parolă nouă → login app)
- [ ] Export date + ștergere cont (setări)

---

## E — Ce NU promitem la lansare (clar pentru clinici)

- Postările **nu** sunt imutabile ca arhivă publică — autorul/admin poate elimina (rămân în DB pentru moderare).
- Nu e CRM / programări / facturare.
- Site-ul web **nu** înlocuiește app-ul pentru discovery — app-ul e canalul principal MVP.

---

## Comenzi utile

```bash
pnpm verify:supabase-prod      # env mobile → prod ref
pnpm verify:live-site          # dentveerse.com smoke test
pnpm db:prod-sync              # migrări + Edge Functions
cd apps/web && pnpm build      # build site monorepo
```

---

## Următorul pas (prioritate 1)

1. Copiază patch-ul **well-known** pe repo-ul site-ului live + setează `APPLE_TEAM_ID` pe Vercel.  
2. Bifează **A1** în Supabase Dashboard.  
3. Onboardează **1 clinică pilot** după §C.  
4. **EAS build** + §D pe TestFlight.
