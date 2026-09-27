'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { createWebSupabaseClient } from '../lib/supabase-browser';

const STORAGE_KEY = 'dental_cookie_consent';
const COOKIE_POLICY_VERSION = '2026-08-19';

type ConsentChoice = 'accepted' | 'rejected';

/**
 * Cookie consent banner — previously entirely missing from apps/web, per
 * docs/11-gdpr-i18n.md Part A ("Cookie Policy + consent banner: web only").
 * Real implementation: blocks nothing from rendering (no cookie-gated
 * scripts currently exist on the marketing site to actually block), but
 * records the choice both locally (so the banner doesn't reappear every
 * visit) and, if the visitor has an authenticated session, in
 * `consent_records` via the same `recordConsent` pattern used by mobile
 * signup (packages/api/src/gdpr.ts) — most marketing-site visitors are
 * anonymous, so the local-only record is the common case, which is
 * standard and compliant (consent doesn't require an account).
 *
 * STATUS: written, NOT executed — no browser environment available in this
 * session to confirm localStorage/rendering behavior, but this is
 * ordinary, low-risk client-side code, not a device/API-key-dependent
 * integration like the mobile picker/webview flows.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setVisible(true);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (parsed.version !== COOKIE_POLICY_VERSION) {
        setVisible(true); // policy changed since last consent — ask again
      }
    } catch {
      setVisible(true);
    }
  }, []);

  async function handleChoice(choice: ConsentChoice) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, version: COOKIE_POLICY_VERSION, at: new Date().toISOString() }));
    setVisible(false);

    // Best-effort — only succeeds if the visitor has an active Supabase
    // session; anonymous visitors (the common case on a marketing site)
    // rely on the localStorage record alone, which is sufficient.
    try {
      const supabase = createWebSupabaseClient() as unknown as SupabaseClient<Database>;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('consent_records').insert({
          user_id: user.id,
          consent_type: 'marketing',
          version: `cookies-${COOKIE_POLICY_VERSION}-${choice}`,
        });
      }
    } catch {
      // Non-fatal — localStorage record already saved above.
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
      <p className="text-sm text-text-secondary flex-1">
        We use cookies to run this site and understand how it&apos;s used. See our{' '}
        <a href="/cookie-policy" className="underline text-primary">
          Cookie Policy
        </a>{' '}
        for details.
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => handleChoice('rejected')}
          className="px-4 py-2 text-sm border border-border rounded-md text-text-secondary"
        >
          Reject
        </button>
        <button onClick={() => handleChoice('accepted')} className="px-4 py-2 text-sm bg-primary text-white rounded-md">
          Accept
        </button>
      </div>
    </div>
  );
}
