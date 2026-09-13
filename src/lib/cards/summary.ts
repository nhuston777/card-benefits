import type { Benefit, BenefitUsage, CreditCard, EarningRate } from "@/generated/prisma";
import {
  PERIODS_PER_YEAR,
  SPEND_CATEGORIES,
  type BenefitFrequency,
  type SpendCategory,
} from "./constants";
import {
  anniversaryParts,
  currentPeriod,
  daysUntilRenewal,
  isExpiringSoon,
  nextAnniversary,
  type Period,
} from "./periods";

export type BenefitWithUsages = Benefit & { usages: BenefitUsage[] };
export type CardWithRelations = CreditCard & {
  benefits: BenefitWithUsages[];
  earningRates: EarningRate[];
};

export type BenefitState = "perk" | "unused" | "partial" | "used" | "expiring";

export type BenefitStatus = {
  benefit: BenefitWithUsages;
  card: CreditCard;
  period: Period;
  valueCents: number | null;
  /** Used inside the current period. */
  usedCents: number;
  remainingCents: number;
  state: BenefitState;
  /** Face value over a full year: $15/mo → $180. */
  annualizedCents: number;
  realizedYtdCents: number;
  realizedTrailingYearCents: number;
  needsEnrollment: boolean;
};

export type CardSummary = {
  card: CardWithRelations;
  benefits: BenefitStatus[];
  /** What the card is actually costing per year right now: 0 while waived. */
  annualFeeCents: number;
  /** The fee on the card's terms, waived or not. */
  listFeeCents: number;
  /** True while a waiver is in effect. */
  feeWaived: boolean;
  /**
   * When a waived fee starts being charged: the first anniversary on or
   * after the waiver's end. Null when the waiver has no known end.
   */
  firstFeeDate: Date | null;
  /** Face value of every recurring credit over a year. */
  annualValueCents: number;
  oneTimeValueCents: number;
  realizedYtdCents: number;
  realizedTrailingYearCents: number;
  /** Realized over the trailing year minus the fee. */
  netTrailingYearCents: number;
  /** Benefits still holding unused value in their current window. */
  outstandingCents: number;
  expiringCount: number;
  renewal: { date: Date; daysUntil: number } | null;
};

const YEAR_MS = 365 * 86_400_000;

function startOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Date-only columns are stored at UTC midnight; compare them as local calendar days. */
function anniversaryToLocal(stored: Date) {
  const { year, month, day } = anniversaryParts(stored);
  return new Date(year, month, day);
}

/** The card anniversary that falls on or after `from`. */
function nextAnniversaryOnOrAfter(openedOn: Date, from: Date) {
  const { month, day } = anniversaryParts(openedOn);
  const sameYear = new Date(from.getFullYear(), month, day);
  return sameYear >= from ? sameYear : new Date(from.getFullYear() + 1, month, day);
}

function sumUsages(usages: BenefitUsage[], predicate: (u: BenefitUsage) => boolean) {
  return usages.reduce((sum, u) => (predicate(u) ? sum + u.amountCents : sum), 0);
}

export function benefitStatus(
  benefit: BenefitWithUsages,
  card: CreditCard,
  now = new Date()
): BenefitStatus {
  const frequency = benefit.frequency as BenefitFrequency;
  const period = currentPeriod(frequency, card.openedOn, now);
  const valueCents = benefit.valueCents;
  const usedCents = sumUsages(benefit.usages, (u) => u.periodKey === period.key);
  const remainingCents = valueCents == null ? 0 : Math.max(0, valueCents - usedCents);

  let state: BenefitState;
  if (valueCents == null || frequency === "ONGOING") state = "perk";
  else if (remainingCents === 0) state = "used";
  else if (isExpiringSoon(frequency, period)) state = "expiring";
  else if (usedCents > 0) state = "partial";
  else state = "unused";

  const yearStart = new Date(now.getFullYear(), 0, 1);
  const trailingStart = new Date(now.getTime() - YEAR_MS);

  return {
    benefit,
    card,
    period,
    valueCents,
    usedCents,
    remainingCents,
    state,
    annualizedCents: (valueCents ?? 0) * PERIODS_PER_YEAR[frequency],
    realizedYtdCents: sumUsages(benefit.usages, (u) => u.usedOn >= yearStart),
    realizedTrailingYearCents: sumUsages(benefit.usages, (u) => u.usedOn >= trailingStart),
    needsEnrollment: benefit.requiresEnrollment && !benefit.enrolled,
  };
}

export function summarizeCard(card: CardWithRelations, now = new Date()): CardSummary {
  const benefits = [...card.benefits]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
    .map((b) => benefitStatus(b, card, now));

  const listFeeCents = card.annualFee * 100;
  const waiverEnd = card.feeWaivedUntil;
  const feeWaived =
    listFeeCents > 0 &&
    card.feeWaived &&
    (waiverEnd == null || anniversaryToLocal(waiverEnd) >= startOfToday(now));
  const annualFeeCents = feeWaived ? 0 : listFeeCents;
  const firstFeeDate =
    feeWaived && waiverEnd
      ? card.openedOn
        ? nextAnniversaryOnOrAfter(card.openedOn, anniversaryToLocal(waiverEnd))
        : anniversaryToLocal(waiverEnd)
      : null;

  const annualValueCents = benefits.reduce((s, b) => s + b.annualizedCents, 0);
  const oneTimeValueCents = benefits.reduce(
    (s, b) => (b.benefit.frequency === "ONE_TIME" ? s + (b.valueCents ?? 0) : s),
    0
  );
  const realizedYtdCents = benefits.reduce((s, b) => s + b.realizedYtdCents, 0);
  const realizedTrailingYearCents = benefits.reduce((s, b) => s + b.realizedTrailingYearCents, 0);
  const outstandingCents = benefits.reduce(
    (s, b) => (b.state === "perk" || b.benefit.frequency === "ONE_TIME" ? s : s + b.remainingCents),
    0
  );

  const daysUntil = daysUntilRenewal(card.openedOn, now);
  const renewal =
    card.openedOn && daysUntil != null
      ? { date: nextAnniversary(card.openedOn, now), daysUntil }
      : null;

  return {
    card,
    benefits,
    annualFeeCents,
    listFeeCents,
    feeWaived,
    firstFeeDate,
    annualValueCents,
    oneTimeValueCents,
    realizedYtdCents,
    realizedTrailingYearCents,
    netTrailingYearCents: realizedTrailingYearCents - annualFeeCents,
    outstandingCents,
    expiringCount: benefits.filter((b) => b.state === "expiring").length,
    renewal,
  };
}

export type Totals = {
  cardCount: number;
  annualFeeCents: number;
  /** Fees on the cards' terms that aren't being charged right now. */
  waivedFeeCents: number;
  annualValueCents: number;
  realizedYtdCents: number;
  outstandingCents: number;
  expiringCount: number;
};

export function totals(summaries: CardSummary[]): Totals {
  return summaries.reduce<Totals>(
    (t, s) => ({
      cardCount: t.cardCount + 1,
      annualFeeCents: t.annualFeeCents + s.annualFeeCents,
      waivedFeeCents: t.waivedFeeCents + (s.feeWaived ? s.listFeeCents : 0),
      annualValueCents: t.annualValueCents + s.annualValueCents,
      realizedYtdCents: t.realizedYtdCents + s.realizedYtdCents,
      outstandingCents: t.outstandingCents + s.outstandingCents,
      expiringCount: t.expiringCount + s.expiringCount,
    }),
    {
      cardCount: 0,
      annualFeeCents: 0,
      waivedFeeCents: 0,
      annualValueCents: 0,
      realizedYtdCents: 0,
      outstandingCents: 0,
      expiringCount: 0,
    }
  );
}

// ---------------------------------------------------------------------------
// Which card should I use?
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// The checklist: everything still to be used, across all cards
// ---------------------------------------------------------------------------

export type Checklist = {
  /** Unused value whose window closes soon. Soonest first. */
  expiring: BenefitStatus[];
  /** Unused value with time left, soonest reset first. */
  upcoming: BenefitStatus[];
  /** One-time credits never used (Global Entry and the like). */
  oneTime: BenefitStatus[];
  /** Credits that can't be used until the cardholder enrolls. */
  needsEnrollment: BenefitStatus[];
};

const byDaysLeft = (a: BenefitStatus, b: BenefitStatus) =>
  (a.period.daysLeft ?? Infinity) - (b.period.daysLeft ?? Infinity) || b.remainingCents - a.remainingCents;

export function buildChecklist(summaries: CardSummary[]): Checklist {
  const out: Checklist = { expiring: [], upcoming: [], oneTime: [], needsEnrollment: [] };
  for (const s of summaries) {
    if (s.card.archived) continue;
    for (const b of s.benefits) {
      if (b.state === "perk" || b.state === "used" || b.remainingCents <= 0) continue;
      if (b.needsEnrollment) out.needsEnrollment.push(b);
      else if (b.benefit.frequency === "ONE_TIME") out.oneTime.push(b);
      else if (b.state === "expiring") out.expiring.push(b);
      else out.upcoming.push(b);
    }
  }
  out.expiring.sort(byDaysLeft);
  out.upcoming.sort(byDaysLeft);
  out.oneTime.sort((a, b) => (b.valueCents ?? 0) - (a.valueCents ?? 0));
  out.needsEnrollment.sort((a, b) => b.annualizedCents - a.annualizedCents);
  return out;
}

export type RateOption = {
  card: CreditCard;
  rate: EarningRate;
  /** Cents back per dollar spent: 4x at 1.5¢ → 6.0. */
  returnPct: number;
  /** True when the card has no rate for this category and its base rate is being used. */
  isFallback: boolean;
};

export type CategoryRanking = {
  category: SpendCategory;
  options: RateOption[];
};

function rateFor(card: CardWithRelations, category: SpendCategory) {
  return card.earningRates.find((r) => r.category === category) ?? null;
}

/**
 * For every spend category, the cards ranked by real return. Categories where
 * no card has a bonus rate are dropped — "everything else" already covers them.
 */
export function rankCardsBySpend(cards: CardWithRelations[]): CategoryRanking[] {
  return SPEND_CATEGORIES.map((category) => {
    const options: RateOption[] = [];
    for (const card of cards) {
      const specific = rateFor(card, category);
      const rate = specific ?? (category === "EVERYTHING_ELSE" ? null : rateFor(card, "EVERYTHING_ELSE"));
      if (!rate) continue;
      options.push({
        card,
        rate,
        returnPct: rate.multiplier * card.pointValueCents,
        isFallback: specific == null,
      });
    }
    options.sort((a, b) => b.returnPct - a.returnPct);
    return { category, options };
  }).filter(
    (r) =>
      r.options.length > 0 &&
      (r.category === "EVERYTHING_ELSE" || r.options.some((o) => !o.isFallback))
  );
}
