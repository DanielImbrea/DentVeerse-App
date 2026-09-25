import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { MESSAGES_PAGE_SIZE, getLocalDayBounds, toLocalDateKey } from '@dental/utils';

/** Messaging. See docs/06-feed-messaging.md Part B. */

export async function startConversation(
  supabase: SupabaseClient<Database>,
  otherUserId: string,
  myActingAsType: 'patient' | 'clinic' | 'laboratory',
  myActingAsId: string,
  otherActingAsType: 'patient' | 'clinic' | 'laboratory',
  otherActingAsId: string
) {
  return supabase.rpc('create_or_get_conversation', {
    p_other_user_id: otherUserId,
    p_my_acting_as_type: myActingAsType,
    p_my_acting_as_id: myActingAsId,
    p_other_acting_as_type: otherActingAsType,
    p_other_acting_as_id: otherActingAsId,
    p_origin: 'manual',
  });
}

export async function listMyConversations(supabase: SupabaseClient<Database>) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('conversation_members')
    .select(
      `conversation_id, last_read_at,
       conversations(id, last_message_at, origin)`
    )
    .eq('user_id', userData.user.id)
    .order('conversations(last_message_at)', { ascending: false });
}

export async function resolveActingAsLabel(
  supabase: SupabaseClient<Database>,
  actingAsType: 'patient' | 'clinic' | 'laboratory',
  actingAsId: string
): Promise<string> {
  if (actingAsType === 'patient') {
    const { data } = await supabase
      .from('patient_profiles')
      .select('first_name, last_name')
      .eq('user_id', actingAsId)
      .maybeSingle();
    const name = [data?.first_name, data?.last_name].filter(Boolean).join(' ').trim();
    return name || 'Pacient';
  }

  if (actingAsType === 'clinic') {
    const { data } = await supabase.from('clinics').select('name').eq('id', actingAsId).maybeSingle();
    return data?.name ?? 'Clinică';
  }

  const { data } = await supabase.from('laboratories').select('name').eq('id', actingAsId).maybeSingle();
  return data?.name ?? 'Laborator';
}

export type EnrichedConversationRow = {
  conversation_id: string;
  last_read_at: string | null;
  conversations: { id: string; last_message_at: string | null; origin: string | null } | null;
  peerLabel: string;
  peerSubtitle: string;
};

export async function listMyConversationsEnriched(
  supabase: SupabaseClient<Database>
): Promise<{ data: EnrichedConversationRow[] | null; error: Error | null }> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { data: null, error: userError ?? new Error('Not authenticated') };
  }

  const userId = userData.user.id;
  const { data: rows, error } = await listMyConversations(supabase);
  if (error) return { data: null, error };

  const enriched = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: peer } = await supabase
        .from('conversation_members')
        .select('acting_as_type, acting_as_id')
        .eq('conversation_id', row.conversation_id)
        .neq('user_id', userId)
        .limit(1)
        .maybeSingle();

      const peerLabel = peer
        ? await resolveActingAsLabel(supabase, peer.acting_as_type, peer.acting_as_id)
        : 'Conversație';

      const peerSubtitle =
        peer?.acting_as_type === 'clinic'
          ? 'Clinică'
          : peer?.acting_as_type === 'laboratory'
            ? 'Laborator'
            : peer?.acting_as_type === 'patient'
              ? 'Pacient'
              : '';

      return {
        conversation_id: row.conversation_id,
        last_read_at: row.last_read_at,
        conversations: row.conversations,
        peerLabel,
        peerSubtitle,
      };
    })
  );

  return { data: enriched, error: null };
}

export async function fetchConversationPeer(
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<{ peerLabel: string; peerSubtitle: string; lastMessageAt: string | null } | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const [{ data: peer }, { data: conversation }] = await Promise.all([
    supabase
      .from('conversation_members')
      .select('acting_as_type, acting_as_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle(),
    supabase.from('conversations').select('last_message_at').eq('id', conversationId).maybeSingle(),
  ]);

  if (!peer) {
    return { peerLabel: 'Conversație', peerSubtitle: '', lastMessageAt: conversation?.last_message_at ?? null };
  }

  const peerLabel = await resolveActingAsLabel(supabase, peer.acting_as_type, peer.acting_as_id);
  const peerSubtitle =
    peer.acting_as_type === 'clinic'
      ? 'Clinică'
      : peer.acting_as_type === 'laboratory'
        ? 'Laborator'
        : peer.acting_as_type === 'patient'
          ? 'Pacient'
          : '';

  return { peerLabel, peerSubtitle, lastMessageAt: conversation?.last_message_at ?? null };
}

export async function getUnreadConversationCount(supabase: SupabaseClient<Database>) {
  const { data: rows, error } = await listMyConversations(supabase);
  if (error) throw error;

  return (rows ?? []).filter((row) => {
    const lastAt = row.conversations?.last_message_at;
    if (!lastAt) return false;
    const readAt = row.last_read_at;
    if (!readAt) return true;
    return new Date(lastAt).getTime() > new Date(readAt).getTime();
  }).length;
}

export interface MessagePageParams {
  conversationId: string;
  /** created_at of the oldest loaded message, for "load earlier". */
  beforeCursor?: string | null;
  pageSize?: number;
}

export async function fetchMessagePage(supabase: SupabaseClient<Database>, params: MessagePageParams) {
  const pageSize = params.pageSize ?? MESSAGES_PAGE_SIZE;
  let query = supabase
    .from('messages')
    .select('*, message_attachments(*)')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: false })
    .limit(pageSize);

  if (params.beforeCursor) query = query.lt('created_at', params.beforeCursor);
  return query;
}

export async function fetchMessagesForDate(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  dateYmd: string
) {
  const { startIso, endIso } = getLocalDayBounds(dateYmd);
  return supabase
    .from('messages')
    .select('*, message_attachments(*)')
    .eq('conversation_id', conversationId)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false });
}

/** Distinct local calendar days that contain messages (newest first). */
export async function fetchConversationMessageDates(
  supabase: SupabaseClient<Database>,
  conversationId: string
): Promise<string[]> {
  const dates = new Set<string>();
  let beforeCursor: string | null = null;
  const pageSize = 200;

  for (let page = 0; page < 10; page++) {
    let query = supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (beforeCursor) query = query.lt('created_at', beforeCursor);

    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      dates.add(toLocalDateKey(row.created_at));
    }

    if (data.length < pageSize) break;
    beforeCursor = data[data.length - 1]?.created_at ?? null;
  }

  return [...dates].sort((a, b) => b.localeCompare(a));
}

export async function sendMessage(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  content: string | null
) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_user_id: userData.user.id, content })
    .select()
    .single();
}

/**
 * Attachment upload: the file itself must be uploaded to the private
 * `message-attachments` Storage bucket FIRST (client-side, using the
 * authenticated user's own folder per the storage RLS policy in
 * supabase/migrations/0021_storage_buckets.sql), THEN this function records
 * the resulting storage_path against the message. The actual
 * expo-image-picker / expo-document-picker upload call is not implemented
 * here — same reasoning as portfolio.ts: needs a device file picker, cannot
 * be exercised in this environment.
 */
export async function attachToMessage(
  supabase: SupabaseClient<Database>,
  messageId: string,
  type: 'image' | 'file',
  storagePath: string,
  fileName?: string,
  fileSizeBytes?: number,
  mimeType?: string
) {
  return supabase
    .from('message_attachments')
    .insert({
      message_id: messageId,
      type,
      storage_path: storagePath,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      mime_type: mimeType,
    })
    .select()
    .single();
}

/**
 * Mints a short-lived signed URL for a private attachment. Signed URLs are
 * created via the anon-key client (Storage's createSignedUrl works under
 * RLS for buckets with a SELECT-less policy set IF the caller has table-row
 * access — but message_attachments has no client SELECT policy on the
 * *object* itself since access must be gated by conversation membership.
 * Recommend implementing this as an Edge Function
 * (`get-message-attachment-url`) that checks conversation membership
 * server-side then calls `createSignedUrl` with the service-role key,
 * rather than depending on a Storage RLS policy replicating the same
 * conversation-membership check — flagged here as the correct approach,
 * not yet written (see supabase/functions/README.md).
 */
export async function getSignedAttachmentUrl(supabase: SupabaseClient<Database>, storagePath: string) {
  const { data: signed, error: signError } = await supabase.storage
    .from('message-attachments')
    .createSignedUrl(storagePath, 60 * 5);

  if (!signError && signed?.signedUrl) {
    return { data: { signed_url: signed.signedUrl, expires_in: 60 * 5 }, error: null };
  }

  return supabase.functions.invoke('get-message-attachment-url', {
    body: { storage_path: storagePath },
  });
}

export async function markConversationRead(supabase: SupabaseClient<Database>, conversationId: string) {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) throw error ?? new Error('Not authenticated');

  return supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userData.user.id);
}

/**
 * Global presence channel per docs/16-client-decisions-mvp-scope-update.md
 * §3 (confirmed platform-wide, not per-conversation). Call `.subscribe()`
 * on the returned channel and track/untrack presence from a top-level
 * provider (e.g. apps/mobile/app/_layout.tsx) so "online" status is
 * consistent app-wide, not re-negotiated per screen.
 */
export function subscribeToGlobalPresence(supabase: SupabaseClient<Database>, userId: string) {
  const channel = supabase.channel('presence:online-users', {
    config: { presence: { key: userId } },
  });
  return channel;
}

export function subscribeToConversationMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
  onInsert: (row: Database['public']['Tables']['messages']['Row']) => void
) {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => onInsert(payload.new as Database['public']['Tables']['messages']['Row'])
    )
    .subscribe();
}
