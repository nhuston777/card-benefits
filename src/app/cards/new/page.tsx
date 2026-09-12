import Link from "next/link";
import type { Metadata } from "next";
import { CardForm } from "@/components/cards/CardForm";
import { TemplatePicker } from "@/components/cards/TemplatePicker";
import { createCard } from "@/lib/cards/actions";
import { emptyRateDraft } from "@/lib/cards/drafts";
import { findTemplate, templateBenefitDrafts, templateRateDrafts } from "@/lib/cards/templates";

export const metadata: Metadata = { title: "Add a card · Card Benefits" };

export default async function NewCardPage({ searchParams }: PageProps<"/cards/new">) {
  const { template: templateParam } = await searchParams;
  const slug = Array.isArray(templateParam) ? templateParam[0] : templateParam;
  const template = findTemplate(slug);
  const showForm = slug === "blank" || template != null;

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={showForm ? "/cards/new" : "/"}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-terracotta-dark)]"
      >
        ← {showForm ? "Pick a different card" : "Back"}
      </Link>
      <h1 className="mt-2 mb-1 font-heading text-2xl text-[var(--color-ink)] sm:text-3xl">
        {template ? `Add ${template.name}` : showForm ? "Add a card" : "Which card?"}
      </h1>
      <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
        {showForm
          ? "Check every line — especially the open date, which drives renewal reminders."
          : "Start from a preset and fix what's changed, or build it from scratch."}
      </p>

      {showForm ? (
        <div className="rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 p-5 shadow-sm sm:p-7">
          <CardForm
            key={slug}
            action={createCard}
            submitLabel="Add card"
            card={
              template
                ? {
                    name: template.name,
                    issuer: template.issuer,
                    annualFee: template.annualFee,
                    pointValueCents: template.pointValueCents,
                    color: template.color,
                  }
                : undefined
            }
            initialBenefits={template ? templateBenefitDrafts(template) : []}
            initialRates={template ? templateRateDrafts(template) : [emptyRateDraft()]}
            templateNote={
              template
                ? `Prefilled from the ${template.name} preset (terms as of late 2025). Amounts and rules drift — compare against your card's benefits page before saving.`
                : undefined
            }
          />
        </div>
      ) : (
        <TemplatePicker />
      )}
    </div>
  );
}
