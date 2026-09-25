-- Global search. See docs/05-search-map.md §1 for the query-parsing strategy
-- this implements: detect city + specialization tokens as hard filters,
-- remaining text as a ranking signal via tsvector + pg_trgm fallback.

-- Step 1 helper: try to detect a known city mentioned in the free-text query.
create or replace function public.detect_city_in_query(p_query text)
returns text
language sql stable security invoker
set search_path = public
as $$
  select city from (
    select distinct city from public.clinics where city is not null
    union
    select distinct city from public.laboratories where city is not null
  ) cities
  where unaccent(lower(p_query)) like '%' || unaccent(lower(city)) || '%'
  order by length(city) desc
  limit 1;
$$;

-- Step 1 helper: try to detect a known specialization/service mentioned in
-- the free-text query, via trigram similarity against RO labels (handles
-- "Implantologie" matching even with minor typos).
create or replace function public.detect_specialization_in_query(p_query text)
returns uuid
language sql stable security invoker
set search_path = public
as $$
  select id from public.specializations
  where similarity(unaccent(lower(label_ro)), unaccent(lower(p_query))) > 0.2
     or unaccent(lower(p_query)) like '%' || unaccent(lower(label_ro)) || '%'
  order by similarity(unaccent(lower(label_ro)), unaccent(lower(p_query))) desc
  limit 1;
$$;

create or replace function public.detect_service_in_query(p_query text)
returns uuid
language sql stable security invoker
set search_path = public
as $$
  select id from public.services
  where similarity(unaccent(lower(label_ro)), unaccent(lower(p_query))) > 0.2
     or unaccent(lower(p_query)) like '%' || unaccent(lower(label_ro)) || '%'
  order by similarity(unaccent(lower(label_ro)), unaccent(lower(p_query))) desc
  limit 1;
$$;

-- Unified global search across clinics, laboratories, dentists.
-- Returns a ranked, unioned result set the client renders as a single list
-- (grouped by result_type in the UI if desired).
create or replace function public.global_search(p_query text, p_limit int default 30)
returns table (
  result_type text,
  id uuid,
  name text,
  city text,
  logo_url text,
  is_verified boolean,
  rank real
)
language plpgsql stable security invoker
set search_path = public
as $$
declare
  v_city text;
  v_specialization_id uuid;
  v_service_id uuid;
  v_ts_query tsquery;
begin
  v_city := public.detect_city_in_query(p_query);
  v_specialization_id := public.detect_specialization_in_query(p_query);
  v_service_id := public.detect_service_in_query(p_query);

  begin
    v_ts_query := websearch_to_tsquery('simple', unaccent(p_query));
  exception when others then
    v_ts_query := plainto_tsquery('simple', unaccent(p_query));
  end;

  return query
  (
    -- Clinics
    select 'clinic'::text, c.id, c.name, c.city, c.logo_url, c.is_verified,
      (
        coalesce(ts_rank(c.search_vector, v_ts_query), 0)
        + case when v_city is not null and c.city = v_city then 0.5 else 0 end
        + case when v_specialization_id is not null and exists (
            select 1 from public.dentists d where d.clinic_id = c.id and d.specialization_id = v_specialization_id
          ) then 0.5 else 0 end
        + case when v_service_id is not null and exists (
            select 1 from public.clinic_services cs where cs.clinic_id = c.id and cs.service_id = v_service_id
          ) then 0.5 else 0 end
        + case when c.is_verified then 0.1 else 0 end
        + least(c.rating_avg / 50.0, 0.1)
      )::real as rank
    from public.clinics c
    where c.status = 'active'
      and not public.is_blocked_by_viewer('clinic', c.id)
      and (
        c.search_vector @@ v_ts_query
        or similarity(unaccent(c.name), unaccent(p_query)) > 0.25
        or (v_city is not null and c.city = v_city)
        or (v_specialization_id is not null and exists (select 1 from public.dentists d where d.clinic_id = c.id and d.specialization_id = v_specialization_id))
        or (v_service_id is not null and exists (select 1 from public.clinic_services cs where cs.clinic_id = c.id and cs.service_id = v_service_id))
      )
  )
  union all
  (
    -- Laboratories
    select 'laboratory'::text, l.id, l.name, l.city, l.logo_url, l.is_verified,
      (
        coalesce(ts_rank(l.search_vector, v_ts_query), 0)
        + case when v_city is not null and l.city = v_city then 0.5 else 0 end
        + case when v_service_id is not null and exists (
            select 1 from public.laboratory_services ls where ls.laboratory_id = l.id and ls.service_id = v_service_id
          ) then 0.5 else 0 end
        + case when l.is_verified then 0.1 else 0 end
      )::real as rank
    from public.laboratories l
    where l.status = 'active'
      and not public.is_blocked_by_viewer('laboratory', l.id)
      and (
        l.search_vector @@ v_ts_query
        or similarity(unaccent(l.name), unaccent(p_query)) > 0.25
        or (v_city is not null and l.city = v_city)
        or (v_service_id is not null and exists (select 1 from public.laboratory_services ls where ls.laboratory_id = l.id and ls.service_id = v_service_id))
      )
  )
  union all
  (
    -- Dentists
    select 'dentist'::text, d.id, d.full_name, c.city, d.photo_url, false,
      (
        coalesce(ts_rank(d.search_vector, v_ts_query), 0)
        + case when v_specialization_id is not null and d.specialization_id = v_specialization_id then 0.5 else 0 end
        + case when v_city is not null and c.city = v_city then 0.3 else 0 end
      )::real as rank
    from public.dentists d
    join public.clinics c on c.id = d.clinic_id
    where c.status = 'active'
      and not public.is_blocked_by_viewer('clinic', c.id)
      and (
        d.search_vector @@ v_ts_query
        or similarity(unaccent(d.full_name), unaccent(p_query)) > 0.25
        or (v_specialization_id is not null and d.specialization_id = v_specialization_id)
      )
  )
  order by rank desc
  limit p_limit;
end;
$$;
