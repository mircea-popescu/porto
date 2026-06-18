-- =============================================================================
-- Porto — Migrare 1/7: ENUM types
-- Ref: docs/PRD_Porto_Final.md §9.5
-- =============================================================================

create type goal_type as enum ('daily', 'value');

create type notification_type as enum (
  'daily_reminder',
  'daily_reminder_followup',
  'value_inactivity',
  'milestone_achieved',
  'friend_milestone'
);

create type notif_status as enum ('pending', 'sent', 'failed', 'delivered');

create type emoji_type as enum ('thumbs_up', 'heart', 'muscle', 'cheers', 'tada');

create type device_platform as enum ('ios', 'android');

create type log_severity as enum ('info', 'warning', 'error', 'critical');
