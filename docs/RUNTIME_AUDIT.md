# Runtime Audit

Audit date: 2026-08-23  
Auditor: Cursor agent (first local execution of this codebase)

## Environment

| Tool | Version |
|---|---|
| OS | macOS darwin 25.4.0 |
| Node | v20.20.2 |
| pnpm | 9.7.0 (via corepack) |
| Supabase CLI | 2.90.0 |
| Expo CLI | 57.0.17 |
| Docker | 29.3.1 (required for local Supabase) |
| Turbo | 2.10.11 |

## Installation

| Item | Status |
|---|---|
| `pnpm install` (all 12 workspace packages) | **PASS** after adding missing `pnpm-workspace.yaml` |
| Root-only install (before workspace file) | **FAIL** — only 103 root devDeps installed, apps/packages skipped |

### Problems

1. **`pnpm-workspace.yaml` was missing** — README/handoff reference it but the file did not exist; pnpm ignored `package.json#workspaces`.
2. **Peer dependency warnings** — `react-native-reanimated@4.6.0` expects RN 0.83+ but project uses RN 0.74.0.

### Fixes applied

- Created `pnpm-workspace.yaml` with `apps/*` and `packages/*`.

---

## Database

| Item | Status |
|---|---|
| `supabase start` | **PASS** (after config fix; requires Docker Desktop) |
| `supabase db reset` (30 migrations + seed) | **PASS** |
| PostGIS / pg_trgm / unaccent | **PASS** — extensions present |
| Public tables | **44** tables created |
| RLS policies | **PASS** — enabled on inspected tables |

### Migration failures encountered (and fixed)

| Migration | Error | Cause | Fix |
|---|---|---|---|
| (pre-migration) | `db.extensions invalid keys` | Supabase CLI 2.90 rejects `[db.extensions]` in `config.toml` | Removed block; extensions remain in `0001_baseline_extensions.sql` |
| `0015_search_indexes.sql` | `generation expression is not immutable` | `unaccent()` is STABLE, not IMMUTABLE | Added `f_unaccent()` immutable wrapper |
| `0003_identity_and_orgs.sql` | (logic bug, found via tests) | Immutability trigger blocked onboarding `patient → clinic/laboratory` | Allow one-time change when no profile/org exists yet |
| `0019_rls_policies_part2.sql` | (logic bug, found via runtime probe) | Split `opportunity_interests` UPDATE policies OR-combine USING/WITH CHECK across policies → responder self-accept | Merged into single UPDATE policy with actor-scoped WITH CHECK |
| `0016` + `0019` | pgTAP failures / RLS recursion | `conversation_members` SELECT policy self-queried same table | Added `is_conversation_member()` SECURITY DEFINER helper |

---

## Database Tests

| Suite | Result |
|---|---|
| `supabase test db` — `rls_critical_paths.sql` | **12/12 PASS** |
| `supabase test db` — `second_audit_security_fixes.sql` | **6/6 PASS** |
| **Total pgTAP** | **18/18 PASS** (after migration + test fixes) |
| Runtime SQL probe — conversation spoofing (#5) | **PASS** — blocked with “you do not manage this clinic” |
| Runtime SQL probe — opportunity self-accept | **FAIL before fix**, **PASS after fix** — RLS denies update |

### Test file fixes (invalid setup, not RLS bugs)

- Invalid UUID literals (`v`, `l`, `o` hex prefixes) → valid hex UUIDs
- Test user conflated clinic + lab roles on same user → separate lab owner user
- Follows insert under wrong JWT → `reset role` before setup insert

---

## TypeScript

| Package | Status |
|---|---|
| `@dental/types` | **PASS** |
| `@dental/utils` | **PASS** |
| `@dental/api` | **PASS** (after `pnpm db:types` regenerated `supabase.ts`) |
| `@dental/analytics` | **FAIL** — PostHog RN API (`PostHog.setup/identify/capture`) does not match installed SDK types |
| `@dental/ui` | **FAIL** — NativeWind `className` props not typed on RN components |
| `@dental/mobile` | **FAIL** — ~462 errors (mostly NativeWind/className + workspace typing) |
| `@dental/admin` | **FAIL** — audit log `before` field: PostGIS `location` typed as `unknown` vs `Json` |
| `@dental/web` | **FAIL** — same Supabase client typing on `consent_records.insert` |
| `@dental/monitoring` | **PASS** |

### Fixes applied

- Added missing `tsconfig.json` in all `packages/*` (were absent; `tsc` printed help instead of checking).
- Ran `pnpm db:types` to replace hand-authored `packages/types/src/supabase.ts`.

---

## Build

| Target | Status |
|---|---|
| `pnpm lint` | **FAIL** — ESLint config missing in apps (`eslint .` finds no config) |
| `pnpm --filter @dental/admin build` | **FAIL** — TypeScript audit-log Json mismatch |
| `pnpm --filter @dental/web build` | **FAIL** — TypeScript on cookie consent insert |
| `pnpm build` (monorepo) | **Not fully run** — blocked by above |

---

## Security

| # | Vulnerability | Source fix | Runtime test | Result |
|---|---|---|---|---|
| 1 | Admin identity spoofing (hidden form field) | `requireAdmin()` in all admin actions | Code review: no `adminId` form fields in `apps/admin`; runtime admin not fully exercised (login flow not completed in this session) | **Code fix present; runtime login/action test INCOMPLETE** |
| 2 | Unauthorized admin page access | `requireAdmin()` on all dashboard pages + middleware | `curl http://localhost:3016/overview` → **307 redirect to `/login`** without session | **PASS** (middleware layer) |
| 3 | RLS privilege escalation (8 tables) | `0025`, `0026`, opportunity policy split | `supabase test db` second_audit (6 assertions) | **PASS** |
| 4 | GDPR export unreachable | `get-data-export-url` Edge Function | Edge Functions not invoked in this session (no export lifecycle test) | **NOT TESTED** |
| 5 | Conversation `acting_as` spoofing at creation | `0028` membership checks on RPC | SQL probe as patient claiming victim clinic | **PASS** |

### Additional security findings (discovered during audit)

| Severity | Issue | Result after fix |
|---|---|---|
| **Critical** | `account_type` immutability blocked all clinic/lab onboarding (`setAccountType`) | **FIXED** in `0003` |
| **Critical** | `opportunity_interests` split UPDATE policies allowed responder self-accept (PostgreSQL policy OR semantics) | **FIXED** in `0019` |
| **High** | `conversation_members` RLS infinite recursion on UPDATE | **FIXED** via `is_conversation_member()` |
| **Medium** | Admin app requires `apps/admin/.env.local` (root `.env` not loaded by Next.js) | Documented; sample `.env.local` added for local dev |

---

## Authentication

| Test | Result |
|---|---|
| Supabase Auth user creation (service role) | **PASS** |
| Email/password sign-in | **PASS** |
| Onboarding `account_type` change (`patient → laboratory`) | **PASS** (after immutability fix) |
| Second `account_type` change | **PASS** — blocked by trigger |
| Google/Apple/OTP UI | **NOT TESTED** (unwired per docs) |
| Session persistence / protected routes (mobile) | **NOT TESTED** — mobile bundle does not compile |
| CAPTCHA on signup | **NOT TESTED** — requires Turnstile keys |

---

## Patient Flow

**NOT RUN** — mobile app does not produce a runnable JS bundle (see Mobile below). API-layer auth tests only.

---

## Clinic Flow

**NOT RUN** (mobile blocked).

---

## Laboratory Flow

**NOT RUN** (mobile blocked).

---

## Messaging

| Test | Result |
|---|---|
| `create_or_get_conversation` spoofing probe | **PASS** |
| Real-time chat UI | **NOT TESTED** |
| Attachments / Edge Function signed URLs | **NOT TESTED** |

---

## Opportunities

| Test | Result |
|---|---|
| Responder self-accept via direct UPDATE | **PASS** (denied after policy fix) |
| Full create/interest/accept UI flow | **NOT TESTED** |

---

## Feed / Search / Map / Notifications / GDPR / Admin

| Area | Result |
|---|---|
| Feed | **NOT TESTED** (mobile) |
| Search | **NOT TESTED** (mobile) |
| Map | **NOT TESTED** — requires Google Maps key + dev client |
| Notifications / push | **NOT TESTED** |
| GDPR export/download | **NOT TESTED** |
| Admin dashboard data (authenticated admin) | **NOT TESTED** — login + admin user seed not exercised end-to-end |
| Admin server start | **PASS** on `:3016` with `apps/admin/.env.local` |

---

## External Integrations

| Service | Local test | Config status |
|---|---|---|
| Supabase (DB/Auth/Storage/Realtime) | **Running locally** | `.env` populated with local keys |
| Google Maps | **NOT TESTED** | `GOOGLE_MAPS_API_KEY` empty |
| Mux (video) | **NOT TESTED** | Keys empty |
| Cloudflare Turnstile | **NOT TESTED** | Keys empty |
| Sentry | **NOT TESTED** | DSN empty |
| PostHog | **NOT TESTED** | Key empty; TS API mismatch in code |
| Resend email | **NOT TESTED** | Key empty |
| Expo push / EAS | **NOT TESTED** | `EXPO_PUBLIC_PROJECT_ID` empty |

---

## Bugs Found

### BUG-1 — Missing pnpm workspace manifest

- **Severity:** High (blocks monorepo install)
- **Location:** repo root
- **Reproduction:** `pnpm install` without `pnpm-workspace.yaml`
- **Root cause:** File never committed
- **Fix:** Added `pnpm-workspace.yaml`
- **Verification:** `pnpm install` installs 12 workspace projects

### BUG-2 — Invalid Supabase CLI config

- **Severity:** High (blocks `supabase start`)
- **Location:** `supabase/config.toml`
- **Reproduction:** `supabase start`
- **Root cause:** `[db.extensions]` not supported in CLI 2.90
- **Fix:** Removed section; extensions in SQL migration
- **Verification:** `supabase start` succeeds

### BUG-3 — Search vector migration immutability

- **Severity:** High (blocks all migrations)
- **Location:** `0015_search_indexes.sql`
- **Reproduction:** `supabase db reset`
- **Root cause:** `unaccent()` in generated column
- **Fix:** `f_unaccent()` wrapper marked IMMUTABLE
- **Verification:** Full migration chain applies

### BUG-4 — Account type onboarding blocked

- **Severity:** Critical (clinic/lab signup broken)
- **Location:** `0003_identity_and_orgs.sql` trigger
- **Reproduction:** `setAccountType('laboratory')` after signup
- **Root cause:** Trigger rejected any `account_type` change, including first onboarding selection from default `patient`
- **Fix:** Allow change when no patient/clinic/lab profile exists yet
- **Verification:** Node API test + pgTAP setup

### BUG-5 — Opportunity interest self-accept (RLS policy OR semantics)

- **Severity:** Critical
- **Location:** `0019_rls_policies_part2.sql`
- **Reproduction:** Lab manager `UPDATE opportunity_interests SET status='accepted'` as responder
- **Root cause:** Two permissive UPDATE policies; PostgreSQL ORs USING from one policy with WITH CHECK from another
- **Fix:** Single UPDATE policy combining actor + status checks
- **Verification:** SQL probe raises RLS violation

### BUG-6 — conversation_members RLS recursion

- **Severity:** High
- **Location:** `0019` policies
- **Reproduction:** pgTAP tests 5–6 in `second_audit_security_fixes.sql`
- **Root cause:** SELECT policy queried same table under RLS
- **Fix:** `is_conversation_member()` SECURITY DEFINER helper
- **Verification:** pgTAP 18/18

### BUG-7 — Mobile Metro bundle failure

- **Severity:** High (app unusable)
- **Location:** `apps/mobile`
- **Reproduction:** Request `expo-router/entry.bundle`
- **Root cause:** Missing `@babel/runtime` dependency; monorepo hoisting/pnpm layout
- **Fix:** **NOT APPLIED** (needs `pnpm --filter @dental/mobile add @babel/runtime` + Metro monorepo config review)
- **Verification:** Bundle still fails

### BUG-8 — Mobile Supabase env var mismatch

- **Severity:** Medium
- **Location:** `apps/mobile/app.config.ts` reads `SUPABASE_URL` / `SUPABASE_ANON_KEY`; handoff documents `EXPO_PUBLIC_*`
- **Reproduction:** Empty Supabase client at runtime even with only `EXPO_PUBLIC_*` in env
- **Fix:** Added both naming conventions to `apps/mobile/.env`
- **Verification:** Requires Metro bundle success to confirm

### BUG-9 — Admin/web TypeScript/build failures after typegen

- **Severity:** Medium
- **Location:** Admin audit logs, web cookie banner, analytics PostHog wrapper
- **Reproduction:** `pnpm --filter @dental/admin build`
- **Root cause:** Generated `Database` types + strict Json/PostGIS typing; outdated PostHog RN API usage
- **Fix:** **NOT APPLIED**
- **Verification:** Builds fail

### BUG-10 — ESLint not configured in apps

- **Severity:** Low
- **Location:** `apps/mobile`, `apps/admin`, `apps/web` lint scripts
- **Reproduction:** `pnpm lint`
- **Root cause:** No ESLint config extending `@dental/config`
- **Fix:** **NOT APPLIED**
- **Verification:** Lint fails immediately

---

## Tests Actually Executed

1. `pnpm install` (twice — before/after workspace fix)
2. `supabase start`
3. `supabase db reset` (multiple iterations while fixing migrations)
4. `supabase test db` — **18 pgTAP assertions**
5. `pnpm db:types`
6. `pnpm --filter @dental/utils test` — **6 Vitest tests**
7. `pnpm typecheck` (turbo + per-package)
8. `pnpm lint` (failed — config)
9. Partial `pnpm build` (admin, web — failed)
10. Node script — Auth signup + account_type immutability
11. Docker `psql` — conversation spoofing + opportunity self-accept probes
12. `curl` — admin `/overview` redirect behavior
13. Expo `pnpm dev` — Metro starts; bundle compile attempted
14. Admin `next dev` on port 3016

**Not executed:** E2E UI flows, Edge Function HTTP tests, GDPR download, CAPTCHA, maps, push, Sentry, PostHog, full admin login session.

---

## Summary (handoff answers)

### 1. What successfully ran

- Full local Supabase stack (Postgres, Auth, Storage, Studio, Edge runtime container)
- All **30 migrations** + seed on clean database
- All **18 pgTAP** security/RLS tests
- **6/6** Vitest utils tests
- Auth API (signup, login, one-time account type selection, immutability enforcement)
- Admin dev server (with app-local env) and unauthenticated redirect to login
- Expo Metro dev server process (packager status running)

### 2. What failed

- Initial install without workspace file
- First `supabase start` (config) and first `db reset` (migration 0015)
- First pgTAP run (test setup + RLS bugs)
- Monorepo `pnpm typecheck` / production builds (analytics, ui, mobile, admin, web)
- `pnpm lint` (missing ESLint configs)
- Mobile JS bundle compilation
- End-to-end UI flows (patient/clinic/lab/admin/GDPR/messaging)
- Edge Function integration tests

### 3. What was fixed during this audit

See migration/test/config changes in sections above (workspace file, config.toml, `f_unaccent`, account_type trigger, `is_conversation_member`, opportunity UPDATE policy, pgTAP test data, package tsconfigs, local env files).

### 4. What remains broken

- Mobile app bundle (`@babel/runtime`, likely Metro monorepo wiring)
- TypeScript/build across admin, web, mobile, analytics, ui
- ESLint setup in apps
- All manual product flows requiring a running mobile/admin UI
- External integrations (maps, Mux, Turnstile, Sentry, PostHog, push)
- GDPR export download path (untested)
- Full admin authenticated session testing

### 5. Security issues discovered

- **Fixed:** onboarding account_type lockout; opportunity self-accept RLS OR bug; conversation_members recursion
- **Incomplete testing:** admin Server Action identity under authenticated tampering; GDPR export authorization
- **Pre-existing code fixes claimed but not fully runtime-verified:** admin `requireAdmin()` on every action (code present)

### 6. Tests actually executed

Listed in **Tests Actually Executed** section (14 categories).

### 7. External services still requiring configuration

Google Maps, Mux (+ webhook secret), Cloudflare Turnstile, Sentry (×3 apps), PostHog, Resend, Expo/EAS project ID, Stripe (deferred).

### 8. Recommended next steps

1. **Fix mobile bundler** — add `@babel/runtime`, verify Expo monorepo/Metro resolves workspace packages; confirm Supabase env in `app.config.ts`.
2. **Fix TypeScript** — PostGIS `Json` typing for audit logs; align PostHog RN SDK usage; NativeWind types for `@dental/ui`.
3. **Add ESLint configs** to apps extending shared preset.
4. **Add pgTAP test** for opportunity responder self-accept (prevent regression of BUG-5).
5. **Run admin E2E** — seed `admin_users` row, login, verify `/overview` data loads and Server Actions reject non-admin sessions.
6. **Invoke Edge Functions locally** — GDPR export URL, message attachments, captcha verify.
7. **Configure one external service at a time** (Maps first if testing discover/map).
8. **Do not treat as production-ready** until mobile bundle, builds, and full flow walkthrough pass.
