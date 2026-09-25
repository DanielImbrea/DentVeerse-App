import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { requestDataExport, deleteAccount, getMyExportRequests, getDataExportUrl } from '@dental/api';
import { ProfileMenuRow } from '@mobile/components/ProfileMenuRow';
import { AccountConnectedEmail } from '@mobile/components/AccountConnectedEmail';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { signOutAndReset } from '@mobile/lib/authSession';
import { supabase } from '@mobile/lib/supabase';
import type { Database } from '@dental/types';

type ExportRequest = Database['public']['Tables']['data_export_requests']['Row'];

export default function SettingsScreen() {
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);

  useEffect(() => {
    refreshExportRequests();
  }, []);

  async function refreshExportRequests() {
    const { data } = await getMyExportRequests(supabase);
    setExportRequests(data ?? []);
  }

  async function handleDownload(requestId: string) {
    try {
      const { signed_url } = await getDataExportUrl(supabase, requestId);
      await Linking.openURL(signed_url);
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Nu am putut obține linkul de descărcare.');
    }
  }

  async function handleExportRequest() {
    setExporting(true);
    try {
      await requestDataExport(supabase);
      Alert.alert('Cerere trimisă', 'Pregătim exportul datelor tale. Vei fi notificat când e gata.');
      refreshExportRequests();
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Cererea a eșuat.');
    } finally {
      setExporting(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Șterge contul',
      'Contul și datele personale vor fi șterse după o perioadă de grație de 30 de zile. Acțiune ireversibilă.',
      [
        { text: 'Anulează', style: 'cancel' },
        {
          text: 'Șterge',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount(supabase);
              await signOutAndReset();
            } catch (err) {
              Alert.alert('Eroare', err instanceof Error ? err.message : 'Ștergerea a eșuat.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  async function handleLogoutEverywhere() {
    try {
      await signOutAndReset('global');
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Deconectarea a eșuat.');
    }
  }

  return (
    <ScreenShell scroll showBack title="Setări cont" subtitle="Confidențialitate, securitate și preferințe">
      <View className="bg-surface border border-border rounded-2xl overflow-hidden">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">
          Cont conectat
        </Text>
        <AccountConnectedEmail compact />
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">
          Datele tale
        </Text>
        <ProfileMenuRow
          icon="📥"
          label={exporting ? 'Se solicită…' : 'Descarcă datele mele (GDPR)'}
          description="Export al datelor personale"
          onPress={handleExportRequest}
        />
        {exportRequests.map((item) => (
          <View key={item.id} className="flex-row items-center justify-between px-md py-sm border-t border-border">
            <Text className="text-sm text-text-secondary">
              {new Date(item.requested_at).toLocaleDateString('ro-RO')} — {item.status}
            </Text>
            {item.status === 'ready' ? (
              <Pressable onPress={() => handleDownload(item.id)}>
                <Text className="text-sm text-primary font-medium">Descarcă</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">
          Preferințe
        </Text>
        <ProfileMenuRow icon="🔔" label="Notificări" description="Push și in-app" href="/settings/notifications" />
        <ProfileMenuRow icon="🚫" label="Utilizatori blocați" href="/settings/blocked-users" />
      </View>

      <View className="bg-surface border border-border rounded-2xl overflow-hidden mt-sm">
        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-md pt-md pb-sm">
          Securitate
        </Text>
        <ProfileMenuRow icon="🔒" label="Schimbă parola" href="/settings/change-password" />
        <ProfileMenuRow
          icon="📱"
          label="Deconectare de pe toate dispozitivele"
          onPress={handleLogoutEverywhere}
        />
      </View>

      <View className="bg-surface border border-error/30 rounded-2xl overflow-hidden mt-sm mb-lg">
        <Text className="text-xs font-semibold text-error uppercase tracking-wide px-md pt-md pb-sm">Zonă periculoasă</Text>
        <ProfileMenuRow
          icon="⚠️"
          label={deleting ? 'Se șterge…' : 'Șterge contul'}
          description="Ștergere definitivă după 30 zile"
          destructive
          onPress={handleDeleteAccount}
        />
      </View>
    </ScreenShell>
  );
}
