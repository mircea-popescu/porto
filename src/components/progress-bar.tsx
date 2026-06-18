import { StyleSheet, View } from 'react-native';

type Props = {
  /** Raport 0..1 (poate depăși 1 la Tip B; se plafonează vizual la 100%). */
  ratio: number;
  color?: string;
};

export function ProgressBar({ ratio, color = '#2563eb' }: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
