import React from 'react';
import { ScrollView, Text, View, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, SkeletonRow } from '@dental/ui';
import { supabase } from '@mobile/lib/supabase';

export default function DentistProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dentist', id],
    queryFn: () =>
      supabase
        .from('dentists')
        .select('*, specializations(label_ro, label_en), clinics(name, city, id)')
        .eq('id', id as string)
        .single(),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <ScrollView className="flex-1 bg-background px-lg py-lg">
        <SkeletonRow height={200} />
      </ScrollView>
    );
  }

  if (isError || !data?.data) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this profile." retryLabel="Try again" onRetry={() => refetch()} />
      </View>
    );
  }

  const dentist = data.data as any;

  return (
    <ScrollView className="flex-1 bg-background px-lg py-lg gap-md">
      <View className="flex-row items-center gap-md">
        {dentist.photo_url ? (
          <Image source={{ uri: dentist.photo_url }} className="w-20 h-20 rounded-full" />
        ) : (
          <View className="w-20 h-20 rounded-full bg-border" />
        )}
        <View>
          <Text className="font-display text-heading2 text-text-primary">{dentist.full_name}</Text>
          <Text className="font-body text-body text-text-secondary">{dentist.specializations?.label_ro}</Text>
          <Text className="font-body text-caption text-text-secondary">{dentist.clinics?.name}</Text>
        </View>
      </View>
      {dentist.description ? <Text className="font-body text-body text-text-primary">{dentist.description}</Text> : null}
      {dentist.years_experience ? (
        <Text className="font-body text-caption text-text-secondary">{dentist.years_experience} years experience</Text>
      ) : null}
    </ScrollView>
  );
}
