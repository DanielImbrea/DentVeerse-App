import { describe, expect, it } from 'vitest';
import { formatFeedTimestamp } from './formatFeedDate';

describe('formatFeedTimestamp', () => {
  it('returns Acum for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatFeedTimestamp(now)).toBe('Acum');
  });

  it('formats minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatFeedTimestamp(fiveMinAgo)).toBe('Acum 5 min');
  });
});
