type SentryModule = typeof import('@sentry/react-native');

let sentry: SentryModule | null | false = null;

function getSentry(): SentryModule | null {
  if (sentry === false) return null;
  if (sentry) return sentry;

  try {
    // Lazy require — top-level import can crash Expo Go before DSN is checked.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native') as SentryModule;
    return sentry;
  } catch (err) {
    console.warn('[monitoring] Sentry native module unavailable — monitoring disabled.', err);
    sentry = false;
    return null;
  }
}

/**
 * Error monitoring for apps/mobile. Without EXPO_PUBLIC_SENTRY_DSN, no-ops.
 */
export function initMobileMonitoring() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('[monitoring] EXPO_PUBLIC_SENTRY_DSN not set — error monitoring disabled.');
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) return;

  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['authorization'];
      }
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

export function getMobileSentry(): SentryModule | null {
  return getSentry();
}
