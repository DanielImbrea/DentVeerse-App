/** Platform-wide limits mirrored from public.platform_limits (see migrations). */

export const MESSAGE_ATTACHMENT_MAX_BYTES = 8 * 1024 * 1024; // 8 MiB
export const MESSAGE_ATTACHMENT_TARGET_BYTES = 2 * 1024 * 1024; // client compression goal
export const MESSAGE_ATTACHMENT_MAX_EDGE_PX = 2048;
export const MESSAGES_PAGE_SIZE = 30;
export const CHAT_MESSAGE_MAX_LENGTH = 4000;

export const POST_REACTION_TYPES = ['appreciate', 'love', 'support', 'congrats'] as const;
export type PostReactionType = (typeof POST_REACTION_TYPES)[number];

export const POST_REACTION_META: Record<
  PostReactionType,
  { emoji: string; labelRo: string; sortOrder: number }
> = {
  appreciate: { emoji: '👍', labelRo: 'Apreciere', sortOrder: 0 },
  love: { emoji: '❤️', labelRo: 'Drag', sortOrder: 1 },
  support: { emoji: '🤗', labelRo: 'Sprijin', sortOrder: 2 },
  congrats: { emoji: '👏', labelRo: 'Felicitări', sortOrder: 3 },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
