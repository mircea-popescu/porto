import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { gradientDir, palette, radius } from '@/constants/theme';

type Props = {
  /** Raport 0..1 (poate depăși 1 la Tip B; se plafonează vizual la 100%). */
  ratio: number;
  /** Gradient (2 stopuri) al umpluturii. Implicit: violet → ember. */
  gradient?: readonly [string, string];
  /** Culoare solidă pentru halo-ul luminos din spatele barei. Implicit: accent. */
  color?: string;
  /** 10 pe card (default), 14 pe blocul de progres din detaliu. */
  height?: number;
};

export function ProgressBar({
  ratio,
  gradient = [palette.ember3, palette.accent],
  color = palette.accent,
  height = 10,
}: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  const showDot = pct > 6 && pct < 99;

  return (
    // Wrapper neclipuit: poartă halo-ul colorat (umbra) în jurul barei.
    <View style={[styles.halo, { shadowColor: color }]}>
      <View style={[styles.track, { height }]}>
        {pct > 0 && (
          <View style={[styles.fillClip, { width: `${pct}%` }]}>
            <LinearGradient
              colors={gradient as unknown as [string, string]}
              start={gradientDir.start}
              end={gradientDir.end}
              style={StyleSheet.absoluteFill}
            />
            {showDot && <View style={styles.dot} />}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  track: {
    borderRadius: radius.pill,
    backgroundColor: palette.surface2,
    overflow: 'hidden',
  },
  fillClip: {
    height: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
});
