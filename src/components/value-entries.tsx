import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DateField } from '@/components/date-field';
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

export function ValueEntries({
  goalId,
  unit = '',
  onChanged,
}: {
  goalId: string;
  unit?: string;
  onChanged: () => void;
}) {
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
      `Ștergi intrarea de ${formatNum(e.value)}${unit ? ` ${unit}` : ''} din ${e.entry_date}?`,
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
    return <ActivityIndicator style={{ marginTop: 16 }} />;
  }

  return (
    <View style={{ gap: 12 }}>
      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{editingId ? 'Editează intrarea' : 'Intrare nouă'}</Text>
          <TextInput
            style={styles.input}
            placeholder={unit ? `Valoare în ${unit} (ex. 8.3 sau -2)` : 'Valoare (ex. 8.3 sau -2)'}
            placeholderTextColor="#94a3b8"
            value={value}
            onChangeText={setValue}
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
          />
          <DateField value={date} maximumDate={startOfToday()} onChange={setDate} />
          <TextInput
            style={styles.input}
            placeholder="Notă (opțional)"
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost, { flex: 1 }]}
              onPress={() => setShowForm(false)}
              disabled={busy}
            >
              <Text style={styles.btnGhostText}>Anulează</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { flex: 1 }, busy && styles.disabled]}
              onPress={save}
              disabled={busy}
            >
              <Text style={styles.btnPrimaryText}>{editingId ? 'Salvează' : 'Adaugă'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={openAdd}>
          <Text style={styles.btnPrimaryText}>+ Adaugă intrare</Text>
        </TouchableOpacity>
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
                {unit ? ` ${unit}` : ''}
              </Text>
              <Text style={styles.entryMeta}>
                {e.entry_date}
                {e.note ? ` · ${e.note}` : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openEdit(e)} disabled={busy} style={styles.entryAction}>
              <Text style={styles.editText}>Editează</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(e)} disabled={busy} style={styles.entryAction}>
              <Text style={styles.deleteText}>Șterge</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', gap: 10 },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnGhost: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  btnGhostText: { color: '#334155', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  entryValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  entryMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  entryAction: { paddingHorizontal: 6, paddingVertical: 4 },
  editText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  deleteText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
