import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  attachToMessage,
  fetchConversationMessageDates,
  fetchConversationPeer,
  fetchMessagePage,
  fetchMessagesForDate,
  getSignedAttachmentUrl,
  markConversationRead,
  sendMessage,
  subscribeToConversationMessages,
} from '@dental/api';
import { MESSAGES_PAGE_SIZE, formatDateKeyRo } from '@dental/utils';
import { track } from '@dental/analytics';
import { ErrorState, SkeletonRow } from '@dental/ui';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { normalizeDevStorageUrl } from '@mobile/lib/normalizeDevStorageUrl';
import { prepareMessageImageForUpload } from '@mobile/lib/prepareMessageImage';
import { formatConversationActivity } from '@mobile/lib/formatConversationActivity';
import { MessageDateFilterSheet } from '@mobile/components/MessageDateFilterSheet';
import { useAuthStore } from '@mobile/stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MessageRow = {
  id: string;
  sender_user_id: string;
  content: string | null;
  created_at: string;
  message_attachments?: Array<{ id: string; storage_path: string; type: string }>;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const conversationId = id as string;

  const { data: peer } = useQuery({
    queryKey: ['conversation-peer', conversationId],
    queryFn: () => fetchConversationPeer(supabase, conversationId),
    enabled: !!conversationId,
  });

  const [visibleAttachmentPaths, setVisibleAttachmentPaths] = useState<Set<string>>(new Set());

  const { data: messageDates = [] } = useQuery({
    queryKey: ['conversation-message-dates', conversationId],
    queryFn: () => fetchConversationMessageDates(supabase, conversationId),
    enabled: !!conversationId,
  });

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) =>
      fetchMessagePage(supabase, { conversationId, beforeCursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      const rows = (lastPage.data ?? []) as MessageRow[];
      if (rows.length < MESSAGES_PAGE_SIZE) return undefined;
      return rows[rows.length - 1]?.created_at ?? undefined;
    },
    enabled: !!conversationId && !selectedDate,
  });

  const {
    data: filteredMessagesResult,
    isLoading: isLoadingFiltered,
    isError: isFilteredError,
    refetch: refetchFiltered,
  } = useQuery({
    queryKey: ['messages-by-date', conversationId, selectedDate],
    queryFn: () => fetchMessagesForDate(supabase, conversationId, selectedDate as string),
    enabled: !!conversationId && !!selectedDate,
  });

  const messages = useMemo(() => {
    if (selectedDate) {
      return ((filteredMessagesResult?.data ?? []) as MessageRow[]).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const merged = new Map<string, MessageRow>();
    for (const page of data?.pages ?? []) {
      for (const row of (page.data ?? []) as MessageRow[]) {
        merged.set(row.id, row);
      }
    }
    return [...merged.values()].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [data?.pages, filteredMessagesResult?.data, selectedDate]);

  useEffect(() => {
    if (!conversationId) return;
    markConversationRead(supabase, conversationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['unread-conversations-count'] });
        queryClient.invalidateQueries({ queryKey: ['conversations-enriched'] });
      })
      .catch(() => {});

    const channel = subscribeToConversationMessages(supabase, conversationId, () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-peer', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-message-dates', conversationId] });
      if (selectedDate) {
        queryClient.invalidateQueries({ queryKey: ['messages-by-date', conversationId, selectedDate] });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, selectedDate]);

  const resolveAttachmentUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    const { data: signed, error } = await getSignedAttachmentUrl(supabase, storagePath);
    if (error || !signed) return null;
    const raw = (signed as { signed_url?: string }).signed_url;
    if (!raw) return null;
    return normalizeDevStorageUrl(raw);
  }, []);

  async function handleSend() {
    if (!draft.trim() || !conversationId || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);
    const { error } = await sendMessage(supabase, conversationId, content);
    setSending(false);
    if (error) {
      setDraft(content);
      return;
    }
    track({ name: 'message_sent', properties: { conversation_id: conversationId } });
    setSelectedDate(null);
    refetch();
  }

  async function handleAttach() {
    if (!conversationId || !userId || attaching) return;
    setAttaching(true);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galerie ca să trimiți poze.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: true,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const prepared = await prepareMessageImageForUpload(asset.uri, asset.base64);
      const path = `${userId}/${conversationId}/${Date.now()}.${prepared.ext}`;

      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(path, prepared.bytes, { contentType: prepared.mimeType, upsert: false });
      if (uploadError) throw uploadError;

      const { data: message, error: sendError } = await sendMessage(supabase, conversationId, null);
      if (sendError || !message) throw sendError ?? new Error('Nu s-a putut crea mesajul');

      await attachToMessage(
        supabase,
        message.id,
        'image',
        path,
        `photo.${prepared.ext}`,
        prepared.bytes.byteLength,
        prepared.mimeType
      );
      refetch();
    } catch (err) {
      console.error('Attachment failed:', err);
      Alert.alert(
        'Eroare',
        err instanceof Error ? err.message : 'Nu s-a putut trimite imaginea. Încearcă din nou.'
      );
    } finally {
      setAttaching(false);
    }
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const paths = new Set<string>();
    for (const token of viewableItems) {
      const item = token.item as MessageRow;
      for (const att of item.message_attachments ?? []) {
        paths.add(att.storage_path);
      }
    }
    setVisibleAttachmentPaths(paths);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20 }).current;

  const headerSubtitle =
    formatConversationActivity(peer?.lastMessageAt) || peer?.peerSubtitle || '';

  const listLoading = selectedDate ? isLoadingFiltered : isLoading;
  const listError = selectedDate ? isFilteredError : isError;
  const retryList = selectedDate ? refetchFiltered : refetch;

  if (listLoading) {
    return (
      <View className="flex-1 bg-background px-lg" style={{ paddingTop: insets.top + 8 }}>
        <ChatHeader peerLabel="…" peerSubtitle="" onBack={() => router.back()} />
        {[1, 2, 3, 4].map((i) => (
          <SkeletonRow key={i} height={48} />
        ))}
      </View>
    );
  }

  if (listError) {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
        <View className="px-lg">
          <ChatHeader peerLabel="Conversație" peerSubtitle="" onBack={() => router.back()} />
        </View>
        <ErrorState message="Nu am putut încărca conversația." retryLabel="Încearcă din nou" onRetry={() => retryList()} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View className="flex-1" style={{ paddingTop: insets.top }}>
        <ChatHeader
          peerLabel={peer?.peerLabel ?? 'Conversație'}
          peerSubtitle={headerSubtitle}
          onBack={() => router.back()}
          onOpenDateFilter={() => setShowDateFilter(true)}
          dateFilterActive={Boolean(selectedDate)}
        />

        {selectedDate ? (
          <View className="mx-md mt-2 mb-1 flex-row items-center gap-2 bg-primary/8 border border-primary/20 rounded-2xl px-md py-2.5">
            <Ionicons name="calendar" size={18} color="#0F6B66" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text-primary">
                {formatDateKeyRo(selectedDate, { weekday: true })}
              </Text>
              <Text className="text-xs text-text-secondary mt-0.5">
                {messages.length} {messages.length === 1 ? 'mesaj' : 'mesaje'}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedDate(null)}
              className="w-8 h-8 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Elimină filtrul de dată"
            >
              <Ionicons name="close" size={18} color="#6B6F76" />
            </Pressable>
          </View>
        ) : null}

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 10,
            flexGrow: messages.length === 0 ? 1 : undefined,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onEndReached={() => !selectedDate && hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onEndReachedThreshold={0.2}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          ListEmptyComponent={
            selectedDate ? (
              <View className="flex-1 items-center justify-center py-16 px-lg">
                <View className="w-14 h-14 rounded-full bg-primary/10 items-center justify-center mb-3">
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#0F6B66" />
                </View>
                <Text className="text-base font-semibold text-text-primary text-center">Niciun mesaj în această zi</Text>
                <Text className="text-sm text-text-secondary text-center mt-1">
                  Încearcă altă dată din calendar sau vezi toate mesajele.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            !selectedDate && isFetchingNextPage ? (
              <View className="py-3 items-center">
                <ActivityIndicator color="#0F6B66" />
                <Text className="text-xs text-text-secondary mt-1">Se încarcă mesaje mai vechi…</Text>
              </View>
            ) : null
          }
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMine={item.sender_user_id === userId}
              resolveAttachmentUrl={resolveAttachmentUrl}
              visibleAttachmentPaths={visibleAttachmentPaths}
            />
          )}
        />

        <View
          className="border-t border-border bg-surface px-md pt-2"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View className="flex-row items-end gap-2">
            <Pressable
              onPress={handleAttach}
              disabled={attaching}
              className="w-10 h-10 rounded-full bg-background border border-border items-center justify-center active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Atașează imagine"
            >
              {attaching ? (
                <ActivityIndicator size="small" color="#0F6B66" />
              ) : (
                <Ionicons name="add" size={24} color="#0F6B66" />
              )}
            </Pressable>

            <AppTextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Scrie un mesaj…"
              multiline
              maxLength={4000}
              className="flex-1 min-h-[44px] max-h-[120px] rounded-2xl bg-background border border-border px-md py-2.5 font-body text-body"
              style={{ textAlignVertical: 'center' }}
              onSubmitEditing={handleSend}
            />

            <Pressable
              onPress={handleSend}
              disabled={!draft.trim() || sending}
              className={`w-10 h-10 rounded-full items-center justify-center active:opacity-80 ${
                draft.trim() ? 'bg-primary' : 'bg-border'
              }`}
              accessibilityRole="button"
              accessibilityLabel="Trimite"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <MessageDateFilterSheet
        visible={showDateFilter}
        messageDates={messageDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onClose={() => setShowDateFilter(false)}
      />
    </KeyboardAvoidingView>
  );
}

function ChatHeader({
  peerLabel,
  peerSubtitle,
  onBack,
  onOpenDateFilter,
  dateFilterActive = false,
}: {
  peerLabel: string;
  peerSubtitle: string;
  onBack: () => void;
  onOpenDateFilter?: () => void;
  dateFilterActive?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-sm px-md pb-3 border-b border-border bg-background">
      <Pressable
        onPress={onBack}
        className="w-10 h-10 rounded-full items-center justify-center -ml-1 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel="Înapoi"
      >
        <Ionicons name="chevron-back" size={26} color="#0F6B66" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-lg font-semibold text-text-primary" numberOfLines={1}>
          {peerLabel}
        </Text>
        {peerSubtitle ? (
          <Text className="text-xs text-text-secondary">{peerSubtitle}</Text>
        ) : null}
      </View>
      {onOpenDateFilter ? (
        <Pressable
          onPress={onOpenDateFilter}
          className={`w-10 h-10 rounded-full items-center justify-center active:opacity-70 ${
            dateFilterActive ? 'bg-primary/10 border border-primary/30' : 'bg-background border border-border'
          }`}
          accessibilityRole="button"
          accessibilityLabel="Filtrează mesajele după dată"
        >
          <Ionicons name="calendar-outline" size={20} color="#0F6B66" />
        </Pressable>
      ) : null}
    </View>
  );
}

function MessageBubble({
  message,
  isMine,
  resolveAttachmentUrl,
  visibleAttachmentPaths,
}: {
  message: MessageRow;
  isMine: boolean;
  resolveAttachmentUrl: (path: string) => Promise<string | null>;
  visibleAttachmentPaths: Set<string>;
}) {
  const attachments = message.message_attachments ?? [];
  const hasText = Boolean(message.content?.trim());
  const hasImages = attachments.length > 0;
  const time = new Date(message.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  return (
    <View className={`max-w-[85%] gap-1 ${isMine ? 'self-end items-end' : 'self-start items-start'}`}>
      {hasImages ? (
        <View className="gap-1.5">
          {attachments.map((att) => (
            <AttachmentImage
              key={att.id}
              storagePath={att.storage_path}
              resolve={resolveAttachmentUrl}
              shouldLoad={visibleAttachmentPaths.has(att.storage_path)}
            />
          ))}
        </View>
      ) : null}

      {hasText ? (
        <View
          className={`rounded-2xl px-md py-2.5 ${
            isMine ? 'bg-primary rounded-br-sm' : 'bg-surface border border-border rounded-bl-sm'
          }`}
        >
          <Text className={`font-body text-[15px] leading-5 ${isMine ? 'text-white' : 'text-text-primary'}`}>
            {message.content}
          </Text>
        </View>
      ) : null}

      <Text className="text-[11px] text-text-secondary px-1">{time}</Text>
    </View>
  );
}

function AttachmentImage({
  storagePath,
  resolve,
  shouldLoad,
}: {
  storagePath: string;
  resolve: (path: string) => Promise<string | null>;
  shouldLoad: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(4 / 3);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    setFailed(false);
    setUrl(null);
    resolve(storagePath).then((signed) => {
      if (!cancelled) {
        if (!signed) setFailed(true);
        else setUrl(signed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storagePath, resolve, shouldLoad]);

  if (!shouldLoad) {
    return (
      <View className="w-56 aspect-[4/3] rounded-2xl bg-border/20 items-center justify-center">
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
      </View>
    );
  }

  if (failed) {
    return (
      <View className="w-56 rounded-2xl bg-surface border border-border p-md items-center justify-center gap-2">
        <Ionicons name="image-outline" size={28} color="#9CA3AF" />
        <Text className="text-xs text-text-secondary text-center">Imagine indisponibilă</Text>
      </View>
    );
  }

  if (!url) {
    return (
      <View className="w-56 aspect-[4/3] rounded-2xl bg-border/30 items-center justify-center overflow-hidden">
        <ActivityIndicator color="#0F6B66" />
      </View>
    );
  }

  return (
    <View className="rounded-2xl overflow-hidden border border-border/60 bg-surface max-w-[240px]">
      <Image
        source={{ uri: url }}
        style={{ width: 240, aspectRatio }}
        contentFit="cover"
        transition={200}
        onLoad={(event) => {
          const { width, height } = event.source;
          if (width > 0 && height > 0) setAspectRatio(width / height);
        }}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
