import React from 'react';
import { Text, View } from 'react-native';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { LocationPinPicker } from '@mobile/components/LocationPinPicker';
import type { LatLng } from '@mobile/lib/orgLocation';

type OrgAddressSectionProps = {
  address: string;
  city: string;
  county: string;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onCountyChange: (value: string) => void;
  pin: LatLng | null;
  onPinChange: (pin: LatLng) => void;
  orgKind: 'clinic' | 'laboratory';
};

export function OrgAddressSection({
  address,
  city,
  county,
  onAddressChange,
  onCityChange,
  onCountyChange,
  pin,
  onPinChange,
  orgKind,
}: OrgAddressSectionProps) {
  return (
    <View className="gap-sm">
      <View className="gap-1.5">
        <Text className="text-sm font-medium text-text-primary">Adresă</Text>
        <Text className="text-xs text-text-secondary">
          La salvare încercăm geocodarea adresei ca să apari pe hartă.
        </Text>
        <AppTextInput
          value={address}
          onChangeText={onAddressChange}
          placeholder="Adresă exactă"
          placeholderTextColor="#9CA3AF"
          className="rounded-md font-body text-body"
        />
      </View>

      <AppTextInput
        value={city}
        onChangeText={onCityChange}
        placeholder="Oraș"
        placeholderTextColor="#9CA3AF"
        className="rounded-md font-body text-body"
      />
      <AppTextInput
        value={county}
        onChangeText={onCountyChange}
        placeholder="Județ"
        placeholderTextColor="#9CA3AF"
        className="rounded-md font-body text-body"
      />

      <LocationPinPicker
        pin={pin}
        onPinChange={onPinChange}
        addressParts={{ address, city, county }}
        markerEmoji={orgKind === 'laboratory' ? '🧪' : '🦷'}
      />
    </View>
  );
}
