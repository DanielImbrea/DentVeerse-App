import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSupabaseClient } from '@dental/api';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

/** Mac LAN IP in apps/mobile/.env — must NOT be the phone's own IP. */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? '';
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? '';

if (__DEV__ && supabaseUrl) {
  console.info('[supabase] URL:', supabaseUrl);
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: AsyncStorage,
});
