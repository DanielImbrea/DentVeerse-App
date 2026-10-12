import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { fetchPostReactionLikers } from '@dental/api';
import { POST_REACTION_META, type PostReactionType } from '@dental/utils';
import { supabase } from '@mobile/lib/supabase';

type Props = {
  postId: string;
  visible: boolean;
  onClose: () => void;
};

function displayName(first: string | null, last: string | null, userId: string): string {
  const full = [first, last].filter(Boolean).join(' ').trim();
  return full || `Utilizator ${userId.slice(0, 8)}`;
}

export function PostReactionLikersModal({ postId, visible, onClose }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['post-reaction-likers', postId],
    queryFn: () => fetchPostReactionLikers(supabase, postId),
    enabled: visible && !!postId,
  });

  const rows = data?.data ?? [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30 justify-end pb-24" onPress={onClose}>
        <Pressable
          className="mx-4 max-h-[70%] bg-surface rounded-2xl border border-border overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="text-base font-semibold text-text-primary text-center py-md border-b border-border">
            Reacții
          </Text>
          {isLoading ? (
            <ActivityIndicator className="py-xl" color="#0F6B66" />
          ) : isError ? (
            <Text className="text-sm text-text-secondary text-center py-lg px-md">
              Nu am putut încărca lista.
            </Text>
          ) : rows.length === 0 ? (
            <Text className="text-sm text-text-secondary text-center py-lg px-md">Nicio reacție încă.</Text>
          ) : (
            <ScrollView className="max-h-96">
              {rows.map((row) => {
                const type = row.reaction_type as PostReactionType;
                const meta = POST_REACTION_META[type] ?? POST_REACTION_META.appreciate;
                return (
                  <View
                    key={`${row.user_id}-${row.reaction_type}`}
                    className="flex-row items-center gap-md px-md py-3 border-b border-border/60"
                  >
                    <Text className="text-xl">{meta.emoji}</Text>
                    <Text className="flex-1 text-base text-text-primary">
                      {displayName(row.first_name, row.last_name, row.user_id)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
          <Pressable onPress={onClose} className="py-md border-t border-border active:opacity-80">
            <Text className="text-center text-primary font-semibold">Închide</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
