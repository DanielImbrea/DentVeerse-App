import * as Location from 'expo-location';

type AddressParts = {
  address?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
};

/** Geocodes a Romanian address using the device geocoder (expo-location). */
export async function geocodeAddress(parts: AddressParts): Promise<{ lat: number; lng: number } | null> {
  const query = [parts.address, parts.city, parts.county, parts.country ?? 'România']
    .filter((part) => part && String(part).trim().length > 0)
    .join(', ');

  if (query.length < 3) return null;

  const results = await Location.geocodeAsync(query);
  const first = results[0];
  if (!first) return null;

  return { lat: first.latitude, lng: first.longitude };
}
