'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@dental/types';
import { ActionButton } from '../../../components/ActionButton';
import { s } from '../../../lib/strings';

export function ViewDocumentButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
    );

    const { data, error: invokeError } = await supabase.functions.invoke('admin-verification-document-url', {
      body: { document_id: documentId },
    });

    setLoading(false);

    if (invokeError || !data?.signed_url) {
      setError(invokeError?.message ?? s.errors.loadDocument);
      return;
    }

    window.open(data.signed_url, '_blank', 'noopener,noreferrer');
  }

  return (
    <span>
      <ActionButton
        type="button"
        onClick={handleView}
        disabled={loading}
        variant="primary"
        tooltip={s.tooltips.viewDocument}
        className="underline underline-offset-2"
      >
        {loading ? s.actions.loading : s.actions.viewDocument}
      </ActionButton>
      {error ? <span className="text-error text-xs ml-2">{error}</span> : null}
    </span>
  );
}
