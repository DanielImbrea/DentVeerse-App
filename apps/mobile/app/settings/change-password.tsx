import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button } from '@dental/ui';
import { sendPasswordReset } from '@dental/api';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';

export default function ChangePasswordScreen() {
  const userId = useAuthStore((s) => s.userId);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
    });
  }, []);

  async function handleSubmit() {
    setLoading(true);
    const { error } = await sendPasswordReset(supabase, email.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Eroare', error.message);
      return;
    }
    setSent(true);
  }

  return (
    <ScreenShell centerContent showBack title="Schimbă parola" subtitle="Trimitem un link de resetare pe emailul contului tău.">
      {sent ? (
        <View className="bg-surface border border-border rounded-2xl p-xl">
          <Text className="text-base text-text-primary text-center">
            Verifică inbox-ul pentru <Text className="font-semibold">{email}</Text> și urmează instrucțiunile din email.
          </Text>
        </View>
      ) : (
        <View className="bg-surface border border-border rounded-2xl p-xl gap-md">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-text-primary">Email cont</Text>
            <AppTextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={false}
              className="border border-border rounded-xl px-md text-base bg-background text-text-secondary"
            />
          </View>
          <Button label="Trimite link resetare" onPress={handleSubmit} loading={loading} disabled={!email || !userId} />
        </View>
      )}
    </ScreenShell>
  );
}
