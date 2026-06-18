import { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Mapare slug categorie → culoare + iconiță, ținută în frontend (nu în DB, §2.2).
 * Slug-urile vin din seed-ul tabelului categories.
 */
export const CATEGORY_STYLE: Record<string, { color: string; icon: IconName }> = {
  sanatate: { color: '#16a34a', icon: 'heart' },
  educatie: { color: '#6366f1', icon: 'book' },
  sport: { color: '#f97316', icon: 'barbell' },
  finante: { color: '#d97706', icon: 'cash' },
  altele: { color: '#64748b', icon: 'ellipsis-horizontal' },
};

const DEFAULT_STYLE: { color: string; icon: IconName } = { color: '#2563eb', icon: 'flag' };

export function categoryStyle(slug: string) {
  return CATEGORY_STYLE[slug] ?? DEFAULT_STYLE;
}
