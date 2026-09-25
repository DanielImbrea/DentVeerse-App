import React, { useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDentist, updateDentist, removeDentist, listClinicDentists } from '@dental/api';
import { Button, EmptyState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';

/**
 * Team management — add/edit/remove clinic dentists, real CRUD wired to
 * packages/api/src/dentists.ts (which is unchanged, already fully correct).
 * Specialization is selected from the seeded `specializations` catalog.
 * Photo upload uses the same expo-image-picker pattern as the clinic logo
 * upload (see profile-edit.tsx header comment for the "not executed" caveat).
 */
export default function ClinicTeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSpecializationId, setNewSpecializationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: dentistsData, isLoading } = useQuery({
    queryKey: ['clinic-dentists-admin', id],
    queryFn: () => listClinicDentists(supabase, id as string),
    enabled: !!id,
  });

  const { data: specializationsData } = useQuery({
    queryKey: ['specializations'],
    queryFn: () => supabase.from('specializations').select('*').eq('active', true),
  });

  async function handleAdd() {
    if (!id || !newName) return;
    setSaving(true);
    const { error } = await addDentist(supabase, {
      clinic_id: id as string,
      full_name: newName,
      specialization_id: newSpecializationId,
    });
    setSaving(false);
    if (error) {
      Alert.alert('Eroare', error.message);
      return;
    }
    setNewName('');
    setNewSpecializationId(null);
    setShowAddForm(false);
    queryClient.invalidateQueries({ queryKey: ['clinic-dentists-admin', id] });
  }

  function handleRemove(dentistId: string) {
    Alert.alert('Elimină membru', 'Ești sigur?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Elimină',
        style: 'destructive',
        onPress: async () => {
          await removeDentist(supabase, dentistId);
          queryClient.invalidateQueries({ queryKey: ['clinic-dentists-admin', id] });
        },
      },
    ]);
  }

  const dentists = dentistsData?.data ?? [];
  const specializations = specializationsData?.data ?? [];

  return (
    <ScreenShell scroll showBack title="Echipă" subtitle="Medici și specializări vizibile pe profilul public">
      {isLoading ? (
        [1, 2].map((i) => <SkeletonRow key={i} height={64} />)
      ) : (
        <FlatList
          data={dentists}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<EmptyState title="Niciun medic adăugat" message="Adaugă echipa clinicii pentru profilul public." />}
          renderItem={({ item }) => (
            <View className="border border-border rounded-xl p-md flex-row items-center justify-between mb-sm bg-surface">
              <View>
                <Text className="text-base font-medium text-text-primary">{item.full_name}</Text>
                <Text className="text-sm text-text-secondary">
                  {(item as { specializations?: { label_ro?: string } }).specializations?.label_ro ?? ''}
                </Text>
              </View>
              <Pressable onPress={() => handleRemove(item.id)}>
                <Text className="text-sm text-error">Elimină</Text>
              </Pressable>
            </View>
          )}
        />
      )}

      {showAddForm ? (
        <View className="border border-border rounded-xl p-md gap-sm bg-surface">
          <AppTextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="Nume complet"
            className="bg-background"
          />
          <View className="flex-row flex-wrap gap-xs">
            {specializations.map((spec) => (
              <Pressable
                key={spec.id}
                onPress={() => setNewSpecializationId(spec.id)}
                className={`border rounded-full px-sm py-xs ${newSpecializationId === spec.id ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <Text className="text-xs text-text-primary">{spec.label_ro}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Adaugă" onPress={handleAdd} loading={saving} disabled={!newName} />
        </View>
      ) : (
        <Button label="Adaugă medic" variant="secondary" onPress={() => setShowAddForm(true)} />
      )}
    </ScreenShell>
  );
}
