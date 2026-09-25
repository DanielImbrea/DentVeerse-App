// push-dispatch
//
// Polls the push_queue outbox table and sends batched push notifications
// via the Expo Push API. Intended to run on a schedule (e.g. every 10s via
// a cron trigger — see docs/08-verification-notifications-reports.md Part B
// step 2-3). Deliberately decoupled from the DB triggers that insert
// notifications rows, so push-provider latency/failures never block the
// user-facing action that generated the notification.
//
// STATUS: written, NOT executed or load-tested. Requires:
//   1. Deploying with a cron trigger (`supabase functions deploy
//      push-dispatch --no-verify-jwt` + a pg_cron job calling it, or an
//      external scheduler hitting this URL every ~10s).
//   2. A real EXPO_PUBLIC_PROJECT_ID / Expo push credentials configured.
//   3. Real device push tokens registered via
//      packages/api/src/notifications.ts `registerDevice` from an actual
//      device — none of which can be exercised in this offline environment.
//
// The batching-into-a-single-push-for-high-frequency-events behavior
// described in docs/08 Part B ("Preferences & batching") is NOT implemented
// in this first version — this sends one push per queued notification. Add
// a time-window GROUP BY (user_id, type) with a coalesced push body as a
// follow-up enhancement; flagged here rather than silently omitted.

import { createServiceRoleClient, jsonResponse, errorResponse } from '../_shared/client.ts';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface QueuedNotification {
  id: string;
  notification_id: string;
  notifications: {
    id: string;
    user_id: string;
    type: string;
    body: string | null;
    target_type: string | null;
    target_id: string | null;
  };
}

Deno.serve(async (req: Request) => {
  try {
    // No end-user auth on this endpoint — it should be invoked only by a
    // trusted scheduler. If deploying with `--no-verify-jwt`, protect it
    // with a shared secret header check instead; left as a TODO for the
    // Cursor session since it depends on the chosen scheduler.
    if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

    const admin = createServiceRoleClient();

    const { data: queued, error: queueError } = await admin
      .from('push_queue')
      .select('id, notification_id, notifications(id, user_id, type, body, target_type, target_id)')
      .eq('processed', false)
      .limit(BATCH_SIZE);

    if (queueError) return errorResponse(queueError.message, 500);
    if (!queued || queued.length === 0) return jsonResponse({ processed: 0 });

    const userIds = [...new Set((queued as unknown as QueuedNotification[]).map((q) => q.notifications.user_id))];

    const { data: devices, error: devicesError } = await admin
      .from('devices')
      .select('user_id, push_token')
      .in('user_id', userIds);

    if (devicesError) return errorResponse(devicesError.message, 500);

    const tokensByUser = new Map<string, string[]>();
    for (const d of devices ?? []) {
      const list = tokensByUser.get(d.user_id) ?? [];
      list.push(d.push_token);
      tokensByUser.set(d.user_id, list);
    }

    const messages = (queued as unknown as QueuedNotification[]).flatMap((q) => {
      const tokens = tokensByUser.get(q.notifications.user_id) ?? [];
      return tokens.map((to) => ({
        to,
        title: notificationTitleFor(q.notifications.type),
        body: q.notifications.body ?? notificationTitleFor(q.notifications.type),
        data: { type: q.notifications.type, target_type: q.notifications.target_type, target_id: q.notifications.target_id },
      }));
    });

    if (messages.length > 0) {
      const expoResponse = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!expoResponse.ok) {
        return errorResponse(`Expo push API error: ${expoResponse.status}`, 502);
      }
    }

    const processedIds = (queued as unknown as QueuedNotification[]).map((q) => q.id);
    const { error: updateError } = await admin.from('push_queue').update({ processed: true }).in('id', processedIds);
    if (updateError) return errorResponse(updateError.message, 500);

    return jsonResponse({ processed: processedIds.length, messages_sent: messages.length });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Unknown error', 500);
  }
});

// Locale-aware push titles are a TODO — this needs the recipient's
// users.locale looked up and packages/i18n resources loaded server-side
// (Deno can import the same JSON files). Left as plain English placeholders
// pending that wiring, per docs/11-gdpr-i18n.md Part B ("notification/email
// templates: locale-aware... rendered at send-time").
function notificationTitleFor(type: string): string {
  const titles: Record<string, string> = {
    new_follower: 'New follower',
    new_like: 'New like',
    new_comment: 'New comment',
    new_message: 'New message',
    collaboration_request: 'New collaboration request',
    opportunity_response: 'Opportunity update',
    verification_approved: 'Verification approved',
    new_review: 'New review',
  };
  return titles[type] ?? 'New notification';
}
