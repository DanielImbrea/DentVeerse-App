# SPECIFICAȚIE PROIECT — APLICAȚIE DENTARĂ (DentalConnect)

> **Document sursă client** — păstrat integral ca referință permanentă.  
> Deciziile confirmate suplimentar (punctele 1–8 de la final) sunt înregistrate și în `16-client-decisions-mvp-scope-update.md`.

---

## 1. Scopul aplicației

Dezvoltarea unei aplicație dedicate domeniului dentar, care să conecteze:

- Pacienți
- Cabinete și clinici stomatologice
- Laboratoare de tehnică dentară

Aplicația **NU** va include gestionarea lucrărilor dentare, comenzilor de laborator sau fluxurilor interne de producție.

**Scop principal:**

- prezentarea profesională a clinicilor și laboratoarelor;
- găsirea de servicii stomatologice de către pacienți;
- găsirea de colaborări între clinici și laboratoare;
- promovarea serviciilor;
- comunicarea directă între utilizatori.

---

## 2. TIPURI DE CONTURI

Aplicația trebuie să permită 3 tipuri principale de cont.

### A. PACIENT

**Înregistrare prin:**

- Email
- Număr de telefon
- Google
- Apple

**Date profil:** Nume, Prenume, Oraș, Fotografie profil, Telefon, Email

**Pacientul poate:** căuta clinici/cabinete/medici, servicii, hartă, favorite, follow, mesaje, portofolii, postări, recenzii (conform regulilor).

**Pacientul NU poate** publica profil profesional de laborator sau clinică.

### B. CONT CLINICĂ / CABINET STOMATOLOGIC

La înregistrare: **Clinic / Dental Office**

**Profil:** nume, logo, cover, descriere, adresă, oraș, județ, țară, telefon, email, website, social, program de lucru.

**Locație:** integrare Maps — clinica apare pe hartă.

### C. ECHIPA CLINICII (§4)

Medici: nume, foto, specializare, descriere, experiență, social opțional.

### D. SERVICII CLINICĂ (§5)

Catalog servicii cu titlu, descriere, imagine, preț opțional.

### E. PORTOFOLIU CLINICĂ (§6)

Foto, video, before/after, descriere caz, categorii (Implantologie, Estetică, Fațete, All-on-X, etc.).

### F. CONT LABORATOR (§7)

Profil: nume, logo, cover, descriere, adresă, contact, social, ani experiență, echipă, zonă colaborare (Local / România / Europa / Internațional).

### G. SERVICII LABORATOR (§8)

Zirconiu, E.max, CAD/CAM, All-on-X, etc.

### H. PORTOFOLIU LABORATOR (§9)

Element principal al profilului — foto, video, categorii (Anterior, Posterior, Zirconiu, etc.).

---

## 10. OPEN FOR COLLABORATION

Clinică și laborator pot activa **Open for Collaboration** cu notă personalizată. Status vizibil pe profil.

---

## 11. OPPORTUNITIES

Secțiune separată. Clinica/laboratorul publică cereri; partea interesată poate răspunde; după acceptare — conversație în mesagerie. Ambele direcții (clinică ↔ laborator).

---

## 12. SEARCH

Search global: clinici, cabinete, medici, laboratoare, servicii, orașe, specializări.

---

## 13. FILTRE

**Clinici:** oraș, specializare, serviciu, rating, verified, open for collaboration.

**Laboratoare:** oraș, țară, specializare, serviciu, verified, open for collaboration, zonă colaborare.

---

## 14. DENTAL MAP

Hartă cu filtre Clinics / Dentists / Laboratories. Tap marker → preview → profil.

---

## 15. FEED

Postări: foto, video, text, portfolio, anunțuri, colaborări. Interacțiuni: like, comment, save, share, follow.

---

## 16. FOLLOW SYSTEM

Follow clinici, medici, laboratoare. Followers + Following.

---

## 17. MESSAGING

Mesagerie privată: Pacient→Clinică, Clinică↔Laborator, Clinică↔Clinică, Lab↔Lab. Text, foto, fișiere, seen, online (opțional), block, report.

---

## 18. FAVORITES

Salvare clinici, medici, postări (per rol).

---

## 19. VERIFICAREA CONTURILOR

Badge **Verified Dental Clinic** / **Verified Dental Laboratory**. Documente vizibile doar admin. După aprobare: ✓ Verified.

---

## 20. REVIEWS

Pacienții evaluează clinicile (1–5 stele + categorii opționale). Report review, delete admin, anti-spam. Recenzii B2B clinici↔lab — etapă ulterioară.

---

## 21. NOTIFICĂRI

Push: follower, like, comment, message, collaboration, opportunity, verification, review.

---

## 22. MENIU PRINCIPAL

HOME (Feed) · DISCOVER (Search + Map) · OPPORTUNITIES · MESSAGES · PROFILE

---

## 23–24. SUBSCRIPTION & PAYMENTS

**Amânat la MVP** — vezi deciziile client mai jos (§5 și §8). Arhitectura există în `09-subscriptions-payments.md` pentru faza de monetizare.

---

## 25. ADMIN PANEL

Gestionare users, clinici, lab, postări, comentarii, recenzii, raportări, opportunities, verificări, subscriptions (viitor), dashboard KPI.

---

## 26. REPORT SYSTEM

Report pe profil, postare, comentariu, mesaj, review. Motive: spam, fake, offensive, scam, inappropriate, other.

---

## 27. LIMBI

RO + EN la lansare; arhitectură extensibilă (DE, FR, IT, ES…).

---

## 28. PLATFORME

iOS, Android, Web recomandat.

---

## 29. LOGIN ȘI SECURITATE

Email verification, forgot/change password, 2FA opțional, block, delete account, logout devices.

---

## 30. GDPR

Privacy, Terms, Cookie (web), consimțământ, export date, ștergere cont/date. **Fără dosare medicale.**

---

## 31. STRUCTURA PLATFORMEI

**B2C:** Pacient → Clinică/Medic  
**B2B:** Clinică → Laborator

---

## 32. FUNCȚII EXCLUSE (NON-GOALS)

Fără: lucrări lab, tracking, fișă lucrare, CRM clinică, facturare, contabilitate, management intern clinic/lab.

Platformă = **Networking + Discovery + Portfolio + Marketing + Collaboration**.

---

## 33. MVP — PRIMA VERSIUNE (prioritar)

1. Register/Login  
2. Alegere tip cont  
3. Profile pacient  
4. Profile clinică  
5. Profile laborator  
6. Portfolio  
7. Feed  
8. Search  
9. Filters  
10. Map  
11. Follow  
12. Like  
13. Comments  
14. Favorites  
15. Messaging  
16. Open for Collaboration  
17. Opportunities  
18. Notifications  
19. Verified accounts  
20. Admin Panel  

---

## 34. OBIECTIV FINAL

Platformă profesională pentru ecosistemul dentar:

**Pacient ↔ Dentist/Clinică ↔ Laborator**

Extensibil din România spre Europa și internațional.

---

## DECIZII CLIENT CONFIRMATE (supliment față de spec original)

1. **Follow** — listă publică completă (nu doar număr).
2. **Opportunities** — mai mulți interesați acceptați; nu se închide la primul „Interested”.
3. **Status online** — global pe aplicație.
4. **Blocare** — ascunde complet din feed, search, hartă (nu doar mesaje).
5. **PRO / plăți** — **NU la lansare** (~6–12 luni gratuit). Limite doar tehnice anti-spam: ~25 media/portfolio item, max 5 opportunities active/cont.
6. **Documente verificare:**  
   - **Clinică:** CUI + autorizație DSP + CI reprezentant legal  
   - **Laborator:** CUI + certificat/diplomă tehnician responsabil + CI reprezentant  
   Documente doar admin, nu publice.
7. **GDPR:** ștergere definitivă date personale; recenzii șterse complet + recalcul rating.
8. **Stripe web** — amânat odată cu monetizarea.

---

## Documente legate în repo

| Document | Rol |
|----------|-----|
| `14-requirement-audit.md` | Traceability spec → arhitectură |
| `16-client-decisions-mvp-scope-update.md` | Decizii autoritative client |
| `17-implementation-status.md` | Status tehnic detaliat (engleză) |
| `18-URMATORII-PASI-SI-STATUS.md` | **Pași următori + checklist MVP (română)** |
| `RUNTIME_AUDIT.md` | Ce a rulat efectiv local |
| `CURSOR_HANDOFF.md` | Ghid execuție pentru dezvoltare |
