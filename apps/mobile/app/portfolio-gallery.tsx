import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { listOwnerPortfolio } from '@dental/api';
import { ErrorState, SkeletonRow } from '@dental/ui';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

export default function PortfolioGalleryScreen() {
  const router = useRouter();
  const { ownerType, ownerId, title } = useLocalSearchParams<{
    ownerType: 'clinic' | 'laboratory';
    ownerId: string;
    title?: string;
  }>();

  const type = ownerType === 'laboratory' ? 'laboratory' : 'clinic';

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-portfolio-gallery', type, ownerId],
    queryFn: () => listOwnerPortfolio(supabase, type, ownerId as string),
    enabled: !!ownerId,
  });

  const items = data?.data ?? [];

  if (isLoading) {
    return (
      <ScreenShell showBack title="Portofoliu">
        <SkeletonRow height={120} />
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell showBack title="Portofoliu">
        <ErrorState message="Nu am putut încărca galeria." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll showBack title={title ?? 'Portofoliu'} subtitle="Lucrări publicate">
      <Text className="text-sm text-text-secondary mb-sm">
        Atinge un caz pentru poze și detalii. Pentru like-uri și comentarii, folosește postările din feed.
      </Text>
      {items.length === 0 ? (
        <Text className="text-sm text-text-secondary">Nicio lucrare publicată încă.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-sm w-full">
          {items.map((p) => {
            const m = p.portfolio_media?.[0];
            const uri =
              m?.media_type === 'video'
                ? m.thumbnail_url ?? undefined
                : m
                  ? supabase.storage.from('portfolio').getPublicUrl(m.storage_path).data.publicUrl
                  : undefined;
            return (
              <Pressable
                key={p.id}
                onPress={() => router.push(`/portfolio-item/${p.id}`)}
                className="w-[47%] active:opacity-90"
              >
                <View className="rounded-2xl overflow-hidden border border-border bg-background">
                  {uri ? (
                    <Image source={{ uri }} className="w-full aspect-square bg-border" />
                  ) : (
                    <View className="w-full aspect-square bg-border items-center justify-center">
                      <Ionicons name="images-outline" size={32} color="#9CA3AF" />
                    </View>
                  )}
                  <View className="p-md gap-0.5">
                    <Text className="text-sm font-semibold text-text-primary" numberOfLines={2}>
                      {p.title ?? 'Lucrare'}
                    </Text>
                    {(p.portfolio_categories as { label_ro?: string } | null)?.label_ro ? (
                      <Text className="text-xs text-text-secondary" numberOfLines={1}>
                        {(p.portfolio_categories as { label_ro?: string }).label_ro}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScreenShell>
  );
}
