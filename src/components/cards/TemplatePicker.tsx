import Link from "next/link";
import { CARD_TEMPLATES } from "@/lib/cards/templates";
import { formatDollars } from "@/lib/cards/money";
import { CardArt } from "./CardArt";

export function TemplatePicker() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {CARD_TEMPLATES.map((t) => (
          <Link
            key={t.slug}
            href={`/cards/new?template=${t.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-[var(--color-clay)]/80 bg-white/80 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-terracotta)]/50 hover:shadow"
          >
            <CardArt card={{ name: t.name, issuer: t.issuer, lastFour: null, color: t.color }} size="sm" />
            <span className="min-w-0">
              <span className="block truncate font-medium text-[var(--color-ink)]">{t.name}</span>
              <span className="block text-xs text-[var(--color-ink-soft)]">
                {t.annualFee > 0 ? `${formatDollars(t.annualFee)} fee` : "No fee"} · {t.benefits.length} benefits
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Link
        href="/cards/new?template=blank"
        className="block rounded-2xl border border-dashed border-[var(--color-clay)] bg-white/50 px-4 py-4 text-center text-sm font-medium text-[var(--color-ink)] transition hover:border-[var(--color-terracotta)]/60 hover:bg-white/80"
      >
        Start from scratch →
      </Link>
      <p className="text-xs text-[var(--color-ink-soft)]">
        Presets reflect published terms as of late 2025. Issuers change these often — you&apos;ll get to
        review and fix every line before saving.
      </p>
    </div>
  );
}
