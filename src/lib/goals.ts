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
