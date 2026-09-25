# DentalConnect — Monorepo

Implementation of the architecture specified in `docs/` (see `docs/README.md` for the full
document index). This is the **Phase 1 scaffold** per `docs/13-roadmap.md` — folder structure,
tooling, navigation shell, and design-token wiring are in place; feature logic is stubbed with
`TODO(Phase N)` references pointing at the relevant architecture doc.

## Prerequisites
- Node.js ≥ 20, `pnpm` ≥ 9
- [Supabase CLI](https://supabase.com/docs/guides/cli) (local dev database)
- [EAS CLI](https://docs.expo.dev/eas/) (mobile builds) — `npm i -g eas-cli`
- Xcode / Android Studio for native mobile builds

## Setup
```bash
pnpm install
cp .env.example .env   # fill in real values — see .env.example for what each var is for
supabase start          # local Postgres + Auth + Storage + Realtime
pnpm dev                 # runs mobile (Expo), web, and admin dev servers via Turborepo
```

## Structure
```
apps/mobile   — Expo Router app (iOS/Android)
apps/web      — Next.js marketing site
apps/admin    — Next.js admin panel (separate auth, service-role only server-side)
packages/ui   — shared design-system components
packages/types— domain types + generated Supabase types (regenerate: `pnpm db:types`)
packages/api  — typed Supabase query/mutation functions shared by all apps
packages/i18n — RO/EN translation resources
packages/utils — small shared pure functions (e.g. slugify)
packages/monitoring — Sentry wiring for mobile/web/admin
packages/analytics — PostHog wiring + typed event catalog
packages/config — design tokens, shared ESLint/Tailwind presets
supabase/     — migrations, seed data, Edge Functions
docs/         — the full architecture blueprint (read this first)
```

## Before writing any feature code
Read `docs/15-ai-agent-instructions.md` — it is binding, not optional guidance.

## Current phase
**Session 4 (final verification pass) — this is the Cursor handoff version.**

- **Admin panel security vulnerability: FIXED.** Real session-based auth (`@supabase/ssr`, httpOnly
  cookies), verified on every admin page load and every Server Action via `requireAdmin()`.
- **Second security audit found and fixed 3 more vulnerabilities**: RLS privilege-escalation across
  8 tables, an unreachable GDPR export, and an opportunity-interest self-accept bypass.
- **Final verification pass (Session 4) found and fixed a 5th vulnerability**: `create_or_get_conversation`
  accepted `acting_as_type`/`acting_as_id` from the client with no membership check, allowing
  conversation identity spoofing at creation time — a more serious variant of the earlier fix.
- **All 9 previously-missing feature areas from Session 3, plus 5 more this session**
  (search filters UI, cookie consent banner, real video playback, custom map marker icons, and
  Edge Function-level rate limiting) are now implemented.
- 30 database migrations, 9 Edge Functions, 8 shared packages.

**Read `docs/CURSOR_HANDOFF.md` first** — it now has a 🔴 CRITICAL SECURITY ITEMS TO VERIFY FIRST
table and a strict STEP 1 → STEP 14 sequence to follow, with exact commands and exact things to
verify at each step. **Then read `docs/17-implementation-status.md`** for the full section-by-section
status, final requirement matrix, and honest completion estimate (~75-80% — the gap is runtime
validation and external service configuration, not missing code).

**Nothing in this codebase has been executed.** Every fix, every feature, every test file is
IMPLEMENTED BUT UNVERIFIED until you run it in Cursor. STEP 5 of the handoff (`supabase test db`)
is the highest-priority first action — it's the only way to confirm the security fixes actually work.

Subscriptions/Payments are deliberately not built — see `docs/16-client-decisions-mvp-scope-update.md` §5.
