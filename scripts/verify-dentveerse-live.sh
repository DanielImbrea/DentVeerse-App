#!/usr/bin/env bash
# Smoke-test production website (dentveerse.com) for launch blockers.
set -euo pipefail

BASE="${1:-https://www.dentveerse.com}"
fail=0
ok=0

check() {
  local label="$1"
  local url="$2"
  local expect="${3:-200}"
  local code
  code=$(curl -sL -o /dev/null -w '%{http_code}' "$url" || true)
  if [[ "$code" == "$expect" ]]; then
    echo "✓ $label ($code) — $url"
    ok=$((ok + 1))
  else
    echo "✗ $label (expected $expect, got $code) — $url"
    fail=$((fail + 1))
  fi
}

check_json_aasa() {
  local url="$1/.well-known/apple-app-site-association"
  local body
  body=$(curl -sL "$url" || true)
  if echo "$body" | grep -q '"applinks"'; then
    echo "✓ Apple App Site Association JSON — $url"
    ok=$((ok + 1))
  elif echo "$body" | grep -q 'TEAMID'; then
    echo "⚠ AASA reachable but TEAMID placeholder — set APPLE_TEAM_ID on Vercel"
    fail=$((fail + 1))
  else
    echo "✗ Missing or invalid AASA — $url"
    fail=$((fail + 1))
  fi
}

echo "Checking $BASE ..."
check "Homepage" "$BASE/"
check "Auth callback" "$BASE/auth/callback"
check "Reset password" "$BASE/auth/reset-password"
check_json_aasa "$BASE"

asset=$(curl -sL -o /dev/null -w '%{http_code}' "$BASE/.well-known/assetlinks.json" || true)
if [[ "$asset" == "200" ]]; then
  body=$(curl -sL "$BASE/.well-known/assetlinks.json")
  if echo "$body" | grep -q 'sha256_cert_fingerprints'; then
    echo "✓ Android assetlinks.json"
    ok=$((ok + 1))
  else
    echo "✗ assetlinks.json invalid body"
    fail=$((fail + 1))
  fi
else
  echo "✗ Android assetlinks.json (HTTP $asset)"
  fail=$((fail + 1))
fi

echo ""
if [[ $fail -eq 0 ]]; then
  echo "Live site checks passed ($ok). See docs/22-CHECKLIST-LANSARE-PILOT.md"
  exit 0
fi
echo "$fail check(s) failed. Patch: deploy/dentveerse-live-well-known/README.md"
exit 1
