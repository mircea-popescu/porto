import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';

import { PortoIntro } from '@/components/porto-intro';
import { palette } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Forțăm light v1: temă navigație pe fundalul off-white cald. */
const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.bg,
    card: palette.surface,
    text: palette.ink,
    border: palette.line,
    primary: palette.accent,
  },
};

/**
 * Tratează tap-ul pe o notificare push: deep-link către ținta potrivită.
 *   new_follower    → profilul celui care a dat follow
 *   emoji_reaction  → goalul propriu pe care s-a primit reacția
 *   friend_milestone (legacy, fără `kind`) → goalul prietenului
 */
function useNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    async function markOpened(
      me: string,
      type: 'new_follower' | 'emoji_reaction' | 'friend_milestone',
      goalId?: string,
    ) {
      // Engagement tracking (§6.4): marchează notificarea ca deschisă.
      let q = supabase
        .from('notifications')
        .update({ opened_at: new Date().toISOString() })
        .eq('user_id', me)
        .eq('type', type)
        .is('opened_at', null);
      if (goalId) q = q.eq('goal_id', goalId);
      await q.then(() => {}, () => {});
    }

    async function handleResponse(response: Notifications.NotificationResponse | null) {
      const data = response?.notification.request.content.data as
        | { kind?: string; goalId?: string; ownerId?: string; actorId?: string }
        | undefined;
      if (!data) return;

      const { data: userData } = await supabase.auth.getUser();
      const me = userData.user?.id;

      if (data.kind === 'new_follower' && data.actorId) {
        router.push({ pathname: '/user/[id]', params: { id: data.actorId } });
        if (me) await markOpened(me, 'new_follower');
        return;
      }

      if (data.kind === 'emoji_reaction' && data.goalId) {
        // Reacție pe goalul propriu → îl deschid în ecranul meu de goal.
        router.push({ pathname: '/goal/[id]', params: { id: data.goalId } });
        if (me) await markOpened(me, 'emoji_reaction', data.goalId);
        return;
      }

      // Legacy / friend_milestone: goalul prietenului.
      if (data.goalId && data.ownerId) {
        router.push({
          pathname: '/user/[id]/goal/[goalId]',
          params: { id: data.ownerId, goalId: data.goalId },
        });
        if (me) await markOpened(me, 'friend_milestone', data.goalId);
      }
    }

    // App pornit dintr-o notificare (cold start).
    Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => {});

    // App deja deschis / în background.
    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, [router]);
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useNotificationDeepLink();

  useEffect(() => {
    if (loading) return;

    const seg = segments[0] ?? '';
    const inAuth = seg === '(auth)';
    const inTabs = seg === '(tabs)';
    // Stack screens above the tab layer that are valid destinations with an active session.
    const inStack = ['goal', 'user', 'widget-settings'].includes(seg);

    if (!session) {
      // Neautentificat pe orice ecran în afara zone de auth → la login.
      if (!inAuth) router.replace('/(auth)/sign-in');
    } else {
      // Autentificat: redirecționăm spre tabs dacă suntem pe ecranul index tranzitoriu
      // sau pe ecranele de auth (nu și dacă suntem deja pe tabs sau pe un ecran de detaliu).
      if (!inTabs && !inStack) router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="goal/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="goal/[id]" />
      <Stack.Screen name="user/[id]" />
      <Stack.Screen name="user/[id]/goal/[goalId]" />
      <Stack.Screen name="widget-settings" options={{ headerShown: true, title: 'Widget' }} />
    </Stack>
  );
}

/**
 * Decide când rulează intro-ul „Porto”: la deschiderea app-ului cu sesiune activă
 * (cold start) și la un login proaspăt (sesiune null → activă). Nu se joacă pe
 * ecranul de login și nu se dublează pe restaurarea sesiunii la pornire.
 */
function IntroGate() {
  const { session, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const initialDone = useRef(false);
  const prevSession = useRef<Session | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!initialDone.current) {
      // Prima rezolvare a sesiunii (cold start).
      initialDone.current = true;
      prevSession.current = session;
      if (session) setVisible(true);
      return;
    }

    // După rezolvarea inițială: login proaspăt = tranziție null → sesiune.
    const was = prevSession.current;
    prevSession.current = session;
    if (!was && session) setVisible(true);
  }, [session, loading]);

  if (!visible) return null;
  return <PortoIntro onDone={() => setVisible(false)} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme}>
          <AuthProvider>
            <RootNavigator />
            <IntroGate />
          </AuthProvider>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
