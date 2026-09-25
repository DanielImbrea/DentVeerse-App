-- Opportunities / Collaboration. See docs/02-database.md §5 and
-- docs/16-client-decisions-mvp-scope-update.md §2 (multi-accept confirmed).

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  author_type opportunity_author_type not null,
  author_id uuid not null,
  title text not null,
  description text not null,
  city text,
  specialization_id uuid references public.specializations(id),
  status opportunity_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index opportunities_author_idx on public.opportunities (author_type, author_id);
create index opportunities_status_idx on public.opportunities (status);
create index opportunities_city_idx on public.opportunities (city);

create trigger opportunities_set_updated_at
  before update on public.opportunities
  for each row execute function public.set_updated_at();

create or replace function public.validate_opportunity_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.author_type = 'clinic' and not exists (select 1 from public.clinics where id = new.author_id) then
    raise exception 'opportunities.author_id % does not reference an existing clinic', new.author_id;
  elsif new.author_type = 'laboratory' and not exists (select 1 from public.laboratories where id = new.author_id) then
    raise exception 'opportunities.author_id % does not reference an existing laboratory', new.author_id;
  end if;
  return new;
end;
$$;

create trigger opportunities_validate_author
  before insert or update of author_type, author_id on public.opportunities
  for each row execute function public.validate_opportunity_author();

-- Now that opportunities exists, wire the FK from posts.linked_opportunity_id
-- (deferred from 0005 since opportunities didn't exist yet).
alter table public.posts
  add constraint posts_linked_opportunity_fk
  foreign key (linked_opportunity_id) references public.opportunities(id);

-- ============================================================================
-- opportunity_interests
-- ============================================================================
create table public.opportunity_interests (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  responder_type opportunity_author_type not null,
  responder_id uuid not null,
  status opportunity_interest_status not null default 'pending',
  conversation_id uuid, -- FK added in 0007_messaging.sql after conversations exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, responder_type, responder_id)
);

create index opportunity_interests_opportunity_idx on public.opportunity_interests (opportunity_id);
create index opportunity_interests_responder_idx on public.opportunity_interests (responder_type, responder_id);

create trigger opportunity_interests_set_updated_at
  before update on public.opportunity_interests
  for each row execute function public.set_updated_at();

create or replace function public.validate_opportunity_responder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.responder_type = 'clinic' and not exists (select 1 from public.clinics where id = new.responder_id) then
    raise exception 'opportunity_interests.responder_id % does not reference an existing clinic', new.responder_id;
  elsif new.responder_type = 'laboratory' and not exists (select 1 from public.laboratories where id = new.responder_id) then
    raise exception 'opportunity_interests.responder_id % does not reference an existing laboratory', new.responder_id;
  end if;
  return new;
end;
$$;

create trigger opportunity_interests_validate_responder
  before insert or update of responder_type, responder_id on public.opportunity_interests
  for each row execute function public.validate_opportunity_responder();

-- Cancelling an opportunity auto-transitions pending interests, per
-- docs/07-opportunities-follow-reviews.md Part A "edge cases explicitly handled".
create or replace function public.handle_opportunity_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.opportunity_interests
    set status = 'withdrawn_by_system'
    where opportunity_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger opportunities_handle_cancelled
  after update of status on public.opportunities
  for each row execute function public.handle_opportunity_cancelled();
