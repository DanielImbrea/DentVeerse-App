import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { createOpportunity } from '@dental/api';
import { track } from '@dental/analytics';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useRequireAccountType } from '@mobile/hooks/useRequireAccountType';
import { useMyOrg } from '@mobile/hooks/useMyOrg';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export default function CreateOpportunityModal() {
  const router = useRouter();
  const accountType = useAuthStore((s) => s.accountType);
  const { isAllowed, isChecking } = useRequireAccountType(['clinic', 'laboratory']);
  const { data: myOrg } = useMyOrg();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!myOrg || !accountType || (accountType !== 'clinic' && accountType !== 'laboratory')) return;
    setLoading(true);

    const { error } = await createOpportunity(supabase, {
      author_type: accountType,
      author_id: myOrg.orgId,
      title,
      description,
      city: city || null,
    });

    setLoading(false);

    if (error) {
      Alert.alert(
        'Eroare',
        error.message.includes('maximum of')
          ? 'Ai atins limita de 5 oportunități active.'
          : error.message
      );
      return;
    }

    track({ name: 'opportunity_created', properties: { author_type: accountType } });
    router.back();
  }

  if (isChecking) {
    return (
      <ScreenShell showBack title="Oportunitate nouă">
        <View className="items-center py-xl">
          <ActivityIndicator size="large" color="#0F6B66" />
        </View>
      </ScreenShell>
    );
  }

  if (!isAllowed) return null;

  return (
    <ScreenShell scroll showBack title="Publică o oportunitate" subtitle="Colaborări B2B cu alte clinici sau laboratoare" keyboardShouldPersistTaps="handled">
      <View className="bg-surface border border-border rounded-2xl p-md gap-md">
        <AppTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titlu, ex. „Caut laborator All-on-X”"
          placeholderTextColor="#9CA3AF"
          className="border border-border rounded-xl px-md text-base bg-background text-text-primary"
        />
        <AppTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Descriere detaliată"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          numberOfLines={4}
          className="border border-border rounded-xl px-md text-base bg-background text-text-primary min-h-[120px]"
        />
        <AppTextInput
          value={city}
          onChangeText={setCity}
          placeholder="Oraș (opțional)"
          placeholderTextColor="#9CA3AF"
          className="border border-border rounded-xl px-md text-base bg-background text-text-primary"
        />
      </View>

      <Button label="Publică" onPress={handleSubmit} loading={loading} disabled={!title || !description || !myOrg} />
    </ScreenShell>
  );
}
