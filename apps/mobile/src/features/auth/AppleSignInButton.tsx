import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Buton Apple în română (componenta nativă rămâne adesea în engleză). */
export function AppleSignInButton({ label, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-12 w-full flex-row items-center justify-center gap-2 rounded-[10px] bg-black ${inactive ? 'opacity-60' : 'active:opacity-90'}`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
          <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
