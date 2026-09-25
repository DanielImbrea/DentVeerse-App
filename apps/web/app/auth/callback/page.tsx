'use client';

import { useEffect, useState } from 'react';
import { AUTH_APP_SIGN_IN_AFTER_CONFIRM, SITE } from '@dental/config/site';
import { SiteLogo } from '../../../components/SiteLogo';
import { parseAuthHashFromWindow } from '../../../lib/auth-hash';
import { createWebSupabaseClient } from '../../../lib/supabase-browser';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Confirmăm contul…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokens = parseAuthHashFromWindow();
      if (!tokens) {
        if (!cancelled) setMessage('Link invalid sau expirat. Încearcă din nou din email.');
        return;
      }

      try {
        const supabase = createWebSupabaseClient();
        const { error } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (error) throw error;

        window.location.replace(AUTH_APP_SIGN_IN_AFTER_CONFIRM);
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : 'Nu am putut finaliza confirmarea.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8 gap-4 text-center">
      <SiteLogo size={96} className="h-24 w-24 mb-2" />
      <p className="text-text-secondary">{message}</p>
      <p className="text-sm text-text-secondary">
        Dacă aplicația nu se deschide automat, deschide {SITE.productName} pe telefon și autentifică-te.
      </p>
      <a href={AUTH_APP_SIGN_IN_AFTER_CONFIRM} className="text-primary font-medium underline">
        Deschide aplicația
      </a>
    </main>
  );
}
