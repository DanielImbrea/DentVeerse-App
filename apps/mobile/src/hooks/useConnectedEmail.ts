import { useEffect, useState } from 'react';
import { supabase } from '@mobile/lib/supabase';

export function useConnectedEmail() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) {
        setEmail(data.user?.email ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return email;
}
