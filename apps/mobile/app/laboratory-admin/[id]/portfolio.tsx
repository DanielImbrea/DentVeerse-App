import React, { useState } from 'react';
import { Alert, FlatList, Text, View, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createPortfolioItem,
  removePortfolioItem,
  addPortfolioMedia,
  listOwnerPortfolio,
  listPortfolioCategories,
  createVideoUpload,
  uploadVideoToMux,
} from '@dental/api';
import { Button, EmptyState, SkeletonRow } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { AdminPortfolioItemCard } from '@mobile/features/portfolio/AdminPortfolioItemCard';
import { supabase } from '@mobile/lib/supabase';

/**
 * Laboratory portfolio management. Per client spec §9, laboratory portfolio
 * is described as "one of the main elements of the profile" — functionally
 * identical flow to the clinic version (createPortfolioItem is polymorphic
 * on owner_type already), just targeting owner_type='laboratory'.
 */
export default function LaboratoryPortfolioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ['laboratory-portfolio-admin', id],
    queryFn: () => listOwnerPortfolio(supabase, 'laboratory', id as string),
    enabled: !!id,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['portfolio-categories'],
    queryFn: () => listPortfolioCategories(supabase),
  });

  async function handleCreateAndUpload() {
    if (!id || !title) return;
    setSaving(true);

    const { data: item, error: createError } = await createPortfolioItem(supabase, {
      owner_type: 'laboratory',
      owner_id: id as string,
      title,
      description: description || null,
      category_id: categoryId,
    });

    if (createError || !item) {
      setSaving(false);
      Alert.alert('Eroare', createError?.message ?? 'Nu s-a putut crea cazul');
      return;
    }

    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galeria foto.');
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
        });

        if (!result.canceled) {
          for (const [index, asset] of result.assets.entries()) {
            const path = `${id}/${item.id}/${Date.now()}-${index}.jpg`;
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const { error: uploadError } = await supabase.storage.from('portfolio').upload(path, blob, { contentType: 'image/jpeg' });
            if (uploadError) {
              Alert.alert('Eroare upload', uploadError.message);
              continue;
            }
            await addPortfolioMedia(supabase, {
              portfolio_item_id: item.id,
              media_type: 'image',
              storage_path: path,
              display_order: index,
            });
          }
        }
      }
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Upload eșuat');
    }

    setSaving(false);
    setTitle('');
    setDescription('');
    setCategoryId(null);
    setShowCreateForm(false);
    queryClient.invalidateQueries({ queryKey: ['laboratory-portfolio-admin', id] });
  }

  async function handleAddVideo(portfolioItemId: string) {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galeria foto.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const { upload_url } = await createVideoUpload(supabase, portfolioItemId);
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      await uploadVideoToMux(upload_url, blob);

      Alert.alert('Video în procesare', 'Videoclipul va apărea aici când e gata.');
      queryClient.invalidateQueries({ queryKey: ['laboratory-portfolio-admin', id] });
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Upload video eșuat');
    }
  }

  function handleDelete(itemId: string) {
    Alert.alert('Șterge cazul', 'Va dispărea de pe profilul public. Continui?', [
      { text: 'Anulează', style: 'cancel' },
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: async () => {
          await removePortfolioItem(supabase, itemId);
          queryClient.invalidateQueries({ queryKey: ['laboratory-portfolio-admin', id] });
        },
      },
    ]);
  }

  const portfolio = portfolioData?.data ?? [];
  const categories = (categoriesData?.data ?? []).filter((c) => c.applies_to !== 'clinic');

  return (
    <ScreenShell scroll showBack title="Portofoliu" subtitle="Cazuri și lucrări vizibile pe profilul public">
      {isLoading ? (
        [1, 2].map((i) => <SkeletonRow key={i} height={100} />)
      ) : (
        <FlatList
          data={portfolio}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={<EmptyState title="Niciun caz adăugat" message="Prezintă cele mai bune lucrări ale laboratorului." />}
          renderItem={({ item }) => (
            <AdminPortfolioItemCard
              item={item}
              onDelete={handleDelete}
              onAddVideo={handleAddVideo}
              onMediaChanged={() => queryClient.invalidateQueries({ queryKey: ['laboratory-portfolio-admin', id] })}
            />
          )}
        />
      )}

      {showCreateForm ? (
        <View className="border border-border rounded-xl p-md gap-sm bg-surface">
          <AppTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titlu caz"
            className="bg-background"
          />
          <AppTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Descriere"
            multiline
            className="bg-background"
          />
          <View className="flex-row flex-wrap gap-xs">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(cat.id)}
                className={`border rounded-full px-sm py-xs ${categoryId === cat.id ? 'border-primary bg-primary/10' : 'border-border'}`}
              >
                <Text className="text-xs text-text-primary">{cat.label_ro}</Text>
              </Pressable>
            ))}
          </View>
          <Button label="Creează și selectează poze" onPress={handleCreateAndUpload} loading={saving} disabled={!title} />
        </View>
      ) : (
        <Button label="Adaugă caz" variant="secondary" onPress={() => setShowCreateForm(true)} />
      )}
    </ScreenShell>
  );
}
