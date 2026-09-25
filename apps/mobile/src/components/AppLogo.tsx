import React from 'react';
import { Image, View, type ViewProps } from 'react-native';

/** Icon-only mark (no wordmark). Source: `src/assets/brand/dentveerse-mark.png` */
const LOGO_MARK = require('../assets/brand/dentveerse-mark.png');

type AppLogoProps = {
  size?: number;
  className?: ViewProps['className'];
};

export function AppLogo({ size = 112, className }: AppLogoProps) {
  return (
    <View className={className ?? 'items-center justify-center'}>
      <Image
        source={LOGO_MARK}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel="Logo DentVeerse"
      />
    </View>
  );
}
