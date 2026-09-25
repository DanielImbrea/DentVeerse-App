import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUnreadConversationCount, getUnreadCount, subscribeToNotifications } from '@dental/api';
import { supabase } from '@mobile/lib/supabase';

export function useTabBadges(userId: string | null) {
  const queryClient = useQueryClient();

  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['unread-notifications-count'],
    queryFn: () => getUnreadCount(supabase),
    enabled: !!userId,
  });

  const { data: messageCount = 0 } = useQuery({
    queryKey: ['unread-conversations-count'],
    queryFn: () => getUnreadConversationCount(supabase),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    const notificationsChannel = subscribeToNotifications(supabase, userId, () => {
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    const messagesChannelName = `tab-badges:messages:${userId}`;
    for (const channel of supabase.getChannels()) {
      if (channel.topic === messagesChannelName || channel.topic.endsWith(`:${messagesChannelName}`)) {
        supabase.removeChannel(channel);
      }
    }

    const messagesChannel = supabase
      .channel(messagesChannelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['unread-conversations-count'] });
        queryClient.invalidateQueries({ queryKey: ['conversations-enriched'] });
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-conversations-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [userId, queryClient]);

  return { notificationCount, messageCount };
}
