"use client";

import { useEffect, useState } from "react";

/** Seconds since `running` became true; 0 whenever it isn't running. */
export function useElapsed(running: boolean) {
  const [clock, setClock] = useState<{ start: number; now: number } | null>(null);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    // First tick on the next task rather than synchronously in the effect,
    // then once a second.
    const first = window.setTimeout(() => setClock({ start, now: start }), 0);
    const id = window.setInterval(() => setClock({ start, now: Date.now() }), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [running]);

  if (!running || !clock) return 0;
  return Math.max(0, Math.round((clock.now - clock.start) / 1000));
}

/** A progress line for a long server call, so a slow search never looks frozen. */
export function waitingMessage(seconds: number, what: string) {
  if (seconds < 20) return `${what}…`;
  if (seconds < 60) return `${what}… ${seconds}s. Reading the issuer's pages.`;
  if (seconds < 100) return `${what}… ${seconds}s. Still working — issuer sites can be slow.`;
  return `${what}… ${seconds}s. If nothing comes back within two minutes, try again with a more exact name.`;
}
