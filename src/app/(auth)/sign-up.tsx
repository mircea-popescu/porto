import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

// Trebuie să corespundă constrângerii profiles_username_format din DB.
const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

// Trebuie să corespundă politicii de parolă din supabase/config.toml:
// minimum_password_length = 8 + password_requirements = "lower_upper_letters_digits".
const PASSWORD_MIN = 8;
function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Parola trebuie să aibă minim ${PASSWORD_MIN} caractere.`;
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Parola trebuie să conțină litere mici, litere mari și cifre.';
  }
  return null;
}

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return 'Introdu un email.';
    if (displayName.trim().length < 1) return 'Introdu un nume afișat.';
    if (!USERNAME_RE.test(username.trim().toLowerCase())) {
      return 'Username-ul: 3–30 caractere, doar litere mici, cifre și „_”.';
    }
    const pwProblem = passwordProblem(password);
    if (pwProblem) return pwProblem;
    return null;
  }

  async function onSubmit() {
    const problem = validate();
    if (problem) {
      Alert.alert('Verifică datele', problem);
      return;
    }
    setSubmitting(true);
    try {
      const { needsEmailConfirmation } = await signUp({
        email,
        password,
        username,
        displayName,
      });
      if (needsEmailConfirmation) {
        Alert.alert(
          'Verifică-ți emailul',
          'Ți-am trimis un link de confirmare. Confirmă, apoi autentifică-te.',
          [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }],
        );
      }
      // Dacă nu e nevoie de confirmare, RootNavigator duce direct în (tabs).
    } catch (err) {
      Alert.alert('Înregistrare eșuată', (err as Error).message);
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />

          <BrandLogo size={44} />
          <Text style={styles.title}>Creează cont</Text>

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
            placeholder="Nume afișat (ex. Andrei Popescu)"
            placeholderTextColor={palette.ink4}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextInput
            style={styles.input}
            placeholder="Username (ex. andrei_p)"
            placeholderTextColor={palette.ink4}
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase())}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Parolă (min. 8: litere mari, mici și cifre)"
            placeholderTextColor={palette.ink4}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />

          <Button
            label="Creează cont"
            onPress={onSubmit}
            disabled={submitting}
            loading={submitting}
            style={{ marginTop: 8 }}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ai deja cont? </Text>
            <Link href="/(auth)/sign-in" style={styles.link}>
              Autentifică-te
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
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
  title: {
    fontFamily: font.sansMedium,
    fontSize: 15,
    textAlign: 'center',
    color: palette.ink3,
    marginTop: 6,
    marginBottom: 12,
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
