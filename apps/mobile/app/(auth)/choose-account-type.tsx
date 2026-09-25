import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@dental/ui';
import { setAccountType } from '@dental/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@mobile/lib/supabase';
import { useAuthStore } from '@mobile/stores/authStore';
import type { AccountType } from '@dental/types';

type Option = {
  type: AccountType;
  label: string;
  description: string;
  icon: string;
  group: 'patient' | 'professional';
};

const OPTIONS: Option[] = [
  {
    type: 'patient',
    label: 'Pacient',
    description: 'Caut clinici și stomatologi, urmăresc, las recenzii, trimit mesaje.',
    icon: '👤',
    group: 'patient',
  },
  {
    type: 'clinic',
    label: 'Clinică stomatologică',
    description: 'Profil public, echipă, servicii, portofoliu și postări pentru pacienți.',
    icon: '🦷',
    group: 'professional',
  },
  {
    type: 'laboratory',
    label: 'Laborator dentar',
    description: 'Profil public, portofoliu, colaborări B2B cu clinici.',
    icon: '🧪',
    group: 'professional',
  },
];

export default function ChooseAccountTypeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setSession = useAuthStore((s) => s.setSession);
  const userId = useAuthStore((s) => s.userId);
  const [selected, setSelected] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    setErrorMessage(null);

    const { error } = await setAccountType(supabase, selected);
    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSession(userId, selected);

    if (selected === 'patient') {
      router.replace('/(onboarding)/patient/profile');
    } else if (selected === 'clinic') {
      router.replace('/(onboarding)/clinic/profile');
    } else {
      router.replace('/(onboarding)/laboratory/profile');
    }
  }

  function renderGroup(title: string, subtitle: string, group: Option['group']) {
    const items = OPTIONS.filter((o) => o.group === group);
    return (
      <View className="gap-sm">
        <View>
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{title}</Text>
          <Text className="text-sm text-text-secondary mt-0.5">{subtitle}</Text>
        </View>
        {items.map((option) => {
          const isSelected = selected === option.type;
          return (
            <Pressable
              key={option.type}
              onPress={() => setSelected(option.type)}
              className={`border rounded-2xl p-lg flex-row gap-md items-start active:opacity-90 ${
                isSelected ? 'border-primary bg-primary/5' : 'border-border bg-surface'
              }`}
            >
              <View className="w-11 h-11 rounded-xl bg-background items-center justify-center">
                <Text className="text-xl">{option.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-text-primary">{option.label}</Text>
                <Text className="text-sm text-text-secondary mt-1">{option.description}</Text>
              </View>
              {isSelected ? <Ionicons name="checkmark-circle" size={22} color="#0F6B66" /> : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      contentContainerClassName="px-xl gap-lg"
    >
      <View>
        <Text className="text-2xl font-semibold text-text-primary">Ce tip de cont ai nevoie?</Text>
        <Text className="text-sm text-text-secondary mt-2">
          Alegerea este <Text className="font-semibold">definitivă</Text> — nu poți schimba tipul contului mai târziu.
        </Text>
      </View>

      {renderGroup('Utilizator', 'Pentru persoane care caută servicii stomatologice', 'patient')}
      {renderGroup('Profesionist', 'Pentru clinici și laboratoare care se promovează pe platformă', 'professional')}

      {errorMessage ? (
        <View className="bg-error/10 border border-error/20 rounded-xl px-md py-3">
          <Text className="text-sm text-error text-center">{errorMessage}</Text>
        </View>
      ) : null}

      <Button label="Continuă" onPress={handleConfirm} loading={loading} disabled={!selected} />
    </ScrollView>
  );
}
