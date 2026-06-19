import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { Button, Card, Eyebrow } from '@/components/ui';
import { ValueEntries } from '@/components/value-entries';
import { categoryStyle } from '@/constants/categories';
import { font, palette } from '@/constants/theme';
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
  listCategories,
  resetDailyGoal,
  todayISO,
} from '@/lib/goals';

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [goal, setGoal] = useState<GoalWithProgress | null>(null);
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [g, cats] = await Promise.all([getGoal(id), listCategories()]);
    setGoal(g);
    const cat = cats.find((c) => c.id === g.category_id);
    setCategoryName(cat?.name ?? null);
    setCategorySlug(cat?.slug ?? '');
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
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;
  const color = categoryStyle(categorySlug).color;

  const targetLabel =
    goal.type === 'daily'
      ? `${progress} / ${goal.target_days} zile`
      : `${progress} / ${goal.target_value}`;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={palette.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
      >
        <View style={styles.header}>
          {categoryName ? <Eyebrow style={{ color }}>{categoryName}</Eyebrow> : null}
          <Text style={styles.title}>{goal.title}</Text>
        </View>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={[styles.bigPct, { color }]}>{Math.round(ratio * 100)}%</Text>
            <Text style={styles.target}>{targetLabel}</Text>
          </View>
          <ProgressBar ratio={ratio} color={color} height={11} />
          {goal.type === 'value' && goal.completed_in_days != null && (
            <Text style={styles.reached}>🎯 Target atins în {goal.completed_in_days} zile</Text>
          )}
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
          <ValueEntries goalId={id} onChanged={load} />
        )}

        <Button label="Șterge goalul" variant="dangerText" onPress={onDelete} disabled={busy} style={{ marginTop: 8 }} />
      </ScrollView>
    </View>
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
        <Card style={{ gap: 12 }}>
          <Text style={styles.cardTitle}>Perioadă neconfirmată</Text>
          <Text style={styles.muted}>
            Ai {daily.missedCount}{' '}
            {daily.missedCount === 1 ? 'zi neconfirmată' : 'zile neconfirmate'} ({daily.missedFrom}
            {' → '}
            {daily.missedTo}). Te-ai ținut toată perioada?
          </Text>
          <View style={styles.row}>
            <Button
              label="Da, m-am ținut"
              variant="success"
              onPress={onConfirmMissed}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              label="Nu, am ratat"
              variant="dangerOutline"
              onPress={onFailedPeriod}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : daily.todayConfirmed ? (
        <Card style={{ backgroundColor: palette.okSoft, borderColor: palette.okSoft }}>
          <Text style={styles.confirmedText}>✓ Ai confirmat ziua de azi</Text>
        </Card>
      ) : (
        <Button label="Confirmă ziua de azi" variant="success" onPress={onConfirmToday} disabled={busy} />
      )}

      <Button label="Am eșuat — resetează trackerul" variant="linkDiscreet" onPress={onReset} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  container: { paddingHorizontal: 18, paddingTop: 4, gap: 20 },
  header: { gap: 6 },
  title: { fontFamily: font.serif, fontSize: 26, color: palette.ink },
  progressBlock: { gap: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  bigPct: { fontFamily: font.serif, fontSize: 34 },
  target: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3 },
  reached: { fontFamily: font.sansSemibold, fontSize: 14, color: palette.ok },
  cardTitle: { fontFamily: font.sansSemibold, fontSize: 16, color: palette.ink },
  muted: { fontFamily: font.sans, fontSize: 14, color: palette.ink3, lineHeight: 20 },
  confirmedText: { fontFamily: font.sansSemibold, fontSize: 16, color: palette.ok },
  row: { flexDirection: 'row', gap: 12 },
});
