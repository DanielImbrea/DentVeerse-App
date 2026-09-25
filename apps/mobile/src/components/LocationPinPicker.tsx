import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Button } from '@dental/ui';
import { geocodeAddress } from '@mobile/lib/geocode';
import type { LatLng } from '@mobile/lib/orgLocation';

const DEFAULT_REGION: Region = {
  latitude: 44.4268,
  longitude: 26.1025,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

type LocationPinPickerProps = {
  pin: LatLng | null;
  onPinChange: (pin: LatLng) => void;
  addressParts: { address?: string | null; city?: string | null; county?: string | null };
  markerEmoji?: string;
};

export function LocationPinPicker({ pin, onPinChange, addressParts, markerEmoji = '📍' }: LocationPinPickerProps) {
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (!pin) return;
    setRegion((prev) => ({
      ...prev,
      latitude: pin.lat,
      longitude: pin.lng,
    }));
  }, [pin?.lat, pin?.lng]);

  async function handlePlaceFromAddress() {
    setGeocoding(true);
    try {
      const coords = await geocodeAddress(addressParts);
      if (!coords) return;
      onPinChange(coords);
      setRegion({
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <View className="gap-sm">
      <View className="gap-1">
        <Text className="text-sm font-medium text-text-primary">Locație pe hartă</Text>
        <Text className="text-xs text-text-secondary">
          Trage pinul sau atinge harta dacă poziția automată nu e exactă.
        </Text>
      </View>

      <View className="rounded-2xl overflow-hidden border border-border" style={{ height: 220 }}>
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={(event) => {
            const { latitude, longitude } = event.nativeEvent.coordinate;
            onPinChange({ lat: latitude, lng: longitude });
          }}
        >
          {pin ? (
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                onPinChange({ lat: latitude, lng: longitude });
              }}
            >
              <View className="w-9 h-9 rounded-full bg-primary items-center justify-center border-2 border-white">
                <Text style={{ fontSize: 16 }}>{markerEmoji}</Text>
              </View>
            </Marker>
          ) : null}
        </MapView>
      </View>

      <Button
        label={geocoding ? 'Se plasează…' : 'Plasează din adresă'}
        variant="secondary"
        onPress={handlePlaceFromAddress}
        disabled={geocoding}
      />

      {geocoding ? (
        <View className="flex-row items-center gap-sm">
          <ActivityIndicator size="small" color="#0F6B66" />
          <Text className="text-xs text-text-secondary">Căutăm adresa pe hartă…</Text>
        </View>
      ) : pin ? (
        <Text className="text-xs text-text-secondary">
          Pin setat · {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
        </Text>
      ) : (
        <Pressable onPress={handlePlaceFromAddress}>
          <Text className="text-xs text-primary">Apasă „Plasează din adresă” sau atinge harta.</Text>
        </Pressable>
      )}
    </View>
  );
}
