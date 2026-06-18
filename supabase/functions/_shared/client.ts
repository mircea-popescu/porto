import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Client Supabase cu service role — ocolește RLS. Folosit DOAR în Edge Functions
 * (cron jobs / push worker), niciodată în codul aplicației (§12).
 * SUPABASE_URL și SUPABASE_SERVICE_ROLE_KEY sunt injectate automat în runtime.
 */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Lipsesc SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY din mediu.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Loghează o eroare de funcție în error_logs (best-effort, nu aruncă). */
export async function logError(
  supabase: SupabaseClient,
  functionName: string,
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : null;
  try {
    await supabase.from('error_logs').insert({
      function_name: functionName,
      error_message: message,
      stack_trace: stack,
      context: context ?? null,
      severity: 'error',
    });
  } catch (_) {
    // Dacă nici logarea nu merge, măcar lasă urmă în logurile platformei.
    console.error(`[${functionName}] ${message}`, stack);
  }
}
