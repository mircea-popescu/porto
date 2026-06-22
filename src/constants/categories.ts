import { Ionicons } from '@expo/vector-icons';

import { palette } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type CategoryStyle = {
  /**
   * Culoarea solidă care pictează textul: numele secțiunii, procentul, eyebrow.
   * E versiunea „ink” a gradientului (suficient de închisă pentru contrast pe alb).
   */
  color: string;
  /** Gradient (2 stopuri) pentru bara de progres, iconiță și accent-bar. */
  gradient: readonly [string, string];
  /** Fundal pătrat iconiță (~13% opacity din culoare). */
  tint: string;
  icon: IconName;
};

/**
 * Mapare slug categorie → culoare solidă + gradient + tint + iconiță, ținută în
 * frontend (nu în DB, §2.2). Direcția Pulse: fiecare categorie are un gradient viu.
 */
export const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  sanatate: {
    color: '#0E9E7E',
    gradient: ['#16C088', '#0EA5A5'],
    tint: 'rgba(22,192,136,0.13)',
    icon: 'heart',
  },
  educatie: {
    color: '#6C4CF1',
    gradient: ['#7C5CFF', '#A855F7'],
    tint: 'rgba(124,92,255,0.13)',
    icon: 'book',
  },
  sport: {
    color: '#E2543F',
    gradient: ['#FF7A59', '#FF4D6D'],
    tint: 'rgba(255,77,109,0.13)',
    icon: 'barbell',
  },
  finante: {
    color: '#D77A12',
    gradient: ['#F7B733', '#F76B1C'],
    tint: 'rgba(247,107,28,0.13)',
    icon: 'cash',
  },
  altele: {
    color: '#5A6478',
    gradient: ['#7E8BA3', '#4B5670'],
    tint: 'rgba(91,100,120,0.13)',
    icon: 'ellipsis-horizontal',
  },
};

const DEFAULT_STYLE: CategoryStyle = {
  color: palette.accent,
  gradient: [palette.ember3, palette.accent],
  tint: 'rgba(108,76,241,0.13)',
  icon: 'flag',
};

export function categoryStyle(slug: string): CategoryStyle {
  return CATEGORY_STYLE[slug] ?? DEFAULT_STYLE;
}
