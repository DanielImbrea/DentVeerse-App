-- Row Level Security. See docs/03-security.md for the full rationale per table.
-- Every table has RLS enabled with no exceptions; default posture is deny.

-- ============================================================================
-- users
-- ============================================================================
alter table public.users enable row level security;

create policy users_select_own on public.users
  for select using (id = auth.uid());

create policy users_update_own on public.users
  for update using (id = auth.uid());
-- Note: the account_type immutability trigger (0003) rejects changes to that
-- column regardless of this policy allowing the UPDATE to proceed otherwise.

-- Limited public profile view (name/avatar only) for other users to resolve
-- e.g. comment authors, follower lists. Implemented as a view, not a raw
-- table policy, to avoid exposing email/phone/status broadly.
create view public.public_profiles as
  select u.id, p.first_name, p.last_name, p.avatar_url, u.account_type
  from public.users u
  left join public.patient_profiles p on p.user_id = u.id
  where u.status = 'active';

grant select on public.public_profiles to authenticated, anon;

-- ============================================================================
-- patient_profiles
-- ============================================================================
alter table public.patient_profiles enable row level security;

create policy patient_profiles_select_own on public.patient_profiles
  for select using (user_id = auth.uid());
create policy patient_profiles_insert_own on public.patient_profiles
  for insert with check (user_id = auth.uid() and public.current_account_type() = 'patient');
create policy patient_profiles_update_own on public.patient_profiles
  for update using (user_id = auth.uid());
create policy patient_profiles_delete_own on public.patient_profiles
  for delete using (user_id = auth.uid());

-- ============================================================================
-- clinics — public read (excluding orgs the viewer has blocked, per
-- docs/16-client-decisions-mvp-scope-update.md §4), owner/manager write.
-- ============================================================================
alter table public.clinics enable row level security;

create policy clinics_select_public on public.clinics
  for select using (
    status = 'active' and not public.is_blocked_by_viewer('clinic', id)
  );
create policy clinics_insert_own on public.clinics
  for insert with check (
    owner_user_id = auth.uid() and public.current_account_type() = 'clinic'
  );
create policy clinics_update_managers on public.clinics
  for update using (public.is_clinic_manager(id));
create policy clinics_delete_owner on public.clinics
  for delete using (public.is_clinic_owner(id));

-- ============================================================================
-- laboratories — same pattern as clinics.
-- ============================================================================
alter table public.laboratories enable row level security;

create policy laboratories_select_public on public.laboratories
  for select using (
    status = 'active' and not public.is_blocked_by_viewer('laboratory', id)
  );
create policy laboratories_insert_own on public.laboratories
  for insert with check (
    owner_user_id = auth.uid() and public.current_account_type() = 'laboratory'
  );
create policy laboratories_update_managers on public.laboratories
  for update using (public.is_laboratory_manager(id));
create policy laboratories_delete_owner on public.laboratories
  for delete using (public.is_laboratory_owner(id));

-- ============================================================================
-- clinic_members / laboratory_members
-- ============================================================================
alter table public.clinic_members enable row level security;

create policy clinic_members_select on public.clinic_members
  for select using (public.is_clinic_manager(clinic_id) or user_id = auth.uid());
create policy clinic_members_insert on public.clinic_members
  for insert with check (public.is_clinic_manager(clinic_id));
create policy clinic_members_update on public.clinic_members
  for update using (public.is_clinic_owner(clinic_id));
create policy clinic_members_delete on public.clinic_members
  for delete using (
    public.is_clinic_owner(clinic_id)
    and not (
      role = 'owner'
      and (select count(*) from public.clinic_members cm where cm.clinic_id = clinic_id and cm.role = 'owner') <= 1
    )
  );

alter table public.laboratory_members enable row level security;

create policy laboratory_members_select on public.laboratory_members
  for select using (public.is_laboratory_manager(laboratory_id) or user_id = auth.uid());
create policy laboratory_members_insert on public.laboratory_members
  for insert with check (public.is_laboratory_manager(laboratory_id));
create policy laboratory_members_update on public.laboratory_members
  for update using (public.is_laboratory_owner(laboratory_id));
create policy laboratory_members_delete on public.laboratory_members
  for delete using (
    public.is_laboratory_owner(laboratory_id)
    and not (
      role = 'owner'
      and (select count(*) from public.laboratory_members lm where lm.laboratory_id = laboratory_id and lm.role = 'owner') <= 1
    )
  );

-- ============================================================================
-- dentists — public read (of active clinics, excluding blocked), manager write.
-- ============================================================================
alter table public.dentists enable row level security;

create policy dentists_select_public on public.dentists
  for select using (
    exists (select 1 from public.clinics c where c.id = clinic_id and c.status = 'active')
    and not public.is_blocked_by_viewer('clinic', clinic_id)
  );
create policy dentists_insert on public.dentists
  for insert with check (public.is_clinic_manager(clinic_id));
create policy dentists_update on public.dentists
  for update using (public.is_clinic_manager(clinic_id));
create policy dentists_delete on public.dentists
  for delete using (public.is_clinic_manager(clinic_id));

-- ============================================================================
-- specializations / services / portfolio_categories — public read, admin write.
-- ============================================================================
alter table public.specializations enable row level security;
create policy specializations_select_public on public.specializations for select using (true);
create policy specializations_admin_write on public.specializations for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

alter table public.services enable row level security;
create policy services_select_public on public.services for select using (true);
create policy services_admin_write on public.services for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

alter table public.portfolio_categories enable row level security;
create policy portfolio_categories_select_public on public.portfolio_categories for select using (true);
create policy portfolio_categories_admin_write on public.portfolio_categories for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- ============================================================================
-- clinic_services / laboratory_services — public read, manager write.
-- ============================================================================
alter table public.clinic_services enable row level security;
create policy clinic_services_select_public on public.clinic_services
  for select using (
    exists (select 1 from public.clinics c where c.id = clinic_id and c.status = 'active')
  );
create policy clinic_services_write on public.clinic_services
  for all using (public.is_clinic_manager(clinic_id)) with check (public.is_clinic_manager(clinic_id));

alter table public.laboratory_services enable row level security;
create policy laboratory_services_select_public on public.laboratory_services
  for select using (
    exists (select 1 from public.laboratories l where l.id = laboratory_id and l.status = 'active')
  );
create policy laboratory_services_write on public.laboratory_services
  for all using (public.is_laboratory_manager(laboratory_id)) with check (public.is_laboratory_manager(laboratory_id));

-- ============================================================================
-- portfolio_items / portfolio_media — public read (published + not blocked),
-- manager sees own drafts too, manager write.
-- ============================================================================
alter table public.portfolio_items enable row level security;

create policy portfolio_items_select_public on public.portfolio_items
  for select using (
    (
      status = 'published'
      and not public.is_blocked_by_viewer(owner_type::text, owner_id)
    )
    or (owner_type = 'clinic' and public.is_clinic_manager(owner_id))
    or (owner_type = 'laboratory' and public.is_laboratory_manager(owner_id))
  );
create policy portfolio_items_insert on public.portfolio_items
  for insert with check (
    (owner_type = 'clinic' and public.is_clinic_manager(owner_id))
    or (owner_type = 'laboratory' and public.is_laboratory_manager(owner_id))
  );
create policy portfolio_items_update on public.portfolio_items
  for update using (
    (owner_type = 'clinic' and public.is_clinic_manager(owner_id))
    or (owner_type = 'laboratory' and public.is_laboratory_manager(owner_id))
  );
create policy portfolio_items_delete on public.portfolio_items
  for delete using (
    (owner_type = 'clinic' and public.is_clinic_manager(owner_id))
    or (owner_type = 'laboratory' and public.is_laboratory_manager(owner_id))
  );

alter table public.portfolio_media enable row level security;

create policy portfolio_media_select on public.portfolio_media
  for select using (
    exists (
      select 1 from public.portfolio_items pi
      where pi.id = portfolio_item_id
        and (
          (pi.status = 'published' and not public.is_blocked_by_viewer(pi.owner_type::text, pi.owner_id))
          or (pi.owner_type = 'clinic' and public.is_clinic_manager(pi.owner_id))
          or (pi.owner_type = 'laboratory' and public.is_laboratory_manager(pi.owner_id))
        )
    )
  );
create policy portfolio_media_write on public.portfolio_media
  for all using (
    exists (
      select 1 from public.portfolio_items pi
      where pi.id = portfolio_item_id
        and (
          (pi.owner_type = 'clinic' and public.is_clinic_manager(pi.owner_id))
          or (pi.owner_type = 'laboratory' and public.is_laboratory_manager(pi.owner_id))
        )
    )
  );
