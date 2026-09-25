# 16 — Client Decisions & MVP Scope Update (Confirmed)

This document records the client's confirmed answers to the 9 open items from
`14-requirement-audit.md` and supersedes the "default assumption" language in the affected
documents. **This is now the authoritative decision record** — where any other document in this
set still describes the old default/assumption, this document's answer governs.

## 1. Follow-list visibility — RESOLVED: fully public
Follower/following lists for clinics, laboratories, and dentists are **fully public** — anyone can
browse the actual list of followers (not just a count), including which patients follow a given
profile. This removes the privacy caveat previously noted in `03-security.md` §2.

**Impact:** `03-security.md` §2 `follows` row — change from "public read (configurable)" to
"public read, unconditionally, including patient-follower identities." No schema change needed
(the RLS policy was already written to support this; only the product-decision note changes).

## 2. Opportunities multi-accept — RESOLVED: multiple accepts allowed
A clinic (or laboratory) posting an opportunity can accept **multiple** interested parties; the
opportunity does **not** auto-close on the first `accepted` interest. The author decides when/if to
close it manually.

**Impact:** `07-opportunities-follow-reviews.md` Part A — `allow_multiple_accepts` default flips
from `false` to **`true`**. `opportunities.status` moves to `filled` only via an explicit manual
action by the author (never automatically on first accept). Multiple `opportunity_interests` rows
per opportunity can carry `status='accepted'` simultaneously.

## 3. Online/presence status — RESOLVED: global, platform-wide
"Online" status reflects whether the user is active anywhere in the app, not scoped per
conversation.

**Impact:** `06-feed-messaging.md` Part B — implement as a **single global Presence channel keyed
by `user_id`** (e.g., channel `presence:online-users`), not one channel per conversation. Simpler
to implement and matches the client's stated expectation of standard chat-app behavior.

## 4. Blocking effect — RESOLVED: full hide, not just messaging
Blocking a user hides that user's profile/content **completely** from the blocker across feed,
search, and map — not just messaging. This is a stronger, symmetric-effect enforcement than the
default previously described.

**Impact:** `08-verification-notifications-reports.md` Part C and `03-security.md` §3 — every
public-read query (feed, search, map, profile browsing) must additionally filter out any
`clinic`/`laboratory`/`dentist`/`post` whose owning org's `owner_user_id` (or any
`clinic_members`/`laboratory_members` row) appears in the blocker's `blocked_users` list, **from
the blocker's perspective only** (one-directional — B is not necessarily hidden from A unless A
blocked B; if B also wants A hidden, B blocks A separately). This must be implemented as a
**reusable query filter** (a Postgres function `is_blocked_by_viewer(target_owner_user_id,
viewer_user_id)` or an equivalent `NOT IN`/`NOT EXISTS` clause) applied consistently to: feed
queries, search queries, map queries, and profile detail fetches — not just messaging. Flag for
the coding agent: this is a materially larger enforcement surface than "block stops messages" and
must be tested per surface (four separate RLS/query test cases, not one).

## 5. Subscriptions/PRO plan — RESOLVED: deferred ~12 months, MVP is 100% free
**Major scope change.** There is no PRO tier, no paid plan, and no payment processing at launch.
The entire app is free for the first ~6–12 months while the platform builds its clinic/laboratory
base. This **removes Phase 18 (Subscriptions) and Phase 19 (Payments) from the MVP/V1 critical
path entirely** — they move to a later tier (see §13 roadmap update below).

Instead of commercial plan limits, the client wants **technical/anti-spam limits only**, applied
uniformly to every account (no free-vs-pro distinction):
- **Max 20–30 photos/videos per portfolio item** (client said "20-30" — recommend settling on
  **25** as the concrete default, confirm exact number with client before Phase 7, easily
  adjustable since it's config-driven, not hardcoded).
- **Max 5 active Opportunities simultaneously per account** (`status='open'`).

**Impact — this changes the database and multiple documents:**
- `02-database.md`: `plan_limits` table (§ Subscriptions) is **removed from MVP scope**. Replace
  with a much simpler, non-commercial `platform_limits` config table (or even hardcoded constants
  in a config file, since there's only one tier — a table is only worth it if the numbers might
  need runtime tuning without a redeploy, which is still worth keeping given past guidance to avoid
  hardcoding limits):
  ```sql
  create table platform_limits (
    key text primary key,             -- e.g. 'max_portfolio_media_per_item', 'max_active_opportunities'
    value int not null
  );
  -- seed: ('max_portfolio_media_per_item', 25), ('max_active_opportunities', 5)
  ```
- `clinics.plan`/`laboratories.plan` columns, the `subscriptions`, `subscription_events`, and
  `payments` tables are **removed from the MVP/V1 migration set** — they are not created until the
  monetization phase begins (~6–12 months out), avoiding unused schema sitting in production
  early. When that phase starts, `09-subscriptions-payments.md` (already written) becomes the
  spec to implement at that time — it is **not deleted from this doc set**, just marked deferred
  (see status line added to that document).
- Enforcement of the two technical limits happens via `BEFORE INSERT` triggers on
  `portfolio_media` (reject if count for the parent `portfolio_item_id` would exceed
  `platform_limits.max_portfolio_media_per_item`) and on `opportunities` (reject new `open` row
  insert if the author org already has `platform_limits.max_active_opportunities` open ones) —
  same trigger-based enforcement pattern as before, just against a flat platform-wide limit instead
  of a plan-derived one.
- `04-mobile.md` §4.5/UI: remove PRO badge, paywall modal, and "featured profile" affordances from
  MVP screens — these become V-later features, not built now. The `Subscription` feature module in
  `04-mobile.md` §1 folder structure stays in the codebase structure as a placeholder/empty module
  for now, or is simply added when that phase starts (recommend: don't scaffold it early, add it
  when the phase actually begins, per the "don't build speculatively" principle already used
  elsewhere in this architecture).
- `10-admin-panel.md`: **Subscriptions** and **Payments** sections are removed from the MVP admin
  panel scope, added later alongside the monetization phase.

## 6. Verification documents — RESOLVED: concrete document list (Romania)
| Subject | Required documents |
|---|---|
| Clinic | CUI (certificat înregistrare firmă / company registration certificate), Autorizație de funcționare de la Direcția de Sănătate Publică (DSP operating authorization), CI (ID) al reprezentantului legal |
| Laboratory | CUI, Certificat/diplomă a tehnicianului dentar responsabil, CI al reprezentantului legal |

**Impact:** `02-database.md` §8 `verification_documents.document_type` enum is finalized as:
`cui`, `dsp_authorization` (clinic-specific), `technician_certificate` (lab-specific), `id_document`,
`other`. `08-verification-notifications-reports.md` Part A's "confirm with local regulatory
requirements" caveat is resolved — this is now the concrete required set; "if we discover something
is missing later, we adjust" per the client, so `other` remains available as an escape hatch and
the enum should be treated as extensible (new value = a small migration, not a redesign).

## 7. GDPR data deletion — RESOLVED: hard delete, not anonymize-and-retain
On account deletion, personal data is deleted **permanently** (not anonymized-and-retained),
except for whatever the platform is legally required to keep — which, since there is **no payment
processing at MVP**, currently amounts to essentially nothing beyond normal operational/security
logs. This obligation reappears once the monetization phase (§5 above) introduces `payments`
records subject to financial retention law.

For reviews specifically: if a patient requests deletion of their review, the review is **deleted
entirely** (not anonymized-and-kept), and `clinics.rating_avg`/`rating_count` are recalculated
**without** it.

**Impact:**
- `11-gdpr-i18n.md` Part A "Account & data deletion" section's anonymize-and-retain approach is
  **replaced** with straightforward hard deletion of personal data on request, after a short
  operational grace window (recommend 30 days, to allow accidental-deletion recovery and to let
  in-flight moderation/report investigations complete — confirm this window with the client, it
  wasn't specified) rather than a long retention-driven anonymization pipeline. The "legal review
  must confirm" flags in that document remain relevant for whatever minimal operational retention
  is kept (e.g., fraud/abuse logs), but the financial-retention caveat no longer applies until
  payments launch.
- `02-database.md` §7 `reviews` — no anonymization column/state needed; deletion is a real
  `DELETE`, and the existing rating-recalculation trigger (already `AFTER DELETE`-aware, see
  `02-database.md` §7) already handles this correctly with no schema change required.
- `07-opportunities-follow-reviews.md` Part C's rating-calculation description already matches
  this (trigger fires on delete) — no change needed there, just confirming it's the correct
  behavior rather than the alternative anonymize-and-keep path floated in `14-requirement-audit.md`.

## 8. Web payments (Stripe) — RESOLVED: deferred with the rest of monetization
No web purchase flow at launch — folded into the same ~6–12-month-out monetization phase as §5.
When that phase begins, the client will decide whether Stripe-on-web launches simultaneously with
mobile IAP or afterward — not decided now, correctly left open since it's genuinely a later
decision, not a currently-blocking ambiguity.

## 9. Visual brand palette — outstanding
Not answered in this round; the proposed teal/warm-neutral direction from `04-mobile.md` §4.1
remains a recommendation pending client sign-off. Revisit before Phase 7 (Portfolio) at the latest,
since portfolio galleries are the most visually brand-sensitive surface in the app.

---

## Summary of Roadmap Impact (`13-roadmap.md`)

- **Phase 18 (Subscriptions) and Phase 19 (Payments) are removed from the MVP→V1 sequence** and
  become their own later phase group ("Phase M1 — Monetization," triggered by product decision
  ~6–12 months post-launch, not a fixed calendar phase number in the original 0–22 sequence).
- **Phase 2 (Database)** now includes the `platform_limits` table and its two enforcement triggers
  instead of `plan_limits`/`subscriptions`/`payments`.
- **Phase 20 (GDPR)** deletion pipeline is simplified (hard delete vs. anonymize), which is *less*
  engineering work, not more — no change to phase numbering needed.
- All other phases (0–17, 20–22) are unaffected by this round of decisions.

This document should be read alongside `14-requirement-audit.md`, which retains the original
"items requiring confirmation" list for historical traceability but should be considered **resolved
via this document** for items 1–8; item 9 remains open.
