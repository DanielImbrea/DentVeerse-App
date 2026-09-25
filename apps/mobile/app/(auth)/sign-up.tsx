import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@dental/ui';
import { signUpWithEmail, recordConsent, verifyCaptcha, setAccountType } from '@dental/api';
import { track } from '@dental/analytics';
import type { AccountType } from '@dental/types';
import { supabase } from '@mobile/lib/supabase';
import { AppTextInput } from '@mobile/components/AppTextInput';
import { useAuthStore } from '@mobile/stores/authStore';
import { CaptchaWidget } from '@mobile/features/auth/CaptchaWidget';
import { AuthBrandHeader } from '@mobile/components/AuthBrandHeader';

const TERMS_VERSION = '2026-08-12';
const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY ?? '';
const DEV_SIGNUP_WITHOUT_CAPTCHA = __DEV__ && !TURNSTILE_SITE_KEY;

const ACCOUNT_OPTIONS: { type: AccountType; label: string; icon: string }[] = [
  { type: 'patient', label: 'Pacient', icon: '👤' },
  { type: 'clinic', label: 'Clinică', icon: '🦷' },
  { type: 'laboratory', label: 'Laborator', icon: '🧪' },
];

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountTypeChoice] = useState<AccountType | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(DEV_SIGNUP_WITHOUT_CAPTCHA ? 'dev-bypass' : null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSignUp() {
    if (!accountType) {
      setErrorMessage('Alege tipul de cont.');
      return;
    }

    if (!DEV_SIGNUP_WITHOUT_CAPTCHA && !captchaToken) {
      setErrorMessage('Completează verificarea anti-bot.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!DEV_SIGNUP_WITHOUT_CAPTCHA) {
      const isHuman = await verifyCaptcha(supabase, captchaToken!, { action: 'signup' }).catch(() => false);
      if (!isHuman) {
        setLoading(false);
        setCaptchaToken(null);
        setErrorMessage('Verificarea a eșuat. Încearcă din nou.');
        return;
      }
    }

    const { data, error } = await signUpWithEmail(supabase, email.trim(), password);
    if (error || !data.user) {
      setLoading(false);
      setErrorMessage(error?.message ?? 'Înregistrarea a eșuat');
      return;
    }

    if (!data.session) {
      setLoading(false);
      setSuccessMessage(
        'Cont creat! Verifică emailul (inclusiv spam) și apăsă linkul de confirmare — vei fi dus automat la autentificare în app.'
      );
      setTimeout(() => router.replace('/(auth)/sign-in?pendingConfirm=1'), 4000);
      return;
    }

    try {
      await recordConsent(supabase, 'terms', TERMS_VERSION);
      await recordConsent(supabase, 'privacy_policy', TERMS_VERSION);
    } catch (consentError) {
      console.error('Failed to record consent:', consentError);
    }

    try {
      const { error: typeError } = await setAccountType(supabase, accountType);
      if (typeError) {
        setLoading(false);
        setErrorMessage(typeError.message);
        return;
      }
    } catch (typeErr) {
      setLoading(false);
      setErrorMessage(
        typeErr instanceof Error ? typeErr.message : 'Nu s-a putut seta tipul de cont. Încearcă din nou după autentificare.'
      );
      return;
    }

    setSession(data.user.id, accountType);
    setLoading(false);
    track({ name: 'signup_completed', properties: { account_type: accountType } });

    if (accountType === 'patient') {
      router.replace('/(onboarding)/patient/profile');
    } else if (accountType === 'clinic') {
      router.replace('/(onboarding)/clinic/profile');
    } else {
      router.replace('/(onboarding)/laboratory/profile');
    }
  }

  const canSubmit = (DEV_SIGNUP_WITHOUT_CAPTCHA || !!captchaToken) && !!email && !!password && !!accountType;

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        contentContainerClassName="px-xl gap-lg"
        keyboardShouldPersistTaps="handled"
      >
        <AuthBrandHeader
          logoSize={96}
          className="items-center mb-sm"
          titleClassName="text-2xl"
          subtitleClassName="text-sm"
          title="Creează cont"
          subtitle="Alege tipul de cont — decizia este definitivă"
        />

        <View className="gap-sm">
          <Text className="text-sm font-medium text-text-primary">Te înregistrezi ca</Text>
          <View className="flex-row gap-sm">
            {ACCOUNT_OPTIONS.map((option) => {
              const isSelected = accountType === option.type;
              return (
                <Pressable
                  key={option.type}
                  onPress={() => setAccountTypeChoice(option.type)}
                  className={`flex-1 border rounded-2xl py-md px-sm items-center gap-1 active:opacity-90 ${
                    isSelected ? 'border-primary bg-primary/10' : 'border-border bg-surface'
                  }`}
                >
                  <Text className="text-xl">{option.icon}</Text>
                  <Text
                    className={`text-xs font-semibold text-center ${
                      isSelected ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-text-secondary">
            {accountType === 'patient'
              ? 'Descoperă clinici, urmărește, mesaje și recenzii.'
              : accountType === 'clinic'
                ? 'Profil public, echipă, servicii, portofoliu și postări.'
                : accountType === 'laboratory'
                  ? 'Profil public, portofoliu și colaborări B2B cu clinici.'
                  : 'Selectează Pacient, Clinică sau Laborator.'}
          </Text>
        </View>

        <View className="bg-surface border border-border rounded-2xl p-xl gap-md">
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-text-primary">Email</Text>
            <AppTextInput
              value={email}
              onChangeText={setEmail}
              placeholder="nume@exemplu.ro"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              className="bg-background"
            />
          </View>
          <View className="gap-1.5">
            <Text className="text-sm font-medium text-text-primary">Parolă</Text>
            <AppTextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minim 8 caractere"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              className="bg-background"
            />
          </View>

          {TURNSTILE_SITE_KEY ? (
            <CaptchaWidget
              siteKey={TURNSTILE_SITE_KEY}
              onToken={(t) => {
                setCaptchaToken(t);
                setErrorMessage(null);
              }}
              onError={() => {
                setCaptchaToken(null);
                setErrorMessage('Widget-ul de verificare nu s-a încărcat.');
              }}
              onExpire={() => setCaptchaToken(null)}
            />
          ) : DEV_SIGNUP_WITHOUT_CAPTCHA ? (
            <Text className="text-xs text-text-secondary text-center bg-background rounded-xl p-sm">
              Mod dev: CAPTCHA dezactivat local — OK doar pentru teste.
            </Text>
          ) : (
            <Text className="text-sm text-error text-center">
              CAPTCHA neconfigurat — înregistrarea e blocată până setăm EXPO_PUBLIC_TURNSTILE_SITE_KEY.
            </Text>
          )}

          {successMessage ? (
            <View className="bg-success/10 border border-success/25 rounded-xl px-md py-3">
              <Text className="text-sm text-success text-center">{successMessage}</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
              <Text className="text-sm text-error text-center">{errorMessage}</Text>
            </View>
          ) : null}

          <Text className="text-xs text-text-secondary text-center">
            Continuând, accepți Termenii și Politica de confidențialitate.
          </Text>

          <Button label="Continuă" onPress={handleSignUp} loading={loading} disabled={!canSubmit} />
        </View>

        <Link href="/(auth)/sign-in" asChild>
          <Pressable className="items-center">
            <Text className="text-sm text-primary font-medium">Ai deja cont? Autentifică-te</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
