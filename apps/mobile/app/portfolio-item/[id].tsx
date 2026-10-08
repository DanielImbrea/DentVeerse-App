import React, { useState } from 'react';
import { Modal, Pressable, Text, View, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';
import { PortfolioGalleryViewer, type GalleryMediaItem } from '@mobile/features/portfolio/PortfolioGalleryViewer';

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
      <ScreenShell showBack title="Lucrare">
        <SkeletonRow height={200} />
      </ScreenShell>
    );
  }

  if (isError || !data?.data) {
    return (
      <ScreenShell showBack title="Lucrare">
        <ErrorState message="Nu am putut încărca lucrarea." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const item = data.data;
  const categoryLabel = (item.portfolio_categories as { label_ro?: string } | null)?.label_ro;
  const media: GalleryMediaItem[] = (item.portfolio_media ?? [])
    .slice()
    .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
    .map((m: {
      id: string;
      media_type: string;
      storage_path: string;
      video_playback_url?: string | null;
      thumbnail_url?: string | null;
      before_after_role: 'before' | 'after' | 'single';
      processing_status?: 'pending' | 'processing' | 'ready' | 'failed';
    }) => ({
      id: m.id,
      mediaType: m.media_type === 'video' ? 'video' : 'image',
      url:
        m.media_type === 'video'
          ? m.video_playback_url ?? ''
          : supabase.storage.from('portfolio').getPublicUrl(m.storage_path).data.publicUrl,
      thumbnailUrl: m.thumbnail_url,
      beforeAfterRole: m.before_after_role,
      processingStatus: m.processing_status,
    }));

  return (
    <ScreenShell scroll showBack title={item.title ?? 'Lucrare'} subtitle={categoryLabel ?? undefined}>
      {item.description ? (
        <Text className="text-base text-text-primary leading-7 w-full mb-md">{item.description}</Text>
      ) : null}

      <Text className="text-xs text-text-secondary mb-sm">
        Portofoliu public — fără comentarii aici. Urmărește postările clinicii în feed pentru discuții.
      </Text>

      <View className="flex-row flex-wrap gap-sm w-full">
        {media.map((m, index) => (
          <Pressable key={m.id} onPress={() => setViewerIndex(index)} className="active:opacity-90">
            {m.mediaType === 'video' ? (
              <View className="w-[31%] min-w-[100px] aspect-square rounded-xl bg-border items-center justify-center overflow-hidden">
                {m.thumbnailUrl ? (
                  <Image source={{ uri: m.thumbnailUrl }} className="absolute inset-0 w-full h-full" />
                ) : null}
                <Text className="text-white text-lg z-10">▶</Text>
              </View>
            ) : (
              <Image source={{ uri: m.url }} className="w-[31%] min-w-[100px] aspect-square rounded-xl bg-border" />
            )}
          </Pressable>
        ))}
      </View>

      <Modal visible={viewerIndex !== null} animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        {viewerIndex !== null ? (
          <PortfolioGalleryViewer media={media} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
        ) : null}
      </Modal>
    </ScreenShell>
  );
}
