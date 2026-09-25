-- Edge Function-level rate limiting. Closes the gap explicitly documented
-- in 0027_rate_limiting.sql's "KNOWN REMAINING GAP" note: table-insert rate
-- limiting was implemented, but nothing protected Edge Function invocation
-- itself (verify-captcha, create-mux-upload, get-message-attachment-url,
-- get-data-export-url, admin-verification-document-url).
--
-- Approach: a shared `rate_limits` table (actor_id, bucket, window_start,
-- count), checked/incremented by a small shared helper each Edge Function
-- calls at its top (see supabase/functions/_shared/rateLimit.ts). This is a
-- fixed-window counter (simpler than sliding-window/token-bucket, same
-- documented trade-off as 0027's table-trigger approach — real protection
-- against sustained abuse, not perfect protection against every burst
-- pattern).

create table public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  bucket text not null, -- e.g. 'verify-captcha', 'create-mux-upload'
  window_start timestamptz not null,
  count int not null default 1,
  unique (actor_id, bucket, window_start)
);

create index rate_limits_lookup_idx on public.rate_limits (actor_id, bucket, window_start);

-- No RLS policies at all — this table is only ever touched by Edge
-- Functions using the service-role key, never by client code directly.
alter table public.rate_limits enable row level security;

-- Cleanup: old rate-limit windows accumulate indefinitely otherwise. Run
-- periodically (e.g. daily, alongside account-deletion-sweep's cron) —
-- not self-cleaning on every check to avoid adding latency to every
-- rate-limited request.
create or replace function public.cleanup_old_rate_limits()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;
