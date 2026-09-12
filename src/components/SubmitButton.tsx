"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-6 py-3 text-sm font-medium text-white shadow-[0_6px_16px_-4px_rgba(191,91,63,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-4px_rgba(191,91,63,0.55)] disabled:pointer-events-none disabled:opacity-60 disabled:translate-y-0"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
