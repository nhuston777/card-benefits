import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-clay)]/70 bg-[var(--color-cream)]/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-11 shrink-0 items-center rounded-md bg-gradient-to-br from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-1.5 shadow-sm"
            aria-hidden
          >
            <span className="block h-2.5 w-3 rounded-[2px] bg-amber-200/90" />
          </span>
          <span className="font-heading text-base leading-none text-[var(--color-ink)]">
            Card Benefits
          </span>
        </Link>
        <Link
          href="/cards/new"
          className="rounded-full border border-[var(--color-clay)] bg-white/70 px-3 py-1.5 text-sm text-[var(--color-ink)] transition hover:bg-[var(--color-cream-dim)]"
        >
          + Add card
        </Link>
      </div>
    </header>
  );
}
