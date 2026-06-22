// Verifică goaluri Tip B fără intrare în ultimele 7 zile și trimite notificare (PRD §6.2).
// Deduplicare: nu trimite dacă a mai trimis o notificare value_inactivity în ultimele 7 zile.
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { capToLimit, MAX_PUSH_PER_RUN, sendExpoPush, PushMessage } from '../_shared/push.ts'
import { forbidden, isAuthorizedCaller } from '../_shared/auth.ts'

const FUNCTION_NAME = 'inactivity-checker'
const INACTIVITY_DAYS = 7

async function logError(
  supabase: SupabaseClient,
  message: string,
  context?: Record<string, unknown>,
  severity: 'info' | 'warning' | 'error' | 'critical' = 'error',
) {
  await supabase.from('error_logs').insert({
    function_name: FUNCTION_NAME,
    error_message: message,
    context: context ?? null,
    severity,
  }).throwOnError().catch(() => {})
}

Deno.serve(async (req) => {
  // Doar cron/service_role poate declanșa fan-out-ul (anti-spam, §6).
  if (!isAuthorizedCaller(req)) return forbidden()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const cutoffMs = Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000
    const thresholdDate = new Date(cutoffMs).toISOString().split('T')[0]
    const recentNotifCutoff = new Date(cutoffMs).toISOString()

    // Obțin toate goalurile Tip B active
    const { data: valueGoals, error: goalsErr } = await supabase
      .from('goals')
      .select('id, user_id, title')
      .eq('type', 'value')
      .eq('is_deleted', false)
    if (goalsErr) throw goalsErr
    if (!valueGoals || valueGoals.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const goalIds = valueGoals.map((g) => g.id as string)

    // Intrări mai recente de threshold — dacă există, goal-ul e activ
    const { data: recentEntries, error: entriesErr } = await supabase
      .from('value_entries')
      .select('goal_id')
      .in('goal_id', goalIds)
      .gte('entry_date', thresholdDate)
    if (entriesErr) throw entriesErr

    const activeGoalIds = new Set((recentEntries ?? []).map((e) => e.goal_id as string))
    const inactiveGoals = valueGoals.filter((g) => !activeGoalIds.has(g.id as string))
    if (inactiveGoals.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Exclud goaluri notificate deja recent (deduplicare)
    const inactiveGoalIds = inactiveGoals.map((g) => g.id as string)
    const { data: recentNotifs, error: notifsErr } = await supabase
      .from('notifications')
      .select('goal_id')
      .in('goal_id', inactiveGoalIds)
      .eq('type', 'value_inactivity')
      .gte('created_at', recentNotifCutoff)
    if (notifsErr) throw notifsErr

    const recentlyNotified = new Set((recentNotifs ?? []).map((n) => n.goal_id as string))
    const goalsToNotify = inactiveGoals.filter((g) => !recentlyNotified.has(g.id as string))
    if (goalsToNotify.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Grupez pe user_id
    const byUser = new Map<string, Array<{ id: string; title: string }>>()
    for (const g of goalsToNotify) {
      const uid = g.user_id as string
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push({ id: g.id as string, title: g.title as string })
    }

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('user_id, expo_push_token')
      .in('user_id', [...byUser.keys()])
      .eq('is_active', true)
    if (devErr) throw devErr
    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // O notificare per goal per device
    const messages: PushMessage[] = []
    const meta: Array<{ userId: string; goalId: string; body: string }> = []
    for (const device of devices) {
      const uid = device.user_id as string
      for (const goal of byUser.get(uid) ?? []) {
        const body = `Hei, nu uita de targetul tău «${goal.title}»!`
        messages.push({ to: device.expo_push_token as string, title: 'Porto', body })
        meta.push({ userId: uid, goalId: goal.id, body })
      }
    }

    // Plafon de siguranță pe fan-out (mesaje + meta rămân aliniate).
    const dropped = capToLimit(messages, meta)
    if (dropped > 0) {
      await logError(
        supabase,
        `Fan-out plafonat la ${MAX_PUSH_PER_RUN}: ${dropped} notificări omise.`,
        { dropped, max: MAX_PUSH_PER_RUN },
        'warning',
      )
    }

    const tickets = await sendExpoPush(messages)
    const now = new Date().toISOString()
    await supabase.from('notifications').insert(
      meta.map((m, i) => ({
        user_id: m.userId,
        goal_id: m.goalId,
        type: 'value_inactivity',
        status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
        expo_ticket_id: tickets[i]?.id ?? null,
        payload: { body: m.body },
        sent_at: now,
      })),
    )

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 })
  } catch (err) {
    await logError(supabase, String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
