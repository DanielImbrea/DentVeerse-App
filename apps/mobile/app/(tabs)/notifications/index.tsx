import React, { useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@dental/api';
import { Button, EmptyState, ErrorState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { formatNotificationText } from '@mobile/lib/formatNotificationText';
import { getNotificationRoute } from '@mobile/lib/notificationRoutes';
import { supabase } from '@mobile/lib/supabase';

export default function NotificationsTabScreen() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications(supabase),
  });

  // Realtime updates are handled globally in useTabBadges — refresh when tab is focused.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  async function handlePress(notification: {
    id: string;
    type: string;
    target_type: string | null;
    target_id: string | null;
    read_at: string | null;
  }) {
    if (!notification.read_at) {
      await markNotificationRead(supabase, notification.id);
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    }
    refetch();
    const route = getNotificationRoute(notification);
    if (route) router.push(route as never);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead(supabase);
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    refetch();
  }

  if (isLoading) {
    return (
      <ScreenShell title="Notificări">
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} height={56} />
        ))}
      </ScreenShell>
    );
  }

  if (isError) {
    return (
      <ScreenShell title="Notificări">
        <ErrorState message="Nu am putut încărca notificările." retryLabel="Încearcă din nou" onRetry={() => refetch()} />
      </ScreenShell>
    );
  }

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some((item) => !item.read_at);

  return (
    <ScreenShell title="Notificări" subtitle="Activitate recentă">
      {hasUnread ? (
        <View className="mb-md">
          <Button label="Marchează toate ca citite" variant="secondary" onPress={handleMarkAllRead} />
        </View>
      ) : null}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <View className="bg-surface border border-border rounded-2xl p-xl">
            <EmptyState title="Nicio notificare" message="Vei vedea aici aprecieri, urmăritori, mesaje și actualizări." />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            className={`rounded-xl px-md py-md mb-sm border border-border ${item.read_at ? 'bg-surface' : 'bg-primary/5 border-primary/20'}`}
          >
            <Text className="text-base text-text-primary">{formatNotificationText(item)}</Text>
            <Text className="text-sm text-text-secondary mt-1">{new Date(item.created_at).toLocaleString('ro-RO')}</Text>
          </Pressable>
        )}
      />
    </ScreenShell>
  );
}
