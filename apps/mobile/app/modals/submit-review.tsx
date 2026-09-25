import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { submitReview } from '@dental/api';
import { track } from '@dental/analytics';
import { Button } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { useRequireAccountType } from '@mobile/hooks/useRequireAccountType';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';

/**
 * Review submission — real form wired to `submitReview`, which is
 * server-side gated to `account_type='patient'` and the one-review-per-
 * clinic uniqueness constraint (supabase/migrations/0008 +
 * 0020_rls_policies_part3.sql). A duplicate submission attempt surfaces a
 * clear message rather than a raw Postgres error string.
 */
export default function SubmitReviewModal() {
  const { clinicId } = useLocalSearchParams<{ clinicId: string }>();
  const router = useRouter();
  const { isAllowed, isChecking } = useRequireAccountType('patient');
  const [rating, setRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [experienceRating, setExperienceRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  function StarRow({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
    return (
      <View className="gap-xs">
        <Text className="font-body text-body text-text-primary">{label}</Text>
        <View className="flex-row gap-xs">
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => onChange(star)}>
              <Text className={`text-2xl ${star <= value ? 'text-accent' : 'text-border'}`}>★</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  async function handleSubmit() {
    if (!clinicId || rating === 0) return;
    setLoading(true);

    const { error } = await submitReview(supabase, {
      clinic_id: clinicId as string,
      rating,
      communication_rating: communicationRating || null,
      professionalism_rating: professionalismRating || null,
      experience_rating: experienceRating || null,
      comment: comment || null,
    });

    setLoading(false);

    if (error) {
      Alert.alert(
        'Eroare',
        error.message.includes('duplicate key') ? 'Ai lăsat deja o recenzie pentru această clinică.' : error.message
      );
      return;
    }

    track({ name: 'review_submitted', properties: { clinic_id: clinicId as string, rating } });
    router.back();
  }

  if (isChecking) {
    return (
      <ScreenShell showBack title="Lasă o recenzie">
        <View className="items-center justify-center py-xxl">
          <ActivityIndicator size="large" color="#0F6B66" />
        </View>
      </ScreenShell>
    );
  }

  if (!isAllowed) return null;

  return (
    <ScreenShell scroll showBack title="Lasă o recenzie" keyboardShouldPersistTaps="handled">
      <StarRow value={rating} onChange={setRating} label="Evaluare generală" />
      <StarRow value={communicationRating} onChange={setCommunicationRating} label="Comunicare (opțional)" />
      <StarRow value={professionalismRating} onChange={setProfessionalismRating} label="Profesionalism (opțional)" />
      <StarRow value={experienceRating} onChange={setExperienceRating} label="Experiență generală (opțional)" />

      <AppTextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Descrie experiența ta (opțional)"
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={4}
        className="bg-surface min-h-[100px]"
      />

      <Button label="Trimite recenzia" onPress={handleSubmit} loading={loading} disabled={rating === 0} />
    </ScreenShell>
  );
}
