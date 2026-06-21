import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmojiReactions } from '@/components/emoji-reactions';
import { ProgressBar } from '@/components/progress-bar';
import { Eyebrow } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { notify } from '@/lib/dialog';
import { getGoal, GoalWithProgress, listUnits, Unit, unitLabel } from '@/lib/goals';

export default function FriendGoalView() {
  const { goalId } = useLocalSearchParams<{ id: string; goalId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [goal, setGoal] = useState<GoalWithProgress | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const g = await getGoal(goalId);
    setGoal(g);
    if (g.type === 'value' && units.length === 0) setUnits(await listUnits());
  }, [goalId, units.length]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch((err) => notify('Eroare', err.message))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [load]),
  );

  if (loading || !goal) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;
  const unit = goal.type === 'value' ? unitLabel(goal, units) : '';
  const targetLabel =
    goal.type === 'daily'
      ? `${progress} / ${goal.target_days} zile`
      : `${progress} / ${goal.target_value} ${unit}`.trim();

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

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.title}>{goal.title}</Text>

        <View style={styles.progressBlock}>
          <View style={styles.progressRow}>
            <Text style={styles.bigPct}>{Math.round(ratio * 100)}%</Text>
            <Text style={styles.target}>{targetLabel}</Text>
          </View>
          <ProgressBar ratio={ratio} height={11} />
          {goal.type === 'value' && goal.completed_in_days != null && (
            <Text style={styles.reached}>🎯 Target atins în {goal.completed_in_days} zile</Text>
          )}
        </View>

        <View style={styles.reactBlock}>
          <Eyebrow>Felicită-l</Eyebrow>
          <EmojiReactions goalId={goalId} canReact />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  container: { paddingHorizontal: 18, paddingTop: 4, gap: 20 },
  title: { fontFamily: font.serif, fontSize: 26, color: palette.ink },
  progressBlock: { gap: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  bigPct: { fontFamily: font.serif, fontSize: 34, color: palette.accent },
  target: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3 },
  reached: { fontFamily: font.sansSemibold, fontSize: 14, color: palette.ok },
  reactBlock: { gap: 12 },
});
