-- Services & Portfolio. See docs/02-database.md §2.

-- ============================================================================
-- services (global catalog, admin-curated)
-- ============================================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label_ro text not null,
  label_en text not null,
  category service_category not null,
  icon text,
  active boolean not null default true
);

-- ============================================================================
-- clinic_services / laboratory_services (instance offerings)
-- ============================================================================
create table public.clinic_services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  service_id uuid not null references public.services(id),
  custom_title text,
  description text,
  image_url text,
  price_from numeric,
  currency text not null default 'RON',
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, service_id)
);

create trigger clinic_services_set_updated_at
  before update on public.clinic_services
  for each row execute function public.set_updated_at();

create table public.laboratory_services (
  id uuid primary key default gen_random_uuid(),
  laboratory_id uuid not null references public.laboratories(id) on delete cascade,
  service_id uuid not null references public.services(id),
  custom_title text,
  description text,
  image_url text,
  price_from numeric,
  currency text not null default 'RON',
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laboratory_id, service_id)
);

create trigger laboratory_services_set_updated_at
  before update on public.laboratory_services
  for each row execute function public.set_updated_at();

-- ============================================================================
-- portfolio_categories (reference catalog)
-- ============================================================================
create table public.portfolio_categories (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label_ro text not null,
  label_en text not null,
  applies_to service_category not null default 'both'
);

-- ============================================================================
-- portfolio_items (polymorphic owner: clinic | laboratory)
-- ============================================================================
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_type portfolio_owner_type not null,
  owner_id uuid not null,
  title text,
  description text,
  category_id uuid references public.portfolio_categories(id),
  is_before_after boolean not null default false,
  status portfolio_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index portfolio_items_owner_idx on public.portfolio_items (owner_type, owner_id);
create index portfolio_items_category_idx on public.portfolio_items (category_id);

create trigger portfolio_items_set_updated_at
  before update on public.portfolio_items
  for each row execute function public.set_updated_at();

-- Polymorphic-owner FK validation (docs/02-database.md §2 rationale: native FK
-- can't target two possible tables, so we validate in a trigger instead).
create or replace function public.validate_portfolio_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_type = 'clinic' then
    if not exists (select 1 from public.clinics where id = new.owner_id) then
      raise exception 'portfolio_items.owner_id % does not reference an existing clinic', new.owner_id;
    end if;
  elsif new.owner_type = 'laboratory' then
    if not exists (select 1 from public.laboratories where id = new.owner_id) then
      raise exception 'portfolio_items.owner_id % does not reference an existing laboratory', new.owner_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger portfolio_items_validate_owner
  before insert or update of owner_type, owner_id on public.portfolio_items
  for each row execute function public.validate_portfolio_owner();

-- ============================================================================
-- portfolio_media
-- ============================================================================
create table public.portfolio_media (
  id uuid primary key default gen_random_uuid(),
  portfolio_item_id uuid not null references public.portfolio_items(id) on delete cascade,
  media_type media_type not null,
  storage_path text not null,
  video_playback_url text,
  thumbnail_url text,
  before_after_role before_after_role not null default 'single',
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index portfolio_media_item_idx on public.portfolio_media (portfolio_item_id);
