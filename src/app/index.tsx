import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';

/**
 * Ecran tranzitoriu: afișat cât timp se rezolvă sesiunea în RootNavigator,
 * care apoi redirecționează spre (tabs) sau (auth).
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={palette.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
});
