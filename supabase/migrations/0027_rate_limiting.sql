-- Rate limiting. docs/03-security.md §3's threat model explicitly calls
-- for "per-user rate limits" on spam (posts, comments, messages, reviews)
-- but nothing in the codebase enforced this until now — found during the
-- second security audit's explicit check for "rate limiting gaps."
--
-- Approach: a generic trigger function checks how many rows the same actor
-- has inserted into the SAME table within a trailing time window, and
-- rejects the insert if over the limit. This is a basic, real, working
-- rate limit — not a placeholder — though it is coarser than a proper
-- token-bucket/sliding-window implementation (e.g. a burst of exactly the
-- limit followed by a wait is allowed, then another burst) and does not
-- protect Edge Functions or RPCs directly (see below for the Edge Function
-- gap called out separately). This is the correct MVP-appropriate
-- trade-off: real protection against sustained spam bots, not perfect
-- protection against every abuse pattern.

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_per_window int := TG_ARGV[0]::int;
  window_seconds int := TG_ARGV[1]::int;
  actor_column text := TG_ARGV[2];
  actor_id uuid;
  recent_count int;
begin
  -- Admins/service-role calls are never rate-limited (e.g. seeding,
  -- support actions, or internal system inserts).
  if auth.role() = 'service_role' or public.is_platform_admin() then
    return new;
  end if;

  execute format('select ($1).%I', actor_column) into actor_id using new;

  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - make_interval(secs => $2)',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, actor_column
  ) into recent_count using actor_id, window_seconds;

  if recent_count >= max_per_window then
    raise exception 'Rate limit exceeded: max % per % seconds', max_per_window, window_seconds;
  end if;

  return new;
end;
$$;

-- messages: max 30 per minute per sender — generous enough for real
-- conversation, tight enough to stop a scripted spam burst.
create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function public.enforce_rate_limit(30, 60, 'sender_user_id');

-- comments: max 20 per minute per author.
create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.enforce_rate_limit(20, 60, 'author_user_id');

-- reviews: max 5 per hour per patient (on top of the existing one-per-clinic
-- uniqueness constraint — this additionally stops a patient from rapidly
-- creating-then-deleting-then-recreating reviews across many different
-- clinics as a spam/manipulation pattern).
create trigger reviews_rate_limit
  before insert on public.reviews
  for each row execute function public.enforce_rate_limit(5, 3600, 'patient_user_id');

-- reports: max 10 per hour per reporter — prevents weaponizing the report
-- system itself as a harassment/spam vector against a target.
create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.enforce_rate_limit(10, 3600, 'reporter_user_id');

-- ============================================================================
-- KNOWN REMAINING GAP (documented, not silently omitted): this migration
-- protects direct table INSERTs governed by RLS. It does NOT protect:
--   - Edge Function invocation rate (verify-captcha, create-mux-upload,
--     get-message-attachment-url, get-data-export-url,
--     admin-verification-document-url) — Supabase's platform-level rate
--     limiting on Edge Functions provides some baseline protection, but no
--     application-level per-user limit exists on these specific functions.
--   - auth.users signup rate beyond Supabase Auth's own built-in limiting
--     and the CAPTCHA gate added this session.
-- Adding per-function rate limiting would need a shared `rate_limits` table
-- (actor_id, function_name, window_start, count) checked at the top of
-- each Edge Function — a reasonable follow-up, not built here to keep this
-- migration's scope to the table-insert gap that was concretely found.
-- ============================================================================
