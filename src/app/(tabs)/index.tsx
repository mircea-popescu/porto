import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Goalurile tale</Text>
      <Text style={styles.empty}>
        Încă nu ai niciun goal. (Crearea de goaluri vine la pasul următor din Faza 1.)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  empty: { fontSize: 15, color: '#64748b', lineHeight: 22 },
});
