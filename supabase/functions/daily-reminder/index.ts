// Trimite notificări zilnice de confirmare pentru goaluri Tip A (PRD §6.1).
// body: { type: 'initial' | 'followup' }
//   initial  → 11:00 — toți userii cu cel puțin un daily goal
//   followup → 15:00 și 20:00 — doar userii cu goaluri neconfirmate azi
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { capToLimit, MAX_PUSH_PER_RUN, sendExpoPush, PushMessage } from '../_shared/push.ts'
import { forbidden, isAuthorizedCaller } from '../_shared/auth.ts'

const FUNCTION_NAME = 'daily-reminder'

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
    const body = await req.json().catch(() => ({}))
    const isFollowup = body?.type === 'followup'
    const today = new Date().toISOString().split('T')[0]

    let targetUserIds: string[]

    if (!isFollowup) {
      // Initial: toți userii cu cel puțin un daily goal activ
      const { data, error } = await supabase
        .from('goals')
        .select('user_id')
        .eq('type', 'daily')
        .eq('is_deleted', false)
      if (error) throw error
      targetUserIds = [...new Set((data ?? []).map((g) => g.user_id as string))]
    } else {
      // Followup: useri cu cel puțin un goal neconfirmat azi
      const [{ data: allGoals, error: e1 }, { data: confirmed, error: e2 }] = await Promise.all([
        supabase.from('goals').select('id, user_id').eq('type', 'daily').eq('is_deleted', false),
        supabase.from('daily_confirmations').select('goal_id').eq('confirmed_date', today),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const confirmedSet = new Set((confirmed ?? []).map((c) => c.goal_id as string))
      const usersWithUnconfirmed = new Set<string>()
      for (const g of allGoals ?? []) {
        if (!confirmedSet.has(g.id as string)) usersWithUnconfirmed.add(g.user_id as string)
      }
      targetUserIds = [...usersWithUnconfirmed]
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('user_id, expo_push_token')
      .in('user_id', targetUserIds)
      .eq('is_active', true)
    if (devErr) throw devErr
    if (!devices || devices.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const pushBody = 'Intră să-ți confirmi goalurile de azi.'
    const messages: PushMessage[] = devices.map((d) => ({
      to: d.expo_push_token as string,
      title: 'Porto',
      body: pushBody,
    }))

    // Plafon de siguranță pe fan-out (mesaje + device-uri rămân aliniate).
    const dropped = capToLimit(messages, devices)
    if (dropped > 0) {
      await logError(
        supabase,
        `Fan-out plafonat la ${MAX_PUSH_PER_RUN}: ${dropped} notificări omise.`,
        { dropped, max: MAX_PUSH_PER_RUN },
        'warning',
      )
    }

    const tickets = await sendExpoPush(messages)

    const notifType = isFollowup ? 'daily_reminder_followup' : 'daily_reminder'
    const now = new Date().toISOString()
    await supabase.from('notifications').insert(
      devices.map((d, i) => ({
        user_id: d.user_id,
        type: notifType,
        status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
        expo_ticket_id: tickets[i]?.id ?? null,
        payload: { body: pushBody },
        sent_at: now,
      })),
    )

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 })
  } catch (err) {
    await logError(supabase, String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
