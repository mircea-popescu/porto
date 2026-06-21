/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/* -------------------------------------------------------------------------- */
/* Design system "Calm & Premium" (light-first, v1).                          */
/* Toate ecranele consumă acești tokeni — fără hexuri hardcodate per screen.  */
/* -------------------------------------------------------------------------- */

export const palette = {
  // Suprafețe
  bg: '#FBFAF8',
  surface: '#FFFFFF',
  surface2: '#F4F2EE',
  line: '#ECE9E3',
  // Ink (text)
  ink: '#1A1A18',
  ink2: '#56544E',
  ink3: '#8B887F',
  ink4: '#B5B2A8',
  // Accent (indigo profund)
  accent: '#3D4EAD',
  accentSoft: '#EAECF7',
  accentInk: '#2C3A8A',
  // Semantice
  ok: '#2F7A56',
  okSoft: '#E5F0EA',
  danger: '#B4453A',
} as const;

export const radius = {
  card: 18,
  btn: 14,
  input: 12,
  pill: 999,
} as const;

/** Umbre subtile — înlocuiesc border-urile de separare. iOS shadow* + Android elevation. */
export const shadow = {
  sm: {
    shadowColor: '#1A1A18',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#1A1A18',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1A18',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 40,
    elevation: 8,
  },
  /** Tentă de accent, pentru butonul primary. */
  accentBtn: {
    shadowColor: '#3D4EAD',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 4,
  },
} as const;

/** Familiile încărcate prin @expo-google-fonts/* (vezi _layout.tsx). */
export const font = {
  serif: 'Fraunces_600SemiBold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
} as const;

export const space = {
  screen: 18,
  screenLg: 24,
  gap: 12,
} as const;
