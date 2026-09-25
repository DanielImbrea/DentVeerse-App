import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@dental/ui';
import { useRouter } from 'expo-router';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { DateOfBirthField } from '@mobile/components/DateOfBirthField';
import { getPatientProfileGap } from '@mobile/lib/onboarding';
import { useAuthStore } from '@mobile/stores/authStore';
import { track } from '@dental/analytics';

export default function PatientOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.userId);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [returningUserMissingDobOnly, setReturningUserMissingDobOnly] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setLoadingProfile(true);

    Promise.all([
      supabase
        .from('patient_profiles')
        .select('first_name, last_name, city, date_of_birth')
        .eq('user_id', userId)
        .maybeSingle(),
      getPatientProfileGap(supabase, userId),
    ]).then(([{ data }, gap]) => {
      if (cancelled) return;
      if (data?.first_name) setFirstName(data.first_name);
      if (data?.last_name) setLastName(data.last_name);
      if (data?.city) setCity(data.city);
      if (data?.date_of_birth) setDateOfBirth(data.date_of_birth);
      setReturningUserMissingDobOnly(gap.returningUserMissingDobOnly);
      setLoadingProfile(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function handleSubmit() {
    if (!userId || !dateOfBirth) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await supabase.from('patient_profiles').upsert({
      user_id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth,
      city: city.trim() || null,
    });

    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setOnboarded(true);
    track({ name: 'onboarding_completed', properties: { account_type: 'patient' } });
    track({ name: 'profile_created', properties: { account_type: 'patient' } });
    router.replace('/(tabs)/home');
  }

  const canSubmit = Boolean(firstName.trim() && lastName.trim() && dateOfBirth);

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-background items-center justify-center" style={{ paddingTop: insets.top }}>
        <ActivityIndicator size="large" color="#0F6B66" />
      </View>
    );
  }

  return (
    <View
      className="flex-1 bg-background px-xl gap-lg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <View>
        <Text className="text-2xl font-semibold text-text-primary">
          {returningUserMissingDobOnly ? 'Completează data nașterii' : 'Spune-ne despre tine'}
        </Text>
        <Text className="text-sm text-text-secondary mt-2">
          {returningUserMissingDobOnly
            ? 'Profilul tău există deja — am adăugat data nașterii ca informație obligatorie. Alege-o din calendar ca să continui.'
            : 'Numele și data nașterii sunt obligatorii ca să te recunoască clinicile în mesaje și notificări.'}
        </Text>
      </View>

      <View className="gap-sm">
        <AppTextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Prenume *"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          editable={!returningUserMissingDobOnly}
          className={`bg-surface ${returningUserMissingDobOnly ? 'opacity-80' : ''}`}
        />
        <AppTextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Nume *"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
          editable={!returningUserMissingDobOnly}
          className={`bg-surface ${returningUserMissingDobOnly ? 'opacity-80' : ''}`}
        />
        <DateOfBirthField value={dateOfBirth} onChange={setDateOfBirth} />
        <AppTextInput
          value={city}
          onChangeText={setCity}
          placeholder="Oraș (opțional)"
          placeholderTextColor="#9CA3AF"
          className="bg-surface"
        />
      </View>

      {errorMessage ? (
        <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
          <Text className="text-sm text-error text-center">{errorMessage}</Text>
        </View>
      ) : null}

      <Button label="Continuă" onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
    </View>
  );
}
