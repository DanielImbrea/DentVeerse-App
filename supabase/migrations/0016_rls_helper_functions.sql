-- RLS helper functions. See docs/03-security.md §2.

create or replace function public.current_account_type()
returns text
language sql stable security definer
set search_path = public
as $$
  select account_type::text from public.users where id = auth.uid();
$$;

create or replace function public.is_clinic_manager(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = cid and user_id = auth.uid()
  );
$$;

create or replace function public.is_clinic_owner(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = cid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_laboratory_manager(lid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.laboratory_members
    where laboratory_id = lid and user_id = auth.uid()
  );
$$;

create or replace function public.is_laboratory_owner(lid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.laboratory_members
    where laboratory_id = lid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

create or replace function public.current_admin_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role::text from public.admin_users where id = auth.uid();
$$;

-- Resolves the owning user_id for a given (owner_type, owner_id) org
-- reference — used by is_blocked_by_viewer below.
create or replace function public.resolve_org_owner_user_id(p_type text, p_id uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select case p_type
    when 'clinic' then (select owner_user_id from public.clinics where id = p_id)
    when 'laboratory' then (select owner_user_id from public.laboratories where id = p_id)
    else null
  end;
$$;

-- Confirmed by client (docs/16-client-decisions-mvp-scope-update.md §4):
-- blocking hides the blocked org's content completely from the blocker,
-- across feed/search/map/profile — not just messaging. This is
-- one-directional: only hidden from the blocker's own view.
create or replace function public.is_blocked_by_viewer(p_target_owner_type text, p_target_owner_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_users bu
    where bu.blocker_user_id = auth.uid()
      and bu.blocked_user_id = public.resolve_org_owner_user_id(p_target_owner_type, p_target_owner_id)
  );
$$;

-- Membership check for messaging RLS. SECURITY DEFINER avoids infinite recursion
-- when conversation_members policies would otherwise self-query the same table.
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id and user_id = p_user_id
  );
$$;
