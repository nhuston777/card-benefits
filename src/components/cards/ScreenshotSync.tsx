"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applyScreenshotRows,
  readScreenshots,
  type ScreenshotRow,
  type ScreenshotState,
} from "@/lib/cards/actions";
import { formatCents } from "@/lib/cards/money";
import { useElapsed, waitingMessage } from "./useElapsed";

/**
 * "Where am I on each credit?" without handing over a login: the user
 * screenshots the issuer's app, the screenshots are read server-side, and
 * the per-benefit differences come back as a checklist to confirm.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

type Pending = { name: string; url: string; blob: Blob };

/** Shrinks a phone screenshot to something a few hundred KB, as JPEG. */
async function compress(file: File): Promise<Pending> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Couldn't process that image");
  return { name: file.name, url: URL.createObjectURL(blob), blob };
}

function changeLabel(row: ScreenshotRow) {
  const parts: string[] = [];
  if (row.deltaCents > 0) parts.push(`log ${formatCents(row.deltaCents)} more`);
  if (row.deltaCents < 0) parts.push(`take back ${formatCents(-row.deltaCents)}`);
  if (row.enrolledChange) parts.push(row.enrolled ? "mark enrolled" : "mark not enrolled");
  return parts.length ? parts.join(" · ") : "already matches";
}

export function ScreenshotSync({ cardId, cardName }: { cardId: string; cardName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();
  const readSeconds = useElapsed(reading);
  const [applying, startApplying] = useTransition();
  const [result, setResult] = useState<ScreenshotState | null>(null);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [applyError, setApplyError] = useState<string | null>(null);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setPrepError(null);
    try {
      const prepared = await Promise.all(Array.from(list).slice(0, 6).map(compress));
      setPending((prev) => [...prev, ...prepared].slice(0, 6));
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : "Couldn't read that file");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removePending(i: number) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, j) => j !== i);
    });
  }

  function read() {
    setResult(null);
    setApplyError(null);
    startReading(async () => {
      const fd = new FormData();
      pending.forEach((p, i) => fd.append("images", p.blob, p.name || `screenshot-${i + 1}.jpg`));
      const res = await readScreenshots(cardId, fd);
      setResult(res);
      const initial: Record<string, boolean> = {};
      for (const row of res.rows ?? []) initial[row.benefitId] = row.deltaCents !== 0 || row.enrolledChange;
      setPicked(initial);
    });
  }

  function apply() {
    const rows = (result?.rows ?? []).filter((r) => picked[r.benefitId]);
    setApplyError(null);
    startApplying(async () => {
      const res = await applyScreenshotRows(cardId, JSON.stringify(rows));
      if (res.error) {
        setApplyError(res.error);
        return;
      }
      pending.forEach((p) => URL.revokeObjectURL(p.url));
      setPending([]);
      setResult(null);
      setOpen(false);
      router.refresh();
    });
  }

  const rows = result?.rows ?? [];
  const changeable = rows.filter((r) => r.deltaCents !== 0 || r.enrolledChange);
  const selectedCount = changeable.filter((r) => picked[r.benefitId]).length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[var(--color-clay)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-cream-dim)]"
      >
        📷 Update from screenshots
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--color-terracotta)]/40 bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg text-[var(--color-ink)]">Update from screenshots</h3>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Open the {cardName} benefits screen in the issuer&apos;s app, screenshot each credit&apos;s
            &ldquo;used&rdquo; or &ldquo;remaining&rdquo; figure, and add them here. The screenshots are read and
            discarded, not stored.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          Close
        </button>
      </div>

      {!result && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border border-[var(--color-clay)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition hover:bg-[var(--color-cream-dim)]">
              + Add screenshots
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="sr-only"
              />
            </label>
            <span className="text-xs text-[var(--color-ink-soft)]">Up to 6 at a time</span>
          </div>

          {pending.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {pending.map((p, i) => (
                <li key={p.url} className="relative">
                  {/* Object URLs from the user's own device; next/image adds nothing here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-28 w-auto rounded-lg border border-[var(--color-clay)] object-cover" />
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    aria-label="Remove screenshot"
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] text-white"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {prepError && <p className="mt-2 text-sm text-rose-700">{prepError}</p>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={read}
              disabled={pending.length === 0 || reading}
              className="rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px disabled:opacity-60"
            >
              {reading ? "Reading…" : `Read ${pending.length || ""} screenshot${pending.length === 1 ? "" : "s"}`}
            </button>
            {reading && (
              <span role="status" className="text-xs text-[var(--color-ink-soft)]">
                {waitingMessage(readSeconds, "Reading")}
              </span>
            )}
          </div>
        </>
      )}

      {result?.error && (
        <div className="mt-4">
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{result.error}</p>
          <button type="button" onClick={() => setResult(null)} className="mt-2 text-sm underline">
            Try again
          </button>
        </div>
      )}

      {result && !result.error && (
        <div className="mt-4">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-soft)]">
              None of this card&apos;s benefits were recognizable in those screenshots.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const actionable = row.deltaCents !== 0 || row.enrolledChange;
                return (
                  <li key={row.benefitId}>
                    <label
                      className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
                        actionable
                          ? "cursor-pointer border-[var(--color-clay)]/80 bg-white"
                          : "border-dashed border-[var(--color-clay)]/60 bg-white/50 text-[var(--color-ink-soft)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={!actionable}
                        checked={actionable && (picked[row.benefitId] ?? false)}
                        onChange={(e) => setPicked((p) => ({ ...p, [row.benefitId]: e.target.checked }))}
                        className="mt-1 accent-[var(--color-terracotta)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-medium text-[var(--color-ink)]">{row.name}</span>
                          <span className={`text-xs font-semibold ${actionable ? "text-[var(--color-terracotta-dark)]" : ""}`}>
                            {changeLabel(row)}
                          </span>
                        </span>
                        <span className="block text-xs text-[var(--color-ink-soft)]">
                          {row.periodLabel} · tracker had {formatCents(row.loggedCents)} used
                          {row.reportedUsedCents != null && ` · screenshot shows ${formatCents(row.reportedUsedCents)} used`}
                          {row.valueCents != null && ` of ${formatCents(row.valueCents)}`}
                        </span>
                        <span className="block text-xs italic text-[var(--color-ink-soft)]">
                          &ldquo;{row.evidence}&rdquo;
                          {row.confidence !== "high" && ` · ${row.confidence} confidence`}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {result.unmatched && result.unmatched.length > 0 && (
            <div className="mt-3 rounded-xl border border-[var(--color-clay)]/70 bg-[var(--color-cream)]/60 px-3.5 py-2.5 text-xs text-[var(--color-ink-soft)]">
              <p className="font-medium text-[var(--color-ink)]">Also on screen, but not tracked yet:</p>
              <ul className="mt-1 list-disc pl-4">
                {result.unmatched.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
              <p className="mt-1">Add them on the edit page if they&apos;re worth tracking.</p>
            </div>
          )}

          {result.notes && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">{result.notes}</p>
          )}

          {applyError && <p className="mt-3 text-sm text-rose-700">{applyError}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={applying || selectedCount === 0}
              className="rounded-full bg-gradient-to-b from-[var(--color-terracotta)] to-[var(--color-terracotta-dark)] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px disabled:opacity-60"
            >
              {applying ? "Applying…" : `Apply ${selectedCount} change${selectedCount === 1 ? "" : "s"}`}
            </button>
            <button type="button" onClick={() => setResult(null)} className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Back to screenshots
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
