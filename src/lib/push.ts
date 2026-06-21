import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type DevicePlatform = Database['public']['Enums']['device_platform'];

/** projectId EAS necesar pentru getExpoPushTokenAsync (vezi app.json → extra.eas.projectId). */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

/**
 * Înregistrează device-ul curent pentru push notifications și salvează tokenul
 * în `user_devices` (multi-device, §9.3 / §14 dec. 22).
 * No-op pe web și pe emulatoare (Expo Push cere device fizic).
 * Sigur de apelat de mai multe ori (upsert pe expo_push_token).
 *
 * `userId` se primește din sesiunea deja rezolvată — NU apelăm `supabase.auth.getUser()`
 * aici, fiindcă re-intrarea în lock-ul de auth (când funcția e declanșată din
 * `onAuthStateChange` / `getSession`) blochează rezolvarea sesiunii pe React Native.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Porto',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = getProjectId();
  const tokenResp = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResp.data;
  if (!token) return null;

  if (!userId) return null;

  const platform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  const { error } = await supabase.from('user_devices').upsert(
    {
      user_id: userId,
      expo_push_token: token,
      platform,
      device_name: Device.deviceName ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'expo_push_token' },
  );
  if (error) throw error;

  return token;
}
