"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import {
  BENEFIT_CATEGORIES,
  BENEFIT_FREQUENCIES,
  SPEND_CATEGORIES,
  type BenefitCategory,
  type BenefitFrequency,
  type SpendCategory,
} from "./constants";
import type { BenefitDraft, RateDraft } from "./drafts";
import { parseDollarsToCents } from "./money";
import { currentPeriod, parseDateOnly } from "./periods";
import { LookupError, isLookupConfigured, lookupCardBenefits, type CardLookupResult } from "./lookup";
import { ScreenshotError, readBenefitScreenshots, type ScreenshotImage } from "./screenshot";
import { summarizeCard } from "./summary";

export type ActionState = { error?: string };

export type LookupState = {
  result?: CardLookupResult;
  error?: string;
  /** True when the failure is a missing API key rather than a bad search. */
  notConfigured?: boolean;
};

function includes<T extends string>(list: readonly T[], value: string): value is T {
  return (list as readonly string[]).includes(value);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseJson<T>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("The form data was corrupted — reload and try again");
  }
}

type ParsedBenefit = {
  id?: string;
  name: string;
  category: BenefitCategory;
  frequency: BenefitFrequency;
  valueCents: number | null;
  requiresEnrollment: boolean;
  enrolled: boolean;
  notes: string | null;
  sortOrder: number;
};

function parseBenefits(raw: string): ParsedBenefit[] {
  const drafts = parseJson<BenefitDraft[]>(raw, []);
  if (!Array.isArray(drafts)) throw new Error("Benefits didn't come through");

  return drafts
    .map((d, index) => {
      const name = String(d.name ?? "").trim();
      const category = String(d.category ?? "OTHER");
      const frequency = String(d.frequency ?? "ANNUAL");
      if (!includes(BENEFIT_CATEGORIES, category)) throw new Error(`Bad category on "${name}"`);
      if (!includes(BENEFIT_FREQUENCIES, frequency)) throw new Error(`Bad frequency on "${name}"`);

      const valueCents = frequency === "ONGOING" ? null : parseDollarsToCents(d.value);
      if (valueCents != null && valueCents < 0) throw new Error(`"${name}" can't have a negative value`);

      return {
        id: typeof d.id === "string" && d.id ? d.id : undefined,
        name,
        category,
        frequency,
        valueCents,
        requiresEnrollment: Boolean(d.requiresEnrollment),
        enrolled: Boolean(d.requiresEnrollment) && Boolean(d.enrolled),
        notes: String(d.notes ?? "").trim() || null,
        sortOrder: index,
      };
    })
    .filter((b) => b.name !== "");
}

type ParsedRate = { category: SpendCategory; multiplier: number; notes: string | null };

function parseRates(raw: string): ParsedRate[] {
  const drafts = parseJson<RateDraft[]>(raw, []);
  if (!Array.isArray(drafts)) throw new Error("Earning rates didn't come through");

  const seen = new Set<string>();
  const out: ParsedRate[] = [];
  for (const d of drafts) {
    const category = String(d.category ?? "");
    const multiplier = Number(d.multiplier);
    if (!includes(SPEND_CATEGORIES, category)) throw new Error("Bad spend category");
    if (!Number.isFinite(multiplier) || multiplier <= 0) continue;
    if (seen.has(category)) continue; // keep the first row for a repeated category
    seen.add(category);
    out.push({ category, multiplier, notes: String(d.notes ?? "").trim() || null });
  }
  return out;
}

function buildCardData(formData: FormData) {
  const name = text(formData, "name");
  if (!name) throw new Error("Give the card a name");

  const annualFee = Math.round(Number(text(formData, "annualFee") || 0));
  if (!Number.isFinite(annualFee) || annualFee < 0) throw new Error("Annual fee must be 0 or more");

  const pointValueRaw = text(formData, "pointValueCents");
  const pointValueCents = pointValueRaw === "" ? 1 : Number(pointValueRaw);
  if (!Number.isFinite(pointValueCents) || pointValueCents <= 0) {
    throw new Error("Point value must be a positive number of cents");
  }

  const lastFour = text(formData, "lastFour");
  if (lastFour && !/^\d{4}$/.test(lastFour)) throw new Error("Last four should be 4 digits");

  const openedRaw = text(formData, "openedOn");
  const openedOn = openedRaw ? parseDateOnly(openedRaw) : null;
  if (openedRaw && !openedOn) throw new Error("Open date isn't a valid date");

  const color = text(formData, "color") || "#3a2f28";
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Color must be a hex value like #1f2a44");

  const feeWaived = formData.get("feeWaived") != null;
  const waivedUntilRaw = text(formData, "feeWaivedUntil");
  const feeWaivedUntil = feeWaived && waivedUntilRaw ? parseDateOnly(waivedUntilRaw) : null;
  if (feeWaived && waivedUntilRaw && !feeWaivedUntil) {
    throw new Error("Waiver end date isn't a valid date");
  }

  return {
    name,
    issuer: text(formData, "issuer") || null,
    lastFour: lastFour || null,
    annualFee,
    feeWaived,
    feeWaivedUntil,
    openedOn,
    pointValueCents,
    color,
    notes: text(formData, "notes") || null,
    benefits: parseBenefits(text(formData, "benefitsJson")),
    rates: parseRates(text(formData, "ratesJson")),
  };
}

function revalidateCard(id?: string) {
  revalidatePath("/");
  if (id) revalidatePath(`/cards/${id}`);
}

export async function createCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const { benefits, rates, ...card } = buildCardData(formData);
    const created = await prisma.creditCard.create({
      data: {
        ...card,
        benefits: {
          // Drafts never carry ids on create; strip the key so Prisma
          // doesn't see an explicit `undefined`.
          create: benefits.map((b) => {
            const { id: _draftId, ...rest } = b;
            void _draftId;
            return rest;
          }),
        },
        earningRates: { create: rates },
      },
    });
    id = created.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidateCard(id);
  redirect(`/cards/${id}`);
}

export async function updateCard(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const { benefits, rates, ...card } = buildCardData(formData);

    const existing = await prisma.creditCard.findUnique({
      where: { id },
      include: { benefits: { select: { id: true } } },
    });
    if (!existing) throw new Error("That card no longer exists");

    const existingIds = new Set(existing.benefits.map((b) => b.id));
    const keptIds = new Set(benefits.filter((b) => b.id && existingIds.has(b.id)).map((b) => b.id!));

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.creditCard.update({ where: { id }, data: card }),
      // Rates carry no history, so replacing them wholesale is simplest.
      prisma.earningRate.deleteMany({ where: { cardId: id } }),
      prisma.earningRate.createMany({ data: rates.map((r) => ({ ...r, cardId: id })) }),
      prisma.benefit.deleteMany({
        where: { cardId: id, id: { notIn: [...keptIds] } },
      }),
    ];
    for (const { id: benefitId, ...data } of benefits) {
      if (benefitId && keptIds.has(benefitId)) {
        ops.push(prisma.benefit.update({ where: { id: benefitId }, data }));
      } else {
        ops.push(prisma.benefit.create({ data: { ...data, cardId: id } }));
      }
    }
    await prisma.$transaction(ops);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidateCard(id);
  redirect(`/cards/${id}`);
}

export async function deleteCard(id: string) {
  await prisma.creditCard.delete({ where: { id } });
  revalidateCard(id);
  redirect("/");
}

export async function setCardArchived(id: string, archived: boolean) {
  await prisma.creditCard.update({ where: { id }, data: { archived } });
  revalidateCard(id);
}

async function loadBenefit(benefitId: string) {
  const benefit = await prisma.benefit.findUnique({
    where: { id: benefitId },
    include: { card: true, usages: true },
  });
  if (!benefit) throw new Error("That benefit no longer exists");
  return benefit;
}

/**
 * Logs spend against a benefit's current window. `amount` is dollars as typed;
 * leave it blank to use up whatever is left.
 */
export async function recordUsage(
  benefitId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  let cardId: string;
  try {
    const benefit = await loadBenefit(benefitId);
    cardId = benefit.cardId;

    const period = currentPeriod(benefit.frequency as BenefitFrequency, benefit.card.openedOn);
    const usedSoFar = benefit.usages
      .filter((u) => u.periodKey === period.key)
      .reduce((s, u) => s + u.amountCents, 0);
    const remaining = benefit.valueCents == null ? null : Math.max(0, benefit.valueCents - usedSoFar);

    const typed = parseDollarsToCents(formData.get("amount"));
    const amountCents = typed ?? remaining;
    if (amountCents == null) throw new Error("Enter an amount");
    if (amountCents <= 0) throw new Error("Amount must be more than $0");

    await prisma.benefitUsage.create({
      data: {
        benefitId,
        periodKey: period.key,
        amountCents,
        note: text(formData, "note") || null,
      },
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidateCard(cardId);
  return {};
}

/** One-click "used it": logs whatever is left in the current window. */
export async function markBenefitUsed(benefitId: string) {
  const benefit = await loadBenefit(benefitId);
  if (benefit.valueCents == null) return;

  const period = currentPeriod(benefit.frequency as BenefitFrequency, benefit.card.openedOn);
  const usedSoFar = benefit.usages
    .filter((u) => u.periodKey === period.key)
    .reduce((s, u) => s + u.amountCents, 0);
  const remaining = benefit.valueCents - usedSoFar;
  if (remaining <= 0) return;

  await prisma.benefitUsage.create({
    data: { benefitId, periodKey: period.key, amountCents: remaining },
  });
  revalidateCard(benefit.cardId);
}

export async function deleteUsage(usageId: string) {
  const usage = await prisma.benefitUsage.findUnique({
    where: { id: usageId },
    include: { benefit: { select: { cardId: true } } },
  });
  if (!usage) return;
  await prisma.benefitUsage.delete({ where: { id: usageId } });
  revalidateCard(usage.benefit.cardId);
}

export async function setBenefitEnrolled(benefitId: string, enrolled: boolean) {
  const benefit = await prisma.benefit.update({
    where: { id: benefitId },
    data: { enrolled },
    select: { cardId: true },
  });
  revalidateCard(benefit.cardId);
}

/** Researches a card online and returns its benefits as form rows to review. */
export async function lookupBenefits(name: string, issuer: string): Promise<LookupState> {
  if (!isLookupConfigured() && !process.env.CARD_LOOKUP_FIXTURE) {
    return {
      notConfigured: true,
      error: "Online lookup isn't turned on. Add ANTHROPIC_API_KEY in Vercel's environment variables and redeploy.",
    };
  }
  try {
    return { result: await lookupCardBenefits(String(name ?? ""), String(issuer ?? "")) };
  } catch (e) {
    if (e instanceof LookupError) return { error: e.message };
    console.error("Card lookup failed", e);
    return { error: "The lookup failed. Try again in a moment." };
  }
}

/**
 * Appends reviewed lookup results to an existing card. Rates are only added
 * when the card has none, so a hand-tuned set isn't quietly duplicated.
 */
export async function addBenefitsToCard(
  cardId: string,
  benefitsJson: string,
  ratesJson: string
): Promise<ActionState> {
  try {
    const card = await prisma.creditCard.findUnique({
      where: { id: cardId },
      include: { benefits: { select: { sortOrder: true } }, earningRates: { select: { id: true } } },
    });
    if (!card) throw new Error("That card no longer exists");

    const benefits = parseBenefits(benefitsJson);
    const rates = card.earningRates.length === 0 ? parseRates(ratesJson) : [];
    if (benefits.length === 0 && rates.length === 0) throw new Error("Nothing selected to add");

    const nextOrder = card.benefits.reduce((m, b) => Math.max(m, b.sortOrder + 1), 0);
    await prisma.$transaction([
      prisma.benefit.createMany({
        data: benefits.map(({ id: _draftId, ...b }, i) => {
          void _draftId;
          return { ...b, sortOrder: nextOrder + i, cardId };
        }),
      }),
      prisma.earningRate.createMany({ data: rates.map((r) => ({ ...r, cardId })) }),
    ]);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidateCard(cardId);
  return {};
}

// ---------------------------------------------------------------------------
// Update from screenshots
// ---------------------------------------------------------------------------

/** One benefit's reading from the screenshots, with the change it implies. */
export type ScreenshotRow = {
  benefitId: string;
  name: string;
  periodKey: string;
  periodLabel: string;
  valueCents: number | null;
  /** What the tracker already has logged for this period. */
  loggedCents: number;
  /** What the screenshots say has been used this period, if readable. */
  reportedUsedCents: number | null;
  /** Usage to add (negative when the tracker had logged more than the issuer shows). */
  deltaCents: number;
  enrolled: boolean | null;
  /** True when the screenshot's enrollment state differs from what's stored. */
  enrolledChange: boolean;
  confidence: "high" | "medium" | "low";
  evidence: string;
};

export type ScreenshotState = {
  rows?: ScreenshotRow[];
  unmatched?: string[];
  notes?: string | null;
  error?: string;
};

const SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SCREENSHOTS = 6;
const MAX_SCREENSHOT_BYTES = 1_500_000;

/** Reads issuer-app screenshots and proposes per-benefit usage updates. Nothing is written. */
export async function readScreenshots(cardId: string, formData: FormData): Promise<ScreenshotState> {
  try {
    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new ScreenshotError("Add at least one screenshot");
    if (files.length > MAX_SCREENSHOTS) throw new ScreenshotError(`Up to ${MAX_SCREENSHOTS} screenshots at a time`);

    const images: ScreenshotImage[] = [];
    for (const file of files) {
      if (!SCREENSHOT_TYPES.has(file.type)) throw new ScreenshotError(`${file.name || "A file"} isn't a JPEG, PNG, or WebP image`);
      if (file.size > MAX_SCREENSHOT_BYTES) throw new ScreenshotError(`${file.name || "A screenshot"} is too large after compression — try a tighter crop`);
      images.push({
        mediaType: file.type as ScreenshotImage["mediaType"],
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      });
    }

    const card = await prisma.creditCard.findUnique({
      where: { id: cardId },
      include: { benefits: { include: { usages: true } }, earningRates: true },
    });
    if (!card) throw new ScreenshotError("That card no longer exists");

    const statuses = summarizeCard(card).benefits.filter((b) => b.state !== "perk" || b.benefit.requiresEnrollment);
    const report = await readBenefitScreenshots(card.name, card.issuer, statuses, images);

    const byId = new Map(statuses.map((s) => [s.benefit.id, s]));
    const rows: ScreenshotRow[] = [];
    for (const r of report.readings) {
      const s = byId.get(r.benefitId);
      if (!s) continue;
      const value = s.valueCents;
      let reported: number | null = null;
      if (r.usedDollars != null) reported = Math.round(r.usedDollars * 100);
      else if (r.remainingDollars != null && value != null) reported = value - Math.round(r.remainingDollars * 100);
      if (reported != null) {
        reported = Math.max(0, value != null ? Math.min(value, reported) : reported);
      }
      const enrolledChange =
        r.enrolled != null && s.benefit.requiresEnrollment && r.enrolled !== s.benefit.enrolled;
      rows.push({
        benefitId: s.benefit.id,
        name: s.benefit.name,
        periodKey: s.period.key,
        periodLabel: s.period.label,
        valueCents: value,
        loggedCents: s.usedCents,
        reportedUsedCents: reported,
        deltaCents: reported == null ? 0 : reported - s.usedCents,
        enrolled: r.enrolled,
        enrolledChange,
        confidence: r.confidence,
        evidence: r.evidence,
      });
    }
    return { rows, unmatched: report.unmatched, notes: report.notes };
  } catch (e) {
    if (e instanceof ScreenshotError) return { error: e.message };
    console.error("Screenshot read failed", e);
    return { error: "Couldn't read the screenshots. Try again in a moment." };
  }
}

/** Applies the rows the user confirmed: a usage adjustment per benefit, plus enrollment flags. */
export async function applyScreenshotRows(cardId: string, rowsJson: string): Promise<ActionState> {
  try {
    const rows = parseJson<ScreenshotRow[]>(rowsJson, []);
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("Nothing selected to apply");

    const benefits = await prisma.benefit.findMany({
      where: { cardId, id: { in: rows.map((r) => String(r.benefitId)) } },
      select: { id: true, requiresEnrollment: true },
    });
    const allowed = new Map(benefits.map((b) => [b.id, b]));
    const stamp = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    for (const row of rows) {
      const benefit = allowed.get(String(row.benefitId));
      if (!benefit) continue;
      const delta = Math.round(Number(row.deltaCents));
      if (Number.isFinite(delta) && delta !== 0 && typeof row.periodKey === "string" && row.periodKey) {
        ops.push(
          prisma.benefitUsage.create({
            data: {
              benefitId: benefit.id,
              periodKey: row.periodKey,
              amountCents: delta,
              note: delta > 0 ? `From screenshot, ${stamp}` : `Correction from screenshot, ${stamp}`,
            },
          })
        );
      }
      if (row.enrolledChange && typeof row.enrolled === "boolean" && benefit.requiresEnrollment) {
        ops.push(prisma.benefit.update({ where: { id: benefit.id }, data: { enrolled: row.enrolled } }));
      }
    }
    if (ops.length === 0) throw new Error("Nothing to change — the tracker already matches");
    await prisma.$transaction(ops);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong" };
  }
  revalidateCard(cardId);
  return {};
}
