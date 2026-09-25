import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';
import { reorderPortfolioMedia } from '@dental/api';
import { supabase } from '@mobile/lib/supabase';
import { PortfolioGalleryViewer, type GalleryMediaItem } from '@mobile/features/portfolio/PortfolioGalleryViewer';

type PortfolioMediaRow = {
  id: string;
  media_type: string;
  storage_path: string;
  display_order: number;
  video_playback_url: string | null;
  thumbnail_url: string | null;
  processing_status: string | null;
  before_after_role: string | null;
};

type PortfolioItemRow = {
  id: string;
  title: string;
  portfolio_media?: PortfolioMediaRow[];
};

type AdminPortfolioItemCardProps = {
  item: PortfolioItemRow;
  onDelete: (itemId: string) => void;
  onAddVideo: (itemId: string) => void;
  onMediaChanged: () => void;
};

function toGalleryMedia(media: PortfolioMediaRow[]): GalleryMediaItem[] {
  return media
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((m) => ({
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
}

export function AdminPortfolioItemCard({ item, onDelete, onAddVideo, onMediaChanged }: AdminPortfolioItemCardProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);

  const sortedMedia = useMemo(
    () => (item.portfolio_media ?? []).slice().sort((a, b) => a.display_order - b.display_order),
    [item.portfolio_media]
  );

  const galleryMedia = useMemo(() => toGalleryMedia(sortedMedia), [sortedMedia]);

  async function moveMedia(mediaId: string, direction: 'up' | 'down') {
    const idx = sortedMedia.findIndex((m) => m.id === mediaId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sortedMedia.length) return;

    setReordering(true);
    const current = sortedMedia[idx]!;
    const adjacent = sortedMedia[swapIdx]!;
    await reorderPortfolioMedia(supabase, [
      { id: current.id, display_order: adjacent.display_order },
      { id: adjacent.id, display_order: current.display_order },
    ]);
    setReordering(false);
    onMediaChanged();
  }

  return (
    <>
      <View className="border border-border rounded-xl p-md mb-sm gap-xs bg-surface">
        <View className="flex-row justify-between items-start">
          <Text className="text-base font-medium text-text-primary flex-1 pr-sm">{item.title}</Text>
          <Pressable onPress={() => onDelete(item.id)}>
            <Text className="text-sm text-error">Șterge</Text>
          </Pressable>
        </View>

        <View className="gap-sm">
          {sortedMedia.map((m, index) => (
            <View key={m.id} className="flex-row items-center gap-sm">
              <Pressable onPress={() => setViewerIndex(index)} disabled={m.media_type === 'video' && m.processing_status !== 'ready'}>
                {m.media_type === 'video' ? (
                  m.processing_status === 'ready' && m.thumbnail_url ? (
                    <View className="relative">
                      <Image source={{ uri: m.thumbnail_url }} className="w-16 h-16 rounded-md bg-border" />
                      <Text className="absolute inset-0 text-center text-white text-lg" style={{ lineHeight: 64 }}>
                        ▶
                      </Text>
                    </View>
                  ) : (
                    <View className="w-16 h-16 rounded-md bg-border items-center justify-center">
                      <Text className="text-xs text-text-secondary text-center">
                        {m.processing_status === 'failed' ? 'Eșuat' : 'Procesare…'}
                      </Text>
                    </View>
                  )
                ) : (
                  <Image
                    source={{ uri: supabase.storage.from('portfolio').getPublicUrl(m.storage_path).data.publicUrl }}
                    className="w-16 h-16 rounded-md bg-border"
                  />
                )}
              </Pressable>

              <View className="flex-row gap-xs">
                <Pressable
                  onPress={() => moveMedia(m.id, 'up')}
                  disabled={reordering || index === 0}
                  className={`border border-border rounded-md px-sm py-xs ${index === 0 ? 'opacity-30' : ''}`}
                >
                  <Text className="text-xs text-text-primary">↑</Text>
                </Pressable>
                <Pressable
                  onPress={() => moveMedia(m.id, 'down')}
                  disabled={reordering || index === sortedMedia.length - 1}
                  className={`border border-border rounded-md px-sm py-xs ${index === sortedMedia.length - 1 ? 'opacity-30' : ''}`}
                >
                  <Text className="text-xs text-text-primary">↓</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-text-secondary">{sortedMedia.length} media</Text>
          <View className="flex-row gap-md">
            {galleryMedia.length > 0 ? (
              <Pressable onPress={() => setViewerIndex(0)}>
                <Text className="text-xs text-primary">Previzualizare</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => onAddVideo(item.id)}>
              <Text className="text-xs text-primary">+ Adaugă video</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={viewerIndex !== null} animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        {viewerIndex !== null ? (
          <PortfolioGalleryViewer media={galleryMedia} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
        ) : null}
      </Modal>
    </>
  );
}
