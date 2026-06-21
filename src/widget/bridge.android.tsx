/**
 * Bridge widget Android — react-native-android-widget.
 * Importat doar pe Android (Metro: bridge.android.tsx).
 *
 * `pushWidgetData` desenează imediat widget-urile montate cu datele primite.
 * `reloadWidget` re-desenează din cache-ul AsyncStorage (`@porto/widget_data`).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { PortoWidgetAndroid } from '@/widget/PortoWidgetAndroid';
import { WidgetData, WidgetGoal } from '@/widget/types';

export const WIDGET_DATA_KEY = '@porto/widget_data';

function render(goals: WidgetGoal[]) {
  return requestWidgetUpdate({
    widgetName: 'PortoGoals',
    renderWidget: () => <PortoWidgetAndroid goals={goals} />,
  }).catch(() => {});
}

export function pushWidgetData(goals: WidgetGoal[]): void {
  render(goals);
}

export function reloadWidget(): void {
  AsyncStorage.getItem(WIDGET_DATA_KEY)
    .then((raw) => {
      const data: WidgetData = raw ? JSON.parse(raw) : { goals: [] };
      return render(data.goals ?? []);
    })
    .catch(() => {});
}
