import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

/** Global search. See docs/05-search-map.md §1 and supabase/migrations/0023. */
export interface SearchResult {
  result_type: 'clinic' | 'laboratory' | 'dentist';
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  is_verified: boolean;
  rank: number;
}

export interface SearchOptions {
  limit?: number;
  city?: string | null;
  verifiedOnly?: boolean;
  openForCollaborationOnly?: boolean;
}

export async function globalSearch(supabase: SupabaseClient<Database>, query: string, options: SearchOptions = {}) {
  return supabase.rpc('global_search' as never, {
    p_query: query,
    p_limit: options.limit ?? 30,
    p_city: options.city ?? null,
    p_verified_only: options.verifiedOnly ?? false,
    p_open_for_collaboration_only: options.openForCollaborationOnly ?? false,
  } as never) as unknown as Promise<{
    data: SearchResult[] | null;
    error: Error | null;
  }>;
}

/**
 * Recent searches: kept CLIENT-SIDE ONLY per docs/05-search-map.md
 * ("recommend client-side-only for MVP to avoid a low-value table") — store
 * via a Zustand persisted store or AsyncStorage in the mobile app, not here.
 * This module intentionally has no `recordSearch`/`getRecentSearches`
 * function talking to Postgres.
 */

/**
 * Popular searches: per docs/05-search-map.md, meant to be precomputed
 * nightly by a cron Edge Function into a small cached table. That table
 * (`popular_searches`) and its cron job are NOT yet created — flagged as
 * remaining work, not silently stubbed as if implemented. Add a
 * `popular_searches` table + `search_query_log` table + a scheduled Edge
 * Function in Cursor when ready to build this specific enhancement; it is
 * not required for MVP functional completeness (client spec doesn't
 * explicitly require "popular searches", only "search" generally).
 */
