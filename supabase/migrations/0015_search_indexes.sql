-- Search indexes. See docs/05-search-map.md §1.
--
-- Generated columns require IMMUTABLE expressions; the stock unaccent() is only STABLE.
-- Wrap it so search_vector can be stored/generated (standard Postgres pattern).

create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select public.unaccent('public.unaccent', $1)
$$;

alter table public.clinics add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(city, ''))), 'B') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))), 'C')
  ) stored;

create index clinics_search_idx on public.clinics using gin (search_vector);
create index clinics_trgm_idx on public.clinics using gin (name gin_trgm_ops);

alter table public.laboratories add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(city, ''))), 'B') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))), 'C')
  ) stored;

create index laboratories_search_idx on public.laboratories using gin (search_vector);
create index laboratories_trgm_idx on public.laboratories using gin (name gin_trgm_ops);

alter table public.dentists add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', f_unaccent(coalesce(full_name, ''))), 'A')
  ) stored;

create index dentists_search_idx on public.dentists using gin (search_vector);
create index dentists_trgm_idx on public.dentists using gin (full_name gin_trgm_ops);

alter table public.opportunities add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))), 'C')
  ) stored;

create index opportunities_search_idx on public.opportunities using gin (search_vector);

alter table public.portfolio_items add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', f_unaccent(coalesce(description, ''))), 'C')
  ) stored;

create index portfolio_items_search_idx on public.portfolio_items using gin (search_vector);

-- Trigram index on specializations/services labels for typo-tolerant matching
-- against free-text query tokens (docs/05-search-map.md §1 query-parsing step 2).
create index specializations_label_ro_trgm_idx on public.specializations using gin (label_ro gin_trgm_ops);
create index services_label_ro_trgm_idx on public.services using gin (label_ro gin_trgm_ops);
