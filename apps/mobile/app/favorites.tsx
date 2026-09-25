import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listMyFavorites } from '@dental/api';
import { EmptyState, ErrorState, SkeletonRow } from '@dental/ui';
import { Link } from 'expo-router';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

type EnrichedFavorite = {
  id: string;
  target_type: string;
  target_id: string;
  title: string;
  subtitle: string;
  href: string;
};

async function enrichFavorites(): Promise<EnrichedFavorite[]> {
  const { data, error } = await listMyFavorites(supabase);
  if (error || !data) throw error ?? new Error('Failed to load favorites');

  const enriched = await Promise.all(
    data.map(async (item) => {
      if (item.target_type === 'clinic') {
        const { data: row } = await supabase.from('clinics').select('name, city').eq('id', item.target_id).maybeSingle();
        return {
          id: item.id,
          target_type: item.target_type,
          target_id: item.target_id,
          title: row?.name ?? 'Clinică',
          subtitle: row?.city ?? 'Clinică salvată',
          href: `/clinic/${item.target_id}`,
        };
      }
      if (item.target_type === 'laboratory') {
        const { data: row } = await supabase.from('laboratories').select('name, city').eq('id', item.target_id).maybeSingle();
        return {
          id: item.id,
          target_type: item.target_type,
          target_id: item.target_id,
          title: row?.name ?? 'Laborator',
          subtitle: row?.city ?? 'Laborator salvat',
          href: `/laboratory/${item.target_id}`,
        };
      }
      if (item.target_type === 'post') {
        const { data: row } = await supabase.from('posts').select('content, post_type').eq('id', item.target_id).maybeSingle();
        return {
          id: item.id,
          target_type: item.target_type,
          target_id: item.target_id,
          title: row?.content?.slice(0, 60) ?? 'Postare',
          subtitle: row?.post_type ?? 'Postare salvată',
          href: `/post/${item.target_id}`,
        };
      }
      return {
        id: item.id,
        target_type: item.target_type,
        target_id: item.target_id,
        title: item.target_type,
        subtitle: item.target_id,
        href: '/favorites',
      };
    })
  );

  return enriched;
}

export default function FavoritesScreen() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['favorites-enriched'],
    queryFn: enrichFavorites,
  });

  if (isLoading) {
    return (
      <ScreenShell showBack title="Favoritele mele">
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={48} />
        ))}
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell showBack title="Favoritele mele">
        <ErrorState message="Nu am putut încărca favoritele." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const favorites = data ?? [];

  return (
    <ScreenShell showBack title="Favoritele mele" subtitle="Clinici, laboratoare și postări salvate">
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View className="bg-surface border border-border rounded-2xl p-xl">
            <EmptyState title="Nicio favorită încă" message="Salvează profiluri din Descoperă sau postări din feed." />
          </View>
        }
        renderItem={({ item }) => (
          <Link href={item.href as never} asChild>
            <Pressable className="bg-surface border border-border rounded-xl px-md py-md mb-sm active:opacity-90">
              <Text className="text-base font-medium text-text-primary">{item.title}</Text>
              <Text className="text-sm text-text-secondary mt-0.5">{item.subtitle}</Text>
            </Pressable>
          </Link>
        )}
      />
    </ScreenShell>
  );
}
