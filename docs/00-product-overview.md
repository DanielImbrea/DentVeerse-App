# 00 — Product Overview & Feature Inventory

## 1. Product Positioning

**DentalConnect** (working name) is a professional dental ecosystem connecting three user types:

```
PATIENT  ↔  CLINIC / DENTIST  ↔  DENTAL LABORATORY
```

It is **not**: a lab-work management tool, a clinic CRM, a billing/accounting system, or an
internal production tracker (explicitly excluded per client spec §32). It **is**: a discovery,
portfolio, networking, marketing and collaboration platform — closer to "LinkedIn + Instagram +
Google Maps, purpose-built for dentistry" than to a generic business directory.

Primary platform: **mobile (iOS + Android)**. Secondary: marketing website + web Admin Panel.

## 2. Account Types

| Type | Registration | Core capability |
|---|---|---|
| **Patient** | Email, phone, Google, Apple | Discover, follow, favorite, message clinics, review clinics |
| **Clinic** | Same + account-type selection | Publish profile/team/services/portfolio/feed, find labs, receive patients |
| **Laboratory** | Same + account-type selection | Publish profile/services/portfolio/feed, find clinics, collaborate |

A user is a single root identity (`auth.users`) with exactly one `account_type` and one associated
profile row (patient / clinic / laboratory). Clinics and laboratories are **organization accounts**
(can have team members with roles — see §04 Auth).

## 3. Complete Feature Inventory

Legend — Complexity: S small, M medium, L large, XL very large. Phase: MVP (client §33), V1, V1.5, V2.

| # | Feature | Users | Frontend | Backend | DB | Storage | 3rd-party | Security notes | Complexity | Phase |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Registration (email/phone/Google/Apple) | All | Auth screens, OTP/social buttons | Supabase Auth, Edge Fn for profile bootstrap | `users`, `patient_profiles`/`clinic_profiles`/`laboratory_profiles` | — | Google/Apple OAuth, SMS (Twilio/Supabase) | Rate limit signup, email verification required | M | MVP |
| 2 | Account type selection | Clinic/Lab | Onboarding stepper | Edge Fn sets `account_type` (immutable after set) | `users.account_type` | — | — | Cannot be changed client-side post-creation | S | MVP |
| 3 | Patient profile | Patient | Profile screen/edit | CRUD via RLS-scoped queries | `patient_profiles` | avatar bucket | — | Own-row only access | S | MVP |
| 4 | Clinic profile (general info, socials, hours) | Clinic | Profile edit form | CRUD | `clinics` | logo/cover bucket | — | Editable by clinic admins/owners only | M | MVP |
| 5 | Clinic location + map presence | Clinic, Patient | Map pin, address form | Geocoding Edge Fn | `clinics.location (geography)` | — | Google Maps/Mapbox geocoding | Validate coordinates | M | MVP |
| 6 | Clinic team (dentists) | Clinic, Patient | Team list/detail, add/edit dentist | CRUD | `dentists`, `clinic_members` | dentist photo bucket | — | Only clinic owner/admin can manage | M | MVP |
| 7 | Clinic services | Clinic, Patient | Service picker + custom entries | CRUD | `services` (catalog), `clinic_services` | service image bucket | — | Catalog is shared/admin-curated; instance is clinic-owned | M | MVP |
| 8 | Clinic portfolio (photo/video/before-after/categories) | Clinic, Patient | Gallery, uploader, category filter, fullscreen viewer | CRUD, media processing | `portfolio_items`, `portfolio_media` | portfolio bucket (public read) | Video transcoding (Mux/Cloudflare Stream) | Only owner can write; public read | L | MVP |
| 9 | Laboratory profile (incl. experience years, team size, collaboration zone) | Lab, Clinic, Patient | Profile edit form | CRUD | `laboratories` | logo/cover bucket | — | Same pattern as clinic | M | MVP |
| 10 | Laboratory services | Lab, Clinic | Service picker | CRUD | `services`, `laboratory_services` | — | — | Same as #7 | M | MVP |
| 11 | Laboratory portfolio | Lab, Clinic, Patient | Gallery w/ categories | CRUD, media processing | `portfolio_items`, `portfolio_media` | portfolio bucket | Video transcoding | Same as #8 | L | MVP |
| 12 | Open for Collaboration toggle + message | Clinic, Lab | Profile badge + settings toggle | Simple update | `clinics.open_for_collaboration`, `laboratories.open_for_collaboration` | — | — | Owner-only write | S | MVP |
| 13 | Opportunities (post request, Interested, accept/reject) | Clinic, Lab | List, detail, create form, interest button, review interests | CRUD + state machine + notification trigger | `opportunities`, `opportunity_interests` | attachment bucket (optional) | — | State transitions server-validated; prevent duplicate interest | L | MVP |
| 14 | Global search (clinics, dentists, labs, services, cities, specializations) | All | Search bar, results, autocomplete | Postgres FTS/trigram or external search | `search` views/materialized view, `search_history` | — | Optional Meilisearch/Typesense at scale | Public read only of public fields | L | MVP |
| 15 | Filters (city, specialization, service, rating, verified, collaboration, zone) | All | Filter sheet | Parametrized queries | indexes on filterable columns | — | — | — | M | MVP |
| 16 | Dental Map (clinics/dentists/labs, clustering, marker preview) | All | Branded map component, clustering, preview cards | Geo query (PostGIS `ST_DWithin`) | `clinics.location`, `laboratories.location` (PostGIS) | — | Google Maps SDK or Mapbox | Only public profile fields exposed | L | MVP |
| 17 | Feed (photo/video/text/portfolio/announcement/collaboration posts) | Clinic, Lab (publish), all (view) | Feed list, composer, post detail | CRUD, pagination, ranking | `posts`, `post_media` | post media bucket | Video transcoding | Publish restricted to clinic/lab owners; patients read-only | XL | MVP |
| 18 | Feed interactions (like, comment, save, share) | All | Interaction bar, comment thread | CRUD + counters | `likes`, `comments`, `saves` | — | — | Rate-limit to prevent spam | L | MVP |
| 19 | Follow system (clinics, dentists, labs) | All | Follow button, followers/following lists | CRUD, unique constraint | `follows` | — | — | Prevent self-follow, duplicates | M | MVP |
| 20 | Favorites (patient/clinic/lab save entities) | All | Favorites screen | CRUD | `favorites` | — | — | Polymorphic target, unique constraint | M | MVP |
| 21 | Private messaging (all pair types, text/photo/file, seen, block, report) | All | Conversation list, chat UI, attachments | Realtime channels, Edge Fn for permission checks | `conversations`, `conversation_members`, `messages`, `message_attachments` | message attachment bucket (private, signed URLs) | Supabase Realtime | Only members can read; attachments private+signed URL only | XL | MVP |
| 22 | Block user | All | Block action in chat/profile | CRUD, filters all queries | `blocked_users` | — | — | Symmetric enforcement across feed/search/messaging | M | MVP |
| 23 | Report (profile/post/comment/message/review) | All | Report sheet w/ reason picker | CRUD, notifies admin | `reports` | — | — | Reporter identity hidden from reported party | M | MVP |
| 24 | Verification (clinic/lab, document submission, admin review, badge) | Clinic, Lab, Admin | Submission form, status banner, badge | CRUD + admin workflow + notification | `verification_requests`, `verification_documents` | **private** verification bucket, signed URLs, admin-only | — | Documents NEVER public; admin-only RLS + service-role Edge Fn | L | MVP |
| 25 | Reviews (1–5 star, categories, patient→clinic) | Patient, Clinic | Review form, rating display, aggregate stars | CRUD + rating recalculation (trigger) | `reviews` | — | — | One review per patient per clinic; anti-spam (e.g. cooldown) | M | MVP |
| 26 | Notifications (in-app + push) | All | Notification center, push permission prompt | Event-driven inserts, push dispatch Edge Fn | `notifications`, `devices` | — | Expo Push / FCM / APNs | User-scoped read; preference-gated push | L | MVP |
| 27 | Notification preferences | All | Settings toggles | CRUD | `notification_preferences` | — | — | — | S | V1 |
| 28 | Subscriptions (Free/Pro, monthly/annual) | Clinic, Lab (Patient later) | Paywall, plan comparison, manage subscription | Webhook processing, entitlement checks | `subscriptions`, `subscription_events` | — | Apple StoreKit, Google Play Billing, Stripe | Server-side entitlement verification only, never trust client | L | V1 |
| 29 | Payments processing | Clinic, Lab | Purchase flow (native IAP), Stripe checkout (web) | Receipt/webhook validation Edge Fns | `payments` | — | App Store Server API, Google Play Developer API, Stripe | PCI handled by Stripe/Apple/Google; store no card data | L | V1 |
| 30 | Admin Panel (users, clinics, labs, posts, comments, reviews, reports, opportunities, verifications, subscriptions, payments, bans, dashboard) | Admin | Next.js dashboard, tables, detail views | Admin-scoped RPC/Edge Fns, service-role only | reads across all tables; `admin_users`, `audit_logs` | — | — | Admin auth separate role; every write audit-logged | XL | MVP (core) / V1 (full) |
| 31 | GDPR (privacy/terms/cookie consent, data export, account/data deletion) | All | Consent screens, settings → export/delete | Edge Fn: data export job, cascading soft/hard delete | `consent_records`, `data_export_requests` | export files bucket (private, expiring) | — | Export only own data; deletion cascades per retention policy | L | MVP (policies) / V1 (self-service export) |
| 32 | Internationalization (RO/EN, extensible) | All | i18n framework, locale switch | Locale-aware content columns/tables where needed | `i18n_strings` (optional CMS) or static JSON | — | — | — | M | MVP |
| 33 | Analytics | All (tracked), Admin (viewer) | Event tracking hooks | Event ingestion (PostHog/Amplitude/Supabase log) | `analytics_events` (or 3rd party) | — | PostHog/Amplitude | Consent-gated | M | V1 |
| 34 | Blocking abuse / rate limiting / bot defense | All | — | Edge middleware, Supabase rate limiting, CAPTCHA on signup | — | — | Cloudflare Turnstile/hCaptcha | See Security Threat Model | M | MVP |
| 35 | Online/offline & seen status in chat | All | Presence indicator, read receipts | Supabase Realtime Presence | `messages.seen_at` | — | — | Optional per client (§17) | M | V1 |
| 36 | PRO features (extended portfolio limits, stats, featured profile, badge, priority ranking) | Clinic, Lab | Stats dashboard, PRO badge, upload limit gating | Entitlement checks gate limits | `profile_stats`, entitlement flags | — | — | Enforced server-side, not just UI hiding | L | V1 |

This table is not exhaustive of every column-level decision (see `02-database.md`) but represents
every functional requirement in the client specification. Cross-reference with
`14-requirement-audit.md` for line-by-line coverage confirmation against the original spec.

## 4. Explicit Non-Goals (client §32)

The platform must **not** implement: lab work/order tracking, work tickets ("fișă lucrare"),
patient management/EHR for clinics, CRM, invoicing, accounting, or internal
clinic/lab operations management. Any coding agent proposing such features must stop and flag it
— it is out of scope by explicit client instruction.

## 5. Structural Principle

```
B2C:  PATIENT → CLINIC / DENTIST        (discovery, review, messaging)
B2B:  CLINIC  → LABORATORY               (collaboration, opportunities)
```

Both flows share the same primitives: profiles, portfolio, feed, follow, favorites, messaging,
search, map, verification, notifications. This shared-primitive design is why the database and
component architecture treat "Clinic" and "Laboratory" as sibling entity types with a common
interface rather than fully separate silos (see `02-database.md` §2 and `04-mobile.md` §3).
