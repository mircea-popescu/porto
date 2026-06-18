import { toISODate } from '@/lib/goals';

export type DateFieldProps = {
  value: Date;
  onChange: (d: Date) => void;
  maximumDate?: Date;
};

/** Web: input nativ de dată (calendar din browser). */
export function DateField({ value, onChange, maximumDate }: DateFieldProps) {
  return (
    <input
      type="date"
      value={toISODate(value)}
      max={maximumDate ? toISODate(maximumDate) : undefined}
      onChange={(e) => {
        const v = e.target.value;
        if (v) onChange(new Date(v + 'T00:00:00'));
      }}
      style={{
        padding: 12,
        fontSize: 16,
        borderRadius: 10,
        border: '1px solid #cbd5e1',
        color: '#0f172a',
        backgroundColor: '#fff',
        fontFamily: 'inherit',
      }}
    />
  );
}
