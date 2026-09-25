-- SECURITY FIX (final verification pass, this session): found during the
-- explicit systematic search for "acting_as values controlled by client."
--
-- `create_or_get_conversation` (supabase/migrations/0007_messaging.sql)
-- accepted `p_my_acting_as_type`/`p_my_acting_as_id` and
-- `p_other_acting_as_type`/`p_other_acting_as_id` from the CALLER with NO
-- verification that:
--   (a) the calling user (auth.uid()) actually manages the clinic/
--       laboratory they claimed to be acting as, or
--   (b) the other party (p_other_user_id) actually manages the org they
--       were claimed to represent.
-- This meant any authenticated user could start a conversation claiming to
-- represent ANY clinic or laboratory in the system, regardless of any real
-- relationship to it — deceiving the counterparty about who they're
-- actually talking to. This is the same class of identity-spoofing bug as
-- the conversation_members UPDATE fix in 0026, except this one was at
-- INSERT time via the RPC's own logic, which 0026's UPDATE-focused trigger
-- does not cover (the trigger only protects against later UPDATEs to an
-- already-correctly-created row — it does nothing if the row was spoofed
-- at creation).
--
-- Fix: re-define the function (CREATE OR REPLACE) adding real membership
-- checks before either INSERT.

create or replace function public.create_or_get_conversation(
  p_other_user_id uuid,
  p_my_acting_as_type acting_as_type,
  p_my_acting_as_id uuid,
  p_other_acting_as_type acting_as_type,
  p_other_acting_as_id uuid,
  p_origin conversation_origin default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_existing_conversation_id uuid;
  v_new_conversation_id uuid;
  v_allowed boolean := false;
begin
  if v_me is null then
    raise exception 'create_or_get_conversation: not authenticated';
  end if;

  -- ==========================================================================
  -- NEW: verify the caller actually manages the org they claim to represent.
  -- ==========================================================================
  if p_my_acting_as_type = 'patient' then
    if p_my_acting_as_id <> v_me then
      raise exception 'create_or_get_conversation: cannot act as a different patient identity';
    end if;
  elsif p_my_acting_as_type = 'clinic' then
    if not public.is_clinic_manager(p_my_acting_as_id) then
      raise exception 'create_or_get_conversation: you do not manage this clinic';
    end if;
  elsif p_my_acting_as_type = 'laboratory' then
    if not public.is_laboratory_manager(p_my_acting_as_id) then
      raise exception 'create_or_get_conversation: you do not manage this laboratory';
    end if;
  end if;

  -- ==========================================================================
  -- NEW: verify the OTHER party actually manages the org they're claimed to
  -- represent — prevents a caller from fabricating a fake counterparty
  -- identity (e.g. "I'm messaging Dr. X on behalf of Clinic Y" when Dr. X
  -- has no relationship to Clinic Y at all).
  -- ==========================================================================
  if p_other_acting_as_type = 'patient' then
    if p_other_acting_as_id <> p_other_user_id then
      raise exception 'create_or_get_conversation: invalid counterparty identity';
    end if;
  elsif p_other_acting_as_type = 'clinic' then
    if not exists (
      select 1 from public.clinic_members
      where clinic_id = p_other_acting_as_id and user_id = p_other_user_id
    ) then
      raise exception 'create_or_get_conversation: counterparty does not manage this clinic';
    end if;
  elsif p_other_acting_as_type = 'laboratory' then
    if not exists (
      select 1 from public.laboratory_members
      where laboratory_id = p_other_acting_as_id and user_id = p_other_user_id
    ) then
      raise exception 'create_or_get_conversation: counterparty does not manage this laboratory';
    end if;
  end if;

  -- Block check, both directions.
  if exists (
    select 1 from public.blocked_users
    where (blocker_user_id = v_me and blocked_user_id = p_other_user_id)
       or (blocker_user_id = p_other_user_id and blocked_user_id = v_me)
  ) then
    raise exception 'create_or_get_conversation: blocked';
  end if;

  -- Allowed-pair rules (client spec §17): Patient->Clinic, Clinic->Laboratory,
  -- Laboratory->Clinic, Clinic->Clinic, Laboratory->Laboratory.
  -- Patient->Patient and Patient->Laboratory are NOT allowed.
  if p_my_acting_as_type = 'patient' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'patient' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'laboratory' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'laboratory' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'clinic' and p_other_acting_as_type = 'clinic' then
    v_allowed := true;
  elsif p_my_acting_as_type = 'laboratory' and p_other_acting_as_type = 'laboratory' then
    v_allowed := true;
  end if;

  if not v_allowed then
    raise exception 'create_or_get_conversation: this pair of account types cannot message each other';
  end if;

  -- Reuse an existing direct conversation between these two identities if one exists.
  select cm1.conversation_id into v_existing_conversation_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = v_me
    and cm2.user_id = p_other_user_id
  limit 1;

  if v_existing_conversation_id is not null then
    return v_existing_conversation_id;
  end if;

  insert into public.conversations (type, origin)
  values ('direct', p_origin)
  returning id into v_new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, acting_as_type, acting_as_id)
  values
    (v_new_conversation_id, v_me, p_my_acting_as_type, p_my_acting_as_id),
    (v_new_conversation_id, p_other_user_id, p_other_acting_as_type, p_other_acting_as_id);

  return v_new_conversation_id;
end;
$$;
