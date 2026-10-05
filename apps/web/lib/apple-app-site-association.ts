import { buildAppleAppSiteAssociation } from '@dental/config/universal-links';
import { SITE } from '@dental/config/site';

function teamIdFromEnv() {
  return (
    process.env.APPLE_TEAM_ID ??
    process.env.NEXT_PUBLIC_APPLE_TEAM_ID ??
    SITE.appleTeamId
  );
}

export function appleAppSiteAssociationResponse() {
  const body = buildAppleAppSiteAssociation(teamIdFromEnv());
  if (!body) {
    return new Response(
      JSON.stringify({
        error: 'APPLE_TEAM_ID not configured — set on Vercel (Settings → Environment Variables).',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
