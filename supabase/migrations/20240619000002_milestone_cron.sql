-- =============================================================================
-- Porto — Migrare 11: Cron pentru milestone-checker (Faza 2)
-- Rulează la fiecare 15 min (consistent cu infra Faza 1, §13).
-- Necesită setările deja configurate în 20240618000001_cron_jobs.sql:
--   app.settings.edge_base_url, app.settings.service_role_key
-- Ref: docs/PRD_Porto_Final.md §4, §5, §6.3, §13 (Faza 2, pasul 5)
-- =============================================================================

-- Idempotent: elimină job-ul vechi dacă migrarea rulează din nou.
select cron.unschedule('porto-milestone-checker')
where exists (select 1 from cron.job where jobname = 'porto-milestone-checker');

select cron.schedule(
  'porto-milestone-checker',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := current_setting('app.settings.edge_base_url') || '/milestone-checker',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
