// Ștergerea contului propriu (cerință Google Play pentru aplicații cu conturi).
//
// Spre deosebire de celelalte funcții (declanșate de cron cu service_role),
// ACEASTA e apelată de userul autentificat din app (supabase.functions.invoke
// atașează automat JWT-ul lui). Identificăm userul din JWT, apoi ștergem contul
// cu service_role. FK-urile cu ON DELETE CASCADE curăță goals/follows/reactions/
// devices/notifications legate de profil.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return json({ error: 'unauthorized' }, 401)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    // 1. Identifică userul din JWT-ul lui (nu din service_role).
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData.user) {
      return json({ error: 'unauthorized' }, 401)
    }
    const userId = userData.user.id

    // 2. Șterge contul cu service_role (cascade pe datele legate).
    const admin = createClient(url, serviceKey)
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) throw delErr

    return json({ deleted: true }, 200)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
