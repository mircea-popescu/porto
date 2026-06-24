-- =============================================================================
-- Porto — Migrare 13: triggere pentru notificări sociale near-real-time
--
-- Când cineva începe să urmărească un user (INSERT în follows) sau reacționează
-- la un goal (INSERT în emoji_reactions), apelăm asincron un Edge Function care
-- trimite push-ul, prin pg_net (`net.http_post` nu blochează tranzacția).
--
-- Reutilizează aceleași setări ca pg_cron (vezi 20240618000001_cron_jobs.sql):
--   app.settings.edge_base_url   — https://<ref>.supabase.co/functions/v1
--   app.settings.service_role_key
--
-- Notă: triggerele prind orice eroare și o loghează — un push ratat NU trebuie
-- să facă rollback la follow/reacție.
-- =============================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Helper: trimite o cerere asincronă către un Edge Function.
-- SECURITY DEFINER ca să poată citi setările bazei de date și să apeleze net.*.
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
  v_base := current_setting('app.settings.edge_base_url', true);
  v_key  := current_setting('app.settings.service_role_key', true);

  -- Dacă setările lipsesc (ex. local fără config), nu încercăm apelul.
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
-- follows: notifică user-ul urmărit că are un follower nou.
-- ---------------------------------------------------------------------------
create or replace function public.on_follow_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.notify_social_event(
    '/follow-notify',
    jsonb_build_object(
      'followerId',  new.follower_id,
      'followingId', new.following_id
    )
  );
  return new;
end;
$$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function public.on_follow_insert();

-- ---------------------------------------------------------------------------
-- emoji_reactions: notifică owner-ul goalului la o reacție nouă.
-- DOAR pe INSERT — re-tap pe același emoji/zi e un UPSERT no-op (UPDATE),
-- deci nu re-notifică.
-- ---------------------------------------------------------------------------
create or replace function public.on_reaction_insert()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.notify_social_event(
    '/reaction-notify',
    jsonb_build_object(
      'reactionId', new.id,
      'goalId',     new.goal_id,
      'fromUserId', new.from_user_id,
      'emoji',      new.emoji
    )
  );
  return new;
end;
$$;

drop trigger if exists reactions_notify on public.emoji_reactions;
create trigger reactions_notify
  after insert on public.emoji_reactions
  for each row execute function public.on_reaction_insert();
