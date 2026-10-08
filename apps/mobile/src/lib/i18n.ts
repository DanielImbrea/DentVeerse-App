import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, defaultNS, DEFAULT_LOCALE } from '@dental/i18n';

// MVP: Romanian first; device locale / English picker can come later.
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ['ro', 'en'],
  nonExplicitSupportedLngs: true,
  defaultNS,
  compatibilityJSON: 'v3',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
