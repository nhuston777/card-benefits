import Link from "next/link";
import { PRIORITY_LABELS, PRIORITY_STYLES, type Suggestion } from "@/lib/cards/suggestions";

export function SuggestionList({
  suggestions,
  limit,
}: {
  suggestions: Suggestion[];
  limit?: number;
}) {
  const shown = limit ? suggestions.slice(0, limit) : suggestions;
  if (shown.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-5 py-8 text-center text-sm text-[var(--color-ink-soft)]">
        Nothing to do right now — every credit is used or has plenty of time left. 🎉
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {shown.map((s) => (
        <li key={s.id}>
          <Link
            href={s.benefitId ? `${s.href}#benefit-${s.benefitId}` : s.href}
            className="flex items-start gap-3 rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 px-4 py-3 shadow-sm transition hover:-translate-y-px hover:border-[var(--color-terracotta)]/50 hover:shadow"
          >
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${PRIORITY_STYLES[s.priority]}`}
            >
              {PRIORITY_LABELS[s.priority]}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-[var(--color-ink)]">{s.title}</span>
              <span className="mt-0.5 block text-sm text-[var(--color-ink-soft)]">{s.detail}</span>
            </span>
          </Link>
        </li>
      ))}
      {limit && suggestions.length > limit && (
        <li className="pt-1 text-center text-xs text-[var(--color-ink-soft)]">
          + {suggestions.length - limit} more on each card&apos;s page
        </li>
      )}
    </ol>
  );
}
