-- =============================================================================
-- Porto — Migrare 8/8: Auto-creare profil la signup
-- La fiecare user nou în auth.users, creează rândul corespunzător în profiles.
-- username + display_name vin din raw_user_meta_data (setate la sign-up din app),
-- cu fallback-uri sigure care respectă constrângerile din profiles.
-- Ref: docs/PRD_Porto_Final.md §7 (auth email+parolă)
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username     text;
  v_display_name text;
begin
  -- Username: din metadata, normalizat la [a-z0-9_]; fallback pe prefixul
  -- emailului, apoi pe id-ul userului. Garantăm 3..30 caractere și unicitate.
  v_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1),
    'user'
  ));
  v_username := regexp_replace(v_username, '[^a-z0-9_]', '_', 'g');

  if char_length(v_username) < 3 then
    v_username := v_username || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;
  v_username := left(v_username, 30);

  -- Dacă username-ul e deja luat, atașează un sufix scurt din id.
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := left(v_username, 23) || '_' || left(replace(new.id::text, '-', ''), 6);
  end if;

  -- Display name: din metadata, altfel reluăm prefixul emailului.
  v_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1),
    'Utilizator'
  );
  v_display_name := left(v_display_name, 50);

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, v_display_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
