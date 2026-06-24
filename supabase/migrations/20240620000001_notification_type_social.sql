-- =============================================================================
-- Porto — Migrare 12: tipuri noi de notificare pentru evenimente sociale
--
-- Adaugă `new_follower` și `emoji_reaction` la enum-ul notification_type.
--
-- IMPORTANT: `alter type ... add value` trebuie să ruleze în PROPRIA migrare,
-- separat de orice migrare care FOLOSEȘTE valorile noi (triggere / inserturi),
-- fiindcă o valoare de enum adăugată într-o tranzacție nu poate fi folosită în
-- aceeași tranzacție. Migrarea cu triggere (20240620000002) rulează după aceasta.
-- =============================================================================

alter type notification_type add value if not exists 'new_follower';
alter type notification_type add value if not exists 'emoji_reaction';
