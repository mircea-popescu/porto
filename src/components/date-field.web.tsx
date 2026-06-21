import { palette, radius } from '@/constants/theme';
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
        padding: 14,
        fontSize: 15,
        borderRadius: radius.input,
        border: `1px solid ${palette.line}`,
        color: palette.ink,
        backgroundColor: palette.surface,
        fontFamily: 'inherit',
      }}
    />
  );
}
