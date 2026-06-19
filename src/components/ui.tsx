import { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { font, palette, radius, shadow } from '@/constants/theme';

/* -------------------------------------------------------------------------- */
/* Primitive partajate, consumate de toate ecranele (design "Calm & Premium").*/
/* -------------------------------------------------------------------------- */

/** Mic label uppercase muted, deasupra titlurilor de ecran. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

/** Titlu de ecran pe Fraunces. */
export function ScreenTitle({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.screenTitle, style]}>{children}</Text>;
}

/** Eyebrow + titlu, pattern editorial standard. */
export function ScreenHeader({
  eyebrow,
  title,
  style,
}: {
  eyebrow?: string;
  title: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.header, style]}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <ScreenTitle>{title}</ScreenTitle>
    </View>
  );
}

/** Card plutitor: surface + shadowSm + hairline opțional. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'success'
  | 'dangerOutline'
  | 'dangerText'
  | 'linkDiscreet';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isText = variant === 'dangerText' || variant === 'linkDiscreet';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        !isText && styles.btnBase,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'success' && styles.btnSuccess,
        variant === 'dangerOutline' && styles.btnDangerOutline,
        (disabled || loading) && styles.btnDisabled,
        pressed && !isText && styles.btnPressed,
        pressed && isText && { opacity: 0.6 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? palette.accent : '#fff'} />
      ) : (
        <Text
          style={[
            variant === 'primary' && styles.txtOnAccent,
            variant === 'success' && styles.txtOnAccent,
            variant === 'ghost' && styles.txtGhost,
            variant === 'dangerOutline' && styles.txtDanger,
            variant === 'dangerText' && styles.txtDangerCentered,
            variant === 'linkDiscreet' && styles.txtLinkDiscreet,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/** Cerc cu inițială pe Fraunces. */
export function Avatar({ name, size = 42 }: { name?: string | null; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.42) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: font.sansSemibold,
    fontSize: 11,
    letterSpacing: 0.88,
    textTransform: 'uppercase',
    color: palette.ink3,
  },
  screenTitle: {
    fontFamily: font.serif,
    fontSize: 26,
    color: palette.ink,
  },
  header: { gap: 4 },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    padding: 18,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow.sm,
  },
  btnBase: {
    borderRadius: radius.btn,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: palette.accent,
    ...shadow.accentBtn,
  },
  btnSuccess: { backgroundColor: palette.ok },
  btnGhost: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow.sm,
  },
  btnDangerOutline: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.danger,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { transform: [{ scale: 0.985 }] },
  txtOnAccent: { color: '#fff', fontFamily: font.sansSemibold, fontSize: 15 },
  txtGhost: { color: palette.ink, fontFamily: font.sansSemibold, fontSize: 15 },
  txtDanger: { color: palette.danger, fontFamily: font.sansSemibold, fontSize: 15 },
  txtDangerCentered: {
    color: palette.danger,
    fontFamily: font.sansSemibold,
    fontSize: 15,
    textAlign: 'center',
  },
  txtLinkDiscreet: {
    color: palette.ink4,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  avatar: {
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.serif, color: palette.accentInk },
});
