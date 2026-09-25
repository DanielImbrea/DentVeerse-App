import React from 'react';
import { Text, View } from 'react-native';
import { useConnectedEmail } from '@mobile/hooks/useConnectedEmail';

type AccountConnectedEmailProps = {
  /** When true, renders inside a list card (no extra outer padding). */
  compact?: boolean;
};

export function AccountConnectedEmail({ compact }: AccountConnectedEmailProps) {
  const email = useConnectedEmail();

  if (!email) return null;

  return (
    <View className={compact ? 'flex-row items-center gap-md py-md px-md border-b border-border' : 'flex-row items-center gap-md'}>
      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
        <Text className="text-lg">✉️</Text>
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email conectat</Text>
        <Text className="text-base text-text-primary mt-0.5" selectable>
          {email}
        </Text>
      </View>
    </View>
  );
}
