# 12 — Testing Strategy & CI/CD

## 1. Testing Strategy

| Layer | Tooling | Scope |
|---|---|---|
| Unit tests | **Vitest/Jest** | Pure functions: search query parsing, rating calculation logic, plan-limit derivation, notification-batching logic, i18n formatting helpers |
| Component tests | **React Native Testing Library** (mobile), **Testing Library + Vitest** (web/admin) | `packages/ui` components — every state (loading/empty/error/disabled) enumerated per component (see `04-mobile.md` §4.4) |
| Database / RLS tests | **pgTAP** or Supabase's local test harness (`supabase test db`) | Every RLS policy in `03-security.md` gets an explicit test: "patient cannot SELECT another patient's `favorites`", "clinic manager cannot UPDATE a laboratory's profile", "non-admin cannot SELECT `verification_documents`", etc. — these are treated as **security-critical**, not optional coverage, since RLS is the primary access-control mechanism |
| Integration tests | **Vitest against a local Supabase instance** (`supabase start`) | Full flows: opportunity accept → conversation creation, review insert → rating recalculation, verification approve → badge + notification |
| API/Edge Function tests | **Deno test** (native to Supabase Edge Functions) | Webhook signature verification (reject unsigned payloads), receipt validation logic, admin action audit-logging |
| Component/visual review | **Storybook** (React Native + web variants via `packages/ui`) | Every design-system component documented with all states — doubles as the design QA surface referenced in `04-mobile.md` |
| End-to-end tests | **Maestro** (mobile, YAML-based, well-suited to Expo apps) + **Playwright** (web/admin) | Critical user journeys: sign up → onboarding → first post; search → filter → view profile → message; create opportunity → interest → accept → conversation; submit review; admin approve verification |
| Mobile-specific | **EAS Build** internal distribution + manual QA pass per release candidate on real iOS/Android devices | Push notifications, camera/upload, deep links, IAP sandbox purchases — these do not reliably test in simulators/CI alone |
| Payment testing | Apple **Sandbox** testers, Google Play **License testers** / internal testing track, Stripe **test mode** | Full purchase → webhook → entitlement flow tested in staging before every release touching subscription code, using each platform's official sandbox environment, never mocked-only |
| Load/performance | **k6** or **Artillery** against staging | Feed pagination, search, map radius queries under simulated concurrent load before major scale milestones (not needed at MVP launch traffic, planned ahead of the 10k+ user milestone in `13-roadmap.md`) |

**RLS testing is called out as the highest-priority test category** given the number of tables and
polymorphic-owner patterns in this schema — a missed RLS policy or an overly permissive one is the
single highest-impact class of bug this architecture is exposed to.

## 2. CI/CD

### Source control & branching
- **GitHub**, trunk-based with short-lived feature branches, PRs required, CI must pass
  (lint + typecheck + unit + RLS tests) before merge.
- Branch → environment mapping: `main` → staging (auto-deploy), `release/*` tags → production
  (manual promotion gate, not auto-deploy, given App Store/Play review lead time and the need for a
  deliberate release process).

### Pipelines (GitHub Actions)
| Pipeline | Trigger | Steps |
|---|---|---|
| `ci.yml` | Every PR | install → lint (ESLint incl. `i18next/no-literal-string`) → typecheck (`tsc --noEmit` across all workspaces) → unit tests → component tests |
| `db-ci.yml` | PR touching `supabase/migrations/**` | spin up ephemeral Postgres → apply migrations → run pgTAP RLS test suite → run integration tests against it |
| `deploy-staging.yml` | Merge to `main` | apply migrations to `dental-staging` → deploy Edge Functions to staging project → deploy `apps/web`/`apps/admin` to staging hosting (Vercel) → trigger EAS internal-distribution build for mobile staging |
| `deploy-production.yml` | Manual approval on a `release/*` tag | apply migrations to `dental-prod` (with a pre-flight backup step) → deploy Edge Functions to prod → deploy web/admin to production hosting → trigger EAS production build → submit to App Store Connect / Google Play Console via `eas submit` |
| `e2e-nightly.yml` | Scheduled (nightly) | Maestro suite against staging build; Playwright suite against staging web/admin |

### Migrations
- Every schema change is a numbered SQL file in `supabase/migrations/`, applied via
  `supabase db push`/CI pipeline — **never** a manual dashboard schema edit in staging or
  production, which would drift from source control (explicit rule for the coding agent in
  `15-ai-agent-instructions.md`).
- Migrations are additive/backward-compatible by default (add nullable column → backfill →
  make non-null in a follow-up migration once backfilled) to avoid breaking a running app during
  deploy — destructive migrations (drop column/table) require an explicit deprecation window.

### App Store / Google Play release management
- **EAS Build** produces signed binaries for both platforms from CI, using credentials stored in
  EAS's managed credential store (not committed to the repo).
- **EAS Submit** automates submission to App Store Connect / Google Play Console.
- Staged rollout on Google Play (percentage rollout) and TestFlight beta review before wide iOS
  release, standard practice to catch device-specific issues before 100% rollout.
- Over-the-air updates (**Expo Updates/EAS Update**) used for JS-only bug fixes between store
  releases (never for native-module changes, which always require a full store submission) —
  documented as a fast-follow mechanism, not a way to bypass store review for functional changes.

### Environment variable / secrets management
EAS Secrets (mobile), Vercel/hosting platform environment variables (web/admin), Supabase project
settings (Edge Function secrets) — see `01-architecture.md` §4 for the environment separation this
protects. No secret is ever committed to the repository, referenced directly in client-bundled code,
or logged in plaintext (explicit rule reinforced in `15-ai-agent-instructions.md`).
