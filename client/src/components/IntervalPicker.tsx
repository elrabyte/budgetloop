import { INTERVAL_UNITS, type IntervalUnit } from "../types";

interface IntervalPickerProps {
  intervalValue: number;
  intervalUnit: IntervalUnit;
  onChange: (value: number, unit: IntervalUnit) => void;
}

/** "Every N Day/Week/Month/Year" picker - the custom-recurrence upgrade over the spreadsheet's
 * Monthly/Yearly-only Type column plus free-text comment workaround. */
export function IntervalPicker({ intervalValue, intervalUnit, onChange }: IntervalPickerProps) {
  return (
    <div className="interval-picker">
      <span>Every</span>
      <input
        type="number"
        min={1}
        step={1}
        value={intervalValue}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1), intervalUnit)}
      />
      <select value={intervalUnit} onChange={(event) => onChange(intervalValue, event.target.value as IntervalUnit)}>
        {INTERVAL_UNITS.map((unit) => (
          <option key={unit} value={unit}>
            {unit}
            {intervalValue > 1 ? "s" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
