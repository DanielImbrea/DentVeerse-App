#!/usr/bin/env bash
# Links the repo to Supabase cloud staging and applies schema + catalog seed.
# Prerequisites: npx supabase login (once) + DB password from project creation.
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-tfgtpmfzddipeamlxams}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Checking Supabase CLI auth..."
if ! npx supabase projects list --output json >/dev/null 2>&1; then
  echo ""
  echo "Not logged in. Run this first (opens browser):"
  echo "  npx supabase login"
  echo ""
  echo "Or create a token at https://supabase.com/dashboard/account/tokens and run:"
  echo "  npx supabase login --token YOUR_TOKEN"
  exit 1
fi

echo "→ Linking project ref: $PROJECT_REF (MVP production backend — see docs/20-PASUL-1-SUPABASE-PRODUCTION.md)"
npx supabase link --project-ref "$PROJECT_REF" --yes

echo "→ Pushing migrations + seed.sql to remote..."
npx supabase db push --linked --include-all --include-seed

echo "→ Deploying Edge Functions..."
npx supabase functions deploy --project-ref "$PROJECT_REF"

echo ""
echo "✓ Staging schema deployed."
echo ""
echo "Next:"
echo "  1. Dashboard → Settings → API → copy URL + anon + service_role keys"
echo "  2. Fill .env.staging from .env.staging.example (never commit .env.staging)"
echo "  3. Optional demo orgs: paste supabase/seed-demo-orgs.sql in SQL Editor"
echo "  4. Auth → URL config: Site URL https://dentveerse.com + redirects (see docs/20-PASUL-1-SUPABASE-PRODUCTION.md §1.2)"
echo "  5. pnpm verify:supabase-prod"
