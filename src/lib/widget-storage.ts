import AsyncStorage from '@react-native-async-storage/async-storage';

import { CATEGORY_STYLE } from '@/constants/categories';
import { Category, GoalWithProgress } from '@/lib/goals';
import { pushWidgetData, reloadWidget } from '@/widget/bridge';
import { WidgetData, WidgetGoal } from '@/widget/types';

const WIDGET_GOAL_IDS_KEY = '@porto/widget_goal_ids';
/** Cache cu datele randate ale widget-ului (citit de task handler-ul Android headless). */
const WIDGET_DATA_KEY = '@porto/widget_data';

export async function getWidgetGoalIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_GOAL_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setWidgetGoalIds(ids: string[]): Promise<void> {
  // Fără plafon: pe Android widget-ul poate fi redimensionat ca să arate oricâte
  // goaluri. (iOS afișează doar primele câteva — widget-ul medium e fix.)
  await AsyncStorage.setItem(WIDGET_GOAL_IDS_KEY, JSON.stringify(ids));
}

function buildWidgetGoals(
  allGoals: GoalWithProgress[],
  categories: Category[],
  ids: string[],
): WidgetGoal[] {
  const catMap = new Map(categories.map((c) => [c.id, c.slug]));

  return ids
    .map((id) => allGoals.find((g) => g.id === id))
    .filter((g): g is GoalWithProgress => g != null && !g.is_deleted)
    .map((g) => {
      const slug = catMap.get(g.category_id ?? -1) ?? 'altele';
      const color = CATEGORY_STYLE[slug]?.color ?? '#2563eb';
      return {
        id: g.id!,
        title: g.title ?? '',
        type: g.type ?? 'daily',
        progress_ratio: g.progress_ratio ?? 0,
        progress: g.progress ?? 0,
        target_days: g.target_days ?? null,
        target_value: g.target_value ?? null,
        unit_custom: g.unit_custom ?? null,
        category_color: color,
      };
    });
}

export async function syncWidgetData(
  allGoals: GoalWithProgress[],
  categories: Category[],
): Promise<void> {
  const ids = await getWidgetGoalIds();
  const goals = buildWidgetGoals(allGoals, categories, ids);
  const data: WidgetData = { goals };

  // Cache pentru randarea headless (Android) + sursa pentru reloadWidget.
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  // Push imediat către widget-ul nativ (no-op pe web).
  pushWidgetData(goals);
}

export async function clearWidgetData(): Promise<void> {
  await AsyncStorage.removeItem(WIDGET_GOAL_IDS_KEY);
  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify({ goals: [] }));
  pushWidgetData([]);
}

export { reloadWidget };
