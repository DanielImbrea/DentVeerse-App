# 05 — Search & Map Architecture

## 1. Search

### Scope
Global search across: clinics, dentists, laboratories, services, cities, specializations —
supporting compound queries like *"Implantologie Galați"*, *"Laborator All-on-X București"*,
*"Fațete București"* (client §12).

### Approach — MVP: PostgreSQL native (no external search service yet)
Recommendation: **`tsvector` full-text search combined with `pg_trgm` fuzzy/prefix matching**,
entirely inside Supabase Postgres, for MVP and V1. Rationale: avoids operating a second stateful
service before there's evidence of need; Postgres FTS handles the client's example queries well
once city and specialization are indexed as **structured, filterable fields** rather than relying
purely on free-text matching against a description blob (a query like "Implantologie Galați" should
really be interpreted as "specialization=implantology AND city=Galați", not just token matching —
see query parsing below).

```sql
-- generated column example on clinics
alter table clinics add column search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(city,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'C')
  ) stored;
create index clinics_search_idx on clinics using gin(search_vector);
create index clinics_trgm_idx on clinics using gin(name gin_trgm_ops);
```
Similar generated columns/indexes on `laboratories`, `dentists`, and the `services`/
`specializations` catalogs.

### Query parsing strategy
1. Tokenize the query.
2. Attempt to match known **specialization**/**service** keys and known **city** names against the
   token set first (cheap dictionary lookups against small reference tables).
3. Whatever tokens remain feed into `plainto_tsquery`/`websearch_to_tsquery` against
   `search_vector`, combined with `pg_trgm` similarity for typo tolerance (`similarity(name, query)
   > 0.3` as a fallback path when FTS returns nothing).
4. Combine matched-city and matched-specialization as **hard filters**, and the remaining full-text
   query as a **ranking** signal — this is what correctly resolves "Implantologie Galați" into
   "clinics offering implantology, in Galați" rather than a loose keyword match.
5. Result ranking: `ts_rank` weighted by matched field (name > city > description, per the
   `setweight` above) combined with `is_verified` and `rating_avg` as secondary sort boosts, and
   distance-from-user as a tertiary boost when location permission is available.

### When to introduce a dedicated search service (Meilisearch/Typesense)
Trigger points to revisit: catalog exceeds roughly 50–100k searchable rows combined, query latency
on `search_vector` exceeds ~150ms at p95 under real load, or product wants features Postgres can't
do cleanly (typo-tolerant instant-as-you-type across multiple entity types with faceted counts).
Migration path: keep Postgres as system of record; add Meilisearch as a **read replica index**
updated via a Postgres trigger → Edge Function → Meilisearch upsert pipeline (or Supabase's
built-in webhook-on-change). This is explicitly deferred, not built speculatively — matches the
"don't over-engineer" instruction.

### Autocomplete
- **Recent searches:** stored client-side (local state / `search_history` table if cross-device
  sync desired — recommend client-side-only for MVP to avoid a low-value table).
- **Popular searches:** precomputed nightly (Edge Function cron) from a simple
  `search_query_log` aggregation into a small cached table read by the client — avoids a live
  `GROUP BY` on every keystroke.
- **Recommended categories:** static/curated per locale (top specializations, top cities) shown
  when the search box is empty/focused.

### Filters (client §13)
Implemented as parametrized query builders (not raw SQL from the client) in
`src/features/search/api.ts`:
- Clinics: city, specialization, service, rating (min stars), verified (bool), open for
  collaboration (bool).
- Laboratories: city, country, specialization, service, verified, open for collaboration,
  collaboration zone (local/national/european/international).
All filters compose with the search-vector/trigram query above via `AND`; indexes exist on every
filterable column (see `02-database.md`).

### Pagination
Cursor-based (keyset) pagination on `(rank desc, id)` or `(created_at desc, id)` for stable
infinite-scroll — offset pagination is avoided beyond the first page to prevent the classic
"skipped/duplicated rows as new data arrives" bug in a feed-like list.

## 2. Map Architecture

### Provider recommendation: Google Maps
| Criterion | Google Maps | Mapbox |
|---|---|---|
| Cost at this scale (Romania → Europe rollout) | Free tier (~$200/mo credit) covers early scale comfortably; per-load pricing predictable | Comparable pricing, but fewer teams have existing GCP billing/infra already in place for a first-time founder team |
| Data quality (Romanian addresses/geocoding) | Strong — Google's geocoding/POI data for Eastern Europe is generally more complete than Mapbox's in this region | Weaker regional POI/address completeness in RO/EU secondary cities historically |
| Native RN integration | `react-native-maps` with Google provider — mature, widely used | `@rnmapbox/maps` — also mature, but a second native module + config plugin to maintain |
| Custom branded styling (client wants a non-generic map) | Fully supported via Google's Cloud-based Map Styling (custom JSON style) — achieves the "branded, not generic-looking" requirement | Mapbox Studio offers deeper stylistic control, historically the stronger choice for highly bespoke cartography |

**Recommendation: Google Maps for MVP** (regional data quality + lower operational complexity for
a small team + still fully brandable via Cloud-based Map Styling), with Mapbox flagged as a
justified switch **only if** the design team later needs cartographic control Google's styling API
can't achieve — not a default assumption. Cost model: monitor `MAPS_LOADS` and geocoding request
volume monthly; both providers' free tiers comfortably cover Romania-only MVP traffic.

### Custom branded map experience (client requirement — must not look like generic Google Maps)
- **Custom map style** (via Google Cloud Map Styling): desaturate default road/POI colors, apply
  the `background`/`primary` palette tokens to water/land/roads so the map matches app chrome
  rather than default Google styling.
- **Custom markers:** three distinct marker shapes/icons — clinic (tooth+building glyph),
  dentist (person glyph), laboratory (flask/tool glyph) — each with a **verified variant** (adds the
  accent-colored verified badge as a marker overlay, per client §14).
- **Clustering:** `react-native-maps` clustering (via `react-native-map-clustering` or
  Supercluster client-side) once marker density crosses a readability threshold per zoom level;
  cluster bubbles styled with the `primary` token, showing count.
- **Marker tap → preview card:** bottom-anchored card showing logo, name, rating, specialization,
  and a "View Profile" CTA (client §14) — implemented as the same `ProfileCard`-family component
  used elsewhere, not a bespoke one-off.
- **Map/list toggle:** the Discover tab lets the user switch between the branded map and a ranked
  list view of the same filtered result set, sharing the same query/filter state so switching views
  never re-triggers a fresh unfiltered search.

### Location query implementation
```sql
select id, name, city,
  ST_Distance(location, ST_MakePoint(:lng, :lat)::geography) as distance_m
from clinics
where status = 'active'
  and ST_DWithin(location, ST_MakePoint(:lng, :lat)::geography, :radius_m)
order by distance_m asc
limit :page_size;
```
Backed by the `gist(location)` PostGIS index from `02-database.md`. Radius defaults to a sensible
city-scale value (e.g., 15km) and is user-adjustable via the filter sheet.

### Privacy
Only public profile fields (name, logo, rating, specialization, approximate location) are exposed
via the map query — this is naturally enforced because the underlying `clinics`/`laboratories` RLS
`SELECT` policy already restricts to public columns for anonymous/other-role readers (see
`03-security.md`).
