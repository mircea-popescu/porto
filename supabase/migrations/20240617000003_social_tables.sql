-- =============================================================================
-- Porto — Migrare 3/7: Tabele Social (Faza 2)
-- Create în DB de la prima migrare; implementate în cod în Faza 2 (§9.6 dec. 20).
-- follows, emoji_reactions
-- Ref: docs/PRD_Porto_Final.md §5, §9.2
-- =============================================================================

-- -----------------------------------------------------------------------------
-- follows — relație de follow unidirectional (ca Instagram) (§5.1).
-- -----------------------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

-- Listarea „cine mă urmărește" (followers).
create index follows_following_idx on public.follows (following_id);

-- -----------------------------------------------------------------------------
-- emoji_reactions — felicitări cu emoji pe goalurile prietenilor (§5.3).
-- Afișare lângă bară: emoji distincte cu counter pe cele repetate, în ziua
-- respectivă (reaction_date).
-- -----------------------------------------------------------------------------
create table public.emoji_reactions (
  id            uuid primary key default gen_random_uuid(),
  goal_id       uuid not null references public.goals (id) on delete cascade,
  from_user_id  uuid not null references public.profiles (id) on delete cascade,
  emoji         emoji_type not null,
  reaction_date date not null default current_date,
  created_at    timestamptz not null default now(),

  -- Un user trimite cel mult un emoji de un tip dat, pe un goal, într-o zi.
  constraint emoji_reactions_unique unique (goal_id, from_user_id, emoji, reaction_date)
);

create index emoji_reactions_goal_date_idx on public.emoji_reactions (goal_id, reaction_date);
