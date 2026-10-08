import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { PostReactionType } from '@dental/utils';
import { POST_REACTION_META } from '@dental/utils';
import { Badge } from '@dental/ui';
import type { Database } from '@dental/types';
import { PostMediaImage } from '@mobile/components/PostMediaImage';
import { ReactionPicker, reactionDisplayEmoji } from '@mobile/components/ReactionPicker';
import { formatFeedTimestamp } from '@mobile/lib/formatFeedDate';
import { resolvePostMediaUrl } from '@mobile/lib/postMedia';

type PostRow = Database['public']['Tables']['posts']['Row'] & {
  post_media?: Array<{
    id: string;
    media_type: string;
    storage_path: string;
    video_playback_url: string | null;
    processing_status?: string | null;
    thumbnail_url?: string | null;
  }>;
  linked_portfolio_item?: { id: string; title: string | null; category_id: string | null } | null;
  linked_opportunity?: { id: string; title: string | null; city: string | null } | null;
};

const TYPE_LABELS: Record<string, string> = {
  photo: 'Foto',
  video: 'Video',
  text: 'Text',
  portfolio: 'Caz clinic',
  announcement: 'Anunț',
  collaboration: 'Colaborare',
};

type PostCardProps = {
  post: PostRow;
  userReaction?: PostReactionType | null;
  saved?: boolean;
  onSetReaction?: (postId: string, reaction: PostReactionType) => void;
  onRemoveReaction?: (postId: string) => void;
  onToggleSave?: (postId: string) => void;
};

function getMediaUrl(post: PostRow): string | null {
  const sorted = (post.post_media ?? [])
    .slice()
    .sort((a, b) => ((a as { display_order?: number }).display_order ?? 0) - ((b as { display_order?: number }).display_order ?? 0));
  const media = sorted[0];
  if (!media) return null;
  return resolvePostMediaUrl(media);
}

function EngagementButton({
  icon,
  label,
  active,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${active ? 'bg-primary/10' : 'bg-background'}`}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={18} color={active ? '#0F6B66' : '#6B7280'} />
      <Text className={`text-sm ${active ? 'text-primary font-semibold' : 'text-text-secondary'}`}>{label}</Text>
    </Pressable>
  );
}

export function PostCard({
  post,
  userReaction = null,
  saved = false,
  onSetReaction,
  onRemoveReaction,
  onToggleSave,
}: PostCardProps) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const typeLabel = TYPE_LABELS[post.post_type] ?? post.post_type;
  const mediaUrl = getMediaUrl(post);
  const hasMedia = (post.post_media?.length ?? 0) > 0;
  const isAnnouncement = post.post_type === 'announcement';
  const isCollaboration = post.post_type === 'collaboration';
  const isPortfolio = post.post_type === 'portfolio';
  const isVideoProcessing =
    hasMedia &&
    post.post_media?.[0]?.media_type === 'video' &&
    !mediaUrl &&
    post.post_media[0].processing_status !== 'failed';

  function openPost(focusComments = false) {
    router.push(focusComments ? `/post/${post.id}?focus=comments` : `/post/${post.id}`);
  }

  function handleReactionPress() {
    if (userReaction === 'appreciate') onRemoveReaction?.(post.id);
    else onSetReaction?.(post.id, 'appreciate');
  }

  return (
    <View
      className={`rounded-2xl bg-surface overflow-hidden border ${
        isAnnouncement ? 'border-l-4 border-l-accent border-border' : 'border-border'
      } ${isCollaboration ? 'border-secondary/30' : ''}`}
    >
      <Pressable onPress={openPost} className="active:opacity-95">
        {mediaUrl ? (
          <PostMediaImage uri={mediaUrl} />
        ) : isVideoProcessing ? (
          <View className="w-full h-48 bg-border items-center justify-center">
            <Text className="text-sm text-text-secondary">Video în procesare…</Text>
          </View>
        ) : null}

        <View className={`p-lg gap-sm ${isCollaboration ? 'bg-secondary/5' : ''}`}>
          <View className="flex-row items-center justify-between">
            <Badge
              label={typeLabel}
              variant={isCollaboration ? 'openForCollaboration' : isPortfolio ? 'verified' : 'neutral'}
            />
            <Text className="text-xs text-text-secondary">{formatFeedTimestamp(post.created_at)}</Text>
          </View>
          {isCollaboration && post.linked_opportunity?.city ? (
            <Text className="text-xs text-text-secondary -mt-1">{post.linked_opportunity.city}</Text>
          ) : null}

          {isPortfolio && post.linked_portfolio_item?.title ? (
            <View className="bg-primary/5 rounded-xl px-md py-sm">
              <Text className="text-sm font-semibold text-primary">Caz: {post.linked_portfolio_item.title}</Text>
            </View>
          ) : null}

          {isCollaboration && post.linked_opportunity?.title ? (
            <View className="gap-1">
              <Text className="text-base font-semibold text-text-primary">{post.linked_opportunity.title}</Text>
              <Text className="text-sm text-primary font-medium">Vezi oportunitatea →</Text>
            </View>
          ) : null}

          {post.content ? (
            <Text className="text-base text-text-primary leading-6" numberOfLines={isCollaboration ? 2 : 4}>
              {post.content}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View className="flex-row items-center gap-sm px-lg pb-lg pt-0">
        <Pressable
          onPress={handleReactionPress}
          onLongPress={() => setPickerOpen(true)}
          delayLongPress={280}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${userReaction ? 'bg-primary/10' : 'bg-background'}`}
          accessibilityRole="button"
          accessibilityLabel="Reacție"
        >
          <Text className="text-base">{reactionDisplayEmoji(userReaction)}</Text>
          <Text className={`text-sm ${userReaction ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
            {post.like_count}
          </Text>
        </Pressable>
        <EngagementButton
          icon="chatbubble-outline"
          label={String(post.comment_count)}
          onPress={() => openPost(true)}
          accessibilityLabel="Comentarii"
        />
        <EngagementButton
          icon={saved ? 'bookmark' : 'bookmark-outline'}
          label={String(post.save_count)}
          active={saved}
          onPress={() => onToggleSave?.(post.id)}
          accessibilityLabel="Salvează postarea"
        />
      </View>

      <ReactionPicker
        visible={pickerOpen}
        currentReaction={userReaction}
        onSelect={(r) => onSetReaction?.(post.id, r)}
        onRemove={() => onRemoveReaction?.(post.id)}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
