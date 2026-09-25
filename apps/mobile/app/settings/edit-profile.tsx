import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useRequireAccountType } from '@mobile/hooks/useRequireAccountType';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export default function EditPatientProfileScreen() {
  useRequireAccountType('patient', { redirectTo: '/(tabs)/profile' });
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-patient-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('patient_profiles').select('*').eq('user_id', userId as string).single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setCity(profile.city ?? '');
    }
  }, [profile]);

  async function handleSave() {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase
      .from('patient_profiles')
      .upsert({ user_id: userId, first_name: firstName, last_name: lastName, city });
    setLoading(false);
    if (error) {
      Alert.alert('Eroare', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['my-patient-profile', userId] });
    Alert.alert('Salvat', 'Profilul a fost actualizat.');
  }

  if (isLoading) {
    return (
      <ScreenShell showBack title="Editează profilul">
        <Text className="text-sm text-text-secondary">Se încarcă…</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll showBack title="Editează profilul" subtitle="Informațiile tale de pacient">
      <View className="bg-surface border border-border rounded-2xl p-xl gap-md">
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-text-primary">Prenume</Text>
          <AppTextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Prenume"
            placeholderTextColor="#9CA3AF"
            className="bg-background"
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-text-primary">Nume</Text>
          <AppTextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nume"
            placeholderTextColor="#9CA3AF"
            className="bg-background"
          />
        </View>
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-text-primary">Oraș</Text>
          <AppTextInput
            value={city}
            onChangeText={setCity}
            placeholder="Oraș"
            placeholderTextColor="#9CA3AF"
            className="bg-background"
          />
        </View>
        <Button label="Salvează" onPress={handleSave} loading={loading} disabled={!firstName || !lastName || !city} />
      </View>
    </ScreenShell>
  );
}
