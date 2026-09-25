import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { TURNSTILE_SIGNUP_ACTION } from '@dental/config/turnstile';

export interface CaptchaWidgetProps {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

/**
 * Cloudflare Turnstile in a WebView (managed widget, action-bound for siteverify).
 * Server verification: supabase/functions/verify-captcha → siteverify API.
 */
export function CaptchaWidget({ siteKey, onToken, onError, onExpire }: CaptchaWidgetProps) {
  const webviewRef = useRef<WebView>(null);

  const html = useMemo(() => {
    const safeKey = siteKey.replace(/[^0-9A-Za-z_-]/g, '');
    const action = TURNSTILE_SIGNUP_ACTION;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
          body { margin: 0; display: flex; align-items: center; justify-content: center; background: transparent; min-height: 80px; }
        </style>
      </head>
      <body>
        <div class="cf-turnstile"
             data-sitekey="${safeKey}"
             data-action="${action}"
             data-theme="light"
             data-callback="onTurnstileSuccess"
             data-error-callback="onTurnstileError"
             data-expired-callback="onTurnstileExpired">
        </div>
        <script>
          function onTurnstileSuccess(token) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'token', token }));
          }
          function onTurnstileError() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
          }
          function onTurnstileExpired() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
          }
        </script>
      </body>
    </html>
  `;
  }, [siteKey]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type: string; token?: string };
      if (data.type === 'token' && typeof data.token === 'string') {
        onToken(data.token);
      } else if (data.type === 'expired') {
        onExpire?.();
      } else if (data.type === 'error') {
        onError?.();
      }
    } catch {
      onError?.();
    }
  }

  return (
    <View style={{ height: 80, width: '100%' }}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        style={{ backgroundColor: 'transparent' }}
      />
    </View>
  );
}
