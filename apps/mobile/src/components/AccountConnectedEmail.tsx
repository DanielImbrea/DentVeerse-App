import React from 'react';
import { Text, View } from 'react-native';
import { useConnectedEmail } from '@mobile/hooks/useConnectedEmail';
import { isApplePrivateRelayEmail } from '@mobile/lib/authEmail';

type AccountConnectedEmailProps = {
  /** When true, renders inside a list card (no extra outer padding). */
  compact?: boolean;
};

export function AccountConnectedEmail({ compact }: AccountConnectedEmailProps) {
  const email = useConnectedEmail();

  if (!email) return null;

  const appleRelay = isApplePrivateRelayEmail(email);

  return (
    <View className={compact ? 'flex-row items-start gap-md py-md px-md border-b border-border' : 'flex-row items-start gap-md'}>
      <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
        <Text className="text-lg">{appleRelay ? '🍎' : '✉️'}</Text>
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Email conectat</Text>
        <Text className="text-base text-text-primary mt-0.5" selectable>
          {email}
        </Text>
        {appleRelay ? (
          <Text className="text-sm text-text-secondary mt-2 leading-5">
            Apple folosește adresa relay de mai sus când ai ales „Ascunde-mi emailul”. Pentru adresa personală
            (Yahoo/Gmail), alege „Partajează emailul meu” la Sign in with Apple — doar la prima conectare sau din
            Setări Apple ID → Sign in with Apple → DentVeerse.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
