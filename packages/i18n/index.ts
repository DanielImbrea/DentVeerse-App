import roCommon from './ro/common.json';
import roNavigation from './ro/navigation.json';
import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';

export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './locales';
export type { SupportedLocale } from './locales';

// Namespace-based resource bundles, consumed by both react-i18next (mobile) and
// next-intl/next-i18next (web/admin) — see docs/11-gdpr-i18n.md Part B.
// As more feature modules land, add a namespace file per feature
// (feed.json, messaging.json, opportunities.json, ...) rather than growing
// common.json indefinitely.
export const resources = {
  ro: { common: roCommon, navigation: roNavigation },
  en: { common: enCommon, navigation: enNavigation },
} as const;

export const defaultNS = 'common' as const;
