-- Platform Limits (MVP). See docs/02-database.md §11 and
-- docs/16-client-decisions-mvp-scope-update.md §5 — no PRO plan/payments at
-- MVP, flat technical anti-spam limits apply to every account equally.

create table public.platform_limits (
  key text primary key,
  value int not null
);

insert into public.platform_limits (key, value) values
  ('max_portfolio_media_per_item', 25),
  ('max_active_opportunities', 5);

-- Enforce max_portfolio_media_per_item.
create or replace function public.enforce_portfolio_media_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_current_count int;
begin
  select value into v_limit from public.platform_limits where key = 'max_portfolio_media_per_item';

  select count(*) into v_current_count
  from public.portfolio_media
  where portfolio_item_id = new.portfolio_item_id;

  if v_current_count >= v_limit then
    raise exception 'Portfolio item already has the maximum of % media files', v_limit;
  end if;

  return new;
end;
$$;

create trigger portfolio_media_enforce_limit
  before insert on public.portfolio_media
  for each row execute function public.enforce_portfolio_media_limit();

-- Enforce max_active_opportunities (per authoring org, counting status='open').
create or replace function public.enforce_active_opportunities_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int;
  v_current_count int;
begin
  if new.status <> 'open' then
    return new;
  end if;

  select value into v_limit from public.platform_limits where key = 'max_active_opportunities';

  select count(*) into v_current_count
  from public.opportunities
  where author_type = new.author_type and author_id = new.author_id and status = 'open';

  if v_current_count >= v_limit then
    raise exception 'This account already has the maximum of % active opportunities', v_limit;
  end if;

  return new;
end;
$$;

create trigger opportunities_enforce_limit
  before insert on public.opportunities
  for each row execute function public.enforce_active_opportunities_limit();
