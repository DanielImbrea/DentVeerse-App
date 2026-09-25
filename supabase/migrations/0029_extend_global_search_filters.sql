-- Extends global_search (supabase/migrations/0023) with optional filter
-- parameters, needed for the search filter UI added this session
-- (apps/mobile/app/(tabs)/discover/index.tsx). Previously only the
-- nearby_clinics/nearby_laboratories RPCs (0022) accepted filters —
-- global_search (the free-text search RPC actually used by the search
-- screen) did not, so a filter UI would have had nothing to call.
--
-- Backward compatible: all new parameters default to their previous
-- (no-op) behavior, so existing callers passing only p_query/p_limit are
-- unaffected.

create or replace function public.global_search(
  p_query text,
  p_limit int default 30,
  p_city text default null,
  p_verified_only boolean default false,
  p_open_for_collaboration_only boolean default false
)
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
  v_city := coalesce(p_city, public.detect_city_in_query(p_query));
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
      and (p_verified_only = false or c.is_verified = true)
      and (p_open_for_collaboration_only = false or c.open_for_collaboration = true)
      and (v_city is null or c.city = v_city)
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
      and (p_verified_only = false or l.is_verified = true)
      and (p_open_for_collaboration_only = false or l.open_for_collaboration = true)
      and (v_city is null or l.city = v_city)
      and (
        l.search_vector @@ v_ts_query
        or similarity(unaccent(l.name), unaccent(p_query)) > 0.25
        or (v_city is not null and l.city = v_city)
        or (v_service_id is not null and exists (select 1 from public.laboratory_services ls where ls.laboratory_id = l.id and ls.service_id = v_service_id))
      )
  )
  union all
  (
    -- Dentists (filters other than city don't apply meaningfully to
    -- individual dentists — verified/open-for-collaboration are org-level
    -- concepts — so p_verified_only/p_open_for_collaboration_only exclude
    -- dentists entirely from filtered results rather than ignoring the
    -- filter, which would be a surprising inconsistency).
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
      and p_verified_only = false
      and p_open_for_collaboration_only = false
      and (v_city is null or c.city = v_city)
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
