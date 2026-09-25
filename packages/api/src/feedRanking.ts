import type { FeedContentFilter } from './feedTypes';

/** Maps feed content filter chips to post_type values. */
export function postTypesForContentFilter(filter: FeedContentFilter = 'all'): string[] | null {
  switch (filter) {
    case 'media':
      return ['photo', 'video'];
    case 'announcement':
      return ['announcement'];
    case 'portfolio':
      return ['portfolio'];
    case 'collaboration':
      return ['collaboration'];
    case 'text':
      return ['text'];
    default:
      return null;
  }
}

/** ~80% followed / ~20% discovery interleave for the "Pentru tine" feed. */
export function mergeWeightedFeed<T extends { created_at: string }>(
  followed: T[],
  discovery: T[],
  pageSize: number
): T[] {
  const result: T[] = [];
  let fi = 0;
  let di = 0;

  while (result.length < pageSize && (fi < followed.length || di < discovery.length)) {
    for (let i = 0; i < 4 && fi < followed.length && result.length < pageSize; i += 1) {
      result.push(followed[fi]!);
      fi += 1;
    }
    if (di < discovery.length && result.length < pageSize) {
      result.push(discovery[di]!);
      di += 1;
    }
    if (di >= discovery.length) {
      while (fi < followed.length && result.length < pageSize) {
        result.push(followed[fi]!);
        fi += 1;
      }
      break;
    }
  }

  return result;
}
