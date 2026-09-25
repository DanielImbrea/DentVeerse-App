import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { resources, defaultNS, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@dental/i18n';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
const initialLocale = (SUPPORTED_LOCALES as readonly string[]).includes(deviceLocale)
  ? deviceLocale
  : DEFAULT_LOCALE;

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
