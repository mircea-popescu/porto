-- =============================================================================
-- Porto — Migrare 2/7: Tabele Core (Faza 1)
-- profiles, categories, units, goals, daily_confirmations, value_entries,
-- milestones_sent, notifications
-- Ref: docs/PRD_Porto_Final.md §9.1 + docs/porto_schema_final.html
-- =============================================================================

-- Trigger comun pentru updated_at (refolosit în ops_tables).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — extinde auth.users (Supabase). id = auth.uid()
-- (expo_push_token mutat în user_devices — multi-device, §14 dec. 22)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_display_name_len
    check (char_length(display_name) between 1 and 50)
);

-- Căutarea (Faza 2) se face după display name; index case-insensitive.
create index profiles_display_name_idx on public.profiles (lower(display_name));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories — fixe, seed data; slug folosit în frontend pt culoare/iconiță
-- (§2.2, §14 dec. 21)
-- -----------------------------------------------------------------------------
create table public.categories (
  id         int generated always as identity primary key,
  name       text not null unique,
  slug       text not null unique,
  sort_order int not null,
  is_active  boolean not null default true
);

-- -----------------------------------------------------------------------------
-- units — unități predefinite (seed). Unitățile custom sunt one-off și se
-- stochează direct în goals.unit_custom (§14 dec. 5), nu aici.
-- -----------------------------------------------------------------------------
create table public.units (
  id            int generated always as identity primary key,
  name          text not null,
  symbol        text,
  is_predefined boolean not null default false,
  sort_order    int,
  created_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- goals — entitatea centrală (Tip A 'daily' / Tip B 'value')
-- Progresul NU e stocat: se calculează live în VIEW goals_with_progress.
-- Soft delete prin is_deleted (§9.6).
-- -----------------------------------------------------------------------------
create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  category_id  int not null references public.categories (id),
  unit_id      int references public.units (id),
  unit_custom  text,
  title        text not null,
  type         goal_type not null,
  is_public    boolean not null default false,
  started_at   date not null,
  target_days  int,        -- Tip A
  target_value numeric,    -- Tip B
  is_deleted   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint goals_title_len check (char_length(title) between 1 and 120),

  -- Coerența câmpurilor pe tip:
  --   Tip A → target_days (>0), fără valoare.
  --   Tip B → target_value (>0) + o unitate (predefinită SAU custom).
  constraint goals_type_fields check (
    (type = 'daily'
      and target_days is not null and target_days > 0
      and target_value is null)
    or
    (type = 'value'
      and target_value is not null and target_value > 0
      and target_days is null
      and (unit_id is not null or unit_custom is not null))
  )
);

create index goals_user_id_idx on public.goals (user_id) where is_deleted = false;
create index goals_user_category_idx on public.goals (user_id, category_id);
-- Goaluri publice ale userilor urmăriți (Faza 2 / RLS social).
create index goals_public_idx on public.goals (user_id) where is_public and not is_deleted;

create trigger goals_set_updated_at
  before update on public.goals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- daily_confirmations — Tip A: un rând = o zi confirmată. Progres = COUNT(*).
-- Backdating = inserare în bloc; reset la eșec = delete (§3.1, §14 dec. 17).
-- -----------------------------------------------------------------------------
create table public.daily_confirmations (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.goals (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  confirmed_date date not null,
  created_at     timestamptz not null default now(),

  constraint daily_confirmations_unique_day unique (goal_id, confirmed_date)
);

create index daily_confirmations_goal_idx on public.daily_confirmations (goal_id);

-- -----------------------------------------------------------------------------
-- value_entries — Tip B: intrări manuale. Acceptă decimale și negative (corecții).
-- Editabile/șterse individual. Progres = SUM(value) (§3.2).
-- -----------------------------------------------------------------------------
create table public.value_entries (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  value      numeric not null,
  note       text,
  entry_date date not null default current_date,
  created_at timestamptz not null default now(),

  constraint value_entries_note_len check (note is null or char_length(note) <= 200)
);

create index value_entries_goal_idx on public.value_entries (goal_id);

-- -----------------------------------------------------------------------------
-- milestones_sent — jurnal de deduplicare a notificărilor de milestone (§4.2).
-- milestone_key ex: 'day_10', 'day_30', 'month_1', '10pct', '100pct'.
-- -----------------------------------------------------------------------------
create table public.milestones_sent (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals (id) on delete cascade,
  milestone_key text not null,
  notified_at   timestamptz not null default now(),

  constraint milestones_sent_unique unique (goal_id, milestone_key)
);

-- -----------------------------------------------------------------------------
-- notifications — log complet al push-urilor (§6.4). Cleanup > 90 zile (cron).
-- -----------------------------------------------------------------------------
create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  goal_id        uuid references public.goals (id) on delete set null,
  type           notification_type not null,
  status         notif_status not null default 'pending',
  expo_ticket_id text,
  payload        jsonb,
  sent_at        timestamptz,
  opened_at      timestamptz,
  created_at     timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_created_idx on public.notifications (created_at);
