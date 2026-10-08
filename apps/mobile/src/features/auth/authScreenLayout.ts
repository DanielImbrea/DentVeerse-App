import type { EdgeInsets } from 'react-native-safe-area-context';

/** Shared auth scroll padding — keeps social buttons above the home indicator. */
export function authScrollContentPadding(insets: EdgeInsets) {
  return {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingTop: insets.top + 38,
    paddingBottom: Math.max(insets.bottom, 20) + 48,
  };
}
