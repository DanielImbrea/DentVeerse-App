export type FeedSortMode = 'for_you' | 'recent';
export type FeedAuthorFilter = 'all' | 'clinic' | 'laboratory';
export type FeedContentFilter = 'all' | 'media' | 'announcement' | 'portfolio' | 'collaboration' | 'text';

export interface FeedPageParams {
  cursor?: string | null;
  pageSize?: number;
  sortMode?: FeedSortMode;
  authorFilter?: FeedAuthorFilter;
  contentFilter?: FeedContentFilter;
  followedOnly?: boolean;
}

export interface DiscoveryFeedParams extends FeedPageParams {
  followedClinicIds?: string[];
  followedLaboratoryIds?: string[];
}
