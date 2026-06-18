// Verifică milestone-urile atinse și notifică followerii (PRD §4, §5, §6.3).
// Cron la fiecare 15 min. Dedup prin milestones_sent (UNIQUE goal_id, milestone_key).
//
// Milestone-uri:
//   Tip A (daily): multiplu de 10 zile confirmate (day_10, day_20, ...)
//                  + lună calendaristică întreagă de la started_at (month_1, ...)
//   Tip B (value): fiecare 10% din target (10pct .. 100pct), declanșat la prima
//                  intrare care depășește pragul.
//
// Notă: înregistrăm milestone-ul (milestones_sent) pentru orice goal atins, dar
// trimitem friend_milestone DOAR pentru goalurile publice (§5.1).
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { sendExpoPush, PushMessage } from '../_shared/push.ts'

const FUNCTION_NAME = 'milestone-checker'

async function logError(supabase: SupabaseClient, message: string, context?: Record<string, unknown>) {
  await supabase.from('error_logs').insert({
    function_name: FUNCTION_NAME,
    error_message: message,
    context: context ?? null,
    severity: 'error',
  }).throwOnError().catch(() => {})
}

type Goal = {
  id: string
  user_id: string
  type: 'daily' | 'value'
  started_at: string
  is_public: boolean
  progress: number
  target_value: number | null
}

/** Numărul de luni calendaristice întregi între `start` (YYYY-MM-DD) și azi. */
function calendarMonthsElapsed(startISO: string): number {
  const start = new Date(startISO + 'T00:00:00Z')
  const now = new Date()
  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth())
  // Dacă ziua curentă din lună e înainte de ziua de start, ultima lună nu e completă.
  if (now.getUTCDate() < start.getUTCDate()) months -= 1
  return Math.max(0, months)
}

/** Cheile milestone atinse de un goal, în funcție de tip. */
function reachedKeys(goal: Goal): string[] {
  const keys: string[] = []
  if (goal.type === 'daily') {
    const days = Math.floor(goal.progress)
    for (let d = 10; d <= days; d += 10) keys.push(`day_${d}`)
    const months = calendarMonthsElapsed(goal.started_at)
    for (let m = 1; m <= months; m++) keys.push(`month_${m}`)
  } else {
    const target = goal.target_value ?? 0
    if (target > 0) {
      const pct = (goal.progress / target) * 100
      const maxStep = Math.min(100, Math.floor(pct / 10) * 10)
      for (let p = 10; p <= maxStep; p += 10) keys.push(`${p}pct`)
    }
  }
  return keys
}

/** Etichetă umană pentru corpul notificării. */
function milestoneLabel(key: string): string {
  if (key.startsWith('day_')) return `${key.slice(4)} de zile`
  if (key.startsWith('month_')) {
    const n = Number(key.slice(6))
    return n === 1 ? 'o lună' : `${n} luni`
  }
  if (key.endsWith('pct')) return `${key.slice(0, -3)}%`
  return key
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // 1. Toate goalurile cu progres (view filtrează deja is_deleted).
    const { data: goals, error: goalsErr } = await supabase
      .from('goals_with_progress')
      .select('id, user_id, type, started_at, is_public, progress, target_value')
    if (goalsErr) throw goalsErr
    if (!goals || goals.length === 0) {
      return new Response(JSON.stringify({ new_milestones: 0, sent: 0 }), { status: 200 })
    }

    // 2. Milestone-urile deja trimise.
    const goalIds = goals.map((g) => g.id as string)
    const { data: sentRows, error: sentErr } = await supabase
      .from('milestones_sent')
      .select('goal_id, milestone_key')
      .in('goal_id', goalIds)
    if (sentErr) throw sentErr

    const already = new Set((sentRows ?? []).map((r) => `${r.goal_id}:${r.milestone_key}`))

    // 3. Determină milestone-urile noi.
    type NewMilestone = { goal: Goal; key: string }
    const fresh: NewMilestone[] = []
    for (const raw of goals as unknown as Goal[]) {
      for (const key of reachedKeys(raw)) {
        if (!already.has(`${raw.id}:${key}`)) fresh.push({ goal: raw, key })
      }
    }

    if (fresh.length === 0) {
      return new Response(JSON.stringify({ new_milestones: 0, sent: 0 }), { status: 200 })
    }

    // 4. Înregistrează milestone-urile (dedup la nivel de DB — ignoră conflictele).
    const { error: insErr } = await supabase
      .from('milestones_sent')
      .upsert(
        fresh.map((f) => ({ goal_id: f.goal.id, milestone_key: f.key })),
        { onConflict: 'goal_id,milestone_key', ignoreDuplicates: true },
      )
    if (insErr) throw insErr

    // 5. Fan-out friend_milestone DOAR pentru goalurile publice.
    const publicFresh = fresh.filter((f) => f.goal.is_public)
    if (publicFresh.length === 0) {
      return new Response(JSON.stringify({ new_milestones: fresh.length, sent: 0 }), { status: 200 })
    }

    const ownerIds = [...new Set(publicFresh.map((f) => f.goal.user_id))]

    // Numele owner-ilor (pentru corpul notificării) + goal title.
    const [{ data: owners }, { data: goalTitles }, { data: follows }] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', ownerIds),
      supabase.from('goals').select('id, title').in('id', publicFresh.map((f) => f.goal.id)),
      supabase.from('follows').select('follower_id, following_id').in('following_id', ownerIds),
    ])

    const ownerName = new Map((owners ?? []).map((o) => [o.id as string, o.display_name as string]))
    const titleById = new Map((goalTitles ?? []).map((g) => [g.id as string, g.title as string]))

    // followerii fiecărui owner
    const followersByOwner = new Map<string, string[]>()
    for (const f of follows ?? []) {
      const owner = f.following_id as string
      if (!followersByOwner.has(owner)) followersByOwner.set(owner, [])
      followersByOwner.get(owner)!.push(f.follower_id as string)
    }

    // Toți followerii care vor primi notificări → device-urile lor active.
    const allFollowerIds = [...new Set([...followersByOwner.values()].flat())]
    if (allFollowerIds.length === 0) {
      return new Response(JSON.stringify({ new_milestones: fresh.length, sent: 0 }), { status: 200 })
    }

    const { data: devices, error: devErr } = await supabase
      .from('user_devices')
      .select('user_id, expo_push_token')
      .in('user_id', allFollowerIds)
      .eq('is_active', true)
    if (devErr) throw devErr

    const devicesByUser = new Map<string, string[]>()
    for (const d of devices ?? []) {
      const uid = d.user_id as string
      if (!devicesByUser.has(uid)) devicesByUser.set(uid, [])
      devicesByUser.get(uid)!.push(d.expo_push_token as string)
    }

    // 6. Construiește mesajele: un push per (milestone × follower × device).
    const messages: PushMessage[] = []
    const meta: Array<{ userId: string; goalId: string; ownerId: string; key: string; body: string }> = []

    for (const f of publicFresh) {
      const owner = f.goal.user_id
      const name = ownerName.get(owner) ?? 'Cineva'
      const title = titleById.get(f.goal.id) ?? 'un goal'
      const body = `${name} a atins ${milestoneLabel(f.key)} la «${title}». Felicită-l!`
      for (const followerId of followersByOwner.get(owner) ?? []) {
        for (const token of devicesByUser.get(followerId) ?? []) {
          messages.push({
            to: token,
            title: 'Porto',
            body,
            data: { goalId: f.goal.id, ownerId: owner, milestoneKey: f.key },
          })
          meta.push({ userId: followerId, goalId: f.goal.id, ownerId: owner, key: f.key, body })
        }
      }
    }

    if (messages.length === 0) {
      return new Response(JSON.stringify({ new_milestones: fresh.length, sent: 0 }), { status: 200 })
    }

    const tickets = await sendExpoPush(messages)
    const now = new Date().toISOString()
    await supabase.from('notifications').insert(
      meta.map((m, i) => ({
        user_id: m.userId,
        goal_id: m.goalId,
        type: 'friend_milestone',
        status: tickets[i]?.status === 'ok' ? 'sent' : 'failed',
        expo_ticket_id: tickets[i]?.id ?? null,
        payload: { body: m.body, ownerId: m.ownerId, milestoneKey: m.key },
        sent_at: now,
      })),
    )

    return new Response(
      JSON.stringify({ new_milestones: fresh.length, sent: messages.length }),
      { status: 200 },
    )
  } catch (err) {
    await logError(supabase, String(err))
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
