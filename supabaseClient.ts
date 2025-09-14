// supabaseClient.ts
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SSR (Node) has no window; Expo Web does a server render for router/sitemap.
// On native we want AsyncStorage; on web browser we let Supabase use localStorage.
// On server (no window) we provide no storage to avoid touching window/AsyncStorage.
const isServer = typeof window === 'undefined';
const isNative = !isServer && Platform.OS !== 'web';

const storage = isNative ? AsyncStorage : undefined;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,                  // RN: AsyncStorage; Web browser/SSR: undefined
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
