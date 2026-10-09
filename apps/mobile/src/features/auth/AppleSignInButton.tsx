import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Stil outline, text în română. */
export function AppleSignInButton({ label, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-12 w-full flex-row items-center rounded-lg border border-[#747775] bg-white ${inactive ? 'opacity-60' : 'active:opacity-90'}`}
    >
      <View className="w-12 items-center justify-center pl-1">
        {loading ? <ActivityIndicator color="#000000" /> : <Ionicons name="logo-apple" size={22} color="#000000" />}
      </View>
      <Text className="flex-1 text-center text-[15px] font-medium text-[#1f1f1f] pr-12" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
