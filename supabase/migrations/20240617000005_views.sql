-- =============================================================================
-- Porto — Migrare 5/7: VIEW goals_with_progress
-- Progres calculat LIVE (nu denormalizat, §9.6 dec. 19):
--   Tip A → COUNT(daily_confirmations)
--   Tip B → SUM(value_entries)
-- plus progress_ratio (0..1, poate depăși 1 la Tip B) și completed_in_days.
--
-- security_invoker = true: view-ul respectă RLS-ul tabelelor de bază pentru
-- utilizatorul care interoghează (esențial pentru vizibilitatea socială).
-- Ref: docs/PRD_Porto_Final.md §2.4, §9.4
-- =============================================================================

create view public.goals_with_progress
with (security_invoker = true)
as
select
  g.*,

  -- Progres absolut: zile confirmate (Tip A) sau suma intrărilor (Tip B).
  coalesce(p.progress, 0) as progress,

  -- Raport de umplere a barei. Tip B poate trece de 1.0 (peste 100%).
  case
    when g.type = 'daily' and coalesce(g.target_days, 0) > 0
      then round(coalesce(p.progress, 0) / g.target_days, 4)
    when g.type = 'value' and coalesce(g.target_value, 0) <> 0
      then round(coalesce(p.progress, 0) / g.target_value, 4)
    else 0
  end as progress_ratio,

  -- Goalul a atins targetul?
  case
    when g.type = 'daily' then coalesce(p.progress, 0) >= coalesce(g.target_days, 0)
    when g.type = 'value' then coalesce(p.progress, 0) >= coalesce(g.target_value, 0)
    else false
  end as is_completed,

  -- Tip B informativ: în câte zile s-a atins targetul (NULL dacă nu e atins).
  -- = data primei intrări la care suma cumulată ≥ target_value, minus started_at.
  case
    when g.type = 'value' and vc.reached_date is not null
      then (vc.reached_date - g.started_at)
  end as completed_in_days

from public.goals g

-- Progresul absolut, pe tip.
left join lateral (
  select
    case g.type
      when 'daily' then (
        select count(*)::numeric
        from public.daily_confirmations dc
        where dc.goal_id = g.id
      )
      when 'value' then (
        select coalesce(sum(ve.value), 0)
        from public.value_entries ve
        where ve.goal_id = g.id
      )
    end as progress
) p on true

-- Data atingerii targetului pentru Tip B (suma cumulată cronologic).
left join lateral (
  select min(t.entry_date) as reached_date
  from (
    select
      ve.entry_date,
      sum(ve.value) over (order by ve.entry_date, ve.created_at) as running
    from public.value_entries ve
    where ve.goal_id = g.id
  ) t
  where g.type = 'value'
    and g.target_value is not null
    and t.running >= g.target_value
) vc on true

where g.is_deleted = false;
