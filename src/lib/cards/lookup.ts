import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import {
  BENEFIT_CATEGORIES,
  BENEFIT_FREQUENCIES,
  SPEND_CATEGORIES,
  type BenefitCategory,
  type BenefitFrequency,
  type SpendCategory,
} from "./constants";
import type { BenefitDraft, RateDraft } from "./drafts";

/**
 * Looks a card up on the web and returns its current benefits in the shape
 * the card form edits. Claude runs the searches server-side and hands the
 * findings back through a strict-schema tool call, so nothing here parses
 * free text. Everything returned is a proposal for the user to confirm.
 */
export type CardLookupResult = {
  cardName: string;
  issuer: string | null;
  annualFee: number | null;
  pointValueCents: number | null;
  benefits: BenefitDraft[];
  earningRates: RateDraft[];
  sources: string[];
  caveats: string | null;
};

const MODEL = "claude-opus-5";
const MAX_SEARCHES = 8;
const MAX_TURNS = 6;

export function isLookupConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const REPORT_TOOL_NAME = "report_card_benefits";

const reportTool: Anthropic.Tool = {
  name: REPORT_TOOL_NAME,
  description:
    "Report the card's benefits once research is complete. Call this exactly once, after searching. Every credit becomes one row; a credit that pays out on two schedules (e.g. $15 monthly plus $20 in December) is one row at the regular amount with the exception in notes.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["found", "cardName", "issuer", "annualFee", "pointValueCents", "benefits", "earningRates", "sources", "caveats"],
    properties: {
      found: {
        type: "boolean",
        description: "False if no such card could be identified with reasonable confidence.",
      },
      cardName: { type: "string", description: "The card's official product name." },
      issuer: { type: ["string", "null"], description: "Bank or issuer, e.g. American Express." },
      annualFee: { type: ["number", "null"], description: "Current annual fee in whole US dollars; 0 for no fee." },
      pointValueCents: {
        type: ["number", "null"],
        description:
          "A fair value of one point or mile in cents for a typical cardholder: 1 for cash back, 1.2-1.6 for flexible transferable points, 0.5-0.7 for hotel points. Null if unknown.",
      },
      benefits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "category", "frequency", "valueDollars", "requiresEnrollment", "notes"],
          properties: {
            name: { type: "string", description: "Short name as the issuer markets it, e.g. 'Uber Cash'." },
            category: { type: "string", enum: [...BENEFIT_CATEGORIES] },
            frequency: {
              type: "string",
              enum: [...BENEFIT_FREQUENCIES],
              description:
                "How often the value resets. ANNUAL = calendar year; CARDMEMBER_YEAR = resets on the account anniversary; ONE_TIME = does not recur (Global Entry credit); ONGOING = a standing perk with no dollar meter (lounge access, insurance, elite status).",
            },
            valueDollars: {
              type: ["number", "null"],
              description: "Dollar value per period. Null for ONGOING perks or perks with no fixed dollar amount.",
            },
            requiresEnrollment: { type: "boolean", description: "True if the cardholder must opt in or enroll before the benefit works." },
            notes: {
              type: ["string", "null"],
              description: "Fine print in one sentence: where it works, caps, exceptions, expiration of a limited-time credit.",
            },
          },
        },
      },
      earningRates: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "multiplier", "notes"],
          properties: {
            category: { type: "string", enum: [...SPEND_CATEGORIES] },
            multiplier: { type: "number", description: "Points per dollar, or percent for cash back cards. Always include EVERYTHING_ELSE." },
            notes: { type: ["string", "null"], description: "Caps, portal-only rules, or null." },
          },
        },
      },
      sources: { type: "array", items: { type: "string" }, description: "URLs the figures came from, issuer pages first." },
      caveats: {
        type: ["string", "null"],
        description: "Anything the user should double-check: a refresh in progress, conflicting figures across sources, a discontinued product.",
      },
    },
  },
};

type ReportInput = {
  found: boolean;
  cardName: string;
  issuer: string | null;
  annualFee: number | null;
  pointValueCents: number | null;
  benefits: Array<{
    name: string;
    category: string;
    frequency: string;
    valueDollars: number | null;
    requiresEnrollment: boolean;
    notes: string | null;
  }>;
  earningRates: Array<{ category: string; multiplier: number; notes: string | null }>;
  sources: string[];
  caveats: string | null;
};

const SYSTEM_PROMPT = `You research US consumer credit cards and report their current benefits.

Work from the issuer's own benefits page whenever it is reachable, then one or two reputable points-and-miles sites to catch recent changes. Prefer the newest terms; issuers refreshed many premium cards in 2025 and 2026, so a figure from an older article may be stale — say so in caveats when sources disagree.

List every statement credit, membership, free night, companion certificate, anniversary bonus, lounge access, elite status, and insurance protection the card carries. Skip generic network perks (basic fraud protection, contactless) and welcome bonuses. Report dollar values per reset period, not per year, and pick the reset frequency carefully: monthly, quarterly, twice a year, calendar year, cardmember year, one-time, or ongoing.

When you have what you need, call ${REPORT_TOOL_NAME} once with the complete result. Do not describe the card in prose; the tool call is the answer.`;

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

function toDrafts(report: ReportInput): CardLookupResult {
  const benefits: BenefitDraft[] = report.benefits
    .filter((b) => b.name.trim())
    .map((b) => {
      const category: BenefitCategory = includes(BENEFIT_CATEGORIES, b.category) ? b.category : "OTHER";
      const reported: BenefitFrequency = includes(BENEFIT_FREQUENCIES, b.frequency) ? b.frequency : "ANNUAL";
      // No dollar figure means it's a perk, whatever schedule was reported;
      // a figure on an "ongoing" row means the schedule was left out, so
      // keep the money and let the user pick the reset.
      const hasValue = b.valueDollars != null && b.valueDollars > 0;
      const frequency: BenefitFrequency = !hasValue ? "ONGOING" : reported === "ONGOING" ? "ANNUAL" : reported;
      return {
        name: b.name.trim(),
        category,
        frequency,
        value: hasValue ? String(b.valueDollars) : "",
        requiresEnrollment: Boolean(b.requiresEnrollment),
        enrolled: false,
        notes: b.notes?.trim() ?? "",
      };
    });

  const seen = new Set<string>();
  const earningRates: RateDraft[] = [];
  for (const r of report.earningRates) {
    const category: SpendCategory | null = includes(SPEND_CATEGORIES, r.category) ? r.category : null;
    if (!category || seen.has(category) || !(r.multiplier > 0)) continue;
    seen.add(category);
    earningRates.push({ category, multiplier: String(r.multiplier), notes: r.notes?.trim() ?? "" });
  }

  return {
    cardName: report.cardName.trim(),
    issuer: report.issuer?.trim() || null,
    annualFee: report.annualFee != null && report.annualFee >= 0 ? Math.round(report.annualFee) : null,
    pointValueCents: report.pointValueCents != null && report.pointValueCents > 0 ? report.pointValueCents : null,
    benefits,
    earningRates,
    sources: report.sources.filter((s) => /^https?:\/\//.test(s)).slice(0, 8),
    caveats: report.caveats?.trim() || null,
  };
}

export class LookupError extends Error {}

export async function lookupCardBenefits(name: string, issuer: string): Promise<CardLookupResult> {
  const query = [name.trim(), issuer.trim()].filter(Boolean).join(" — ");
  if (!query) throw new LookupError("Enter the card's name first");

  // Local development without an API key: a JSON fixture stands in for the
  // research call so the review UI can be exercised offline.
  const fixture = process.env.CARD_LOOKUP_FIXTURE;
  if (fixture && process.env.NODE_ENV !== "production") {
    const report = JSON.parse(fs.readFileSync(fixture, "utf8")) as ReportInput;
    return toDrafts(report);
  }

  if (!isLookupConfigured()) {
    throw new LookupError("Benefit lookup isn't set up: add ANTHROPIC_API_KEY to the environment.");
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Find the current benefits, annual fee, and earning rates for this credit card: ${query}. Today is ${new Date().toISOString().slice(0, 10)}.`,
    },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES },
        reportTool,
      ],
      messages,
    });

    const report = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === REPORT_TOOL_NAME
    );
    if (report) {
      const input = report.input as ReportInput;
      if (!input.found) {
        throw new LookupError(
          `Couldn't identify a card called "${query}". Check the spelling or add the issuer.`
        );
      }
      return toDrafts(input);
    }

    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    if (response.stop_reason === "refusal") {
      throw new LookupError("The lookup was declined. Try again with the card's full official name.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new LookupError("The lookup ran too long. Try again with a more specific card name.");
    }
    // end_turn without the report tool: nudge once, then give up.
    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: `Call ${REPORT_TOOL_NAME} now with everything you found.`,
    });
  }

  throw new LookupError("The lookup didn't finish. Try again in a moment.");
}
