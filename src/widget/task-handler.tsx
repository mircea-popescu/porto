"use no memo";
/**
 * Task handler Android (react-native-android-widget).
 * Rulează într-un context JS headless când OS-ul cere randarea widget-ului
 * (adăugare, update periodic, resize). Citește datele cache-uite din AsyncStorage
 * și desenează widget-ul. Tap-urile pe goaluri sunt gestionate nativ prin
 * clickAction `OPEN_URI` (deep link `porto://goal/{id}`), deci nu tratăm WIDGET_CLICK aici.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { PortoWidgetAndroid } from '@/widget/PortoWidgetAndroid';
import { WidgetData } from '@/widget/types';

const WIDGET_DATA_KEY = '@porto/widget_data';

async function readGoals() {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    const data: WidgetData = raw ? JSON.parse(raw) : { goals: [] };
    return data.goals ?? [];
  } catch {
    return [];
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const { widgetAction, renderWidget } = props;

  switch (widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const goals = await readGoals();
      renderWidget(<PortoWidgetAndroid goals={goals} />);
      break;
    }
    default:
      break;
  }
}
