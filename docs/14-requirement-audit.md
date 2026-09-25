# 14 — Final Architecture Audit (Traceability to Client Specification)

Every numbered section of the client specification (`SPECIFICAȚIE PROIECT APLICAȚIE DENTARĂ`) is
checked below against where it is addressed in this architecture.

| Client Req (§) | Requirement | Architecture Location | Database | Mobile | Web/Admin | Backend | Status |
|---|---|---|---|---|---|---|---|
| §1 | Scope: connect patients/clinics/labs, no lab-work/order management | `00-product-overview.md` §1, §4 | n/a (explicit non-goal) | — | — | — | ✅ Covered |
| §2 | Patient account (registration methods, profile fields, capabilities) | `00` feature #1,#3; `04-mobile.md` §2 | `users`, `patient_profiles` | Patient onboarding/profile screens | — | Auth flows | ✅ Covered |
| §3 | Clinic account (profile fields, Maps integration) | `00` #4,#5; `05-search-map.md` §2 | `clinics` | Clinic onboarding/profile edit | — | Geocoding Edge Fn | ✅ Covered |
| §4 | Clinic team (dentists, specializations) | `00` #6 | `dentists`, `specializations` | Team management screens | — | CRUD | ✅ Covered |
| §5 | Clinic services | `00` #7 | `services`, `clinic_services` | Service picker | — | CRUD | ✅ Covered |
| §6 | Clinic portfolio (photo/video/before-after/categories) | `00` #8 | `portfolio_items`, `portfolio_media` | Gallery/uploader | — | Media pipeline | ✅ Covered |
| §7 | Laboratory account (profile fields incl. experience/team size/collaboration zone) | `00` #9 | `laboratories` | Lab onboarding/profile | — | — | ✅ Covered |
| §8 | Laboratory services | `00` #10 | `services`, `laboratory_services` | Service picker | — | CRUD | ✅ Covered |
| §9 | Laboratory portfolio (categories incl. Anterior/Posterior/etc.) | `00` #11 | `portfolio_items`, `portfolio_media` | Gallery | — | Media pipeline | ✅ Covered |
| §10 | Open for Collaboration toggle + note | `00` #12 | `clinics.open_for_collaboration`, `laboratories.open_for_collaboration` | Profile badge/toggle | — | — | ✅ Covered |
| §11 | Opportunities (post, Interested, accept, conversation start, both directions) | `00` #13; `07-opportunities-follow-reviews.md` Part A | `opportunities`, `opportunity_interests` | Opportunities tab | Admin monitoring | State-machine Edge Fn | ✅ Covered |
| §12 | Global search (clinics/cabinets/medici/labs/services/cities/specializations) | `00` #14; `05-search-map.md` §1 | `tsvector`/`pg_trgm` indexes | Search screen | — | Query parsing | ✅ Covered |
| §13 | Filters (clinics + laboratories, incl. collaboration zone) | `00` #15; `05-search-map.md` §1 | filterable column indexes | Filter sheet | — | Parametrized queries | ✅ Covered |
| §14 | Dental Map (filters, marker tap → preview) | `00` #16; `05-search-map.md` §2 | PostGIS `location` | Branded map component | — | Radius query | ✅ Covered |
| §15 | Feed (content types, interactions) | `00` #17,#18; `06-feed-messaging.md` Part A | `posts`, `post_media`, `likes`, `comments`, `saves` | Feed screen, PostCard variants | — | Ranking/pagination logic | ✅ Covered |
| §16 | Follow system (followers/following) | `00` #19; `07-opportunities-follow-reviews.md` Part B | `follows` | Follow button, followers/following lists | — | — | ✅ Covered |
| §17 | Messaging (all pair types, text/photo/file, seen, online, block, report) | `00` #21,#22,#23; `06-feed-messaging.md` Part B | `conversations`, `messages`, `message_attachments`, `blocked_users`, `reports` | Chat UI | — | Realtime + RPC | ✅ Covered |
| §18 | Favorites (per-role save scopes) | `00` #20; `07-opportunities-follow-reviews.md` Part B | `favorites` | Favorites screen | — | — | ✅ Covered — see documented Save/Favorite distinction |
| §19 | Verification (documents admin-only, badge) | `00` #24; `08-verification-notifications-reports.md` Part A; `03-security.md` §4 | `verification_requests`, `verification_documents` | Submission flow, badge display | Admin review queue | Upload + admin signed-URL Edge Fns | ✅ Covered |
| §20 | Reviews (1–5 stars, categories, report, admin delete, anti-spam) | `00` #25; `07-opportunities-follow-reviews.md` Part C | `reviews` | Review form/display | Admin review moderation | Rating trigger | ✅ Covered; lab reviews explicitly deferred per spec's own note |
| §21 | Notifications (event catalog) | `00` #26; `08-verification-notifications-reports.md` Part B | `notifications`, `devices` | Notification center | — | Trigger + push dispatch pipeline | ✅ Covered |
| §22 | Main menu (Home/Discover/Opportunities/Messages/Profile) | `04-mobile.md` §2 | — | Bottom tab navigator | — | — | ✅ Covered |
| §23 | Subscription system (Free/Pro) | `00` #28,#36; `09-subscriptions-payments.md` §1 (full spec kept, **deferred from MVP**) | `subscriptions`, `plan_limits` (not created until Monetization Phase M1) | Paywall/plan comparison (deferred) | Admin subscriptions view (deferred) | Entitlement checks (deferred) | ✅ Covered architecturally — **client confirmed deferral to ~6–12 months post-launch**, MVP is 100% free (`16-client-decisions-mvp-scope-update.md` §5) |
| §24 | Payments (Apple IAP, Google Play Billing, Stripe web) | `00` #29; `09-subscriptions-payments.md` §3 (full spec kept, **deferred from MVP**) | `payments`, `subscription_events` (not created until Phase M1) | Purchase flow (deferred) | Admin payments view (deferred) | Webhook/receipt validation Edge Fns (deferred) | ✅ Covered architecturally — deferred, see above |
| §25 | Admin Panel (all listed sections + dashboard) | `00` #30; `10-admin-panel.md` | reads across schema; `admin_users`, `audit_logs` | — | Full Next.js admin app | Service-role Route Handlers | ✅ Covered |
| §26 | Report system (targets + reasons) | `00` #23; `08-verification-notifications-reports.md` Part C | `reports` | Report sheet | Admin moderation queue | — | ✅ Covered |
| §27 | Languages (RO/EN, extensible) | `00` #32; `11-gdpr-i18n.md` Part B | catalog `label_ro`/`label_en` columns | i18next integration | next-intl | Locale-aware templates | ✅ Covered |
| §28 | Platforms (iOS, Android, web) | `01-architecture.md` §1 | — | Expo/React Native | Next.js marketing site | — | ✅ Covered |
| §29 | Login/security (email verification, forgot/change password, 2FA optional, block, delete account, logout devices) | `00` #1,#34; `03-security.md` §1 | `users` triggers | Auth screens/settings | — | Supabase Auth + MFA | ✅ Covered |
| §30 | GDPR (policies, consent, export, delete, no medical records) | `00` #31; `11-gdpr-i18n.md` Part A | `consent_records`, `data_export_requests` | Consent screens, settings | — | Export/deletion Edge Fns | ✅ Covered — legal review flagged as required pre-launch |
| §31 | B2C / B2B structural principle | `00-product-overview.md` §5 | — | — | — | — | ✅ Covered (design principle, not a discrete feature) |
| §32 | Explicit non-goals (no lab work mgmt, no CRM, no billing/accounting, no internal mgmt) | `00-product-overview.md` §4 | No tables for these exist | No screens for these exist | No admin sections for these exist | No endpoints for these exist | ✅ Covered — confirmed absent by design |
| §33 | MVP priority list (20 items) | `13-roadmap.md` §1–2 | — | — | — | — | ✅ Covered — mapped 1:1 into Phases 3–17 |
| §34 | Final objective / extensibility to Europe | `01-architecture.md` (i18n-ready stack, region-agnostic Supabase deployment), `11-gdpr-i18n.md` | — | — | — | — | ✅ Covered as a cross-cutting design principle |

## Items Requiring Explicit Client/Product Confirmation Before Build — STATUS UPDATE

All nine items below were sent to the client for confirmation. **Eight are now resolved**; the
authoritative answers are recorded in `16-client-decisions-mvp-scope-update.md` and have already
been folded into the affected documents (schema, RLS, roadmap, etc.). Item 9 remains open.

1. ✅ **RESOLVED — Follow-list visibility:** fully public, including individual patient-follower
   identities. See `16-client-decisions-mvp-scope-update.md` §1; `03-security.md` §2 updated.
2. ✅ **RESOLVED — Opportunity multi-accept:** multiple accepts allowed, no auto-close on first
   accept. See `16-client-decisions-mvp-scope-update.md` §2; `07-opportunities-follow-reviews.md`
   Part A updated.
3. ✅ **RESOLVED — Presence scope:** global, platform-wide (not per-conversation). See
   `16-client-decisions-mvp-scope-update.md` §3; `06-feed-messaging.md` Part B updated.
4. ✅ **RESOLVED — Blocking's effect on content visibility:** full hide from feed/search/map, not
   just messaging. See `16-client-decisions-mvp-scope-update.md` §4; `03-security.md` §3 and
   `08-verification-notifications-reports.md` Part C updated.
5. ✅ **RESOLVED (major scope change) — No PRO plan at MVP:** app is 100% free for the first
   ~6–12 months; only flat technical anti-spam limits apply (25 media/portfolio item, 5 active
   opportunities/account). Subscriptions/payments deferred to a later "Monetization Phase (M1)."
   See `16-client-decisions-mvp-scope-update.md` §5; `02-database.md` §11, `09-subscriptions-payments.md`
   (status banner added), `10-admin-panel.md`, and `13-roadmap.md` all updated.
6. ✅ **RESOLVED — Required verification documents (Romania):** Clinic = CUI + DSP operating
   authorization + representative's CI. Laboratory = CUI + responsible technician's
   certificate/diploma + representative's CI. See `16-client-decisions-mvp-scope-update.md` §6;
   `08-verification-notifications-reports.md` Part A updated.
7. ✅ **RESOLVED — GDPR deletion approach:** hard delete of personal data on request (not
   anonymize-and-retain); deleted reviews are removed entirely and ratings recalculated without
   them. No financial-retention carve-out currently applies (no payments at MVP). See
   `16-client-decisions-mvp-scope-update.md` §7; `11-gdpr-i18n.md` Part A and `02-database.md` §7
   updated.
8. ✅ **RESOLVED — Web Stripe payments:** deferred along with the rest of monetization; timing
   relative to mobile IAP to be decided when that phase begins. See
   `16-client-decisions-mvp-scope-update.md` §8.
9. ⏳ **STILL OPEN — Visual brand palette final sign-off:** the teal/warm-neutral direction in
   `04-mobile.md` §4.1 remains a recommendation pending client approval. Revisit no later than
   before Phase 7 (Portfolio), the most visually brand-sensitive surface.

## Conclusion

Every functional requirement present in the supplied client specification is represented in this
architecture with a concrete database, backend, and frontend location, and mapped to an
implementation phase. No requirement was silently dropped or simplified; where the specification's
own wording left an implementation detail open (items 1–9 above), that ambiguity is surfaced
explicitly rather than resolved unilaterally, per the master prompt's own instruction not to
silently change requirements.
