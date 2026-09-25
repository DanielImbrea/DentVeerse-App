// verify-captcha
//
// Server-side verification of a Cloudflare Turnstile token, per
// docs/03-security.md §3 ("CAPTCHA (Cloudflare Turnstile) on registration").
// The mobile client obtains a token from the Turnstile widget and sends it
// here — this function is the ONLY place that decides whether the token is
// valid, by calling Cloudflare's siteverify API server-side with the secret
// key (never exposed to the client). The client-supplied token is NEVER
// trusted on its own, per the explicit instruction "Nu accepta tokenul
// CAPTCHA fără verificare server-side."
//
// STATUS: written, NOT executed. Requires a real Cloudflare Turnstile site
// (free tier available at https://dash.cloudflare.com/?to=/:account/turnstile)
// to obtain a site key (client-side) and secret key (this function's
// TURNSTILE_SECRET_KEY env var) — neither exists in this environment.

import { jsonResponse, errorResponse } from '../_shared/client.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Derives a stable, deterministic UUID-shaped key from an IP string, so it fits rate_limits.actor_id (uuid) without a schema change for this one pre-auth caller. */
async function ipToUuid(ip: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  const bytes = new Uint8Array(hash).slice(0, 16);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
}

const EXPECTED_ACTION = 'signup';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const { token, remoteip, action: expectedAction } = await req.json();
    if (!token || typeof token !== 'string') {
      return errorResponse('token is required');
    }

    // RATE LIMITED (closes the gap documented in
    // supabase/migrations/0027_rate_limiting.sql): this endpoint is called
    // pre-authentication (it's part of the signup flow itself), so there is
    // no authenticated actor_id to key on — rate limit by remote IP
    // instead, using a synthetic UUID derived from it so it fits the
    // shared rate_limits table's actor_id column without a schema change
    // for this one pre-auth case.
    const ipKey = remoteip || req.headers.get('x-forwarded-for') || 'unknown';
    const syntheticActorId = await ipToUuid(ipKey);
    const allowed = await checkRateLimit(syntheticActorId, 'verify-captcha', 10, 60);
    if (!allowed) {
      return errorResponse('Too many verification attempts. Please wait a moment and try again.', 429);
    }

    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY');
    if (!secretKey) {
      // Fail closed, not open — if the secret isn't configured, refuse
      // every signup rather than silently letting all of them through
      // unverified. This is a deliberate choice: an admin who forgets to
      // configure the secret should see signups broken and loudly
      // investigate, not discover months later that anti-abuse protection
      // was silently disabled the whole time.
      return errorResponse('CAPTCHA verification is not configured on the server', 500);
    }

    const verifyBody = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteip) verifyBody.set('remoteip', remoteip);

    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verifyBody,
    });

    if (!verifyResponse.ok) {
      return errorResponse('CAPTCHA provider unreachable', 502);
    }

    const result = (await verifyResponse.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      return jsonResponse({ verified: false, errors: result['error-codes'] ?? [] }, 200);
    }

    const wantAction = typeof expectedAction === 'string' && expectedAction.length > 0 ? expectedAction : EXPECTED_ACTION;
    if (result.action && result.action !== wantAction) {
      return jsonResponse({ verified: false, errors: ['action_mismatch'] }, 200);
    }

    return jsonResponse({ verified: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});
