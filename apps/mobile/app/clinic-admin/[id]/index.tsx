import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getClinicById, listClinicReviews, listFollowers } from '@dental/api';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

export default function ClinicAdminHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: clinicData } = useQuery({
    queryKey: ['clinic-admin-stats', id],
    queryFn: () => getClinicById(supabase, id as string),
    enabled: !!id,
  });

  const { data: followersData } = useQuery({
    queryKey: ['clinic-followers', id],
    queryFn: () => listFollowers(supabase, 'clinic', id as string),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['clinic-reviews', id],
    queryFn: () => listClinicReviews(supabase, id as string),
    enabled: !!id,
  });

  const clinic = clinicData?.data;
  const followerCount = followersData?.data?.length ?? 0;
  const reviewCount = reviewsData?.data?.length ?? clinic?.rating_count ?? 0;

  const links = [
    { href: `/clinic/${id}`, label: 'Vezi profilul public', description: 'Cum te văd pacienții' },
    { href: `/clinic-admin/${id}/profile-edit`, label: 'Editează profilul', description: 'Logo, descriere, adresă pe hartă' },
    { href: `/clinic-admin/${id}/team`, label: 'Echipă', description: 'Stomatologi și specializări' },
    { href: `/clinic-admin/${id}/services`, label: 'Servicii', description: 'Catalog și prețuri' },
    { href: `/clinic-admin/${id}/portfolio`, label: 'Portofoliu', description: 'Cazuri și lucrări' },
    {
      href: `/verification/submit?subjectType=clinic&subjectId=${id}`,
      label: 'Verificare identitate',
      description: 'Badge Verificat',
    },
  ];

  return (
    <ScreenShell scroll showBack title="Administrează clinica" subtitle="Profil public, servicii și echipă">
      <View className="flex-row gap-sm mb-sm">
        <View className="flex-1 bg-surface border border-border rounded-2xl p-md items-center">
          <Text className="text-2xl font-semibold text-primary">{followerCount}</Text>
          <Text className="text-xs text-text-secondary mt-1">Urmăritori</Text>
        </View>
        <View className="flex-1 bg-surface border border-border rounded-2xl p-md items-center">
          <Text className="text-2xl font-semibold text-primary">{reviewCount}</Text>
          <Text className="text-xs text-text-secondary mt-1">Recenzii</Text>
        </View>
        <View className="flex-1 bg-surface border border-border rounded-2xl p-md items-center">
          <Text className="text-2xl font-semibold text-primary">{clinic?.rating_avg?.toFixed(1) ?? '—'}</Text>
          <Text className="text-xs text-text-secondary mt-1">Rating</Text>
        </View>
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
