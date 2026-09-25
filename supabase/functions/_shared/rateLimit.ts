// Shared rate-limiting helper for Edge Functions. Closes the gap
// documented in supabase/migrations/0027_rate_limiting.sql — every
// Edge Function that accepts a caller-identified request should call
// `checkRateLimit()` immediately after resolving the caller's identity and
// before doing any real work.
import { createServiceRoleClient } from './client.ts';

/**
 * Fixed-window rate limit check. Returns true if the request is allowed
 * (and records it), false if the limit is exceeded for the current window.
 *
 * @param actorId The authenticated caller's user id (never a client-
 *   supplied "who am I" value — always derived from `getCallerUserId()`).
 * @param bucket A short identifier for what's being limited, e.g.
 *   'verify-captcha'. Keeps each Edge Function's limit independent.
 * @param maxPerWindow Maximum allowed requests per window.
 * @param windowSeconds Window size in seconds.
 */
export async function checkRateLimit(
  actorId: string,
  bucket: string,
  maxPerWindow: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createServiceRoleClient();

  // Bucket requests into fixed windows (e.g. windowSeconds=60 buckets by
  // the minute) rather than a rolling window — simpler, and the
  // documented trade-off already called out in 0027's migration comment.
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();

  const { data: existing } = await admin
    .from('rate_limits')
    .select('count')
    .eq('actor_id', actorId)
    .eq('bucket', bucket)
    .eq('window_start', windowStart)
    .maybeSingle();

  if (existing && existing.count >= maxPerWindow) {
    return false;
  }

  if (existing) {
    await admin
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('actor_id', actorId)
      .eq('bucket', bucket)
      .eq('window_start', windowStart);
  } else {
    await admin.from('rate_limits').insert({ actor_id: actorId, bucket, window_start: windowStart, count: 1 });
  }

  return true;
}
