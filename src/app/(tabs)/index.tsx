import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { categoryStyle } from '@/constants/categories';
import { Category, GoalWithProgress, listCategories, listGoals, listUnits, Unit } from '@/lib/goals';
import { syncGoalReminders } from '@/lib/notifications';
import { syncWidgetData } from '@/lib/widget-storage';

export default function Home() {
  const router = useRouter();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [g, c, u] = await Promise.all([listGoals(), listCategories(), listUnits()]);
    setGoals(g);
    setCategories(c);
    setUnits(u);
    syncGoalReminders(g).catch((err) => console.warn('syncGoalReminders:', err.message));
    syncWidgetData(g, c).catch((err) => console.warn('syncWidgetData:', err.message));
  }, []);

  // Reîncarcă la fiecare intrare pe tab (ex. după creare).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      load()
        .catch((err) => console.warn('listGoals:', err.message))
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const grouped = categories
    .map((cat) => ({ cat, items: goals.filter((g) => g.category_id === cat.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/goal/new')}>
        <Text style={styles.addButtonText}>+ Goal nou</Text>
      </TouchableOpacity>

      {goals.length === 0 ? (
        <Text style={styles.empty}>
          Încă nu ai niciun goal. Apasă „+ Goal nou” ca să începi.
        </Text>
      ) : (
        grouped.map(({ cat, items }) => {
          const style = categoryStyle(cat.slug);
          return (
            <View key={cat.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={style.icon} size={16} color={style.color} />
                <Text style={[styles.sectionTitle, { color: style.color }]}>{cat.name}</Text>
              </View>
              {items.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  units={units}
                  color={style.color}
                  onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id! } })}
                />
              ))}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function GoalCard({
  goal,
  units,
  color,
  onPress,
}: {
  goal: GoalWithProgress;
  units: Unit[];
  color: string;
  onPress: () => void;
}) {
  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;

  let detail: string;
  if (goal.type === 'daily') {
    detail = `${progress} / ${goal.target_days} zile`;
  } else {
    const unitLabel =
      goal.unit_custom ?? units.find((u) => u.id === goal.unit_id)?.symbol ?? '';
    detail = `${formatNum(progress)} / ${formatNum(goal.target_value ?? 0)} ${unitLabel}`.trim();
  }

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {goal.title}
        </Text>
        <Text style={[styles.cardPct, { color }]}>{Math.round(ratio * 100)}%</Text>
      </View>
      <ProgressBar ratio={ratio} color={color} />
      <Text style={styles.cardDetail}>{detail}</Text>
    </Pressable>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  empty: { fontSize: 15, color: '#64748b', lineHeight: 22, textAlign: 'center', marginTop: 32 },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardPressed: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', flex: 1, marginRight: 8 },
  cardPct: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  cardDetail: { fontSize: 13, color: '#64748b' },
});
