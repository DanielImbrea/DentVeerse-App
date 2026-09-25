# 10 — Admin Panel Architecture (Next.js)

## 1. Structure

```
apps/admin/app/
├── (auth)/
│   └── login/                  # separate admin login, MFA-required
├── (dashboard)/
│   ├── layout.tsx               # sidebar nav, role-gated middleware
│   ├── overview/                 # Dashboard (stats)
│   ├── users/
│   ├── clinics/
│   ├── laboratories/
│   ├── posts/
│   ├── comments/
│   ├── reviews/
│   ├── reports/                  # moderation queue
│   ├── opportunities/
│   ├── verifications/            # verification review queue
│   ├── subscriptions/
│   ├── payments/
│   ├── banned-users/
│   └── audit-logs/
└── middleware.ts                 # enforces admin_users session + role check on every route
```

## 2. Authentication & Authorization
- Fully separate login (`admin_users` table, `03-security.md` §1) with **MFA required** for
  `super_admin` and `moderator` roles.
- Every Server Action / Route Handler re-checks `is_platform_admin()`/role server-side before doing
  anything — the Next.js middleware check is a UX convenience, not the security boundary.
- All privileged reads/writes go through Route Handlers using the **service-role Supabase key held
  only in server environment variables**, never sent to the browser — the admin UI never talks to
  Supabase directly from client-side JS with elevated privilege.
- Role scoping: `super_admin` (full access incl. subscriptions/payments/refund actions),
  `moderator` (users/content/reports/reviews/verifications, no financial actions),
  `support` (read-only across most sections, for handling user support tickets without moderation
  power).

## 3. Dashboard (Overview)
KPI cards + trend charts for: total users, new users (7d/30d), active users (DAU/MAU
approximation via `last_seen_at`), total clinics, total laboratories, total patients, active PRO
subscriptions, MRR/revenue (derived from `payments`), pending verifications count, open reports
count. Implemented as scheduled materialized-view refreshes (e.g., hourly) rather than live
aggregate queries on every dashboard load, to keep the admin panel fast regardless of table size.

## 4. Section behaviors

| Section | Capabilities |
|---|---|
| **Users** | Search/filter by type/status/city; view profile detail; suspend/reactivate; force logout (revoke sessions); view associated org(s) |
| **Clinics / Laboratories** | Search/filter; view full profile incl. team/services/portfolio; edit (admin override) or suspend; jump to verification/subscription status |
| **Posts / Comments** | Search/filter by author/status/date; hide (soft-delete) content; view report history against the item |
| **Reviews** | Filter by rating/status; hide/delete with reason (feeds `audit_logs` + notifies... or not, product decision, default: no notification to avoid disputes, admin note is internal only) |
| **Reports** | Moderation queue, grouped by target with report count; action inline (dismiss / hide content / suspend user); full report detail incl. reporter (admin-only visibility) |
| **Opportunities** | Monitor for abuse (spam postings); force-close/cancel if needed |
| **Verifications** | Pending queue; view documents via signed URL (audit-logged per view, `03-security.md` §4); approve/reject with note |
| **Subscriptions / Payments** | **Deferred from MVP** — no subscription/payment data exists until the monetization phase begins (~6–12 months out, `16-client-decisions-mvp-scope-update.md` §5). This section is built alongside that phase using the spec in `09-subscriptions-payments.md`, not at initial admin panel launch. |
| **Banned users** | List of `status='suspended'` (or a dedicated ban reason/expiry model if temporary bans are wanted — recommend adding `users.suspended_until` + `suspension_reason` rather than a separate table, simpler for MVP) |
| **Audit logs** | Append-only, filterable by admin/action/target/date — every write above lands here |

## 5. Design (Admin UX)
Data-dense, utility-first — deliberately **not** styled like the consumer app's premium brand
surface; standard admin dashboard conventions (tables, filters, detail drawers) using the shared
Tailwind config/tokens from `packages/config` for basic consistency (fonts, base colors) but
prioritizing information density and task speed over the consumer app's emotive design language.
This distinction is intentional per the master prompt's own framing — admin tooling and the
premium consumer product are different design problems.
