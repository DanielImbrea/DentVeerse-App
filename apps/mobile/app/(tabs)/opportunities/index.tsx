import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listOpenOpportunities } from '@dental/api';
import { EmptyState, ErrorState, SkeletonRow, Badge } from '@dental/ui';
import { Link } from 'expo-router';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { usePermissions } from '@mobile/features/auth/usePermissions';
import { useAuthStore } from '@mobile/stores/authStore';
import { supabase } from '@mobile/lib/supabase';

export default function OpportunitiesScreen() {
  const { canCreateOpportunity } = usePermissions();
  const accountType = useAuthStore((s) => s.accountType);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunities', 'open'],
    queryFn: () => listOpenOpportunities(supabase),
  });

  const opportunities = data?.data ?? [];

  const subtitle =
    accountType === 'patient'
      ? 'Colaborări B2B între clinici și laboratoare — poți doar vizualiza.'
      : 'Publică cereri de colaborare sau răspunde la oportunități deschise.';

  const emptyMessage =
    accountType === 'patient'
      ? 'Clinicile și laboratoarele publică aici cereri de colaborare profesională.'
      : 'Fii primul care publică o oportunitate sau revino mai târziu.';

  return (
    <ScreenShell scroll title="Oportunități" subtitle={subtitle}>
      {canCreateOpportunity ? (
        <Link href="/modals/create-opportunity" asChild>
          <Pressable className="bg-primary rounded-xl py-3.5 items-center active:opacity-90">
            <Text className="text-base font-medium text-white">Publică o oportunitate</Text>
          </Pressable>
        </Link>
      ) : (
        <View className="bg-primary/5 border border-primary/20 rounded-2xl p-md">
          <Text className="text-sm text-text-secondary">
            Ca pacient poți explora oportunitățile, dar nu poți publica sau răspunde — acestea sunt pentru clinici și laboratoare.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View className="gap-sm mt-sm">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} height={90} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="Nu am putut încărca oportunitățile." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            <View className="bg-surface border border-border rounded-2xl p-xl mt-sm">
              <EmptyState title="Nicio oportunitate deschisă" message={emptyMessage} />
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/opportunity/${item.id}`} asChild>
              <Pressable className="bg-surface border border-border rounded-xl p-lg gap-xs mb-sm active:opacity-90">
                <Text className="text-base font-semibold text-text-primary">{item.title}</Text>
                <Text className="text-sm text-text-secondary" numberOfLines={2}>
                  {item.description}
                </Text>
                <View className="flex-row flex-wrap gap-xs mt-1">
                  {item.city ? <Badge label={item.city} variant="neutral" /> : null}
                  <Badge
                    label={item.author_type === 'clinic' ? 'Clinică' : 'Laborator'}
                    variant={item.author_type === 'clinic' ? 'verified' : 'neutral'}
                  />
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </ScreenShell>
  );
}
