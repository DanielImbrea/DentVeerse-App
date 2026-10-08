import React, { useEffect } from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLaboratoryById, listLaboratoryServices, listOwnerPortfolio, listFollowers } from '@dental/api';
import { track } from '@dental/analytics';
import { Badge, ErrorState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { OrgContactBar } from '@mobile/features/profile/OrgContactBar';
import { OrgPublicProfileHero } from '@mobile/features/profile/OrgPublicProfileHero';
import { supabase } from '@mobile/lib/supabase';

export default function LaboratoryProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: labData, isLoading, isError, refetch } = useQuery({
    queryKey: ['laboratory', id],
    queryFn: () => getLaboratoryById(supabase, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (labData?.data) {
      track({ name: 'profile_viewed', properties: { target_type: 'laboratory', target_id: labData.data.id } });
    }
  }, [labData?.data?.id]);

  const { data: servicesData } = useQuery({
    queryKey: ['laboratory-services', id],
    queryFn: () => listLaboratoryServices(supabase, id as string),
    enabled: !!id,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['laboratory-portfolio', id],
    queryFn: () => listOwnerPortfolio(supabase, 'laboratory', id as string),
    enabled: !!id,
  });

  const { data: followersData } = useQuery({
    queryKey: ['laboratory-followers', id],
    queryFn: () => listFollowers(supabase, 'laboratory', id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <ScreenShell showBack title="Laborator">
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={100} />
        ))}
      </ScreenShell>
    );
  }

  if (isError || !labData?.data) {
    return (
      <ScreenShell showBack title="Laborator">
        <ErrorState message="Nu am putut încărca laboratorul." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const lab = labData.data;
  const services = servicesData?.data ?? [];
  const portfolio = portfolioData?.data ?? [];
  const followerCount = followersData?.data?.length ?? 0;

  return (
    <ScreenShell scroll showBack title={lab.name} subtitle={lab.city ?? undefined}>
      <View className="w-full gap-lg">
        <OrgPublicProfileHero
          logoUrl={lab.logo_url}
          fallbackEmoji="🧪"
          badges={
            <>
              {lab.is_verified ? <Badge label="Verificat" variant="verified" /> : null}
              {lab.open_for_collaboration ? <Badge label="Deschis colaborări" variant="openForCollaboration" /> : null}
              {lab.collaboration_zone ? <Badge label={lab.collaboration_zone} variant="neutral" /> : null}
            </>
          }
          statsLine={`${lab.years_experience ? `${lab.years_experience} ani experiență · ` : ''}${lab.team_size ? `${lab.team_size} persoane · ` : ''}${followerCount} urmăritori`}
          description={lab.description}
        />

        <View className="w-full rounded-2xl border border-border bg-surface p-lg">
          <OrgContactBar orgType="laboratory" orgId={lab.id} orgName={lab.name} ownerUserId={lab.owner_user_id} />
        </View>

        {services.length > 0 ? (
          <View className="gap-sm w-full rounded-2xl border border-border bg-surface p-lg">
            <Text className="text-base font-semibold text-text-primary">Servicii</Text>
            <View className="flex-row flex-wrap gap-xs">
              {services.map((s: { id: string; custom_title?: string | null; services?: { label_ro?: string } }) => (
                <Badge key={s.id} label={s.custom_title ?? s.services?.label_ro ?? ''} variant="neutral" />
              ))}
            </View>
          </View>
        ) : null}

        {portfolio.length > 0 ? (
          <View className="gap-sm w-full rounded-2xl border border-border bg-surface p-lg">
            <Text className="text-base font-semibold text-text-primary">Portofoliu</Text>
            <View className="flex-row flex-wrap gap-xs">
              {portfolio.slice(0, 6).map((p: { id: string; portfolio_media?: Array<{ media_type: string; storage_path: string; thumbnail_url?: string | null }> }) => (
                <Link key={p.id} href={`/portfolio-item/${p.id}`} asChild>
                  <Pressable>
                    {p.portfolio_media?.[0] ? (
                      <Image
                        source={{
                          uri:
                            p.portfolio_media[0].media_type === 'video'
                              ? p.portfolio_media[0].thumbnail_url ?? undefined
                              : supabase.storage.from('portfolio').getPublicUrl(p.portfolio_media[0].storage_path).data.publicUrl,
                        }}
                        className="w-20 h-20 rounded-md bg-border"
                      />
                    ) : (
                      <View className="w-20 h-20 rounded-md bg-border" />
                    )}
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}
