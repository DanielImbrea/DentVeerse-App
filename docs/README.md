# DentalConnect — Architecture & Implementation Blueprint

This is the complete production architecture for the dental platform connecting **Patients ↔
Clinics/Dentists ↔ Dental Laboratories**, produced against the client specification
(`SPECIFICAȚIE PROIECT APLICAȚIE DENTARĂ`). It is a **planning document set** — no application
code has been written yet. It is designed to be handed to an AI coding agent (Claude Code / Cursor)
or a human engineering team to implement.

## How to read this set

Read in order for a first pass; use as reference thereafter.

| # | Document | Covers |
|---|---|---|
| 00 | `00-product-overview.md` | Product positioning, account types, complete feature inventory, explicit non-goals |
| 01 | `01-architecture.md` | Technology stack (with rationale), system architecture diagram, repo structure, environments |
| 02 | `02-database.md` | Full PostgreSQL/Supabase schema, every table, ERD |
| 03 | `03-security.md` | Authentication architecture, complete RLS policy table, threat model |
| 04 | `04-mobile.md` | React Native/Expo app structure, navigation, full design system & brand identity |
| 05 | `05-search-map.md` | Search architecture (Postgres FTS/trigram), map architecture (Google Maps, branded) |
| 06 | `06-feed-messaging.md` | Feed ranking/media pipeline, realtime messaging architecture |
| 07 | `07-opportunities-follow-reviews.md` | Opportunities/collaboration workflow, follow/favorites, reviews |
| 08 | `08-verification-notifications-reports.md` | Verification workflow, notification pipeline, blocking/reporting |
| 09 | `09-subscriptions-payments.md` | Free/Pro plans, Apple/Google/Stripe payment architecture, entitlement model |
| 10 | `10-admin-panel.md` | Next.js Admin Panel structure and section-by-section behavior |
| 11 | `11-gdpr-i18n.md` | GDPR compliance architecture, internationalization architecture (RO/EN + extensible) |
| 12 | `12-testing-cicd.md` | Testing strategy per layer, CI/CD pipelines, release management |
| 13 | `13-roadmap.md` | MVP/V1/V1.5/V2 phasing, 22 implementation phases with completion criteria, scaling plan |
| 14 | `14-requirement-audit.md` | **Line-by-line traceability table** confirming every client requirement is covered, plus status of the 9 confirmation items (8 resolved, 1 open) |
| 15 | `15-ai-agent-instructions.md` | Binding rules for the AI coding agent implementing this system |
| 16 | `16-client-decisions-mvp-scope-update.md` | **Authoritative record of client's confirmed answers** to the 9 open items — most importantly, MVP is 100% free (no PRO plan/payments until a later Monetization Phase). Read this alongside doc 14. |
| 17 | `17-implementation-status.md` | Honest per-area implementation accounting (what's written vs validated) |
| 18 | `18-URMATORII-PASI-SI-STATUS.md` | **Next steps + MVP checklist in Romanian** — start here for launch planning |
| 19 | `19-LANSARE-PRODUCTIE.md` | **Go-live checklist** — dentveerse.com, Supabase auth, EAS builds, legal |
| — | `SPECIFICATIE-PROIECT-APLICATIE-DENTARA.md` | **Full client specification** (sections 1–34 + confirmed decisions) |

## Key design principles carried through every document

1. **Nothing from the client specification was removed or silently simplified.** Where the spec
   was ambiguous, the ambiguity is named explicitly (see `14-requirement-audit.md`'s confirmation
   list) rather than resolved by assumption.
2. **RLS is the primary security boundary**, not application-layer checks — every table's access
   rules are specified in `03-security.md` and must be tested (see `12-testing-cicd.md`).
3. **Server-verified state only** for anything financial (subscriptions/payments) or sensitive
   (verification documents) — the client app is never trusted as the source of truth for either.
4. **Design is treated as a first-class architectural requirement**, not a final coat of paint —
   see the full design system in `04-mobile.md`.
5. **Scope discipline:** this is a discovery/portfolio/networking/collaboration platform, explicitly
   *not* a lab-work/CRM/billing system (client §32) — enforced structurally by simply not having
   tables, screens, or endpoints for those functions.

## Before implementation begins

**Status: 8 of 9 open items are resolved** — see `16-client-decisions-mvp-scope-update.md` for the
client's confirmed answers, already integrated into the affected documents. The single remaining
open item is the final visual brand palette sign-off (`04-mobile.md` §4.1), needed no later than
before Phase 7 (Portfolio). The architecture is otherwise ready to proceed into Phase 1
(repository/environment scaffolding) per `13-roadmap.md`.

**Most significant confirmed decision:** the app launches 100% free — no PRO plan, no payment
processing — for the first ~6–12 months. This removed `subscriptions`/`payments` tables and the
paywall/admin-billing UI from the MVP/V1 build scope entirely (replaced with two simple technical
anti-spam limits), meaningfully shrinking the initial build compared to the original draft
architecture.
