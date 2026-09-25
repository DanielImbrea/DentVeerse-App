import { describe, expect, it } from 'vitest';
import { formatBytes, MESSAGE_ATTACHMENT_MAX_BYTES, POST_REACTION_TYPES } from './limits';

describe('limits', () => {
  it('defines four post reaction types', () => {
    expect(POST_REACTION_TYPES).toEqual(['appreciate', 'love', 'support', 'congrats']);
  });

  it('formats byte sizes for user messages', () => {
    expect(formatBytes(512 * 1024)).toBe('512 KB');
    expect(formatBytes(MESSAGE_ATTACHMENT_MAX_BYTES)).toBe('8.0 MB');
  });
});
