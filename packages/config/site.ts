/** Public marketing / legal constants — safe to import from web and mobile. */
export const SITE = {
  /** Canonical marketing URL (apex). */
  url: 'https://dentveerse.com',
  wwwUrl: 'https://www.dentveerse.com',
  contactEmail: 'dentveerse@gmail.com',
  /** In-app product name */
  productName: 'DentalConnect',
  /** Brand / domain name */
  brandName: 'DentVeerse',
  appScheme: 'dentalconnect',
  iosBundleId: 'ro.dentalconnect.app',
  androidPackage: 'ro.dentalconnect.app',
  themeColor: '#04231d',
  /** Icon-only mark paths (web `public/`). Wordmark logos are optional for marketing only. */
  webMarkSvg: '/dentveerse-mark.svg',
  webOgImage: '/png/og-image-1200x630.png',
} as const;

export const AUTH_PATHS = {
  callback: '/auth/callback',
  resetPassword: '/auth/reset-password',
} as const;

export function authCallbackUrl(siteUrl = SITE.url) {
  return `${siteUrl.replace(/\/$/, '')}${AUTH_PATHS.callback}`;
}

export function authResetPasswordUrl(siteUrl = SITE.url) {
  return `${siteUrl.replace(/\/$/, '')}${AUTH_PATHS.resetPassword}`;
}

/** Opens mobile app after email confirm (website redirect target). */
export const AUTH_APP_SIGN_IN_AFTER_CONFIRM = `${SITE.appScheme}://sign-in?confirmed=1`;
