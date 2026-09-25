import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { listMyConversationsEnriched } from '@dental/api';
import { EmptyState, ErrorState, SkeletonRow } from '@dental/ui';
import { Link } from 'expo-router';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { useAuthStore } from '@mobile/stores/authStore';
import { supabase } from '@mobile/lib/supabase';

export default function MessagesScreen() {
  const accountType = useAuthStore((s) => s.accountType);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['conversations-enriched'],
    queryFn: () => listMyConversationsEnriched(supabase),
  });

  const conversations = data?.data ?? [];

  const subtitle =
    accountType === 'patient'
      ? 'Contactează clinici și laboratoare din profilurile lor publice.'
      : 'Mesaje cu pacienți, clinici și laboratoare — colaborări și întrebări.';

  const emptyMessage =
    accountType === 'patient'
      ? 'Deschide profilul unei clinici sau laborator și apasă „Mesaj”.'
      : 'Răspunde la interesul pentru oportunități sau contactează alte organizații.';

  if (isLoading) {
    return (
      <ScreenShell title="Mesaje" subtitle={subtitle}>
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={56} />
        ))}
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell title="Mesaje">
        <ErrorState message="Nu am putut încărca conversațiile." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Mesaje" subtitle={subtitle}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.conversation_id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View className="bg-surface border border-border rounded-2xl p-xl">
            <EmptyState title="Nicio conversație" message={emptyMessage} />
          </View>
        }
        renderItem={({ item }) => {
          const lastAt = item.conversations?.last_message_at;
          const isUnread =
            Boolean(lastAt) &&
            (!item.last_read_at || new Date(lastAt).getTime() > new Date(item.last_read_at).getTime());

          return (
            <Link href={`/conversation/${item.conversation_id}`} asChild>
              <Pressable
                className={`border border-border rounded-xl px-md py-md mb-sm active:opacity-90 ${
                  isUnread ? 'bg-primary/5 border-primary/20' : 'bg-surface'
                }`}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className={`text-base flex-1 ${isUnread ? 'font-semibold text-text-primary' : 'font-medium text-text-primary'}`}>
                    {item.peerLabel}
                  </Text>
                  {isUnread ? (
                    <View className="min-w-[22px] h-[22px] rounded-full bg-primary items-center justify-center px-1.5">
                      <Text className="text-[11px] font-bold text-white">!</Text>
                    </View>
                  ) : null}
                </View>
                {item.peerSubtitle ? (
                  <Text className="text-xs text-text-secondary mt-0.5">{item.peerSubtitle}</Text>
                ) : null}
                <Text className="text-sm text-text-secondary mt-1">
                  {lastAt ? new Date(lastAt).toLocaleString('ro-RO') : 'Niciun mesaj încă'}
                </Text>
              </Pressable>
            </Link>
          );
        }}
      />
    </ScreenShell>
  );
}
