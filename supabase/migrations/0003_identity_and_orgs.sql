-- Core identity & organizations. See docs/02-database.md §1.

-- ============================================================================
-- users (1:1 shadow of auth.users)
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type account_type not null,
  email text unique,
  phone text unique,
  locale text not null default 'ro',
  status entity_status not null default 'active',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index users_account_type_idx on public.users (account_type);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- account_type is immutable after creation (docs/03-security.md §1).
-- Exception: the bootstrap default 'patient' may be changed exactly once during
-- onboarding (choose-account-type → setAccountType) before any real profile exists.
create or replace function public.enforce_account_type_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.account_type is distinct from new.account_type then
    if old.account_type = 'patient'
       and not exists (select 1 from public.patient_profiles where user_id = old.id)
       and not exists (select 1 from public.clinics where owner_user_id = old.id)
       and not exists (select 1 from public.laboratories where owner_user_id = old.id) then
      return new;
    end if;
    raise exception 'account_type is immutable and cannot be changed after creation';
  end if;
  return new;
end;
$$;

create trigger users_account_type_immutable
  before update on public.users
  for each row execute function public.enforce_account_type_immutable();

-- Bootstraps a public.users row whenever a new auth.users row is created.
-- account_type is set separately by the bootstrap-profile Edge Function
-- immediately after signup (Phase 3) — defaults to 'patient' here only as a
-- safe fallback, the Edge Function is expected to update it during onboarding
-- before the immutability trigger locks it in.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, phone, account_type)
  values (new.id, new.email, new.phone, 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- patient_profiles
-- ============================================================================
create table public.patient_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  first_name text,
  last_name text,
  city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger patient_profiles_set_updated_at
  before update on public.patient_profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- specializations (reference catalog, admin-curated)
-- ============================================================================
create table public.specializations (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label_ro text not null,
  label_en text not null,
  icon text,
  active boolean not null default true
);

-- ============================================================================
-- clinics
-- ============================================================================
create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  cover_url text,
  address text,
  city text,
  county text,
  country text not null default 'RO',
  location geography(Point, 4326),
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  working_hours jsonb,
  open_for_collaboration boolean not null default false,
  collaboration_note text,
  is_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index clinics_location_idx on public.clinics using gist (location);
create index clinics_city_idx on public.clinics (city);
create index clinics_verified_idx on public.clinics (is_verified);
create index clinics_collab_idx on public.clinics (open_for_collaboration);
create index clinics_owner_idx on public.clinics (owner_user_id);

create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

-- ============================================================================
-- laboratories
-- ============================================================================
create table public.laboratories (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  cover_url text,
  address text,
  city text,
  county text,
  country text not null default 'RO',
  location geography(Point, 4326),
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  tiktok text,
  years_experience int,
  team_size int,
  collaboration_zone collaboration_zone,
  open_for_collaboration boolean not null default false,
  collaboration_note text,
  is_verified boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  status entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index laboratories_location_idx on public.laboratories using gist (location);
create index laboratories_city_idx on public.laboratories (city);
create index laboratories_verified_idx on public.laboratories (is_verified);
create index laboratories_collab_idx on public.laboratories (open_for_collaboration);
create index laboratories_owner_idx on public.laboratories (owner_user_id);

create trigger laboratories_set_updated_at
  before update on public.laboratories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- clinic_members / laboratory_members
-- ============================================================================
create table public.clinic_members (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role org_member_role not null default 'editor',
  created_at timestamptz not null default now(),
  unique (clinic_id, user_id)
);

create table public.laboratory_members (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role org_member_role not null default 'editor',
  created_at timestamptz not null default now(),
  unique (laboratory_id, user_id)
);

-- Automatically add the creating user as 'owner' when a clinic/laboratory is
-- inserted, so ownership never depends on a second client-side call.
create or replace function public.add_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'clinics' then
    insert into public.clinic_members (clinic_id, user_id, role)
    values (new.id, new.owner_user_id, 'owner');
  elsif TG_TABLE_NAME = 'laboratories' then
    insert into public.laboratory_members (laboratory_id, user_id, role)
    values (new.id, new.owner_user_id, 'owner');
  end if;
  return new;
end;
$$;

create trigger clinics_add_owner_member
  after insert on public.clinics
  for each row execute function public.add_owner_as_member();

create trigger laboratories_add_owner_member
  after insert on public.laboratories
  for each row execute function public.add_owner_as_member();

-- ============================================================================
-- dentists (public-facing team roster, not a login identity)
-- ============================================================================
create table public.dentists (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  full_name text not null,
  photo_url text,
  specialization_id uuid references public.specializations(id),
  description text,
  years_experience int,
  instagram text,
  facebook text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index dentists_clinic_idx on public.dentists (clinic_id);

create trigger dentists_set_updated_at
  before update on public.dentists
  for each row execute function public.set_updated_at();
