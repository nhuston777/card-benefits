import Link from "next/link";
import type { BenefitCategory, BenefitFrequency } from "@/lib/cards/constants";
import { BENEFIT_CATEGORY_ICONS } from "@/lib/cards/constants";
import { formatCents } from "@/lib/cards/money";
import type { BenefitStatus, Checklist as ChecklistData } from "@/lib/cards/summary";
import { BenefitTracker, type BenefitRowProps } from "./BenefitTracker";

/** Turns a computed benefit status into the row the tracker component renders. */
export function benefitRow(b: BenefitStatus, withCard: boolean): BenefitRowProps {
  return {
    benefitId: b.benefit.id,
    name: b.benefit.name,
    category: b.benefit.category as BenefitCategory,
    frequency: b.benefit.frequency as BenefitFrequency,
    valueCents: b.valueCents,
    usedCents: b.usedCents,
    remainingCents: b.remainingCents,
    state: b.state,
    periodLabel: b.period.label,
    daysLeft: b.period.daysLeft,
    requiresEnrollment: b.benefit.requiresEnrollment,
    enrolled: b.benefit.enrolled,
    notes: b.benefit.notes,
    card: withCard ? { id: b.card.id, name: b.card.name, color: b.card.color } : undefined,
  };
}

function Group({
  title,
  hint,
  items,
  tone = "neutral",
}: {
  title: string;
  hint?: string;
  items: BenefitStatus[];
  tone?: "urgent" | "neutral";
}) {
  if (items.length === 0) return null;
  const total = items.reduce((s, b) => s + b.remainingCents, 0);
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className={`font-heading text-lg ${tone === "urgent" ? "text-rose-800" : "text-[var(--color-ink)]"}`}>
          {title}
          <span className="ml-2 text-sm font-normal text-[var(--color-ink-soft)]">
            {formatCents(total)} · {items.length}
          </span>
        </h3>
        {hint && <span className="text-xs text-[var(--color-ink-soft)]">{hint}</span>}
      </div>
      <ul className="space-y-3">
        {items.map((b) => (
          <BenefitTracker key={b.benefit.id} row={benefitRow(b, true)} />
        ))}
      </ul>
    </div>
  );
}

/**
 * The home page's main event: every credit still holding value, across all
 * cards, with the buttons to log it right here. Credits gated on enrollment
 * sit apart with a link to the card, since enrolling happens at the issuer.
 */
export function Checklist({ data }: { data: ChecklistData }) {
  const nothingToUse = data.expiring.length + data.upcoming.length + data.oneTime.length === 0;

  return (
    <div className="space-y-8">
      {nothingToUse ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-5 py-8 text-center text-sm text-[var(--color-ink-soft)]">
          Every credit is used up for its current window. Nice. 🎉
        </p>
      ) : (
        <>
          <Group title="Expiring soon" hint="use it or lose it" items={data.expiring} tone="urgent" />
          <Group title="Coming up" hint="still time, but on the clock" items={data.upcoming} />
          <Group title="One-time credits" hint="no deadline, still money" items={data.oneTime} />
        </>
      )}

      {data.needsEnrollment.length > 0 && (
        <div>
          <h3 className="mb-2 font-heading text-lg text-[var(--color-ink)]">
            Enroll first
            <span className="ml-2 text-sm font-normal text-[var(--color-ink-soft)]">
              {formatCents(data.needsEnrollment.reduce((s, b) => s + b.annualizedCents, 0))} / yr locked behind opt-ins
            </span>
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.needsEnrollment.map((b) => (
              <li key={b.benefit.id}>
                <Link
                  href={`/cards/${b.card.id}#benefit-${b.benefit.id}`}
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-sm transition hover:bg-amber-50"
                >
                  <span aria-hidden>{BENEFIT_CATEGORY_ICONS[b.benefit.category as BenefitCategory]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[var(--color-ink)]">{b.benefit.name}</span>
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      {b.card.name}
                      {b.valueCents != null && ` · ${formatCents(b.valueCents)} per ${b.period.label}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-amber-800">Enroll →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
