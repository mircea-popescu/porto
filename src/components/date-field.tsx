import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { font, palette, radius, shadow } from '@/constants/theme';
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
      <Pressable
        style={({ pressed }) => [styles.input, pressed && { opacity: 0.7 }]}
        onPress={() => setShow(true)}
      >
        <Text style={styles.text}>{toISODate(value)}</Text>
      </Pressable>
      {show && (
        <DateTimePicker value={value} mode="date" maximumDate={maximumDate} onChange={handle} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radius.input,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: palette.surface,
    ...shadow.sm,
  },
  text: { fontFamily: font.sans, fontSize: 15, color: palette.ink },
});
