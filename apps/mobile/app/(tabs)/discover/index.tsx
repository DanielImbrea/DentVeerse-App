import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { globalSearch } from '@dental/api';
import { track } from '@dental/analytics';
import { Badge, EmptyState, ErrorState, SkeletonRow } from '@dental/ui';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';
import { usePermissions } from '@mobile/features/auth/usePermissions';

interface SearchFilters {
  city: string | null;
  specializationId: string | null;
  verifiedOnly: boolean;
  openForCollaborationOnly: boolean;
}

const EMPTY_FILTERS: SearchFilters = { city: null, specializationId: null, verifiedOnly: false, openForCollaborationOnly: false };

export default function DiscoverScreen() {
  const { canCreateOpportunity } = usePermissions();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () =>
      globalSearch(supabase, debouncedQuery, {
        city: filters.city,
        verifiedOnly: filters.verifiedOnly,
        openForCollaborationOnly: filters.openForCollaborationOnly,
      }),
    enabled: debouncedQuery.trim().length >= 2,
  });

  useEffect(() => {
    if (data?.data) {
      track({ name: 'search_performed', properties: { query_length: debouncedQuery.length, result_count: data.data.length } });
    }
  }, [data, debouncedQuery.length]);

  const results = data?.data ?? [];
  const activeFilterCount = [filters.city, filters.verifiedOnly, filters.openForCollaborationOnly].filter(Boolean).length;

  return (
    <ScreenShell title="Descoperă" subtitle="Clinici, laboratoare, stomatologi și orașe">
      <View className="flex-row gap-sm">
        <View className="flex-1 flex-row items-center border border-border rounded-xl px-md bg-surface">
          <Ionicons name="search-outline" size={18} color="#6B6F76" />
          <AppTextInput
            value={query}
            onChangeText={setQuery}
            placeholder='ex. „Implantologie Iași"'
            placeholderTextColor="#9CA3AF"
            className="flex-1 border-0 bg-transparent pl-sm"
          />
        </View>
        <Pressable
          onPress={() => setShowFilters(true)}
          className={`rounded-xl px-md items-center justify-center border ${activeFilterCount > 0 ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
        >
          <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? '#0F6B66' : '#6B6F76'} />
        </Pressable>
      </View>

      <Link href="/(tabs)/discover/map" asChild>
        <Pressable className="flex-row items-center justify-center gap-sm border border-primary/30 bg-primary/5 rounded-xl active:opacity-80">
          <Ionicons name="map-outline" size={18} color="#0F6B66" />
          <Text className="font-body text-body font-medium text-primary">Vezi pe hartă</Text>
        </Pressable>
      </Link>

      {debouncedQuery.trim().length < 2 ? (
        <View className="bg-surface border border-border rounded-2xl p-xl mt-sm">
          <EmptyState
            title="Caută în DentVeerse"
            message="Introdu minim 2 caractere: clinică, laborator, oraș sau specializare."
          />
        </View>
      ) : isLoading ? (
        <View className="gap-sm mt-sm">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} height={72} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState message="Căutarea a eșuat." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.result_type}-${item.id}`}
          scrollEnabled={false}
          ListEmptyComponent={
            <View className="bg-surface border border-border rounded-2xl p-xl">
              <EmptyState title="Niciun rezultat" message="Încearcă alt oraș, alt termen sau mai puține filtre." />
            </View>
          }
          renderItem={({ item }) => (
            <Link
              href={
                item.result_type === 'clinic'
                  ? `/clinic/${item.id}`
                  : item.result_type === 'laboratory'
                    ? `/laboratory/${item.id}`
                    : `/dentist/${item.id}`
              }
              asChild
            >
              <Pressable className="bg-surface border border-border rounded-xl p-md mb-sm flex-row items-center justify-between active:opacity-80">
                <View className="flex-1 pr-md">
                  <Text className="font-body text-body font-medium text-text-primary">{item.name}</Text>
                  <Text className="font-body text-caption text-text-secondary mt-0.5">
                    {item.result_type === 'clinic' ? 'Clinică' : item.result_type === 'laboratory' ? 'Laborator' : 'Stomatolog'}
                    {item.city ? ` · ${item.city}` : ''}
                  </Text>
                </View>
                {item.is_verified ? <Badge label="Verificat" variant="verified" /> : null}
              </Pressable>
            </Link>
          )}
        />
      )}

      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable className="flex-1 bg-black/40" onPress={() => setShowFilters(false)}>
          <Pressable className="mt-auto bg-surface rounded-t-3xl p-xl gap-md" onPress={(e) => e.stopPropagation()}>
            <Text className="text-xl font-semibold text-text-primary">Filtre</Text>

            <View className="gap-xs">
              <Text className="text-sm font-medium text-text-primary">Oraș</Text>
              <AppTextInput
                value={filters.city ?? ''}
                onChangeText={(v) => setFilters((prev) => ({ ...prev, city: v || null }))}
                placeholder="ex. București"
                placeholderTextColor="#9CA3AF"
                className="border border-border rounded-xl px-md py-3 bg-background font-body text-body"
              />
            </View>

            <Pressable
              onPress={() => setFilters((prev) => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
              className="flex-row items-center justify-between"
            >
              <Text className="font-body text-body text-text-primary">Doar verificate</Text>
              <Badge label={filters.verifiedOnly ? 'Da' : 'Nu'} variant={filters.verifiedOnly ? 'verified' : 'neutral'} />
            </Pressable>

            {canCreateOpportunity ? (
              <Pressable
                onPress={() => setFilters((prev) => ({ ...prev, openForCollaborationOnly: !prev.openForCollaborationOnly }))}
                className="flex-row items-center justify-between"
              >
                <Text className="font-body text-body text-text-primary">Deschise pentru colaborare</Text>
                <Badge
                  label={filters.openForCollaborationOnly ? 'Da' : 'Nu'}
                  variant={filters.openForCollaborationOnly ? 'openForCollaboration' : 'neutral'}
                />
              </Pressable>
            ) : null}

            <View className="flex-row gap-sm pt-md">
              <Pressable onPress={() => setFilters(EMPTY_FILTERS)} className="flex-1 border border-border rounded-xl items-center">
                <Text className="font-body text-body text-text-secondary">Resetează</Text>
              </Pressable>
              <Pressable onPress={() => setShowFilters(false)} className="flex-1 bg-primary rounded-xl items-center">
                <Text className="font-body text-body text-white font-medium">Aplică</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}
