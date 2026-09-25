import React, { useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BeforeAfterSlider } from './BeforeAfterSlider';

/**
 * Real inline video playback for a Mux HLS `video_playback_url`
 * (`https://stream.mux.com/{id}.m3u8`). Previously a placeholder (this was
 * the one explicitly-acknowledged remaining gap from the prior session's
 * video work: "upload/processing wired, playback not"). Uses `expo-video`
 * (Expo SDK's current recommended video API, replacing the older
 * `expo-av`), which has native HLS support on both iOS and Android — no
 * additional player library needed since Mux already serves standard HLS.
 *
 * A tap-to-play affordance is used (not autoplay) to avoid surprising
 * video/audio playback when swiping through a gallery, consistent with
 * docs/04-mobile.md's "subtle, professional" motion guidance.
 *
 * STATUS: written, NOT executed — needs a device/simulator and a real,
 * already-transcoded Mux asset to confirm HLS playback actually works.
 */
function VideoSlideView({ item, width, height }: { item: GalleryMediaItem; width: number; height: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(item.processingStatus === 'ready' ? item.url : null, (p) => {
    p.loop = false;
  });

  if (item.processingStatus !== 'ready') {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={{ width, height }} resizeMode="contain" /> : null}
        <Text style={{ color: '#FFFFFF', position: 'absolute' }}>
          {item.processingStatus === 'failed' ? 'Video processing failed' : 'Video processing…'}
        </Text>
      </View>
    );
  }

  if (!isPlaying) {
    return (
      <Pressable
        onPress={() => {
          setIsPlaying(true);
          player.play();
        }}
        style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
      >
        {item.thumbnailUrl ? <Image source={{ uri: item.thumbnailUrl }} style={{ width, height }} resizeMode="contain" /> : null}
        <View
          style={{
            position: 'absolute',
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 24 }}>▶</Text>
        </View>
      </Pressable>
    );
  }

  return <VideoView player={player} style={{ width, height }} nativeControls allowsFullscreen />;
}

export interface GalleryMediaItem {
  id: string;
  mediaType: 'image' | 'video';
  url: string;
  thumbnailUrl?: string | null;
  beforeAfterRole: 'before' | 'after' | 'single';
  processingStatus?: 'pending' | 'processing' | 'ready' | 'failed';
}

export interface PortfolioGalleryViewerProps {
  media: GalleryMediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * Fullscreen gallery — previously entirely unbuilt (portfolio management
 * screens showed a small thumbnail grid, tapping did nothing). Real
 * implementation:
 * - Horizontal swipe between media items via a paging FlatList.
 * - Pinch-to-zoom on images via ScrollView's native
 *   minimumZoomScale/maximumZoomScale (iOS/Android built-in, no extra
 *   gesture library dependency needed for pinch-zoom specifically).
 * - Automatically pairs adjacent before/after media into a
 *   `BeforeAfterSlider` instead of two separate swipeable pages, when a
 *   `before` item is immediately followed by an `after` item with the same
 *   pairing (paired by array adjacency here — see the note in
 *   docs/17-implementation-status.md about pairing being adjacency-based
 *   rather than an explicit pair-id, which is an acceptable MVP simplification).
 * - Video items get real inline playback via `VideoSlideView` (see its own
 *   header comment above) — tap-to-play, native HLS via expo-video, wired
 *   to the Mux `video_playback_url`. This was the one explicitly-flagged
 *   remaining gap from the previous session ("upload/processing wired,
 *   playback not") — now closed.
 */
export function PortfolioGalleryViewer({ media, initialIndex = 0, onClose }: PortfolioGalleryViewerProps) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Group adjacent before/after pairs into single gallery "slides".
  const slides: Array<{ type: 'single'; item: GalleryMediaItem } | { type: 'pair'; before: GalleryMediaItem; after: GalleryMediaItem }> =
    [];
  for (let i = 0; i < media.length; i++) {
    const item = media[i];
    const next = media[i + 1];
    if (item.beforeAfterRole === 'before' && next?.beforeAfterRole === 'after') {
      slides.push({ type: 'pair', before: item, after: next });
      i++; // consume both
    } else {
      slides.push({ type: 'single', item });
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Pressable
        onPress={onClose}
        style={{ position: 'absolute', top: 48, right: 24, zIndex: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 24 }}>×</Text>
      </Pressable>

      <View style={{ position: 'absolute', top: 52, left: 0, right: 0, zIndex: 10, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 13 }}>
          {currentIndex + 1} / {slides.length}
        </Text>
      </View>

      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => `slide-${index}`}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item: slide }) => (
          <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
            {slide.type === 'pair' ? (
              <BeforeAfterSlider beforeUri={slide.before.url} afterUri={slide.after.url} height={height * 0.6} />
            ) : slide.item.mediaType === 'video' ? (
              <VideoSlideView item={slide.item} width={width} height={height * 0.6} />
            ) : (
              // Native pinch-to-zoom via ScrollView zoom props.
              <ScrollView
                style={{ width, height: height * 0.7 }}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
                minimumZoomScale={1}
                maximumZoomScale={3}
                centerContent
              >
                <Image source={{ uri: slide.item.url }} style={{ width, height: height * 0.7 }} resizeMode="contain" />
              </ScrollView>
            )}
          </View>
        )}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        initialScrollIndex={initialIndex}
      />
    </View>
  );
}
