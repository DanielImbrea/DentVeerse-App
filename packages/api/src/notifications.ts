import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';

/** Notifications (in-app). See docs/08-verification-notifications-reports.md Part B. */
export async function listNotifications(
  supabase: SupabaseClient<Database>,
  params: { cursor?: string | null; pageSize?: number } = {}
) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.pageSize ?? 30);

  if (params.cursor) query = query.lt('created_at', params.cursor);
  return query;
}

export async function markNotificationRead(supabase: SupabaseClient<Database>, id: string) {
  return supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function markAllNotificationsRead(supabase: SupabaseClient<Database>) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userData.user.id)
    .is('read_at', null);
}

export async function getUnreadCount(supabase: SupabaseClient<Database>) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error('Not authenticated');

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userData.user.id)
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function getNotificationPreferences(supabase: SupabaseClient<Database>) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase.from('notification_preferences').select('*').eq('user_id', userData.user.id).single();
}

export async function updateNotificationPreferences(
  supabase: SupabaseClient<Database>,
  patch: Partial<Database['public']['Tables']['notification_preferences']['Row']>
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase.from('notification_preferences').update(patch).eq('user_id', userData.user.id);
}

/**
 * Registers this device's Expo push token. The actual token acquisition
 * (`Notifications.getExpoPushTokenAsync()`, requesting OS permission) needs
 * a real device/simulator with push capabilities and cannot be exercised in
 * this environment — this function is the correct next step once a token
 * string is obtained on-device.
 */
export async function registerDevice(
  supabase: SupabaseClient<Database>,
  pushToken: string,
  platform: 'ios' | 'android'
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('devices')
    .upsert(
      { user_id: userData.user.id, push_token: pushToken, platform, last_active_at: new Date().toISOString() },
      { onConflict: 'push_token' }
    );
}

export async function unregisterDevice(supabase: SupabaseClient<Database>, pushToken: string) {
  return supabase.from('devices').delete().eq('push_token', pushToken);
}

function removeExistingNotificationChannel(supabase: SupabaseClient<Database>, userId: string) {
  const channelId = `notifications:${userId}`;
  for (const channel of supabase.getChannels()) {
    if (channel.topic === channelId || channel.topic.endsWith(`:${channelId}`)) {
      supabase.removeChannel(channel);
    }
  }
}

/** Subscribe once per user — call removeChannel on cleanup before re-subscribing. */
export function subscribeToNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  onInsert: (row: Database['public']['Tables']['notifications']['Row']) => void
) {
  removeExistingNotificationChannel(supabase, userId);

  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Database['public']['Tables']['notifications']['Row'])
    )
    .subscribe();
}
