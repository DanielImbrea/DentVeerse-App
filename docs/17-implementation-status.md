# 17 — Implementation Status (Honest Accounting)

## 🔴→🟢 SESSION 4 SUMMARY (final verification pass) — read this first

This session was a strict final verification pass before Cursor handoff, per explicit instruction:
no new major features, no architecture changes for their own sake — only (1) confirming the 4
previously-reported security fixes are real, (2) systematically searching for similar remaining
vulnerability patterns, (3) implementing the small number of remaining gaps that genuinely don't
need runtime/external credentials, and (4) finalizing documentation.

**Confirmed by direct code inspection** (not just re-reading prior claims): all 4 previously-reported
fixes are genuinely present in the code — `apps/admin/lib/requireAdmin.ts` exists and is called at
the top of all 9 admin dashboard pages; zero hidden `adminId` form fields remain anywhere in
`apps/admin`; the `opportunity_interests` UPDATE policy is split with distinct `WITH CHECK`
constraints per actor; `conversation_members` identity columns are protected by a trigger; the
`get-data-export-url` Edge Function exists and checks `exportRequest.user_id !== callerId` before
issuing a signed URL.

**A 5th vulnerability was found during the systematic pattern search** (the search explicitly
requested: "acting_as values controlate de client") — **and fixed**: `create_or_get_conversation`
(the RPC that creates messaging conversations) accepted `acting_as_type`/`acting_as_id` from the
caller with **no verification that the caller actually manages the org they claimed to represent**,
nor that the counterparty did either. This is a more serious variant of the `conversation_members`
UPDATE bug fixed last session — that fix only protected against *later* tampering with an
already-correctly-created row; this gap allowed the row to be **spoofed at creation time**, which
the UPDATE-focused trigger did nothing to prevent. Fixed in
`supabase/migrations/0028_fix_conversation_identity_spoofing.sql` by re-defining the function with
real `clinic_members`/`laboratory_members` membership checks for both parties before either INSERT.

**Implemented this session** (all genuinely possible without runtime execution or external
credentials):
- **Search filters UI** — a real filter bottom sheet (city, verified-only, open-for-collaboration-
  only) on the Discover screen, wired to an extended `global_search` RPC that now accepts these
  filter parameters (previously only the map's `nearby_clinics`/`nearby_laboratories` RPCs did).
- **Cookie consent banner** on `apps/web` — real client component, records the choice locally and
  (best-effort) in `consent_records` for authenticated visitors.
- **Video playback** in the portfolio gallery viewer — previously the one explicitly-acknowledged
  remaining gap ("upload/processing wired, playback not"). Now uses `expo-video` for real inline HLS
  playback of the Mux `video_playback_url`, tap-to-play.
- **Custom map marker icons** — in-code styled View + glyph markers (🦷 clinics / 🧪 laboratories,
  verified badge), not external image assets (none exist from a design team) — this is the honest,
  fully-implementable-without-external-assets version.
- **Edge Function rate limiting** — previously a documented gap. A new `rate_limits` table + shared
  `checkRateLimit()` helper, wired into all 5 previously-unprotected Edge Functions
  (`verify-captcha`, `create-mux-upload`, `get-message-attachment-url`, `get-data-export-url`,
  `admin-verification-document-url`).

**Still genuinely not done, and correctly left for Cursor** (all require runtime execution or
external service credentials that cannot exist in this environment): everything in the "REQUIRES
LOCAL CONFIGURATION" and "REQUIRES CURSOR" categories in the final report at the end of this
document — nothing has been silently hidden or reclassified as complete.

---



## 🔴→🟢 SESSION 3 SUMMARY — read this first

This session's work, in priority order as instructed:

**PRIORITY 1 — Admin security vulnerability: FIXED.** The admin panel previously trusted a hidden
form field for the acting admin's identity. This is now completely replaced with real session-based
authentication (`@supabase/ssr`, httpOnly cookies, `requireAdmin()` verified server-side on every
Server Action AND every page load). See `apps/admin/lib/requireAdmin.ts`. **A second, related bug
was found during the fix**: every admin dashboard page (not just the write actions) was reading
service-role-privileged data with zero admin verification — any authenticated consumer-app user
could have viewed admin data by navigating to `/overview`, `/users`, etc. Both are now closed.

**PRIORITY 2 — all 9 missing feature areas: IMPLEMENTED.**
1. Analytics — `@dental/analytics` (PostHog), typed event catalog, wired into 10+ real call sites.
2. Video in portfolio — full Mux direct-upload architecture (`create-mux-upload`, `mux-webhook` Edge
   Functions), wired into both clinic and laboratory portfolio management screens.
3. Fullscreen portfolio gallery — `PortfolioGalleryViewer` (swipe, pinch-zoom), a new
   `portfolio-item/[id]` screen, linked from both public profile screens (previously just a text
   count).
4. Before/after slider — `BeforeAfterSlider`, integrated into the gallery viewer.
5. Laboratory markers on the map — previously clinics-only.
6. Map clustering — lightweight grid-based clustering (documented trade-off vs. a proper library).
7. Feed post composer — `modals/create-post.tsx`, real text/photo/video publish flow, linked from a
   new FAB on the Home feed screen.
8. Sentry error monitoring — `@dental/monitoring`, wired into mobile + web + admin with PII scrubbing.
9. CAPTCHA — Cloudflare Turnstile via a WebView widget + server-side verification Edge Function,
   integrated into sign-up (button disabled until verified).

**SECOND SECURITY AUDIT — two more real vulnerabilities found and fixed**, beyond the admin one:
1. **RLS privilege escalation** (multiple tables): several UPDATE policies had a `USING` clause but
   no `WITH CHECK`, meaning the authorized actor could modify columns that identify what they're
   authorized to touch — most seriously, a `conversation_members` row's `acting_as_type`/
   `acting_as_id` could be rewritten by its own member to **impersonate a different organization
   inside a conversation**. Also found: clinic/laboratory managers could self-grant
   `is_verified`, fabricate `rating_avg`, or hijack `owner_user_id`; opportunity/post/portfolio
   authorship could be reassigned; review clinic-assignment could be changed. Fixed via two new
   migrations (`0025`, `0026`) adding column-protection triggers, plus a policy split for
   `opportunity_interests`. See `supabase/tests/database/second_audit_security_fixes.sql` for tests
   (created, not executed — see testing section below).
2. **GDPR export was unreachable**: `gdpr-data-export` correctly wrote the finished bundle to a
   private bucket with no client SELECT policy — but nothing ever existed to let the requesting user
   retrieve it. Fixed with a new `get-data-export-url` Edge Function + wired into the Settings screen
   with a real download list.

**Rate limiting** (explicitly flagged as a gap in the previous session): added real per-user rate
limits on the highest-spam-risk table inserts (messages, comments, reviews, reports) via a generic
trigger. Edge Function-level rate limiting remains a documented gap (see
`supabase/migrations/0027_rate_limiting.sql`'s own "known remaining gap" note).

**What's still genuinely not done after this session** — see the updated per-section detail below
and the final requirement matrix: video playback inside the gallery viewer (upload/processing is
wired, tapping a ready video doesn't yet launch a player), Edge Function rate limiting, and
everything that was already correctly marked as requiring real device/network execution to validate
(nothing in this list can be built further without that execution — see "IMPLEMENTED BUT UNVERIFIED"
in the final report at the end of this document).

---



This document is updated as implementation progresses. It exists because this environment
**cannot run the application** — no network access means no `npm install`, no local Supabase, no
device/simulator, no way to actually execute a build, run a test, or verify a query returns what
the code assumes it returns. Everything below is code that was written carefully against the
architecture docs and the actual PostgreSQL/Supabase/React Native APIs as documented, but **none of
it has been executed**. Treat every "implemented" claim as "written and internally consistent, not
run." This document tells you, item by item, what to trust as substantially real vs. what still
needs UI wiring or device/network-dependent work — do not assume anything beyond what's stated here.

## How to validate everything in this document (do this first, in Cursor)

```bash
pnpm install
supabase start                    # local Postgres + Auth + Storage + Realtime
supabase db reset                 # applies every migration in supabase/migrations/, in order, + seed.sql
supabase test db                  # runs supabase/tests/database/rls_critical_paths.sql
pnpm dev                          # mobile (Expo dev client required for full functionality, see below), web, admin
```

If `supabase db reset` fails on a specific migration, that is the first and most important thing to
fix — every downstream item in this document assumes the schema applies cleanly.

---

## 1. Database — schema

**Implemented:** All ~35 tables from `docs/02-database.md`, all enums, all indexes (including
PostGIS gist indexes and tsvector/trigram search indexes), all triggers (updated_at maintenance,
account_type immutability, owner-auto-membership, polymorphic-FK validation for every polymorphic
table, counter maintenance on likes/comments/saves, rating recalculation, notification-firing for
the full 8-event catalog, opportunity-cancellation cascade), all storage buckets with their access
policies. 23 migration files in `supabase/migrations/`, applied in numeric order.

**Missing / not done:** A `popular_searches` cached table + nightly cron (mentioned as deferred in
`packages/api/src/search.ts`); a materialized view for the admin dashboard KPIs (currently live
`COUNT(*)` queries, functionally correct but not the eventual scale-optimized approach from
`docs/10-admin-panel.md` §3).

**Why it can't be validated here:** No Postgres instance available in this environment; SQL syntax
was written carefully but has not been executed by a real Postgres parser.

**Do in Cursor:** Run `supabase db reset` and fix any syntax errors (there may be some — trigger
function bodies, PostGIS function calls, and RLS policy syntax are the most likely places for a
typo to hide). Once it applies cleanly, run the pgTAP suite and confirm all 12 tests referenced in
`supabase/tests/database/rls_critical_paths.sql` pass.

## 2. RLS / Security

**Implemented:** RLS enabled on every table, no exceptions. Full policy set from
`docs/03-security.md` for every table, including the confirmed decisions from
`docs/16-client-decisions-mvp-scope-update.md` (fully public follows, full-hide blocking across
feed/search/map/profile via `is_blocked_by_viewer()`). Helper functions
(`is_clinic_manager`, `is_platform_admin`, etc.) written as `SECURITY DEFINER` per the architecture.
A first pgTAP test suite covering the highest-priority surfaces: verification document admin-only
access, account_type immutability, public follows, review uniqueness, opportunity-interest duplicate
prevention.

**Missing / not done:** RLS test coverage for every single policy (only the highest-priority ones
listed above have explicit tests — `docs/12-testing-cicd.md` calls for exhaustive coverage,
"every RLS policy... gets an explicit test"). Storage bucket RLS (the `storage.objects` policies in
`0021_storage_buckets.sql`) has no automated test at all yet.

**Why it can't be validated here:** Same as §1 — no Postgres to run pgTAP against.

**Do in Cursor:** Treat expanding RLS test coverage as a priority before any production launch —
this is explicitly called the highest-impact area to get wrong in `docs/12-testing-cicd.md`. Write
an allow-test and a deny-test for every policy in `0018`/`0019`/`0020`.

## 3. Authentication

**Implemented:** Email/password sign-up and sign-in, forgot-password, account-type selection with
immutability enforced server-side, sign-out (single-device and everywhere), full
`packages/api/src/auth.ts` module including phone OTP send/verify functions and Google/Apple
ID-token exchange functions.

**Missing / not done:** Phone OTP has no UI screen (function exists, not called from any screen).
Google/Apple sign-in buttons exist on the sign-in screen but have no `onPress` handler wired — the
native token-acquisition step (`expo-auth-session` for Google, `expo-apple-authentication` for
Apple) is not implemented. Two-factor authentication (optional per client spec) is not implemented
at all — Supabase Auth MFA enrollment/challenge flow needs to be built.

**Why it can't be validated here:** Google/Apple sign-in requires a real device or simulator with
the relevant OS capability and a live OAuth round-trip to Google/Apple's servers — impossible
without network access and a device. Email/password flows were written correctly against the
Supabase JS SDK's documented API but have never actually been run against a live Supabase Auth
instance.

**Do in Cursor:** Build an EAS dev client (`eas build --profile development`), wire the Google/Apple
buttons using `expo-auth-session`/`expo-apple-authentication`, obtain a real ID token, and confirm
`signInWithGoogleIdToken`/`signInWithAppleIdToken` work end-to-end. Add a phone-auth tab to the
sign-in screen. Test the full email/password flow against a real Supabase project first — this is
the highest-priority thing to manually verify before anything else, since every other screen depends
on auth working.

## 4-6. Profiles (Patient / Clinic / Laboratory) & Clinic Team

**UPDATED THIS SESSION.** Previously: only creation was wired, no editing. Now:

**Implemented:** Onboarding forms for all three account types, own-profile viewing screen
(role-aware), public clinic/laboratory profile screens, `packages/api/src/dentists.ts` full CRUD,
**and now real editing screens**: `apps/mobile/app/clinic-admin/[id]/profile-edit.tsx` and the
laboratory equivalent (full field coverage: name, description, address, city, county, phone, email,
website, socials, open-for-collaboration + note, plus laboratory-specific years_experience/
team_size/collaboration_zone), `apps/mobile/app/clinic-admin/[id]/team.tsx` (add/remove dentists
with specialization picker), a management hub screen linking everything, and a "Manage" link wired
into the own-profile screen for clinic/laboratory account types.

**Missing / not done:** Editing an existing team member (only add/remove, not edit, is built).
Working hours uses a placeholder (not wired to a real per-day time-picker UI — the `working_hours`
jsonb field exists on `clinics` but no form field sets it). No avatar/logo/cover crop/preview before
upload. No geocoding integration (address → lat/lng) — `setClinicLocation`/`setLaboratoryLocation`
exist and work if given coordinates, but nothing produces those coordinates from a typed address yet.

**Why it can't be validated here:** Image picking/upload needs a device camera/gallery; geocoding
needs a live network call to Google's API with a real API key.

**Do in Cursor:** Add a working-hours editor (7-day open/close time picker). Add an edit-team-member
screen. Write a `geocode-address` Edge Function calling Google's Geocoding API server-side and call
it from the profile edit forms before `setClinicLocation`/`setLaboratoryLocation`.

## 7. Services

**UPDATED THIS SESSION.** Previously: API-complete, no UI. Now: real management screens
(`apps/mobile/app/clinic-admin/[id]/services.tsx` and the laboratory equivalent) — catalog picker
showing only not-yet-added services, price field, add/remove, real queries throughout.

**Missing / not done:** No edit of an already-added service instance's price/description (only
add/remove). No reordering UI (the `display_order` column exists, unused by any screen).

**Do in Cursor:** Add an edit modal for existing service instances; add drag-to-reorder.

## 8. Portfolio

**UPDATED THIS SESSION.** Previously: API-complete, zero UI. Now: real create+upload+list+delete
screens for both clinic and laboratory (`apps/mobile/app/clinic-admin/[id]/portfolio.tsx` and
laboratory equivalent) — category picker from the seeded catalog, multi-image picker via
`expo-image-picker`, real Storage upload, real `addPortfolioMedia` calls, thumbnail grid display,
delete with confirmation. The 25-media-per-item server-side limit is respected (a rejected upload
past the cap surfaces the Postgres error).

**Missing / not done:** No fullscreen gallery viewer (client spec's "elegant galleries, smooth image
transitions" requirement). No before/after pairing UI — the `before_after_role` column exists on
`portfolio_media`, unused by any screen. No drag-to-reorder. No video upload/transcoding pipeline —
only images are wired through the picker (`mediaTypes: Images`), video capture would need
`expo-image-picker`'s video mode plus the still-unbuilt Mux/Cloudflare Stream hand-off.

**Why it can't be validated here:** Same as before — device camera/gallery required; video
transcoding requires a live external provider account.

**Do in Cursor:** This is the largest remaining piece of *visual* work (the functional core now
exists) — build a fullscreen viewer with pinch-zoom and a before/after slider, add reordering, and
tackle video upload once a Mux/Cloudflare Stream account exists.

## 9. Feed

**Implemented:** Post CRUD API, real feed screen with infinite-scroll pagination, like/save/comment
functionality wired to real mutations, notification-firing on every interaction (server-side,
already verified by trigger code review — not by execution).

**Missing / not done:** The documented "80% followed / 20% discovery" weighted ranking
(`docs/06-feed-messaging.md` Part A) is not implemented — `fetchFeedPage` returns a plain
reverse-chronological public feed; `fetchFollowedFeedPage` exists as a separate function but isn't
composed with it into the weighted merge. No post-composer screen (creating a post is API-complete
via `createPost`, no UI). No PostCard visual differentiation per type (docs/04-mobile.md's per-type
card treatment) — the feed screen renders one generic card style for all post types. Video
playback/autoplay not implemented (depends on the video pipeline gap in §8).

**Do in Cursor:** Build a post composer screen. Implement the weighted feed as a Postgres function
combining both existing query functions with a window-function interleave, or do the interleaving
client-side (fetch both pages, merge by a weighted shuffle) — either is a reasonable MVP approach.
Build the per-post-type `PostCard` variants described in `docs/04-mobile.md` §4.4.

## 10. Search

**Implemented:** The full query-parsing strategy from `docs/05-search-map.md` §1 — city detection,
specialization/service detection via trigram similarity, combined ranked search across
clinics/laboratories/dentists, wired to a real debounced search screen.

**Missing / not done:** Filters UI (city/specialization/service/rating/verified/collaboration —
client spec §13) is not built, though the underlying `nearby_clinics`/`nearby_laboratories` RPCs
already accept every one of those parameters. Autocomplete (recent/popular searches) is not
implemented — `packages/api/src/search.ts` explicitly documents this as deferred (recent = should be
client-side-only per the architecture doc, not yet added; popular = needs a cron job not yet
written).

**Do in Cursor:** This is one of the more finished areas — mainly needs a filter bottom sheet UI and
(optionally) the recent/popular search enhancements, which are explicitly non-blocking for MVP
per the architecture doc itself.

## 11. Map

**UPDATED THIS SESSION.** Previously: RPCs only, no MapView at all. Now:

**Implemented:** `apps/mobile/app/(tabs)/discover/map.tsx` — a real `react-native-maps` `MapView`
with a custom desaturated brand-aligned map style, real device-location request via
`expo-location`, real clinic markers from `findNearbyClinics`, marker-tap preview card linking to
the full profile, verified/unverified marker color distinction. Wired as a "View on map" link from
the Discover search screen.

**Missing / not done:** Laboratory markers (only clinics are queried — the component is structured
so mirroring the query for laboratories and merging marker sets is straightforward, not done here to
keep this session's scope bounded). Marker clustering (deferred per the component's own comment —
premature to tune without real marker density data). Custom branded marker icon assets (tooth/flask
glyphs) — uses default pin colors instead, since real icon assets don't exist yet. Filters are not
exposed on the map view (only the default 20km radius from the device's current location).

**Why it can't be validated here — this is the most environment-constrained item in the whole
app:** `react-native-maps` requires a native module (an EAS dev client build, not Expo Go), a real
device or simulator, and a Google Maps API key with billing enabled and both the Maps SDK for
iOS/Android and Geocoding API enabled in Google Cloud Console. None of this exists in this
environment. **This code has never rendered a single map tile.**

**Required external configuration (document per §15's explicit request):**
- Get a Google Maps API key at https://console.cloud.google.com/google/maps-apis
- Enable "Maps SDK for Android" and "Maps SDK for iOS" for that key
- Add it to `.env` as `GOOGLE_MAPS_API_KEY` — already read by `app.config.ts` and wired into both
  `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`
- iOS: no further native config needed beyond the key — `expo-location`'s permission strings should
  be added to `app.config.ts`'s `ios.infoPlist` (`NSLocationWhenInUseUsageDescription`) — **not yet
  added**, will cause a runtime crash on iOS location permission request without it
- Android: `expo-location`'s permission is auto-linked by the Expo config plugin, no extra step
- Build with `eas build --profile development` (Expo Go cannot render custom native map providers
  reliably) and test on a real device or a simulator with location services

**Do in Cursor:** ~~Add the missing iOS `NSLocationWhenInUseUsageDescription` Info.plist entry~~ —
**fixed during this session**, along with photo library / camera usage descriptions (also required
by the various `expo-image-picker` calls added this session and previously missing). Get the API
key, build the dev client, and validate marker rendering, tap behavior, and the location permission
flow end-to-end before adding clustering/laboratory markers/custom icons.

## 12. Follow / Favorites / Saves

**Implemented:** Fully implemented and, as far as static code review can confirm, correct — follow/
unfollow wired on both clinic and laboratory profile screens with live follower counts, the
saves↔favorites sync trigger, the favorites screen (though see the display gap below).

**Missing / not done:** The favorites screen shows raw `target_type`/`target_id` rather than
resolved entity details (name, image) — needs a per-type detail fetch, noted directly in that
screen's file comment.

**Do in Cursor:** Resolve favorite target details for display — either N+1 client-side fetches
(acceptable at typical favorites-list scale) or a dedicated Postgres function.

## 13. Opportunities

**Implemented:** The most completely built feature area in the app — full workflow: list, detail,
create modal (with the 5-active-opportunity limit enforced server-side), register interest,
accept (with real conversation creation via the RPC), reject, cancellation cascading to pending
interests. Multi-accept (confirmed client decision) correctly has no auto-close logic.

**Missing / not done:** "My org id" is resolved via an inline query on each screen rather than
cached once in the auth store — a real but minor inefficiency, not a correctness bug. No UI for
withdrawing an interest (`withdrawInterest` exists, unused).

**Do in Cursor:** Add a "withdraw" button where a responder's own pending interest is shown. Cache
the user's own org id in `authStore` once resolved, to avoid repeated queries.

## 14. Messaging

**UPDATED THIS SESSION.** Previously: no attachment UI. Now:

**Implemented:** Conversation list, real-time chat screen, `create_or_get_conversation` RPC, mark-
as-read, **and now real image attachment upload** (`handleAttach` in
`apps/mobile/app/conversation/[id].tsx` — picks an image, uploads to the private
`message-attachments` bucket under the sender's own folder, creates an empty-content message, links
the attachment), **and signed-URL resolution for viewing** received attachments via the
`get-message-attachment-url` Edge Function, **and global presence tracking** wired into the root
layout (`usePushAndPresence` in `apps/mobile/app/_layout.tsx`).

**Missing / not done:** File attachments (non-image, e.g. PDFs) — only images are wired. No visible
online/offline indicator anywhere in the UI despite presence now being tracked (the tracking exists,
no screen reads/displays it). The conversation list doesn't resolve the other participant's display
name.

**Why it can't be validated here:** Image picking, Storage upload, and Edge Function invocation have
never actually executed — same device/network constraints as everywhere else in this codebase.

**Do in Cursor:** Add a green-dot presence indicator (read the tracked presence state via
`.on('presence', {event: 'sync'})` and expose an `isUserOnline(userId)` hook). Resolve conversation
participant names. Optionally extend attachments to `expo-document-picker` for non-image files.

## 15. Notifications

**UPDATED THIS SESSION.** Previously: no push registration UI, no preferences screen. Now:

**Implemented:** Full event-catalog trigger pipeline, in-app notification center with realtime
updates, `push-dispatch` Edge Function, **and now real push permission request + device token
registration** (wired into `apps/mobile/app/_layout.tsx`'s `usePushAndPresence`, calling
`expo-notifications`), **and a real notification-preferences settings screen**
(`apps/mobile/app/settings/notifications.tsx`, all 8 event toggles wired to
`updateNotificationPreferences`).

**Missing / not done:** `push-dispatch` is still not deployed or scheduled (needs a cron trigger).
The batching-for-high-frequency-events behavior remains unimplemented (documented in the function).
No deep-linking from a tapped notification to its target screen (tapping only marks read).

**Why it can't be validated here:** Push tokens require a real device/simulator with push
capability; the permission-request flow and the Expo Push API call have never actually executed.

**Do in Cursor:** Set up the cron trigger for `push-dispatch`. Add the deep-link routing switch on
notification tap (map `target_type`/`target_id` to the routes in `docs/04-mobile.md` §2). Test an
actual push end-to-end on a real device before considering this feature done.

## 16. Reviews

**UPDATED THIS SESSION.** Previously: no submission UI. Now:

**Implemented:** Full API, the rating-recalculation trigger, display of reviews on the clinic
profile screen, **and now a real review-submission modal**
(`apps/mobile/app/modals/submit-review.tsx` — star rating + 3 optional category ratings + comment,
wired to `submitReview`, surfaced as a "Leave a review" button on the clinic profile for patient
accounts), **and an admin hide action** (`apps/admin/app/(dashboard)/reviews/page.tsx`).

**Missing / not done:** The submission button doesn't check `getMyReviewForClinic` first to hide
itself if the patient already reviewed this clinic — it's always shown, and the duplicate-prevention
only kicks in server-side (via the unique constraint) with a friendly error message when submitted,
rather than proactively hiding the button. Minor UX polish, not a functional gap.

**Do in Cursor:** Wire `getMyReviewForClinic` into the clinic profile screen to conditionally hide/
relabel the "Leave a review" button.

## 17. Verification

**UPDATED THIS SESSION.** Previously: no mobile submission UI. Now:

**Implemented:** Full data model, upload API, the admin-only signed-URL Edge Function with audit
logging, the admin review queue (list, approve/reject), the badge-flip/notification triggers, **and
now a real mobile submission screen** (`apps/mobile/app/verification/submit.tsx` — real document
checklist per the confirmed Romanian requirements, `expo-document-picker` upload per document type,
status display, admin review-note display), linked from both management hubs.

**Missing / not done:** The admin verifications page still doesn't render an actual "view document"
button invoking the signed-URL Edge Function (noted in that page's own comment) — it only shows
which document types were submitted, not a way to view them yet.

**Why it can't be validated here:** Document upload needs a device file picker; the admin document-
viewing flow needs a deployed Edge Function and a real Storage file.

**Do in Cursor:** Add a small client component to the admin verifications page that calls
`supabase.functions.invoke('admin-verification-document-url', ...)` and opens the returned signed
URL — the access-control logic behind it is already fully correct and audit-logged.

## 18-19. Subscriptions & Payments

**Deliberately not implemented for MVP** — this was a confirmed client decision
(`docs/16-client-decisions-mvp-scope-update.md` §5, §8), not a limitation of this environment. The
full architecture (`docs/09-subscriptions-payments.md`) remains written and ready for when the
client triggers the Monetization Phase (M1) roughly 6-12 months post-launch. No schema, no code, no
UI exists for this area by design — building it now would contradict the client's explicit
instruction.

## 20. GDPR

**Implemented:** Consent recording at signup, data export request flow (settings screen →
`requestDataExport` → `gdpr-data-export` Edge Function assembling and uploading a JSON bundle),
account deletion flow (settings screen → immediate `users.status='deleted'` + deletion-request
record → `account-deletion-sweep` Edge Function for the eventual hard delete after the 30-day grace
window).

**Missing / not done:** The `gdpr-data-export` function's `posts` export is explicitly incomplete
(documented in its own comment — it fetches all posts rather than filtering to the user's authored
ones, and was deliberately left out of the bundle rather than shipping wrong data). The
`account-deletion-sweep` function flags an unresolved edge case: a sole owner of a clinic/laboratory
deleting their account orphans that organization — no transfer-of-ownership or org-suspension logic
exists for this case. No cookie-consent banner exists on the web marketing site (`apps/web`) — only
the mobile consent-recording exists.

**Why it can't be validated here:** Both Edge Functions are written but never invoked — no way to
confirm the export bundle is actually complete/correct, or that the deletion sweep's SQL is
syntactically valid, without a running Supabase project.

**Do in Cursor:** Fix the posts-filtering gap in `gdpr-data-export` before relying on it. Get a
product decision on the sole-owner-deletion edge case and implement it. Add a cookie consent banner
to `apps/web`. Run both functions against real test data and manually inspect the output.

## 21. Internationalization

**Implemented:** RO (default) + EN resource files, two namespaces (`common`, `navigation`), the
locale-detection/fallback logic wired into the mobile app's i18n init, the ESLint rule
(`i18next/no-literal-string`) configured to catch hardcoded strings going forward.

**Missing / not done:** Almost none of the screens built in this session actually use `t()` —
they use hardcoded English strings directly (e.g. "Follow", "Message", "Sign in"). This is a real
and significant gap: the i18n *infrastructure* is real and correct, but it was not consistently
applied while building screens quickly. The ESLint rule would catch every one of these on a real
lint run (which could not be executed here, no network/npm install).

**Do in Cursor:** Run `pnpm lint` — expect many `i18next/no-literal-string` warnings across the
screens built in this session. Go through them systematically, adding keys to
`packages/i18n/{ro,en}/*.json` and replacing hardcoded strings with `t()` calls. This is
mechanical but real work, not optional polish, per the client's explicit requirement.

## 22. Analytics

**Not implemented at all.** `docs/01-architecture.md` and the master prompt call for an analytics
architecture (PostHog/Amplitude recommended in the docs), but no event-tracking code, no SDK
integration, and no `analytics_events` table exist anywhere in this codebase. This was not an
oversight during this session specifically — it was correctly deprioritized as V1 scope per
`00-product-overview.md`'s feature table (`Complexity M, Phase V1`), but it genuinely has zero
implementation, which should be stated plainly rather than left ambiguous.

**Do in Cursor:** Choose a provider (PostHog is self-hostable and GDPR-friendlier, a relevant
consideration given `docs/11-gdpr-i18n.md`'s consent requirements), add the SDK to
`apps/mobile`/`apps/web`, and instrument the event list from `docs/01-architecture.md` §31 —
signup, onboarding completion, profile creation, search, profile views, follow, message,
opportunity, review, subscription (the last one obviously deferred with the rest of monetization).

## 23. Testing

**UPDATED THIS SESSION (again).** Now includes a second pgTAP file
(`supabase/tests/database/second_audit_security_fixes.sql`, 6 assertions) covering the privilege-
escalation fixes from this session's security audit — same TEST CREATED, NOT EXECUTED status as
everything else.

**Implemented:** Two pgTAP test files (18 assertions total), one Vitest unit test suite (6 test
cases for `slugify`).

**Missing / not done:** Everything else in `docs/12-testing-cicd.md`'s testing strategy — no
component tests, no Edge Function tests, no Storybook, no E2E tests, no CI pipeline has ever
actually run.

**TEST CREATED vs. TEST EXECUTED — explicit distinction, unchanged from before:** Nothing in this
codebase has been executed. Every "test" is TEST CREATED, NOT EXECUTED until proven otherwise by
actually running it in Cursor.

**Do in Cursor:** Run `pnpm --filter @dental/utils test` first (no DB needed). Then
`supabase db reset && supabase test db` to run both pgTAP files — the second one specifically
verifies the privilege-escalation vulnerabilities found this session are actually closed, so this is
higher-priority than usual to actually execute, not just trust the code.

## 24. Everything else from the client specification

Cross-referenced against `docs/14-requirement-audit.md`'s traceability table — every client
requirement has a database + backend location that now genuinely exists in code (not just in the
architecture doc), per the sections above. The remaining gap between "architecturally covered" and
"usable end-to-end by a real person" is almost entirely **mobile UI screens that call an
already-correct API** (team management, service management, portfolio upload, review submission,
verification submission, push registration, map rendering) plus the **validation work** that
requires a real device/network/running database, none of which is achievable in this environment.

## 24a. Two additional gaps identified during this session's production-readiness audit

Neither was caught in earlier passes; both are genuine requirements from the architecture docs with
zero implementation:

- **Error monitoring (Sentry or equivalent):** `docs/12-testing-cicd.md` and standard production
  practice call for this; nothing is wired into `apps/mobile`, `apps/web`, or `apps/admin`.
- **Rate limiting / bot defense (CAPTCHA on signup):** `docs/03-security.md` §3's threat model
  explicitly lists this as a required mitigation ("CAPTCHA (Cloudflare Turnstile) on registration");
  no CAPTCHA integration exists anywhere in the signup flow (`apps/mobile/app/(auth)/sign-up.tsx`).
  Supabase Auth's own built-in rate limiting on the auth endpoints provides some baseline protection
  even without this, but it is not a substitute for the documented requirement.

Both are listed in `docs/CURSOR_HANDOFF.md`'s production deployment checklist.

---

## Admin Panel (client spec §25) — SECURITY VULNERABILITY FIXED THIS SESSION

Previous critical gap **now closed**: real session-based authentication via `@supabase/ssr`. Login
(`apps/admin/app/login/actions.ts`) is now a Server Action that sets httpOnly session cookies;
`apps/admin/lib/requireAdmin.ts` is the single chokepoint every page AND every Server Action calls
to verify (1) a real Supabase Auth session exists and (2) it belongs to an `admin_users` row —
throwing `UnauthorizedError` otherwise, caught by a dedicated error boundary
(`apps/admin/app/(dashboard)/error.tsx`). All 9 dashboard pages were individually audited and fixed —
both their data-reading Server Components and their write Server Actions.

Also added this session: the previously-missing "view document" button on the verifications page
(`ViewDocumentButton.tsx`, invoking the already-correct `admin-verification-document-url` Edge
Function), and a real sign-out action.

**Missing / not done:** A "Banned users" dedicated view (MVP only has binary active/suspended
status — suspend/restore on Users/Clinics/Laboratories pages covers the functional need).
Subscriptions/Payments admin sections remain deferred by design. MFA enrollment for admin accounts
(client spec mentions it as optional/recommended, not yet implemented).

**Why the fix can't be validated here:** Requires a running Supabase project (real Auth cookies) and
a real browser session to confirm the login → cookie → Server Action verification chain actually
works end-to-end — written correctly against `@supabase/ssr`'s documented API, never executed.



Legend: 🟢 COMPLETE · 🟡 IMPLEMENTED BUT NOT EXECUTED/VERIFIED · 🟠 PARTIALLY IMPLEMENTED ·
🔴 MISSING · ⚪ INTENTIONALLY DEFERRED

"Complete" (🟢) is never used in this table for anything that has not actually been run — per the
explicit instruction not to claim more than what was verified, everything below tops out at 🟡
unless a specific reason is given for why it's safe to call it 🟢 (e.g., a pure client-side
computation with no external dependency).

| Requirement (client spec §) | Database | API | Mobile | Admin/Web | Security | Status | Remaining Work |
|---|---|---|---|---|---|---|---|
| Patient registration (§2) | 🟡 | 🟡 | 🟡 (email only; Google/Apple/OTP buttons unwired) | — | 🟡 | 🟠 | Wire Google/Apple token acquisition + phone OTP screen |
| Patient profile (§2) | 🟡 | 🟡 | 🟡 | — | 🟡 | 🟡 | Add avatar upload |
| Clinic registration + profile (§3) | 🟡 | 🟡 | 🟡 (create + edit both now built) | — | 🟡 | 🟡 | Geocoding integration |
| Clinic team (§4) | 🟡 | 🟡 | 🟡 (add/remove built this session) | — | 🟡 | 🟡 | Photo upload for dentist records; edit (not just add/remove) |
| Clinic services (§5) | 🟡 | 🟡 | 🟡 (add/remove built this session) | — | 🟡 | 🟡 | Edit existing instance (price/description), reorder |
| Clinic portfolio (§6) | 🟡 | 🟡 | 🟡 (create+upload+delete+video+gallery+before-after built) | — | 🟡 | 🟡 | Video playback in gallery viewer (upload/processing wired, playback not); reorder |
| Laboratory registration + profile (§7) | 🟡 | 🟡 | 🟡 (create + edit both now built) | — | 🟡 | 🟡 | Geocoding integration |
| Laboratory services (§8) | 🟡 | 🟡 | 🟡 (built this session) | — | 🟡 | 🟡 | Edit/reorder |
| Laboratory portfolio (§9) | 🟡 | 🟡 | 🟡 (same as clinic, built this session) | — | 🟡 | 🟡 | Same as clinic portfolio |
| Open for Collaboration (§10) | 🟡 | 🟡 | 🟡 (in profile-edit screens) | — | 🟡 | 🟡 | None significant |
| Opportunities full workflow (§11) | 🟡 | 🟡 | 🟡 (list/detail/create/interest/accept/reject all built) | 🔴 (no admin oversight screen) | 🟡 | 🟡 | Withdraw-interest UI; admin opportunity moderation view |
| Global search (§12) | 🟡 | 🟡 | 🟡 | — | 🟡 | 🟡 | Filters UI (RPCs already accept them) |
| Filters (§13) | 🟡 (RPC params extended) | 🟡 | 🟡 (filter bottom sheet built) | — | 🟡 | 🟡 | Rating/service filters not yet exposed (RPC would need extending) |
| Dental Map (§14) | 🟡 (PostGIS RPCs) | 🟡 | 🟡 (clinics+laboratories+clustering+custom markers built) | — | 🟡 | 🟡 | Real device+API key test only remains |
| Feed (§15) | 🟡 | 🟡 | 🟡 (post composer built this session) | — | 🟡 | 🟠 | Weighted ranking; per-type card visuals |
| Analytics | 🟡 | 🟡 | 🟡 (built this session, 10+ events wired) | — | 🟡 | 🟡 | Legal review of consent category; enable by default once consent UI exists |
| Error monitoring | — | — | 🟡 (built this session) | 🟡 (built this session) | 🟡 | 🟡 | Real Sentry DSN + a real triggered error to confirm capture |
| CAPTCHA / anti-abuse | 🟡 | 🟡 | 🟡 (built this session) | — | 🟡 | 🟡 | Real Turnstile site+secret keys; device WebView test |
| Rate limiting (table + Edge Function) | 🟡 | 🟡 (all 5 previously-unprotected functions covered) | — | — | 🟡 | 🟡 | Confirm limits are reasonable under real traffic; cleanup cron for `rate_limits` table |
| Follow system (§16) | 🟡 | 🟡 | 🟡 | — | 🟡 | 🟡 | None significant |
| Messaging (§17) | 🟡 | 🟡 | 🟡 (chat+realtime+attachments built this session) | — | 🟡 | 🟡 | Real-device push/attachment test; presence indicator display |
| Favorites (§18) | 🟡 | 🟡 | 🟠 (raw ids shown, not resolved) | — | 🟡 | 🟠 | Resolve target details for display |
| Verification (§19) | 🟡 | 🟡 | 🟡 (submission screen built this session) | 🟡 (queue built, doc-view link missing) | 🟡 | 🟡 | Wire admin doc-view button; real device upload test |
| Reviews (§20) | 🟡 | 🟡 | 🟡 (submission modal built this session) | 🟡 (hide action built this session) | 🟡 | 🟡 | None significant beyond execution |
| Notifications (§21) | 🟡 | 🟡 | 🟡 (center+prefs+push registration built this session) | — | 🟡 | 🟡 | Deploy+schedule push-dispatch; real device push test |
| Main menu / navigation (§22) | — | — | 🟢 (pure client-side, verified by code review) | — | — | 🟢 | None |
| Subscriptions (§23) | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Deferred by confirmed client decision |
| Payments (§24) | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | ⚪ | Deferred by confirmed client decision |
| Admin panel (§25) | 🟡 | — | — | 🟡 (login/dashboard/users/clinics/labs/posts/comments/reviews/reports/verifications all built) | 🟡 (session-cookie bridging gap, see below) | 🟠 | Fix admin-identity-in-session gap before production; MFA |
| Report system (§26) | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | None significant beyond execution |
| Languages RO/EN (§27) | 🟡 (label_ro/label_en columns) | — | 🟠 (infrastructure real, NOT consistently applied to new screens) | — | — | 🟠 | Run lint, replace hardcoded strings systematically |
| Platforms iOS/Android/web (§28) | — | — | 🟡 | 🟡 | — | 🟡 | EAS build + store submission |
| Login/security (§29) | 🟡 | 🟡 | 🟡 | — | 🟡 | 🟡 | 2FA not implemented; Google/Apple unwired |
| GDPR (§30) | 🟡 | 🟡 | 🟡 (export+delete+cookie banner built) | — | 🟡 | 🟡 | Legal review of retention window |
| B2C/B2B structure (§31) | — | — | — | — | — | 🟢 | Structural principle, not a discrete feature |
| Non-goals excluded (§32) | 🟢 (no such tables exist) | 🟢 | 🟢 | 🟢 | — | 🟢 | Confirmed absent by design — verifiable by absence |
| MVP priority list (§33) | 🟡 | 🟡 | 🟠 (most items now real, some UI gaps noted above) | 🟠 | 🟡 | 🟠 | See individual rows above |
| Final objective / extensibility (§34) | 🟡 | — | — | — | — | 🟡 | Architecture supports it; unverified at scale |

**Known real bugs found and fixed during this session's audit** (not merely "flagged for Cursor" —
actually corrected in the code you're receiving):
1. Storage RLS policies for org-owned buckets (portfolio, logos-covers, dentist-photos,
   service-images) incorrectly required `auth.uid()` as the folder prefix, which would have
   rejected every upload from the newly-built management screens (they correctly upload to
   `{clinic_id}/...` / `{laboratory_id}/...`, since these are org-owned assets, not user-owned).
   Fixed in `0021_storage_buckets.sql` with a proper org-membership-checking policy.
2. `gdpr-data-export` Edge Function was fetching all posts unfiltered and omitting them from the
   bundle entirely rather than risk exporting the wrong data. Fixed to correctly filter to posts
   authored by orgs the requesting user manages.
3. `account-deletion-sweep` Edge Function silently orphaned any clinic/laboratory where the
   deleting user was the sole owner. Fixed to promote another member to owner if one exists, or
   suspend the org if the user was the only member at all.
4. **(Session 3, Priority 1) Admin identity spoofing via hidden form field** — completely rebuilt
   as real session-based auth. See the "SESSION 3 SUMMARY" at the top of this document.
5. **(Session 3, second audit) RLS privilege escalation across 8 tables** — missing `WITH CHECK`
   clauses allowed reassigning ownership/authorship/identity columns, most seriously letting a
   conversation member impersonate a different organization. Fixed via `0025`/`0026` migrations.
6. **(Session 3, second audit) GDPR export unreachable** — no endpoint existed to retrieve a
   completed export. Fixed with `get-data-export-url`.
7. **(Session 3, second audit) `opportunity_interests` self-accept bypass** — a responder could set
   their own interest directly to `'accepted'`, bypassing the opportunity author's actual decision.
   Fixed by splitting into author-only and responder-only policies with distinct `WITH CHECK` value
   constraints.
8. **(Session 4, final verification pass) `create_or_get_conversation` acting_as spoofing at
   creation time** — the RPC accepted `acting_as_type`/`acting_as_id` from the caller with no
   verification that the caller (or the counterparty) actually manages the claimed org, letting
   anyone start a conversation claiming to represent any clinic/laboratory in the system. This is a
   more serious variant of bug #5 (that fix only protected against later tampering with an
   already-correct row; this one allowed the row to be wrong from the start). Fixed in
   `0028_fix_conversation_identity_spoofing.sql`.

**Previously-flagged admin security gap: now fully resolved** (see SESSION 3/4 SUMMARIES above) — no
longer an open item.



| Area | Backend/DB | API layer | Mobile UI | Admin UI | Validated (run) |
|---|---|---|---|---|---|
| Database & RLS | ✅ | — | — | — | ❌ |
| Auth (email) | ✅ | ✅ | ✅ | — | ❌ |
| Auth (Google/Apple/OTP) | ✅ | ✅ | ⚠️ buttons only | — | ❌ |
| Profiles (create) | ✅ | ✅ | ✅ | — | ❌ |
| Profiles (edit) | ✅ | ✅ | ❌ | — | ❌ |
| Clinic team | ✅ | ✅ | ❌ | — | ❌ |
| Services | ✅ | ✅ | ❌ (display only) | — | ❌ |
| Portfolio | ✅ | ✅ | ❌ (display only) | — | ❌ |
## FINAL REPORT (Session 4 — Cursor Handoff Version)

This replaces the earlier, now-stale summary table from Session 1. Categories below are used
consistently: **IMPLEMENTED** (code exists, correct by inspection), **IMPLEMENTED BUT UNVERIFIED**
(same, plus explicit reminder nothing has executed), **MISSING** (genuinely absent), **INTENTIONALLY
DEFERRED** (client decision, not oversight), **REQUIRES LOCAL CONFIGURATION** (needs an API
key/account/device), **REQUIRES CURSOR** (needs actual execution to validate or finish).

### IMPLEMENTED (present in code, confirmed by direct inspection this session)
Full database schema (30 migrations), all RLS policies including 3 rounds of security-audit fixes,
complete typed API layer, 9 Edge Functions, real management UI for clinics/laboratories (profile
edit, team, services, portfolio with image+video upload), review/verification submission flows, a
real Map screen with laboratory markers/clustering/custom icons, push notification registration,
message attachments with real inline video playback, search filters, cookie consent banner, a fully
re-architected admin panel with real session-based authentication, analytics (PostHog), error
monitoring (Sentry), CAPTCHA (Turnstile), and rate limiting (table + Edge Function level).

### IMPLEMENTED BUT UNVERIFIED (the correct label for everything above)
**Every single item in the IMPLEMENTED list above.** Nothing in this codebase — no migration, no
Edge Function, no RLS policy, no React component — has ever actually executed. This environment has
no network access, no local Postgres, no device/simulator. "Implemented" here means "written
carefully against the real documented APIs of Postgres/Supabase/React Native/Next.js, internally
consistent, and reviewed for the specific vulnerability classes this project's audits targeted" — not
"tested and confirmed working." Treat every claim in this document as needing STEP 5 through STEP 10
of `docs/CURSOR_HANDOFF.md`'s step-by-step guide before being trusted.

### MISSING (genuinely not started)
Weighted (followed+discovery) feed ranking (a plain reverse-chronological feed exists instead);
rating and service filters in the search filter sheet (city/verified/collaboration filters ARE
implemented); a materialized view for the admin dashboard KPIs (live COUNT queries work, just not
scale-optimized); component tests, Edge Function tests, Storybook, E2E tests; a CI pipeline that has
ever actually run.

### INTENTIONALLY DEFERRED
Subscriptions and Payments in their entirety — a confirmed client decision (the app launches free
for the first 6-12 months), not a gap. The full architecture and implementation spec remain ready in
`docs/09-subscriptions-payments.md` for when that phase is triggered.

### REQUIRES LOCAL CONFIGURATION (external accounts/credentials needed)
Google Maps API key (map has never rendered a tile); Mux account + webhook secret (video upload and
playback have never made a real API call or played a real stream); Cloudflare Turnstile site key +
secret (CAPTCHA widget has never rendered in a real WebView); Sentry DSN (error monitoring has never
captured a real error); PostHog API key (analytics has never sent a real event); a real device or
EAS dev-client build (camera, gallery, location, push notifications, and `react-native-maps`/
`expo-video` all need one).

### REQUIRES CURSOR (execution, not new code)
Running `supabase db reset` and fixing whatever SQL syntax issues surface (real risk — this SQL has
never been parsed by a real Postgres instance); running `supabase test db` and confirming all 18
pgTAP assertions across both test files pass, especially the 6 in
`second_audit_security_fixes.sql`; running `pnpm typecheck`/`pnpm lint` and fixing what surfaces;
building an EAS dev client and manually walking through every feature; setting up and testing every
external service above; a final independent security pass per STEP 13 of the handoff guide.

### KNOWN RISKS
1. **Unverified security fixes.** Five real vulnerabilities were found and fixed across this
   project's sessions (admin identity spoofing, unauthorized admin data access, RLS privilege
   escalation across 8 tables, an unreachable GDPR export, and conversation-identity spoofing at
   creation time) — see the 🔴 CRITICAL SECURITY ITEMS table in `docs/CURSOR_HANDOFF.md`. All are
   fixed in code. None are confirmed working by execution. This is the single largest risk in this
   handoff — treat STEP 5 and STEP 9 of the Cursor guide as mandatory, not optional.
2. **No code in this repository has ever compiled or run.** TypeScript errors, SQL syntax errors, or
   fundamental integration bugs may exist that simple code review didn't catch — this is a real
   possibility for a codebase of this size built without a compiler or test runner available.
3. **External service dependencies are entirely unconfigured.** Maps, video, CAPTCHA, monitoring,
   and analytics all degrade gracefully (no crash) when unconfigured, but none of their actual
   functionality has ever been exercised.
4. **i18n is inconsistently applied** — the infrastructure is real and correct, but most screens use
   hardcoded English strings rather than translation keys, despite the client's requirement for RO/EN
   from launch.
5. **GDPR retention windows and the analytics-consent categorization are product/legal decisions**
   flagged as open, not resolved, in `docs/11-gdpr-i18n.md` and `packages/analytics/src/mobile.ts`.

### FINAL COMPLETION ESTIMATE: ~75-80%

This is unchanged from the estimate given before this session's final verification pass, and that is
itself the honest answer: this session found and fixed one more real security vulnerability and
built the remaining code-only gaps (search filters, cookie banner, video playback, custom map icons,
Edge Function rate limiting) — genuine progress — but progress in code volume does not move the
needle on the actual blocker to a higher percentage, which is, and remains, **zero runtime
validation**. A codebase that has never been compiled, migrated against a real database, or run on a
device cannot honestly be scored above the mid-to-high 70s regardless of how much additional code is
added, because the single highest-risk unknown — does any of this actually work when executed — is
categorically unresolved by adding more unexecuted code. The remaining 20-25% is entirely the work
described in `docs/CURSOR_HANDOFF.md`'s STEP 1 through STEP 14: real execution, real external service
configuration, and fixing whatever real bugs that execution surfaces.

