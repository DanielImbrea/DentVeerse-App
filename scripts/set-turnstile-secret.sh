#!/usr/bin/env bash
# Sets TURNSTILE_SECRET_KEY on Supabase Edge Functions (verify-captcha).
# Get the secret from Cloudflare Turnstile → your widget → Secret key.
#
# Usage:
#   TURNSTILE_SECRET_KEY=0x... ./scripts/set-turnstile-secret.sh
#   # or interactive:
#   ./scripts/set-turnstile-secret.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-tfgtpmfzddipeamlxams}"

if [[ -z "${TURNSTILE_SECRET_KEY:-}" ]]; then
  echo "Paste Cloudflare Turnstile SECRET key (hidden input):"
  read -rs TURNSTILE_SECRET_KEY
  echo ""
fi

if [[ -z "$TURNSTILE_SECRET_KEY" ]]; then
  echo "✗ Empty secret — aborting."
  exit 1
fi

echo "→ Setting TURNSTILE_SECRET_KEY on project $PROJECT_REF ..."
npx supabase secrets set "TURNSTILE_SECRET_KEY=$TURNSTILE_SECRET_KEY" --project-ref "$PROJECT_REF"

echo "✓ Done. Add EXPO_PUBLIC_TURNSTILE_SITE_KEY to apps/mobile/.env and EAS production secrets."
echo "  See docs/21-PASUL-2-TURNSTILE-EAS.md"
