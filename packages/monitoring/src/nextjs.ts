import * as Sentry from '@sentry/nextjs';

/**
 * Error monitoring for apps/web and apps/admin. Same privacy posture as
 * mobile.ts — see that file's header comment for the full rationale.
 *
 * Next.js apps typically call `Sentry.init()` from three separate files
 * (sentry.client.config.ts, sentry.server.config.ts,
 * sentry.edge.config.ts) per the @sentry/nextjs convention — this function
 * is called from each of those (see the sentry.*.config.ts files this
 * session added to apps/admin and apps/web) so the DSN/environment/
 * privacy logic isn't triplicated.
 */
export function initNextjsMonitoring(appName: 'web' | 'admin') {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn(`[monitoring:${appName}] NEXT_PUBLIC_SENTRY_DSN not set — error monitoring disabled.`);
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
    initialScope: { tags: { app: appName } },
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, string>)['Authorization'];
        delete (event.request.headers as Record<string, string>)['authorization'];
        // The admin app's Server Actions run with a service-role client in
        // some code paths (lib/supabaseAdmin.ts) — ensure that key can
        // never leak into an error report even indirectly via a captured
        // request/env dump.
        delete (event.request.headers as Record<string, string>)['apikey'];
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
