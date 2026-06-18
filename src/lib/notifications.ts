import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { GoalWithProgress } from '@/lib/goals';

// Cum se afișează notificarea când app-ul e în prim-plan (doar nativ).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Orele reminderelor zilnice de confirmare Tip A (§6.1).
const DAILY_REMINDER_HOURS = [11, 15, 20];
// Inactivitate Tip B: notificare după 7 zile (§6.2).
const VALUE_INACTIVITY_DAYS = 7;

/** Cere permisiunea de notificări (skip pe web). */
export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Resincronizează notificările locale cu goalurile curente.
 * Idempotent: anulează tot ce era programat și reprogramează.
 * Pe web e no-op (expo-notifications nu suportă scheduling local pe web).
 */
export async function syncGoalReminders(goals: GoalWithProgress[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Mementouri',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  // Tip A — reminder zilnic dacă există măcar un goal de confirmat.
  const hasDailyGoals = goals.some((g) => g.type === 'daily');
  if (hasDailyGoals) {
    for (const hour of DAILY_REMINDER_HOURS) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Porto', body: 'Intră să-ți confirmi goalurile de azi.' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: 0,
        },
      });
    }
  }

  // Tip B — inactivitate: notificare la 7 zile de la ultima sincronizare (deschidere app).
  // Varianta precisă (de la ultima intrare) intră în Edge Function la pasul 9.
  const valueGoals = goals.filter((g) => g.type === 'value');
  for (const goal of valueGoals) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Porto', body: `Hei, nu uita de targetul tău «${goal.title}»!` },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: VALUE_INACTIVITY_DAYS * 24 * 60 * 60,
      },
    });
  }
}
