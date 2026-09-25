import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';

type PostMediaImageProps = {
  uri: string;
  width?: number | `${number}%`;
  className?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Full-bleed post photo — preserves upload aspect ratio (no fixed-height crop). */
export function PostMediaImage({ uri, width = '100%', className, style, containerStyle }: PostMediaImageProps) {
  const [aspectRatio, setAspectRatio] = useState(4 / 3);

  return (
    <View className={className} style={[{ width, backgroundColor: '#E5E7EB' }, containerStyle]}>
      <Image
        source={{ uri }}
        style={[{ width: '100%', aspectRatio }, style]}
        contentFit="contain"
        transition={150}
        onLoad={(event) => {
          const { width: w, height: h } = event.source;
          if (w > 0 && h > 0) setAspectRatio(w / h);
        }}
      />
    </View>
  );
}
