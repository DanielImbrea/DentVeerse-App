# CURSOR HANDOFF — DentalConnect

This document is the single entry point for continuing this project in Cursor. Read it before
touching code. It is written to be actionable, not aspirational — every "do this" instruction below
is something concrete you can execute today.

---

## 🔴 CRITICAL SECURITY ITEMS TO VERIFY FIRST

Five real vulnerabilities were found and fixed across this project's build sessions, through
explicit, systematic security audits. **Every fix below is present in the code you're receiving —
confirmed by direct code inspection immediately before this handoff** — but **none of them have
been executed**. Do not use this application with real user data until you have personally run the
verification steps below and confirmed each fix actually works.

| # | Vulnerability | Where it was | Fix | Verify by |
|---|---|---|---|---|
| 1 | Admin identity spoofing — admin actions trusted a hidden HTML form field for "who is the acting admin," which any user could tamper with | All 9 admin dashboard pages, every Server Action | Real session-based auth via `@supabase/ssr`; `apps/admin/lib/requireAdmin.ts` is now the single chokepoint every action calls | Try tampering with an admin action's network request in browser dev tools — it must fail without a valid session, regardless of what identity you claim |
| 2 | Unauthorized admin data access — dashboard pages read privileged data with zero admin verification; any signed-in consumer account could view `/overview`, `/users`, etc. | Every `apps/admin/app/(dashboard)/*/page.tsx` | Every page now calls `await requireAdmin()` before any data read | Sign in as a non-admin consumer account, try navigating directly to `/overview` — must redirect/error, never show data |
| 3 | RLS privilege escalation across 8 tables — missing `WITH CHECK` clauses let authorized actors reassign ownership/identity columns; most seriously, a `conversation_members` row could be rewritten to impersonate a different organization | `clinics`, `laboratories`, `opportunities`, `portfolio_items`, `posts`, `comments`, `dentists`, `conversation_members`, `devices`, `notifications`, `reviews` | Column-protection triggers (`0025`, `0026` migrations) | Run `supabase test db` — `second_audit_security_fixes.sql`'s 6 assertions must all pass |
| 4 | GDPR export unreachable — a completed export had no endpoint for its own owner to download it | `data-exports` storage bucket / `data_export_requests` flow | New `get-data-export-url` Edge Function with an ownership check | Request an export as a test user, wait for `status='ready'`, confirm the Settings screen's download button actually works |
| 5 | Conversation identity spoofing at creation time — `create_or_get_conversation` accepted `acting_as_type`/`acting_as_id` from the caller with no check that they manage the claimed org | `create_or_get_conversation` RPC | Re-defined with real `clinic_members`/`laboratory_members` membership checks (`0028` migration) | Try calling the RPC as a patient claiming `acting_as_type='clinic'` for a clinic you don't manage — must throw |

**Do not skip this section.** These are not style issues or edge cases — #1, #3, and #5 are direct
privilege-escalation/impersonation vulnerabilities. Confirming they're closed is the highest-value
thing you can do before this application ever touches real user data (see STEP 9 below).

---

## 1. Current Architecture (summary)

- **Mobile:** Expo (React Native) + TypeScript, Expo Router, TanStack Query, Zustand, NativeWind
  (Tailwind for RN).
- **Backend:** Supabase — PostgreSQL + PostGIS, Row Level Security as the primary access-control
  layer, Supabase Auth, Supabase Storage (public + private buckets), Supabase Realtime, Edge
  Functions (Deno) for privileged operations.
- **Web:** Next.js 14 (App Router) — a thin marketing site (`apps/web`) and a fuller Admin Panel
  (`apps/admin`) with Server Actions calling a service-role Supabase client, server-only.
- **Monorepo:** Turborepo + pnpm workspaces. `packages/*` hold code shared across all three apps —
  design tokens, domain types, the Supabase query layer, i18n resources, and now a small `utils`
  package.

Full rationale for every one of these choices is in `docs/01-architecture.md`. Full database schema
is in `docs/02-database.md` (and, more importantly, the actual SQL in `supabase/migrations/`, which
is the real source of truth — the doc describes intent, the migrations are what actually runs).

**Read `docs/17-implementation-status.md` in full before anything else in this list.** It is the
authoritative, honest record of what's real vs. what's still needed, section by section, with a
full requirement matrix at the end.

---

## 2. Repository Structure

```
dental-platform/
├── apps/
│   ├── mobile/        Expo Router app — see app/ for routes, src/ for logic
│   ├── web/            Next.js marketing site
│   └── admin/          Next.js admin panel (separate auth, service-role only server-side)
├── packages/
│   ├── ui/              Design-system components (Button, Badge, EmptyState, ErrorState, SkeletonRow)
│   ├── types/            Hand-authored Database type (regenerate via `pnpm db:types` once possible)
│   ├── config/            Design tokens, shared ESLint/Tailwind presets
│   ├── api/                Every Supabase query/mutation function, organized by feature
│   ├── i18n/                 RO/EN translation resources
│   └── utils/                  Small shared pure functions (currently: slugify)
├── supabase/
│   ├── migrations/       23 numbered SQL files — apply in order, this is the real schema
│   ├── functions/         5 Edge Functions (Deno) — all written, none deployed/tested
│   └── tests/database/     pgTAP RLS test suite (written, not executed)
├── docs/                    16 architecture docs + this handoff + the implementation-status doc
└── .github/workflows/ci.yml  Never run against this code
```

---

## 3. How to Install

```bash
git clone <this repo>
cd dental-platform
corepack enable            # ensures the pinned pnpm version from package.json is used
pnpm install
```

**Expect install issues.** Package versions in every `package.json` were written to be current as of
this session's knowledge, but have never actually been resolved by a package manager. If a version
doesn't exist or conflicts, bump it to the nearest compatible version — this is normal, expected
first-run friction, not a sign anything is architecturally wrong.

---

## 4. How to Run Supabase (local)

```bash
supabase init      # only if supabase/ wasn't already initialized — it is, so likely skip this
supabase start      # spins up local Postgres, Auth, Storage, Realtime, Studio
supabase db reset    # applies every migration in supabase/migrations/, in order, then seed.sql
```

**This is the single most important command to run first.** If `supabase db reset` fails, nothing
else in this project can be trusted until it's fixed — every screen, every API function, assumes
this schema exists exactly as written. Likely failure points, in rough order of probability:
1. A typo in a trigger function body (PL/pgSQL syntax was never checked by a real parser).
2. A PostGIS function call with wrong argument order or type (`ST_MakePoint(lng, lat)` — note the
   order, easy to get backwards).
3. An RLS policy referencing a helper function before it's defined (check migration numbering —
   `0016_rls_helper_functions.sql` must run before `0018`-`0020`, which it does by filename order,
   but double-check if you ever renumber).
4. A storage bucket policy referencing `storage.foldername` incorrectly.

Once it applies cleanly:
```bash
supabase test db     # runs supabase/tests/database/rls_critical_paths.sql
pnpm --filter @dental/utils test    # runs the Vitest unit tests (no DB needed for this one)
```

---

## 5. How to Run Mobile

```bash
cp .env.example .env    # fill in real values, see §7 below
pnpm --filter @dental/mobile dev
```

**Important:** once you start building/testing payments, maps, or push notifications, **Expo Go is
not sufficient** — you need an EAS development client:
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform ios      # or android
```
Basic screens (auth, feed, search text results, opportunities, messaging text) should work in Expo
Go for faster iteration; the Map screen (`app/(tabs)/discover/map.tsx`) specifically needs the dev
client due to `react-native-maps`.

---

## 6. How to Run Admin & Web

```bash
pnpm --filter @dental/admin dev     # http://localhost:3001
pnpm --filter @dental/web dev        # http://localhost:3000
```

**Before doing anything real in the admin panel, read the 🔴 CRITICAL SECURITY ITEMS TO VERIFY FIRST
section at the top of this document.** The admin identity vulnerability that used to be here is
fixed in code — but has never been executed, so STEP 9 (Test authorization/security) below is
required before trusting it with real data.

---

## 7. Environment Variables

See `.env.example` for the full annotated list. Summary of what's required for what:

| Variable | Needed for | Where to get it |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Everything | `supabase status` after `supabase start` (local) or your Supabase project dashboard (hosted) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Admin/Web (client-side) | Same values as above, Next.js requires the `NEXT_PUBLIC_` prefix to expose them to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions, admin server-side calls | Supabase project dashboard → Settings → API — **never expose this to any client bundle** |
| `GOOGLE_MAPS_API_KEY` | Map screen | Google Cloud Console — enable Maps SDK for iOS + Android |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | Video portfolio uploads (not yet wired) | mux.com — **not required for MVP** since video upload isn't built |
| `RESEND_API_KEY` | Transactional email (not yet wired anywhere) | resend.com |
| `EXPO_PUBLIC_PROJECT_ID` | EAS builds, push notifications | `eas init` |
| `STRIPE_*` | Deferred — do not set up yet | N/A until the Monetization Phase |

---

## 8. Database Migration Procedure

- Migrations are numbered SQL files in `supabase/migrations/`, applied strictly in filename order.
- **Never edit an already-applied migration in a shared/staging/production environment** — add a new
  numbered file instead. Since nothing has been applied anywhere yet, it's fine to edit the existing
  files directly while you're still getting the schema to apply cleanly for the first time; once
  `supabase db reset` succeeds against a real environment and you deploy to staging, switch to the
  append-only discipline described in `docs/12-testing-cicd.md`.
- To add a new table/column: create `00XX_description.sql`, write the DDL, add corresponding RLS
  policies in the same file (don't split schema and security into separate far-apart files going
  forward — the existing split into `0018`/`0019`/`0020` for RLS was a one-time organizational choice
  for the initial schema, not a pattern to keep repeating).
- Regenerate TypeScript types after any schema change: `pnpm db:types` (runs
  `supabase gen types typescript --local`) — this will **replace** the hand-authored
  `packages/types/src/supabase.ts`; diff the output against the hand-authored version once, since
  there may be small shape differences worth reconciling in `packages/types/src/domain.ts`.

---

## 9. Known Limitations — Ranked by Priority

**Updated after Session 4 (final verification pass).** All 5 discovered vulnerabilities (see the 🔴
CRITICAL SECURITY ITEMS section at the top of this document) are fixed in code — but **none of the
fixes have been executed**. STEP 5 and STEP 9 in the step-by-step guide (§12 below) are the way to
actually confirm this, and remain the top priority regardless of anything else in this list.

1. **🟡 (validate, don't just trust) All 5 security fixes.** See the CRITICAL SECURITY ITEMS table
   at the top of this document — each row names exactly how to verify it.
2. **🔴 Map has never rendered.** See `docs/17-implementation-status.md` §11 for full detail and the
   exact external configuration needed (Google Maps API key, EAS dev client). Includes laboratory
   markers, clustering, and custom in-code marker icons (all built, none executed).
3. **🟠 i18n infrastructure exists but most screens use hardcoded English strings.** Run `pnpm lint`
   and expect many `i18next/no-literal-string` warnings.
4. **🟡 Push notifications, analytics, and error monitoring have never been tested end-to-end.**
   All three need real credentials (Expo push, PostHog API key, Sentry DSN) and a real device/build
   to confirm events actually arrive where expected.
5. **🟡 CAPTCHA needs a real Turnstile site.** Get one at
   https://dash.cloudflare.com/?to=/:account/turnstile — the WebView-embedding approach used in
   `apps/mobile/src/features/auth/CaptchaWidget.tsx` has never rendered in a real WebView.
6. **🟡 Video portfolio upload AND playback need a real Mux account.** The full direct-upload +
   webhook architecture is built (`create-mux-upload`, `mux-webhook` Edge Functions) and inline HLS
   playback is wired (`expo-video` in `PortfolioGalleryViewer.tsx`) — but neither has ever made a
   real API call to Mux or played a real HLS stream. Get credentials, upload a test video, confirm
   the webhook fires and playback actually works.
7. **🟡 Edge Function rate limiting is now implemented** (previously a documented gap) across all 5
   previously-unprotected functions (`verify-captcha`, `create-mux-upload`,
   `get-message-attachment-url`, `get-data-export-url`, `admin-verification-document-url`) via
   `supabase/migrations/0030_edge_function_rate_limits.sql` + `supabase/functions/_shared/rateLimit.ts`
   — needs a periodic cleanup cron for the `rate_limits` table (old windows accumulate otherwise;
   `cleanup_old_rate_limits()` exists, just needs scheduling) and real-traffic validation that the
   chosen limits are reasonable.
8. **🟡 No CI has ever run.** `.github/workflows/ci.yml` exists from the initial scaffold; the first
   real run will likely surface TypeScript errors that were never caught by a compiler in this
   environment.

---

## 10. Missing Functionality (genuinely not started, after Session 4)

- Subscriptions/Payments — **deliberately deferred**, not missing by oversight. Do not build until
  the client explicitly triggers the Monetization Phase (see `docs/16-client-decisions-mvp-scope-update.md`
  §5 and `docs/09-subscriptions-payments.md` for the ready-to-implement spec when that day comes).
- Weighted (followed + discovery) feed ranking — currently a plain reverse-chronological public feed.
- Rating and service filters in the search filter sheet (city/verified/open-for-collaboration ARE
  implemented; the underlying `global_search` RPC would need extending further for the other two).

Everything previously listed here (Analytics, Fullscreen portfolio gallery, Before/after slider,
Laboratory map markers, Map clustering, Feed post composer, Sentry, CAPTCHA — Session 3; Cookie
consent banner, video playback, custom map marker icons, Edge Function rate limiting, search filter
UI — Session 4) was built. See the SESSION 3 and SESSION 4 summaries at the top of
`docs/17-implementation-status.md`.

---

## 11. Unverified Functionality (written, never executed — the majority of this codebase)

Essentially everything, per the nature of this environment. The single highest-value thing you can
do in your first session is get `supabase db reset` to succeed, then `pnpm --filter @dental/mobile
dev` to boot the app against that local database, then manually walk through: sign up → choose
account type → onboard as a clinic → edit clinic profile → add a service → add a team member → add
a portfolio item → view your own public profile. That one path exercises the majority of the schema,
RLS, and API layer in one pass and will surface most integration bugs quickly.

---

## 12. Step-by-Step: Exact Order To Follow In Cursor

Follow these 14 steps in order. Each one names the exact commands and exactly what result confirms
you're clear to move to the next step. Do not skip ahead — most later steps assume earlier ones
actually succeeded, not just that you ran the command.

### STEP 1 — Install dependencies
```bash
corepack enable
pnpm install
```
**Verify:** completes with no errors. If a package version doesn't resolve, bump it to the nearest
compatible version — expected first-run friction, not an architectural problem.

### STEP 2 — Configure environment
```bash
cp .env.example .env
```
Fill in every variable per `.env.example`'s comments. You will not have real values yet for
Google Maps / Mux / Turnstile / Sentry / PostHog — leave those blank for now; the app degrades
gracefully (features requiring them simply no-op with a console warning, per each package's own
code — see §7 above for exactly which features that affects).
**Verify:** `.env` exists and at minimum has placeholder awareness of every key listed in
`.env.example`.

### STEP 3 — Start Supabase
```bash
supabase start
```
**Verify:** command completes and prints local URLs/keys (API URL, anon key, service role key,
Studio URL). Copy `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` (and the
`NEXT_PUBLIC_` duplicates) from this output into `.env`.

### STEP 4 — Run database migrations
```bash
supabase db reset
```
This applies all 30 migrations in `supabase/migrations/` in order, then `seed.sql`.
**Verify:** completes with **zero errors**. This is the single most important checkpoint in this
entire handoff — nothing downstream can be trusted until this succeeds. If it fails, see the error
table in STEP 12 below before doing anything else.

### STEP 5 — Run database/RLS tests
```bash
supabase test db
```
Runs both pgTAP files: `rls_critical_paths.sql` (12 assertions) and, critically,
`second_audit_security_fixes.sql` (6 assertions covering the privilege-escalation fixes — see the
CRITICAL SECURITY ITEMS section at the top of this document).
**Verify:** all 18 assertions pass. If any fail, that specific security fix is NOT actually working
as intended — do not proceed to using the app with real data until it's fixed and re-verified.

### STEP 6 — Run TypeScript/build checks
```bash
pnpm typecheck
pnpm lint
```
**Verify:** `typecheck` should be clean or close to it (this code was written carefully but never
compiled — expect to find and fix some real type errors, especially in `packages/types/src/supabase.ts`,
which is hand-authored and should be regenerated once STEP 4 succeeds:
`pnpm db:types`). `lint` will surface real `i18next/no-literal-string` warnings — expected, see §9.

### STEP 7 — Run the mobile application
```bash
pnpm --filter @dental/mobile dev
```
**Verify:** Expo dev server starts, app loads in Expo Go or a simulator without crashing, and you
land on the sign-in screen.

### STEP 8 — Test authentication
Manually: sign up with email/password → confirm `public.users` row was created (check Supabase
Studio's table editor) → choose an account type → confirm onboarding completes → sign out → sign
back in.
**Verify:** each step works and the resulting `account_type` matches what you chose, and cannot be
changed afterward (try calling `setAccountType` again with a different value — it must throw).

### STEP 9 — Test authorization/security
**This is where you verify the CRITICAL SECURITY ITEMS table at the top of this document.** Work
through all 5 rows' "Verify by" column now, using two real test accounts (one patient, one clinic)
plus the admin login. Do not skip this step or defer it — it's the entire point of this handoff
document's structure.

### STEP 10 — Test each major feature
Walk the manual path from §11 below (sign up → onboard as clinic → edit profile → add service → add
team member → add portfolio item → view own public profile), then also: search with filters, start
a conversation, post an opportunity, submit a review as a patient account, view the admin dashboard.
**Verify:** each flow completes without an unexpected error; note anything that breaks for STEP 12.

### STEP 11 — Configure external services
Now (not before) go through §7's table and obtain real credentials for whichever of these your
current goal needs: Google Maps, Mux, Cloudflare Turnstile, Sentry, PostHog. Add each to `.env`,
restart the dev server, and confirm that specific feature now works (map renders, video uploads,
CAPTCHA widget loads, an error you deliberately trigger shows up in Sentry, an event you trigger
shows up in PostHog).

### STEP 12 — Fix runtime issues
Use the error table below as a starting reference for the most likely issues, but expect genuinely
new ones too — this is the first time any of this code has run.

| Error pattern | Likely cause | Where to look |
|---|---|---|
| `relation "..." does not exist` during `db reset` | Migration ordering issue or a typo in a table/column name referenced before it's created | Check the migration number that failed; confirm every table it references was created in an earlier-numbered file |
| `function ... does not exist` in a trigger or RLS policy | A helper function (`is_clinic_manager`, etc.) is referenced before `0016_rls_helper_functions.sql` runs, or a typo in the function name | Confirm the referencing migration's number is ≥ 16 |
| `permission denied for table ...` from the mobile app | Either correct RLS behavior (the query is genuinely not allowed) or a missing/wrong policy | Cross-reference `docs/03-security.md`'s policy table for that table — if the operation *should* be allowed, the policy has a bug |
| `Property '...' does not exist on type` TypeScript errors | The hand-authored `packages/types/src/supabase.ts` has a shape mismatch with the actual schema | Regenerate via `pnpm db:types` once the DB is running, diff against the hand-authored version |
| `Cannot find module '@dental/...'` | Workspace linking issue, or a package's `package.json` `main`/`exports` field is wrong | Confirm `pnpm install` completed without errors; check the specific package's `package.json` |
| Expo build failure mentioning `react-native-maps` or `expo-video` | Running in Expo Go instead of a dev client | Build with `eas build --profile development` |
| Storage upload `403`/RLS violation | Upload path doesn't match the bucket's folder-ownership policy (org-owned vs. user-owned buckets have different path conventions — see `supabase/migrations/0021_storage_buckets.sql`'s comments) | Confirm the upload path's first folder segment matches what that bucket's policy expects |
| `Rate limit exceeded` during testing | You're hitting the real rate limits added in `0027`/`0030` while testing repeatedly | Expected behavior, not a bug — wait out the window, or temporarily raise the limit in that migration for local testing |

### STEP 13 — Final security audit
Before considering this production-ready, do your own independent pass — don't just trust that the
3 sessions of audits in this codebase's history caught everything. Specifically re-check: every new
table/column you've added since receiving this handoff has RLS enabled with a real policy (not
forgotten); every new Edge Function checks caller identity before privileged work; every new
Server Action in `apps/admin` calls `requireAdmin()`. Grep for the same patterns the CRITICAL
SECURITY ITEMS section was found by: hidden form fields carrying identity, `formData.get('role')` or
similar, any RPC/function parameter that claims an identity without verifying it against a
membership table.

### STEP 14 — Production build
Only after STEPs 1-13 are clean: follow the Production Deployment Checklist (§16 below) in full,
then `eas build --profile production`, submit to App Store Connect / Google Play Console, deploy
`apps/web`/`apps/admin` to your hosting provider of choice (Vercel is a natural fit for Next.js).



See `docs/12-testing-cicd.md` for the full strategy. Concretely, in order:
```bash
supabase test db                              # RLS correctness — do this first, highest stakes
pnpm --filter @dental/utils test               # pure-function unit tests
pnpm typecheck                                  # across all workspaces
pnpm lint                                        # will surface i18n and code-quality issues
```
Component tests, Edge Function tests, and E2E tests do not exist yet — build them alongside the
features they cover as you complete the "Do in Cursor" items per feature area.

## 16. Production Deployment Checklist

Do not deploy to production until every item below is checked, in addition to whatever you
discover during the implementation-order pass above:

- [ ] `supabase test db` passes, INCLUDING `second_audit_security_fixes.sql` — this confirms the
      Session 3 privilege-escalation fixes actually work, not just that they were written
- [ ] `supabase db reset` succeeds against a clean database with zero errors
- [ ] Full pgTAP suite passes, and coverage has been expanded beyond the initial assertions to
      cover every RLS policy (per `docs/12-testing-cicd.md`'s stated priority)
- [ ] Separate Supabase projects for dev/staging/production (`docs/01-architecture.md` §4) —
      currently only one project's worth of config exists in `.env.example`
- [ ] Google Maps API key has billing configured and usage alerts set
- [ ] Mux account configured, `MUX_WEBHOOK_SECRET` set, and the webhook URL registered in the Mux
      dashboard pointing at the deployed `mux-webhook` function
- [ ] Cloudflare Turnstile site configured, both `EXPO_PUBLIC_TURNSTILE_SITE_KEY` and
      `TURNSTILE_SECRET_KEY` set
- [ ] Sentry DSNs configured for mobile, web, and admin (three separate projects recommended)
- [ ] PostHog project configured, `EXPO_PUBLIC_POSTHOG_API_KEY` set, and a legal decision made on
      the analytics-consent question flagged in `packages/analytics/src/mobile.ts` before flipping
      `setAnalyticsEnabled(true)` by default
- [ ] Push notification cron is deployed and has sent at least one real test push
- [ ] Legal review completed for GDPR retention windows (`docs/11-gdpr-i18n.md` Part A) — the 30-day
      account-deletion grace window is a reasonable default, not a confirmed legal requirement
- [ ] i18n pass complete — no hardcoded user-facing strings (verify via `pnpm lint`)
- [ ] EAS production builds submitted to App Store Connect / Google Play Console, reviewed, approved
- [ ] `rate_limits` table cleanup cron scheduled (`cleanup_old_rate_limits()` exists, needs a
      schedule — old windows accumulate otherwise)
- [ ] Video upload + playback validated end-to-end with a real Mux account (architecture complete,
      never executed — see Known Limitations §9 item 6)
- [ ] All 5 items in the 🔴 CRITICAL SECURITY ITEMS TO VERIFY FIRST table at the top of this
      document confirmed via STEP 5 and STEP 9 of the step-by-step guide
