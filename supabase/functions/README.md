# Edge Functions

Empty in the Phase 1 scaffold. Functions are added alongside the phase that needs them, per the
roadmap in `docs/13-roadmap.md`. Expected functions (see referencing doc in parentheses):

- `bootstrap-profile` (Phase 3 — docs/03-security.md §1)
- `create_or_get_conversation` (Phase 12 — docs/06-feed-messaging.md Part B)
- `verify-clinic-document` / admin signed-URL viewer (Phase 16 — docs/03-security.md §4)
- Notification dispatch job (Phase 14 — docs/08-verification-notifications-reports.md Part B)
- `verify-apple-receipt`, `google-rtdn-handler`, `stripe-webhook-handler` (Monetization Phase M1 —
  deferred, docs/09-subscriptions-payments.md)

Each function must follow docs/15-ai-agent-instructions.md rules 2–3 (RLS-respecting, no secrets
in client-reachable code) and docs/03-security.md's service-role usage rules.
