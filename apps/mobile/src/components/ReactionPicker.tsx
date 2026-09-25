import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { POST_REACTION_META, POST_REACTION_TYPES, type PostReactionType } from '@dental/utils';

type ReactionPickerProps = {
  visible: boolean;
  currentReaction: PostReactionType | null;
  onSelect: (reaction: PostReactionType) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function ReactionPicker({ visible, currentReaction, onSelect, onRemove, onClose }: ReactionPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/30 justify-end pb-28" onPress={onClose}>
        <Pressable className="mx-4 bg-surface rounded-2xl border border-border p-md shadow-lg" onPress={(e) => e.stopPropagation()}>
          <Text className="text-sm font-medium text-text-secondary mb-md text-center">Alege reacția</Text>
          <View className="flex-row justify-between gap-sm">
            {POST_REACTION_TYPES.map((type) => {
              const meta = POST_REACTION_META[type];
              const active = currentReaction === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => {
                    if (active) onRemove();
                    else onSelect(type);
                    onClose();
                  }}
                  className={`flex-1 items-center py-3 rounded-xl ${active ? 'bg-primary/15 border border-primary/30' : 'bg-background'}`}
                  accessibilityRole="button"
                  accessibilityLabel={meta.labelRo}
                >
                  <Text className="text-3xl mb-1">{meta.emoji}</Text>
                  <Text className={`text-[10px] text-center ${active ? 'text-primary font-semibold' : 'text-text-secondary'}`}>
                    {meta.labelRo}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function reactionDisplayEmoji(reaction: PostReactionType | null | undefined): string {
  if (!reaction) return POST_REACTION_META.appreciate.emoji;
  return POST_REACTION_META[reaction].emoji;
}
