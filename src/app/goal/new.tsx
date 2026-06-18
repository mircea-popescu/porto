import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DateField } from '@/components/date-field';
import { notify } from '@/lib/dialog';
import {
  Category,
  CreateGoalInput,
  createGoal,
  GoalType,
  listCategories,
  listUnits,
  toISODate,
  Unit,
} from '@/lib/goals';

type UnitChoice = number | 'custom';

export default function NewGoal() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(true);

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [type, setType] = useState<GoalType>('daily');
  const [isPublic, setIsPublic] = useState(false);
  const [startedAt, setStartedAt] = useState<Date>(startOfToday());

  // Tip A
  const [targetDays, setTargetDays] = useState('');
  const [backfill, setBackfill] = useState(false);

  // Tip B
  const [targetValue, setTargetValue] = useState('');
  const [unitChoice, setUnitChoice] = useState<UnitChoice | null>(null);
  const [unitCustom, setUnitCustom] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([listCategories(), listUnits()])
      .then(([cats, us]) => {
        setCategories(cats);
        setUnits(us);
        if (cats.length > 0) setCategoryId(cats[0].id);
        if (us.length > 0) setUnitChoice(us[0].id);
      })
      .catch((err) => notify('Eroare', 'Nu am putut încărca opțiunile: ' + err.message))
      .finally(() => setLoadingRefs(false));
  }, []);

  const isBackdated = useMemo(() => startedAt < startOfToday(), [startedAt]);

  function validate(): string | null {
    if (!title.trim()) return 'Dă-i un titlu goalului.';
    if (categoryId == null) return 'Alege o categorie.';
    if (type === 'daily') {
      const n = Number(targetDays);
      if (!Number.isInteger(n) || n <= 0) return 'Numărul de zile trebuie să fie un întreg pozitiv.';
    } else {
      const v = parseDecimal(targetValue);
      if (!Number.isFinite(v) || v <= 0) return 'Valoarea țintă trebuie să fie un număr pozitiv.';
      if (unitChoice == null) return 'Alege o unitate.';
      if (unitChoice === 'custom' && !unitCustom.trim()) return 'Scrie unitatea custom.';
    }
    return null;
  }

  async function onSubmit() {
    const problem = validate();
    if (problem) {
      notify('Verifică datele', problem);
      return;
    }
    setSubmitting(true);
    try {
      const base: CreateGoalInput = {
        title,
        categoryId: categoryId!,
        type,
        isPublic,
        startedAt: toISODate(startedAt),
      };
      const input: CreateGoalInput =
        type === 'daily'
          ? { ...base, targetDays: Number(targetDays), backfillFromStart: isBackdated && backfill }
          : {
              ...base,
              targetValue: parseDecimal(targetValue),
              unitId: unitChoice === 'custom' ? null : unitChoice,
              unitCustom: unitChoice === 'custom' ? unitCustom : null,
            };
      await createGoal(input);
      router.back();
    } catch (err) {
      notify('Nu am putut crea goalul', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingRefs) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Label>Titlu</Label>
      <TextInput
        style={styles.input}
        placeholder="ex. 100 de zile fără fumat"
        placeholderTextColor="#94a3b8"
        value={title}
        onChangeText={setTitle}
      />

      <Label>Categorie</Label>
      <View style={styles.chipRow}>
        {categories.map((c) => (
          <Chip key={c.id} active={categoryId === c.id} onPress={() => setCategoryId(c.id)}>
            {c.name}
          </Chip>
        ))}
      </View>

      <Label>Tip</Label>
      <View style={styles.segment}>
        <SegmentButton active={type === 'daily'} onPress={() => setType('daily')}>
          Zilnic (confirmare)
        </SegmentButton>
        <SegmentButton active={type === 'value'} onPress={() => setType('value')}>
          Valoare
        </SegmentButton>
      </View>

      {type === 'daily' ? (
        <>
          <Label>Câte zile (orizont)</Label>
          <TextInput
            style={styles.input}
            placeholder="ex. 100"
            placeholderTextColor="#94a3b8"
            value={targetDays}
            onChangeText={setTargetDays}
            keyboardType="number-pad"
          />
        </>
      ) : (
        <>
          <Label>Valoare țintă</Label>
          <TextInput
            style={styles.input}
            placeholder="ex. 1000"
            placeholderTextColor="#94a3b8"
            value={targetValue}
            onChangeText={setTargetValue}
            keyboardType="decimal-pad"
          />

          <Label>Unitate</Label>
          <View style={styles.chipRow}>
            {units.map((u) => (
              <Chip key={u.id} active={unitChoice === u.id} onPress={() => setUnitChoice(u.id)}>
                {u.symbol ?? u.name}
              </Chip>
            ))}
            <Chip active={unitChoice === 'custom'} onPress={() => setUnitChoice('custom')}>
              Custom…
            </Chip>
          </View>
          {unitChoice === 'custom' && (
            <TextInput
              style={styles.input}
              placeholder="ex. ședințe"
              placeholderTextColor="#94a3b8"
              value={unitCustom}
              onChangeText={setUnitCustom}
              autoCapitalize="none"
            />
          )}
        </>
      )}

      <Label>Data de start</Label>
      <DateField value={startedAt} maximumDate={startOfToday()} onChange={setStartedAt} />

      {type === 'daily' && isBackdated && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            M-am ținut de la data de start până azi (marchează zilele ca ținute)
          </Text>
          <Switch value={backfill} onValueChange={setBackfill} />
        </View>
      )}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Public (vizibil prietenilor care te urmăresc)</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>

      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Creează goalul</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/** Acceptă atât „8.3” cât și „8,3” (separatorul zecimal RO). */
function parseDecimal(s: string): number {
  return Number(s.trim().replace(',', '.'));
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Chip({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

function SegmentButton({
  active,
  onPress,
  children,
}: {
  active: boolean;
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable style={[styles.segmentBtn, active && styles.segmentBtnActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  dateText: { fontSize: 16, color: '#0f172a' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#334155', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  segment: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  segmentText: { color: '#334155', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  switchLabel: { flex: 1, color: '#334155', fontSize: 14 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
