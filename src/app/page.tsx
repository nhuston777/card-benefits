import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildChecklist, rankCardsBySpend, summarizeCard, totals } from "@/lib/cards/summary";
import { buildSuggestions } from "@/lib/cards/suggestions";
import { formatCents } from "@/lib/cards/money";
import { Checklist } from "@/components/cards/Checklist";
import { StatTiles } from "@/components/cards/StatTiles";
import { SuggestionList } from "@/components/cards/SuggestionList";
import { CardTile } from "@/components/cards/CardTile";
import { BestCardTable } from "@/components/cards/BestCardTable";
import { CardArt } from "@/components/cards/CardArt";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Card Benefits",
  description: "Every credit card perk, what's been used, and what to do next",
};

const addButton =
  "shrink-0 rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-4 py-2.5 text-sm font-medium text-white shadow-[0_6px_16px_-4px_rgba(191,91,63,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(191,91,63,0.55)]";

export default async function CardsPage() {
  const now = new Date();
  const cards = await prisma.creditCard.findMany({
    include: { benefits: { include: { usages: true } }, earningRates: true },
    orderBy: [{ archived: "asc" }, { annualFee: "desc" }, { createdAt: "asc" }],
  });

  const active = cards.filter((c) => !c.archived);
  const archived = cards.filter((c) => c.archived);
  const summaries = active.map((c) => summarizeCard(c, now));
  const sum = totals(summaries);
  const checklist = buildChecklist(summaries);
  // The checklist above already shows every credit with value left, so the
  // suggestions here are only the decisions: fees, waivers, missing setup.
  const suggestions = buildSuggestions(summaries, now).filter(
    (s) => !/^(expiring|unused|onetime|enroll)-/.test(s.id)
  );
  const rankings = rankCardsBySpend(active);
  const toUse = checklist.expiring.length + checklist.upcoming.length + checklist.oneTime.length;
  const toUseCents = [...checklist.expiring, ...checklist.upcoming, ...checklist.oneTime].reduce(
    (s, b) => s + b.remainingCents,
    0
  );

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-terracotta-dark)]">
            Credit cards
          </p>
          <h1 className="font-heading text-3xl sm:text-5xl text-[var(--color-ink)]">Card benefits</h1>
          <p className="mt-1.5 text-sm text-[var(--color-ink-soft)]">
            Everything still to be used, across every card, expiring first.
          </p>
        </div>
        <Link href="/cards/new" className={addButton}>
          + Add card
        </Link>
      </header>

      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-6 py-16 text-center text-[var(--color-ink-soft)]">
          <p className="mb-3 text-3xl">💳</p>
          <p className="mb-2 font-heading text-xl text-[var(--color-ink)]">No cards yet</p>
          <p className="mb-5">
            Add a card and its credits. Pick from a preset for the popular ones, or start blank.
          </p>
          <Link href="/cards/new" className={addButton}>
            + Add your first card
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 className="font-heading text-2xl text-[var(--color-ink)]">Use these</h2>
              <span className="text-xs text-[var(--color-ink-soft)]">
                {toUse === 0
                  ? "nothing outstanding"
                  : `${formatCents(toUseCents)} across ${toUse} credit${toUse === 1 ? "" : "s"} · tap “Used” as you go`}
              </span>
            </div>
            <Checklist data={checklist} />
          </section>

          <StatTiles totals={sum} />

          {suggestions.length > 0 && (
            <section>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-heading text-2xl text-[var(--color-ink)]">Decisions</h2>
                <span className="text-xs text-[var(--color-ink-soft)]">fees, waivers, setup</span>
              </div>
              <SuggestionList suggestions={suggestions} />
            </section>
          )}

          <section>
            <h2 className="mb-3 font-heading text-2xl text-[var(--color-ink)]">Your cards</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {summaries.map((s) => (
                <CardTile key={s.card.id} summary={s} now={now} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-1 font-heading text-2xl text-[var(--color-ink)]">Which card should I use?</h2>
            <p className="mb-3 text-sm text-[var(--color-ink-soft)]">
              Ranked by real return: multiplier × what you value a point at.
            </p>
            <BestCardTable rankings={rankings} />
          </section>

          {archived.length > 0 && (
            <section>
              <h2 className="mb-3 font-heading text-xl text-[var(--color-ink-soft)]">Closed cards</h2>
              <ul className="flex flex-wrap gap-2">
                {archived.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/cards/${c.id}`}
                      className="flex items-center gap-2 rounded-full border border-[var(--color-clay)]/80 bg-white/60 py-1 pl-1 pr-3 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
                    >
                      <CardArt card={c} size="sm" />
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
