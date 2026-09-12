import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CardForm } from "@/components/cards/CardForm";
import { updateCard } from "@/lib/cards/actions";
import type { BenefitCategory, BenefitFrequency, SpendCategory } from "@/lib/cards/constants";
import { centsToInput } from "@/lib/cards/money";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit card · Card Benefits" };

export default async function EditCardPage({ params }: PageProps<"/cards/[id]">) {
  const { id } = await params;
  const card = await prisma.creditCard.findUnique({
    where: { id },
    include: {
      benefits: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      earningRates: { orderBy: { multiplier: "desc" } },
    },
  });
  if (!card) notFound();

  const action = updateCard.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={`/cards/${id}`}
        className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-terracotta-dark)]"
      >
        ← Back to {card.name}
      </Link>
      <h1 className="mt-2 mb-6 font-heading text-2xl text-[var(--color-ink)] sm:text-3xl">
        Edit {card.name}
      </h1>
      <div className="rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 p-5 shadow-sm sm:p-7">
        <CardForm
          card={card}
          action={action}
          submitLabel="Save changes"
          initialBenefits={card.benefits.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category as BenefitCategory,
            frequency: b.frequency as BenefitFrequency,
            value: centsToInput(b.valueCents),
            requiresEnrollment: b.requiresEnrollment,
            enrolled: b.enrolled,
            notes: b.notes ?? "",
          }))}
          initialRates={card.earningRates.map((r) => ({
            id: r.id,
            category: r.category as SpendCategory,
            multiplier: String(r.multiplier),
            notes: r.notes ?? "",
          }))}
        />
      </div>
    </div>
  );
}
