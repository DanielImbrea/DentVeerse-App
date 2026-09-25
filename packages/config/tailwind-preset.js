// Shared Tailwind preset — consumed by apps/web, apps/admin, and (via nativewind)
// apps/mobile, so the brand tokens defined in tokens.json are the single source of
// truth across all three surfaces. See docs/04-mobile.md §4 for token rationale.
const tokens = require('./tokens.json');

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: tokens.color.primary, dark: tokens.color.primaryDark },
        secondary: tokens.color.secondary,
        accent: tokens.color.accent,
        background: tokens.color.background,
        surface: { DEFAULT: tokens.color.surface, dark: tokens.color.surfaceDark },
        border: tokens.color.border,
        /** Prefer `text-foreground` / `text-muted` on RN — `text-text-primary` can fail to apply. */
        foreground: tokens.color.textPrimary,
        muted: tokens.color.textSecondary,
        text: { primary: tokens.color.textPrimary, secondary: tokens.color.textSecondary },
        success: tokens.color.success,
        warning: tokens.color.warning,
        error: tokens.color.error,
      },
      fontFamily: {
        display: [tokens.typography.fontDisplay, 'serif'],
        body: [tokens.typography.fontBody, 'sans-serif'],
        button: [tokens.typography.fontButton, 'sans-serif'],
      },
      borderRadius: {
        sm: `${tokens.radius.sm}px`,
        md: `${tokens.radius.md}px`,
        lg: `${tokens.radius.lg}px`,
        full: `${tokens.radius.full}px`,
      },
      spacing: Object.fromEntries(
        Object.entries(tokens.spacing).map(([k, v]) => [k, `${v}px`])
      ),
    },
  },
  plugins: [],
};
