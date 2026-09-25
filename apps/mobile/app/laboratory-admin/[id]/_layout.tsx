import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useRequireOrgAdmin } from '@mobile/hooks/useRequireOrgAdmin';

export default function LaboratoryAdminLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { verified, checking } = useRequireOrgAdmin('laboratory', id);

  if (checking) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#0F6B66" />
      </View>
    );
  }

  if (!verified) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
