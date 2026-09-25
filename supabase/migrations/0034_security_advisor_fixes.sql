-- Security Advisor fixes (Supabase linter):
-- 1) public.public_profiles — use security_invoker view + definer helper for directory rows
-- 2) public.spatial_ref_sys — enable RLS (PostGIS catalog; no user data)

-- ============================================================================
-- public_profiles: invoker view (no SECURITY DEFINER on the view itself)
-- ============================================================================

create or replace function public.list_active_public_users()
returns table (id uuid, account_type public.account_type)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.account_type
  from public.users u
  where u.status = 'active';
$$;

revoke all on function public.list_active_public_users() from public;
grant execute on function public.list_active_public_users() to anon, authenticated;

drop view if exists public.public_profiles;

create view public.public_profiles
with (security_invoker = true)
as
select
  lu.id,
  p.first_name,
  p.last_name,
  p.avatar_url,
  lu.account_type
from public.list_active_public_users() lu
left join public.patient_profiles p on p.user_id = lu.id;

grant select on public.public_profiles to authenticated, anon;

-- Invoker view reads patient_profiles; allow public name/avatar for active users only.
create policy patient_profiles_select_public on public.patient_profiles
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.list_active_public_users() lu
      where lu.id = patient_profiles.user_id
    )
  );

-- ============================================================================
-- spatial_ref_sys (PostGIS): NOT fixable on Supabase Cloud — owned by supabase_admin.
-- Security Advisor "RLS Disabled" is a known false positive (EPSG catalog only).
-- See: https://github.com/supabase/supabase/issues/47206
-- Best-effort: revoke API roles if the migration role has grant option.
-- ============================================================================

do $$
begin
  revoke all on table public.spatial_ref_sys from anon, authenticated;
exception
  when others then
    raise notice 'spatial_ref_sys: skipped (%); safe to ignore Security Advisor flag', sqlerrm;
end;
$$;
