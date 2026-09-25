export type LatLng = { lat: number; lng: number };

/** Parses PostGIS geography when PostgREST returns GeoJSON. */
export function parseStoredLocation(raw: unknown): LatLng | null {
  if (!raw || typeof raw !== 'object') return null;
  const geo = raw as { type?: string; coordinates?: number[] };
  if (geo.type !== 'Point' || !Array.isArray(geo.coordinates) || geo.coordinates.length < 2) return null;
  const [lng, lat] = geo.coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}
