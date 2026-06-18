import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmojiReactions } from '@/components/emoji-reactions';
import { ProgressBar } from '@/components/progress-bar';
import { notify } from '@/lib/dialog';
import { getGoal, GoalWithProgress, listUnits, Unit, unitLabel } from '@/lib/goals';

export default function FriendGoalView() {
  const { goalId } = useLocalSearchParams<{ id: string; goalId: string }>();
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;
  const unit = goal.type === 'value' ? unitLabel(goal, units) : '';

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
              : `${progress} / ${goal.target_value} ${unit}  ·  ${Math.round(ratio * 100)}%`}
          </Text>
          {goal.type === 'value' && goal.completed_in_days != null && (
            <Text style={styles.reached}>🎉 Target atins în {goal.completed_in_days} zile</Text>
          )}
        </View>

        <View style={styles.reactBlock}>
          <Text style={styles.reactLabel}>Felicită-l</Text>
          <EmojiReactions goalId={goalId} canReact />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 20 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  progressBlock: { gap: 8 },
  progressText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  reached: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  reactBlock: { gap: 10 },
  reactLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
});
