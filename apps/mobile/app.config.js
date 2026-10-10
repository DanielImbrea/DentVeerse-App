/** @type {import('expo/config').ExpoConfig} */
// Plain JS so global `eas` CLI can read config (TS file breaks some eas-cli versions).
const isProduction = process.env.APP_ENV === 'production';

/** Empty/undefined key + react-native-maps plugin can crash iOS at launch (GMSServices). */
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() ?? '';

const plugins = [
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
];

if (googleMapsApiKey) {
  plugins.push([
    'react-native-maps',
    {
      iosGoogleMapsApiKey: googleMapsApiKey,
      androidGoogleMapsApiKey: googleMapsApiKey,
    },
  ]);
} else {
  plugins.push('react-native-maps');
}

const config = {
  owner: 'eccedentesiast',
  name: 'DentVeerse',
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
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: isProduction
        ? { NSAllowsLocalNetworking: true }
        : {
            NSAllowsArbitraryLoads: true,
            NSAllowsLocalNetworking: true,
          },
      NSLocationWhenInUseUsageDescription:
        'DentVeerse uses your location to show nearby clinics and laboratories on the map.',
      NSPhotoLibraryUsageDescription:
        'DentVeerse needs access to your photo library to upload logos, cover images, and portfolio photos.',
      NSCameraUsageDescription:
        'DentVeerse needs camera access to take photos for your profile and portfolio.',
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
  },
  plugins,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
    eas: {
      projectId:
        process.env.EXPO_PUBLIC_PROJECT_ID ?? '2e28108b-d0fa-461c-ba41-ae369d36b218',
    },
  },
};

module.exports = config;
