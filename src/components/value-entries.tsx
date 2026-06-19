import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { Button } from '@/components/ui';
import { font, palette, radius, shadow } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/dialog';
import { addEntry, deleteEntry, listEntries, toISODate, updateEntry, ValueEntry } from '@/lib/goals';

/** Acceptă „8.3” și „8,3”, plus valori negative. */
function parseDecimal(s: string): number {
  return Number(s.trim().replace(',', '.'));
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

export function ValueEntries({ goalId, onChanged }: { goalId: string; onChanged: () => void }) {
  const [entries, setEntries] = useState<ValueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date>(startOfToday());

  const load = useCallback(async () => {
    const e = await listEntries(goalId);
    setEntries(e);
  }, [goalId]);

  useEffect(() => {
    load()
      .catch((err) => notify('Eroare', err.message))
      .finally(() => setLoading(false));
  }, [load]);

  function openAdd() {
    setEditingId(null);
    setValue('');
    setNote('');
    setDate(startOfToday());
    setShowForm(true);
  }

  function openEdit(e: ValueEntry) {
    setEditingId(e.id);
    setValue(String(e.value));
    setNote(e.note ?? '');
    setDate(new Date(e.entry_date + 'T00:00:00'));
    setShowForm(true);
  }

  async function save() {
    const v = parseDecimal(value);
    if (!Number.isFinite(v)) {
      notify('Valoare invalidă', 'Scrie un număr (poate fi și negativ pentru corecții).');
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await updateEntry(editingId, { value: v, entryDate: toISODate(date), note: note || null });
      } else {
        await addEntry(goalId, v, toISODate(date), note || null);
      }
      setShowForm(false);
      await load();
      onChanged();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: ValueEntry) {
    const ok = await confirmAction(
      'Șterge intrarea',
      `Ștergi intrarea de ${formatNum(e.value)} din ${e.entry_date}?`,
      'Șterge',
      true,
    );
    if (!ok) return;
    setBusy(true);
    try {
      await deleteEntry(e.id);
      await load();
      onChanged();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 16 }} color={palette.accent} />;
  }

  return (
    <View style={{ gap: 12 }}>
      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editingId ? 'Editează intrarea' : 'Intrare nouă'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Valoare (ex. 8.3 sau -2)"
            placeholderTextColor={palette.ink4}
            value={value}
            onChangeText={setValue}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <DateField value={date} maximumDate={startOfToday()} onChange={setDate} />
          <TextInput
            style={styles.input}
            placeholder="Notă (opțional)"
            placeholderTextColor={palette.ink4}
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.row}>
            <Button
              label="Anulează"
              variant="ghost"
              onPress={() => setShowForm(false)}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <Button
              label={editingId ? 'Salvează' : 'Adaugă'}
              onPress={save}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <Button label="+ Adaugă intrare" onPress={openAdd} />
      )}

      {entries.length === 0 ? (
        <Text style={styles.empty}>Nicio intrare încă.</Text>
      ) : (
        entries.map((e) => (
          <View key={e.id} style={styles.entryRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryValue}>
                {e.value > 0 ? '+' : ''}
                {formatNum(e.value)}
              </Text>
              <Text style={styles.entryMeta}>
                {e.entry_date}
                {e.note ? ` · ${e.note}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => openEdit(e)} disabled={busy} style={styles.entryAction}>
              <Text style={styles.editText}>Editează</Text>
            </Pressable>
            <Pressable onPress={() => remove(e)} disabled={busy} style={styles.entryAction}>
              <Text style={styles.deleteText}>Șterge</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: palette.surface2,
    borderRadius: radius.card,
    padding: 16,
    gap: 10,
  },
  formTitle: { fontFamily: font.sansSemibold, fontSize: 15, color: palette.ink },
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: font.sans,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  row: { flexDirection: 'row', gap: 10 },
  empty: {
    fontFamily: font.sansMedium,
    color: palette.ink3,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  entryValue: { fontFamily: font.sansSemibold, fontSize: 16, color: palette.ink },
  entryMeta: { fontFamily: font.sansMedium, fontSize: 12, color: palette.ink3, marginTop: 2 },
  entryAction: { paddingHorizontal: 6, paddingVertical: 4 },
  editText: { fontFamily: font.sansSemibold, color: palette.accent, fontSize: 13 },
  deleteText: { fontFamily: font.sansSemibold, color: palette.danger, fontSize: 13 },
});
