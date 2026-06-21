/**
 * Tipuri partajate pentru widget — fără dependențe native, ca să poată fi importate
 * din storage și din ambele bridge-uri (iOS / Android) fără să tragă cod specific OS.
 */

export type WidgetGoal = {
  id: string;
  title: string;
  type: 'daily' | 'value';
  progress_ratio: number;
  progress: number;
  target_days: number | null;
  target_value: number | null;
  unit_custom: string | null;
  category_color: string;
};

export type WidgetData = {
  goals: WidgetGoal[];
};

/** Detaliu text pentru un goal (ex. „24/30 zile" sau „40/100 km"). */
export function goalDetail(goal: WidgetGoal): string {
  if (goal.type === 'daily') {
    return `${goal.progress}/${goal.target_days ?? '?'} zile`;
  }
  const unit = goal.unit_custom ? ' ' + goal.unit_custom : '';
  return `${goal.progress}/${goal.target_value ?? '?'}${unit}`;
}

export function goalPct(goal: WidgetGoal): number {
  return Math.round((goal.progress_ratio > 1 ? 1 : goal.progress_ratio) * 100);
}
