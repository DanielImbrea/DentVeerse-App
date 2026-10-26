import type { EdgeInsets } from 'react-native-safe-area-context';

/** Shared auth scroll padding — keeps social buttons above the home indicator. */
export function authScrollContentPadding(insets: EdgeInsets, options?: { centerVertically?: boolean }) {
  const centerVertically = options?.centerVertically ?? true;
  return {
    flexGrow: 1,
    ...(centerVertically ? { justifyContent: 'center' as const } : {}),
    paddingTop: insets.top + (centerVertically ? 38 : 16),
    paddingBottom: Math.max(insets.bottom, 20) + 80,
  };
}
