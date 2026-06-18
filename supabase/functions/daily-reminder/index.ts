// =============================================================================
// daily-reminder — reminder de confirmare Tip A (§6.1)
// Cron: 11:00 (prima), 15:00 și 20:00 (followup) — orele se setează în schedule.
// Body: { "followup": true } pentru rulările de 15:00/20:00.
// Trimite UN singur push per user care are cel puțin un goal Tip A neconfirmat azi.
// =============================================================================
import { logError, serviceClient } from '../_shared/client.ts';
import { notifyUser } from '../_shared/push.ts';

Deno.serve(async (req) => {
  const supabase = serviceClient();
  try {
    const followup = await readFollowup(req);

    // Toate goalurile Tip A active.
    const { data: goals, error: gErr } = await supabase
      .from('goals')
      .select('id, user_id')
      .eq('type', 'daily')
      .eq('is_deleted', false);
    if (gErr) throw gErr;
    if (!goals || goals.length === 0) {
      return json({ ok: true, reminded: 0, note: 'no daily goals' });
    }

    // Confirmările de azi, ca să excludem goalurile deja bifate.
    const today = new Date().toISOString().slice(0, 10);
    const goalIds = goals.map((g) => g.id);
    const { data: confs, error: cErr } = await supabase
      .from('daily_confirmations')
      .select('goal_id')
      .eq('confirmed_date', today)
      .in('goal_id', goalIds);
    if (cErr) throw cErr;

    const confirmed = new Set((confs ?? []).map((c) => c.goal_id));

    // Userii cu măcar un goal Tip A neconfirmat azi.
    const usersToRemind = new Set<string>();
    for (const g of goals) {
      if (!confirmed.has(g.id)) usersToRemind.add(g.user_id);
    }

    const type = followup ? 'daily_reminder_followup' : 'daily_reminder';
    const body = followup
      ? 'Mai ai goaluri neconfirmate azi. Nu rupe seria!'
      : 'Intră să-ți confirmi goalurile de azi.';

    let sent = 0;
    for (const userId of usersToRemind) {
      try {
        sent += await notifyUser(supabase, { userId, type, title: 'Porto', body });
      } catch (err) {
        await logError(supabase, 'daily-reminder', err, { userId });
      }
    }

    return json({ ok: true, users: usersToRemind.size, pushes_sent: sent, followup });
  } catch (err) {
    await logError(supabase, 'daily-reminder', err);
    return json({ ok: false, error: String(err) }, 500);
  }
});

async function readFollowup(req: Request): Promise<boolean> {
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      const body = await req.json();
      return body?.followup === true;
    }
  } catch (_) {
    // body gol sau invalid → prima rulare (non-followup)
  }
  return false;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
