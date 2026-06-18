import { supabase } from '@/lib/supabase';

/**
 * Citește feature flags din tabelul `feature_flags` (RLS permite select pentru
 * useri autentificați). Rezultatul e cache-uit în memorie pe durata sesiunii;
 * `refreshFlags()` forțează reîncărcarea.
 * Ref: docs/PRD_Porto_Final.md §12 — verifică `social_enabled` înainte de Faza 2.
 */
let cache: Record<string, boolean> | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;

async function loadFlags(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('feature_flags').select('key, is_enabled');
  if (error) throw error;
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.key] = row.is_enabled;
  cache = map;
  return map;
}

/** Returnează toate flag-urile (cache-uite). */
export async function getFlags(): Promise<Record<string, boolean>> {
  if (cache) return cache;
  if (!inflight) {
    inflight = loadFlags().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/** True dacă flag-ul e activat. La eroare de rețea întoarce `false` (fail-closed). */
export async function isEnabled(key: string): Promise<boolean> {
  try {
    const flags = await getFlags();
    return flags[key] ?? false;
  } catch {
    return false;
  }
}

/** Invalidează cache-ul (ex. după login/logout). */
export function refreshFlags(): void {
  cache = null;
  inflight = null;
}
