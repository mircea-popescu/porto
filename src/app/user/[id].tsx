import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { notify } from '@/lib/dialog';
import { GoalWithProgress, listUnits, Unit, unitLabel } from '@/lib/goals';
import {
  follow,
  getProfile,
  getUserPublicGoals,
  isFollowing,
  Profile,
  unfollow,
} from '@/lib/social';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name }} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.display_name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.display_name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>

        <TouchableOpacity
          style={[styles.followBtn, followingUser && styles.followingBtn, busy && styles.disabled]}
          onPress={onToggleFollow}
          disabled={busy}
        >
          <Text style={[styles.followText, followingUser && styles.followingText]}>
            {followingUser ? 'Nu mai urmări' : 'Urmărește'}
          </Text>
        </TouchableOpacity>

        {!followingUser ? (
          <Text style={styles.locked}>
            Urmărește acest user ca să-i vezi goalurile publice.
          </Text>
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
    </>
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
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {goal.title}
        </Text>
        <Text style={styles.cardPct}>{Math.round(ratio * 100)}%</Text>
      </View>
      <ProgressBar ratio={ratio} />
      <Text style={styles.cardDetail}>{detail}</Text>
    </Pressable>
  );
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', gap: 6 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  username: { fontSize: 14, color: '#64748b' },
  followBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1' },
  followText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  followingText: { color: '#334155' },
  disabled: { opacity: 0.5 },
  locked: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  goalList: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
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
