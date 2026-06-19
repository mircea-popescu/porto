import { Ionicons } from '@expo/vector-icons';

import { palette } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type CategoryStyle = {
  /** Culoarea care pictează iconița, numele secțiunii, procentul și bara. */
  color: string;
  /** Fundal pătrat iconiță (~13% opacity din culoare). */
  tint: string;
  icon: IconName;
};

/**
 * Mapare slug categorie → culoare + tint + iconiță, ținută în frontend (nu în DB, §2.2).
 * Slug-urile vin din seed-ul tabelului categories. Paletă dezsaturată, curatoriată.
 */
export const CATEGORY_STYLE: Record<string, CategoryStyle> = {
  sanatate: { color: '#3F8A6E', tint: 'rgba(63,138,110,0.13)', icon: 'heart' },
  educatie: { color: '#5C5BC4', tint: 'rgba(92,91,196,0.13)', icon: 'book' },
  sport: { color: '#C76B3F', tint: 'rgba(199,107,63,0.13)', icon: 'barbell' },
  finante: { color: '#B08428', tint: 'rgba(176,132,40,0.13)', icon: 'cash' },
  altele: { color: '#7C7A72', tint: 'rgba(124,122,114,0.13)', icon: 'ellipsis-horizontal' },
};

const DEFAULT_STYLE: CategoryStyle = {
  color: palette.accent,
  tint: 'rgba(61,78,173,0.13)',
  icon: 'flag',
};

export function categoryStyle(slug: string): CategoryStyle {
  return CATEGORY_STYLE[slug] ?? DEFAULT_STYLE;
}
