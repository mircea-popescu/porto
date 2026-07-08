import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { categoryStyle } from '@/constants/categories';
import { notify } from '@/lib/dialog';
import { Category, GoalWithProgress, listCategories, listGoals } from '@/lib/goals';
import {
  getWidgetGoalIds,
  reloadWidget,
  setWidgetGoalIds,
  syncWidgetData,
} from '@/lib/widget-storage';

export default function WidgetSettings() {
  const router = useRouter();
  // Edge-to-edge: butonul „Salvează" de la finalul listei nu trebuie să intre
  // sub bara de navigare de sistem.
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);

      Promise.all([listGoals(), listCategories(), getWidgetGoalIds()])
        .then(([g, c, ids]) => {
          if (!active) return;
          setGoals(g.filter((x) => !x.is_deleted));
          setCategories(c);
          setSelected(ids.filter((id) => g.some((x) => x.id === id)));
        })
        .catch((err) => notify('Eroare', err.message))
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, []),
  );

  function toggleGoal(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  async function onSave() {
    setSaving(true);
    try {
      await setWidgetGoalIds(selected);
      await syncWidgetData(goals, categories);
      reloadWidget();
      router.back();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={styles.hint}>
        Selectează goalurile care să apară pe widget — ordinea de selecție e ordinea în widget.
        Pe Android poți redimensiona widget-ul ca să le vezi pe toate; widget-ul mic arată
        primele 3.
      </Text>

      {goals.length === 0 ? (
        <Text style={styles.empty}>Nu ai niciun goal activ.</Text>
      ) : (
        goals.map((goal) => {
          const cat = catMap.get(goal.category_id ?? -1);
          const style = categoryStyle(cat?.slug ?? 'altele');
          const isSelected = selected.includes(goal.id!);
          const order = selected.indexOf(goal.id!) + 1;

          return (
            <TouchableOpacity
              key={goal.id}
              style={[styles.row, isSelected && styles.rowSelected]}
              onPress={() => toggleGoal(goal.id!)}
              disabled={saving}
            >
              <View style={[styles.colorDot, { backgroundColor: style.color }]} />
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {goal.title}
                </Text>
                <Text style={styles.rowMeta}>
                  {goal.type === 'daily'
                    ? `${goal.progress ?? 0}/${goal.target_days} zile`
                    : `${goal.progress ?? 0}/${goal.target_value}`}
                  {' · '}
                  {Math.round((goal.progress_ratio ?? 0) * 100)}%
                </Text>
              </View>
              {isSelected && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{order}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.disabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? 'Se salvează…' : 'Salvează'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 4 },
  empty: { fontSize: 15, color: '#64748b', textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  rowMeta: { fontSize: 13, color: '#64748b' },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
