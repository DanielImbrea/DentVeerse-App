import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { addLaboratoryService, listServiceCatalog } from '@dental/api';
import { Button } from '@dental/ui';
import { useRouter } from 'expo-router';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useAuthStore } from '@mobile/stores/authStore';
import { track } from '@dental/analytics';

export default function LaboratoryOnboardingServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [priceFrom, setPriceFrom] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: labData } = useQuery({
    queryKey: ['onboarding-lab', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laboratories')
        .select('id, name')
        .eq('owner_user_id', userId as string)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: catalogData } = useQuery({
    queryKey: ['service-catalog', 'laboratory'],
    queryFn: () => listServiceCatalog(supabase, 'laboratory'),
  });

  const catalog = catalogData?.data ?? [];

  async function handleContinue() {
    if (!labData?.id || !selectedServiceId) {
      Alert.alert('Serviciu necesar', 'Adaugă cel puțin un serviciu pentru a continua.');
      return;
    }

    setLoading(true);
    const { error } = await addLaboratoryService(supabase, {
      laboratory_id: labData.id,
      service_id: selectedServiceId,
      price_from: priceFrom ? Number(priceFrom) : null,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Eroare', error.message);
      return;
    }

    setOnboarded(true);
    track({ name: 'onboarding_completed', properties: { account_type: 'laboratory' } });
    router.replace('/(tabs)/home');
  }

  return (
    <View
      className="flex-1 bg-background px-xl gap-lg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View>
        <Text className="text-2xl font-semibold text-text-primary">Adaugă primul serviciu</Text>
        <Text className="text-sm text-text-secondary mt-2">
          Descrie tipurile de lucrări pe care le realizezi. Poți adăuga mai multe din admin.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-sm">
        {catalog.map((svc) => (
          <Pressable
            key={svc.id}
            onPress={() => setSelectedServiceId(svc.id)}
            className={`border rounded-full px-md py-2 ${
              selectedServiceId === svc.id ? 'border-primary bg-primary/10' : 'border-border bg-surface'
            }`}
          >
            <Text className={`text-sm ${selectedServiceId === svc.id ? 'text-primary font-semibold' : 'text-text-primary'}`}>
              {svc.label_ro}
            </Text>
          </Pressable>
        ))}
      </View>

      <AppTextInput
        value={priceFrom}
        onChangeText={setPriceFrom}
        placeholder="Preț de la (RON, opțional)"
        placeholderTextColor="#9CA3AF"
        keyboardType="numeric"
        className="bg-surface"
      />

      <Button label="Continuă în aplicație" onPress={handleContinue} loading={loading} disabled={!selectedServiceId} />
    </View>
  );
}
