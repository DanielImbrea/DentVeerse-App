import React from 'react';
import { Alert, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { ProfileMenuRow } from '@mobile/components/ProfileMenuRow';
import { AccountConnectedEmail } from '@mobile/components/AccountConnectedEmail';
import { signOutAndReset } from '@mobile/lib/authSession';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export default function ProfileScreen() {
  const accountType = useAuthStore((s) => s.accountType);
  const userId = useAuthStore((s) => s.userId);

  const { data: patientProfile } = useQuery({
    queryKey: ['my-patient-profile', userId],
    queryFn: () => supabase.from('patient_profiles').select('*').eq('user_id', userId as string).single(),
    enabled: accountType === 'patient' && !!userId,
  });

  const { data: myClinics } = useQuery({
    queryKey: ['my-clinics', userId],
    queryFn: () => supabase.from('clinic_members').select('clinics(*)').eq('user_id', userId as string),
    enabled: accountType === 'clinic' && !!userId,
  });

  const { data: myLabs } = useQuery({
    queryKey: ['my-laboratories', userId],
    queryFn: () => supabase.from('laboratory_members').select('laboratories(*)').eq('user_id', userId as string),
    enabled: accountType === 'laboratory' && !!userId,
  });

  async function handleLogout() {
    try {
      await signOutAndReset();
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Deconectarea a eșuat.');
    }
  }

  const org =
    accountType === 'clinic'
      ? (myClinics?.data?.[0] as unknown as { clinics: Record<string, unknown> } | undefined)?.clinics
      : accountType === 'laboratory'
        ? (myLabs?.data?.[0] as unknown as { laboratories: Record<string, unknown> } | undefined)?.laboratories
        : null;

  const accountLabel =
    accountType === 'patient' ? 'Pacient' : accountType === 'clinic' ? 'Clinică' : accountType === 'laboratory' ? 'Laborator' : 'Cont';

  const verificationHref =
    org && accountType === 'clinic'
      ? (`/verification/submit?subjectType=clinic&subjectId=${String(org.id)}` as const)
      : org && accountType === 'laboratory'
        ? (`/verification/submit?subjectType=laboratory&subjectId=${String(org.id)}` as const)
        : null;

  return (
    <ScreenShell scroll title="Profil">
      <View className="bg-surface border border-border rounded-2xl p-lg gap-sm">
        {accountType === 'patient' ? (
          <>
            <Text className="text-xl font-semibold text-text-primary">
              {patientProfile?.data?.first_name} {patientProfile?.data?.last_name}
            </Text>
            <Text className="text-sm text-text-secondary">{patientProfile?.data?.city ?? '—'}</Text>
          </>
        ) : org ? (
          <>
            <Text className="text-xl font-semibold text-text-primary">{String(org.name)}</Text>
            <Text className="text-sm text-text-secondary">{String(org.city ?? '')}</Text>
            <View className="flex-row gap-xs pt-xs">
              {org.is_verified ? <Badge label="Verificat" variant="verified" /> : null}
              {org.open_for_collaboration ? <Badge label="Deschis colaborare" variant="openForCollaboration" /> : null}
            </View>
          </>
        ) : (
          <Text className="text-sm text-text-secondary">Profilul nu este complet configurat.</Text>
        )}
        <View className="self-start mt-1 bg-primary/10 rounded-full px-3 py-1">
          <Text className="text-xs font-medium text-primary">{accountLabel}</Text>
        </View>
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">Cont</Text>
        <AccountConnectedEmail compact />
        {accountType === 'patient' ? (
          <ProfileMenuRow icon="✏️" label="Editează profilul" description="Nume, oraș" href="/settings/edit-profile" />
        ) : null}
        {org ? (
          <ProfileMenuRow
            icon="🏥"
            label={accountType === 'clinic' ? 'Administrează clinica' : 'Administrează laboratorul'}
            description="Profil, servicii, portofoliu, echipă"
            href={accountType === 'clinic' ? (`/clinic-admin/${String(org.id)}` as const) : (`/laboratory-admin/${String(org.id)}` as const)}
          />
        ) : null}
        <ProfileMenuRow icon="⭐" label="Favoritele mele" href="/favorites" />
        <ProfileMenuRow icon="🔔" label="Notificări" href="/(tabs)/notifications" />
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">Setări</Text>
        <ProfileMenuRow icon="⚙️" label="Setări cont" description="Export date, notificări, confidențialitate" href="/settings" />
        <ProfileMenuRow icon="🔒" label="Schimbă parola" description="Resetare parolă prin email" href="/settings/change-password" />
        {verificationHref ? (
          <ProfileMenuRow icon="✓" label="Verificare identitate" description="Documente pentru badge Verificat" href={verificationHref} />
        ) : null}
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm mb-lg">
        <ProfileMenuRow icon="🚪" label="Deconectare" destructive onPress={handleLogout} />
      </View>
    </ScreenShell>
  );
}
