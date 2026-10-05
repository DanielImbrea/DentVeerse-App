export const dynamic = 'force-static';

function aasaBody() {
  const teamId =
    process.env.APPLE_TEAM_ID ??
    process.env.NEXT_PUBLIC_APPLE_TEAM_ID ??
    'TR36PR6252';
  if (!teamId) return null;
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${teamId}.ro.dentalconnect.app`,
          paths: ['/auth/*', '/open/*'],
        },
      ],
    },
  };
}

export async function GET() {
  const body = aasaBody();
  if (!body) {
    return new Response(JSON.stringify({ error: 'Set APPLE_TEAM_ID on Vercel' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
