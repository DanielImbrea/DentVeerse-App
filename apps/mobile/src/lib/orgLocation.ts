import { setClinicLocation, setLaboratoryLocation } from '@dental/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { parseStoredLocation, type LatLng } from '@dental/utils';
import { geocodeAddress } from '@mobile/lib/geocode';

export type { LatLng } from '@dental/utils';
export { parseStoredLocation } from '@dental/utils';

type AddressParts = {
  address?: string | null;
  city?: string | null;
  county?: string | null;
};

export async function persistOrgLocation(
  supabase: SupabaseClient<Database>,
  orgType: 'clinic' | 'laboratory',
  orgId: string,
  pin: LatLng | null,
  addressParts: AddressParts
): Promise<{ saved: boolean; error?: string }> {
  let coords = pin;
  if (!coords) {
    coords = await geocodeAddress(addressParts);
  }
  if (!coords) return { saved: false };

  const { error } =
    orgType === 'clinic'
      ? await setClinicLocation(supabase, orgId, coords.lat, coords.lng)
      : await setLaboratoryLocation(supabase, orgId, coords.lat, coords.lng);

  if (error) return { saved: false, error: error.message };
  return { saved: true };
}
