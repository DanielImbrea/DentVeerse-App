import React from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

const GOOGLE_BLUE = '#4285F4';
const GOOGLE_BLUE_BORDER = '#3367D6';

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
      className={`h-11 w-full flex-row overflow-hidden rounded-[10px] ${inactive ? 'opacity-60' : 'active:opacity-92'}`}
      style={{
        backgroundColor: GOOGLE_BLUE,
        borderWidth: 1,
        borderColor: GOOGLE_BLUE_BORDER,
      }}
    >
      <View className="w-[42px] items-center justify-center bg-white m-[1px] rounded-l-[8px]">
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
        <Text className="text-[15px] font-medium text-white tracking-[0.15px]" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
