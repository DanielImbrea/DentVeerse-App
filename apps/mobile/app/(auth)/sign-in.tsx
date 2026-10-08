import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@dental/ui';
import { signInWithEmail } from '@dental/api';
import { Link, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { AuthBrandHeader } from '@mobile/components/AuthBrandHeader';
import { SocialSignInSection } from '@mobile/features/auth/SocialSignInSection';
import { authScrollContentPadding } from '@mobile/features/auth/authScreenLayout';

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confirmed, pendingConfirm } = useLocalSearchParams<{ confirmed?: string; pendingConfirm?: string }>();
  const emailConfirmed = confirmed === '1';
  const awaitingEmailConfirm = pendingConfirm === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    setLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await signInWithEmail(supabase, email.trim(), password);
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      // Navigation is handled by app/_layout.tsx once the Supabase session is resolved.
    } catch {
      setErrorMessage(t('auth.signIn.networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={authScrollContentPadding(insets)}
        contentContainerClassName="px-xl gap-sm"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthBrandHeader
          title={t('app.name')}
          subtitle={t('app.subtitle')}
          className="mb-0"
          logoSize={72}
          titleClassName="text-lg"
          subtitleClassName="text-sm"
        />

        <View className="bg-surface border border-border rounded-2xl p-md gap-sm shadow-sm">
          <View>
            <Text className="text-lg font-semibold text-text-primary">{t('auth.signIn.title')}</Text>
            <Text className="text-sm text-text-secondary mt-0.5">{t('auth.signIn.subtitle')}</Text>
          </View>

          {emailConfirmed ? (
            <View className="bg-success/10 border border-success/25 rounded-xl px-md py-3">
              <Text className="text-sm text-success text-center">
                Email confirmat! Autentifică-te cu emailul și parola setate la înregistrare.
              </Text>
            </View>
          ) : awaitingEmailConfirm ? (
            <View className="bg-primary/10 border border-primary/25 rounded-xl px-md py-3">
              <Text className="text-sm text-primary text-center">
                Cont creat. Confirmă emailul — linkul te va aduce aici automat după confirmare.
              </Text>
            </View>
          ) : null}

          <View className="gap-sm">
            <View className="gap-1">
              <Text className="text-sm font-medium text-text-primary">{t('auth.signIn.email')}</Text>
              <AppTextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nume@exemplu.ro"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                className="bg-background"
              />
            </View>

            <View className="gap-1">
              <Text className="text-sm font-medium text-text-primary">{t('auth.signIn.password')}</Text>
              <AppTextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                autoComplete="password"
                className="bg-background"
              />
            </View>
          </View>

          {errorMessage ? (
            <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
              <Text className="text-sm text-error text-center">{errorMessage}</Text>
            </View>
          ) : null}

          <Button label={t('auth.signIn.submit')} onPress={handleSignIn} loading={loading} />

          <View className="flex-row justify-between">
            <Link href="/(auth)/forgot-password">
              <Text className="text-sm text-primary font-medium">{t('auth.signIn.forgotPassword')}</Text>
            </Link>
            <Link href="/(auth)/sign-up">
              <Text className="text-sm text-primary font-medium">{t('auth.signIn.createAccount')}</Text>
            </Link>
          </View>

          <View className="flex-row items-center gap-md pt-0.5">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-xs text-text-secondary">{t('auth.signIn.or')}</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          <SocialSignInSection mode="sign-in" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
