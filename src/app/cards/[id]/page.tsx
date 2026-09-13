import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteCard, setCardArchived } from "@/lib/cards/actions";
import {
  SPEND_CATEGORY_LABELS,
  type BenefitCategory,
  type BenefitFrequency,
  type SpendCategory,
} from "@/lib/cards/constants";
import { formatCents } from "@/lib/cards/money";
import { formatDateOnly, formatDay } from "@/lib/cards/periods";
import { summarizeCard } from "@/lib/cards/summary";
import { buildSuggestions } from "@/lib/cards/suggestions";
import { CardArt } from "@/components/cards/CardArt";
import { BenefitTracker } from "@/components/cards/BenefitTracker";
import { BenefitLookupPanel } from "@/components/cards/BenefitLookupPanel";
import { ScreenshotSync } from "@/components/cards/ScreenshotSync";
import { DeleteCardButton } from "@/components/cards/DeleteCardButton";
import { SuggestionList } from "@/components/cards/SuggestionList";
import { UsageHistory } from "@/components/cards/UsageHistory";

export const dynamic = "force-dynamic";
// The online benefit lookup can take a minute of server time.
export const maxDuration = 120;

export async function generateMetadata({ params }: PageProps<"/cards/[id]">): Promise<Metadata> {
  const { id } = await params;
  const card = await prisma.creditCard.findUnique({ where: { id }, select: { name: true } });
  return { title: card ? `${card.name} · Card Benefits` : "Card · Card Benefits" };
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-[var(--color-ink)]";
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">{label}</dt>
      <dd className={`mt-0.5 font-heading text-xl ${color}`}>{value}</dd>
      {sub && <dd className="text-xs text-[var(--color-ink-soft)]">{sub}</dd>}
    </div>
  );
}

const ghostButton =
  "rounded-full border border-[var(--color-clay)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-cream-dim)]";

export default async function CardDetailPage({ params }: PageProps<"/cards/[id]">) {
  const { id } = await params;
  const now = new Date();
  const card = await prisma.creditCard.findUnique({
    where: { id },
    include: {
      benefits: { include: { usages: { orderBy: { usedOn: "desc" } } } },
      earningRates: { orderBy: { multiplier: "desc" } },
    },
  });
  if (!card) notFound();

  const summary = summarizeCard(card, now);
  const suggestions = buildSuggestions([summary], now);
  const credits = summary.benefits.filter((b) => b.state !== "perk");
  const perks = summary.benefits.filter((b) => b.state === "perk");

  const usageRows = card.benefits
    .flatMap((b) =>
      b.usages.map((u) => ({
        id: u.id,
        benefitName: b.name,
        amountCents: u.amountCents,
        usedOn: u.usedOn,
        periodKey: u.periodKey,
        note: u.note,
      }))
    )
    .sort((a, b) => b.usedOn.getTime() - a.usedOn.getTime())
    .slice(0, 40);

  const feeCovered = summary.listFeeCents === 0 || summary.realizedTrailingYearCents >= summary.listFeeCents;
  const isPoints = card.pointValueCents !== 1;
  const feeStat = summary.feeWaived
    ? {
        value: "Waived",
        sub: summary.firstFeeDate
          ? `${formatCents(summary.listFeeCents)} / yr from ${formatDay(summary.firstFeeDate)}`
          : `${formatCents(summary.listFeeCents)} / yr once it ends`,
      }
    : { value: card.annualFee > 0 ? formatCents(summary.listFeeCents) : "None", sub: undefined };

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link href="/" className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-terracotta-dark)]">
        ← All cards
      </Link>

      <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-start">
        <CardArt card={card} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl text-[var(--color-ink)] sm:text-3xl">{card.name}</h1>
              <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
                {[card.issuer, card.lastFour && `•••• ${card.lastFour}`, card.openedOn && `opened ${formatDateOnly(card.openedOn)}`]
                  .filter(Boolean)
                  .join(" · ")}
                {card.archived && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs">Closed</span>}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/cards/${id}/edit`} className={ghostButton}>
                Edit
              </Link>
              <form action={setCardArchived.bind(null, id, !card.archived)}>
                <button type="submit" className={ghostButton}>
                  {card.archived ? "Reopen" : "Mark closed"}
                </button>
              </form>
              <DeleteCardButton action={deleteCard.bind(null, id)} name={card.name} />
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Annual fee" value={feeStat.value} sub={feeStat.sub} tone={summary.feeWaived ? "good" : undefined} />
            <Stat
              label="Credits per year"
              value={formatCents(summary.annualValueCents)}
              sub={summary.oneTimeValueCents > 0 ? `+ ${formatCents(summary.oneTimeValueCents)} one-time` : undefined}
            />
            <Stat
              label="Used, past 12 mo"
              value={formatCents(summary.realizedTrailingYearCents)}
              sub={
                card.annualFee > 0
                  ? feeCovered
                    ? summary.feeWaived
                      ? "would cover the fee"
                      : "covers the fee"
                    : `${formatCents(summary.listFeeCents - summary.realizedTrailingYearCents)} short of the ${summary.feeWaived ? "future " : ""}fee`
                  : undefined
              }
              tone={card.annualFee > 0 ? (feeCovered ? "good" : "bad") : undefined}
            />
            <Stat
              label="Renews"
              value={summary.renewal ? formatDay(summary.renewal.date) : "—"}
              sub={summary.renewal ? `in ${summary.renewal.daysUntil} days` : "add the open date"}
            />
          </dl>
        </div>
      </div>

      {suggestions.length > 0 && !card.archived && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-xl text-[var(--color-ink)]">Do this next</h2>
          <SuggestionList suggestions={suggestions} />
        </section>
      )}

      {card.benefits.length === 0 && !card.archived && (
        <section className="mt-8">
          <BenefitLookupPanel
            cardId={card.id}
            cardName={card.name}
            issuer={card.issuer ?? ""}
            hasRates={card.earningRates.length > 0}
          />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl text-[var(--color-ink)]">Credits</h2>
          <span className="text-xs text-[var(--color-ink-soft)]">
            {formatCents(summary.outstandingCents)} waiting to be used
          </span>
        </div>
        {credits.length > 0 && !card.archived && (
          <div className="mb-3">
            <ScreenshotSync cardId={card.id} cardName={card.name} />
          </div>
        )}
        {credits.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-5 py-6 text-center text-sm text-[var(--color-ink-soft)]">
            No dollar credits on this card.{" "}
            <Link href={`/cards/${id}/edit`} className="underline">
              Add some
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {credits.map((b) => (
              <BenefitTracker
                key={b.benefit.id}
                row={{
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
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {perks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-heading text-xl text-[var(--color-ink)]">Perks</h2>
          <ul className="space-y-3">
            {perks.map((b) => (
              <BenefitTracker
                key={b.benefit.id}
                row={{
                  benefitId: b.benefit.id,
                  name: b.benefit.name,
                  category: b.benefit.category as BenefitCategory,
                  frequency: b.benefit.frequency as BenefitFrequency,
                  valueCents: null,
                  usedCents: 0,
                  remainingCents: 0,
                  state: "perk",
                  periodLabel: b.period.label,
                  daysLeft: null,
                  requiresEnrollment: b.benefit.requiresEnrollment,
                  enrolled: b.benefit.enrolled,
                  notes: b.benefit.notes,
                }}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-xl text-[var(--color-ink)]">Earning rates</h2>
        {card.earningRates.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-soft)]">
            None yet — add them on the edit page to get &ldquo;which card should I use?&rdquo; advice.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {card.earningRates.map((r) => (
              <li
                key={r.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-[var(--color-clay)]/80 bg-white/80 px-4 py-2.5 text-sm"
              >
                <span>
                  <span className="text-[var(--color-ink)]">{SPEND_CATEGORY_LABELS[r.category as SpendCategory]}</span>
                  {r.notes && <span className="block text-xs text-[var(--color-ink-soft)]">{r.notes}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold text-[var(--color-ink)]">
                    {r.multiplier}
                    {isPoints ? "x" : "%"}
                  </span>
                  {isPoints && (
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      ≈ {(r.multiplier * card.pointValueCents).toFixed(1)}%
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-heading text-xl text-[var(--color-ink)]">History</h2>
        <UsageHistory rows={usageRows} />
      </section>

      {card.notes && (
        <section className="mt-8">
          <h2 className="mb-2 font-heading text-xl text-[var(--color-ink)]">Notes</h2>
          <p className="whitespace-pre-wrap text-sm text-[var(--color-ink)]">{card.notes}</p>
        </section>
      )}
    </div>
  );
}
