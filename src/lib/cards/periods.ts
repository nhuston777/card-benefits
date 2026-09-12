import type { BenefitFrequency } from "./constants";
import { EXPIRING_SOON_DAYS } from "./constants";

/**
 * The reset window a benefit is currently inside. Every date here is a
 * calendar day at midnight; `end` is inclusive (the last day the credit can
 * still be used).
 */
export type Period = {
  key: string;
  label: string;
  start: Date;
  /** Inclusive last day. Null when the benefit never resets. */
  end: Date | null;
  daysLeft: number | null;
};

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function lastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function daysBetweenInclusive(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDay(d: Date) {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatDayShort(d: Date, now = new Date()) {
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear ? `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}` : formatDay(d);
}

/**
 * Card anniversaries live in `openedOn`, stored at UTC midnight of the chosen
 * calendar day. Read the day back with UTC getters so the timezone of the
 * server can't slide it to the day before.
 */
export function anniversaryParts(openedOn: Date) {
  return { month: openedOn.getUTCMonth(), day: openedOn.getUTCDate(), year: openedOn.getUTCFullYear() };
}

/** The most recent anniversary on or before `now` (falls back to the opening day itself). */
export function lastAnniversary(openedOn: Date, now: Date) {
  const { month, day, year } = anniversaryParts(openedOn);
  const today = startOfDay(now);
  let candidate = new Date(today.getFullYear(), month, day);
  if (candidate > today) candidate = new Date(today.getFullYear() - 1, month, day);
  const opened = new Date(year, month, day);
  return candidate < opened ? opened : candidate;
}

/** The next anniversary strictly after today. */
export function nextAnniversary(openedOn: Date, now: Date) {
  const { month, day } = anniversaryParts(openedOn);
  const today = startOfDay(now);
  const candidate = new Date(today.getFullYear(), month, day);
  return candidate > today ? candidate : new Date(today.getFullYear() + 1, month, day);
}

export function currentPeriod(
  frequency: BenefitFrequency,
  openedOn: Date | null | undefined,
  now = new Date()
): Period {
  const today = startOfDay(now);
  const y = today.getFullYear();
  const m = today.getMonth();

  const finish = (key: string, label: string, start: Date, end: Date | null): Period => ({
    key,
    label,
    start,
    end,
    daysLeft: end ? daysBetweenInclusive(today, end) : null,
  });

  switch (frequency) {
    case "MONTHLY": {
      const start = new Date(y, m, 1);
      const end = lastDayOfMonth(y, m);
      return finish(`${y}-${String(m + 1).padStart(2, "0")}`, `${MONTH_SHORT[m]} ${y}`, start, end);
    }
    case "QUARTERLY": {
      const q = Math.floor(m / 3);
      const start = new Date(y, q * 3, 1);
      const end = lastDayOfMonth(y, q * 3 + 2);
      return finish(
        `${y}-Q${q + 1}`,
        `${MONTH_SHORT[q * 3]}–${MONTH_SHORT[q * 3 + 2]} ${y}`,
        start,
        end
      );
    }
    case "SEMIANNUAL": {
      const h = m < 6 ? 0 : 1;
      const start = new Date(y, h * 6, 1);
      const end = lastDayOfMonth(y, h * 6 + 5);
      return finish(
        `${y}-H${h + 1}`,
        `${MONTH_SHORT[h * 6]}–${MONTH_SHORT[h * 6 + 5]} ${y}`,
        start,
        end
      );
    }
    case "ANNUAL": {
      return finish(String(y), String(y), new Date(y, 0, 1), new Date(y, 11, 31));
    }
    case "CARDMEMBER_YEAR": {
      if (!openedOn) {
        // No anniversary on file: behave like a calendar year so the credit
        // still gets tracked, and the UI nudges the user to add the date.
        return finish(String(y), `${y} (add open date)`, new Date(y, 0, 1), new Date(y, 11, 31));
      }
      const start = lastAnniversary(openedOn, now);
      const next = nextAnniversary(openedOn, now);
      const end = new Date(next.getTime() - DAY_MS);
      return finish(
        `cy-${start.getFullYear()}`,
        `${formatDayShort(start, now)} – ${formatDayShort(end, now)}`,
        start,
        end
      );
    }
    case "ONE_TIME":
      return finish("once", "One time", new Date(1970, 0, 1), null);
    case "ONGOING":
      return finish("ongoing", "Ongoing", new Date(1970, 0, 1), null);
  }
}

/** True when the period ends soon enough that an unused credit needs attention. */
export function isExpiringSoon(frequency: BenefitFrequency, period: Period) {
  const threshold = EXPIRING_SOON_DAYS[frequency];
  return threshold > 0 && period.daysLeft != null && period.daysLeft <= threshold;
}

/** Days until the card's next anniversary (when the fee posts), or null. */
export function daysUntilRenewal(openedOn: Date | null | undefined, now = new Date()) {
  if (!openedOn) return null;
  return daysBetweenInclusive(now, nextAnniversary(openedOn, now)) - 1;
}

/** "2026-03-15" → Date at UTC midnight (how openedOn is stored). */
export function parseDateOnly(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date at UTC midnight → "2026-03-15" for a date input. */
export function toDateOnlyInput(date: Date | null | undefined) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

/** Formats a stored openedOn without timezone drift. */
export function formatDateOnly(date: Date) {
  const { month, day, year } = anniversaryParts(date);
  return `${MONTH_SHORT[month]} ${day}, ${year}`;
}
