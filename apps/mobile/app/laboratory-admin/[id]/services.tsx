import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addLaboratoryService, removeLaboratoryService, listLaboratoryServices, listServiceCatalog } from '@dental/api';
import { Button, EmptyState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';

export default function LaboratoryServicesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: myServicesData, isLoading } = useQuery({
    queryKey: ['laboratory-services-admin', id],
    queryFn: () => listLaboratoryServices(supabase, id as string),
    enabled: !!id,
  });

  const { data: catalogData } = useQuery({
    queryKey: ['service-catalog', 'laboratory'],
    queryFn: () => listServiceCatalog(supabase, 'laboratory'),
  });

  const myServices = myServicesData?.data ?? [];
  const alreadyAddedIds = new Set(myServices.map((s) => s.service_id));
  const availableCatalog = (catalogData?.data ?? []).filter((s) => !alreadyAddedIds.has(s.id));

  async function handleAdd() {
    if (!id || !selectedServiceId) return;
    setSaving(true);
    const { error } = await addLaboratoryService(supabase, { laboratory_id: id as string, service_id: selectedServiceId });
    setSaving(false);
    if (error) {
      Alert.alert('Eroare', error.message);
      return;
    }
    setSelectedServiceId(null);
    setShowPicker(false);
    queryClient.invalidateQueries({ queryKey: ['laboratory-services-admin', id] });
  }

  async function handleRemove(instanceId: string) {
    await removeLaboratoryService(supabase, instanceId);
    queryClient.invalidateQueries({ queryKey: ['laboratory-services-admin', id] });
  }

  return (
    <ScreenShell scroll showBack title="Servicii" subtitle="Tipuri de lucrări oferite de laborator">
      {isLoading ? (
        [1, 2].map((i) => <SkeletonRow key={i} height={56} />)
      ) : (
        <FlatList
          data={myServices}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<EmptyState title="Niciun serviciu adăugat" message="Adaugă cel puțin un tip de lucrare din catalog." />}
          renderItem={({ item }) => (
            <View className="border border-border rounded-xl p-md flex-row items-center justify-between mb-sm bg-surface">
              <Text className="text-base font-medium text-text-primary">
                {item.custom_title ?? (item as { services?: { label_ro?: string } }).services?.label_ro}
              </Text>
              <Pressable onPress={() => handleRemove(item.id)}>
                <Text className="text-sm text-error">Elimină</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {showPicker ? (
        <View className="border border-border rounded-xl p-md gap-sm bg-surface">
          <View className="flex-row flex-wrap gap-xs">
            {availableCatalog.map((svc) => (
              <Pressable
                key={svc.id}
                onPress={() => setSelectedServiceId(svc.id)}
                className={`border rounded-full px-sm py-xs ${selectedServiceId === svc.id ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <Text className="text-xs text-text-primary">{svc.label_ro}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Adaugă" onPress={handleAdd} loading={saving} disabled={!selectedServiceId} />
        </View>
      ) : (
        <Button label="Adaugă serviciu" variant="secondary" onPress={() => setShowPicker(true)} />
      )}
    </ScreenShell>
  );
}
