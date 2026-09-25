import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listInterestsForOpportunity,
  registerInterest,
  acceptInterest,
  rejectInterest,
} from '@dental/api';
import { track } from '@dental/analytics';
import { ErrorState, SkeletonRow, Badge } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { OrgContactBar } from '@mobile/features/profile/OrgContactBar';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';
import { usePermissions } from '@mobile/features/auth/usePermissions';

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const accountType = useAuthStore((s) => s.accountType);
  const { canRespondToOpportunity } = usePermissions();
  const queryClient = useQueryClient();
  const isPatient = accountType === 'patient';

  const { data: oppData, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => supabase.from('opportunities').select('*').eq('id', id as string).single(),
    enabled: !!id,
  });

  const opportunity = oppData?.data;

  const { data: authorData } = useQuery({
    queryKey: ['opportunity-author', opportunity?.author_type, opportunity?.author_id],
    queryFn: async () => {
      if (!opportunity) return null;
      if (opportunity.author_type === 'clinic') {
        const { data, error } = await supabase
          .from('clinics')
          .select('id, name, city, owner_user_id, rating_avg, rating_count, is_verified')
          .eq('id', opportunity.author_id)
          .single();
        if (error || !data) return null;
        return { ...data, orgType: 'clinic' as const };
      }
      const { data, error } = await supabase
        .from('laboratories')
        .select('id, name, city, owner_user_id, is_verified')
        .eq('id', opportunity.author_id)
        .single();
      if (error || !data) return null;
      return { ...data, orgType: 'laboratory' as const };
    },
    enabled: !!opportunity,
  });

  const { data: interestsData } = useQuery({
    queryKey: ['opportunity-interests', id],
    queryFn: () => listInterestsForOpportunity(supabase, id as string),
    enabled: !!id,
  });

  const { data: myOrgData } = useQuery({
    queryKey: ['my-org-id', userId, accountType],
    queryFn: async () => {
      if (accountType === 'clinic') {
        const { data } = await supabase.from('clinic_members').select('clinic_id').eq('user_id', userId as string).limit(1).single();
        return data?.clinic_id ?? null;
      }
      if (accountType === 'laboratory') {
        const { data } = await supabase.from('laboratory_members').select('laboratory_id').eq('user_id', userId as string).limit(1).single();
        return data?.laboratory_id ?? null;
      }
      return null;
    },
    enabled: !!userId && (accountType === 'clinic' || accountType === 'laboratory'),
  });

  const interests = interestsData?.data ?? [];
  const isAuthor = opportunity && myOrgData && opportunity.author_id === myOrgData;
  const myExistingInterest = interests.find(
    (i) => i.responder_id === myOrgData && (accountType === 'clinic' || accountType === 'laboratory')
  );

  async function handleRegisterInterest() {
    if (!opportunity || !myOrgData || !accountType) return;
    await registerInterest(supabase, opportunity.id, accountType as 'clinic' | 'laboratory', myOrgData);
    track({ name: 'opportunity_interest_registered', properties: { opportunity_id: opportunity.id } });
    queryClient.invalidateQueries({ queryKey: ['opportunity-interests', id] });
  }

  async function handleAccept(interestId: string, responderType: 'clinic' | 'laboratory', responderId: string) {
    if (!opportunity || !myOrgData || !accountType) return;

    const table = responderType === 'clinic' ? 'clinics' : 'laboratories';
    const { data: orgRow } = await supabase.from(table).select('owner_user_id').eq('id', responderId).single();
    if (!orgRow) return;

    await acceptInterest(supabase, interestId, {
      otherUserId: orgRow.owner_user_id,
      myActingAsType: accountType as 'clinic' | 'laboratory',
      myActingAsId: myOrgData,
      otherActingAsType: responderType,
      otherActingAsId: responderId,
    });
    queryClient.invalidateQueries({ queryKey: ['opportunity-interests', id] });
  }

  async function handleReject(interestId: string) {
    await rejectInterest(supabase, interestId);
    queryClient.invalidateQueries({ queryKey: ['opportunity-interests', id] });
  }

  if (isLoading) {
    return (
      <ScreenShell showBack title="Oportunitate">
        <SkeletonRow height={150} />
      </ScreenShell>
    );
  }

  if (isError || !opportunity) {
    return (
      <ScreenShell showBack title="Oportunitate">
        <ErrorState message="Nu am putut încărca oportunitatea." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const authorLabel = authorData?.orgType === 'clinic' ? 'Clinică' : 'Laborator';

  return (
    <ScreenShell scroll showBack title={opportunity.title} subtitle={opportunity.city ?? undefined}>
      <View className="gap-lg">
        <View className="bg-surface border border-border rounded-2xl p-md gap-sm">
          {opportunity.city ? <Badge label={opportunity.city} variant="neutral" /> : null}
          <Text className="text-base text-text-primary leading-6">{opportunity.description}</Text>
        </View>

        {authorData ? (
          <View className="bg-surface border border-border rounded-2xl p-md gap-md">
            <View>
              <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide">Publicat de</Text>
              <Link
                href={(authorData.orgType === 'clinic' ? `/clinic/${authorData.id}` : `/laboratory/${authorData.id}`) as never}
                asChild
              >
                <Pressable className="mt-1 active:opacity-80">
                  <Text className="text-lg font-semibold text-primary">{authorData.name}</Text>
                  {authorData.city ? <Text className="text-sm text-text-secondary">{authorData.city}</Text> : null}
                </Pressable>
              </Link>
              <Text className="text-xs text-text-secondary mt-1">{authorLabel}</Text>
              {'rating_avg' in authorData && authorData.rating_avg != null ? (
                <Text className="text-sm text-text-secondary mt-1">
                  ★ {Number(authorData.rating_avg).toFixed(1)} ({authorData.rating_count ?? 0} recenzii)
                </Text>
              ) : null}
            </View>

            {isPatient ? (
              <View className="bg-primary/5 border border-primary/15 rounded-xl p-md gap-sm">
                <Text className="text-sm text-text-secondary">
                  Oportunitățile sunt colaborări B2B (clinică ↔ laborator). Ca pacient poți urmări autorul și trimite mesaj
                  pentru programări sau întrebări.
                </Text>
                <OrgContactBar
                  orgType={authorData.orgType}
                  orgId={authorData.id}
                  orgName={authorData.name}
                  ownerUserId={authorData.owner_user_id}
                  showProfileLink
                />
              </View>
            ) : (
              <OrgContactBar
                orgType={authorData.orgType}
                orgId={authorData.id}
                orgName={authorData.name}
                ownerUserId={authorData.owner_user_id}
                showProfileLink
              />
            )}
          </View>
        ) : null}

        {!isAuthor && canRespondToOpportunity ? (
          <Pressable
            onPress={handleRegisterInterest}
            disabled={!!myExistingInterest}
            className={`rounded-2xl py-4 items-center ${myExistingInterest ? 'bg-border' : 'bg-primary active:opacity-90'}`}
          >
            <Text className="text-base font-semibold text-white">
              {myExistingInterest
                ? `Status: ${myExistingInterest.status === 'pending' ? 'În așteptare' : myExistingInterest.status}`
                : 'Sunt interesat (colaborare B2B)'}
            </Text>
          </Pressable>
        ) : null}

        {isAuthor ? (
          <View className="gap-sm">
            <Text className="text-base font-semibold text-text-primary">Răspunsuri primite</Text>
            <FlatList
              data={interests}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={<Text className="text-sm text-text-secondary">Niciun răspuns încă.</Text>}
              renderItem={({ item }) => (
                <View className="border border-border rounded-xl p-md flex-row items-center justify-between mb-sm bg-surface">
                  <Text className="text-sm text-text-primary flex-1 pr-sm">
                    {item.responder_type === 'clinic' ? 'Clinică' : 'Laborator'} ·{' '}
                    {item.status === 'pending' ? 'În așteptare' : item.status}
                  </Text>
                  {item.status === 'pending' ? (
                    <View className="flex-row gap-md">
                      <Pressable onPress={() => handleAccept(item.id, item.responder_type, item.responder_id)}>
                        <Text className="text-sm font-medium text-success">Acceptă</Text>
                      </Pressable>
                      <Pressable onPress={() => handleReject(item.id)}>
                        <Text className="text-sm font-medium text-error">Respinge</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              )}
            />
          </View>
        ) : null}
      </View>
    </ScreenShell>
  );
}
