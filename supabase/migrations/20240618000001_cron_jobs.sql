-- =============================================================================
-- Porto — Migrare 9: Cron Jobs (pg_cron + pg_net)
-- Scheduling pentru Edge Functions — pasul 9, Faza 1 (PRD §6)
--
-- SETUP DUPĂ DEPLOY (o singură dată, în SQL Editor din Supabase Dashboard):
--
--   alter database postgres
--     set "app.settings.edge_base_url" = 'https://<project-ref>.supabase.co/functions/v1';
--   alter database postgres
--     set "app.settings.service_role_key" = '<service-role-key>';
--
-- Găsești valorile în: Supabase Dashboard → Project Settings → API.
-- =============================================================================

create extension if not exists pg_cron  with schema pg_catalog;
create extension if not exists pg_net   with schema extensions;

-- Elimină job-urile vechi dacă migrarea rulează din nou (idempotent)
select cron.unschedule(jobname)
from cron.job
where jobname like 'porto-%';

-- ---------------------------------------------------------------------------
-- daily-reminder — initial la 11:00 EET (09:00 UTC)
-- ---------------------------------------------------------------------------
select cron.schedule(
  'porto-daily-reminder-initial',
  '0 9 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{"type":"initial"}'::jsonb
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------------
-- daily-reminder — followup la 15:00 EET (13:00 UTC)
-- ---------------------------------------------------------------------------
select cron.schedule(
  'porto-daily-reminder-followup-15',
  '0 13 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{"type":"followup"}'::jsonb
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------------
-- daily-reminder — followup la 20:00 EET (18:00 UTC)
-- ---------------------------------------------------------------------------
select cron.schedule(
  'porto-daily-reminder-followup-20',
  '0 18 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/daily-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{"type":"followup"}'::jsonb
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------------
-- inactivity-checker — zilnic la 10:00 UTC
-- ---------------------------------------------------------------------------
select cron.schedule(
  'porto-inactivity-checker',
  '0 10 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/inactivity-checker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------------
-- notification-cleanup — zilnic la 03:00 UTC (trafic redus)
-- ---------------------------------------------------------------------------
select cron.schedule(
  'porto-notification-cleanup',
  '0 3 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/notification-cleanup',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
