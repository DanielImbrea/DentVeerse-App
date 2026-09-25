// Supported locales. Romanian is the default per client spec §27.
// To add a language: add its code here, add packages/i18n/<code>/*.json resource
// files (professionally translated, not machine-translated), and add label_<code>
// columns to catalog tables per docs/11-gdpr-i18n.md Part B step 3.
export const SUPPORTED_LOCALES = ['ro', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'ro';
