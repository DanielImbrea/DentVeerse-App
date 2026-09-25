-- SECURITY FIX (second audit, this session): `clinics_update_managers` and
-- `laboratories_update_managers` (supabase/migrations/0018) grant UPDATE to
-- any org manager via a USING clause only, with NO WITH CHECK — this meant
-- a clinic/laboratory manager (including the lowest-privilege 'editor'
-- role) could set ANY column via a normal client update, including:
--   - owner_user_id: hijacking ownership away from the actual owner
--   - is_verified: self-granting the verification badge without ever
--     submitting or passing admin review
--   - rating_avg / rating_count: fabricating their own public rating
--   - status: un-suspending themselves after an admin suspension
-- This is a real privilege-escalation vulnerability, not a theoretical one
-- — every one of these fields is reachable through the exact same
-- `updateClinic`/`updateLaboratory` client functions
-- (packages/api/src/clinics.ts, laboratories.ts) already used by the
-- legitimate profile-edit screens; nothing stopped a modified client from
-- sending extra fields in that same call.
--
-- Fix: a BEFORE UPDATE trigger rejects any client-initiated change to
-- these five columns, while still allowing:
--   - Internal cascading updates from our own triggers (rating
--     recalculation, verification badge flip) — detected via
--     pg_trigger_depth() > 1, since those always fire as a NESTED update
--     from within another trigger's execution, never as the top-level
--     statement.
--   - service-role calls (e.g. the admin panel's suspend/restore Server
--     Actions, which correctly need to set `status`) — detected via
--     auth.role() = 'service_role'.
--   - platform admins acting through the authenticated (non-service-role)
--     path, if that's ever added — detected via is_platform_admin().

create or replace function public.protect_org_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if auth.role() = 'service_role' then
    return new;
  end if;

  if public.is_platform_admin() then
    return new;
  end if;

  if new.owner_user_id is distinct from old.owner_user_id
     or new.is_verified is distinct from old.is_verified
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.status is distinct from old.status
  then
    raise exception 'owner_user_id, is_verified, rating_avg, rating_count, and status cannot be modified directly by org managers — these are managed by the platform.';
  end if;

  return new;
end;
$$;

create trigger clinics_protect_privileged_columns
  before update on public.clinics
  for each row execute function public.protect_org_privileged_columns();

create trigger laboratories_protect_privileged_columns
  before update on public.laboratories
  for each row execute function public.protect_org_privileged_columns();
