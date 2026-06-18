-- =============================================================================
-- Porto — Migrare 10: Activare componentă socială (Faza 2)
-- Pune flag-ul social_enabled pe true. Codul Faza 2 verifică acest flag înainte
-- de a expune funcționalitățile sociale (§12).
-- Idempotent — sigur de re-rulat.
-- Ref: docs/PRD_Porto_Final.md §12, §13 (Faza 2, pasul 1)
-- =============================================================================

update public.feature_flags
set is_enabled = true
where key = 'social_enabled';
