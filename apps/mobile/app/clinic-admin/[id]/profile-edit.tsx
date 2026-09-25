import React, { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateClinic, getClinicById } from '@dental/api';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { OrgAddressSection } from '@mobile/components/OrgAddressSection';
import { geocodeAddress } from '@mobile/lib/geocode';
import { parseStoredLocation, persistOrgLocation, type LatLng } from '@mobile/lib/orgLocation';
import { supabase } from '@mobile/lib/supabase';

export default function ClinicProfileEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string | boolean | null>>({});
  const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getClinicById(supabase, id as string).then(async ({ data }) => {
      if (data) {
        setForm(data as unknown as Record<string, string | boolean | null>);
        const stored = parseStoredLocation(data.location);
        if (stored) {
          setPinCoords(stored);
        } else if (data.address || data.city) {
          const coords = await geocodeAddress({
            address: data.address,
            city: data.city,
            county: data.county,
          });
          if (coords) setPinCoords(coords);
        }
      }
      setInitialLoading(false);
    });
  }, [id]);

  function set(key: string, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePickLogo() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galerie pentru logo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const path = `${id}/logo-${Date.now()}.jpg`;
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage.from('logos-covers').upload(path, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from('logos-covers').getPublicUrl(path);
      set('logo_url', publicUrl.publicUrl);
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Nu am putut încărca logo-ul.');
    }
  }

  async function handleSave() {
    if (!id) return;
    setLoading(true);
    const { error } = await updateClinic(supabase, id as string, {
      name: form.name as string,
      description: form.description as string | null,
      address: form.address as string | null,
      city: form.city as string | null,
      county: form.county as string | null,
      phone: form.phone as string | null,
      email: form.email as string | null,
      website: form.website as string | null,
      instagram: form.instagram as string | null,
      facebook: form.facebook as string | null,
      tiktok: form.tiktok as string | null,
      open_for_collaboration: form.open_for_collaboration as boolean,
      collaboration_note: form.collaboration_note as string | null,
      logo_url: form.logo_url as string | null,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Eroare', error.message);
      return;
    }

    const locationResult = await persistOrgLocation(supabase, 'clinic', id as string, pinCoords, {
      address: form.address as string,
      city: form.city as string,
      county: form.county as string,
    });

    setLoading(false);

    if (locationResult.error) {
      Alert.alert('Profil salvat', `Locația pe hartă nu s-a putut salva: ${locationResult.error}`);
    } else if (!locationResult.saved) {
      Alert.alert(
        'Profil salvat',
        'Completează adresa exactă sau plasează pinul pe hartă ca să apari în Descoperă → Hartă.'
      );
    }

    router.back();
  }

  if (initialLoading) return null;

  const field = (key: string, placeholder: string, multiline = false) => (
    <AppTextInput
      value={(form[key] as string) ?? ''}
      onChangeText={(v) => set(key, v)}
      placeholder={placeholder}
      multiline={multiline}
      className={multiline ? 'rounded-md font-body text-body' : 'rounded-md font-body text-body'}
    />
  );

  return (
    <ScreenShell scroll showBack title="Editează profilul clinicii" subtitle="Informațiile publice și locația pe hartă">
      <Button label="Schimbă logo-ul" variant="secondary" onPress={handlePickLogo} />

      {field('name', 'Numele clinicii')}
      {field('description', 'Descriere', true)}

      <OrgAddressSection
        address={(form.address as string) ?? ''}
        city={(form.city as string) ?? ''}
        county={(form.county as string) ?? ''}
        onAddressChange={(v) => set('address', v)}
        onCityChange={(v) => set('city', v)}
        onCountyChange={(v) => set('county', v)}
        pin={pinCoords}
        onPinChange={setPinCoords}
        orgKind="clinic"
      />

      {field('phone', 'Telefon')}
      {field('email', 'Email')}
      {field('website', 'Website')}
      {field('instagram', 'Instagram')}
      {field('facebook', 'Facebook')}
      {field('tiktok', 'TikTok')}

      <View className="flex-row items-center justify-between">
        <Text className="text-base text-text-primary">Deschis pentru colaborare</Text>
        <Switch value={!!form.open_for_collaboration} onValueChange={(v) => set('open_for_collaboration', v)} />
      </View>
      {form.open_for_collaboration
        ? field('collaboration_note', 'Notă colaborare (ex. „Caut laborator All-on-X”)')
        : null}

      <Button label="Salvează" onPress={handleSave} loading={loading} disabled={!form.name} />
    </ScreenShell>
  );
}
