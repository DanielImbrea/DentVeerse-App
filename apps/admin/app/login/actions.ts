'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { createAdminClient } from '../../lib/supabaseAdmin';
import { s } from '../../lib/strings';

/**
 * SECURITY FIX (this session): login now goes through a Server Action using
 * `createSupabaseServerClient()`, which sets the resulting session as
 * httpOnly cookies via Next.js's `cookies()` API — this is what makes
 * `requireAdmin()` (lib/requireAdmin.ts) able to verify the session
 * server-side on every subsequent Server Action call. The previous version
 * of this login page called `supabase.auth.signInWithPassword` from a
 * Client Component, which only stored the session in the browser's
 * localStorage/memory — invisible to the server, which is exactly why the
 * old Server Actions had no way to know who was acting and fell back to a
 * client-trusted hidden form field. That entire class of vulnerability is
 * closed by this change.
 */
export async function signInAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent(s.errors.emailPasswordRequired)}`);
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? s.errors.signInFailed)}`);
  }

  // Verify admin_users membership BEFORE letting the session stand — a
  // consumer-app account that isn't an admin gets signed out immediately,
  // never reaching the dashboard even for a moment.
  const admin = createAdminClient();
  const { data: adminRow, error: adminError } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent(s.errors.noAdminAccess)}`);
  }

  await admin.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);

  redirect('/overview');
}

export async function signOutAction() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
