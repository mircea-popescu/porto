// =============================================================================
// inactivity-checker — Tip B inactiv 7 zile (§6.2)
// Cron: zilnic (ex. 09:00). Pentru fiecare goal Tip B fără intrare de ≥7 zile,
// trimite o notificare — dar nu mai des de o dată la 7 zile per goal (dedup pe
// notifications, ca să nu spameze zilnic după ce trece pragul).
// =============================================================================
import { logError, serviceClient } from '../_shared/client.ts';
import { notifyUser } from '../_shared/push.ts';

const INACTIVITY_DAYS = 7;

Deno.serve(async () => {
  const supabase = serviceClient();
  try {
    const { data: goals, error: gErr } = await supabase
      .from('goals')
      .select('id, user_id, title, started_at')
      .eq('type', 'value')
      .eq('is_deleted', false);
    if (gErr) throw gErr;
    if (!goals || goals.length === 0) {
      return json({ ok: true, notified: 0, note: 'no value goals' });
    }

    const now = Date.now();
    const cutoffMs = INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
    let notified = 0;

    for (const goal of goals) {
      try {
        // Ultima activitate = cea mai recentă intrare; dacă nu există, started_at.
        const { data: lastEntry, error: eErr } = await supabase
          .from('value_entries')
          .select('entry_date')
          .eq('goal_id', goal.id)
          .order('entry_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (eErr) throw eErr;

        const lastActivity = lastEntry?.entry_date ?? goal.started_at;
        const lastMs = new Date(lastActivity + 'T00:00:00Z').getTime();
        if (now - lastMs < cutoffMs) continue; // încă activ

        // Dedup: am notificat deja inactivitate pentru acest goal în ultimele 7 zile?
        const since = new Date(now - cutoffMs).toISOString();
        const { count, error: nErr } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('goal_id', goal.id)
          .eq('type', 'value_inactivity')
          .gte('created_at', since);
        if (nErr) throw nErr;
        if ((count ?? 0) > 0) continue;

        notified += await notifyUser(supabase, {
          userId: goal.user_id,
          type: 'value_inactivity',
          title: 'Porto',
          body: `Hei, nu uita de targetul tău «${goal.title}»!`,
          goalId: goal.id,
        });
      } catch (err) {
        await logError(supabase, 'inactivity-checker', err, { goalId: goal.id });
      }
    }

    return json({ ok: true, pushes_sent: notified });
  } catch (err) {
    await logError(supabase, 'inactivity-checker', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
