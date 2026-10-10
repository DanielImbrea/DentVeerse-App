import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@dental/types';
import { createSupabaseClient } from '@dental/api';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

/** Mac LAN IP in apps/mobile/.env — must NOT be the phone's own IP. */
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '').trim();
const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '').trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (__DEV__ && supabaseUrl) {
  console.info('[supabase] URL:', supabaseUrl);
}

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — set on EAS production.'
  );
}

/** Only valid when {@link isSupabaseConfigured}; root layout gates before use. */
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createSupabaseClient(supabaseUrl, supabaseAnonKey, { storage: AsyncStorage })
  : (null as unknown as SupabaseClient<Database>);
