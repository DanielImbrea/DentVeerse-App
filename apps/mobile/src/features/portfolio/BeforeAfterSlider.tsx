import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, View, useWindowDimensions } from 'react-native';

export interface BeforeAfterSliderProps {
  beforeUri: string;
  afterUri: string;
  height?: number;
}

/**
 * Before/after comparison slider — drag horizontally to reveal more of the
 * "before" or "after" image. Built on React Native's built-in
 * `PanResponder` (no extra gesture library dependency needed for this
 * single-axis drag interaction). Previously entirely unbuilt — the
 * `before_after_role` column on `portfolio_media` existed in the schema
 * with no UI consuming it.
 */
export function BeforeAfterSlider({ beforeUri, afterUri, height = 300 }: BeforeAfterSliderProps) {
  const { width } = useWindowDimensions();
  const containerWidth = width - 32; // matches typical px-lg (16px) screen padding on both sides
  const sliderX = useRef(new Animated.Value(containerWidth / 2)).current;
  const [currentX, setCurrentX] = useState(containerWidth / 2);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gestureState) => {
        const newX = Math.max(0, Math.min(containerWidth, gestureState.moveX - 16));
        sliderX.setValue(newX);
        setCurrentX(newX);
      },
    })
  ).current;

  return (
    <View style={{ height, width: containerWidth, borderRadius: 12, overflow: 'hidden' }}>
      {/* "After" image, full width, base layer */}
      <Image source={{ uri: afterUri }} style={{ position: 'absolute', width: containerWidth, height }} resizeMode="cover" />

      {/* "Before" image, clipped to the slider position */}
      <View style={{ position: 'absolute', width: currentX, height, overflow: 'hidden' }}>
        <Image source={{ uri: beforeUri }} style={{ width: containerWidth, height }} resizeMode="cover" />
      </View>

      {/* Draggable handle */}
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: 'absolute',
          left: Animated.subtract(sliderX, 2),
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: '#FFFFFF',
        }}
      >
        <View
          style={{
            position: 'absolute',
            top: height / 2 - 16,
            left: -16,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Animated.View>
    </View>
  );
}
