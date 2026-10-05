import { buildAndroidAssetLinks } from '@dental/config/universal-links';

export const dynamic = 'force-static';

function sha256FromEnv(): string[] {
  const single =
    process.env.ANDROID_SHA256_FINGERPRINT ??
    process.env.NEXT_PUBLIC_ANDROID_SHA256_FINGERPRINT ??
    '';
  if (single) return single.split(',').map((s) => s.trim());
  return [];
}

export async function GET() {
  const body = buildAndroidAssetLinks(sha256FromEnv());
  if (!body) {
    return new Response(
      JSON.stringify({
        error:
          'ANDROID_SHA256_FINGERPRINT not configured — copy from EAS credentials or Play Console.',
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
