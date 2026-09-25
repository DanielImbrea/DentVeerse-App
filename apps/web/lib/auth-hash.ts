/** Parse Supabase auth redirect tokens from the URL hash fragment. */
export function parseAuthHashFromWindow(): {
  access_token: string;
  refresh_token: string;
  type: string | null;
} | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;

  return {
    access_token,
    refresh_token,
    type: params.get('type'),
  };
}
