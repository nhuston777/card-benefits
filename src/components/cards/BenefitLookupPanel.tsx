"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBenefitsToCard, lookupBenefits, type LookupState } from "@/lib/cards/actions";
import {
  BENEFIT_CATEGORY_ICONS,
  FREQUENCY_LABELS,
  SPEND_CATEGORY_LABELS,
} from "@/lib/cards/constants";
import { useElapsed, waitingMessage } from "./useElapsed";

/**
 * Shown on a card that has no benefits yet: one click researches the card
 * online, the findings come back as a checklist, and only what the user
 * confirms is written.
 */
export function BenefitLookupPanel({
  cardId,
  cardName,
  issuer,
  hasRates,
}: {
  cardId: string;
  cardName: string;
  issuer: string;
  hasRates: boolean;
}) {
  const router = useRouter();
  const [searching, startSearch] = useTransition();
  const seconds = useElapsed(searching);
  const [saving, startSave] = useTransition();
  const [lookup, setLookup] = useState<LookupState | null>(null);
  const [picked, setPicked] = useState<boolean[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  function search() {
    setLookup(null);
    setSaveError(null);
    startSearch(async () => {
      const res = await lookupBenefits(cardName, issuer);
      setLookup(res);
      setPicked(res.result ? res.result.benefits.map(() => true) : []);
    });
  }

  function confirm() {
    const found = lookup?.result;
    if (!found) return;
    const chosen = found.benefits.filter((_, i) => picked[i]);
    setSaveError(null);
    startSave(async () => {
      const res = await addBenefitsToCard(
        cardId,
        JSON.stringify(chosen),
        JSON.stringify(hasRates ? [] : found.earningRates)
      );
      if (res.error) setSaveError(res.error);
      else router.refresh();
    });
  }

  const found = lookup?.result;
  const chosenCount = picked.filter(Boolean).length;

  return (
    <div className="rounded-2xl border border-[var(--color-terracotta)]/40 bg-white/80 p-5 shadow-sm">
      {!found && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-xl text-[var(--color-ink)]">No benefits on file yet</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Search the issuer&apos;s site for {cardName}&apos;s current credits and perks, then confirm
              which ones to add.
            </p>
          </div>
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="shrink-0 rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px disabled:opacity-60"
          >
            {searching ? "Searching…" : "🔎 Find its benefits"}
          </button>
        </div>
      )}

      {searching && (
        <p role="status" className="mt-3 text-sm text-[var(--color-ink-soft)]">
          {waitingMessage(seconds, "Checking the issuer's benefits page")}
        </p>
      )}

      {lookup?.error && !searching && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {lookup.error}
        </p>
      )}

      {found && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-heading text-xl text-[var(--color-ink)]">
              Found {found.benefits.length} benefit{found.benefits.length === 1 ? "" : "s"} for {found.cardName}
            </h2>
            <button type="button" onClick={search} className="text-xs text-[var(--color-ink-soft)] underline">
              Search again
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Untick anything that doesn&apos;t apply to you. You can edit amounts and fine print afterwards.
            {found.annualFee != null && ` Annual fee reported: $${found.annualFee}.`}
          </p>
          {found.caveats && (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {found.caveats}
            </p>
          )}

          <ul className="mt-4 space-y-2">
            {found.benefits.map((b, i) => (
              <li key={`${b.name}-${i}`}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-clay)]/80 bg-white px-3.5 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={picked[i] ?? false}
                    onChange={(e) => setPicked((p) => p.map((v, j) => (j === i ? e.target.checked : v)))}
                    className="mt-1 accent-[var(--color-terracotta)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-[var(--color-ink)]">
                      {BENEFIT_CATEGORY_ICONS[b.category]} {b.name}
                    </span>
                    <span className="block text-xs text-[var(--color-ink-soft)]">
                      {b.value ? `$${b.value} · ` : ""}
                      {FREQUENCY_LABELS[b.frequency]}
                      {b.requiresEnrollment ? " · needs enrollment" : ""}
                      {b.notes ? ` · ${b.notes}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {!hasRates && found.earningRates.length > 0 && (
            <p className="mt-3 text-xs text-[var(--color-ink-soft)]">
              Earning rates to add:{" "}
              {found.earningRates
                .map((r) => `${r.multiplier}x ${SPEND_CATEGORY_LABELS[r.category].toLowerCase()}`)
                .join(", ")}
              .
            </p>
          )}

          {found.sources.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-soft)]">
              <span>Sources:</span>
              {found.sources.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="underline">
                  {new URL(url).hostname.replace(/^www\./, "")}
                </a>
              ))}
            </p>
          )}

          {saveError && <p className="mt-3 text-sm text-rose-700">{saveError}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={confirm}
              disabled={saving || (chosenCount === 0 && (hasRates || found.earningRates.length === 0))}
              className="rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px disabled:opacity-60"
            >
              {saving ? "Adding…" : `Add ${chosenCount} benefit${chosenCount === 1 ? "" : "s"}`}
            </button>
            <button
              type="button"
              onClick={() => setLookup(null)}
              className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
