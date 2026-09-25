import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

/**
 * SERVER-ONLY client using the service-role key. The `server-only` import
 * above makes it a build error to accidentally import this from a Client
 * Component. Every admin Route Handler / Server Action uses this — never
 * construct a service-role client anywhere else. See docs/03-security.md
 * and docs/10-admin-panel.md §2.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'createAdminClient: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY server env vars.'
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
