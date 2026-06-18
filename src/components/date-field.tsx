import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { toISODate } from '@/lib/goals';

export type DateFieldProps = {
  value: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
};

/** Nativ: buton care deschide picker-ul de dată. */
export function DateField({ value, onChange, maximumDate }: DateFieldProps) {
  const [show, setShow] = useState(false);

  function handle(_event: DateTimePickerEvent, selected?: Date) {
    setShow(false);
    if (selected) {
      selected.setHours(0, 0, 0, 0);
      onChange(selected);
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.input} onPress={() => setShow(true)}>
        <Text style={styles.text}>{toISODate(value)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker value={value} mode="date" maximumDate={maximumDate} onChange={handle} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  text: { fontSize: 16, color: '#0f172a' },
});
