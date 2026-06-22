import { LinearGradient } from 'expo-linear-gradient';
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

import { font, gradientDir, gradients, palette, radius, shadow } from '@/constants/theme';

/* -------------------------------------------------------------------------- */
/* Primitive partajate, consumate de toate ecranele (design "Porto Pulse").   */
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

/** Card plutitor: surface + shadowSm + hairline. */
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
  const isGradient = variant === 'primary' || variant === 'success';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        !isText && styles.btnBase,
        variant === 'primary' && styles.btnPrimary,
        variant === 'success' && styles.btnSuccess,
        variant === 'ghost' && styles.btnGhost,
        variant === 'dangerOutline' && styles.btnDangerOutline,
        (disabled || loading) && styles.btnDisabled,
        pressed && !isText && styles.btnPressed,
        pressed && isText && { opacity: 0.6 },
        style,
      ]}
    >
      {isGradient && (
        <LinearGradient
          colors={
            (variant === 'success' ? gradients.success : gradients.ember) as unknown as [
              string,
              string,
            ]
          }
          locations={variant === 'success' ? undefined : gradients.emberLocations}
          start={gradientDir.start}
          end={gradientDir.end}
          style={[StyleSheet.absoluteFill, styles.btnGradient]}
        />
      )}
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

/** Cerc cu inițială pe Fraunces, încadrat de un inel gradient „ember”. */
export function Avatar({ name, size = 42 }: { name?: string | null; size?: number }) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const pad = Math.max(2, Math.round(size * 0.07));
  return (
    <LinearGradient
      colors={gradients.ember as unknown as [string, string]}
      locations={gradients.emberLocations}
      start={gradientDir.start}
      end={gradientDir.end}
      style={[
        styles.avatarRing,
        { width: size, height: size, borderRadius: size / 2, padding: pad },
      ]}
    >
      <View style={[styles.avatarInner, { borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: Math.round(size * 0.4) }]}>{initial}</Text>
      </View>
    </LinearGradient>
  );
}

/** Pilă de streak: flacără + număr, pe fundal cald. Semnătura „obicei viu”. */
export function Flame({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.flame, style]}>
      <Text style={styles.flameText}>🔥 {label}</Text>
    </View>
  );
}

/** Mică pilă de milestone / status (ex. „✓ Ziua 40”, „🎯 100”). */
export function Tag({
  children,
  bg = palette.surface2,
  color = palette.ink2,
  style,
}: {
  children: ReactNode;
  bg?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text style={[styles.tagText, { color }]}>{children}</Text>
    </View>
  );
}

/** Cartonaș de statistică (profil): cifră mare colorată + etichetă. */
export function StatTile({
  value,
  label,
  color = palette.accent,
}: {
  value: ReactNode;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    overflow: 'visible',
  },
  btnGradient: { borderRadius: radius.btn },
  btnPrimary: { ...shadow.accentBtn },
  btnSuccess: { ...shadow.successBtn },
  btnGhost: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.line,
    ...shadow.sm,
  },
  btnDangerOutline: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.dangerLine,
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
    color: palette.ink3,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.ember2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarInner: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: font.serif, color: palette.accentInk },
  flame: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.flameSoft2,
  },
  flameText: { fontFamily: font.sansSemibold, fontSize: 11.5, color: palette.flameInk },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  tagText: { fontFamily: font.sansSemibold, fontSize: 12.5 },
  statTile: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.line,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadow.sm,
  },
  statValue: { fontFamily: font.serif, fontSize: 24 },
  statLabel: { fontFamily: font.sansMedium, fontSize: 12, color: palette.ink3, marginTop: 2 },
});
