import { StyleSheet, View } from 'react-native';

import { palette, radius } from '@/constants/theme';

type Props = {
  /** Raport 0..1 (poate depăși 1 la Tip B; se plafonează vizual la 100%). */
  ratio: number;
  color?: string;
  /** 9 pe card (default), 11 pe blocul de progres din detaliu. */
  height?: number;
};

export function ProgressBar({ ratio, color = palette.accent, height = 9 }: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.pill,
    backgroundColor: palette.surface2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
});
