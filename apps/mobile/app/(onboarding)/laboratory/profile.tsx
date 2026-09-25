import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@dental/ui';
import { createLaboratory } from '@dental/api';
import { slugify } from '@dental/utils';
import { useRouter } from 'expo-router';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useAuthStore } from '@mobile/stores/authStore';
import { track } from '@dental/analytics';

export default function LaboratoryOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!userId) return;
    setLoading(true);
    setErrorMessage(null);

    const { error } = await createLaboratory(supabase, { name, city, slug: slugify(name) });

    setLoading(false);
    if (error) {
      setErrorMessage(
        error.message.includes('duplicate key')
          ? 'Există deja un laborator cu un nume similar — încearcă un nume mai specific.'
          : error.message
      );
      return;
    }

    setOnboarded(false);
    track({ name: 'profile_created', properties: { account_type: 'laboratory' } });
    router.replace('/(onboarding)/laboratory/services');
  }

  return (
    <View
      className="flex-1 bg-background px-xl gap-lg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View>
        <Text className="text-2xl font-semibold text-text-primary">Configurează laboratorul</Text>
        <Text className="text-sm text-text-secondary mt-2">
          Poți adăuga logo, servicii și portofoliu din Profil → Administrează laboratorul.
        </Text>
      </View>

      <View className="gap-sm">
        <AppTextInput
          value={name}
          onChangeText={setName}
          placeholder="Numele laboratorului"
          placeholderTextColor="#9CA3AF"
          className="bg-surface"
        />
        <AppTextInput
          value={city}
          onChangeText={setCity}
          placeholder="Oraș"
          placeholderTextColor="#9CA3AF"
          className="bg-surface"
        />
      </View>

      {errorMessage ? (
        <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
          <Text className="text-sm text-error text-center">{errorMessage}</Text>
        </View>
      ) : null}

      <Button label="Continuă" onPress={handleSubmit} loading={loading} disabled={!name || !city} />
    </View>
  );
}
