'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { TURNSTILE_SIGNUP_ACTION } from '@dental/config/turnstile';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
};

/** Web Turnstile (Cloudflare implicit render) — use on future signup/contact forms. */
export function TurnstileWidget({ siteKey, onToken, onError, onExpire, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action: TURNSTILE_SIGNUP_ACTION,
      theme: 'light',
      callback: (token) => onToken(token),
      'error-callback': () => onError?.(),
      'expired-callback': () => {
        onExpire?.();
        if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
      },
    });
  }, [ready, siteKey, onToken, onError, onExpire]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className={className ?? 'min-h-[65px]'} />
    </>
  );
}
