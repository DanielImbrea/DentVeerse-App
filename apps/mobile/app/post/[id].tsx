import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addComment,
  fetchPostReactionBreakdown,
  getPostEngagementState,
  listComments,
  removePost,
  removePostReaction,
  savePost,
  setPostReaction,
  unsavePost,
} from '@dental/api';
import { POST_REACTION_META, type PostReactionType } from '@dental/utils';
import { ReactionPicker, reactionDisplayEmoji } from '@mobile/components/ReactionPicker';
import { Badge, Button, ErrorState, SkeletonRow } from '@dental/ui';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { PostMediaImage } from '@mobile/components/PostMediaImage';
import { useMyOrg } from '@mobile/hooks/useMyOrg';
import { resolvePostMediaUrl } from '@mobile/lib/postMedia';
import { supabase } from '@mobile/lib/supabase';

const TYPE_LABELS: Record<string, string> = {
  photo: 'Foto',
  video: 'Video',
  text: 'Text',
  portfolio: 'Caz clinic',
  announcement: 'Anunț',
  collaboration: 'Colaborare',
};

function PostVideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return <VideoView player={player} style={{ width: '100%', height: 240, borderRadius: 12, backgroundColor: '#E5E7EB' }} nativeControls />;
}

export default function PostDetailScreen() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const { width: screenWidth } = useWindowDimensions();
  const mediaWidth = screenWidth - 32;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [draft, setDraft] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(focus === 'comments');
  const queryClient = useQueryClient();
  const { data: myOrg } = useMyOrg();

  const { data: postData, isLoading, isError, refetch } = useQuery({
    queryKey: ['post', id],
    queryFn: () =>
      supabase
        .from('posts')
        .select(
          `*, post_media(*),
           linked_portfolio_item:portfolio_items(id, title, category_id),
           linked_opportunity:opportunities(id, title, city)`
        )
        .eq('id', id as string)
        .single(),
    enabled: !!id,
  });

  const post = postData?.data;

  const { data: authorData } = useQuery({
    queryKey: ['post-author', post?.author_type, post?.author_id],
    queryFn: async () => {
      if (!post) return null;
      if (post.author_type === 'clinic') {
        const { data } = await supabase.from('clinics').select('id, name, city').eq('id', post.author_id).single();
        return data ? { ...data, href: `/clinic/${data.id}` as const, label: data.name } : null;
      }
      const { data } = await supabase.from('laboratories').select('id, name, city').eq('id', post.author_id).single();
      return data ? { ...data, href: `/laboratory/${data.id}` as const, label: data.name } : null;
    },
    enabled: !!post,
  });

  const { data: engagement, refetch: refetchEngagement } = useQuery({
    queryKey: ['post-engagement', id],
    queryFn: () => getPostEngagementState(supabase, id as string),
    enabled: !!id,
  });

  const { data: reactionBreakdown } = useQuery({
    queryKey: ['post-reaction-breakdown', id],
    queryFn: () => fetchPostReactionBreakdown(supabase, id as string),
    enabled: !!id,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => listComments(supabase, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (focus === 'comments') setCommentsOpen(true);
  }, [focus]);

  useEffect(() => {
    if (commentsOpen && commentsData?.data?.length) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [commentsOpen, commentsData?.data?.length]);

  async function handleReactionPress() {
    if (!id) return;
    if (engagement?.reaction === 'appreciate') await removePostReaction(supabase, id);
    else await setPostReaction(supabase, id, 'appreciate');
    refetch();
    refetchEngagement();
    queryClient.invalidateQueries({ queryKey: ['post-reaction-breakdown', id] });
    queryClient.invalidateQueries({ queryKey: ['my-post-reactions'] });
  }

  async function handleSetReaction(reaction: PostReactionType) {
    if (!id) return;
    await setPostReaction(supabase, id, reaction);
    refetch();
    refetchEngagement();
    queryClient.invalidateQueries({ queryKey: ['post-reaction-breakdown', id] });
    queryClient.invalidateQueries({ queryKey: ['my-post-reactions'] });
  }

  async function handleRemoveReaction() {
    if (!id) return;
    await removePostReaction(supabase, id);
    refetch();
    refetchEngagement();
    queryClient.invalidateQueries({ queryKey: ['post-reaction-breakdown', id] });
    queryClient.invalidateQueries({ queryKey: ['my-post-reactions'] });
  }

  async function handleToggleSave() {
    if (!id) return;
    if (engagement?.saved) await unsavePost(supabase, id);
    else await savePost(supabase, id);
    refetch();
    refetchEngagement();
  }

  async function handleAddComment() {
    if (!draft.trim() || !id) return;
    await addComment(supabase, id as string, draft.trim());
    setDraft('');
    queryClient.invalidateQueries({ queryKey: ['comments', id] });
    refetch();
  }

  const canDeletePost =
    !!myOrg &&
    !!post &&
    post.author_type === myOrg.orgType &&
    post.author_id === myOrg.orgId &&
    post.status !== 'removed';

  function handleDeletePost() {
    if (!id) return;
    Alert.alert('Șterge postarea', 'Postarea va dispărea din feed. Continui?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const { error } = await removePost(supabase, id as string);
          setDeleting(false);
          if (error) {
            Alert.alert('Eroare', error.message);
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['feed-weighted'] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
          router.back();
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <ScreenShell showBack title="Postare">
        <SkeletonRow height={200} />
      </ScreenShell>
    );
  }

  if (isError || !post) {
    return (
      <ScreenShell showBack title="Postare">
        <ErrorState message="Nu am putut încărca postarea." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const comments = commentsData?.data ?? [];
  const media = (post.post_media ?? []).slice().sort((a, b) => a.display_order - b.display_order);
  const typeLabel = TYPE_LABELS[post.post_type] ?? post.post_type;
  const isCollaboration = post.post_type === 'collaboration';
  const isPortfolio = post.post_type === 'portfolio';
  const isAnnouncement = post.post_type === 'announcement';

  const header = (
    <View className="gap-md">
      {authorData ? (
        <Link href={authorData.href} asChild>
          <Pressable className="flex-row items-center gap-sm active:opacity-80">
            <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
              <Text className="text-primary font-semibold">{authorData.label.charAt(0)}</Text>
            </View>
            <View>
              <Text className="text-base font-semibold text-text-primary">{authorData.label}</Text>
              {authorData.city ? <Text className="text-sm text-text-secondary">{authorData.city}</Text> : null}
            </View>
          </Pressable>
        </Link>
      ) : null}

      <Badge
        label={typeLabel}
        variant={isCollaboration ? 'openForCollaboration' : isPortfolio ? 'verified' : 'neutral'}
      />

      {isPortfolio && post.linked_portfolio_item?.title ? (
        <View className="bg-primary/5 rounded-xl px-md py-sm">
          <Text className="text-sm font-semibold text-primary">Caz: {post.linked_portfolio_item.title}</Text>
        </View>
      ) : null}

      {isCollaboration && post.linked_opportunity?.title ? (
        <View className="gap-1">
          <Text className="text-base font-semibold text-text-primary">{post.linked_opportunity.title}</Text>
          {post.linked_opportunity.city ? (
            <Text className="text-sm text-text-secondary">{post.linked_opportunity.city}</Text>
          ) : null}
        </View>
      ) : null}

      {post.content ? (
        <Text className={`text-base text-text-primary ${isAnnouncement ? 'font-medium' : ''}`}>{post.content}</Text>
      ) : null}

      {media.length > 0 ? (
        media.length === 1 ? (
          (() => {
            const m = media[0];
            const url = resolvePostMediaUrl(m);
            if (m.media_type === 'video') {
              if (url && m.processing_status === 'ready') return <PostVideoPlayer url={url} />;
              return (
                <View className="w-full rounded-xl bg-border items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
                  <Text className="text-sm text-text-secondary">
                    {m.processing_status === 'failed' ? 'Video eșuat' : 'Video în procesare…'}
                  </Text>
                </View>
              );
            }
            if (!url) return null;
            return <PostMediaImage uri={url} width={mediaWidth} className="rounded-xl overflow-hidden" />;
          })()
        ) : (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className="-mx-lg">
            {media.map((m) => {
              const url = resolvePostMediaUrl(m);
              if (m.media_type === 'video') {
                if (url && m.processing_status === 'ready') {
                  return (
                    <View key={m.id} style={{ width: screenWidth }} className="px-lg">
                      <PostVideoPlayer url={url} />
                    </View>
                  );
                }
                return (
                  <View key={m.id} style={{ width: screenWidth }} className="px-lg">
                    <View className="w-full rounded-xl bg-border items-center justify-center" style={{ aspectRatio: 16 / 9 }}>
                      <Text className="text-sm text-text-secondary">
                        {m.processing_status === 'failed' ? 'Video eșuat' : 'Video în procesare…'}
                      </Text>
                    </View>
                  </View>
                );
              }
              if (!url) return null;
              return (
                <View key={m.id} style={{ width: screenWidth }} className="px-lg">
                  <PostMediaImage uri={url} width={mediaWidth} className="rounded-xl overflow-hidden" />
                </View>
              );
            })}
          </ScrollView>
        )
      ) : null}

      <View className="flex-row items-center gap-md py-sm border-y border-border">
        <Pressable
          onPress={handleReactionPress}
          onLongPress={() => setPickerOpen(true)}
          delayLongPress={280}
          className="flex-row items-center gap-1.5"
          accessibilityLabel="Reacție"
        >
          <Text className="text-xl">{reactionDisplayEmoji(engagement?.reaction ?? null)}</Text>
          <Text className={`text-base ${engagement?.reaction ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
            {post.like_count}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setCommentsOpen(true)}
          className="flex-row items-center gap-1.5 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Comentarii"
        >
          <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
          <Text className="text-base text-text-secondary">{post.comment_count}</Text>
        </Pressable>
        <Pressable onPress={handleToggleSave} className="flex-row items-center gap-1.5" accessibilityLabel="Salvează postarea">
          <Ionicons
            name={engagement?.saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={engagement?.saved ? '#0F6B66' : '#6B7280'}
          />
          <Text className={`text-base ${engagement?.saved ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
            {post.save_count}
          </Text>
        </Pressable>
      </View>

      {(reactionBreakdown?.data?.length ?? 0) > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {(reactionBreakdown?.data ?? []).map((row) => {
            const type = row.reaction_type as PostReactionType;
            const meta = POST_REACTION_META[type];
            return (
              <Text key={type} className="text-sm text-text-secondary">
                {meta?.emoji ?? '•'} {row.cnt}
              </Text>
            );
          })}
        </View>
      ) : null}

      {canDeletePost ? (
        <Button
          label="Șterge postarea"
          variant="destructive"
          loading={deleting}
          onPress={handleDeletePost}
        />
      ) : null}

      {!commentsOpen ? (
        <Pressable
          onPress={() => setCommentsOpen(true)}
          className="rounded-2xl border border-border bg-surface px-md py-3 active:opacity-90"
        >
          <Text className="text-sm font-medium text-text-primary">
            {post.comment_count > 0
              ? `${post.comment_count} ${post.comment_count === 1 ? 'comentariu' : 'comentarii'} · Atinge pentru a vedea`
              : 'Comentarii · Atinge pentru a scrie'}
          </Text>
        </Pressable>
      ) : (
        <Text className="text-sm font-semibold text-text-primary pt-sm">Comentarii</Text>
      )}
    </View>
  );

  return (
    <ScreenShell showBack title="Postare" scroll={false} contentClassName="flex-1 px-lg pb-0 w-full">
      <ReactionPicker
        visible={pickerOpen}
        currentReaction={engagement?.reaction ?? null}
        onSelect={handleSetReaction}
        onRemove={handleRemoveReaction}
        onClose={() => setPickerOpen(false)}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 56}
      >
        <FlatList
          ref={listRef}
          className="flex-1"
          data={commentsOpen ? comments : []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: commentsOpen ? 12 : insets.bottom + 16 }}
          ListEmptyComponent={
            commentsOpen ? (
              <Text className="text-sm text-text-secondary py-md">Niciun comentariu încă.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const profile = item.public_profiles as { first_name?: string | null; last_name?: string | null } | null;
            const authorName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilizator';
            return (
              <View className="border-b border-border pb-sm mb-sm">
                <Text className="text-sm font-medium text-text-primary">{authorName}</Text>
                <Text className="text-base text-text-primary mt-1">{item.content}</Text>
              </View>
            );
          }}
        />

        {commentsOpen ? (
          <View
            className="flex-row items-center gap-sm pt-sm border-t border-border bg-background"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <AppTextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Scrie un comentariu…"
              className="flex-1 rounded-full h-11 bg-surface"
            />
            <Pressable
              onPress={handleAddComment}
              className="bg-primary rounded-full px-lg py-sm min-h-[44px] justify-center"
              disabled={!draft.trim()}
            >
              <Text className="text-base text-white font-medium">Trimite</Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
