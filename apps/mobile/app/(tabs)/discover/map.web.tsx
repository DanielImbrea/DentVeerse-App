import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Discover map is native-only; web dev uses list search instead. */
export default function MapScreenWeb() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="px-lg pt-md flex-row items-center gap-sm">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#0F6B66" />
        </Pressable>
        <Text className="font-body text-h3 text-text-primary">Hartă</Text>
      </View>
      <View className="flex-1 px-lg justify-center">
        <Text className="font-body text-body text-text-primary font-medium text-center">
          Harta interactivă funcționează în aplicația mobilă (iOS/Android).
        </Text>
        <Text className="font-body text-caption text-text-secondary text-center mt-sm">
          Pe web folosește lista din Descoperă sau deschide proiectul în Expo Go pe telefon.
        </Text>
        <Pressable onPress={() => router.replace('/discover')} className="mt-lg self-center bg-primary rounded-full px-lg py-3">
          <Text className="text-white font-medium">Înapoi la Descoperă</Text>
        </Pressable>
      </View>
    </View>
  );
}
