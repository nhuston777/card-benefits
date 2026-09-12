import { formatCents } from "@/lib/cards/money";
import type { Totals } from "@/lib/cards/summary";

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-rose-700"
        : "text-[var(--color-ink)]";
  return (
    <div className="rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 px-4 py-3.5 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
        {label}
      </p>
      <p className={`mt-1 font-heading text-2xl leading-none ${valueColor}`}>{value}</p>
      {hint && <p className="mt-1.5 text-xs text-[var(--color-ink-soft)]">{hint}</p>}
    </div>
  );
}

export function StatTiles({ totals }: { totals: Totals }) {
  const coverage =
    totals.annualFeeCents > 0
      ? Math.round((totals.realizedYtdCents / totals.annualFeeCents) * 100)
      : null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile
        label="Annual fees"
        value={formatCents(totals.annualFeeCents)}
        hint={
          totals.waivedFeeCents > 0
            ? `${formatCents(totals.waivedFeeCents)} / yr waived for now`
            : `across ${totals.cardCount} card${totals.cardCount === 1 ? "" : "s"}`
        }
      />
      <Tile
        label="Credits on offer"
        value={formatCents(totals.annualValueCents)}
        hint="face value per year"
      />
      <Tile
        label="Used this year"
        value={formatCents(totals.realizedYtdCents)}
        hint={
          coverage != null
            ? `${coverage}% of this year's fees`
            : totals.waivedFeeCents > 0
              ? "fees are waived — pure upside"
              : "no fees to cover"
        }
        tone={coverage != null && coverage >= 100 ? "good" : "neutral"}
      />
      <Tile
        label="Waiting to be used"
        value={formatCents(totals.outstandingCents)}
        hint={
          totals.expiringCount > 0
            ? `${totals.expiringCount} expiring soon`
            : "nothing about to expire"
        }
        tone={totals.expiringCount > 0 ? "warn" : "neutral"}
      />
    </div>
  );
}
