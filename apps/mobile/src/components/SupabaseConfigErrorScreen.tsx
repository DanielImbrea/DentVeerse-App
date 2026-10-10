import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

/** Shown when production build is missing Supabase env (avoids instant crash). */
export function SupabaseConfigErrorScreen() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '?';
  const build = Constants.nativeBuildVersion ?? '?';

  return (
    <View
      className="flex-1 bg-background px-xl justify-center"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text className="text-xl font-semibold text-text-primary text-center">Configurare incompletă</Text>
      <Text className="text-base text-text-secondary text-center mt-md leading-6">
        Aplicația nu găsește setările Supabase în acest build. Contactează echipa tehnică — variabilele
        EXPO_PUBLIC_SUPABASE_URL și EXPO_PUBLIC_SUPABASE_ANON_KEY trebuie setate pe EAS (production).
      </Text>
      <Text className="text-xs text-text-secondary text-center mt-lg">
        v{version} ({build})
      </Text>
    </View>
  );
}
