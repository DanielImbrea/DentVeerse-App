# 18 — Următorii pași și status MVP (DentalConnect)

> **Actualizat:** 2026-08-26  
> **Specificație client:** [`SPECIFICATIE-PROIECT-APLICATIE-DENTARA.md`](./SPECIFICATIE-PROIECT-APLICATIE-DENTARA.md)  
> **Audit tehnic:** [`17-implementation-status.md`](./17-implementation-status.md) · [`RUNTIME_AUDIT.md`](./RUNTIME_AUDIT.md)

---

## Răspuns scurt: avem implementat tot?

**Nu 100% funcțional și polish profesional — dar da, ~75–85% din MVP există în cod.**

| Layer | Situație |
|-------|----------|
| **Bază de date + securitate (RLS)** | Foarte avansat — 30+ migrări, teste pgTAP trecute local |
| **API (`packages/api`)** | Complet pentru MVP |
| **Mobile (Expo)** | Majoritatea ecranelor există; multe fluxuri testate manual pe device în sesiuni recente |
| **Admin (Next.js)** | Funcțional pentru moderare; UI în română |
| **Integrări externe** | Parțial — Maps, Mux, push, OAuth necesită configurare + test real |
| **Calitate produs** | Unele ecrane încă imperfecte (i18n EN, share, program lucru, polish UX) |

**Concluzie:** nu e gata de App Store / lansare publică fără o fază de **testare end-to-end + fix-uri + configurare servicii**.

---

## Checklist MVP (spec §33) — status onest

| # | Feature | Status | Note |
|---|---------|--------|------|
| 1 | Register / Login | ✅ | Email OK; Google/Apple/telefon — API da, UI incomplet |
| 2 | Alegere tip cont | ✅ | Pacient / Clinică / Laborator |
| 3 | Profil pacient | ✅ | Onboarding + edit |
| 4 | Profil clinică | ⚠️ | Edit complet; **program lucru** simplu/lipsă; cover parțial |
| 5 | Profil laborator | ✅ | Edit + zonă colaborare |
| 6 | Portofoliu | ⚠️ | Admin + galerie; video Mux necesită credențiale; limite media |
| 7 | Feed | ⚠️ | Da + filtre + sortare; share incomplet; like toggle feed |
| 8 | Search | ✅ | Global search |
| 9 | Filtre | ⚠️ | Oraș, verified, colaborare — **lipsesc rating/serviciu/specializare** în UI |
| 10 | Hartă | ⚠️ | Clinici + lab; pin manual la edit profil; filtru **Dentists** limitat |
| 11 | Follow | ✅ | Follow + listă (verifică vizibilitate publică followers) |
| 12 | Like | ✅ | Da (detail + feed parțial) |
| 13 | Comentarii | ✅ | Da |
| 14 | Favorite | ✅ | Da |
| 15 | Mesagerie | ⚠️ | Text + attach; seen/online global — de verificat E2E |
| 16 | Open for Collaboration | ✅ | Toggle + badge |
| 17 | Opportunities | ⚠️ | B2B da; multi-accept în DB — flux UI de rafinat |
| 18 | Notificări | ⚠️ | In-app da; push necesită dev build |
| 19 | Verificare conturi | ✅ | Upload mobile RO + coadă admin |
| 20 | Admin Panel | ⚠️ | Users, postări, verificări, raportări — **dashboard KPI** basic |

**Amânat intenționat (decizie client):** abonamente PRO, plăți Apple/Google/Stripe.

---

## Ce funcționează bine acum (testat în dev recent)

- Auth email, onboarding, navigare tabs
- Feed cu filtre (Pentru tine / Cele mai noi) + tip conținut
- Postări create/șterse (proprii), poze full aspect ratio
- Profil clinică/lab public + admin hub
- Hartă + geocodare + pin manual
- Recenzii pacient + ecran RO cu back
- Verificare documente → admin Verificări cu nume organizație
- Discover search + filtre de bază
- Opportunities listă + detail

---

## Lacune importante (profesionalism + spec client)

### Prioritate 1 — Totul trebuie să meargă (1–2 săptămâni)

1. **Test E2E pe iPhone/Android real** — listă scenarii mai jos; fix bug-uri găsite
2. **Upload documente verificare** — confirmat pe device (PDF din Files)
3. **Upload poze portofoliu / logo** — `expo-image-picker` pe device
4. **Mesagerie** — trimite primeste, atașamente, conversație B2B
5. **Opportunities** — Interested → accept → mesaj
6. **Env & servicii:** Supabase LAN IP pe telefon, admin pe localhost

### Prioritate 2 — Completare spec (2–4 săptămâni)

7. **Google + Apple Sign-In** — butoane funcționale
8. **Telefon OTP** — ecran înregistrare
9. **Filtre search complete** — rating, serviciu, specializare (spec §13)
10. **Program de lucru clinică** (spec §3)
11. **Share post** (spec §15)
12. **Followers/Following** — listă publică (decizie client §1)
13. **Online status global** (decizie client §3)
14. **Blocare** — verificat ascundere feed/search/hartă (decizie client §4)
15. **i18n EN** — chei i18next pe ecrane principale (spec §27)

### Prioritate 3 — Lansare (4–8 săptămâni)

16. **Push notifications** — EAS dev build + Expo push
17. **Mux video** — cont + webhook pentru video portofoliu/feed
18. **Google Maps API key** — hartă production
19. **GDPR** — export date testat, ștergere cont, Privacy/Terms live
20. **Email verification** — producție Supabase
21. **TestFlight / Internal testing** — build signed
22. **Legal review** GDPR + Terms

### Amânat (după ~6–12 luni)

- Plan PRO, limite comerciale, Apple IAP, Google Billing, Stripe

---

## Scenarii de test obligatorii (copy-paste checklist)

### Pacient
- [ ] Înregistrare → onboarding → home feed
- [ ] Search „Iași” → profil clinică → follow → mesaj
- [ ] Hartă → marker → profil
- [ ] Recenzie clinică → apare pe profil
- [ ] Favorite + salvare postare

### Clinică
- [ ] Creare cont → servicii onboarding → admin hub
- [ ] Edit profil + **pin hartă** → apare pe map
- [ ] Portofoliu + postare feed
- [ ] Opportunity B2B + răspuns lab
- [ ] Verificare: upload CUI + DSP + CI → admin aprobă → badge

### Laborator
- [ ] Profil + servicii + portofoliu
- [ ] Open for collaboration
- [ ] Interested la opportunity → conversație

### Admin
- [ ] Login admin → Verificări → vezi nume + documente → Aprobă
- [ ] Raportări, postări, recenzii

---

## Comenzi utile (dev local)

```bash
# Teste unitare (Vitest) — 18 teste
pnpm test:unit

# Teste DB (pgTAP) — necesită supabase pornit
pnpm test:db

# Terminal 1
supabase start

# Terminal 2 — admin
pnpm --filter @dental/admin dev

# Terminal 3 — mobile (IP LAN în apps/mobile/.env)
cd apps/mobile && npx expo start --clear

# Staging cloud (după `npx supabase login` + link)
pnpm db:staging

# Demo orgs (clinici pe hartă Iași/București) — SQL Editor sau psql local:
# supabase/seed-demo-orgs.sql

# Teste DB
supabase test db
```

**Conturi demo seed:** `demo-clinic@dentalconnect.test` / `demo-lab@dentalconnect.test` — parolă `Demo123456!`

---

## Unde să citești mereu

1. **Ce vrea clientul** → `SPECIFICATIE-PROIECT-APLICATIE-DENTARA.md` (acest repo)
2. **Ce e construit vs lipsă (detaliu tehnic)** → `17-implementation-status.md`
3. **Ce a rulat pe mașină** → `RUNTIME_AUDIT.md`
4. **Cum continui dezvoltarea** → `CURSOR_HANDOFF.md`
5. **Decizii client (PRO amânat, documente verificare, etc.)** → `16-client-decisions-mvp-scope-update.md`

---

## Recomandarea mea ca „următorul pas” concret

**Săptămâna asta:** rulează checklist-ul E2E de mai sus pe telefon + admin, notează ce nu merge, fixăm iterativ (Agent mode).

**Apoi:** Prioritate 2 (OAuth, filtre complete, i18n, share) înainte de orice discuție despre App Store.

**Nu începe** monetizarea PRO până nu e MVP stabil și populat cu clinici/laboratoare reale.
