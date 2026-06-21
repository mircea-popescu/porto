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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { Avatar, Button, Card, Eyebrow, ScreenTitle } from '@/components/ui';
import { categoryStyle } from '@/constants/categories';
import { font, palette } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { Category, GoalWithProgress, listCategories, listGoals, listUnits, Unit } from '@/lib/goals';
import { syncGoalReminders } from '@/lib/notifications';
import { syncWidgetData } from '@/lib/widget-storage';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined)?.split(' ')[0] ?? null;

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
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  const grouped = categories
    .map((cat) => ({ cat, items: goals.filter((g) => g.category_id === cat.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={palette.accent}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{displayName ? `Salut, ${displayName}` : 'Salut'}</Eyebrow>
          <ScreenTitle>Obiceiurile tale</ScreenTitle>
        </View>
        <Avatar name={displayName} size={42} />
      </View>

      <Button label="+ Goal nou" onPress={() => router.push('/goal/new')} />

      {goals.length === 0 ? (
        <Text style={styles.empty}>Încă nu ai niciun goal. Apasă „+ Goal nou” ca să începi.</Text>
      ) : (
        grouped.map(({ cat, items }) => {
          const style = categoryStyle(cat.slug);
          return (
            <View key={cat.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: style.tint }]}>
                  <Ionicons name={style.icon} size={15} color={style.color} />
                </View>
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
    const unitLabel = goal.unit_custom ?? units.find((u) => u.id === goal.unit_id)?.symbol ?? '';
    detail = `${formatNum(progress)} / ${formatNum(goal.target_value ?? 0)} ${unitLabel}`.trim();
  }

  return (
    <Pressable
      style={({ pressed }) => [pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {goal.title}
          </Text>
          <Text style={[styles.cardPct, { color }]}>{Math.round(ratio * 100)}%</Text>
        </View>
        <ProgressBar ratio={ratio} color={color} />
        <Text style={styles.cardDetail}>{detail}</Text>
      </Card>
    </Pressable>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  container: { paddingHorizontal: 18, gap: 16 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  empty: {
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink3,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 32,
  },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontFamily: font.sansSemibold, fontSize: 14 },
  card: { padding: 18, gap: 10 },
  cardPressed: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: {
    fontFamily: font.sansSemibold,
    fontSize: 16,
    color: palette.ink,
    flex: 1,
    marginRight: 8,
  },
  cardPct: { fontFamily: font.serif, fontSize: 22 },
  cardDetail: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3 },
});
