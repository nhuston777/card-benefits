"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  markBenefitUsed,
  recordUsage,
  setBenefitEnrolled,
  type ActionState,
} from "@/lib/cards/actions";
import {
  BENEFIT_CATEGORY_ICONS,
  FREQUENCY_SHORT,
  type BenefitCategory,
  type BenefitFrequency,
} from "@/lib/cards/constants";
import { formatCents } from "@/lib/cards/money";
import type { BenefitState } from "@/lib/cards/summary";

export type BenefitRowProps = {
  benefitId: string;
  name: string;
  category: BenefitCategory;
  frequency: BenefitFrequency;
  valueCents: number | null;
  usedCents: number;
  remainingCents: number;
  state: BenefitState;
  periodLabel: string;
  daysLeft: number | null;
  requiresEnrollment: boolean;
  enrolled: boolean;
  notes: string | null;
  /** Shown as a chip when the row appears outside its own card's page. */
  card?: { id: string; name: string; color: string };
};

const STATE_STYLES: Record<BenefitState, string> = {
  perk: "bg-stone-100 text-stone-600",
  unused: "bg-[var(--color-cream-dim)] text-[var(--color-ink-soft)]",
  partial: "bg-sky-100 text-sky-800",
  used: "bg-emerald-100 text-emerald-800",
  expiring: "bg-rose-100 text-rose-800",
};

const STATE_LABELS: Record<BenefitState, string> = {
  perk: "Perk",
  unused: "Not used yet",
  partial: "Partly used",
  used: "Used",
  expiring: "Expiring",
};

function LogUsageForm({
  benefitId,
  remainingCents,
  onDone,
}: {
  benefitId: string;
  remainingCents: number;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: ActionState = await recordUsage(benefitId, {}, formData);
      if (result.error) setError(result.error);
      else onDone();
    });
  }

  return (
    <form
      action={submit}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-xl bg-white/80 p-2.5 ring-1 ring-[var(--color-clay)]/70"
    >
      <label className="block">
        <span className="block text-[11px] text-[var(--color-ink-soft)]">Amount</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
          <input
            name="amount"
            inputMode="decimal"
            autoFocus
            placeholder={(remainingCents / 100).toFixed(2)}
            className="w-28 rounded-lg border border-[var(--color-clay)] bg-white py-1.5 pl-6 pr-2 text-sm focus:border-[var(--color-terracotta)] focus:outline-none"
          />
        </div>
      </label>
      <label className="block min-w-0 flex-1">
        <span className="block text-[11px] text-[var(--color-ink-soft)]">Note (optional)</span>
        <input
          name="note"
          placeholder="Uber to the airport"
          className="w-full rounded-lg border border-[var(--color-clay)] bg-white px-2.5 py-1.5 text-sm focus:border-[var(--color-terracotta)] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--color-ink)] px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log it"}
      </button>
      {error && <p className="w-full text-xs text-rose-700">{error}</p>}
    </form>
  );
}

export function BenefitTracker({ row }: { row: BenefitRowProps }) {
  const [showLog, setShowLog] = useState(false);
  const [pending, startTransition] = useTransition();

  const isPerk = row.state === "perk";
  const isOneTime = row.frequency === "ONE_TIME";
  const pct =
    row.valueCents && row.valueCents > 0
      ? Math.min(100, Math.round((row.usedCents / row.valueCents) * 100))
      : 0;
  const barColor =
    row.state === "used" ? "bg-emerald-500" : row.state === "expiring" ? "bg-rose-500" : "bg-sky-500";

  return (
    <li
      id={`benefit-${row.benefitId}`}
      className="scroll-mt-24 rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 p-4 shadow-sm target:ring-2 target:ring-[var(--color-terracotta)]/50"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="text-xl leading-none" aria-hidden>
          {BENEFIT_CATEGORY_ICONS[row.category]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {row.card && (
              <Link
                href={`/cards/${row.card.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-clay)]/80 bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: row.card.color }} />
                {row.card.name}
              </Link>
            )}
            <h3 className="font-medium text-[var(--color-ink)]">{row.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_STYLES[row.state]}`}>
              {STATE_LABELS[row.state]}
            </span>
            {row.requiresEnrollment && !row.enrolled && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Not enrolled
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
            {row.valueCents != null && (
              <>
                {formatCents(row.valueCents)} {FREQUENCY_SHORT[row.frequency]}
                {" · "}
              </>
            )}
            {isPerk ? "Ongoing" : row.periodLabel}
            {row.daysLeft != null && !isPerk && row.state !== "used" && (
              <>
                {" · "}
                <span className={row.state === "expiring" ? "font-semibold text-rose-700" : ""}>
                  {row.daysLeft <= 1 ? "last day" : `${row.daysLeft} days left`}
                </span>
              </>
            )}
          </p>
          {row.notes && <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{row.notes}</p>}
        </div>

        {!isPerk && row.valueCents != null && (
          <div className="flex shrink-0 items-center gap-2">
            {row.remainingCents > 0 ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => markBenefitUsed(row.benefitId))}
                  className="rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:-translate-y-px disabled:opacity-60"
                >
                  {pending ? "Saving…" : `Used ${isOneTime ? "it" : "all " + formatCents(row.remainingCents)}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLog((v) => !v)}
                  className="rounded-full border border-[var(--color-clay)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream-dim)]"
                >
                  {showLog ? "Cancel" : "Log part"}
                </button>
              </>
            ) : (
              <span className="text-xs font-medium text-emerald-700">✓ All {formatCents(row.valueCents)} used</span>
            )}
          </div>
        )}
      </div>

      {!isPerk && row.valueCents != null && row.valueCents > 0 && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-cream-dim)]">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-[var(--color-ink-soft)]">
            {formatCents(row.usedCents)} used · {formatCents(row.remainingCents)} left
          </p>
        </div>
      )}

      {showLog && (
        <LogUsageForm
          benefitId={row.benefitId}
          remainingCents={row.remainingCents}
          onDone={() => setShowLog(false)}
        />
      )}

      {row.requiresEnrollment && (
        <label className="mt-3 flex items-center gap-2 text-xs text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={row.enrolled}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.checked;
              startTransition(() => setBenefitEnrolled(row.benefitId, next));
            }}
            className="accent-[var(--color-terracotta)]"
          />
          {row.enrolled ? "Enrolled" : "Mark as enrolled once you've opted in"}
        </label>
      )}
    </li>
  );
}
