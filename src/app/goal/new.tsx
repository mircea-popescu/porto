import { Ionicons } from '@expo/vector-icons';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Button, Eyebrow, ScreenTitle } from '@/components/ui';
import { font, palette, radius, shadow } from '@/constants/theme';
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
  const insets = useSafeAreaInsets();

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
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={palette.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 48 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Eyebrow>Obicei nou</Eyebrow>
          <ScreenTitle>Goal nou</ScreenTitle>
        </View>

        <Field label="Titlu">
          <TextInput
            style={styles.input}
            placeholder="ex. 100 de zile fără fumat"
            placeholderTextColor={palette.ink4}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        <Field label="Categorie">
          <View style={styles.chipRow}>
            {categories.map((c) => (
              <Chip key={c.id} active={categoryId === c.id} onPress={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </View>
        </Field>

        <Field label="Tip">
          <View style={styles.segment}>
            <SegmentButton active={type === 'daily'} onPress={() => setType('daily')}>
              Zilnic (confirmare)
            </SegmentButton>
            <SegmentButton active={type === 'value'} onPress={() => setType('value')}>
              Valoare
            </SegmentButton>
          </View>
        </Field>

        {type === 'daily' ? (
          <Field label="Câte zile (orizont)">
            <TextInput
              style={styles.input}
              placeholder="ex. 100"
              placeholderTextColor={palette.ink4}
              value={targetDays}
              onChangeText={setTargetDays}
              keyboardType="number-pad"
            />
          </Field>
        ) : (
          <>
            <Field label="Valoare țintă">
              <TextInput
                style={styles.input}
                placeholder="ex. 1000"
                placeholderTextColor={palette.ink4}
                value={targetValue}
                onChangeText={setTargetValue}
                keyboardType="decimal-pad"
              />
            </Field>

            <Field label="Unitate">
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
            </Field>
            {unitChoice === 'custom' && (
              <TextInput
                style={styles.input}
                placeholder="ex. ședințe"
                placeholderTextColor={palette.ink4}
                value={unitCustom}
                onChangeText={setUnitCustom}
                autoCapitalize="none"
              />
            )}
          </>
        )}

        <Field label="Data de start">
          <DateField value={startedAt} maximumDate={startOfToday()} onChange={setStartedAt} />
        </Field>

        {type === 'daily' && isBackdated && (
          <SwitchRow
            label="M-am ținut de la start până azi"
            hint="Marchează zilele din interval ca ținute."
            value={backfill}
            onValueChange={setBackfill}
          />
        )}

        <SwitchRow
          label="Public"
          hint="Vizibil prietenilor care te urmăresc."
          value={isPublic}
          onValueChange={setIsPublic}
        />

        <Button
          label="Creează goalul"
          onPress={onSubmit}
          disabled={submitting}
          loading={submitting}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
    </View>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function SwitchRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchHint}>{hint}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.surface2, true: palette.accent }}
        thumbColor="#fff"
        ios_backgroundColor={palette.surface2}
      />
    </View>
  );
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
  screen: { flex: 1, backgroundColor: palette.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  closeBtn: { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  container: { paddingHorizontal: 18, paddingTop: 4, gap: 14 },
  header: { gap: 4, marginBottom: 4 },
  field: { gap: 7 },
  label: {
    fontFamily: font.sansSemibold,
    fontSize: 12,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    color: palette.ink3,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.surface,
  },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { fontFamily: font.sansMedium, fontSize: 13, color: palette.ink2 },
  chipTextActive: { color: '#fff' },
  segment: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: radius.btn,
    backgroundColor: palette.surface2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.btn - 4,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: palette.surface, ...shadow.sm },
  segmentText: { fontFamily: font.sansSemibold, fontSize: 13, color: palette.ink2 },
  segmentTextActive: { color: palette.accent },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  switchLabel: { fontFamily: font.sansSemibold, fontSize: 14, color: palette.ink },
  switchHint: { fontFamily: font.sansMedium, fontSize: 12, color: palette.ink3, marginTop: 2 },
});
