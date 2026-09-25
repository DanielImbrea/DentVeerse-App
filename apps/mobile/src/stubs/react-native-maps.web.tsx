import React from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const PROVIDER_GOOGLE = 'google';

type MapEvent = {
  nativeEvent: { coordinate: { latitude: number; longitude: number } };
};

type MapViewProps = ViewProps & {
  initialRegion?: Region;
  region?: Region;
  customMapStyle?: unknown;
  provider?: string;
  showsUserLocation?: boolean;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapEvent) => void;
};

function MapView({ children, style, region, initialRegion, onPress, onRegionChangeComplete }: MapViewProps) {
  const activeRegion = region ?? initialRegion;
  return (
    <Pressable
      style={[{ flex: 1, backgroundColor: '#E6E3DF' }, style]}
      onPress={() => {
        if (!activeRegion) return;
        onPress?.({
          nativeEvent: {
            coordinate: { latitude: activeRegion.latitude, longitude: activeRegion.longitude },
          },
        });
        onRegionChangeComplete?.(activeRegion);
      }}
    >
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

type MarkerProps = {
  coordinate: { latitude: number; longitude: number };
  draggable?: boolean;
  onPress?: () => void;
  onDragEnd?: (event: MapEvent) => void;
  children?: React.ReactNode;
};

export function Marker({ children, onPress }: MarkerProps) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'center', marginTop: 8 }}>
      {children}
    </Pressable>
  );
}

export default MapView;
