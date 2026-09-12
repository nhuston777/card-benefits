import { deleteUsage } from "@/lib/cards/actions";
import { formatCents } from "@/lib/cards/money";
import { formatDay } from "@/lib/cards/periods";

export type UsageRow = {
  id: string;
  benefitName: string;
  amountCents: number;
  usedOn: Date;
  periodKey: string;
  note: string | null;
};

export function UsageHistory({ rows }: { rows: UsageRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--color-ink-soft)]">
        Nothing logged yet. Hit &ldquo;Used&rdquo; on a credit above the next time you spend it.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--color-clay)]/60 rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 shadow-sm">
      {rows.map((u) => (
        <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
          <span className="w-24 shrink-0 text-xs text-[var(--color-ink-soft)]">{formatDay(u.usedOn)}</span>
          <span className="min-w-0 flex-1">
            <span className="text-[var(--color-ink)]">{u.benefitName}</span>
            {u.note && <span className="text-[var(--color-ink-soft)]"> — {u.note}</span>}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-[var(--color-ink)]">
            {formatCents(u.amountCents)}
          </span>
          <form action={deleteUsage.bind(null, u.id)}>
            <button
              type="submit"
              aria-label={`Remove ${formatCents(u.amountCents)} of ${u.benefitName}`}
              className="rounded px-1.5 py-0.5 text-xs text-[var(--color-ink-soft)] hover:bg-rose-50 hover:text-rose-700"
            >
              Undo
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
