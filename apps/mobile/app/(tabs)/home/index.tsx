import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHomeFeedPage, fetchMyPostReactions, removePostReaction, savePost, setPostReaction, unsavePost } from '@dental/api';
import { track } from '@dental/analytics';
import type { PostReactionType } from '@dental/utils';
import { EmptyState, ErrorState, SkeletonRow } from '@dental/ui';
import { Link } from 'expo-router';
import { FeedFilterBar, DEFAULT_FEED_FILTERS, type FeedFiltersState } from '@mobile/components/FeedFilterBar';
import { PostCard } from '@mobile/components/PostCard';
import { supabase } from '@mobile/lib/supabase';
import { usePermissions } from '@mobile/features/auth/usePermissions';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { canPost } = usePermissions();
  const [filters, setFilters] = useState<FeedFiltersState>(DEFAULT_FEED_FILTERS);

  const { data: myReactionsRes } = useQuery({
    queryKey: ['my-post-reactions'],
    queryFn: () => fetchMyPostReactions(supabase),
  });
  const myReactions = myReactionsRes?.data ?? new Map<string, PostReactionType>();

  const { data: savedPostIds = new Set<string>() } = useQuery({
    queryKey: ['my-saved-posts'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return new Set<string>();
      const { data } = await supabase
        .from('saves')
        .select('post_id')
        .eq('user_id', userData.user.id);
      return new Set((data ?? []).map((row) => row.post_id));
    },
  });

  const { data: followCountData } = useQuery({
    queryKey: ['feed-follow-count'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return 0;
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_user_id', userData.user.id);
      return count ?? 0;
    },
  });

  const feedParams = useMemo(
    () => ({
      sortMode: filters.sortMode,
      authorFilter: filters.authorFilter,
      contentFilter: filters.contentFilter,
      followedOnly: filters.followedOnly,
    }),
    [filters]
  );

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } = useInfiniteQuery({
    queryKey: ['feed-weighted', feedParams],
    queryFn: ({ pageParam }) => fetchHomeFeedPage(supabase, { ...feedParams, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const rows = lastPage.data;
      if (!rows || rows.length === 0) return undefined;
      return rows[rows.length - 1]?.created_at ?? undefined;
    },
  });

  const posts = data?.pages.flatMap((page) => page.data ?? []) ?? [];

  async function handleSetReaction(postId: string, reaction: PostReactionType) {
    await setPostReaction(supabase, postId, reaction);
    track({ name: 'post_engagement', properties: { post_id: postId, interaction: reaction } });
    queryClient.invalidateQueries({ queryKey: ['my-post-reactions'] });
    refetch();
  }

  async function handleRemoveReaction(postId: string) {
    await removePostReaction(supabase, postId);
    queryClient.invalidateQueries({ queryKey: ['my-post-reactions'] });
    refetch();
  }

  async function handleToggleSave(postId: string) {
    if (savedPostIds.has(postId)) await unsavePost(supabase, postId);
    else await savePost(supabase, postId);
    track({ name: 'post_engagement', properties: { post_id: postId, interaction: 'save' } });
    queryClient.invalidateQueries({ queryKey: ['my-saved-posts'] });
    refetch();
  }

  const subtitle =
    filters.sortMode === 'recent'
      ? 'Postări ordonate cronologic, de la cele mai noi.'
      : 'Prioritar de la conturile urmărite, plus descoperiri din platformă.';

  if (isLoading) {
    return (
      <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 16 }}>
        <Text className="text-2xl font-semibold text-text-primary mb-md">Acasă</Text>
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={220} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <ErrorState message="Nu am putut încărca feed-ul." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {canPost ? (
        <Link href="/modals/create-post" asChild>
          <Pressable
            className="absolute right-6 z-10 bg-primary rounded-full w-14 h-14 items-center justify-center shadow-lg"
            style={{ bottom: insets.bottom + 24 }}
          >
            <Text className="text-white text-2xl">＋</Text>
          </Pressable>
        </Link>
      ) : null}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 16, paddingTop: insets.top + 16 }}
        ListHeaderComponent={
          <View>
            <Text className="text-2xl font-semibold text-text-primary">Acasă</Text>
            <Text className="text-sm text-text-secondary mt-1 mb-sm">{subtitle}</Text>
            <FeedFilterBar
              value={filters}
              onChange={setFilters}
              canFilterFollowed={(followCountData ?? 0) > 0}
            />
          </View>
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <View className="bg-surface border border-border rounded-2xl p-xl">
            <EmptyState
              title="Nicio postare"
              message={
                filters.followedOnly
                  ? 'Nu există postări de la conturile pe care le urmărești cu filtrele alese.'
                  : canPost
                    ? 'Fii primul care publică un caz sau un anunț.'
                    : 'Urmărește clinici și laboratoare din Descoperă ca să personalizezi feed-ul.'
              }
            />
          </View>
        }
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="my-lg" /> : null}
        renderItem={({ item }) => (
          <PostCard
            post={item as never}
            userReaction={myReactions.get(item.id) ?? null}
            saved={savedPostIds.has(item.id)}
            onSetReaction={handleSetReaction}
            onRemoveReaction={handleRemoveReaction}
            onToggleSave={handleToggleSave}
          />
        )}
      />
    </View>
  );
}
