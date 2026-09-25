import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLaboratoryById, listFollowers } from '@dental/api';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

export default function LaboratoryAdminHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: labData } = useQuery({
    queryKey: ['laboratory-admin-stats', id],
    queryFn: () => getLaboratoryById(supabase, id as string),
    enabled: !!id,
  });

  const { data: followersData } = useQuery({
    queryKey: ['laboratory-followers', id],
    queryFn: () => listFollowers(supabase, 'laboratory', id as string),
    enabled: !!id,
  });

  const followerCount = followersData?.data?.length ?? 0;

  const links = [
    { href: `/laboratory/${id}`, label: 'Vezi profilul public', description: 'Cum te văd clinicile' },
    { href: `/laboratory-admin/${id}/profile-edit`, label: 'Editează profilul', description: 'Logo, experiență, adresă pe hartă' },
    { href: `/laboratory-admin/${id}/services`, label: 'Servicii', description: 'Tipuri de lucrări' },
    { href: `/laboratory-admin/${id}/portfolio`, label: 'Portofoliu', description: 'Cazuri reprezentative' },
    {
      href: `/verification/submit?subjectType=laboratory&subjectId=${id}`,
      label: 'Verificare identitate',
      description: 'Badge Verificat',
    },
  ];

  return (
    <ScreenShell scroll showBack title="Administrează laboratorul" subtitle="Profil public și portofoliu">
      <View className="bg-surface border border-border rounded-2xl p-md mb-sm">
        <Text className="text-2xl font-semibold text-primary text-center">{followerCount}</Text>
        <Text className="text-xs text-text-secondary text-center mt-1">Urmăritori</Text>
        <Text className="text-xs text-text-secondary text-center mt-2">
          Recenziile B2B clinică–laborator vor fi adăugate într-o etapă viitoare.
        </Text>
      </View>

      {links.map((link) => (
        <Link key={link.href} href={link.href as never} asChild>
          <Pressable className="bg-surface border border-border rounded-2xl p-lg mb-sm active:opacity-80">
            <Text className="text-base font-semibold text-text-primary">{link.label}</Text>
            <Text className="text-sm text-text-secondary mt-1">{link.description}</Text>
          </Pressable>
        </Link>
      ))}
    </ScreenShell>
  );
}
