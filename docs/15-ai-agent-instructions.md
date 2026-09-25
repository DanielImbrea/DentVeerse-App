# 15 — Instructions for Claude Code / Cursor (AI Coding Agent)

These rules govern how an AI coding agent must work on this repository. They are binding for every
change, not suggestions.

## Non-negotiable rules

1. **Never invent database tables, columns, or enum values not present in `02-database.md`**
   without first proposing the addition as a documented migration rationale (a short comment block
   in the migration file explaining why) — schema drift from undocumented ad hoc additions is the
   single fastest way this architecture degrades.
2. **Never bypass RLS.** If a query "isn't working" because RLS blocks it, the fix is either (a) the
   RLS policy is genuinely wrong and should be corrected with a documented reason, or (b) the
   operation legitimately needs elevated privilege and belongs in an Edge Function using the
   service-role key — never disable RLS on a table, never use the service-role key from client code.
3. **Never expose secrets.** No API key, service-role key, or webhook signing secret is ever placed
   in client-bundled code, committed to the repo, or logged in plaintext. Environment variables only,
   per `01-architecture.md` §4.
4. **Never modify architecture without documenting it.** A structural decision that deviates from
   this doc set (new table shape, new third-party service, new folder convention) requires a short
   addition to the relevant `docs/*.md` file in the same PR — the docs are meant to stay the living
   source of truth, not a historical artifact.
5. **Reuse existing components.** Before creating a new UI component, check `packages/ui` for an
   existing one that could be extended with a variant/prop instead. Before writing a new query
   function, check the relevant `src/features/<x>/api.ts` or `packages/api` for an existing one.
6. **Use TypeScript strictly.** `strict: true` across all `tsconfig.json`s, no `any` without an
   explicit inline justification comment, shared domain types come from `packages/types`
   (generated via `supabase gen types typescript` plus hand-authored composite types), never
   redefined locally per-app.
7. **Avoid duplicated business logic.** Rating calculation, plan-limit derivation, notification
   event handling, and any other logic with a single documented source of truth in this doc set
   must have exactly one implementation (a Postgres function/trigger, or one shared TS module) —
   never re-implemented slightly differently in a second place.
8. **Write tests for critical functionality**, per the priority order in `12-testing-cicd.md` —
   RLS tests are mandatory for any new/changed table or policy, not optional.
9. **Maintain migrations.** Every schema change is a new numbered file in `supabase/migrations/`.
   No manual schema edits via the Supabase dashboard in staging or production.
10. **Preserve backward compatibility; do not break existing features.** Before changing a shared
    type, component, or query function, search the codebase for all call sites and update them
    consistently in the same change, or use an additive (non-breaking) approach.
11. **Check existing code before modifying it.** Read the current implementation of a feature
    fully before changing it — do not assume behavior from the file name or a partial read.
12. **Make small, atomic changes.** One logical change per commit/PR where reasonably possible;
    large multi-feature PRs are harder to review against this architecture and harder to revert
    safely.
13. **Explain important architectural decisions** in PR descriptions/commit messages when a
    decision wasn't already specified in these docs (e.g., a specific library version choice, a
    specific index strategy).
14. **Run tests after changes.** `turbo test` (or the relevant workspace test command) before
    considering a change complete.
15. **Run type checking.** `turbo typecheck` must be clean.
16. **Run linting.** `turbo lint` must be clean, including the `i18next/no-literal-string` rule —
    a failing lint on a hardcoded user-facing string is a real defect, not a false positive, per
    the i18n requirement in `11-gdpr-i18n.md`.
17. **Never hardcode credentials.** No API keys, test account passwords, or connection strings
    inline in source — use environment variables and, for tests, a documented `.env.test.example`
    pattern with placeholder values only.
18. **Never commit secrets.** `.env*` files (except `.env.example`) are gitignored; if a secret is
    ever accidentally committed, it must be rotated, not just removed from a future commit.

## Additional operating guidance specific to this project

- **Explicit non-goals matter.** If a task seems to imply building lab-work tracking, a clinic
  CRM, billing/accounting, or internal production management (client §32), stop and flag it rather
  than implementing it — these are out of scope by client instruction, not by oversight.
- **`account_type` immutability is load-bearing.** Never write code that updates
  `users.account_type` outside the one documented bootstrap path — this is enforced by a DB trigger
  specifically so a code-level mistake can't silently violate it, but the intent should be
  respected in application code too (don't build a "change account type" settings option).
- **Verification documents are the highest-sensitivity data in this system.** Any change touching
  `verification_documents`, its Storage bucket, or the admin signed-URL Edge Function requires
  extra scrutiny — re-read `03-security.md` §4 before touching this path, and any new admin
  document-viewing surface must write to `audit_logs`.
- **Subscription/payment state is never client-writable.** Any PR that adds a client-side
  `INSERT`/`UPDATE` capability to `subscriptions`, `payments`, or `subscription_events` is
  incorrect by definition — entitlement changes only ever originate from a verified webhook/receipt
  Edge Function, per `09-subscriptions-payments.md` §2.
- **Design system discipline.** Follow `04-mobile.md` §4 for every new UI surface — no ad hoc
  colors/shadows/radii outside the token set, no new component when an existing one can take a
  variant prop, and every new interactive component must cover the full state checklist (default/
  hover/pressed/focused/disabled/loading/error/success/empty).
- **When the spec was ambiguous, the ambiguity was documented, not silently resolved.** See
  `14-requirement-audit.md`'s "Items Requiring Explicit Client/Product Confirmation" list — if
  implementing one of those nine items, use the documented default but leave the config point
  easily adjustable (a config value, not a hardcoded assumption baked into multiple call sites),
  since the client may confirm a different answer later.
- **Polymorphic-owner tables (`portfolio_items`, `posts` authorship, `follows`/`favorites`/
  `likes`/`reports` targets) rely on trigger-based FK validation, not native foreign keys** — when
  adding a new polymorphic target type, the corresponding validation trigger function must be
  updated in the same migration, or the integrity guarantee silently breaks for the new type.

## Suggested first actions for the agent starting implementation

1. Read all 16 documents in `docs/` in full before writing any code — this document set is the
   source of truth, not a summary to skim.
2. Execute Phase 0/1 of `13-roadmap.md` (repo/environment scaffolding) before any feature work.
3. Confirm with the human stakeholder on the nine open items in `14-requirement-audit.md` before
   Phase 2 (database), since several affect schema shape (e.g., presence scope affects whether a
   dedicated presence table is needed at all).
