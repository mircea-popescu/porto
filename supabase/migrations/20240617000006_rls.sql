-- =============================================================================
-- Porto — Migrare 6/7: Row Level Security
-- Principiu (§9.6): un user vede doar datele proprii + goalurile PUBLICE ale
-- userilor pe care îi URMĂREȘTE (și datele derivate din ele).
-- Edge Functions / cron rulează cu service_role și ocolesc RLS — nu au nevoie
-- de politici dedicate.
-- Politicile folosesc (select auth.uid()) — pattern recomandat de Supabase
-- (planner-ul evaluează o singură dată, per-statement).
-- Ref: docs/PRD_Porto_Final.md §5.1, §9.6
-- =============================================================================

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.units               enable row level security;
alter table public.goals               enable row level security;
alter table public.daily_confirmations enable row level security;
alter table public.value_entries       enable row level security;
alter table public.milestones_sent     enable row level security;
alter table public.notifications       enable row level security;
alter table public.follows             enable row level security;
alter table public.emoji_reactions     enable row level security;
alter table public.user_devices        enable row level security;
alter table public.error_logs          enable row level security;
alter table public.feature_flags       enable row level security;

-- -----------------------------------------------------------------------------
-- Helper: goalul X e vizibil pentru userul curent prin relația de follow?
-- (public + nesters + owner urmărit de mine). SECURITY DEFINER pentru a evita
-- recursivitatea RLS atunci când e apelat din politicile altor tabele.
-- -----------------------------------------------------------------------------
create or replace function public.can_view_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goals g
    join public.follows f
      on f.following_id = g.user_id
    where g.id = p_goal_id
      and g.is_public
      and not g.is_deleted
      and f.follower_id = auth.uid()
  );
$$;

-- ============================ profiles =======================================
-- Citire pentru orice user autentificat (necesar pentru căutare / social).
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- ===================== categories / units (seed, read-only) ==================
-- Doar citire pentru useri; scrierea se face prin seed / service_role.
create policy "categories_select_all" on public.categories
  for select to authenticated using (true);

create policy "units_select_all" on public.units
  for select to authenticated using (true);

-- ============================== goals ========================================
create policy "goals_select_visible" on public.goals
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      is_public and not is_deleted
      and exists (
        select 1 from public.follows f
        where f.follower_id = (select auth.uid())
          and f.following_id = goals.user_id
      )
    )
  );

create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "goals_update_own" on public.goals
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "goals_delete_own" on public.goals
  for delete to authenticated using (user_id = (select auth.uid()));

-- ======================= daily_confirmations =================================
-- Citire: proprii + cele ale goalurilor vizibile (pt. progresul afișat în social).
create policy "daily_confirmations_select_visible" on public.daily_confirmations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_view_goal(goal_id)
  );

create policy "daily_confirmations_insert_own" on public.daily_confirmations
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = (select auth.uid())
    )
  );

create policy "daily_confirmations_delete_own" on public.daily_confirmations
  for delete to authenticated using (user_id = (select auth.uid()));

-- ============================ value_entries ==================================
create policy "value_entries_select_visible" on public.value_entries
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_view_goal(goal_id)
  );

create policy "value_entries_insert_own" on public.value_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = (select auth.uid())
    )
  );

create policy "value_entries_update_own" on public.value_entries
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "value_entries_delete_own" on public.value_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- =========================== milestones_sent =================================
-- Doar citire, pe goalurile proprii. Scrierea = service_role (milestone-checker).
create policy "milestones_sent_select_own" on public.milestones_sent
  for select to authenticated
  using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = (select auth.uid())
    )
  );

-- ============================ notifications ==================================
-- Citire: proprii. Update: doar opened_at (engagement) pe propriile notificări.
-- Insert/delete = service_role (worker push + cron cleanup).
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============================== follows ======================================
-- Citire: relațiile în care ești implicat (follower sau following).
create policy "follows_select_involved" on public.follows
  for select to authenticated
  using (
    follower_id = (select auth.uid())
    or following_id = (select auth.uid())
  );

create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));

create policy "follows_delete_own" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- =========================== emoji_reactions =================================
-- Citire: cele trimise de tine, cele primite pe goalurile tale, și cele de pe
-- goalurile vizibile (ca să vezi felicitările prietenilor lângă bară).
create policy "emoji_reactions_select_visible" on public.emoji_reactions
  for select to authenticated
  using (
    from_user_id = (select auth.uid())
    or public.can_view_goal(goal_id)
    or exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = (select auth.uid())
    )
  );

-- Inserare: doar ca tine însuți și doar pe un goal pe care îl poți vedea
-- (public + urmărit). Nu te poți felicita singur.
create policy "emoji_reactions_insert_own" on public.emoji_reactions
  for insert to authenticated
  with check (
    from_user_id = (select auth.uid())
    and public.can_view_goal(goal_id)
  );

create policy "emoji_reactions_delete_own" on public.emoji_reactions
  for delete to authenticated using (from_user_id = (select auth.uid()));

-- ============================ user_devices ===================================
create policy "user_devices_select_own" on public.user_devices
  for select to authenticated using (user_id = (select auth.uid()));

create policy "user_devices_insert_own" on public.user_devices
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user_devices_update_own" on public.user_devices
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "user_devices_delete_own" on public.user_devices
  for delete to authenticated using (user_id = (select auth.uid()));

-- ============================== error_logs ===================================
-- Niciun acces pentru useri (RLS activ, fără politici). Doar service_role scrie/citește.

-- ============================ feature_flags ==================================
-- Citire pentru toți (app-ul verifică flag-urile, ex. social_enabled). Scriere = admin.
create policy "feature_flags_select_all" on public.feature_flags
  for select to authenticated using (true);
