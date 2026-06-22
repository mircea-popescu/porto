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
/* Design system "Porto Pulse" (light-first, v2).                             */
/* Baza caldă premium rămâne; peste ea — un gradient-semnătură „ember”, accent */
/* violet și progres luminos. Toate ecranele consumă acești tokeni.           */
/* -------------------------------------------------------------------------- */

export const palette = {
  // Suprafețe (hârtie caldă)
  bg: '#FBF8F4',
  surface: '#FFFFFF',
  surface2: '#F5F1EA',
  line: '#ECE5D9',
  // Ink (text)
  ink: '#1B1622',
  ink2: '#675F73',
  ink3: '#9A92A6',
  ink4: '#C3BCCB',
  // Accent (violet viu) — înlocuiește indigo-ul stins
  accent: '#6C4CF1',
  accentSoft: '#EDE8FF',
  accentInk: '#4A2FD0',
  // Stopuri gradient „ember” (coral → roz → violet)
  ember1: '#FF7A59',
  ember2: '#FF4D6D',
  ember3: '#7C5CFF',
  // Streak / flacără
  flameInk: '#E0492F',
  flameSoft1: '#FFF1E6',
  flameSoft2: '#FFE5EC',
  // Semantice
  ok: '#10B981',
  okSoft: '#DCFAEC',
  danger: '#EF4444',
  dangerSoft: '#FDE7E7',
  dangerLine: '#F3C9C9',
} as const;

/**
 * Gradiente ca tupluri de culori pentru `expo-linear-gradient`.
 * `ember` e semnătura (CTA primary, hero, avatar ring); fiecare categorie are
 * propriul gradient (mapat în constants/categories.ts).
 */
export const gradients = {
  ember: ['#FF7A59', '#FF4D6D', '#7C5CFF'] as const,
  emberLocations: [0, 0.52, 1] as const,
  emberSoft: ['#FFE7DE', '#FFE0E8', '#EAE4FF'] as const,
  success: ['#15C58C', '#10B981'] as const,
  flame: ['#FFF1E6', '#FFE5EC'] as const,
} as const;

/** Direcția standard a gradientelor (diagonală caldă). */
export const gradientDir = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
} as const;

export const radius = {
  card: 20,
  btn: 16,
  input: 14,
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
  /** Glow ember sub butonul primary / elementele semnătură. */
  accentBtn: {
    shadowColor: '#FF4D6D',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 6,
  },
  /** Glow verde sub butonul de succes (confirmare). */
  successBtn: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 6,
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
