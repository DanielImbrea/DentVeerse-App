import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { mergeWeightedFeed, postTypesForContentFilter } from './feedRanking';
import { getPostEngagementState as getEngagementState, removePostReaction, setPostReaction } from './reactions';
import type { DiscoveryFeedParams, FeedPageParams } from './feedTypes';

export type { FeedAuthorFilter, FeedContentFilter, FeedPageParams, FeedSortMode } from './feedTypes';
export { mergeWeightedFeed, postTypesForContentFilter } from './feedRanking';

type PostInsert = Database['public']['Tables']['posts']['Insert'];

/** Feed CRUD + interactions. See docs/06-feed-messaging.md Part A. */
export async function createPost(supabase: SupabaseClient<Database>, input: PostInsert) {
  return supabase.from('posts').insert(input).select().single();
}

export async function updatePost(supabase: SupabaseClient<Database>, id: string, patch: Partial<PostInsert>) {
  return supabase.from('posts').update(patch).eq('id', id).select().single();
}

export async function removePost(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('posts').update({ deleted_at: new Date().toISOString(), status: 'removed' }).eq('id', id);
}

const POST_SELECT = `*, post_media(*),
       linked_portfolio_item:portfolio_items(id, title, category_id),
       linked_opportunity:opportunities(id, title, city)`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFeedFilters(query: any, params: FeedPageParams) {
  let next = query;
  if (params.authorFilter === 'clinic') next = next.eq('author_type', 'clinic');
  if (params.authorFilter === 'laboratory') next = next.eq('author_type', 'laboratory');
  const postTypes = postTypesForContentFilter(params.contentFilter);
  if (postTypes) next = next.in('post_type', postTypes);
  return next;
}

async function loadFollowIds(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { clinicIds: [] as string[], labIds: [] as string[], error: userError };

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('target_type, target_id')
    .eq('follower_user_id', userData.user.id);

  if (followsError) return { clinicIds: [], labIds: [], error: followsError };

  return {
    clinicIds: (follows ?? []).filter((f) => f.target_type === 'clinic').map((f) => f.target_id),
    labIds: (follows ?? []).filter((f) => f.target_type === 'laboratory').map((f) => f.target_id),
    error: null,
  };
}

/**
 * MVP feed query: reverse-chronological, keyset-paginated on (created_at,
 * id). See docs/06-feed-messaging.md Part A — the "80% followed / 20%
 * discovery" weighted-merge ranking described there is NOT implemented as
 * a single SQL query here; it needs either a dedicated Postgres function
 * (recommended: `feed_for_user(p_user_id, p_cursor, p_page_size)` combining
 * a UNION of "posts from follows" + "local discovery posts" with the
 * weighting applied client-side or via a window function) or a scheduled
 * feed-fan-out job at higher scale. This function returns a straightforward
 * reverse-chronological public feed (all published posts) as the honest
 * MVP-1 behavior; swap the query body for the weighted RPC once that
 * function is written — this is flagged, not silently left half-built.
 */
export async function fetchFeedPage(supabase: SupabaseClient<Database>, params: FeedPageParams = {}) {
  const pageSize = params.pageSize ?? 15;
  let query = applyFeedFilters(
    supabase.from('posts').select(POST_SELECT).eq('status', 'published'),
    params
  )
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  return query;
}

export async function fetchFollowedFeedPage(
  supabase: SupabaseClient<Database>,
  followedClinicIds: string[],
  followedLabIds: string[],
  params: FeedPageParams = {}
) {
  if (followedClinicIds.length === 0 && followedLabIds.length === 0) {
    return { data: [] as Database['public']['Tables']['posts']['Row'][], error: null };
  }

  const pageSize = params.pageSize ?? 15;
  let query = applyFeedFilters(
    supabase
      .from('posts')
      .select(POST_SELECT)
      .eq('status', 'published')
      .or(
        [
          followedClinicIds.length ? `and(author_type.eq.clinic,author_id.in.(${followedClinicIds.join(',')}))` : null,
          followedLabIds.length ? `and(author_type.eq.laboratory,author_id.in.(${followedLabIds.join(',')}))` : null,
        ]
          .filter(Boolean)
          .join(',')
      ),
    params
  )
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  return query;
}

export type { DiscoveryFeedParams } from './feedTypes';

export async function fetchDiscoveryFeedPage(
  supabase: SupabaseClient<Database>,
  params: DiscoveryFeedParams = {}
) {
  const pageSize = params.pageSize ?? 15;
  const clinicSet = new Set(params.followedClinicIds ?? []);
  const labSet = new Set(params.followedLaboratoryIds ?? []);

  let query = applyFeedFilters(supabase.from('posts').select(POST_SELECT).eq('status', 'published'), params)
    .order('created_at', { ascending: false })
    .limit(pageSize * 3);

  if (params.cursor) query = query.lt('created_at', params.cursor);

  const { data, error } = await query;
  if (error || !data) return { data, error };

  const filtered = data
    .filter((post) => {
      if (post.author_type === 'clinic' && clinicSet.has(post.author_id)) return false;
      if (post.author_type === 'laboratory' && labSet.has(post.author_id)) return false;
      return true;
    })
    .slice(0, pageSize);

  return { data: filtered, error: null };
}

const DEFAULT_FOLLOWED_WEIGHT = 0.8;

/** Home feed entry point — supports sort modes, content filters, and followed-only. */
export async function fetchHomeFeedPage(supabase: SupabaseClient<Database>, params: FeedPageParams = {}) {
  const sortMode = params.sortMode ?? 'for_you';

  if (params.followedOnly) {
    const { clinicIds, labIds, error } = await loadFollowIds(supabase);
    if (error) return { data: null, error };
    if (clinicIds.length === 0 && labIds.length === 0) {
      return { data: [] as Database['public']['Tables']['posts']['Row'][], error: null };
    }
    return fetchFollowedFeedPage(supabase, clinicIds, labIds, params);
  }

  if (sortMode === 'recent') {
    return fetchFeedPage(supabase, params);
  }

  return fetchWeightedFeedPage(supabase, params);
}

/** ~80% followed / ~20% discovery; public feed when viewer follows nobody. */
export async function fetchWeightedFeedPage(
  supabase: SupabaseClient<Database>,
  params: FeedPageParams = {},
  followedWeight = DEFAULT_FOLLOWED_WEIGHT
) {
  const pageSize = params.pageSize ?? 15;
  const { clinicIds, labIds, error: followsError } = await loadFollowIds(supabase);
  if (followsError) return { data: null, error: followsError };

  if (clinicIds.length === 0 && labIds.length === 0) {
    return fetchFeedPage(supabase, params);
  }

  const poolSize = Math.max(pageSize * 2, 20);
  const followedTarget = Math.ceil(pageSize * followedWeight);

  const [followedRes, discoveryRes] = await Promise.all([
    fetchFollowedFeedPage(supabase, clinicIds, labIds, { ...params, pageSize: poolSize }),
    fetchDiscoveryFeedPage(supabase, {
      ...params,
      pageSize: poolSize,
      followedClinicIds: clinicIds,
      followedLaboratoryIds: labIds,
    }),
  ]);

  if (followedRes.error) return followedRes;
  if (discoveryRes.error) return discoveryRes;

  const followed = followedRes.data ?? [];
  const discovery = discoveryRes.data ?? [];

  if (followed.length === 0) {
    return { data: (discoveryRes.data ?? []).slice(0, pageSize), error: null };
  }

  const merged = mergeWeightedFeed(followed.slice(0, followedTarget * 2), discovery, pageSize);
  return { data: merged, error: null };
}

export async function likePost(supabase: SupabaseClient<Database>, postId: string) {
  return setPostReaction(supabase, postId, 'appreciate');
}

export async function unlikePost(supabase: SupabaseClient<Database>, postId: string) {
  return removePostReaction(supabase, postId);
}

export async function getPostEngagementState(supabase: SupabaseClient<Database>, postId: string) {
  return getEngagementState(supabase, postId);
}

/** Mux direct upload for feed video posts — see create-mux-upload Edge Function. */
export async function createPostVideoUpload(
  supabase: SupabaseClient<Database>,
  postId: string,
  displayOrder = 0
) {
  const { data, error } = await supabase.functions.invoke('create-mux-upload', {
    body: { post_id: postId, display_order: displayOrder },
  });
  if (error) throw error;
  return data as { upload_url: string; post_media_id: string };
}

export async function savePost(supabase: SupabaseClient<Database>, postId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase.from('saves').insert({ user_id: userData.user.id, post_id: postId });
}

export async function unsavePost(supabase: SupabaseClient<Database>, postId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase.from('saves').delete().eq('user_id', userData.user.id).eq('post_id', postId);
}

export async function addComment(
  supabase: SupabaseClient<Database>,
  postId: string,
  content: string,
  parentCommentId?: string
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');
  return supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_user_id: userData.user.id,
      content,
      parent_comment_id: parentCommentId ?? null,
    })
    .select()
    .single();
}

export async function listComments(supabase: SupabaseClient<Database>, postId: string) {
  return supabase
    .from('comments')
    .select('*, public_profiles(first_name, last_name, avatar_url)')
    .eq('post_id', postId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });
}

export async function deleteComment(supabase: SupabaseClient<Database>, commentId: string) {
  return supabase.from('comments').update({ status: 'removed', deleted_at: new Date().toISOString() }).eq('id', commentId);
}
