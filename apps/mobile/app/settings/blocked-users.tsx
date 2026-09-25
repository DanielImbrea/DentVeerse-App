import React from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listBlockedUsers, unblockUser } from '@dental/api';
import { EmptyState } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

export default function BlockedUsersScreen() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['blocked-users'], queryFn: () => listBlockedUsers(supabase) });
  const blocked = data?.data ?? [];

  async function handleUnblock(blockedUserId: string) {
    await unblockUser(supabase, blockedUserId);
    queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
  }

  return (
    <ScreenShell showBack title="Utilizatori blocați" subtitle="Persoane cărora le-ai restricționat accesul">
      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View className="bg-surface border border-border rounded-2xl p-xl">
            <EmptyState title="Niciun utilizator blocat" message="Utilizatorii blocați nu te pot contacta." />
          </View>
        }
        renderItem={({ item }) => (
          <View className="flex-row items-center justify-between bg-surface border border-border rounded-xl px-md py-md mb-sm">
            <Text className="text-sm text-text-primary">{item.blocked_user_id}</Text>
            <Pressable onPress={() => handleUnblock(item.blocked_user_id)} className="px-md py-1">
              <Text className="text-sm text-primary font-medium">Deblochează</Text>
            </Pressable>
          </View>
        )}
      />
    </ScreenShell>
  );
}
