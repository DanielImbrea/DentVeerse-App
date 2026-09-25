# 11 — GDPR & Internationalization

## Part A — GDPR

### Explicit non-goal reminder (client §30)
The platform is **not** a medical records system. To avoid accidentally becoming one: portfolio/
case descriptions are treated as **marketing content about the org's work**, not patient medical
records — no field anywhere in the schema captures a specific patient's diagnosis, treatment plan,
or medical history tied to their identity. Before/after images in portfolios belong to the
clinic/lab (as case-study marketing material with, contractually, the depicted patient's consent
obtained by the clinic/lab outside the platform) — the platform stores no metadata linking a
portfolio image to a specific patient account. This boundary must be preserved by the coding agent:
**any feature request that would attach identifiable patient medical data to a record should be
flagged, not silently implemented.**

### Required legal/consent surfaces
- Privacy Policy, Terms & Conditions: static content (versioned) surfaced at signup and in
  Settings; acceptance recorded in `consent_records` with a `version` string so future policy
  updates can require re-acceptance from existing users.
- Cookie Policy + consent banner: **web only** (marketing site + admin, where applicable) —
  implemented via a standard consent-management pattern (e.g., a lightweight custom banner or a
  library like `react-cookie-consent`), gating any non-essential analytics/marketing cookies until
  consent is given.
- Marketing consent: separate opt-in (`consent_type='marketing'`), independent from
  terms/privacy acceptance, since GDPR requires marketing consent to be freely given and separable
  from core service usage.

### Data export ("download personal data")
1. User requests export from Settings → inserts `data_export_requests` (`status='pending'`).
2. A scheduled/triggered Edge Function assembles the user's data: `users`, profile row, owned
   org(s) if applicable, `posts`/`comments`/`reviews`/`messages` (their own sent messages —
   **not** the other party's messages in a shared conversation, which are third-party personal
   data not solely "theirs" to export; export the requesting user's own message content and
   metadata about the conversation, not the counterpart's messages verbatim), `favorites`,
   `follows`, notification history.
3. Output as a machine-readable JSON bundle written to a **private, expiring** Storage path;
   `data_export_requests.status='ready'`, notify user with a signed download link valid for a short
   window (e.g., 7 days), after which the file is deleted (`expires_at` cron cleanup).

### Account & data deletion
- **Account deletion** (user-initiated): immediate soft-delete (`users.status='deleted'`,
  `deleted_at` set) — account and any owned org profile(s) disappear from all public surfaces
  (search, feed, map, follow lists) instantly.
- **Hard deletion — confirmed by client** (`16-client-decisions-mvp-scope-update.md` §7): on
  account deletion, personal data is deleted **permanently**, not anonymized-and-retained. A
  scheduled Edge Function performs the hard delete after a short operational grace window
  (recommend 30 days, to allow accidental-deletion recovery and let any in-flight moderation/report
  investigation complete — exact window to be confirmed with the client, it wasn't specified).
  **Reviews specifically:** if a patient requests deletion of their review, it is deleted entirely
  and `clinics.rating_avg`/`rating_count` are recalculated without it (see `02-database.md` §7) —
  there is no anonymize-and-keep path for reviews.
- **No financial-retention carve-out currently applies** — since there is no payment processing at
  MVP (`16-client-decisions-mvp-scope-update.md` §5), there are no `payments`/`subscription_events`
  records requiring tax/accounting retention yet. This obligation will reappear once the
  monetization phase begins, at which point the retention window for financial records must be
  confirmed with legal counsel before that phase launches — this is deferred, not resolved.

### What GDPR review must confirm before launch (explicitly not resolved by this architecture alone)
- Exact data retention periods per data category.
- Whether patient reviews require pseudonymization vs pseudonym-free display.
- Lawful basis documentation per processing activity (a DPIA may be warranted given the
  healthcare-adjacent nature, even though no medical records are stored).
- Data Processing Agreements with every third-party processor (Supabase, Mux/Cloudflare Stream,
  Expo/push providers, Maps provider, Stripe, email provider).

## Part B — Internationalization

### Launch languages: Romanian (default) + English, architecture extensible to German, French,
Italian, Spanish, etc. (client §27).

### Strategy
- **UI strings:** `i18next` namespaced JSON resource files in `packages/i18n/{locale}/{namespace}.json`
  (e.g., `ro/common.json`, `ro/feed.json`, `en/common.json`), shared between mobile (`react-i18next`)
  and web (`next-intl` or `next-i18next`, both consuming the same JSON source of truth) — **no
  user-facing string is ever hardcoded in a component**; this is enforced via an ESLint rule
  (`i18next/no-literal-string`) as a CI check, directly answering the client's "do not hardcode
  user-facing strings" instruction.
- **Locale detection & override:** device locale detected via `expo-localization` on first launch,
  mapped to the nearest supported locale (fallback to English if the device locale isn't yet
  supported), user can override in Settings; preference persisted to `users.locale`.
- **User-generated content (posts, portfolio descriptions, reviews):** stored as **single-locale
  free text** as authored — the platform does not auto-translate user content for MVP (translation
  quality/liability risk); a future enhancement could add on-demand machine translation with a
  clearly labeled "translated" indicator, explicitly deferred rather than built speculatively.
- **Catalog data that needs multi-locale labels** (`services`, `specializations`,
  `portfolio_categories`, notification templates): stored with explicit `label_ro`/`label_en`
  columns (extensible to `label_de`, `label_fr`, etc. as new locales launch) rather than a
  generic key-value translation table — chosen because this is a small, slow-changing catalog
  (dozens of rows, not thousands), so per-locale columns are simpler to query and administer via
  the Admin Panel than a normalized translation table would be at this scale.
- **Notification/email templates:** locale-aware templates keyed by `type` + `locale`, rendered at
  send-time using the recipient's `users.locale`.
- **Search:** `to_tsvector('simple', ...)` (language-agnostic simple config) is used rather than a
  language-specific Postgres text search configuration, since the platform must handle mixed
  Romanian/English/future-language content without per-locale index duplication; diacritics
  normalization (ă/â/î/ș/ț) is handled via `unaccent` extension so "Galați" and "Galati" both match.
- **Number/date/currency formatting:** `Intl` APIs (`Intl.NumberFormat`, `Intl.DateTimeFormat`)
  throughout, never manual string formatting, so RON/EUR and date conventions adapt correctly per
  locale as the platform expands beyond Romania.

### Adding a new language later (documented process for the coding agent)
1. Add the locale code to `packages/i18n/locales.ts` and the `users.locale` check constraint (or
   remove the constraint in favor of a `supported_locales` reference table once >5 languages exist).
2. Add `packages/i18n/{locale}/*.json` resource files (professionally translated, not
   machine-translated, for a healthcare-adjacent product).
3. Add `label_<locale>` columns to catalog tables (or migrate to a normalized
   `translations` table once the number of locale columns becomes unwieldy — flagged as the
   natural refactor trigger point, e.g., beyond 4–5 languages).
4. No code changes required beyond locale-list registration — this is the payoff of the
   no-hardcoded-strings rule established at MVP.
