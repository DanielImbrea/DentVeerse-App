# 13 — Implementation Roadmap & MVP/V1/V2 Phasing

## 1. Release Tiers (client §33 preserved in full — nothing removed, only sequenced)

- **MVP/BETA:** the client's explicit priority list (§33 items 1–20), enough for a real
  closed/limited launch in Romania. **Confirmed 100% free — no PRO plan, no payments**
  (`16-client-decisions-mvp-scope-update.md` §5). Technical anti-spam limits only (25 media/
  portfolio item, 5 active opportunities/account).
- **V1:** first public launch feature-completeness — admin panel completeness, analytics,
  notification preferences, presence/seen status. Subscriptions/payments explicitly **excluded**
  from V1 per client decision.
- **V1.5:** hardening & anti-fraud enhancements identified during architecture (review anti-fraud
  heuristics, self-serve data export, dedicated search service evaluation).
- **Monetization Phase (M1):** triggered by explicit client decision, expected ~6–12 months
  post-launch — this is when `09-subscriptions-payments.md` (PRO plan, Apple/Google/Stripe
  payments) is actually built. Not on the fixed 0–22 phase timeline below; inserted when the
  client confirms it's time.
- **V2:** international expansion features (additional languages beyond RO/EN, multi-currency
  billing, region-specific verification document types), deeper analytics/recommendation
  improvements if warranted by real usage data — **never** a justification to drop something the
  client asked for; V2 items are "later," not "removed."

Every feature from `00-product-overview.md`'s inventory maps to exactly one tier below; cross-check
against `14-requirement-audit.md` for the full traceability table.

## 2. Phases

### PHASE 0 — Architecture ✅ (this document set)
Objective: produce the complete blueprint. Completion criteria: all 16 docs reviewed/approved by
stakeholders, open product-decision flags (noted throughout, e.g. follow-list visibility,
opportunity multi-accept default, block-content-visibility direction) resolved with the client.

### PHASE 1 — Repository & Environment Setup
- Features: monorepo scaffold (Turborepo), `packages/*` skeletons, three Supabase projects
  (dev/staging/prod), CI pipelines (lint/typecheck baseline), EAS project setup.
- DB changes: none yet (empty migration baseline).
- Frontend: Expo app skeleton with navigation shell (empty screens), Next.js web/admin skeletons.
- Backend: Supabase project provisioning, PostGIS/pg_trgm/unaccent extensions enabled.
- Dependencies: none (first phase).
- Tests: CI pipeline runs green on an empty repo.
- Completion: `eas build` produces an installable dev-client build; `next dev` runs both web apps;
  CI green.

### PHASE 2 — Database
- Features: full schema from `02-database.md` as versioned migrations, RLS policies from
  `03-security.md`, seed data for `services`/`specializations`/`portfolio_categories`.
- DB changes: everything in `02-database.md`.
- Tests: pgTAP RLS suite (every policy in §2 of `03-security.md` gets at least one allow + one deny
  test).
- Completion: `supabase db push` succeeds on all three environments; RLS test suite green.

### PHASE 3 — Authentication
- Features: email/password, phone OTP, Google, Apple sign-in; account-type selection (immutable);
  email verification gate; forgot/change password; logout-all-devices; account deletion (soft).
- DB: `users` triggers (account_type immutability, auth.users mirror).
- Frontend: `(auth)` stack, `authStore`.
- Backend: Auth hooks/triggers, `bootstrap-profile` Edge Function.
- Tests: RLS + integration tests for signup→profile-bootstrap; E2E happy-path sign-up per method.
- Completion: a user can register via all four methods on real devices and land in onboarding.

### PHASE 4 — Profiles (Patient / Clinic / Laboratory core)
- Features: profile creation/edit for all three account types (client §2–3, §7), onboarding flows.
- DB: `patient_profiles`, `clinics`, `laboratories` CRUD paths exercised.
- Frontend: onboarding stacks, profile edit screens, `ProfileHeader` component (role-variant).
- Tests: component tests for `ProfileHeader` variants; RLS tests for owner-only writes.
- Completion: all three account types can complete onboarding and view their own profile.

### PHASE 5 — Clinic/Laboratory Team & Details
- Features: `dentists` (clinic team), `clinic_members`/`laboratory_members` (org access roles),
  working hours, socials, location/geocoding.
- DB: as above; PostGIS location population via geocoding Edge Fn.
- Tests: RLS tests for member-role-gated writes; geocoding Edge Fn integration test.
- Completion: a clinic can add team members and appear correctly geolocated.

### PHASE 6 — Services
- Features: services catalog (admin-seeded), clinic/lab service instance CRUD.
- DB: `services`, `clinic_services`, `laboratory_services`.
- Tests: RLS + component tests for service picker.
- Completion: services display correctly on public profiles.

### PHASE 7 — Portfolio
- Features: portfolio CRUD, categories, before/after, media upload pipeline (image + video
  transcoding integration), fullscreen gallery viewer.
- DB: `portfolio_items`, `portfolio_media`.
- Backend: upload Edge Fn, Mux/Cloudflare Stream integration.
- Tests: upload flow integration test; gallery component tests (all states).
- Completion: a clinic/lab can publish a full case with before/after and video, viewable publicly.

### PHASE 8 — Search
- Features: global search, filters, autocomplete (recent/popular/recommended).
- DB: `tsvector`/`pg_trgm` indexes, query-parsing logic.
- Tests: search relevance test cases (the client's example queries specifically), RLS read tests.
- Completion: the three example queries from the client spec return correct, ranked results.

### PHASE 9 — Map
- Features: branded map, custom markers/clustering, marker preview card, map/list toggle.
- Backend: PostGIS radius queries.
- Tests: geo-query correctness tests; component tests for marker/cluster rendering.
- Completion: map matches the branded design and correctly clusters/filters.

### PHASE 10 — Feed
- Features: post CRUD (clinic/lab), post-type visual variants, pagination, ranking (follow +
  discovery mix), media handling.
- DB: `posts`, `post_media`.
- Tests: feed ranking unit tests, pagination integration tests, component tests per post-type card.
- Completion: feed renders all post types correctly with working infinite scroll.

### PHASE 11 — Follow / Favorites / Likes / Comments / Saves
- Features: all social-graph interactions from client §15–18.
- DB: `follows`, `favorites`, `likes`, `comments`, `saves`.
- Tests: RLS + duplicate-prevention tests; optimistic-UI component tests.
- Completion: all interactions work with correct denormalized counters.

### PHASE 12 — Messaging
- Features: full realtime messaging (client §17), conversation creation rules, attachments,
  seen/unread, block/report integration.
- DB: `conversations`, `conversation_members`, `messages`, `message_attachments`.
- Backend: `create_or_get_conversation` RPC, Realtime channel wiring.
- Tests: allowed-pair rule tests, block-enforcement tests, E2E chat flow (Maestro).
- Completion: all five allowed conversation pair types work end-to-end with attachments.

### PHASE 13 — Opportunities
- Features: full workflow from `07-opportunities-follow-reviews.md` Part A.
- DB: `opportunities`, `opportunity_interests`.
- Tests: state-machine tests (duplicate prevention, accept/reject/cancel edge cases).
- Completion: accept flow correctly creates a linked conversation; duplicate interest blocked.

### PHASE 14 — Notifications
- Features: full event catalog, in-app center, push dispatch, preferences, batching, deep links.
- DB: `notifications`, `notification_preferences`, `devices`.
- Backend: trigger + push-dispatch Edge Fn pipeline.
- Tests: trigger-fires-for-every-event-type test matrix; push-dispatch integration test (mocked
  Expo Push API).
- Completion: every event in the catalog reliably produces both in-app and push notifications
  respecting preferences.

### PHASE 15 — Reviews
- Features: review CRUD, category ratings, rating recalculation, report/delete.
- DB: `reviews` + trigger.
- Tests: uniqueness constraint tests, rating recalculation correctness tests.
- Completion: reviews correctly affect `clinics.rating_avg` and respect one-per-patient rule.

### PHASE 16 — Verification
- Features: submission, private document storage, admin review workflow, badge.
- DB: `verification_requests`, `verification_documents`.
- Backend: upload Edge Fn, admin signed-URL Edge Fn (audit-logged).
- Tests: RLS tests confirming documents are unreadable by non-admins (highest-priority security
  test in this phase).
- Completion: full submit→approve→badge flow works; document access is provably admin-only.

### PHASE 17 — Admin Panel
- Features: full Next.js admin app per `10-admin-panel.md`.
- Backend: admin Route Handlers/Server Actions, `admin_users`, `audit_logs`.
- Tests: Playwright E2E for core admin flows (ban user, approve verification, resolve report).
- Completion: admin can fully moderate the platform from the panel; every action audit-logged.

### PHASE 18 — Technical Platform Limits (replaces "Subscriptions" for MVP)
- Features: `platform_limits` table + enforcement triggers on `portfolio_media` (max 25/item) and
  `opportunities` (max 5 active/account) — flat, non-commercial, applied to every account equally.
- DB: `platform_limits` (see `02-database.md` §11).
- Tests: trigger-rejection tests at the boundary (26th photo rejected, 6th open opportunity
  rejected).
- Completion: limits enforced server-side; confirmed with client that this fully replaces
  Phase 18/19 for MVP (`subscriptions`/`payments` deferred, see below).

### PHASE 19 — *(Deferred: Payments)*
Not part of the MVP/V1 sequence. See **Monetization Phase (M1)** below — triggered by explicit
client decision ~6–12 months post-launch, implementing the full spec in
`09-subscriptions-payments.md` at that time.

### PHASE 20 — GDPR
- Features: consent flows, data export, deletion pipeline, privacy/terms/cookie surfaces.
- DB: `consent_records`, `data_export_requests`.
- Tests: export-completeness test (does the bundle actually contain everything owed), deletion
  cascade test.
- Completion: legal review sign-off obtained (external to engineering, but a hard gate before
  production launch).

### PHASE 21 — Testing Hardening & Performance
- Features: closing any test-coverage gaps from earlier phases, load testing against staging,
  addressing bottlenecks found (see `13-roadmap.md` §3 below).
- Completion: E2E suite green nightly for two consecutive weeks pre-launch; load test targets met.

### PHASE 22 — Production Launch
- Features: App Store/Play Store submission and review, production monitoring/alerting setup
  (Sentry, Supabase logs/metrics dashboards), staged rollout.
- Completion: app live in both stores, monitoring dashboards actively watched for the first 2 weeks
  post-launch.

### PHASE M1 — Monetization (triggered separately, not on the fixed timeline; ~6–12 months post-launch)
- Objective: introduce the PRO plan and payment processing, once the client decides it's time.
- Features: full `09-subscriptions-payments.md` spec — Free/PRO plans, Apple IAP, Google Play
  Billing, optionally Stripe web (client to decide simultaneity with mobile IAP at that time).
- DB: add `subscriptions`, `subscription_events`, `payments`, `plan_limits`,
  `clinics.plan`/`laboratories.plan` via new migrations; decide whether `platform_limits` (Phase 18)
  is extended with plan-aware variants or superseded.
- Frontend: paywall, plan comparison, PRO badge, stats dashboard, purchase flow (dev-client/EAS
  build required for IAP, per `01-architecture.md` §1).
- Backend: `verify-apple-receipt`, `google-rtdn-handler`, and (if applicable) `stripe-webhook-handler`
  Edge Functions.
- Admin: build out the Subscriptions/Payments admin sections (deferred from Phase 17, see
  `10-admin-panel.md`).
- Tests: sandbox purchase flow tests on both platforms, webhook signature-rejection tests.
- Completion: full purchase→entitlement flow verified in both app stores' sandbox environments;
  GDPR financial-record retention period confirmed with legal counsel before this phase goes live
  (see `11-gdpr-i18n.md`).
- **This phase does not begin until the client explicitly triggers it** — do not scaffold any of
  this speculatively during Phases 1–22.

## 3. Anticipated Bottlenecks & Scaling Plan (client §26)

| Growth stage | Likely bottleneck | Mitigation already designed in |
|---|---|---|
| 1k–10k users | Feed query cost if counters weren't denormalized | Denormalized counters from day one (`02-database.md` §15) |
| 10k–100k users | Search latency on `tsvector`/`pg_trgm` at scale | Documented trigger point to introduce Meilisearch/Typesense (`05-search-map.md`) |
| 10k–100k users | Realtime connection count for messaging/presence | Supabase Realtime scales horizontally on their infra; monitor connection metrics, consider presence channel consolidation if needed |
| Any stage | Media bandwidth/storage cost | CDN caching + on-the-fly image resizing + video via dedicated streaming provider from day one, not an afterthought |
| Any stage | Postgres write contention on high-frequency counters (likes) | Counters updated via lightweight triggers; if contention appears, evaluate moving to periodic batch reconciliation instead of synchronous triggers |
| 100k+ users, European expansion | Single-region latency for EU users outside Romania | Supabase supports region selection; evaluate read replicas / edge caching (Storage CDN already global) closer to launch |
