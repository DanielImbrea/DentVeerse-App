-- Phase 1 baseline migration.
-- Enables the extensions the full schema (docs/02-database.md) depends on.
-- The actual tables/RLS policies from docs/02-database.md and docs/03-security.md
-- are added as subsequent numbered migrations in Phase 2 — do not add table
-- definitions to this file; keep it as the extensions-only baseline.

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists "uuid-ossp";
