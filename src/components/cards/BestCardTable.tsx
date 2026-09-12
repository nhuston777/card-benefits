import Link from "next/link";
import { SPEND_CATEGORY_LABELS } from "@/lib/cards/constants";
import type { CategoryRanking } from "@/lib/cards/summary";

function fmtRate(multiplier: number) {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(1);
}

/** For every spending category, the card to reach for and the runner-up. */
export function BestCardTable({ rankings }: { rankings: CategoryRanking[] }) {
  if (rankings.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-5 py-6 text-center text-sm text-[var(--color-ink-soft)]">
        Add earning rates to your cards and this fills in with the best card for each kind of spending.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 shadow-sm">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
            <th className="px-4 py-3 font-medium">Spending on</th>
            <th className="px-4 py-3 font-medium">Reach for</th>
            <th className="px-4 py-3 font-medium text-right">Return</th>
            <th className="px-4 py-3 font-medium">Runner-up</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map(({ category, options }) => {
            const [best, second] = options;
            const isPoints = best.card.pointValueCents !== 1;
            return (
              <tr key={category} className="border-t border-[var(--color-clay)]/60">
                <td className="px-4 py-2.5 font-medium text-[var(--color-ink)]">
                  {SPEND_CATEGORY_LABELS[category]}
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/cards/${best.card.id}`} className="hover:text-[var(--color-terracotta-dark)]">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ backgroundColor: best.card.color }}
                    />
                    {best.card.name}
                  </Link>
                  {best.rate.notes && (
                    <span className="block text-xs text-[var(--color-ink-soft)]">{best.rate.notes}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  <span className="font-semibold text-[var(--color-ink)]">
                    {fmtRate(best.rate.multiplier)}
                    {isPoints ? "x" : "%"}
                  </span>
                  {isPoints && (
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      ≈ {best.returnPct.toFixed(1)}% back
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-[var(--color-ink-soft)]">
                  {second
                    ? `${second.card.name} (${fmtRate(second.rate.multiplier)}${second.card.pointValueCents !== 1 ? "x" : "%"})`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
