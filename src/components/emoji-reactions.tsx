import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { font, palette, radius } from '@/constants/theme';
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
                style={({ pressed }) => [
                  styles.pickBtn,
                  selected && styles.pickBtnSelected,
                  pressed && { opacity: 0.6 },
                ]}
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
  container: { gap: 12 },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.surface2,
  },
  countEmoji: { fontSize: 16 },
  countNum: { fontFamily: font.sansSemibold, fontSize: 13, color: palette.ink2 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pickBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
  },
  pickBtnSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
  pickEmoji: { fontSize: 24 },
});
