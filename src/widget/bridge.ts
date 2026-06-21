/**
 * Bridge widget — implementare neutră (web / fallback). No-op.
 *
 * Metro alege automat fișierul specific platformei:
 * - iOS     → bridge.ios.tsx  (expo-widgets)
 * - Android → bridge.android.tsx (react-native-android-widget)
 * - web     → acest fișier (no-op)
 */
import { WidgetGoal } from '@/widget/types';

export function pushWidgetData(_goals: WidgetGoal[]): void {
  // no-op pe web
}

export function reloadWidget(): void {
  // no-op pe web
}
