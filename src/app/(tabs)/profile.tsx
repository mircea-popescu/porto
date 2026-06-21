import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Button, Card, Eyebrow, ScreenTitle } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let active = true;

    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          Alert.alert('Eroare', 'Nu am putut încărca profilul: ' + error.message);
        }
        setProfile(data);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

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
        <Avatar name={profile?.display_name ?? '?'} size={84} />
      </View>

      <Card style={styles.card}>
        <Field label="Nume afișat" value={profile?.display_name ?? '—'} />
        <Field label="Username" value={profile ? '@' + profile.username : '—'} />
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
  avatarBlock: { alignItems: 'center', marginTop: 8 },
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
