// Notifică owner-ul unui goal că a primit o reacție emoji (§5.3).
// Declanșat de triggerul `reactions_notify` (AFTER INSERT pe emoji_reactions) via pg_net.
// Body: { reactionId, goalId, fromUserId, emoji }
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { capToLimit, MAX_PUSH_PER_RUN, sendExpoPush, PushMessage } from '../_shared/push.ts'
import { forbidden, isAuthorizedCaller } from '../_shared/auth.ts'
import { emojiChar } from '../_shared/emoji.ts'

const FUNCTION_NAME = 'reaction-notify'

// Fereastră de throttle: colapsează un val de reacții ale aceluiași actor pe
// același goal într-o singură notificare (anti-spam, fără tabel nou).
const THROTTLE_MINUTES = 10

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
  if (!isAuthorizedCaller(req)) return forbidden()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { goalId, fromUserId, emoji } = await req.json() as {
      goalId?: string
      fromUserId?: string
      emoji?: string
    }
    if (!goalId || !fromUserId) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Owner-ul + titlul goalului.
    const { data: goal, error: goalErr } = await supabase
      .from('goals').select('user_id, title').eq('id', goalId).maybeSingle()
    if (goalErr) throw goalErr
    const ownerId = goal?.user_id as string | undefined
    if (!ownerId || ownerId === fromUserId) {
      // Goal inexistent sau self-reaction (RLS deja blochează) — nimic de trimis.
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    // Throttle: dacă am trimis deja o reacție de la acest actor pe acest goal
    // în ultimele N minute, nu re-notificăm.
    const since = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString()
    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', ownerId)
      .eq('goal_id', goalId)
      .eq('type', 'emoji_reaction')
      .eq('payload->>actorId', fromUserId)
      .gte('sent_at', since)
      .limit(1)
    if (recent && recent.length > 0) {
      return new Response(JSON.stringify({ sent: 0, throttled: true }), { status: 200 })
    }

    // Numele actorului + device-urile owner-ului.
    const [{ data: actor }, { data: devices, error: devErr }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', fromUserId).maybeSingle(),
      supabase.from('user_devices').select('expo_push_token')
        .eq('user_id', ownerId).eq('is_active', true),
    ])
    if (devErr) throw devErr

    const tokens = (devices ?? []).map((d) => d.expo_push_token as string)
    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    const name = actor?.display_name ?? 'Cineva'
    const title = (goal?.title as string) ?? 'un goal'
    const char = emojiChar(emoji ?? '')
    const body = char
      ? `${name} a reacționat cu ${char} la «${title}».`
      : `${name} a reacționat la «${title}».`

    const messages: PushMessage[] = tokens.map((token) => ({
      to: token,
      title: 'Porto',
      body,
      data: { kind: 'emoji_reaction', ownerId, goalId, actorId: fromUserId, emoji },
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
        user_id: ownerId,
        goal_id: goalId,
        type: 'emoji_reaction',
        status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
        expo_ticket_id: tickets[i]?.id ?? null,
        payload: { body, actorId: fromUserId, emoji },
        sent_at: now,
      })),
    )

    return new Response(JSON.stringify({ sent: messages.length }), { status: 200 })
  } catch (err) {
    await logError(supabase, String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
