-- Reviews. See docs/02-database.md §7, docs/07-opportunities-follow-reviews.md
-- Part C, and docs/16-client-decisions-mvp-scope-update.md §7 (hard delete,
-- rating recalculated without the deleted review).

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_user_id uuid not null references public.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  communication_rating smallint check (communication_rating between 1 and 5),
  professionalism_rating smallint check (professionalism_rating between 1 and 5),
  experience_rating smallint check (experience_rating between 1 and 5),
  comment text,
  status review_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, patient_user_id)
);

create index reviews_clinic_idx on public.reviews (clinic_id);
create index reviews_status_idx on public.reviews (status);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Recalculates clinics.rating_avg/rating_count from `visible` reviews only.
-- Fires on insert/update/delete so a hard-deleted review (client's confirmed
-- GDPR deletion approach) or a status change (admin hide) both recompute
-- correctly. This is the single source of truth for these two columns.
create or replace function public.recalculate_clinic_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid := coalesce(new.clinic_id, old.clinic_id);
  v_avg numeric(3,2);
  v_count int;
begin
  select coalesce(avg(rating), 0), count(*)
  into v_avg, v_count
  from public.reviews
  where clinic_id = v_clinic_id and status = 'visible';

  update public.clinics
  set rating_avg = v_avg, rating_count = v_count
  where id = v_clinic_id;

  return coalesce(new, old);
end;
$$;

create trigger reviews_recalculate_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recalculate_clinic_rating();
