-- =============================================================================
-- Porto — Migrare 4/7: Tabele Ops / Admin
-- user_devices, error_logs, feature_flags
-- Ref: docs/PRD_Porto_Final.md §9.3
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_devices — push tokens per device (multi-device, §14 dec. 22).
-- -----------------------------------------------------------------------------
create table public.user_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique,
  platform        device_platform not null,
  device_name     text,
  is_active       boolean not null default true,
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index user_devices_user_idx on public.user_devices (user_id) where is_active;

-- -----------------------------------------------------------------------------
-- error_logs — erori din Edge Functions / cron jobs (scrise cu service role).
-- -----------------------------------------------------------------------------
create table public.error_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete set null,
  function_name text not null,
  error_message text not null,
  stack_trace   text,
  context       jsonb,
  severity      log_severity not null default 'error',
  created_at    timestamptz not null default now()
);

create index error_logs_created_idx on public.error_logs (created_at desc);
create index error_logs_severity_idx on public.error_logs (severity, created_at desc);

-- -----------------------------------------------------------------------------
-- feature_flags — toggleuri (ex. social_enabled). Verificate înainte de Faza 2
-- (§12). updated_at întreținut de trigger.
-- -----------------------------------------------------------------------------
create table public.feature_flags (
  key         text primary key,
  is_enabled  boolean not null default false,
  value       jsonb,
  description text,
  updated_at  timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();
