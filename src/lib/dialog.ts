import { Alert, Platform } from 'react-native';

/**
 * Confirmare cross-platform. Pe web `Alert.alert` cu butoane nu apelează
 * callback-urile (react-native-web), așa că folosim window.confirm.
 * Întoarce true dacă userul a confirmat.
 */
export function confirmAction(
  title: string,
  message: string,
  confirmLabel = 'OK',
  destructive = false,
): Promise<boolean> {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Anulează', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Notificare simplă (un singur buton), funcțională și pe web. */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
