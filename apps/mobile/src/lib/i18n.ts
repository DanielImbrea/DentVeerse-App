import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources, defaultNS, DEFAULT_LOCALE } from '@dental/i18n';

// MVP: Romanian first; device locale / English picker can come later.
const initialLocale = DEFAULT_LOCALE;

// eslint-disable-next-line @typescript-eslint/no-floating-promises
i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: DEFAULT_LOCALE,
  defaultNS,
  compatibilityJSON: 'v3',
  interpolation: { escapeValue: false },
});

export default i18n;
