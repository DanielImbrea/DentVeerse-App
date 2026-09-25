// Shared helper for Edge Functions. Every function in this directory that
// needs elevated (service-role) privilege imports this — never construct a
// service-role client inline in a function body, to keep this single
// chokepoint auditable. See docs/03-security.md and
// docs/15-ai-agent-instructions.md rules 2-3.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export function createServiceRoleClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY function secrets.');
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Verifies the caller's JWT (passed via the Authorization header, which
 * Supabase automatically forwards to Edge Functions) and returns their user
 * id — every Edge Function must call this before doing anything privileged,
 * per docs/15-ai-agent-instructions.md ("every Edge Function that uses the
 * service-role key runs with its own explicit authorization check at the
 * top of the function").
 */
export async function getCallerUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Missing Authorization header');

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY function secrets.');

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
