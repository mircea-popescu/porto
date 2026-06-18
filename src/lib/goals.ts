import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

export type Category = Database['public']['Tables']['categories']['Row'];
export type Unit = Database['public']['Tables']['units']['Row'];
export type GoalType = Database['public']['Enums']['goal_type'];
export type GoalWithProgress = Database['public']['Views']['goals_with_progress']['Row'];

type GoalInsert = Database['public']['Tables']['goals']['Insert'];
type ConfirmationInsert = Database['public']['Tables']['daily_confirmations']['Insert'];

export type CreateGoalInput = {
  title: string;
  categoryId: number;
  type: GoalType;
  isPublic: boolean;
  startedAt: string; // YYYY-MM-DD
  // Tip A (daily)
  targetDays?: number;
  /** Backdating §3.1: dacă true, marchează zilele de la start până azi ca ținute. */
  backfillFromStart?: boolean;
  // Tip B (value)
  targetValue?: number;
  unitId?: number | null;
  unitCustom?: string | null;
};

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function listUnits(): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('is_predefined', true)
    .order('sort_order');
  if (error) throw error;
  return data;
}

/** Goalurile proprii, cu progres calculat live (view goals_with_progress). */
export async function listGoals(): Promise<GoalWithProgress[]> {
  const { data, error } = await supabase
    .from('goals_with_progress')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Datele calendaristice (YYYY-MM-DD) de la `startISO` până azi, inclusiv. */
function dateRangeToToday(startISO: string): string[] {
  const out: string[] = [];
  const cursor = new Date(startISO + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    out.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Date → 'YYYY-MM-DD' în ora locală. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Creează un goal; pentru Tip A cu backdating, populează și confirmările. */
export async function createGoal(input: CreateGoalInput): Promise<string> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const userId = userData.user?.id;
  if (!userId) throw new Error('Nu ești autentificat.');

  const isDaily = input.type === 'daily';

  const insert: GoalInsert = {
    user_id: userId,
    category_id: input.categoryId,
    title: input.title.trim(),
    type: input.type,
    is_public: input.isPublic,
    started_at: input.startedAt,
    target_days: isDaily ? input.targetDays ?? null : null,
    target_value: isDaily ? null : input.targetValue ?? null,
    unit_id: isDaily ? null : input.unitId ?? null,
    unit_custom: isDaily ? null : input.unitCustom?.trim() || null,
  };

  const { data: goal, error } = await supabase
    .from('goals')
    .insert(insert)
    .select('id')
    .single();
  if (error) throw error;

  if (isDaily && input.backfillFromStart) {
    const rows: ConfirmationInsert[] = dateRangeToToday(input.startedAt).map((d) => ({
      goal_id: goal.id,
      user_id: userId,
      confirmed_date: d,
    }));
    if (rows.length > 0) {
      const { error: cErr } = await supabase.from('daily_confirmations').insert(rows);
      if (cErr) throw cErr;
    }
  }

  return goal.id;
}

// ===========================================================================
// Tip A — confirmări zilnice (PRD §3.1)
// ===========================================================================

export type DailyState = {
  todayConfirmed: boolean;
  /** Fereastra de zile neconfirmate (ultima confirmare/start → ieri), dacă există. */
  missedFrom: string | null;
  missedTo: string | null;
  missedCount: number;
};

/** Un singur goal cu progres (view). */
export async function getGoal(id: string): Promise<GoalWithProgress> {
  const { data, error } = await supabase
    .from('goals_with_progress')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Datele confirmate (YYYY-MM-DD), sortate crescător. */
export async function getConfirmedDates(goalId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('daily_confirmations')
    .select('confirmed_date')
    .eq('goal_id', goalId)
    .order('confirmed_date');
  if (error) throw error;
  return data.map((r) => r.confirmed_date);
}

/** Marchează zile ca ținute (idempotent — ignoră zilele deja confirmate). */
export async function confirmDays(goalId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  const userId = await currentUserId();
  const rows: ConfirmationInsert[] = dates.map((d) => ({
    goal_id: goalId,
    user_id: userId,
    confirmed_date: d,
  }));
  const { error } = await supabase
    .from('daily_confirmations')
    .upsert(rows, { onConflict: 'goal_id,confirmed_date', ignoreDuplicates: true });
  if (error) throw error;
}

/** Reset la eșec: șterge istoricul și reîncepe de azi (§3.1, decizia 17). */
export async function resetDailyGoal(goalId: string): Promise<void> {
  const { error: delErr } = await supabase
    .from('daily_confirmations')
    .delete()
    .eq('goal_id', goalId);
  if (delErr) throw delErr;
  const { error: updErr } = await supabase
    .from('goals')
    .update({ started_at: todayISO() })
    .eq('id', goalId);
  if (updErr) throw updErr;
}

/** Ștergere (soft delete — dispare din listă, §9.6). */
export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase.from('goals').update({ is_deleted: true }).eq('id', goalId);
  if (error) throw error;
}

/** Calculează starea de confirmare a unui goal Tip A din datele confirmate. */
export function computeDailyState(startedAt: string, confirmed: string[]): DailyState {
  const set = new Set(confirmed);
  const today = todayISO();
  const yesterday = addDaysISO(today, -1);
  const last = confirmed.length > 0 ? confirmed[confirmed.length - 1] : null;
  const from = last ? addDaysISO(last, 1) : startedAt;

  let missedFrom: string | null = null;
  let missedTo: string | null = null;
  let missedCount = 0;

  if (from <= yesterday) {
    const window = dateRange(from, yesterday).filter((d) => !set.has(d));
    if (window.length > 0) {
      missedFrom = window[0];
      missedTo = window[window.length - 1];
      missedCount = window.length;
    }
  }

  return { todayConfirmed: set.has(today), missedFrom, missedTo, missedCount };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Nu ești autentificat.');
  return id;
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toISODate(d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Toate datele între fromISO și toISO inclusiv (YYYY-MM-DD). */
export function dateRange(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const cur = new Date(fromISO + 'T00:00:00');
  const end = new Date(toISO + 'T00:00:00');
  while (cur <= end) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
