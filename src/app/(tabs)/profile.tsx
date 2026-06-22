import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Eyebrow, ScreenTitle, StatTile } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { GoalWithProgress, listGoals } from '@/lib/goals';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let active = true;

    Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      listGoals().catch(() => [] as GoalWithProgress[]),
    ]).then(([profileRes, g]) => {
      if (!active) return;
      if (profileRes.error) {
        Alert.alert('Eroare', 'Nu am putut încărca profilul: ' + profileRes.error.message);
      }
      setProfile(profileRes.data);
      setGoals(g);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [session]);

  // Statistici reale derivate din goaluri: obiceiuri, total zile ținute, publice.
  const totalDays = goals
    .filter((g) => g.type === 'daily')
    .reduce((sum, g) => sum + (g.progress ?? 0), 0);
  const publicCount = goals.filter((g) => g.is_public).length;

  async function onSignOut() {
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Eroare', (err as Error).message);
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 },
      ]}
    >
      <View style={styles.header}>
        <Eyebrow>Contul tău</Eyebrow>
        <ScreenTitle>Profil</ScreenTitle>
      </View>

      <View style={styles.avatarBlock}>
        <Avatar name={profile?.display_name ?? '?'} size={88} />
        <Text style={styles.name}>{profile?.display_name ?? '—'}</Text>
        {profile?.username ? <Text style={styles.handle}>@{profile.username}</Text> : null}
      </View>

      <View style={styles.statRow}>
        <StatTile value={goals.length} label="obiceiuri" color={palette.accent} />
        <StatTile value={totalDays} label="zile ținute" color={palette.flameInk} />
        <StatTile value={publicCount} label="publice" color={palette.ok} />
      </View>

      <Card style={styles.card}>
        <Field label="Email" value={session?.user.email ?? '—'} />
      </Card>

      <Button
        label="Configurează widget"
        variant="ghost"
        onPress={() => router.push('/widget-settings')}
      />

      <Button label="Deconectează-te" variant="dangerOutline" onPress={onSignOut} />
    </ScrollView>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  container: { paddingHorizontal: 24, gap: 24 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { gap: 4 },
  avatarBlock: { alignItems: 'center', marginTop: 8, gap: 4 },
  name: { fontFamily: font.serif, fontSize: 22, color: palette.ink, marginTop: 12 },
  handle: { fontFamily: font.sansMedium, fontSize: 14, color: palette.ink3 },
  statRow: { flexDirection: 'row', gap: 10 },
  card: { gap: 16 },
  field: { gap: 3 },
  fieldLabel: {
    fontFamily: font.sansSemibold,
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: palette.ink3,
  },
  fieldValue: { fontFamily: font.sansMedium, fontSize: 16, color: palette.ink },
});
