// =============================================================================
// notification-cleanup — șterge notificările mai vechi de 90 de zile (§6.4)
// Cron: zilnic (ex. 03:00).
// =============================================================================
import { logError, serviceClient } from '../_shared/client.ts';

const RETENTION_DAYS = 90;

Deno.serve(async () => {
  const supabase = serviceClient();
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .lt('created_at', cutoff)
      .select('id');
    if (error) throw error;

    return json({ ok: true, deleted: data?.length ?? 0, cutoff });
  } catch (err) {
    await logError(supabase, 'notification-cleanup', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
