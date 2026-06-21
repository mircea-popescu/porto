import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Lipsesc variabilele EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY (vezi .env.local).',
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Sesiunea (refresh token) e ținută în AsyncStorage — patternul oficial
    // Supabase pentru Expo/React Native.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Nu există URL de redirect de parsat în RN (relevant doar pe web).
    detectSessionInUrl: false,
    // Lock obligatoriu pe React Native: fiecare query face `getSession()`, iar
    // ecranul Home lansează 3 query-uri în paralel. Fără lock, cele 3 apeluri
    // concurente de refresh de token (când access token-ul e aproape de expirare)
    // intră în cursă pe calea „lockless" și nu se mai rezolvă → loading infinit.
    // `processLock` le serializează: primul reîmprospătează, restul citesc tokenul.
    // Vezi docs Supabase „Use Supabase Auth with React Native".
    lock: processLock,
  },
});

// Reîmprospătează tokenul doar cât timp aplicația e în prim-plan.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
