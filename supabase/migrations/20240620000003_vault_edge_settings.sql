-- =============================================================================
-- Porto — Migrare 14: mută config-ul de invocare Edge Functions pe Supabase Vault
--
-- MOTIV: pe Supabase HOSTED, `alter database postgres set "app.settings.*"` dă
-- `permission denied to set parameter` (rolul postgres nu e superuser). De aceea
-- `current_setting('app.settings.edge_base_url'/'...service_role_key')` era mereu
-- gol → cron-ul și triggerele sociale nu apelau niciodată edge functions
-- (motivul real pentru care notificările de milestone „nu mergeau").
--
-- SOLUȚIE: citim URL-ul și cheia din Vault (pattern-ul oficial Supabase pentru
-- pg_cron + pg_net).
--
-- SETUP MANUAL (o singură dată, în SQL Editor din Dashboard — NU se comite cheia):
--
--   select vault.create_secret(
--     'https://sftjbqipdpiolworeifl.supabase.co/functions/v1', 'edge_base_url');
--   select vault.create_secret(
--     '<service-role-key>', 'service_role_key');
--
--   -- dacă secretele există deja și vrei să le schimbi:
--   -- select vault.update_secret(id, new_secret) ... (vezi Dashboard → Vault)
--
-- Valorile: Dashboard → Project Settings → API (Project URL + service_role key).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper-ul folosit de triggerele sociale — acum citește din Vault.
-- SECURITY DEFINER (owner = postgres) ca să poată citi vault.decrypted_secrets.
-- ---------------------------------------------------------------------------
create or replace function public.notify_social_event(p_path text, p_body jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_base text;
  v_key  text;
begin
  select decrypted_secret into v_base
  from vault.decrypted_secrets where name = 'edge_base_url';
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key';

  -- Dacă secretele lipsesc (ex. local fără Vault), nu încercăm apelul.
  if v_base is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url     := v_base || p_path,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := p_body
  );
exception when others then
  -- Notificarea e best-effort: logăm, dar NU propagăm eroarea.
  insert into public.error_logs (function_name, error_message, severity)
  values ('notify_social_event', sqlerrm, 'warning');
end;
$$;

-- ---------------------------------------------------------------------------
-- Re-programează toate cron-urile ca să citească din Vault.
-- (Definițiile vechi foloseau current_setting('app.settings.*') → gol pe hosted.)
-- ---------------------------------------------------------------------------
select cron.unschedule(jobname)
from cron.job
where jobname like 'porto-%';

-- daily-reminder — initial 09:00 UTC
select cron.schedule('porto-daily-reminder-initial', '0 9 * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{"type":"initial"}'::jsonb
  ) as request_id;
$$);

-- daily-reminder — followup 13:00 UTC
select cron.schedule('porto-daily-reminder-followup-15', '0 13 * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{"type":"followup"}'::jsonb
  ) as request_id;
$$);

-- daily-reminder — followup 18:00 UTC
select cron.schedule('porto-daily-reminder-followup-20', '0 18 * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{"type":"followup"}'::jsonb
  ) as request_id;
$$);

-- inactivity-checker — zilnic 10:00 UTC
select cron.schedule('porto-inactivity-checker', '0 10 * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/inactivity-checker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
$$);

-- notification-cleanup — zilnic 03:00 UTC
select cron.schedule('porto-notification-cleanup', '0 3 * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/notification-cleanup',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
$$);

-- milestone-checker — la fiecare 15 min
select cron.schedule('porto-milestone-checker', '*/15 * * * *', $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'edge_base_url') || '/milestone-checker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
$$);
