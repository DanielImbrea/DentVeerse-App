import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Google brand sign-in layout (white “G” tile + blue label area). */
export function GoogleSignInButton({ label, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-12 w-full flex-row overflow-hidden rounded-xl ${inactive ? 'opacity-60' : 'active:opacity-90'}`}
      style={{ backgroundColor: '#4285F4' }}
    >
      <View className="w-12 items-center justify-center bg-white m-0.5 rounded-l-[10px]">
        {loading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <FontAwesome5 name="google" size={20} color="#4285F4" />
        )}
      </View>
      <View className="flex-1 items-center justify-center px-3">
        <Text className="text-[15px] font-semibold text-white" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
