import React, { useEffect, useState } from 'react';
import { Text, View, Switch, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateLaboratory, getLaboratoryById } from '@dental/api';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { OrgAddressSection } from '@mobile/components/OrgAddressSection';
import { geocodeAddress } from '@mobile/lib/geocode';
import { parseStoredLocation, persistOrgLocation, type LatLng } from '@mobile/lib/orgLocation';
import { supabase } from '@mobile/lib/supabase';

const ZONES: { key: string; label: string }[] = [
  { key: 'local', label: 'Local' },
  { key: 'national', label: 'România' },
  { key: 'european', label: 'Europa' },
  { key: 'international', label: 'Internațional' },
];

export default function LaboratoryProfileEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string | boolean | number | null>>({});
  const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getLaboratoryById(supabase, id as string).then(async ({ data }) => {
      if (data) {
        setForm(data as unknown as Record<string, string | boolean | number | null>);
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

  function set(key: string, value: string | boolean | number | null) {
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
    const { error } = await updateLaboratory(supabase, id as string, {
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
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      team_size: form.team_size ? Number(form.team_size) : null,
      collaboration_zone: form.collaboration_zone as any,
      open_for_collaboration: form.open_for_collaboration as boolean,
      collaboration_note: form.collaboration_note as string | null,
      logo_url: form.logo_url as string | null,
    });

    if (error) {
      setLoading(false);
      Alert.alert('Eroare', error.message);
      return;
    }

    const locationResult = await persistOrgLocation(supabase, 'laboratory', id as string, pinCoords, {
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

  const field = (key: string, placeholder: string, multiline = false, keyboardType?: 'numeric') => (
    <AppTextInput
      value={String(form[key] ?? '')}
      onChangeText={(v) => set(key, v)}
      placeholder={placeholder}
      multiline={multiline}
      keyboardType={keyboardType}
      className={multiline ? 'rounded-md font-body text-body' : 'rounded-md font-body text-body'}
    />
  );

  return (
    <ScreenShell scroll showBack title="Editează profilul laboratorului" subtitle="Profil public, colaborări și locație pe hartă">
      <Button label="Schimbă logo-ul" variant="secondary" onPress={handlePickLogo} />

      {field('name', 'Numele laboratorului')}
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
        orgKind="laboratory"
      />

      {field('phone', 'Telefon')}
      {field('email', 'Email')}
      {field('website', 'Website')}
      {field('instagram', 'Instagram')}
      {field('facebook', 'Facebook')}
      {field('tiktok', 'TikTok')}
      {field('years_experience', 'Ani de experiență', false, 'numeric')}
      {field('team_size', 'Dimensiune echipă', false, 'numeric')}

      <Text className="text-sm font-medium text-text-primary">Zonă de colaborare</Text>
      <View className="flex-row flex-wrap gap-xs">
        {ZONES.map((zone) => (
          <Pressable
            key={zone.key}
            onPress={() => set('collaboration_zone', zone.key)}
            className={`border rounded-full px-sm py-xs ${form.collaboration_zone === zone.key ? 'border-primary bg-primary/10' : 'border-border'}`}
          >
            <Text className="text-xs text-text-primary">{zone.label}</Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-base text-text-primary">Deschis pentru colaborare</Text>
        <Switch value={!!form.open_for_collaboration} onValueChange={(v) => set('open_for_collaboration', v)} />
      </View>
      {form.open_for_collaboration ? field('collaboration_note', 'Notă colaborare') : null}

      <Button label="Salvează" onPress={handleSave} loading={loading} disabled={!form.name} />
    </ScreenShell>
  );
}
