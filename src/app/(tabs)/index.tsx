import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { Avatar, Button, Card, Eyebrow, Flame, ScreenTitle } from '@/components/ui';
import { categoryStyle } from '@/constants/categories';
import { font, gradientDir, gradients, palette } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import {
  Category,
  getConfirmedTodayGoalIds,
  GoalWithProgress,
  listCategories,
  listGoals,
  listUnits,
  Unit,
} from '@/lib/goals';
import { syncGoalReminders } from '@/lib/notifications';
import { syncWidgetData } from '@/lib/widget-storage';

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [confirmedToday, setConfirmedToday] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    (session?.user.user_metadata?.display_name as string | undefined)?.split(' ')[0] ?? null;

  const load = useCallback(async () => {
    const [g, c, u, today] = await Promise.all([
      listGoals(),
      listCategories(),
      listUnits(),
      getConfirmedTodayGoalIds(),
    ]);
    setGoals(g);
    setCategories(c);
    setUnits(u);
    setConfirmedToday(today);
    syncGoalReminders(g).catch((err) => console.warn('syncGoalReminders:', err.message));
    syncWidgetData(g, c).catch((err) => console.warn('syncWidgetData:', err.message));
  }, []);

  // Reîncarcă la fiecare intrare pe tab (ex. după creare).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      load()
        .catch((err) => {
          console.warn('listGoals:', err.message);
          if (active) setError(errText(err));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load]),
  );

  // Reîncercare manuală după o eroare (ex. request expirat pe rețea proastă).
  async function retry() {
    setLoading(true);
    setError(null);
    await load().catch((err) => {
      console.warn('listGoals:', err.message);
      setError(errText(err));
    });
    setLoading(false);
  }

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

  // Dacă încărcarea a eșuat (ex. request expirat / rețea proastă), arătăm un mesaj
  // recuperabil în loc de spinner infinit sau de ecran „gol" înșelător.
  if (error) {
    return (
      <View style={[styles.screen, styles.center, { paddingHorizontal: 32, gap: 16 }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={palette.ink4} />
        <Text style={styles.empty}>
          Nu am putut încărca datele. Verifică conexiunea și încearcă din nou.
        </Text>
        <Text style={styles.errorDetail} selectable>
          {error}
        </Text>
        <Button label="Reîncearcă" onPress={retry} />
      </View>
    );
  }

  const grouped = categories
    .map((cat) => ({ cat, items: goals.filter((g) => g.category_id === cat.id) }))
    .filter((group) => group.items.length > 0);

  const dailyGoals = goals.filter((g) => g.type === 'daily');
  const confirmedCount = dailyGoals.filter((g) => g.id && confirmedToday.has(g.id)).length;
  const bestStreak = dailyGoals.reduce((m, g) => Math.max(m, g.progress ?? 0), 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Eyebrow>{displayName ? `Salut, ${displayName}` : 'Salut'}</Eyebrow>
          <ScreenTitle>Obiceiurile tale</ScreenTitle>
        </View>
        <Avatar name={displayName} size={44} />
      </View>

      {dailyGoals.length > 0 && (
        <TodayHero
          bestStreak={bestStreak}
          confirmed={confirmedCount}
          total={dailyGoals.length}
        />
      )}

      <Button label="+ Goal nou" onPress={() => router.push('/goal/new')} />

      {goals.length === 0 ? (
        <Text style={styles.empty}>Încă nu ai niciun goal. Apasă „+ Goal nou” ca să începi.</Text>
      ) : (
        grouped.map(({ cat, items }) => {
          const style = categoryStyle(cat.slug);
          return (
            <View key={cat.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <LinearGradient
                  colors={style.gradient as unknown as [string, string]}
                  start={gradientDir.start}
                  end={gradientDir.end}
                  style={styles.sectionIcon}
                >
                  <Ionicons name={style.icon} size={15} color="#fff" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: style.color }]}>{cat.name}</Text>
                <Text style={styles.sectionCount}>{items.length}</Text>
              </View>
              {items.map((g) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  units={units}
                  color={style.color}
                  gradient={style.gradient}
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

/** Hero „azi”: cel mai lung streak activ + câte obiceiuri ai confirmat azi. */
function TodayHero({
  bestStreak,
  confirmed,
  total,
}: {
  bestStreak: number;
  confirmed: number;
  total: number;
}) {
  const allDone = confirmed >= total && total > 0;
  const dots = Math.min(total, 8);
  return (
    <LinearGradient
      colors={gradients.ember as unknown as [string, string]}
      locations={gradients.emberLocations}
      start={gradientDir.start}
      end={gradientDir.end}
      style={styles.hero}
    >
      <Text style={styles.heroK}>Azi</Text>
      <Text style={styles.heroBig}>
        {bestStreak > 0 ? (
          <>
            🔥 <Text style={styles.heroBigEm}>{bestStreak} zile</Text> la rând
          </>
        ) : (
          'Începe azi 🔥'
        )}
      </Text>
      <Text style={styles.heroSub}>
        {allDone
          ? `Toate cele ${total} obiceiuri confirmate azi 🎉`
          : `${confirmed} din ${total} obiceiuri confirmate azi`}
      </Text>
      <View style={styles.heroBars}>
        {Array.from({ length: dots }).map((_, i) => (
          <View key={i} style={[styles.heroBar, i < confirmed && styles.heroBarOn]} />
        ))}
      </View>
    </LinearGradient>
  );
}

function GoalCard({
  goal,
  units,
  color,
  gradient,
  onPress,
}: {
  goal: GoalWithProgress;
  units: Unit[];
  color: string;
  gradient: readonly [string, string];
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
    <Pressable style={({ pressed }) => [pressed && styles.cardPressed]} onPress={onPress}>
      <Card style={styles.card}>
        <LinearGradient
          colors={gradient as unknown as [string, string]}
          start={gradientDir.start}
          end={gradientDir.end}
          style={styles.accentBar}
        />
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {goal.title}
          </Text>
          <Text style={[styles.cardPct, { color }]}>{Math.round(ratio * 100)}%</Text>
        </View>
        <ProgressBar ratio={ratio} gradient={gradient} color={color} />
        <View style={styles.cardFooter}>
          <Text style={styles.cardDetail}>{detail}</Text>
          {goal.type === 'daily' && progress > 0 && <Flame label={String(progress)} />}
        </View>
      </Card>
    </Pressable>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Detaliu diagnostic afișat pe ecranul de eroare: numele + mesajul erorii.
// Un timeout apare ca „AbortError"; o eroare Supabase/auth aduce mesajul ei.
// Astfel, dacă încărcarea tot eșuează, un singur screenshot spune exact ce a picat.
function errText(err: unknown): string {
  if (err instanceof Error) {
    return err.name && err.name !== 'Error' ? `${err.name}: ${err.message}` : err.message;
  }
  return String(err);
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
  errorDetail: {
    fontFamily: font.sans,
    fontSize: 12,
    color: palette.ink4,
    textAlign: 'center',
    lineHeight: 17,
  },
  // Hero
  hero: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    shadowColor: palette.ember2,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 8,
  },
  heroK: {
    fontFamily: font.sansSemibold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.88)',
  },
  heroBig: { fontFamily: font.serif, fontSize: 28, color: '#fff', marginTop: 4, lineHeight: 32 },
  heroBigEm: { fontStyle: 'italic' },
  heroSub: { fontFamily: font.sansMedium, fontSize: 12.5, color: 'rgba(255,255,255,0.95)', marginTop: 8 },
  heroBars: { flexDirection: 'row', gap: 5, marginTop: 12 },
  heroBar: { height: 6, flex: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.32)' },
  heroBarOn: { backgroundColor: '#fff' },
  // Sections
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
  sectionCount: { fontFamily: font.sansSemibold, fontSize: 12, color: palette.ink4, marginLeft: 'auto' },
  // Cards
  card: { padding: 16, paddingLeft: 18, gap: 10, overflow: 'hidden' },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardPressed: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: {
    fontFamily: font.sansSemibold,
    fontSize: 16,
    color: palette.ink,
    flex: 1,
    marginRight: 8,
  },
  cardPct: { fontFamily: font.serif, fontStyle: 'italic', fontSize: 22 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDetail: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3 },
});
