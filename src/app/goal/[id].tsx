import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { confirmAction, notify } from '@/lib/dialog';
import {
  computeDailyState,
  confirmDays,
  DailyState,
  dateRange,
  deleteGoal,
  getConfirmedDates,
  getGoal,
  GoalWithProgress,
  resetDailyGoal,
  todayISO,
} from '@/lib/goals';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [goal, setGoal] = useState<GoalWithProgress | null>(null);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const g = await getGoal(id);
    setGoal(g);
    if (g.type === 'daily' && g.started_at) {
      const dates = await getConfirmedDates(id);
      setDaily(computeDailyState(g.started_at, dates));
    } else {
      setDaily(null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch((err) => notify('Eroare', err.message))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onConfirmToday() {
    run(() => confirmDays(id, [todayISO()]));
  }

  function onConfirmMissed() {
    if (!daily?.missedFrom || !daily.missedTo) return;
    run(() => confirmDays(id, dateRange(daily.missedFrom!, daily.missedTo!)));
  }

  async function onFailedPeriod() {
    const ok = await confirmAction(
      'Resetare tracker',
      'Dacă ai ratat măcar o zi, trackerul se resetează la 0 și reîncepe de azi. Istoricul se șterge. Continui?',
      'Resetează',
      true,
    );
    if (ok) run(() => resetDailyGoal(id));
  }

  async function onReset() {
    const ok = await confirmAction(
      'Am eșuat',
      'Goalul revine la 0 și reîncepe de azi. Istoricul se șterge. Continui?',
      'Resetează',
      true,
    );
    if (ok) run(() => resetDailyGoal(id));
  }

  async function onDelete() {
    const ok = await confirmAction('Șterge goalul', 'Sigur vrei să ștergi acest goal?', 'Șterge', true);
    if (!ok) return;
    // Nu reîncărcăm după ștergere: view-ul ascunde goalul (is_deleted), getGoal ar eșua.
    setBusy(true);
    try {
      await deleteGoal(id);
      router.back();
    } catch (err) {
      notify('Eroare', (err as Error).message);
      setBusy(false);
    }
  }

  if (loading || !goal) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;

  return (
    <>
      <Stack.Screen options={{ title: goal.title ?? 'Goal' }} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{goal.title}</Text>

        <View style={styles.progressBlock}>
          <ProgressBar ratio={ratio} />
          <Text style={styles.progressText}>
            {goal.type === 'daily'
              ? `${progress} / ${goal.target_days} zile  ·  ${Math.round(ratio * 100)}%`
              : `${progress} / ${goal.target_value}  ·  ${Math.round(ratio * 100)}%`}
          </Text>
        </View>

        {goal.type === 'daily' ? (
          <DailyActions
            daily={daily}
            busy={busy}
            onConfirmToday={onConfirmToday}
            onConfirmMissed={onConfirmMissed}
            onFailedPeriod={onFailedPeriod}
            onReset={onReset}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.muted}>
              Adăugarea și editarea intrărilor pentru goalurile de tip valoare vine la pasul
              următor (pasul 6).
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} disabled={busy}>
          <Text style={styles.deleteText}>Șterge goalul</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function DailyActions({
  daily,
  busy,
  onConfirmToday,
  onConfirmMissed,
  onFailedPeriod,
  onReset,
}: {
  daily: DailyState | null;
  busy: boolean;
  onConfirmToday: () => void;
  onConfirmMissed: () => void;
  onFailedPeriod: () => void;
  onReset: () => void;
}) {
  if (!daily) return null;

  return (
    <View style={{ gap: 16 }}>
      {daily.missedCount > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perioadă neconfirmată</Text>
          <Text style={styles.muted}>
            Ai {daily.missedCount}{' '}
            {daily.missedCount === 1 ? 'zi neconfirmată' : 'zile neconfirmate'} ({daily.missedFrom}
            {' → '}
            {daily.missedTo}). Te-ai ținut toată perioada?
          </Text>
          <View style={styles.row}>
            <PrimaryButton label="Da, m-am ținut" onPress={onConfirmMissed} disabled={busy} />
            <DangerButton label="Nu, am ratat" onPress={onFailedPeriod} disabled={busy} />
          </View>
        </View>
      ) : daily.todayConfirmed ? (
        <View style={styles.card}>
          <Text style={styles.confirmedText}>✓ Ai confirmat ziua de azi</Text>
        </View>
      ) : (
        <PrimaryButton label="Confirmă ziua de azi" onPress={onConfirmToday} disabled={busy} big />
      )}

      <TouchableOpacity onPress={onReset} disabled={busy}>
        <Text style={styles.failLink}>Am eșuat — resetează trackerul</Text>
      </TouchableOpacity>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  big,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryBtn, big && styles.bigBtn, disabled && styles.disabled, { flex: 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

function DangerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.dangerBtn, disabled && styles.disabled, { flex: 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.dangerText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  progressBlock: { gap: 8 },
  progressText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  muted: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  confirmedText: { fontSize: 16, fontWeight: '600', color: '#16a34a' },
  row: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bigBtn: { paddingVertical: 16 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  failLink: { color: '#94a3b8', fontSize: 14, textAlign: 'center', textDecorationLine: 'underline' },
  deleteBtn: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  deleteText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
