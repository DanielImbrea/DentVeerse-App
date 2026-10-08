import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

const GOOGLE_BLUE = '#4285F4';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

/** Layout aliniat cu „Sign in with Google” (tile alb + zonă albastră). */
export function GoogleSignInButton({ label, onPress, loading, disabled }: Props) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      className={`h-12 w-full flex-row overflow-hidden rounded-[10px] ${inactive ? 'opacity-60' : 'active:opacity-92'}`}
      style={{ backgroundColor: GOOGLE_BLUE }}
    >
      <View className="w-[48px] h-full items-center justify-center bg-white">
        {loading ? (
          <ActivityIndicator size="small" color={GOOGLE_BLUE} />
        ) : (
          <Image
            source={require('../../assets/google-g-logo.png')}
            style={{ width: 20, height: 20 }}
            resizeMode="contain"
            accessible={false}
          />
        )}
      </View>
      <View className="flex-1 items-center justify-center px-2">
        <Text className="text-[15px] font-medium text-white" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View className="w-[48px]" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
    </Pressable>
  );
}
