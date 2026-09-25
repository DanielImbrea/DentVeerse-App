'use client';

import { useEffect, useState } from 'react';
import { AUTH_APP_SIGN_IN_AFTER_CONFIRM, SITE } from '@dental/config/site';
import { SiteLogo } from '../../../components/SiteLogo';
import { parseAuthHashFromWindow } from '../../../lib/auth-hash';
import { createWebSupabaseClient } from '../../../lib/supabase-browser';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const tokens = parseAuthHashFromWindow();
      if (!tokens) {
        if (!cancelled) setError('Link invalid sau expirat. Solicită din nou resetarea din aplicație.');
        return;
      }

      try {
        const supabase = createWebSupabaseClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (sessionError) throw sessionError;
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Nu am putut valida linkul de resetare.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Parola trebuie să aibă cel puțin 8 caractere.');
      return;
    }
    if (password !== confirm) {
      setError('Parolele nu coincid.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createWebSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nu am putut actualiza parola.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-8 gap-4 max-w-md mx-auto text-center">
        <h1 className="font-display text-2xl text-text-primary">Parolă actualizată</h1>
        <p className="text-text-secondary">Te poți autentifica în aplicație cu noua parolă.</p>
        <a href={AUTH_APP_SIGN_IN_AFTER_CONFIRM.replace('?confirmed=1', '')} className="text-primary font-medium underline">
          Deschide {SITE.productName}
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-8 py-12">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 gap-6 flex flex-col">
        <SiteLogo size={80} className="h-20 w-20 self-center" />
        <div>
          <h1 className="font-display text-2xl text-text-primary">Parolă nouă</h1>
          <p className="text-sm text-text-secondary mt-1">Cont {SITE.brandName}</p>
        </div>

        {error && !ready ? (
          <p className="text-sm text-error">{error}</p>
        ) : null}

        {ready ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-text-primary">Parolă nouă</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 bg-background"
                required
                minLength={8}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-text-primary">Confirmă parola</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="border border-border rounded-xl px-3 py-2 bg-background"
                required
                minLength={8}
              />
            </label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-primary text-white font-medium disabled:opacity-60"
            >
              {loading ? 'Se salvează…' : 'Salvează parola'}
            </button>
          </form>
        ) : !error ? (
          <p className="text-sm text-text-secondary">Se verifică linkul…</p>
        ) : null}
      </div>
    </main>
  );
}
