#!/usr/bin/env bash
# Quick sanity check: mobile env points at the agreed production Supabase project.
set -euo pipefail

EXPECTED_REF="tfgtpmfzddipeamlxams"
MOBILE_ENV="${1:-$(cd "$(dirname "$0")/.." && pwd)/apps/mobile/.env}"

if [[ ! -f "$MOBILE_ENV" ]]; then
  echo "✗ Missing $MOBILE_ENV"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$MOBILE_ENV"
set +a

ok=0
fail=0

if [[ "${EXPO_PUBLIC_SUPABASE_URL:-}" == *"${EXPECTED_REF}"* ]]; then
  echo "✓ EXPO_PUBLIC_SUPABASE_URL → project ref $EXPECTED_REF"
  ok=$((ok + 1))
else
  echo "✗ EXPO_PUBLIC_SUPABASE_URL (expected *${EXPECTED_REF}*, got: ${EXPO_PUBLIC_SUPABASE_URL:-empty})"
  fail=$((fail + 1))
fi

if [[ "${EXPO_PUBLIC_SITE_URL:-}" == "https://dentveerse.com" ]]; then
  echo "✓ EXPO_PUBLIC_SITE_URL"
  ok=$((ok + 1))
else
  echo "✗ EXPO_PUBLIC_SITE_URL (expected https://dentveerse.com, got: ${EXPO_PUBLIC_SITE_URL:-empty})"
  fail=$((fail + 1))
fi
[[ -n "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]] && echo "✓ EXPO_PUBLIC_SUPABASE_ANON_KEY set" && ok=$((ok + 1)) || { echo "✗ EXPO_PUBLIC_SUPABASE_ANON_KEY missing"; fail=$((fail + 1)); }

if [[ -n "${EXPO_PUBLIC_TURNSTILE_SITE_KEY:-}" ]]; then
  echo "✓ EXPO_PUBLIC_TURNSTILE_SITE_KEY set"
  ok=$((ok + 1))
else
  echo "✗ EXPO_PUBLIC_TURNSTILE_SITE_KEY missing (signup blocked in release builds)"
  fail=$((fail + 1))
fi

echo ""
if [[ $fail -eq 0 ]]; then
  echo "All checks passed ($ok). Backend = production project $EXPECTED_REF."
  exit 0
fi
echo "$fail check(s) failed. See docs/20-PASUL-1-SUPABASE-PRODUCTION.md"
exit 1
