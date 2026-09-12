import type { BenefitCategory, BenefitFrequency, SpendCategory } from "./constants";

/**
 * What the card form edits and posts. Benefits and earning rates ride along
 * as JSON in a hidden field so a template can fill in a dozen rows at once
 * and the server can create the whole card in one transaction.
 */
export type BenefitDraft = {
  /** Present when editing an existing row; its usage history is kept. */
  id?: string;
  name: string;
  category: BenefitCategory;
  frequency: BenefitFrequency;
  /** Dollars as typed, e.g. "15" or "12.50". Empty for perks without a meter. */
  value: string;
  requiresEnrollment: boolean;
  enrolled: boolean;
  notes: string;
};

export type RateDraft = {
  id?: string;
  category: SpendCategory;
  /** As typed, e.g. "4" or "1.5". */
  multiplier: string;
  notes: string;
};

export function emptyBenefitDraft(): BenefitDraft {
  return {
    name: "",
    category: "OTHER",
    frequency: "MONTHLY",
    value: "",
    requiresEnrollment: false,
    enrolled: false,
    notes: "",
  };
}

export function emptyRateDraft(): RateDraft {
  return { category: "EVERYTHING_ELSE", multiplier: "1", notes: "" };
}
