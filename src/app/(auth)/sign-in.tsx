import { Link } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui';
import { font, palette, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/context/auth';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await signIn(email, password);
      // Redirecționarea spre (tabs) e gestionată în RootNavigator.
    } catch (err) {
      Alert.alert('Autentificare eșuată', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />

          <BrandLogo size={52} />
          <Text style={styles.subtitle}>Bine ai revenit</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={palette.ink4}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Parolă"
            placeholderTextColor={palette.ink4}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          <Button
            label="Intră în cont"
            onPress={onSubmit}
            disabled={!canSubmit}
            loading={submitting}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Nu ai cont? </Text>
            <Link href="/(auth)/sign-up" style={styles.link}>
              Creează unul
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 999,
  },
  blobTop: { top: -90, right: -70, backgroundColor: 'rgba(255,77,109,0.16)' },
  blobBottom: { bottom: -70, left: -80, backgroundColor: 'rgba(124,92,255,0.15)' },
  subtitle: {
    fontFamily: font.sansMedium,
    fontSize: 15,
    textAlign: 'center',
    color: palette.ink3,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { fontFamily: font.sans, color: palette.ink3 },
  link: { fontFamily: font.sansSemibold, color: palette.accent },
});
