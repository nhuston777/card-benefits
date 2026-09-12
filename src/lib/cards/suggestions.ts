import { formatCents } from "./money";
import { formatDayShort } from "./periods";
import type { BenefitStatus, CardSummary } from "./summary";

export type SuggestionPriority = "urgent" | "high" | "setup" | "normal" | "tip";

export type Suggestion = {
  id: string;
  priority: SuggestionPriority;
  title: string;
  detail: string;
  href: string;
  cardId: string;
  benefitId?: string;
};

const PRIORITY_ORDER: Record<SuggestionPriority, number> = {
  urgent: 0,
  high: 1,
  setup: 2,
  normal: 3,
  tip: 4,
};

/** How close to renewal we start asking "is this card still worth it?". */
const RENEWAL_WINDOW_DAYS = 60;

/** A card needs this much history before a "fee not covered" verdict is fair. */
const MIN_TRACKED_DAYS = 90;

/** How far ahead of a waived fee becoming real to raise it. */
const WAIVER_WARNING_DAYS = 120;

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function daysPhrase(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${plural(days, "day")}`;
}

function benefitSuggestions(b: BenefitStatus, summary: CardSummary, now: Date): Suggestion[] {
  const out: Suggestion[] = [];
  const cardHref = `/cards/${summary.card.id}`;
  const cardName = summary.card.name;
  const remaining = formatCents(b.remainingCents);

  if (b.needsEnrollment) {
    const worth =
      b.annualizedCents > 0
        ? ` It's worth ${formatCents(b.annualizedCents)} a year.`
        : b.valueCents
          ? ` It's worth ${formatCents(b.valueCents)}.`
          : "";
    out.push({
      id: `enroll-${b.benefit.id}`,
      priority: "setup",
      title: `Enroll in ${b.benefit.name} on ${cardName}`,
      detail: `This one doesn't work until you opt in.${worth}`,
      href: cardHref,
      cardId: summary.card.id,
      benefitId: b.benefit.id,
    });
  }

  if (b.state === "expiring" && b.period.end) {
    const endsToday = b.period.daysLeft != null && b.period.daysLeft <= 1;
    out.push({
      id: `expiring-${b.benefit.id}`,
      priority: "urgent",
      title: `Use ${remaining} of ${b.benefit.name} by ${formatDayShort(b.period.end, now)}`,
      detail: `${cardName} · ${endsToday ? "last day" : `${plural(b.period.daysLeft ?? 0, "day")} left`}${
        b.usedCents > 0 ? ` · ${formatCents(b.usedCents)} already used` : ""
      }`,
      href: cardHref,
      cardId: summary.card.id,
      benefitId: b.benefit.id,
    });
  } else if ((b.state === "unused" || b.state === "partial") && b.benefit.frequency !== "ONE_TIME") {
    out.push({
      id: `unused-${b.benefit.id}`,
      priority: "normal",
      title: `${remaining} of ${b.benefit.name} still available`,
      detail: `${cardName} · ${b.period.label}${
        b.period.end ? ` · resets ${formatDayShort(new Date(b.period.end.getTime() + 86_400_000), now)}` : ""
      }`,
      href: cardHref,
      cardId: summary.card.id,
      benefitId: b.benefit.id,
    });
  } else if (b.state === "unused" && b.benefit.frequency === "ONE_TIME" && b.valueCents) {
    out.push({
      id: `onetime-${b.benefit.id}`,
      priority: "tip",
      title: `${b.benefit.name} hasn't been used yet`,
      detail: `${cardName} · a one-time ${formatCents(b.valueCents)} credit`,
      href: cardHref,
      cardId: summary.card.id,
      benefitId: b.benefit.id,
    });
  }

  return out;
}

function cardSuggestions(summary: CardSummary, now: Date): Suggestion[] {
  const out: Suggestion[] = [];
  const { card } = summary;
  const href = `/cards/${card.id}`;

  if (summary.benefits.length === 0) {
    out.push({
      id: `no-benefits-${card.id}`,
      priority: "setup",
      title: `${card.name} has no benefits listed yet`,
      detail: "Look them up online from the card's page and confirm which ones to track.",
      href,
      cardId: card.id,
    });
  }

  if (card.annualFee > 0) {
    const trackedDays = Math.round((now.getTime() - card.createdAt.getTime()) / 86_400_000);
    const enoughHistory = trackedDays >= MIN_TRACKED_DAYS;
    const fee = formatCents(summary.listFeeCents);
    const realized = formatCents(summary.realizedTrailingYearCents);

    if (summary.feeWaived) {
      // Nothing is being charged, so skip the keep-or-cancel math until the
      // waiver's end is in sight. The verdict then compares the list fee to
      // what the card actually delivered, since that's what it will cost.
      const covered = summary.realizedTrailingYearCents >= summary.listFeeCents;
      if (summary.firstFeeDate) {
        const daysUntilFee = Math.round(
          (summary.firstFeeDate.getTime() - now.getTime()) / 86_400_000
        );
        if (daysUntilFee <= WAIVER_WARNING_DAYS) {
          out.push({
            id: `waiver-ending-${card.id}`,
            priority: covered ? "normal" : "high",
            title: `${card.name}'s fee waiver is ending — ${fee} a year starts ${formatDayShort(summary.firstFeeDate, now)}`,
            detail: covered
              ? `You've used ${realized} in benefits over the past year, so it would still pay for itself. Keep it, but keep using the credits.`
              : enoughHistory
                ? `Only ${realized} in benefits used over the past year. Once the fee is real that's a loss — plan to downgrade to a no-fee version or cancel before ${formatDayShort(summary.firstFeeDate, now)}.`
                : `Not enough history yet to judge. Track the credits you use between now and ${formatDayShort(summary.firstFeeDate, now)}, then decide.`,
            href,
            cardId: card.id,
          });
        }
      } else {
        out.push({
          id: `waiver-end-date-${card.id}`,
          priority: "tip",
          title: `When does the fee waiver on ${card.name} end?`,
          detail: `Add the date (retirement, separation, end of a promo) and you'll get a keep-or-downgrade verdict before the first ${fee} charge.`,
          href: `/cards/${card.id}/edit`,
          cardId: card.id,
        });
      }
    } else if (summary.renewal && summary.renewal.daysUntil <= RENEWAL_WINDOW_DAYS) {
      const covered = summary.realizedTrailingYearCents >= summary.annualFeeCents;
      out.push({
        id: `renewal-${card.id}`,
        priority: covered ? "normal" : "high",
        title: `${card.name}'s ${fee} fee posts ${daysPhrase(summary.renewal.daysUntil)}`,
        detail: covered
          ? `You've gotten ${realized} out of it this year, so it's paying for itself. Decide before ${formatDayShort(summary.renewal.date, now)} anyway — that's the window to downgrade or cancel.`
          : enoughHistory
            ? `Only ${realized} in benefits used over the past year against a ${fee} fee. Call and ask about a retention offer, a downgrade to a no-fee version, or cancel.`
            : `Not enough history yet to say whether it pays for itself. Use the credits you can before ${formatDayShort(summary.renewal.date, now)} and check back.`,
        href,
        cardId: card.id,
      });
    } else if (enoughHistory && summary.annualValueCents < summary.annualFeeCents) {
      out.push({
        id: `fee-face-${card.id}`,
        priority: "high",
        title: `${card.name}'s credits don't add up to its fee`,
        detail: `Tracked credits total ${formatCents(summary.annualValueCents)} a year against a ${fee} fee. Unless the points, lounges, or protections cover the gap, plan a downgrade at renewal.`,
        href,
        cardId: card.id,
      });
    } else if (
      enoughHistory &&
      summary.realizedTrailingYearCents < summary.annualFeeCents / 2 &&
      summary.annualValueCents >= summary.annualFeeCents
    ) {
      out.push({
        id: `fee-pace-${card.id}`,
        priority: "normal",
        title: `${card.name} is paying for itself on paper, not in practice`,
        detail: `You've used ${realized} of ${formatCents(summary.annualValueCents)} in yearly credits. The fee is ${fee}. Work through the unused credits below or plan to downgrade.`,
        href,
        cardId: card.id,
      });
    }

    if (!card.openedOn) {
      out.push({
        id: `open-date-${card.id}`,
        priority: "tip",
        title: `Add the open date for ${card.name}`,
        detail: "That unlocks renewal reminders and cardmember-year credits that reset on your anniversary.",
        href: `/cards/${card.id}/edit`,
        cardId: card.id,
      });
    }
  }

  return out;
}

/** Everything worth doing right now, most urgent first. */
export function buildSuggestions(summaries: CardSummary[], now = new Date()): Suggestion[] {
  const all: Suggestion[] = [];
  for (const summary of summaries) {
    if (summary.card.archived) continue;
    all.push(...cardSuggestions(summary, now));
    for (const b of summary.benefits) all.push(...benefitSuggestions(b, summary, now));
  }
  return all.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export const PRIORITY_LABELS: Record<SuggestionPriority, string> = {
  urgent: "Expiring",
  high: "Decide",
  setup: "Enroll",
  normal: "Available",
  tip: "Tip",
};

export const PRIORITY_STYLES: Record<SuggestionPriority, string> = {
  urgent: "bg-rose-100 text-rose-800 ring-rose-200",
  high: "bg-amber-100 text-amber-800 ring-amber-200",
  setup: "bg-violet-100 text-violet-800 ring-violet-200",
  normal: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  tip: "bg-sky-100 text-sky-800 ring-sky-200",
};
