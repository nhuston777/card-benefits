import Link from "next/link";
import { formatCents } from "@/lib/cards/money";
import { formatDayShort } from "@/lib/cards/periods";
import type { CardSummary } from "@/lib/cards/summary";
import { CardArt } from "./CardArt";

export function CardTile({ summary, now }: { summary: CardSummary; now: Date }) {
  const { card } = summary;
  // Measure against the list fee even while waived: that's what the card
  // will cost once the waiver ends, and the question is whether it's worth it.
  const feeCovered = summary.listFeeCents === 0 || summary.realizedTrailingYearCents >= summary.listFeeCents;
  const pct =
    summary.listFeeCents > 0
      ? Math.min(100, Math.round((summary.realizedTrailingYearCents / summary.listFeeCents) * 100))
      : 100;

  return (
    <Link
      href={`/cards/${card.id}`}
      className="group flex gap-4 rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <CardArt card={card} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-heading text-lg text-[var(--color-ink)]">{card.name}</h3>
            <p className="text-xs text-[var(--color-ink-soft)]">
              {card.issuer ?? "—"} ·{" "}
              {card.annualFee > 0
                ? `${formatCents(summary.listFeeCents)} / yr${summary.feeWaived ? " · waived" : ""}`
                : "No annual fee"}
            </p>
          </div>
          {summary.expiringCount > 0 && (
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800">
              {summary.expiringCount} expiring
            </span>
          )}
        </div>

        {summary.listFeeCents > 0 ? (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-[var(--color-ink-soft)]">
              <span>
                <span className={feeCovered ? "font-semibold text-emerald-700" : "font-semibold text-[var(--color-ink)]"}>
                  {formatCents(summary.realizedTrailingYearCents)}
                </span>{" "}
                used, past 12 mo
              </span>
              <span>{pct}% of {summary.feeWaived ? "future fee" : "fee"}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-cream-dim)]">
              <div
                className={`h-full rounded-full ${feeCovered ? "bg-emerald-500" : "bg-[var(--color-terracotta)]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
            {formatCents(summary.realizedYtdCents)} in benefits used this year
          </p>
        )}

        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-soft)]">
          <span>{formatCents(summary.outstandingCents)} waiting</span>
          <span>{formatCents(summary.annualValueCents)} / yr in credits</span>
          {summary.renewal && (
            <span className={summary.renewal.daysUntil <= 60 ? "font-medium text-amber-700" : ""}>
              renews {formatDayShort(summary.renewal.date, now)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
