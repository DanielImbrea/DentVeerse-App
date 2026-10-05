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
  /** Apple Developer Team ID (Plesca Dmitrie org) — public in AASA. */
  appleTeamId: 'TR36PR6252',
  androidPackage: 'ro.dentalconnect.app',
  themeColor: '#04231d',
  /** Icon-only mark paths (web `public/`). Wordmark logos are optional for marketing only. */
  webMarkSvg: '/dentveerse-mark.svg',
  webOgImage: '/png/og-image-1200x630.png',
  /** App Store / Play — null until links exist; homepage shows „în curând”. */
  storeUrls: {
    ios: null as string | null,
    android: null as string | null,
  },
  legalPaths: {
    privacy: '/privacy',
    terms: '/terms',
    cookies: '/cookie-policy',
    /** Aliases used on dentveerse.com marketing deploy */
    privacyRo: '/confidentialitate',
    termsRo: '/termeni',
  },
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
