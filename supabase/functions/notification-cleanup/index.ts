// Șterge notificările mai vechi de 90 de zile (PRD §6.4).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const FUNCTION_NAME = 'notification-cleanup'
const RETENTION_DAYS = 90

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)

    const { error, count } = await supabase
      .from('notifications')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff.toISOString())
    if (error) throw error

    await supabase.from('error_logs').insert({
      function_name: FUNCTION_NAME,
      error_message: `Deleted ${count ?? 0} notifications older than ${RETENTION_DAYS} days.`,
      severity: 'info',
    })

    return new Response(JSON.stringify({ deleted: count ?? 0 }), { status: 200 })
  } catch (err) {
    await supabase.from('error_logs').insert({
      function_name: FUNCTION_NAME,
      error_message: String(err),
      severity: 'error',
    }).throwOnError().catch(() => {})
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
