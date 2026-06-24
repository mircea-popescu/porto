// Notifică un user că a fost urmărit de cineva nou (§5.1).
// Declanșat de triggerul `follows_notify` (AFTER INSERT pe follows) via pg_net.
// Body: { followerId, followingId }
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { capToLimit, MAX_PUSH_PER_RUN, sendExpoPush, PushMessage } from '../_shared/push.ts'
import { forbidden, isAuthorizedCaller } from '../_shared/auth.ts'

const FUNCTION_NAME = 'follow-notify'

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
  // Doar service_role (triggerul folosește cheia service_role) — anti-spam.
  if (!isAuthorizedCaller(req)) return forbidden()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { followerId, followingId } = await req.json() as {
      followerId?: string
      followingId?: string
    }
    if (!followerId || !followingId || followerId === followingId) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Numele celui care a dat follow + device-urile active ale celui urmărit.
    const [{ data: follower }, { data: devices, error: devErr }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', followerId).maybeSingle(),
      supabase.from('user_devices').select('expo_push_token')
        .eq('user_id', followingId).eq('is_active', true),
    ])
    if (devErr) throw devErr

    const tokens = (devices ?? []).map((d) => d.expo_push_token as string)
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const name = follower?.display_name ?? 'Cineva'
    const body = `${name} a început să te urmărească.`

    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      title: 'Porto',
      body,
      data: { kind: 'new_follower', actorId: followerId },
    }))

    const dummy = messages.map(() => null)
    const dropped = capToLimit(messages, dummy)
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
      messages.map((_, i) => ({
        user_id: followingId,
        goal_id: null,
        type: 'new_follower',
        status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
        expo_ticket_id: tickets[i]?.id ?? null,
        payload: { body, actorId: followerId },
        sent_at: now,
      })),
    )

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 })
  } catch (err) {
    await logError(supabase, String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
