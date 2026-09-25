import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, SkeletonRow } from '@dental/ui';
import { supabase } from '@mobile/lib/supabase';
import { PortfolioGalleryViewer, type GalleryMediaItem } from '@mobile/features/portfolio/PortfolioGalleryViewer';

/**
 * Portfolio item detail — previously referenced in docs/04-mobile.md's
 * navigation hierarchy ("portfolio-item/[id]") but never actually built.
 * Shows the case title/description/category, a thumbnail grid, and opens
 * the real fullscreen gallery viewer on tap.
 */
export default function PortfolioItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portfolio-item', id],
    queryFn: () =>
      supabase
        .from('portfolio_items')
        .select('*, portfolio_media(*), portfolio_categories(label_ro, label_en)')
        .eq('id', id as string)
        .single(),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-lg py-lg">
        <SkeletonRow height={200} />
      </View>
    );
  }

  if (isError || !data?.data) {
    return (
      <View className="flex-1 bg-background">
        <ErrorState message="Couldn't load this case." retryLabel="Try again" onRetry={() => refetch()} />
      </View>
    );
  }

  const item = data.data;
  const media: GalleryMediaItem[] = (item.portfolio_media ?? [])
    .slice()
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((m: any) => ({
      id: m.id,
      mediaType: m.media_type,
      url:
        m.media_type === 'video'
          ? m.video_playback_url ?? ''
          : supabase.storage.from('portfolio').getPublicUrl(m.storage_path).data.publicUrl,
      thumbnailUrl: m.thumbnail_url,
      beforeAfterRole: m.before_after_role,
      processingStatus: m.processing_status,
    }));

  return (
    <ScrollView className="flex-1 bg-background px-lg py-lg gap-md">
      <Text className="font-display text-heading2 text-text-primary">{item.title}</Text>
      {item.portfolio_categories ? (
        <Text className="font-body text-caption text-text-secondary">{(item.portfolio_categories as any).label_ro}</Text>
      ) : null}
      {item.description ? <Text className="font-body text-body text-text-primary mt-sm">{item.description}</Text> : null}

      <View className="flex-row flex-wrap gap-sm mt-md">
        {media.map((m, index) => (
          <Pressable key={m.id} onPress={() => setViewerIndex(index)}>
            {m.mediaType === 'video' ? (
              <View className="w-24 h-24 rounded-md bg-border items-center justify-center">
                {m.thumbnailUrl ? (
                  <Image source={{ uri: m.thumbnailUrl }} className="w-24 h-24 rounded-md absolute" />
                ) : null}
                <Text className="text-white text-lg">▶</Text>
              </View>
            ) : (
              <Image source={{ uri: m.url }} className="w-24 h-24 rounded-md bg-border" />
            )}
          </Pressable>
        ))}
      </View>

      <Modal visible={viewerIndex !== null} animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        {viewerIndex !== null ? (
          <PortfolioGalleryViewer media={media} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
        ) : null}
      </Modal>
    </ScrollView>
  );
}
