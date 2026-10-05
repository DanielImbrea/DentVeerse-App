export const dynamic = 'force-static';

export async function GET() {
  const raw =
    process.env.ANDROID_SHA256_FINGERPRINT ??
    process.env.NEXT_PUBLIC_ANDROID_SHA256_FINGERPRINT ??
    '';
  const prints = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (prints.length === 0) {
    return new Response(JSON.stringify({ error: 'Set ANDROID_SHA256_FINGERPRINT on Vercel' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'ro.dentalconnect.app',
        sha256_cert_fingerprints: prints,
      },
    },
  ];
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}
