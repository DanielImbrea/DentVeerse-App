import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountType, Database } from '@dental/types';

export type PatientProfileGap = {
  missingFirstName: boolean;
  missingLastName: boolean;
  missingDateOfBirth: boolean;
  /** Profile row exists with name but DOB was added later as a requirement. */
  returningUserMissingDobOnly: boolean;
};

export async function getPatientProfileGap(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PatientProfileGap> {
  const { data } = await supabase
    .from('patient_profiles')
    .select('first_name, last_name, date_of_birth')
    .eq('user_id', userId)
    .maybeSingle();

  const missingFirstName = !data?.first_name?.trim();
  const missingLastName = !data?.last_name?.trim();
  const missingDateOfBirth = !data?.date_of_birth;

  return {
    missingFirstName,
    missingLastName,
    missingDateOfBirth,
    returningUserMissingDobOnly: !missingFirstName && !missingLastName && missingDateOfBirth,
  };
}

export async function isOnboardingComplete(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: AccountType
): Promise<boolean> {
  if (accountType === 'patient') {
    const { data } = await supabase
      .from('patient_profiles')
      .select('first_name, last_name, date_of_birth')
      .eq('user_id', userId)
      .maybeSingle();
    return Boolean(data?.first_name?.trim() && data?.last_name?.trim() && data?.date_of_birth);
  }

  if (accountType === 'clinic') {
    const { data: clinic } = await supabase.from('clinics').select('id').eq('owner_user_id', userId).maybeSingle();
    if (!clinic) return false;
    const { count } = await supabase
      .from('clinic_services')
      .select('*', { count: 'exact', head: true })
      .eq('clinic_id', clinic.id);
    return (count ?? 0) > 0;
  }

  const { data: lab } = await supabase.from('laboratories').select('id').eq('owner_user_id', userId).maybeSingle();
  if (!lab) return false;
  const { count } = await supabase
    .from('laboratory_services')
    .select('*', { count: 'exact', head: true })
    .eq('laboratory_id', lab.id);
  return (count ?? 0) > 0;
}

export async function getOnboardingPath(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: AccountType
): Promise<string> {
  if (accountType === 'patient') return '/(onboarding)/patient/profile';

  if (accountType === 'clinic') {
    const { data: clinic } = await supabase.from('clinics').select('id').eq('owner_user_id', userId).maybeSingle();
    return clinic ? '/(onboarding)/clinic/services' : '/(onboarding)/clinic/profile';
  }

  const { data: lab } = await supabase.from('laboratories').select('id').eq('owner_user_id', userId).maybeSingle();
  return lab ? '/(onboarding)/laboratory/services' : '/(onboarding)/laboratory/profile';
}
