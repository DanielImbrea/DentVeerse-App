import { Stack } from 'expo-router';

/** Stack for settings sub-pages — tab bar hidden; each screen has its own back button. */
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
