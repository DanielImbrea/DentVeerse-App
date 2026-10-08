import type { EdgeInsets } from 'react-native-safe-area-context';

/** Shared auth scroll padding — keeps social buttons above the home indicator. */
export function authScrollContentPadding(insets: EdgeInsets) {
  return {
    paddingTop: insets.top + 8,
    paddingBottom: Math.max(insets.bottom, 20) + 48,
  } as const;
}
