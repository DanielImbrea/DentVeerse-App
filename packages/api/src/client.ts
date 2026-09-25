import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

export type SupabaseClientAuthOptions = {
  storage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
  storageKey?: string;
};

/**
 * Anon-key client factory. This is the ONLY Supabase client mobile/web
 * client code should ever construct — every access rule is enforced by RLS
 * (see docs/03-security.md). The service-role key is never imported here and
 * must never reach client-bundled code (see docs/15-ai-agent-instructions.md
 * rules 2-3).
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  authOptions?: SupabaseClientAuthOptions
): SupabaseClient<Database> {
  if (!url || !anonKey) {
    throw new Error(
      'createSupabaseClient: missing url/anonKey — check SUPABASE_URL / SUPABASE_ANON_KEY env vars.'
    );
  }
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...authOptions,
    },
  });
}
