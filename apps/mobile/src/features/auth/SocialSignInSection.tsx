import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AppleSignInButton } from '@mobile/features/auth/AppleSignInButton';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignInButton } from '@mobile/features/auth/GoogleSignInButton';
import {
  recordConsent,
  signInWithAppleIdToken,
  signInWithGoogleIdToken,
  setAccountType,
} from '@dental/api';
import type { AccountType } from '@dental/types';
import { supabase } from '@mobile/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const TERMS_VERSION = '2026-08-12';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

export function isGoogleSignInConfigured(): boolean {
  return GOOGLE_WEB_CLIENT_ID.length > 0;
}

type Props = {
  /** Sign-up requires account type before social login. */
  mode: 'sign-in' | 'sign-up';
  accountType?: AccountType | null;
  onNeedsAccountType?: () => void;
};

export function SocialSignInSection({ mode, accountType, onNeedsAccountType }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const finishSocialSession = useCallback(
    async (provider: 'google' | 'apple') => {
      if (mode === 'sign-up') {
        if (!accountType) {
          onNeedsAccountType?.();
          throw new Error(t('auth.signUp.pickAccountType'));
        }
        await recordConsent(supabase, 'terms', TERMS_VERSION);
        await recordConsent(supabase, 'privacy_policy', TERMS_VERSION);
        const { error: typeError } = await setAccountType(supabase, accountType);
        if (typeError) throw typeError;
      }
      setErrorMessage(null);
      void provider;
    },
    [accountType, mode, onNeedsAccountType, t]
  );

  useEffect(() => {
    if (googleResponse?.type !== 'success') {
      if (googleResponse?.type === 'error') {
        setErrorMessage(googleResponse.error?.message ?? t('auth.signIn.socialFailed'));
        setBusy(null);
      }
      return;
    }

    const idToken = googleResponse.params.id_token;
    if (!idToken) {
      setErrorMessage(t('auth.signIn.socialFailed'));
      setBusy(null);
      return;
    }

    void (async () => {
      try {
        if (mode === 'sign-up' && !accountType) {
          onNeedsAccountType?.();
          return;
        }
        const { error } = await signInWithGoogleIdToken(supabase, idToken);
        if (error) throw error;
        await finishSocialSession('google');
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : t('auth.signIn.socialFailed'));
      } finally {
        setBusy(null);
      }
    })();
  }, [
    googleResponse,
    accountType,
    mode,
    finishSocialSession,
    onNeedsAccountType,
    t,
  ]);

  async function handleGooglePress() {
    if (!isGoogleSignInConfigured()) return;
    if (mode === 'sign-up' && !accountType) {
      onNeedsAccountType?.();
      return;
    }
    setErrorMessage(null);
    setBusy('google');
    const result = await promptGoogleAsync();
    if (result.type === 'dismiss' || result.type === 'cancel') {
      setBusy(null);
    }
  }

  async function handleApplePress() {
    if (mode === 'sign-up' && !accountType) {
      onNeedsAccountType?.();
      return;
    }
    setErrorMessage(null);
    setBusy('apple');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error(t('auth.signIn.socialFailed'));
      }
      const { error } = await signInWithAppleIdToken(supabase, credential.identityToken);
      if (error) throw error;
      await finishSocialSession('apple');
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED')
      ) {
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : t('auth.signIn.socialFailed'));
    } finally {
      setBusy(null);
    }
  }

  const googleEnabled = isGoogleSignInConfigured() && !!googleRequest;
  const appleEnabled = Platform.OS === 'ios' && appleAvailable;
  const anyEnabled = googleEnabled || appleEnabled;

  if (!anyEnabled) {
    return (
      <View className="gap-sm">
        <Text className="text-xs text-text-secondary text-center">{t('auth.signIn.socialNotConfigured')}</Text>
      </View>
    );
  }

  return (
    <View className="w-full gap-3 pb-0.5">
      {googleEnabled ? (
        <GoogleSignInButton
          label={t('auth.signIn.google')}
          loading={busy === 'google'}
          disabled={busy !== null && busy !== 'google'}
          onPress={() => void handleGooglePress()}
        />
      ) : null}
      {appleEnabled ? (
        <AppleSignInButton
          label={t('auth.signIn.apple')}
          loading={busy === 'apple'}
          disabled={busy !== null && busy !== 'apple'}
          onPress={() => void handleApplePress()}
        />
      ) : null}
      {errorMessage ? (
        <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
          <Text className="text-sm text-error text-center">{errorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}
