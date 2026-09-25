import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  submitVerificationRequest,
  uploadVerificationDocument,
  getVerificationStatus,
  REQUIRED_DOCUMENTS,
} from '@dental/api';
import { Badge } from '@dental/ui';
import { ScreenShell } from '@mobile/components/ScreenShell';
import { supabase } from '@mobile/lib/supabase';

const DOC_LABELS: Record<string, string> = {
  cui: 'Certificat CUI',
  dsp_authorization: 'Autorizație de funcționare DSP',
  technician_certificate: 'Certificat / diplomă tehnician responsabil',
  id_document: 'CI reprezentant legal',
  other: 'Alt document',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'În așteptare',
  approved: 'Aprobat',
  rejected: 'Respins',
};

export default function VerificationSubmitScreen() {
  const { subjectType, subjectId } = useLocalSearchParams<{ subjectType: 'clinic' | 'laboratory'; subjectId: string }>();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: statusData, refetch } = useQuery({
    queryKey: ['verification-status', subjectType, subjectId],
    queryFn: () => getVerificationStatus(supabase, subjectType, subjectId),
    enabled: !!subjectType && !!subjectId,
  });

  const requiredDocs = REQUIRED_DOCUMENTS[subjectType as 'clinic' | 'laboratory'] ?? [];
  const existingRequest = statusData?.data;
  const uploadedTypes = new Set(
    ((existingRequest as { verification_documents?: { document_type: string }[] } | null)?.verification_documents ?? []).map(
      (doc) => doc.document_type
    )
  );

  async function handleUpload(docType: string) {
    if (!subjectType || !subjectId) return;

    let requestId = existingRequest?.id;
    if (!requestId) {
      const { data: newRequest, error } = await submitVerificationRequest(supabase, subjectType, subjectId);
      if (error || !newRequest) {
        Alert.alert('Eroare', error?.message ?? 'Nu am putut crea cererea de verificare.');
        return;
      }
      requestId = newRequest.id;
    }

    setUploading(docType);
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
      if (result.canceled || !result.assets?.[0]) {
        setUploading(null);
        return;
      }
      const asset = result.assets[0];
      await uploadVerificationDocument(supabase, requestId, docType as any, {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/octet-stream',
      });
      queryClient.invalidateQueries({ queryKey: ['verification-status', subjectType, subjectId] });
      refetch();
    } catch (err) {
      Alert.alert('Eroare', err instanceof Error ? err.message : 'Încărcarea a eșuat.');
    } finally {
      setUploading(null);
    }
  }

  const orgLabel = subjectType === 'laboratory' ? 'laboratorului' : 'clinicii';
  const isLocked = existingRequest?.status === 'approved';

  return (
    <ScreenShell scroll showBack title="Verificare identitate" subtitle={`Documente pentru badge Verificat — ${orgLabel} tău`}>
      {existingRequest ? (
        <Badge
          label={`Status: ${STATUS_LABELS[existingRequest.status] ?? existingRequest.status}`}
          variant={existingRequest.status === 'approved' ? 'verified' : 'neutral'}
        />
      ) : null}

      <Text className="text-sm text-text-secondary">
        Încarcă documentele de mai jos. Sunt vizibile doar administratorilor platformei. După trimitere, echipa noastră le
        verifică manual.
      </Text>

      {requiredDocs.map((docType) => {
        const uploaded = uploadedTypes.has(docType);
        return (
          <Pressable
            key={docType}
            onPress={() => handleUpload(docType)}
            disabled={uploading === docType || isLocked}
            className={`border rounded-xl p-md flex-row items-center justify-between gap-sm ${
              uploaded ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface'
            }`}
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-text-primary">{DOC_LABELS[docType] ?? docType}</Text>
              {uploaded ? <Text className="text-xs text-primary font-medium">Încărcat ✓</Text> : null}
            </View>
            <Text className="text-sm text-primary font-medium">
              {uploading === docType ? 'Se încarcă…' : uploaded ? 'Reîncarcă' : 'Încarcă'}
            </Text>
          </Pressable>
        );
      })}

      {existingRequest?.review_note ? (
        <View className="border border-error/40 bg-error/5 rounded-xl p-md gap-1">
          <Text className="text-xs text-text-secondary">Notă administrator:</Text>
          <Text className="text-base text-text-primary">{existingRequest.review_note}</Text>
        </View>
      ) : null}

      {existingRequest?.status === 'pending' ? (
        <Text className="text-xs text-text-secondary">
          Cererea ta este în revizuire. Vei primi notificare când este aprobată sau respinsă.
        </Text>
      ) : null}
    </ScreenShell>
  );
}
