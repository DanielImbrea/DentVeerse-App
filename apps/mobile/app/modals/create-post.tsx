import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { createPost, createPostVideoUpload, uploadVideoToMux } from '@dental/api';
import { track } from '@dental/analytics';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useRequireAccountType } from '@mobile/hooks/useRequireAccountType';
import { useMyOrg } from '@mobile/hooks/useMyOrg';
import { supabase } from '@mobile/lib/supabase';
import { readUriAsArrayBuffer } from '@mobile/lib/uploadMedia';

type PostType = 'text' | 'photo' | 'video' | 'announcement';

const TYPE_OPTIONS: { key: PostType; label: string; hint: string }[] = [
  { key: 'text', label: 'Text', hint: 'Anunț scurt sau update' },
  { key: 'photo', label: 'Foto', hint: 'Una sau mai multe imagini' },
  { key: 'video', label: 'Video', hint: 'Clip scurt (procesare Mux)' },
  { key: 'announcement', label: 'Anunț', hint: 'Evidențiat în feed' },
];

interface PickedMedia {
  uri: string;
  type: 'image' | 'video';
}

export default function CreatePostModal() {
  const router = useRouter();
  const { isAllowed, isChecking } = useRequireAccountType(['clinic', 'laboratory']);
  const { data: myOrg } = useMyOrg();
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [publishing, setPublishing] = useState(false);

  const isValid = content.trim().length > 0 || media.length > 0;

  async function handlePickMedia() {
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisiune necesară', 'Permite accesul la galeria foto.');
        return;
      }

      const pickingVideo = postType === 'video';
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: pickingVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsMultipleSelection: !pickingVideo,
      });

      if (result.canceled) return;

      const picked: PickedMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: pickingVideo ? 'video' : 'image',
      }));

      if (pickingVideo) {
        setPostType('video');
        setMedia(picked.slice(0, 1));
      } else {
        setPostType('photo');
        setMedia((prev) => [...prev, ...picked]);
      }
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Nu s-a putut selecta media');
    }
  }

  function handleRemoveMedia(index: number) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function resolveEffectivePostType(): PostType {
    if (media.some((m) => m.type === 'video')) return 'video';
    if (media.some((m) => m.type === 'image')) return 'photo';
    return postType;
  }

  async function handlePublish() {
    if (!isValid || !myOrg) return;
    setPublishing(true);

    const author = { authorType: myOrg.orgType, authorId: myOrg.orgId };
    const effectiveType = resolveEffectivePostType();

    const { data: post, error: createError } = await createPost(supabase, {
      author_type: author.authorType,
      author_id: author.authorId,
      post_type: effectiveType,
      content: content.trim() || null,
    });

    if (createError || !post) {
      setPublishing(false);
      Alert.alert('Eroare', createError?.message ?? 'Nu s-a putut publica postarea');
      return;
    }

    for (const [index, item] of media.entries()) {
      try {
        if (item.type === 'video') {
          const { upload_url } = await createPostVideoUpload(supabase, post.id, index);
          const response = await fetch(item.uri);
          const blob = await response.blob();
          await uploadVideoToMux(upload_url, blob);
          continue;
        }

        const path = `${author.authorId}/${post.id}/${Date.now()}-${index}.jpg`;
        const arrayBuffer = await readUriAsArrayBuffer(item.uri);
        const { error: uploadError } = await supabase.storage.from('post-media').upload(path, arrayBuffer, {
          contentType: 'image/jpeg',
        });

        if (uploadError) {
          Alert.alert('Eroare upload', `${uploadError.message} (imagine #${index + 1})`);
          continue;
        }

        const { error: mediaError } = await supabase.from('post_media').insert({
          post_id: post.id,
          media_type: 'image',
          storage_path: path,
          video_playback_url: null,
          display_order: index,
        });

        if (mediaError) {
          Alert.alert('Eroare', mediaError.message);
        }
      } catch (err) {
        Alert.alert('Eroare', err instanceof Error ? err.message : 'Upload media eșuat');
      }
    }

    setPublishing(false);
    track({ name: 'post_created', properties: { post_type: effectiveType } });

    if (media.some((m) => m.type === 'video')) {
      Alert.alert('Video în procesare', 'Videoclipul va apărea în feed când transcoding-ul Mux este gata.');
    }

    router.back();
  }

  if (isChecking) {
    return (
      <ScreenShell showBack title="Postare nouă">
        <View className="items-center py-xl">
          <ActivityIndicator size="large" color="#0F6B66" />
        </View>
      </ScreenShell>
    );
  }

  if (!isAllowed) return null;

  return (
    <ScreenShell scroll showBack title="Postare nouă" subtitle="Publică pentru pacienți și parteneri B2B" keyboardShouldPersistTaps="handled">
      <View className="gap-md">
        <View className="flex-row flex-wrap gap-sm">
          {TYPE_OPTIONS.map((opt) => {
            const selected = postType === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => {
                  setPostType(opt.key);
                  if (opt.key === 'text' || opt.key === 'announcement') setMedia([]);
                }}
                className={`rounded-2xl px-md py-sm border ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-primary' : 'text-text-primary'}`}>{opt.label}</Text>
                <Text className="text-xs text-text-secondary mt-0.5">{opt.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        <View className="bg-surface border border-border rounded-2xl p-md gap-md">
          <AppTextInput
            value={content}
            onChangeText={setContent}
            placeholder="Scrie ceva despre clinica ta…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            className="text-base text-text-primary min-h-[120px]"
          />

          {(postType === 'photo' || postType === 'video' || media.length > 0) && (
            <Button
              label={media.length > 0 ? 'Adaugă mai multe' : postType === 'video' ? 'Selectează video' : 'Selectează poze'}
              variant="secondary"
              onPress={handlePickMedia}
            />
          )}

          {media.length > 0 ? (
            <View className="flex-row flex-wrap gap-sm">
              {media.map((item, index) => (
                <View key={`${item.uri}-${index}`} className="relative">
                  {item.type === 'image' ? (
                    <Image source={{ uri: item.uri }} style={{ width: 96, height: 96, borderRadius: 12 }} contentFit="cover" />
                  ) : (
                    <View className="w-24 h-24 rounded-xl bg-border items-center justify-center">
                      <Text className="text-2xl">▶</Text>
                      <Text className="text-xs text-text-secondary mt-1">Video</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => handleRemoveMedia(index)}
                    className="absolute -top-2 -right-2 bg-error rounded-full w-7 h-7 items-center justify-center"
                  >
                    <Text className="text-white text-sm font-bold">×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Button label="Publică postarea" onPress={handlePublish} loading={publishing} disabled={!isValid} />
      </View>
    </ScreenShell>
  );
}
