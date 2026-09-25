import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { follow, unfollow, listFollowers, startConversation } from '@dental/api';
import { track } from '@dental/analytics';
import { resolveMyActingAs } from '@mobile/lib/orgContext';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export type OrgContactBarProps = {
  orgType: 'clinic' | 'laboratory';
  orgId: string;
  orgName: string;
  ownerUserId: string;
  /** Show a secondary link to the full public profile. */
  showProfileLink?: boolean;
};

export function OrgContactBar({ orgType, orgId, orgName, ownerUserId, showProfileLink = false }: OrgContactBarProps) {
  const userId = useAuthStore((s) => s.userId);
  const accountType = useAuthStore((s) => s.accountType);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: followersData } = useQuery({
    queryKey: ['org-followers', orgType, orgId],
    queryFn: () => listFollowers(supabase, orgType, orgId),
    enabled: !!orgId,
  });

  const isFollowing = (followersData?.data ?? []).some((f) => f.follower_user_id === userId);
  const followerCount = followersData?.data?.length ?? 0;
  const profileHref = orgType === 'clinic' ? `/clinic/${orgId}` : `/laboratory/${orgId}`;

  async function handleFollowToggle() {
    if (!userId) return;
    if (isFollowing) {
      await unfollow(supabase, orgType, orgId);
    } else {
      await follow(supabase, orgType, orgId);
      track({ name: 'follow_created', properties: { target_type: orgType } });
    }
    queryClient.invalidateQueries({ queryKey: ['org-followers', orgType, orgId] });
    queryClient.invalidateQueries({ queryKey: [`${orgType}-followers`, orgId] });
  }

  async function handleMessage() {
    if (!userId) return;

    const actingAs = await resolveMyActingAs(supabase, userId, accountType);
    if (!actingAs) {
      Alert.alert('Eroare', 'Nu am putut identifica contul tău pentru mesagerie.');
      return;
    }

    const { data: conversationId, error } = await startConversation(
      supabase,
      ownerUserId,
      actingAs.type,
      actingAs.id,
      orgType,
      orgId
    );

    if (error || !conversationId) {
      Alert.alert('Eroare', error?.message ?? 'Nu am putut deschide conversația.');
      return;
    }

    router.push(`/conversation/${conversationId}`);
  }

  return (
    <View className="gap-sm">
      <Text className="text-xs text-text-secondary">
        {followerCount} {followerCount === 1 ? 'urmăritor' : 'urmăritori'}
      </Text>

      <View className="flex-row gap-sm">
        <Pressable
          onPress={handleFollowToggle}
          className={`flex-1 rounded-2xl py-3.5 items-center border ${isFollowing ? 'bg-primary/10 border-primary' : 'border-primary'}`}
        >
          <Text className={`text-base font-semibold ${isFollowing ? 'text-primary' : 'text-primary'}`}>
            {isFollowing ? 'Urmărești' : 'Urmărește'}
          </Text>
        </Pressable>
        <Pressable onPress={handleMessage} className="flex-1 bg-primary rounded-2xl py-3.5 items-center active:opacity-90">
          <Text className="text-base font-semibold text-white">Mesaj</Text>
        </Pressable>
      </View>

      {showProfileLink ? (
        <Link href={profileHref as never} asChild>
          <Pressable className="rounded-2xl py-3 items-center border border-border bg-surface active:opacity-90">
            <Text className="text-sm font-medium text-text-primary">Vezi profilul complet →</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
