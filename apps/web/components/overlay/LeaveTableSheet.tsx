"use client";

import { Sheet } from "@/components/sheet/Sheet";
import { sr } from "@/lib/sr";

/**
 * „Napusti partiju?" — dok partija traje (QA B1/B11). Ulazi su meni stola,
 * pauza i Android nazad. Isti obrazac kao `LogoutSheet`: `Sheet` sam zatvara
 * na scrim, Escape i Android nazad, pa drugi „nazad" znači „Ostani".
 */
export function LeaveTableSheet({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.leaveTable.title} closeLabel={sr.leaveTable.stay} onClose={onClose}>
      <p className="sheet__note">{sr.leaveTable.body}</p>
      <button type="button" className="home__cta sheet__btn" onClick={onConfirm}>
        {sr.leaveTable.confirm}
      </button>
    </Sheet>
  );
}
