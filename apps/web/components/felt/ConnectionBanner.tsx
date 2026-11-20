"use client";

import { sr } from "@/lib/sr";

/**
 * Naša veza sa stolom je prekinuta (QA 2026-11-07 PK-B3). Bez nje sto izgleda
 * živ — sat teče, a dodir ne stiže do servera. Traka stoji iznad stola i ne
 * hvata dodir; potez zaključava sam sto (`offline` prop).
 */
export function ConnectionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="conn-lost" role="status" aria-live="polite">
      <span className="conn-lost__dot" aria-hidden="true" />
      <span>{sr.connection.lost}</span>
    </div>
  );
}
