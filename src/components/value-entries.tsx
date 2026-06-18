import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DateField } from '@/components/date-field';
import { confirmAction, notify } from '@/lib/dialog';
import {
  addValueEntry,
  deleteValueEntry,
  listValueEntries,
  parseDecimal,
  toISODate,
  todayISO,
  updateValueEntry,
  ValueEntry,
} from '@/lib/goals';

type Props = {
  goalId: string;
  /** Eticheta unității (ex. „km”, „RON”, custom) pentru afișare. */
  unit: string;
  /** Apelat după orice modificare, ca părintele să reîncarce progresul. */
  onChanged: () => void;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Formatează un număr fără zecimale inutile (8.30 → „8.3”, 5.0 → „5”). */
function fmt(n: number): string {
  return String(Number(n));
}

export function ValueEntries({ goalId, unit, onChanged }: Props) {
  const [entries, setEntries] = useState<ValueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Formular (adăugare SAU editare, dacă editingId e setat).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState<Date>(startOfToday());

  const load = useCallback(async () => {
    const data = await listValueEntries(goalId);
    setEntries(data);
  }, [goalId]);

  useEffect(() => {
    load()
      .catch((err) => notify('Eroare', (err as Error).message))
      .finally(() => setLoading(false));
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setValue('');
    setNote('');
    setDate(startOfToday());
  }

  function startEdit(e: ValueEntry) {
    setEditingId(e.id);
    setValue(fmt(e.value));
    setNote(e.note ?? '');
    setDate(new Date(e.entry_date + 'T00:00:00'));
  }

  async function onSubmit() {
    const v = parseDecimal(value);
    if (!Number.isFinite(v)) {
      notify('Verifică datele', 'Valoarea trebuie să fie un număr (poate fi și negativ).');
      return;
    }
    setBusy(true);
    try {
      const input = { value: v, note, entryDate: toISODate(date) };
      if (editingId) {
        await updateValueEntry(editingId, input);
      } else {
        await addValueEntry(goalId, input);
      }
      resetForm();
      await load();
      onChanged();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(e: ValueEntry) {
    const ok = await confirmAction(
      'Șterge intrarea',
      `Ștergi intrarea de ${fmt(e.value)} ${unit} din ${e.entry_date}?`,
      'Șterge',
      true,
    );
    if (!ok) return;
    setBusy(true);
    try {
      if (editingId === e.id) resetForm();
      await deleteValueEntry(e.id);
      await load();
      onChanged();
    } catch (err) {
      notify('Eroare', (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{editingId ? 'Editează intrarea' : 'Adaugă o intrare'}</Text>

        <View style={styles.valueRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={`Valoare (${unit})`}
            placeholderTextColor="#94a3b8"
            value={value}
            onChangeText={setValue}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Notă (opțional)"
          placeholderTextColor="#94a3b8"
          value={note}
          onChangeText={setNote}
          maxLength={200}
        />

        <DateField value={date} maximumDate={startOfToday()} onChange={setDate} />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.disabled, { flex: 1 }]}
            onPress={onSubmit}
            disabled={busy}
          >
            <Text style={styles.primaryText}>{editingId ? 'Salvează' : 'Adaugă'}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity
              style={[styles.cancelBtn, busy && styles.disabled]}
              onPress={resetForm}
              disabled={busy}
            >
              <Text style={styles.cancelText}>Renunță</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.cardTitle}>Istoric intrări</Text>
        {loading ? (
          <ActivityIndicator />
        ) : entries.length === 0 ? (
          <Text style={styles.muted}>Nicio intrare încă. Adaugă prima mai sus.</Text>
        ) : (
          entries.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryValue}>
                  {e.value > 0 ? '+' : ''}
                  {fmt(e.value)} {unit}
                </Text>
                <Text style={styles.entryMeta}>
                  {e.entry_date}
                  {e.note ? ` · ${e.note}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => startEdit(e)} disabled={busy} hitSlop={8}>
                <Text style={styles.editText}>Editează</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(e)} disabled={busy} hitSlop={8}>
                <Text style={styles.deleteText}>Șterge</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  muted: { fontSize: 14, color: '#64748b', lineHeight: 20 },
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
  valueRow: { flexDirection: 'row', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  cancelText: { color: '#475569', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  entryValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  entryMeta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  editText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  deleteText: { color: '#ef4444', fontSize: 14, fontWeight: '600' },
});
