import AsyncStorage from '@react-native-async-storage/async-storage';

import { Category, GoalWithProgress } from '@/lib/goals';
import { CATEGORY_STYLE } from '@/constants/categories';
import { portoGoalsWidget, WidgetGoal } from '@/widget/PortoWidget';

const WIDGET_GOAL_IDS_KEY = '@porto/widget_goal_ids';

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
  await AsyncStorage.setItem(WIDGET_GOAL_IDS_KEY, JSON.stringify(ids.slice(0, 3)));
}

export async function syncWidgetData(
  allGoals: GoalWithProgress[],
  categories: Category[],
): Promise<void> {
  const ids = await getWidgetGoalIds();
  const catMap = new Map(categories.map((c) => [c.id, c.slug]));

  const goals: WidgetGoal[] = ids
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

  portoGoalsWidget.updateSnapshot({ goals });
}

export async function clearWidgetData(): Promise<void> {
  await AsyncStorage.removeItem(WIDGET_GOAL_IDS_KEY);
  portoGoalsWidget.updateSnapshot({ goals: [] });
}
