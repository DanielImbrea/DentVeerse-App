import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountType, Database } from '@dental/types';

export type ActingAs = {
  type: 'patient' | 'clinic' | 'laboratory';
  id: string;
};

export type MyOrgContext = {
  orgId: string;
  orgType: 'clinic' | 'laboratory';
  orgName: string | null;
};

/** Resolves the user's primary organization membership (first clinic or lab). */
export async function resolveMyOrg(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: AccountType
): Promise<MyOrgContext | null> {
  if (accountType === 'clinic') {
    const { data } = await supabase
      .from('clinic_members')
      .select('clinic_id, clinics(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!data?.clinic_id) return null;
    const clinics = data.clinics as { name: string } | { name: string }[] | null;
    const name = Array.isArray(clinics) ? clinics[0]?.name : clinics?.name;
    return { orgId: data.clinic_id, orgType: 'clinic', orgName: name ?? null };
  }

  if (accountType === 'laboratory') {
    const { data } = await supabase
      .from('laboratory_members')
      .select('laboratory_id, laboratories(name)')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!data?.laboratory_id) return null;
    const labs = data.laboratories as { name: string } | { name: string }[] | null;
    const name = Array.isArray(labs) ? labs[0]?.name : labs?.name;
    return { orgId: data.laboratory_id, orgType: 'laboratory', orgName: name ?? null };
  }

  return null;
}

/** Who the current user is acting as when starting a conversation. */
export async function resolveMyActingAs(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: AccountType | null
): Promise<ActingAs | null> {
  if (!accountType || !userId) return null;

  if (accountType === 'patient') {
    return { type: 'patient', id: userId };
  }

  const org = await resolveMyOrg(supabase, userId, accountType);
  if (!org) return null;
  return { type: org.orgType, id: org.orgId };
}

/** Verifies the user belongs to the given org id for their account type. */
export async function verifyOrgMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountType: AccountType,
  orgId: string
): Promise<boolean> {
  if (accountType === 'clinic') {
    const { data } = await supabase
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', userId)
      .eq('clinic_id', orgId)
      .maybeSingle();
    return !!data;
  }

  if (accountType === 'laboratory') {
    const { data } = await supabase
      .from('laboratory_members')
      .select('laboratory_id')
      .eq('user_id', userId)
      .eq('laboratory_id', orgId)
      .maybeSingle();
    return !!data;
  }

  return false;
}
