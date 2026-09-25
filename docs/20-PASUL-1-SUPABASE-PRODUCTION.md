# Pasul 1 — Supabase pentru producție (decizie + setup)

## Decizie (MVP iOS)

**Folosim același proiect Supabase cloud ca producție:**

| | |
|---|---|
| **Project ref** | `tfgtpmfzddipeamlxams` |
| **URL** | `https://tfgtpmfzddipeamlxams.supabase.co` |
| **Nume în Dashboard** | Poți redenumi proiectul „DentVeerse Production” (opțional) |

**De ce:** deja ai conturi reale, SMTP Resend, migrări testate — un al doilea proiect `prod` adaugă cost + dublă configurare fără beneficiu mare la prima lansare App Store.

**Când să creezi proiect separat `prod`:** după tracțiune, când vrei staging cu date murdare fără să atingi userii live (copie schema + env EAS `staging` vs `production`).

---

## Checklist Pasul 1 (execută în ordine)

### 1.0 Proiectul trebuie **activ** (unpaused)

Dacă `pnpm db:prod-sync` spune **`LegacyProjectPausedError` / project is paused**:

1. Deschide [Supabase Dashboard → proiect](https://supabase.com/dashboard/project/tfgtpmfzddipeamlxams)
2. **Restore / Unpause project** (plan Free poate pune proiectul on hold după inactivitate)
3. Re-rulează `pnpm db:prod-sync`

Fără unpause, app-ul de pe iOS **nu** se poate conecta la backend.

### 1.1 CLI — schema la zi pe cloud

```bash
cd /Users/daniel/Downloads/dental-platform
npx supabase login          # dacă nu ești logat
pnpm db:staging             # = link + migrate + deploy Edge Functions
```

Alternativ doar migrări:

```bash
npx supabase link --project-ref tfgtpmfzddipeamlxams
pnpm db:migrate
```

### 1.2 Dashboard → Authentication → URL Configuration

| Setare | Valoare |
|--------|---------|
| **Site URL** | `https://dentveerse.com` |
| **Redirect URLs** | `https://dentveerse.com/**` |
| | `https://www.dentveerse.com/**` |
| | `dentalconnect://**` |

### 1.3 Dashboard → Authentication → Providers → Email

- Confirm email: **ON** (recomandat producție)
- SMTP Resend: user `resend`, sender `noreply@dentveerse.com`

### 1.4 Chei API (Settings → API)

Copiază în fișiere locale **gitignored** (nu commita):

| Fișier | Scop |
|--------|------|
| `apps/mobile/.env` | Expo local + același ref ca EAS production |
| `.env.production` | web/admin local (copiază din `.env.production.example`) |
| **EAS Secrets** | build iOS — aceleași `EXPO_PUBLIC_*` |

Variabile minime mobile / EAS:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tfgtpmfzddipeamlxams.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon din dashboard>
EXPO_PUBLIC_SITE_URL=https://dentveerse.com
```

Service role **doar** server (admin, Edge Functions secrets) — **niciodată** în app.

### 1.5 Verificare rapidă

```bash
pnpm verify:supabase-prod
```

---

## EAS (build iOS) — același backend

În [expo.dev](https://expo.dev) → proiectul `dentalconnect` → **Secrets**, profile **production**:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SITE_URL`
- `APP_ENV=production` (setat deja în `eas.json`)

---

## Pasul 1 — status

- [x] Decizie: `tfgtpmfzddipeamlxams` = producție MVP
- [x] `pnpm verify:supabase-prod`
- [x] `pnpm db:prod-sync` — migrări **up to date**, Edge Functions deployate
- [ ] Tu: Auth URL-uri în Dashboard (§1.2) dacă nu le-ai setat deja

## Pasul 2 (următor)

**`docs/21-PASUL-2-TURNSTILE-EAS.md`** — Turnstile + EAS secrets + primul build iOS.
