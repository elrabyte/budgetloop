/**
 * Recurrence math shared by the dashboard aggregation and the upcoming-items list.
 *
 * BudgetLoop supports fully custom recurrence (every N days/weeks/months/years) instead of the
 * spreadsheet's Monthly/Yearly-only model. To aggregate amounts with different cadences into a
 * single comparable number, every interval is normalized to an average number of days per
 * occurrence, then converted to a monthly-equivalent amount:
 *
 *   daysPerOccurrence = intervalValue * daysPerUnit(intervalUnit)
 *   monthlyAmount     = amount * (AVG_DAYS_PER_MONTH / daysPerOccurrence)
 *   yearlyAmount      = monthlyAmount * 12
 *
 * AVG_DAYS_PER_MONTH (30.436875) and AVG_DAYS_PER_YEAR (365.2425) are the average Gregorian
 * calendar month/year lengths, matching what a spreadsheet would use for this kind of
 * normalization.
 */

export const INTERVAL_UNITS = ["Day", "Week", "Month", "Year"] as const;
export type IntervalUnit = (typeof INTERVAL_UNITS)[number];

export function isIntervalUnit(value: unknown): value is IntervalUnit {
  return typeof value === "string" && (INTERVAL_UNITS as readonly string[]).includes(value);
}

export const AVG_DAYS_PER_MONTH = 30.436875;
export const AVG_DAYS_PER_YEAR = 365.2425;

const DAYS_PER_UNIT: Record<IntervalUnit, number> = {
  Day: 1,
  Week: 7,
  Month: AVG_DAYS_PER_MONTH,
  Year: AVG_DAYS_PER_YEAR,
};

export interface Recurrence {
  amount: number;
  intervalUnit: IntervalUnit;
  intervalValue: number;
}

/** Average number of days between occurrences of this recurrence. */
export function daysPerOccurrence({ intervalUnit, intervalValue }: Recurrence): number {
  return intervalValue * DAYS_PER_UNIT[intervalUnit];
}

/** Normalizes any recurrence to a monthly-equivalent amount. */
export function toMonthlyAmount(recurrence: Recurrence): number {
  const days = daysPerOccurrence(recurrence);
  if (days <= 0) return 0;
  return recurrence.amount * (AVG_DAYS_PER_MONTH / days);
}

/** Normalizes any recurrence to a yearly-equivalent amount. */
export function toYearlyAmount(recurrence: Recurrence): number {
  return toMonthlyAmount(recurrence) * 12;
}

/**
 * Computes the next due date for a recurring item.
 *
 * - If an explicit `nextDueDate` is set, it is used as-is (the user or a future "mark as paid"
 *   action can override the derived schedule).
 * - Otherwise, it is derived by repeatedly adding the interval to `startDate` until the result is
 *   in the future (relative to `now`). This keeps items that started long ago showing a sensible
 *   upcoming date instead of one far in the past.
 * - If neither `nextDueDate` nor `startDate` is set, returns null (unscheduled).
 */
export function computeNextDueDate(
  input: {
    startDate: Date | null;
    nextDueDate: Date | null;
    intervalUnit: IntervalUnit;
    intervalValue: number;
  },
  now: Date = new Date(),
): Date | null {
  if (input.nextDueDate) return input.nextDueDate;
  if (!input.startDate) return null;

  const next = new Date(input.startDate.getTime());
  // Cap iterations defensively so a bad/zero interval can't loop forever.
  const maxIterations = 10_000;
  let iterations = 0;
  while (next.getTime() < now.getTime() && iterations < maxIterations) {
    advanceByInterval(next, input.intervalUnit, input.intervalValue);
    iterations += 1;
  }
  return next;
}

function advanceByInterval(date: Date, unit: IntervalUnit, value: number): void {
  const safeValue = value > 0 ? value : 1;
  switch (unit) {
    case "Day":
      date.setDate(date.getDate() + safeValue);
      break;
    case "Week":
      date.setDate(date.getDate() + safeValue * 7);
      break;
    case "Month":
      date.setMonth(date.getMonth() + safeValue);
      break;
    case "Year":
      date.setFullYear(date.getFullYear() + safeValue);
      break;
  }
}
