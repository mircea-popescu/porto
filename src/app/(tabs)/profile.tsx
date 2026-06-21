import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Field label="Nume afișat" value={profile?.display_name ?? '—'} />
        <Field label="Username" value={profile ? '@' + profile.username : '—'} />
        <Field label="Email" value={session?.user.email ?? '—'} />
      </View>

      <TouchableOpacity style={styles.widgetBtn} onPress={() => router.push('/widget-settings')}>
        <Text style={styles.widgetBtnText}>Configurează widget</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOut} onPress={onSignOut}>
        <Text style={styles.signOutText}>Deconectează-te</Text>
      </TouchableOpacity>
    </View>
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
  container: { flex: 1, padding: 24, gap: 24 },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  field: { gap: 2 },
  fieldLabel: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  widgetBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  widgetBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '500' },
  signOut: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});
