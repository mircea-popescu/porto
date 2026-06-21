import { supabase } from '@/lib/supabase';
import { GoalWithProgress } from '@/lib/goals';
import { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type EmojiType = Database['public']['Enums']['emoji_type'];

/** Cei 5 emoji de felicitare (§5.3), în ordinea de afișare. */
export const EMOJI_LIST: { type: EmojiType; char: string; label: string }[] = [
  { type: 'thumbs_up', char: '👍', label: 'Bravo' },
  { type: 'heart', char: '❤️', label: 'Inimă' },
  { type: 'muscle', char: '💪', label: 'Forță' },
  { type: 'cheers', char: '🥂', label: 'Noroc' },
  { type: 'tada', char: '🎉', label: 'Felicitări' },
];

const EMOJI_CHAR: Record<EmojiType, string> = EMOJI_LIST.reduce(
  (acc, e) => ({ ...acc, [e.type]: e.char }),
  {} as Record<EmojiType, string>,
);

export function emojiChar(type: EmojiType): string {
  return EMOJI_CHAR[type] ?? '';
}

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Nu ești autentificat.');
  return id;
}

// ===========================================================================
// Profile + căutare (§5.2)
// ===========================================================================

/** Căutare după display name (case-insensitive); rezultatele arată și username. */
export async function searchUsers(query: string): Promise<Profile[]> {
  const q = query.trim();
  if (q.length === 0) return [];
  const me = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', `%${q}%`)
    .neq('id', me)
    .order('display_name')
    .limit(30);
  if (error) throw error;
  return data;
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

// ===========================================================================
// Follow unidirectional (§5.1)
// ===========================================================================

export async function isFollowing(userId: string): Promise<boolean> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', me)
    .eq('following_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}

export async function follow(userId: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase
    .from('follows')
    .upsert({ follower_id: me, following_id: userId }, { onConflict: 'follower_id,following_id' });
  if (error) throw error;
}

export async function unfollow(userId: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('following_id', userId);
  if (error) throw error;
}

/** Userii pe care îi urmăresc. */
export async function listFollowing(): Promise<Profile[]> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('following:profiles!follows_following_id_fkey(*)')
    .eq('follower_id', me);
  if (error) throw error;
  return (data ?? []).map((r) => (r as any).following as Profile).filter(Boolean);
}

/** Userii care mă urmăresc. */
export async function listFollowers(): Promise<Profile[]> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(*)')
    .eq('following_id', me);
  if (error) throw error;
  return (data ?? []).map((r) => (r as any).follower as Profile).filter(Boolean);
}

// ===========================================================================
// Goaluri publice ale unui user urmărit (§5 — RLS le filtrează automat)
// ===========================================================================

/**
 * Goalurile publice ale unui user. RLS (goals_select_visible) returnează doar
 * goaluri publice ale userilor pe care îi urmăresc, deci dacă nu îl urmărești
 * lista vine goală.
 */
export async function getUserPublicGoals(userId: string): Promise<GoalWithProgress[]> {
  const { data, error } = await supabase
    .from('goals_with_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ===========================================================================
// Emoji reactions (§5.3)
// ===========================================================================

export type EmojiCount = { emoji: EmojiType; char: string; count: number };

/** Trimite o felicitare pe un goal vizibil (RLS împiedică self + goaluri invizibile). */
export async function addReaction(goalId: string, emoji: EmojiType): Promise<void> {
  const me = await currentUserId();
  const today = todayISO();
  const { error } = await supabase.from('emoji_reactions').upsert(
    { goal_id: goalId, from_user_id: me, emoji, reaction_date: today },
    { onConflict: 'goal_id,from_user_id,emoji,reaction_date' },
  );
  if (error) throw error;
}

/** Felicitările primite azi pe un goal, distincte cu counter (ex. 👍×3 ❤️×1). */
export async function getReactionsForToday(goalId: string): Promise<EmojiCount[]> {
  const today = todayISO();
  const { data, error } = await supabase
    .from('emoji_reactions')
    .select('emoji')
    .eq('goal_id', goalId)
    .eq('reaction_date', today);
  if (error) throw error;

  const counts = new Map<EmojiType, number>();
  for (const row of data ?? []) {
    const e = row.emoji as EmojiType;
    counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return EMOJI_LIST.filter((e) => counts.has(e.type)).map((e) => ({
    emoji: e.type,
    char: e.char,
    count: counts.get(e.type)!,
  }));
}

/** Emoji-urile pe care le-am trimis eu azi pe un goal (pentru a marca selecția). */
export async function getMyReactionsForToday(goalId: string): Promise<EmojiType[]> {
  const me = await currentUserId();
  const today = todayISO();
  const { data, error } = await supabase
    .from('emoji_reactions')
    .select('emoji')
    .eq('goal_id', goalId)
    .eq('from_user_id', me)
    .eq('reaction_date', today);
  if (error) throw error;
  return (data ?? []).map((r) => r.emoji as EmojiType);
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
