"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/cards/actions";
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_LABELS,
  BENEFIT_FREQUENCIES,
  CARD_COLORS,
  FREQUENCY_LABELS,
  SPEND_CATEGORIES,
  SPEND_CATEGORY_LABELS,
  type BenefitCategory,
  type BenefitFrequency,
  type SpendCategory,
} from "@/lib/cards/constants";
import { emptyBenefitDraft, emptyRateDraft, type BenefitDraft, type RateDraft } from "@/lib/cards/drafts";
import { toDateOnlyInput } from "@/lib/cards/periods";
import { SubmitButton } from "@/components/SubmitButton";

const inputClass =
  "w-full rounded-xl border border-[var(--color-clay)] bg-white px-3.5 py-2.5 text-[var(--color-ink)] placeholder:text-stone-400 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/20";
const smallInputClass =
  "w-full rounded-lg border border-[var(--color-clay)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-ink)] placeholder:text-stone-400 focus:border-[var(--color-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--color-terracotta)]/20";
const labelClass = "text-sm font-medium text-[var(--color-ink-soft)]";
const ghostButton =
  "rounded-full border border-[var(--color-clay)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-cream-dim)]";

/** Fields the form seeds from — a saved card, or a preset's defaults. */
export type CardDefaults = {
  name?: string;
  issuer?: string | null;
  lastFour?: string | null;
  annualFee?: number;
  feeWaived?: boolean;
  feeWaivedUntil?: Date | null;
  openedOn?: Date | null;
  pointValueCents?: number;
  color?: string;
  notes?: string | null;
};

export function CardForm({
  card,
  initialBenefits,
  initialRates,
  action,
  submitLabel,
  templateNote,
}: {
  card?: CardDefaults;
  initialBenefits: BenefitDraft[];
  initialRates: RateDraft[];
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  templateNote?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [benefits, setBenefits] = useState<BenefitDraft[]>(initialBenefits);
  const [rates, setRates] = useState<RateDraft[]>(initialRates);
  const [color, setColor] = useState(card?.color ?? CARD_COLORS[0]);
  const [pointValue, setPointValue] = useState(String(card?.pointValueCents ?? 1));
  const [feeWaived, setFeeWaived] = useState(card?.feeWaived ?? false);

  function updateBenefit(index: number, patch: Partial<BenefitDraft>) {
    setBenefits((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }
  function removeBenefit(index: number) {
    setBenefits((prev) => prev.filter((_, i) => i !== index));
  }
  function moveBenefit(index: number, dir: -1 | 1) {
    setBenefits((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function updateRate(index: number, patch: Partial<RateDraft>) {
    setRates((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  const isCashBack = Number(pointValue) === 1;

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="benefitsJson" value={JSON.stringify(benefits)} />
      <input type="hidden" name="ratesJson" value={JSON.stringify(rates)} />

      {templateNote && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {templateNote}
        </p>
      )}

      {/* ---- The card ------------------------------------------------- */}
      <section className="space-y-4">
        <h2 className="font-heading text-lg text-[var(--color-ink)]">The card</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelClass}>Card name *</span>
            <input
              name="name"
              required
              defaultValue={card?.name ?? ""}
              placeholder="Amex Gold"
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Issuer</span>
            <input
              name="issuer"
              defaultValue={card?.issuer ?? ""}
              placeholder="American Express"
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Last four digits</span>
            <input
              name="lastFour"
              inputMode="numeric"
              pattern="\d{4}"
              maxLength={4}
              defaultValue={card?.lastFour ?? ""}
              placeholder="1005"
              className={`${inputClass} mt-1`}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Annual fee ($)</span>
            <input
              name="annualFee"
              type="number"
              min={0}
              step={1}
              defaultValue={card?.annualFee ?? 0}
              className={`${inputClass} mt-1`}
            />
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
              <input
                type="checkbox"
                name="feeWaived"
                checked={feeWaived}
                onChange={(e) => setFeeWaived(e.target.checked)}
                className="accent-[var(--color-terracotta)]"
              />
              Not being charged right now (military waiver, promo)
            </label>
            {feeWaived && (
              <span className="mt-2 block">
                <span className="text-xs text-[var(--color-ink-soft)]">Waiver ends on</span>
                <input
                  name="feeWaivedUntil"
                  type="date"
                  defaultValue={toDateOnlyInput(card?.feeWaivedUntil)}
                  className={`${inputClass} mt-1`}
                />
                <span className="mt-1 block text-xs text-[var(--color-ink-soft)]">
                  Retirement or separation date, for instance. The fee resumes at the first
                  anniversary after this, and you&apos;ll get a keep-or-downgrade verdict ahead of it.
                </span>
              </span>
            )}
          </label>
          <label className="block">
            <span className={labelClass}>Opened on</span>
            <input
              name="openedOn"
              type="date"
              defaultValue={toDateOnlyInput(card?.openedOn)}
              className={`${inputClass} mt-1`}
            />
            <span className="mt-1 block text-xs text-[var(--color-ink-soft)]">
              Sets the anniversary for renewal reminders and cardmember-year credits.
            </span>
          </label>
          <label className="block">
            <span className={labelClass}>What a point is worth to you (¢)</span>
            <input
              name="pointValueCents"
              type="number"
              min={0.1}
              step={0.1}
              value={pointValue}
              onChange={(e) => setPointValue(e.target.value)}
              className={`${inputClass} mt-1`}
            />
            <span className="mt-1 block text-xs text-[var(--color-ink-soft)]">
              {isCashBack
                ? "1¢ = plain cash back. Use 1.5–2 for transferable points you redeem well."
                : `4x on this card ≈ ${(4 * (Number(pointValue) || 0)).toFixed(1)}% back.`}
            </span>
          </label>
          <div>
            <span className={labelClass}>Card color</span>
            <input type="hidden" name="color" value={color} />
            <div className="mt-2 flex flex-wrap gap-2">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={color === c}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                    color === c ? "ring-2 ring-[var(--color-ink)]" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="block sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea
              name="notes"
              rows={2}
              defaultValue={card?.notes ?? ""}
              placeholder="Authorized users, retention offers you've gotten, product-change history…"
              className={`${inputClass} mt-1`}
            />
          </label>
        </div>
      </section>

      {/* ---- Benefits ------------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg text-[var(--color-ink)]">Benefits &amp; credits</h2>
            <p className="text-xs text-[var(--color-ink-soft)]">
              One row per credit. Leave the value blank for perks with no dollar meter, like lounge access.
            </p>
          </div>
          <button
            type="button"
            className={ghostButton}
            onClick={() => setBenefits((prev) => [...prev, emptyBenefitDraft()])}
          >
            + Add benefit
          </button>
        </div>

        {benefits.length === 0 && (
          <p className="rounded-xl border border-dashed border-[var(--color-clay)] px-4 py-6 text-center text-sm text-[var(--color-ink-soft)]">
            No benefits yet. Add the credits this card gives you.
          </p>
        )}

        <ul className="space-y-3">
          {benefits.map((b, i) => {
            const isPerk = b.frequency === "ONGOING";
            return (
              <li
                key={b.id ?? `new-${i}`}
                className="rounded-2xl border border-[var(--color-clay)]/80 bg-[var(--color-cream)]/60 p-3.5"
              >
                <div className="grid gap-2.5 sm:grid-cols-12">
                  <label className="block sm:col-span-5">
                    <span className="sr-only">Benefit name</span>
                    <input
                      value={b.name}
                      onChange={(e) => updateBenefit(i, { name: e.target.value })}
                      placeholder="Uber Cash"
                      className={smallInputClass}
                    />
                  </label>
                  <label className="block sm:col-span-3">
                    <span className="sr-only">Category</span>
                    <select
                      value={b.category}
                      onChange={(e) => updateBenefit(i, { category: e.target.value as BenefitCategory })}
                      className={smallInputClass}
                    >
                      {BENEFIT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {BENEFIT_CATEGORY_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="sr-only">Frequency</span>
                    <select
                      value={b.frequency}
                      onChange={(e) => updateBenefit(i, { frequency: e.target.value as BenefitFrequency })}
                      className={smallInputClass}
                    >
                      {BENEFIT_FREQUENCIES.map((f) => (
                        <option key={f} value={f}>
                          {FREQUENCY_LABELS[f]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="sr-only">Value per period in dollars</span>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                        $
                      </span>
                      <input
                        value={isPerk ? "" : b.value}
                        disabled={isPerk}
                        onChange={(e) => updateBenefit(i, { value: e.target.value })}
                        inputMode="decimal"
                        placeholder={isPerk ? "—" : "15"}
                        className={`${smallInputClass} pl-6 disabled:bg-stone-100 disabled:text-stone-400`}
                      />
                    </div>
                  </label>
                  <label className="block sm:col-span-12">
                    <span className="sr-only">Notes</span>
                    <input
                      value={b.notes}
                      onChange={(e) => updateBenefit(i, { notes: e.target.value })}
                      placeholder="Fine print: where it works, caps, how to activate…"
                      className={smallInputClass}
                    />
                  </label>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-ink-soft)]">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={b.requiresEnrollment}
                      onChange={(e) =>
                        updateBenefit(i, {
                          requiresEnrollment: e.target.checked,
                          enrolled: e.target.checked ? b.enrolled : false,
                        })
                      }
                      className="accent-[var(--color-terracotta)]"
                    />
                    Needs enrollment
                  </label>
                  {b.requiresEnrollment && (
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={b.enrolled}
                        onChange={(e) => updateBenefit(i, { enrolled: e.target.checked })}
                        className="accent-[var(--color-terracotta)]"
                      />
                      Already enrolled
                    </label>
                  )}
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBenefit(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded px-1.5 py-0.5 hover:bg-[var(--color-cream-dim)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBenefit(i, 1)}
                      disabled={i === benefits.length - 1}
                      aria-label="Move down"
                      className="rounded px-1.5 py-0.5 hover:bg-[var(--color-cream-dim)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBenefit(i)}
                      className="rounded px-2 py-0.5 text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Earning rates -------------------------------------------- */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg text-[var(--color-ink)]">Earning rates</h2>
            <p className="text-xs text-[var(--color-ink-soft)]">
              Powers &ldquo;which card should I use?&rdquo;. Include an &ldquo;everything else&rdquo; rate.
            </p>
          </div>
          <button
            type="button"
            className={ghostButton}
            onClick={() => setRates((prev) => [...prev, emptyRateDraft()])}
          >
            + Add rate
          </button>
        </div>

        <ul className="space-y-2">
          {rates.map((r, i) => (
            <li key={r.id ?? `rate-${i}`} className="grid gap-2 sm:grid-cols-12">
              <label className="block sm:col-span-4">
                <span className="sr-only">Spend category</span>
                <select
                  value={r.category}
                  onChange={(e) => updateRate(i, { category: e.target.value as SpendCategory })}
                  className={smallInputClass}
                >
                  {SPEND_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SPEND_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="sr-only">Multiplier</span>
                <div className="relative">
                  <input
                    value={r.multiplier}
                    onChange={(e) => updateRate(i, { multiplier: e.target.value })}
                    inputMode="decimal"
                    placeholder="3"
                    className={`${smallInputClass} pr-7`}
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    {isCashBack ? "%" : "x"}
                  </span>
                </div>
              </label>
              <label className="block sm:col-span-5">
                <span className="sr-only">Notes</span>
                <input
                  value={r.notes}
                  onChange={(e) => updateRate(i, { notes: e.target.value })}
                  placeholder="Caps, portal-only…"
                  className={smallInputClass}
                />
              </label>
              <button
                type="button"
                onClick={() => setRates((prev) => prev.filter((_, j) => j !== i))}
                className="rounded px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 sm:col-span-1"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>

      {state.error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        <span className="text-xs text-[var(--color-ink-soft)]">
          {benefits.filter((b) => b.name.trim()).length} benefits · {rates.length} rates
        </span>
      </div>
    </form>
  );
}
