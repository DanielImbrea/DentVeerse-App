import { Redirect } from 'expo-router';

/** Entry route — Expo Go opens `/`; auth routing continues in app/_layout.tsx. */
export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}
