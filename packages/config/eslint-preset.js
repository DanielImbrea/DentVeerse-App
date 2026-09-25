// Shared ESLint preset. Every app extends this. The i18next/no-literal-string rule
// is REQUIRED — see docs/11-gdpr-i18n.md ("no user-facing string is ever hardcoded")
// and docs/15-ai-agent-instructions.md rule 16. Do not disable it per-file without a
// documented reason (e.g. a non-user-facing debug/log string).
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:i18next/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'i18next'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'i18next/no-literal-string': [
      'warn',
      {
        markupOnly: true,
        ignoreAttribute: ['testID', 'accessibilityLabel', 'className', 'style'],
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  env: { es2021: true, node: true },
};
