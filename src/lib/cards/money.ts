/** Formats cents as dollars: 1500 → "$15", 1250 → "$12.50". */
export function formatCents(cents: number, opts: { alwaysCents?: boolean } = {}) {
  const dollars = cents / 100;
  const whole = Number.isInteger(dollars) && !opts.alwaysCents;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

/** Whole-dollar formatting for fees and totals: 89500 → "$895". */
export function formatDollars(dollars: number) {
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** "12.50" / "$12.50" / "12" → 1250; empty or junk → null. */
export function parseDollarsToCents(raw: unknown): number | null {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Inverse of parseDollarsToCents for form default values: 1250 → "12.50". */
export function centsToInput(cents: number | null | undefined) {
  if (cents == null) return "";
  return Number.isInteger(cents / 100) ? String(cents / 100) : (cents / 100).toFixed(2);
}
