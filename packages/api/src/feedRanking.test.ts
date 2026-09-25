import { describe, expect, it } from 'vitest';
import { mergeWeightedFeed, postTypesForContentFilter } from './feedRanking';

describe('postTypesForContentFilter', () => {
  it('returns null for all', () => {
    expect(postTypesForContentFilter('all')).toBeNull();
  });

  it('maps media to photo and video', () => {
    expect(postTypesForContentFilter('media')).toEqual(['photo', 'video']);
  });

  it('maps announcement', () => {
    expect(postTypesForContentFilter('announcement')).toEqual(['announcement']);
  });
});

describe('mergeWeightedFeed', () => {
  const followed = [
    { id: 'f1', created_at: '2026-01-04' },
    { id: 'f2', created_at: '2026-01-03' },
    { id: 'f3', created_at: '2026-01-02' },
    { id: 'f4', created_at: '2026-01-01' },
    { id: 'f5', created_at: '2025-12-31' },
  ];
  const discovery = [
    { id: 'd1', created_at: '2026-01-05' },
    { id: 'd2', created_at: '2026-01-02' },
  ];

  it('interleaves 4 followed then 1 discovery', () => {
    const merged = mergeWeightedFeed(followed, discovery, 5);
    expect(merged.map((p) => p.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'd1']);
  });

  it('fills with followed when discovery is exhausted', () => {
    const merged = mergeWeightedFeed(followed, discovery, 7);
    expect(merged.map((p) => p.id)).toEqual(['f1', 'f2', 'f3', 'f4', 'd1', 'f5', 'd2']);
  });

  it('returns empty for empty inputs', () => {
    expect(mergeWeightedFeed([], [], 10)).toEqual([]);
  });
});
