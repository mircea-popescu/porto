import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { notify } from '@/lib/dialog';
import {
  addReaction,
  EMOJI_LIST,
  EmojiCount,
  EmojiType,
  getMyReactionsForToday,
  getReactionsForToday,
} from '@/lib/social';

type Props = {
  goalId: string;
  /** Dacă true, arată picker-ul de emoji (vizualizarea goalului unui prieten). */
  canReact: boolean;
};

/**
 * Afișează felicitările primite azi (distincte cu counter, §5.3) și, opțional,
 * picker-ul celor 5 emoji pentru a felicita un prieten.
 */
export function EmojiReactions({ goalId, canReact }: Props) {
  const [counts, setCounts] = useState<EmojiCount[]>([]);
  const [mine, setMine] = useState<EmojiType[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, m] = await Promise.all([
      getReactionsForToday(goalId),
      canReact ? getMyReactionsForToday(goalId) : Promise.resolve<EmojiType[]>([]),
    ]);
    setCounts(c);
    setMine(m);
  }, [goalId, canReact]);

  useEffect(() => {
    load().catch((err) => console.warn('reactions:', err.message));
  }, [load]);

  async function onReact(emoji: EmojiType) {
    setBusy(true);
    try {
      await addReaction(goalId, emoji);
      await load();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      {counts.length > 0 && (
        <View style={styles.counts}>
          {counts.map((c) => (
            <View key={c.emoji} style={styles.countPill}>
              <Text style={styles.countEmoji}>{c.char}</Text>
              {c.count > 1 && <Text style={styles.countNum}>×{c.count}</Text>}
            </View>
          ))}
        </View>
      )}

      {canReact && (
        <View style={styles.picker}>
          {EMOJI_LIST.map((e) => {
            const selected = mine.includes(e.type);
            return (
              <Pressable
                key={e.type}
                style={[styles.pickBtn, selected && styles.pickBtnSelected]}
                onPress={() => onReact(e.type)}
                disabled={busy || selected}
              >
                <Text style={styles.pickEmoji}>{e.char}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  countEmoji: { fontSize: 16 },
  countNum: { fontSize: 13, fontWeight: '700', color: '#475569' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pickBtnSelected: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  pickEmoji: { fontSize: 22 },
});
