# 03 — Security: RLS, Authentication, Threat Model

## 1. Authentication Architecture

### Identity model
- Single Supabase Auth identity (`auth.users`) per person, mirrored into `public.users`.
- `account_type` (`patient`/`clinic`/`laboratory`) is stored as a column, **not** a Postgres role
  and **not** a JWT custom claim alone — it lives in `public.users` and is read by RLS policies via
  a `SECURITY DEFINER` helper function `get_account_type(uid)`. Rationale: JWT claims are only
  refreshed on token refresh, which creates a window where a stale claim could grant/deny wrongly;
  reading live from the table (cached per-statement by Postgres) avoids that class of bug, at a
  small, acceptable query cost given RLS already hits the DB per request.
- `account_type` is **immutable after first assignment** — enforced by a `BEFORE UPDATE` trigger
  that rejects changes to that column. This closes the risk of a patient account "upgrading" into a
  clinic account after moderation history/reviews were attached to the patient identity.
- Clinic/laboratory **organization access** (multiple humans managing one clinic profile) is
  modeled through `clinic_members`/`laboratory_members` with `role ∈ {owner, admin, editor}`, not
  through shared login credentials. This is the extensible piece the master prompt asks for:
  adding a new role (e.g. `viewer`) later is a new enum value + new RLS predicate, not a schema
  rewrite.

### Supported sign-in methods
| Method | Notes |
|---|---|
| Email + password | Supabase Auth native; email verification required before full feature access (unverified accounts can browse but not post/message/review) |
| Phone (OTP) | Supabase Auth phone provider (Twilio backend) |
| Google | `expo-auth-session` (mobile), Supabase OAuth (web) |
| Apple | `expo-apple-authentication` — **mandatory on iOS** per App Store guideline 4.8 since Google is offered |

### Flows
- **Forgot / change password:** standard Supabase Auth reset-email flow; change-password requires
  re-authentication (recent session) for sensitive action protection.
- **Logout from devices:** Supabase Auth `signOut({scope: 'global'})` invalidates all refresh
  tokens; `devices` table push tokens are deleted on logout to stop stray pushes.
- **Two-factor authentication (optional per client spec):** TOTP via Supabase Auth MFA enrollment,
  offered as an opt-in security setting, not required for MVP.
- **Account deletion:** user-initiated soft delete (`users.status = 'deleted'`, `deleted_at` set)
  immediately hides the account and its organization(s) from all public surfaces; a scheduled Edge
  Function performs hard deletion / anonymization of PII after the legally-required retention
  window (see `11-gdpr-i18n.md`), while preserving anonymized aggregate data (e.g. review counts)
  where legitimate interest allows it.
- **Admin authentication is entirely separate** — different table (`admin_users`), different login
  route in the Next.js admin app, MFA **required** (not optional) for `super_admin`/`moderator`
  roles, and no shared session with the consumer Supabase Auth pool.

## 2. Row Level Security — Policy Summary

General pattern for every table: **RLS is enabled on every table with no exceptions**; the default
posture is deny, and each policy explicitly grants the narrowest possible access. Helper functions
used across policies:

```sql
-- returns the caller's account_type, or null if unauthenticated
create function public.current_account_type() returns text
language sql stable security definer as $$
  select account_type::text from public.users where id = auth.uid();
$$;

-- true if caller is owner/admin/editor of the given clinic
create function public.is_clinic_manager(cid uuid) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = cid and user_id = auth.uid()
  );
$$;
-- mirrored: is_laboratory_manager(lid uuid)

-- true if caller has an active admin_users row (checked via a dedicated
-- admin JWT / service role path, never via public.users)
create function public.is_platform_admin() returns boolean
language sql stable security definer as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;
```

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users` | self row only, plus limited public columns (name/avatar) via a `public_profiles` view for others | via Auth trigger only, not client | self row (except `account_type`, enforced by trigger) | disallowed client-side; deletion via Edge Fn |
| `patient_profiles` | self only | self only | self only | self only (cascades from account deletion) |
| `clinics` | public: all `status='active'` rows, all columns except none-sensitive (clinics have no private data) | authenticated user with `account_type='clinic'`, becomes owner | `is_clinic_manager(id)` | `is_clinic_manager(id)` AND `role='owner'` |
| `laboratories` | same pattern as clinics | `account_type='laboratory'` | `is_laboratory_manager(id)` | owner only |
| `clinic_members`/`laboratory_members` | members of that org + the user themself | owner/admin of the org can add | owner only can change roles | owner only, cannot remove self if sole owner |
| `dentists` | public read (of active clinics) | `is_clinic_manager(clinic_id)` | same | same |
| `services` (catalog) | public read | admin only | admin only | admin only |
| `clinic_services`/`laboratory_services` | public read | manager of that org | manager of that org | manager of that org |
| `portfolio_items`/`portfolio_media` | public read where `status='published'`; manager sees own drafts too | manager of owning org | manager of owning org | manager of owning org (soft delete) |
| `posts`/`post_media` | public read where `status='published'` | manager of the authoring org (patients cannot insert) | manager of authoring org, or admin (moderation) | manager of authoring org, or admin |
| `comments` | public read where `status='visible'` | any authenticated user (not blocked by post author) | author only (edit own), admin (moderation) | author only, or admin |
| `likes`/`saves` | own rows readable; counts are via denormalized columns, not raw table scans | authenticated user, self `user_id` only | n/a (delete+reinsert to toggle) | self only |
| `follows` | **public read, fully — confirmed by client.** Follower/following lists are entirely public, including which patients follow a given profile (`16-client-decisions-mvp-scope-update.md` §1) | self `follower_user_id` only | n/a | self only |
| `favorites` | self only (private list) | self only | n/a | self only |
| `opportunities` | public read where `status='open'`; author sees all own statuses | manager of authoring org | manager of authoring org | manager of authoring org |
| `opportunity_interests` | visible to the opportunity's author org **and** the responding org only | manager of responding org, blocked if a row already exists (unique constraint) | opportunity author org can set `accepted`/`rejected`; responder can set `withdrawn` | disallowed (state transitions only) |
| `conversations`/`conversation_members` | members only | via Edge Fn / RPC that validates both parties aren't blocked | n/a | n/a |
| `messages` | conversation members only | conversation members only, `sender_user_id = auth.uid()` | sender can soft-delete own message only | disallowed |
| `message_attachments` | conversation members only, via **signed URL minted per-request**, never a public bucket path | conversation members only | n/a | sender only (cascades with message) |
| `reviews` | public read where `status='visible'` | patient who has **no existing review for this clinic** (unique constraint + RLS check `account_type='patient'`) | author only, within an edit window (e.g. 48h), or admin | author only, or admin |
| `verification_requests` | **subject org managers see own; admins see all; nobody else** | manager of subject org | admin only (status changes) | disallowed |
| `verification_documents` | **admin only, full stop.** Subject org can `INSERT` (upload) but cannot `SELECT` after upload except via a short-lived signed URL returned once by the upload Edge Fn — not via a standing SELECT policy | manager of subject org (upload) | disallowed | admin only |
| `notifications` | self only | disallowed for clients; Edge Fn (service role) only | self can mark `read_at` | self only (clear) |
| `notification_preferences` | self only | self only | self only | n/a |
| `devices` | self only | self only | self only | self only |
| `blocked_users` | self only (as blocker) | self only | n/a | self only |
| `reports` | reporter sees own submissions (status only, not other reports); admins see all | any authenticated user, `reporter_user_id=auth.uid()` | admin only | disallowed |
| `subscriptions`/`payments`/`subscription_events` | subject org managers see own subscription/payment history (read-only); admins see all | **Edge Fn (service role) only — never client INSERT** | Edge Fn only | disallowed |
| `admin_users`, `audit_logs` | admin only, and `audit_logs` is insert-only even for admins (append-only ledger) | Edge Fn (admin action layer) only | disallowed | disallowed |
| `consent_records` | self only | self only | n/a | n/a |
| `data_export_requests` | self only | self only (creates request) | Edge Fn only (fulfills request) | self only |

**Follow list visibility — resolved:** confirmed fully public by the client, including individual
patient-follower identities (see `16-client-decisions-mvp-scope-update.md` §1). No restriction is
applied beyond standard public-read RLS.

### Where RLS is intentionally bypassed via Edge Functions
Direct client writes are **not** used for: verification document access grants, subscription/
payment state changes (must come from verified webhooks only), push notification dispatch,
cross-user notification inserts (a like insert by user A must create a notification row *for user
B*, which A's RLS session cannot do — this goes through a Postgres trigger running as
`SECURITY DEFINER`, not a client write), admin moderation actions, and data export file generation.
Every Edge Function that uses the service-role key runs with its own explicit authorization check
at the top of the function (verifying the caller's JWT and permissions) before doing anything
privileged — the service-role key itself is never given to reduce-friction shortcuts.

## 3. Threat Model & Mitigations

| Threat | Mitigation |
|---|---|
| Fake accounts / bot signups | CAPTCHA (Cloudflare Turnstile) on registration; email/phone verification required before posting/messaging; rate limiting on signup endpoint |
| Spam (posts, comments, messages, reviews) | Per-user rate limits (Edge Fn middleware or Postgres advisory locks + counters), review uniqueness constraint, report system feeding moderation queue, shadow-rate-limiting suspicious accounts |
| Brute-force login | Supabase Auth built-in rate limiting + exponential backoff; CAPTCHA after N failed attempts |
| Unauthorized data access (IDOR) | RLS on every table is the primary control — an IDOR against Supabase's REST/PostgREST layer is blocked at the database level regardless of client-side checks; every polymorphic FK (`owner_type/owner_id` etc.) is validated by trigger so a crafted `target_id` pointing at an unrelated row is rejected at write time too |
| Message/content scraping | Pagination + rate limiting on read endpoints; RLS ensures scraping is bounded to what's legitimately public; private buckets for attachments require signed URLs with short TTL, not durable public links |
| Malicious file uploads | MIME-type allowlist + file-size limits enforced both client-side (fast feedback) and server-side (Storage policies + Edge Fn validation on upload webhook); images re-encoded (not served raw) where feasible to strip embedded scripts/EXIF metadata with GPS; videos routed through a transcoding pipeline (Mux/Cloudflare Stream) rather than served directly from user-uploaded files |
| Fake reviews | One review per patient per clinic (unique constraint); consider requiring some prior interaction signal in a later phase (e.g., a completed profile view / message thread) before allowing a review, flagged as a V1.5 anti-fraud enhancement, not blocking MVP |
| Fake verification submissions | Documents reviewed manually by admin, never auto-approved; document storage is private/admin-only; audit log records every verification decision with admin identity |
| Payment fraud | Subscription state is **never** trusted from the client — only Edge Functions processing signed Apple/Google server notifications or Stripe webhooks (signature-verified) may write to `subscriptions`/`payments` |
| API abuse / scraping at scale | Supabase built-in rate limiting + Cloudflare in front of Storage/CDN endpoints; consider a WAF rule set for the Next.js admin/marketing surfaces |
| Privilege escalation | `account_type` immutability trigger; `clinic_members`/`laboratory_members` role checks on every management RLS policy; admin identity lives in a wholly separate table/session, never derived from `public.users` |
| IDOR via polymorphic tables | Trigger-based FK validation (see `02-database.md` §2 rationale) plus RLS predicates that resolve `owner_type`/`target_type` explicitly rather than trusting the row blindly |
| SQL injection | No raw SQL string concatenation anywhere in application code — Supabase client libraries use parameterized queries exclusively; Edge Functions use parameterized queries via the Postgres client, never string interpolation |
| XSS | All user-generated text rendered through React/React Native's default escaping (no `dangerouslySetInnerHTML`/raw HTML rendering of user content anywhere, including in the Next.js marketing/admin surfaces) |
| CSRF | Mobile app uses bearer-token auth (not cookies) so CSRF is not applicable there; the Next.js admin panel uses same-site cookies + Supabase Auth's built-in CSRF protections for any cookie-based session flows |
| Blocked-user bypass | **Confirmed scope (client, `16-client-decisions-mvp-scope-update.md` §4): blocking hides the blocked party's profile/content completely from the blocker** — not just messaging. Enforced via a reusable query predicate (`is_blocked_by_viewer(target_owner_user_id, viewer_user_id)`) applied consistently to messaging (cannot open/continue a conversation — checked in the conversation-creation Edge Fn/RPC), feed queries, search queries, map queries, and profile detail fetches. This is one-directional (only hidden from the blocker's view, not necessarily vice versa) and must be tested per surface — four separate test cases, not one, since each surface has its own query path |

## 4. Verification Document Handling — Explicit Callout

Per client requirement, verification documents "must be visible only to platform administrators."
Implementation:
1. Upload happens via an Edge Function (not a direct client-to-Storage upload) that writes to the
   **private** `verification-documents` bucket and inserts the `verification_documents` row.
2. No RLS `SELECT` policy exists on that bucket for regular users — only `admin_users` can generate
   a signed URL to view a document, via an admin-only Edge Function that also writes an
   `audit_logs` entry every time a document is viewed.
3. The submitting clinic/lab can see that a document *exists* and its `verification status`, never
   the document content itself, post-upload.
