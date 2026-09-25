import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { getNotificationPreferences, updateNotificationPreferences } from '@dental/api';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';
import type { Database } from '@dental/types';

type Prefs = Database['public']['Tables']['notification_preferences']['Row'];

const LABELS: { key: keyof Prefs; label: string }[] = [
  { key: 'new_follower', label: 'Urmăritor nou' },
  { key: 'new_like', label: 'Apreciere nouă' },
  { key: 'new_comment', label: 'Comentariu nou' },
  { key: 'new_message', label: 'Mesaj nou' },
  { key: 'collaboration_request', label: 'Cerere de colaborare' },
  { key: 'opportunity_response', label: 'Răspuns oportunitate' },
  { key: 'verification_approved', label: 'Verificare aprobată' },
  { key: 'new_review', label: 'Recenzie nouă' },
];

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);

  useEffect(() => {
    getNotificationPreferences(supabase).then(({ data }) => setPrefs(data ?? null));
  }, []);

  async function handleToggle(key: keyof Prefs, value: boolean) {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: value });
    await updateNotificationPreferences(supabase, { [key]: value });
  }

  if (!prefs) {
    return (
      <ScreenShell showBack title="Notificări">
        <Text className="text-sm text-text-secondary">Se încarcă…</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell scroll showBack title="Notificări" subtitle="Alege ce notificări primești">
      <View className="bg-surface border border-border rounded-2xl overflow-hidden">
        {LABELS.map(({ key, label }, index) => (
          <View
            key={key}
            className={`flex-row items-center justify-between px-md py-md ${index > 0 ? 'border-t border-border' : ''}`}
          >
            <Text className="text-base text-text-primary flex-1 pr-md">{label}</Text>
            <Switch
              value={Boolean(prefs[key])}
              onValueChange={(v) => handleToggle(key, v)}
              trackColor={{ false: '#E6E3DF', true: '#0F6B66' }}
            />
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}
