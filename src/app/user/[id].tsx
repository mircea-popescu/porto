import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/progress-bar';
import { Avatar, Button, Card } from '@/components/ui';
import { font, palette } from '@/constants/theme';
import { notify } from '@/lib/dialog';
import { GoalWithProgress, listUnits, Unit, unitLabel } from '@/lib/goals';
import { follow, getProfile, getUserPublicGoals, isFollowing, Profile, unfollow } from '@/lib/social';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [followingUser, setFollowingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([getProfile(id), isFollowing(id)]);
    setProfile(p);
    setFollowingUser(f);
    // Goalurile publice sunt vizibile doar dacă îl urmărești (RLS).
    setGoals(f ? await getUserPublicGoals(id) : []);
    if (f && units.length === 0) setUnits(await listUnits());
  }, [id, units.length]);

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

  async function onToggleFollow() {
    setBusy(true);
    try {
      if (followingUser) {
        await unfollow(id);
      } else {
        await follow(id);
      }
      await load();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

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
        <View style={styles.headerBlock}>
          <Avatar name={profile.display_name} size={84} />
          <Text style={styles.name}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>

        <Button
          label={followingUser ? 'Nu mai urmări' : 'Urmărește'}
          variant={followingUser ? 'ghost' : 'primary'}
          onPress={onToggleFollow}
          disabled={busy}
        />

        {!followingUser ? (
          <Text style={styles.locked}>Urmărește acest user ca să-i vezi goalurile publice.</Text>
        ) : goals.length === 0 ? (
          <Text style={styles.locked}>Nu are goaluri publice momentan.</Text>
        ) : (
          <View style={styles.goalList}>
            <Text style={styles.sectionLabel}>Goaluri publice</Text>
            {goals.map((g) => (
              <FriendGoalCard
                key={g.id}
                goal={g}
                unit={g.type === 'value' ? unitLabel(g, units) : ''}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]/goal/[goalId]',
                    params: { id, goalId: g.id! },
                  })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function FriendGoalCard({
  goal,
  unit,
  onPress,
}: {
  goal: GoalWithProgress;
  unit: string;
  onPress: () => void;
}) {
  const ratio = goal.progress_ratio ?? 0;
  const progress = goal.progress ?? 0;
  const detail =
    goal.type === 'daily'
      ? `${progress} / ${goal.target_days} zile`
      : `${formatNum(progress)} / ${formatNum(goal.target_value ?? 0)} ${unit}`.trim();

  return (
    <Pressable style={({ pressed }) => [pressed && { opacity: 0.6 }]} onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {goal.title}
          </Text>
          <Text style={styles.cardPct}>{Math.round(ratio * 100)}%</Text>
        </View>
        <ProgressBar ratio={ratio} />
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
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  container: { paddingHorizontal: 18, paddingTop: 4, gap: 16 },
  headerBlock: { alignItems: 'center', gap: 8, marginBottom: 4 },
  name: { fontFamily: font.serif, fontSize: 24, color: palette.ink, marginTop: 4 },
  username: { fontFamily: font.sansMedium, fontSize: 14, color: palette.ink3 },
  locked: {
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink3,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  goalList: { gap: 10, marginTop: 8 },
  sectionLabel: {
    fontFamily: font.sansSemibold,
    fontSize: 12,
    letterSpacing: 0.48,
    color: palette.ink3,
    textTransform: 'uppercase',
  },
  card: { padding: 18, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: {
    fontFamily: font.sansSemibold,
    fontSize: 16,
    color: palette.ink,
    flex: 1,
    marginRight: 8,
  },
  cardPct: { fontFamily: font.serif, fontSize: 22, color: palette.accent },
  cardDetail: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink3 },
});
