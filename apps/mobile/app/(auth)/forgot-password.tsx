import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@dental/ui';
import { sendPasswordReset } from '@dental/api';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { supabase } from '@mobile/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setErrorMessage(null);
    const { error } = await sendPasswordReset(supabase, email.trim());
    setLoading(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <ScreenShell centerContent showBack title="Parolă resetată">
        <View className="bg-surface border border-border rounded-2xl p-xl">
          <Text className="text-base text-text-primary text-center">
            Dacă există un cont pentru {email}, am trimis un link de resetare a parolei.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell centerContent showBack title="Schimbă parola" subtitle="Îți trimitem un link pe email">
      <View className="bg-surface border border-border rounded-2xl p-xl gap-md">
        <AppTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
          className="bg-background"
        />
        {errorMessage ? <Text className="text-sm text-error text-center">{errorMessage}</Text> : null}
        <Button label="Trimite link resetare" onPress={handleSubmit} loading={loading} />
      </View>
    </ScreenShell>
  );
}
