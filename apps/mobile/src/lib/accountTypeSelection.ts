import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { isOnboardingComplete } from '@mobile/lib/onboarding';

const storageKey = (userId: string) => `account_type_selected:${userId}`;

export async function markAccountTypeSelected(userId: string) {
  await AsyncStorage.setItem(storageKey(userId), '1');
}

/** True after explicit picker / sign-up, or legacy users who already started a profile. */
export async function hasCompletedAccountTypeSelection(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: Database['public']['Enums']['account_type'] | null
): Promise<boolean> {
  if ((await AsyncStorage.getItem(storageKey(userId))) === '1') return true;

  const [patient, clinic, lab] = await Promise.all([
    supabase.from('patient_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('clinics').select('id').eq('owner_user_id', userId).maybeSingle(),
    supabase.from('laboratories').select('id').eq('owner_user_id', userId).maybeSingle(),
  ]);

  if (patient.data || clinic.data || lab.data) return true;

  if (accountType && (await isOnboardingComplete(supabase, userId, accountType))) return true;

  return false;
}
