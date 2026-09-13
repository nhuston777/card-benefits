import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import { anthropicClient, isAnthropicConfigured } from "./anthropic";
import type { BenefitStatus } from "./summary";
import { formatCents } from "./money";

/**
 * Reads screenshots of an issuer's app or website and reports, per benefit,
 * how much of the current period's credit has been used. The model answers
 * through a strict-schema tool call keyed by benefit id, so nothing here
 * parses prose. The caller turns the readings into proposed adjustments.
 */
export type ScreenshotImage = {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  /** Base64 without a data: prefix. */
  data: string;
};

export type BenefitReading = {
  benefitId: string;
  /** Dollars used so far in the current period, if the screenshot shows it. */
  usedDollars: number | null;
  /** Dollars still available, if that's what the screenshot shows instead. */
  remainingDollars: number | null;
  /** Whether the screenshot shows the benefit as enrolled / activated. */
  enrolled: boolean | null;
  confidence: "high" | "medium" | "low";
  /** The exact text the figure came from, e.g. "$10 of $15 used". */
  evidence: string;
};

export type ScreenshotReport = {
  readings: BenefitReading[];
  /** Credits visible in the screenshots that match none of the card's benefits. */
  unmatched: string[];
  /** Anything the user should know: a cropped figure, an ambiguous period, a different card. */
  notes: string | null;
};

const MODEL = "claude-opus-5";
const REPORT_TOOL_NAME = "report_benefit_status";

export class ScreenshotError extends Error {}

const reportTool: Anthropic.Tool = {
  name: REPORT_TOOL_NAME,
  description:
    "Report what the screenshots show for each of the card's benefits. Call exactly once. Include a reading only for benefits the screenshots actually show; leave out anything not visible.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["readings", "unmatched", "notes"],
    properties: {
      readings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["benefitId", "usedDollars", "remainingDollars", "enrolled", "confidence", "evidence"],
          properties: {
            benefitId: { type: "string", description: "One of the ids from the benefit list." },
            usedDollars: {
              type: ["number", "null"],
              description: "Amount used so far in the current period, in dollars, when shown or derivable (e.g. '$10 of $15 used' → 10). Null if only a remaining figure is shown.",
            },
            remainingDollars: {
              type: ["number", "null"],
              description: "Amount still available in the current period, in dollars, when that's what is shown (e.g. '$5 remaining', '$5 available'). Null if not shown.",
            },
            enrolled: {
              type: ["boolean", "null"],
              description: "True if the benefit is shown as enrolled/activated/added, false if an 'Enroll' or 'Activate' button is shown, null if the screenshot doesn't say.",
            },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            evidence: { type: "string", description: "The exact on-screen text the reading came from." },
          },
        },
      },
      unmatched: {
        type: "array",
        items: { type: "string" },
        description: "One line per credit visible in the screenshots that doesn't correspond to any listed benefit, with its figures.",
      },
      notes: {
        type: ["string", "null"],
        description: "Warnings for the user: a figure that looks cut off, a screenshot that seems to be a different card, a period that doesn't match, etc. Null if none.",
      },
    },
  },
};

function benefitLine(b: BenefitStatus) {
  const value = b.valueCents != null ? formatCents(b.valueCents) : "no dollar meter";
  const enrollment = b.benefit.requiresEnrollment ? ` · enrollment ${b.benefit.enrolled ? "recorded" : "not recorded"}` : "";
  return `- id=${b.benefit.id} · "${b.benefit.name}" · ${value} per ${b.period.label} · logged so far: ${formatCents(b.usedCents)}${enrollment}${
    b.benefit.notes ? ` · notes: ${b.benefit.notes}` : ""
  }`;
}

export async function readBenefitScreenshots(
  cardName: string,
  issuer: string | null,
  benefits: BenefitStatus[],
  images: ScreenshotImage[]
): Promise<ScreenshotReport> {
  if (images.length === 0) throw new ScreenshotError("Add at least one screenshot");
  if (benefits.length === 0) throw new ScreenshotError("This card has no benefits to match against yet");

  const fixture = process.env.CARD_SCREENSHOT_FIXTURE;
  if (fixture && process.env.NODE_ENV !== "production") {
    return JSON.parse(fs.readFileSync(fixture, "utf8")) as ScreenshotReport;
  }

  if (!isAnthropicConfigured()) {
    throw new ScreenshotError("Screenshot reading isn't set up: add ANTHROPIC_API_KEY to the environment.");
  }

  const client = anthropicClient();
  const today = new Date().toISOString().slice(0, 10);

  const content: Anthropic.ContentBlockParam[] = [
    ...images.map<Anthropic.ImageBlockParam>((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.data },
    })),
    {
      type: "text",
      text: `These are screenshots from the ${issuer ?? "issuer"} app or website for the card "${cardName}", taken ${today}.

The card's tracked benefits are:
${benefits.map(benefitLine).join("\n")}

For each benefit the screenshots show, report how much of the current period's credit has been used or how much remains, using the on-screen figures only. Match by name and amount; issuers phrase things differently ("Uber Cash" vs "Uber credit"), so match on meaning. If a figure is for a whole year but the benefit resets monthly, note it and pick the interpretation the screen supports. Never guess a number that isn't on screen. Then call ${REPORT_TOOL_NAME}.`,
    },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    tools: [reportTool],
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new ScreenshotError("The screenshots couldn't be read. Try clearer, uncropped screenshots.");
  }

  const call = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === REPORT_TOOL_NAME
  );
  if (!call) throw new ScreenshotError("Couldn't find benefit figures in those screenshots.");

  const report = call.input as ScreenshotReport;
  const known = new Set(benefits.map((b) => b.benefit.id));
  return {
    readings: report.readings.filter((r) => known.has(r.benefitId)),
    unmatched: report.unmatched ?? [],
    notes: report.notes?.trim() || null,
  };
}
