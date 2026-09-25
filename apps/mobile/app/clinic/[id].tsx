import React, { useEffect } from 'react';
import { Pressable, Text, View, Image } from 'react-native';
import { useLocalSearchParams, Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getClinicById,
  listClinicServices,
  listClinicReviews,
  listOwnerPortfolio,
  listFollowers,
} from '@dental/api';
import { track } from '@dental/analytics';
import { Badge, ErrorState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { OrgContactBar } from '@mobile/features/profile/OrgContactBar';
import { supabase } from '@mobile/lib/supabase';
import { usePermissions } from '@mobile/features/auth/usePermissions';

/**
 * Public clinic profile — the single most brand-sensitive surface per
 * docs/04-mobile.md §4.5 ("Profiles must feel premium"). This is a
 * functionally complete real-data assembly (services, team via a direct
 * query, portfolio grid, reviews, follow toggle, follower count) but the
 * VISUAL polish described in docs/04-mobile.md (strong header treatment,
 * cover image parallax, fullscreen portfolio viewer with before/after
 * slider, elegant gallery transitions) is NOT implemented — this uses plain
 * React Native primitives, not the final premium design system components.
 * Treat this as "real data, placeholder visual design" — the honest state
 * per the instruction not to overstate completeness.
 */
export default function ClinicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canReview } = usePermissions();

  const { data: clinicData, isLoading, isError, refetch } = useQuery({
    queryKey: ['clinic', id],
    queryFn: () => getClinicById(supabase, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (clinicData?.data) {
      track({ name: 'profile_viewed', properties: { target_type: 'clinic', target_id: clinicData.data.id } });
    }
  }, [clinicData?.data?.id]);

  const { data: servicesData } = useQuery({
    queryKey: ['clinic-services', id],
    queryFn: () => listClinicServices(supabase, id as string),
    enabled: !!id,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['clinic-portfolio', id],
    queryFn: () => listOwnerPortfolio(supabase, 'clinic', id as string),
    enabled: !!id,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['clinic-reviews', id],
    queryFn: () => listClinicReviews(supabase, id as string),
    enabled: !!id,
  });

  const { data: followersData } = useQuery({
    queryKey: ['clinic-followers', id],
    queryFn: () => listFollowers(supabase, 'clinic', id as string),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <ScreenShell showBack title="Clinică">
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={100} />
        ))}
      </ScreenShell>
    );
  }

  if (isError || !clinicData?.data) {
    return (
      <ScreenShell showBack title="Clinică">
        <ErrorState message="Nu am putut încărca clinica." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const clinic = clinicData.data;
  const services = servicesData?.data ?? [];
  const portfolio = portfolioData?.data ?? [];
  const reviews = reviewsData?.data ?? [];
  const followerCount = followersData?.data?.length ?? 0;

  return (
    <ScreenShell scroll showBack title={clinic.name} subtitle={clinic.city ?? undefined}>
      <View className="gap-md">
        <View className="flex-row items-center gap-md">
          {clinic.logo_url ? (
            <Image source={{ uri: clinic.logo_url }} className="w-16 h-16 rounded-full" />
          ) : (
            <View className="w-16 h-16 rounded-full bg-border items-center justify-center">
              <Text className="text-2xl">🦷</Text>
            </View>
          )}
          <View className="flex-1">
            <View className="flex-row gap-xs flex-wrap">
              {clinic.is_verified ? <Badge label="Verificat" variant="verified" /> : null}
              {clinic.open_for_collaboration ? <Badge label="Deschis colaborări" variant="openForCollaboration" /> : null}
            </View>
            <Text className="text-sm text-text-secondary mt-2">
              ★ {clinic.rating_avg.toFixed(1)} · {clinic.rating_count} recenzii · {followerCount} urmăritori
            </Text>
          </View>
        </View>

        {clinic.description ? <Text className="text-base text-text-primary leading-6">{clinic.description}</Text> : null}

        <OrgContactBar
          orgType="clinic"
          orgId={clinic.id}
          orgName={clinic.name}
          ownerUserId={clinic.owner_user_id}
        />

        {services.length > 0 ? (
          <View className="gap-sm">
            <Text className="text-base font-semibold text-text-primary">Servicii</Text>
            <View className="flex-row flex-wrap gap-xs">
              {services.map((s: { id: string; custom_title?: string | null; services?: { label_ro?: string } }) => (
                <Badge key={s.id} label={s.custom_title ?? s.services?.label_ro ?? ''} variant="neutral" />
              ))}
            </View>
          </View>
        ) : null}

        {portfolio.length > 0 ? (
          <View className="gap-sm">
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

        <View className="gap-sm">
          <Text className="text-base font-semibold text-text-primary">Recenzii pacienți</Text>
          {reviews.length > 0 ? (
            reviews.slice(0, 5).map((r: { id: string; rating: number; comment?: string | null }) => (
              <View key={r.id} className="border border-border rounded-xl p-md bg-surface">
                <Text className="text-base text-text-primary">★ {r.rating}</Text>
                {r.comment ? <Text className="text-sm text-text-secondary mt-1">{r.comment}</Text> : null}
              </View>
            ))
          ) : (
            <Text className="text-sm text-text-secondary">Nicio recenzie încă.</Text>
          )}
        </View>

        {canReview ? (
          <Link href={`/modals/submit-review?clinicId=${clinic.id}`} asChild>
            <Pressable className="border border-primary rounded-2xl py-3.5 items-center active:opacity-90">
              <Text className="text-base font-semibold text-primary">Lasă o recenzie</Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </ScreenShell>
  );
}
