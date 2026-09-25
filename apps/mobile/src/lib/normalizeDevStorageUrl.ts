/** Rewrites localhost storage URLs so physical devices can load Supabase files in dev. */
export function normalizeDevStorageUrl(url: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) return url;

  try {
    const signed = new URL(url);
    if (signed.hostname !== '127.0.0.1' && signed.hostname !== 'localhost') {
      return url;
    }
    const devBase = new URL(base);
    signed.protocol = devBase.protocol;
    signed.hostname = devBase.hostname;
    signed.port = devBase.port;
    return signed.toString();
  } catch {
    return url;
  }
}
