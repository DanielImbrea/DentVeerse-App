import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountType, Database } from '@dental/types';

/** Production site — Supabase email links land here, then redirect into the app. */
function getAuthSiteUrl(): string {
  const url =
    process.env.EXPO_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'https://dentveerse.com';
  return url.replace(/\/$/, '');
}

export const AUTH_CALLBACK_URL = `${getAuthSiteUrl()}/auth/callback`;
export const AUTH_RESET_PASSWORD_URL = `${getAuthSiteUrl()}/auth/reset-password`;

/** Deep link opened by the website after email confirm — opens app sign-in. */
export const AUTH_APP_SIGN_IN_DEEP_LINK = 'dentalconnect://sign-in?confirmed=1';

/**
 * Authentication flows. See docs/03-security.md §1 for the full rationale.
 *
 * IMPORTANT — account_type assignment: `public.users` is bootstrapped by a
 * DB trigger (`handle_new_auth_user`, supabase/migrations/0003) with a
 * default of 'patient' the instant `auth.users` gets a new row. If the
 * person is registering as a clinic/laboratory, `setAccountType` below MUST
 * be called during onboarding, BEFORE the user does anything else — once
 * set, the `account_type` column is immutable (enforced by a DB trigger).
 * There is no "change account type" path anywhere in this API by design.
 */

export async function signUpWithEmail(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: AUTH_CALLBACK_URL },
  });
}

export async function signInWithEmail(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithPhoneOtp(supabase: SupabaseClient<Database>, phone: string) {
  return supabase.auth.signInWithOtp({ phone });
}

export async function verifyPhoneOtp(
  supabase: SupabaseClient<Database>,
  phone: string,
  token: string
) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

/**
 * Google/Apple sign-in on native mobile use `expo-auth-session` /
 * `expo-apple-authentication` to obtain an ID token, then exchange it here.
 * `idToken` comes from those native SDKs — never handled as a raw password.
 */
export async function signInWithGoogleIdToken(supabase: SupabaseClient<Database>, idToken: string) {
  return supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
}

export async function signInWithAppleIdToken(supabase: SupabaseClient<Database>, idToken: string) {
  return supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken });
}

export async function sendPasswordReset(supabase: SupabaseClient<Database>, email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: AUTH_RESET_PASSWORD_URL });
}

export async function updatePassword(supabase: SupabaseClient<Database>, newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}

/** Logs out of every device — revokes all refresh tokens (docs/03-security.md §1). */
export async function signOutEverywhere(supabase: SupabaseClient<Database>) {
  return supabase.auth.signOut({ scope: 'global' });
}

export async function signOutThisDevice(supabase: SupabaseClient<Database>) {
  return supabase.auth.signOut({ scope: 'local' });
}

/**
 * Sets account_type exactly once during onboarding. Because the column is
 * DB-trigger-immutable after the first non-default write, calling this a
 * second time (e.g. a retry) with the SAME value is safe/idempotent; calling
 * it with a DIFFERENT value after it has already been meaningfully set will
 * throw from the trigger — surface that error to the user as
 * "account type cannot be changed", not a generic error.
 */
export async function setAccountType(
  supabase: SupabaseClient<Database>,
  accountType: AccountType
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase
    .from('users')
    .update({ account_type: accountType })
    .eq('id', userData.user.id)
    .select()
    .single();
}

export async function getCurrentUserRow(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  return supabase.from('users').select('*').eq('id', userData.user.id).single();
}

/**
 * Server-side CAPTCHA verification, per docs/03-security.md §3. The token
 * comes from the CaptchaWidget component (WebView-embedded Cloudflare
 * Turnstile) and is verified here by invoking the `verify-captcha` Edge
 * Function, which independently re-checks it against Cloudflare's API using
 * the server-only secret key — this function's caller must NEVER treat
 * receiving a token as sufficient on its own, always call this and check
 * `verified === true` before proceeding with signup.
 */
export async function verifyCaptcha(
  supabase: SupabaseClient<Database>,
  token: string,
  options?: { action?: string; remoteip?: string }
) {
  const { data, error } = await supabase.functions.invoke('verify-captcha', {
    body: {
      token,
      action: options?.action ?? 'signup',
      ...(options?.remoteip ? { remoteip: options.remoteip } : {}),
    },
  });
  if (error) throw error;
  return (data as { verified: boolean; errors?: string[] }).verified === true;
}

export async function deleteAccount(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  // Immediately hide the account from all public surfaces (search, feed,
  // map, follow lists) — required by docs/11-gdpr-i18n.md ("Account
  // deletion... immediately disappear from all public surfaces instantly").
  // This must happen synchronously here, not deferred to the nightly
  // account-deletion-sweep Edge Function, which only performs the eventual
  // hard-delete after the 30-day grace window.
  const { error: statusError } = await supabase
    .from('users')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() })
    .eq('id', userData.user.id);
  if (statusError) throw statusError;

  // Creates the deletion request record (30-day grace window per
  // docs/16-client-decisions-mvp-scope-update.md §7); the eventual
  // hard-delete is performed by the `account-deletion-sweep` Edge Function
  // on a schedule, since it needs service-role privilege
  // (auth.admin.deleteUser) not available to this client-side call.
  return supabase
    .from('account_deletion_requests')
    .insert({ user_id: userData.user.id })
    .select()
    .single();
}
