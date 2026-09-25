import type { AnalyticsEvent } from './events';

/**
 * Mobile analytics. Previously entirely unimplemented (see
 * docs/17-implementation-status.md §22, now closed out).
 *
 * PostHog is loaded lazily so Expo Go can run without a native PostHog module
 * when EXPO_PUBLIC_POSTHOG_API_KEY is unset (local dev).
 */

type PostHogClient = {
  setup: (apiKey: string, options: Record<string, unknown>) => void;
  identify: (userId: string, properties: Record<string, unknown>) => void;
  reset: () => void;
  capture: (name: string, properties?: Record<string, unknown>) => void;
};

let analyticsEnabled = false;
let initialized = false;
let posthog: PostHogClient | null | false = null;

function getPostHog(): PostHogClient | null {
  if (posthog === false) return null;
  if (posthog) return posthog;

  try {
    // Lazy require — top-level import crashes Expo Go (PlatformConstants).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    posthog = require('posthog-react-native').default as PostHogClient;
    return posthog;
  } catch (err) {
    console.warn('[analytics] PostHog unavailable — analytics disabled.', err);
    posthog = false;
    return null;
  }
}

export function initAnalytics() {
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('[analytics] EXPO_PUBLIC_POSTHOG_API_KEY not set — analytics disabled.');
    return;
  }

  const client = getPostHog();
  if (!client) return;

  client.setup(apiKey, {
    host,
    captureApplicationLifecycleEvents: false,
    captureDeepLinks: false,
  });
  initialized = true;
}

/** Must be called before any tracking occurs — defaults to disabled. */
export function setAnalyticsEnabled(enabled: boolean) {
  analyticsEnabled = enabled;
}

export function identifyUser(userId: string, accountType: 'patient' | 'clinic' | 'laboratory') {
  if (!initialized || !analyticsEnabled) return;
  getPostHog()?.identify(userId, { account_type: accountType });
}

export function resetAnalyticsIdentity() {
  if (!initialized) return;
  getPostHog()?.reset();
}

export function track(event: AnalyticsEvent) {
  if (!initialized || !analyticsEnabled) return;
  getPostHog()?.capture(event.name, event.properties);
}
