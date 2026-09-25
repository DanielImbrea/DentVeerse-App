-- Geo search & location-setting RPCs. See docs/05-search-map.md §2.

create or replace function public.set_clinic_location(p_clinic_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security invoker -- relies on the caller's own RLS grant (clinics_update_managers)
set search_path = public
as $$
begin
  update public.clinics
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  where id = p_clinic_id;
end;
$$;

create or replace function public.set_laboratory_location(p_laboratory_id uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.laboratories
  set location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  where id = p_laboratory_id;
end;
$$;

-- Radius search for clinics. security invoker so the existing public-read RLS
-- policy on clinics still applies (this RPC does not bypass RLS, it is a
-- convenience wrapper for the ST_DWithin query described in
-- docs/05-search-map.md §2).
create or replace function public.nearby_clinics(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 15000,
  p_city text default null,
  p_specialization_id uuid default null,
  p_verified_only boolean default false,
  p_open_for_collaboration_only boolean default false,
  p_limit int default 50
)
returns table (
  id uuid, name text, slug text, city text, logo_url text, is_verified boolean,
  rating_avg numeric, open_for_collaboration boolean, distance_m double precision,
  latitude double precision, longitude double precision
)
language sql stable security invoker
set search_path = public
as $$
  select
    c.id, c.name, c.slug, c.city, c.logo_url, c.is_verified, c.rating_avg,
    c.open_for_collaboration,
    ST_Distance(c.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m,
    ST_Y(c.location::geometry) as latitude,
    ST_X(c.location::geometry) as longitude
  from public.clinics c
  where c.status = 'active'
    and c.location is not null
    and ST_DWithin(c.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    and (p_city is null or c.city = p_city)
    and (p_verified_only = false or c.is_verified = true)
    and (p_open_for_collaboration_only = false or c.open_for_collaboration = true)
    and (
      p_specialization_id is null or exists (
        select 1 from public.dentists d where d.clinic_id = c.id and d.specialization_id = p_specialization_id
      )
    )
    and not public.is_blocked_by_viewer('clinic', c.id)
  order by distance_m asc
  limit p_limit;
$$;

create or replace function public.nearby_laboratories(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 15000,
  p_city text default null,
  p_verified_only boolean default false,
  p_open_for_collaboration_only boolean default false,
  p_limit int default 50
)
returns table (
  id uuid, name text, slug text, city text, logo_url text, is_verified boolean,
  collaboration_zone text, open_for_collaboration boolean, distance_m double precision,
  latitude double precision, longitude double precision
)
language sql stable security invoker
set search_path = public
as $$
  select
    l.id, l.name, l.slug, l.city, l.logo_url, l.is_verified, l.collaboration_zone::text,
    l.open_for_collaboration,
    ST_Distance(l.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) as distance_m,
    ST_Y(l.location::geometry) as latitude,
    ST_X(l.location::geometry) as longitude
  from public.laboratories l
  where l.status = 'active'
    and l.location is not null
    and ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    and (p_city is null or l.city = p_city)
    and (p_verified_only = false or l.is_verified = true)
    and (p_open_for_collaboration_only = false or l.open_for_collaboration = true)
    and not public.is_blocked_by_viewer('laboratory', l.id)
  order by distance_m asc
  limit p_limit;
$$;
