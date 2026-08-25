"use client";

import { useEffect, useState } from "react";

/**
 * useCountdown — pretvara server-authoritative `deadline` (epoch ms) u
 * preostale sekunde, tako da prezentacijske komponente (TurnPill) primaju
 * broj i ne drže sat u sebi.
 *
 * SSR-safe: prvi render (i prva hidracija) je determinističan iz props-a —
 * vraća PUN timer, jer `now` je null dok se interval ne pokrene. Bez toga
 * server i klijent izračunaju različit broj sekundi → hydration mismatch.
 * Isti obrazac koji je držao stari `TurnTimer` (v3.2).
 *
 * `deadline == null` → 0 (nema aktivnog poteza).
 */
export function useCountdown(
  deadline: number | undefined | null,
  totalSeconds = 30,
  tickMs = 250,
): number {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (deadline == null) return;
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [deadline, tickMs]);

  if (deadline == null) return 0;

  // now === null (SSR + prva hidracija) → pun timer, determinističan.
  const current = now ?? deadline - totalSeconds * 1000;
  const remainingMs = Math.max(0, deadline - current);
  return remainingMs / 1000;
}
