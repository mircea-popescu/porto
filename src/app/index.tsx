import { ActivityIndicator, StyleSheet, View } from 'react-native';

/**
 * Ecran tranzitoriu: afișat cât timp se rezolvă sesiunea în RootNavigator,
 * care apoi redirecționează spre (tabs) sau (auth).
 */
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
