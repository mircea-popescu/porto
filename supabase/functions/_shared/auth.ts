// Verificarea apelantului pentru Edge Functions (PRD §6, hardening securitate).
//
// Toate funcțiile din acest proiect rulează cu service_role și sunt declanșate
// EXCLUSIV de pg_cron, care trimite `Authorization: Bearer <service_role_key>`
// (vezi supabase/migrations/20240618000001_cron_jobs.sql). Gateway-ul Supabase
// respinge deja apelurile anonime (verify_jwt = true, implicit), dar ORICE user
// autentificat trece de verify_jwt — așa că funcțiile ar putea fi declanșate de
// un user obișnuit pentru a forța un fan-out de push (spam / cost).
//
// `isAuthorizedCaller` impune ca apelul să poarte chiar cheia service_role,
// deci doar cron-ul (sau un alt proces de backend cu cheia) poate rula funcția.

/** Comparație în timp constant, ca să nu scurgem informație prin durata ei. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** true dacă cererea poartă cheia service_role în antetul Authorization. */
export function isAuthorizedCaller(req: Request): boolean {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceRoleKey) return false;
  const header = req.headers.get('Authorization') ?? '';
  return timingSafeEqual(header, `Bearer ${serviceRoleKey}`);
}

/** Răspuns standard 403 pentru apelanți neautorizați. */
export function forbidden(): Response {
  return new Response(JSON.stringify({ error: 'forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
