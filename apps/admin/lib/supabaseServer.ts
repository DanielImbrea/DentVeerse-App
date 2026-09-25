import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@dental/types';

/**
 * SECURITY FIX (this session): this is the replacement for the previous
 * hidden-form-field admin-identity pattern. This client reads the caller's
 * actual Supabase Auth session from httpOnly cookies set during login
 * (see app/login/actions.ts) — it is impossible for a client to forge this
 * by tampering with form data, since the cookies are httpOnly and the
 * session itself is verified against Supabase Auth on every call to
 * `.auth.getUser()`.
 *
 * Uses the ANON key (not service-role) — this client is subject to normal
 * RLS. Admin-privileged reads/writes still go through
 * `createAdminClient()` (service-role, lib/supabaseAdmin.ts) AFTER the
 * caller's admin status has been verified via this client, per
 * `requireAdmin()` in lib/requireAdmin.ts. Never skip that verification
 * step and call the service-role client directly from a Server Action.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component (not a Server Action/Route
            // Handler) — cookie mutation isn't allowed there. Safe to
            // ignore since middleware.ts refreshes the session on every
            // request anyway (see middleware.ts below).
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}
