import React from 'react';
import { ActivityIndicator, Image, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Stil outline (fundal alb, bordură discretă) — aliniat cu ghidurile Google sign-in. */
export function GoogleSignInButton({ label, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-12 w-full flex-row items-center rounded-lg border border-[#747775] bg-white ${inactive ? 'opacity-60' : 'active:opacity-90'}`}
    >
      <View className="w-12 items-center justify-center pl-1">
        {loading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <Image
            source={require('../../assets/google-g-logo.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
            accessible={false}
          />
        )}
      </View>
      <Text className="flex-1 text-center text-[15px] font-medium text-[#1f1f1f] pr-12" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
