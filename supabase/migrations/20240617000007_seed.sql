-- =============================================================================
-- Porto — Migrare 7/7: Seed data
-- categories (fixe), units (predefinite), feature_flags
-- Idempotent (on conflict do nothing) — sigur de re-rulat.
-- Ref: docs/PRD_Porto_Final.md §2.2, §2.3, §12
-- =============================================================================

-- ---- categories (slug ASCII, folosit în frontend pt culoare/iconiță) --------
insert into public.categories (name, slug, sort_order) values
  ('Sănătate', 'sanatate', 1),
  ('Educație',  'educatie', 2),
  ('Sport',     'sport',    3),
  ('Finanțe',   'finante',  4),
  ('Altele',    'altele',   5)
on conflict (slug) do nothing;

-- ---- units predefinite ------------------------------------------------------
insert into public.units (name, symbol, is_predefined, sort_order) values
  ('Kilometri', 'km',    true, 1),
  ('Ore',       'h',     true, 2),
  ('Minute',    'min',   true, 3),
  ('Euro',      '€',     true, 4),
  ('Lei',       'RON',   true, 5),
  ('Dolari',    '$',     true, 6),
  ('Pași',      'pași',  true, 7),
  ('Kilograme', 'kg',    true, 8),
  ('Litri',     'L',     true, 9),
  ('Pagini',    'pag',   true, 10)
on conflict do nothing;

-- ---- feature flags ----------------------------------------------------------
insert into public.feature_flags (key, is_enabled, description) values
  ('social_enabled',   false, 'Activează componenta socială (Faza 2): follows, goaluri publice, emoji, milestone-uri.'),
  ('maintenance_mode', false, 'Pune aplicația în mentenanță (blochează scrierile din client).')
on conflict (key) do nothing;
