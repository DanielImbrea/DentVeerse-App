import type { ExpoConfig } from 'expo/config';

// NOTE (see docs/01-architecture.md §1): once IAP/payments work begins
// (Monetization Phase M1 — deferred per docs/16 §5/§8), this app can no
// longer be run via Expo Go; a dev client / EAS build is required because
// react-native-iap needs native modules. Not relevant yet for MVP phases.

const isProduction = process.env.APP_ENV === 'production';

const config: ExpoConfig = {
  name: 'DentalConnect',
  slug: 'dentalconnect',
  scheme: 'dentalconnect',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './src/assets/icon.png',
  splash: {
    image: './src/assets/brand/dentveerse-mark.png',
    resizeMode: 'contain',
    backgroundColor: '#FAF9F7',
  },
  ios: {
    bundleIdentifier: 'ro.dentalconnect.app',
    supportsTablet: false,
    associatedDomains: ['applinks:dentveerse.com', 'applinks:www.dentveerse.com'],
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
    infoPlist: {
      NSAppTransportSecurity: isProduction
        ? { NSAllowsLocalNetworking: true }
        : {
            NSAllowsArbitraryLoads: true,
            NSAllowsLocalNetworking: true,
          },
      // Required by expo-location (used in app/(tabs)/discover/map.tsx) —
      // missing this causes a runtime crash on the location permission
      // request on iOS. Found during this session's audit.
      NSLocationWhenInUseUsageDescription:
        'DentalConnect uses your location to show nearby clinics and laboratories on the map.',
      NSPhotoLibraryUsageDescription:
        'DentalConnect needs access to your photo library to upload logos, cover images, and portfolio photos.',
      NSCameraUsageDescription: 'DentalConnect needs camera access to take photos for your profile and portfolio.',
    },
  },
  android: {
    package: 'ro.dentalconnect.app',
    usesCleartextTraffic: !isProduction,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'dentveerse.com', pathPrefix: '/auth' },
          { scheme: 'https', host: 'www.dentveerse.com', pathPrefix: '/auth' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-localization',
    'expo-video',
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-status-bar',
    [
      'expo-notifications',
      {
        icon: './src/assets/notification-icon.png',
        color: '#0F6B66',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    eas: {
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    },
  },
};

export default config;
