"use client";

import type { ActiveTable, GameId } from "@zandar/shared-types";

import { ArrowRightIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet/Sheet";
import { sr } from "@/lib/sr";

/**
 * „Već igraš X" (tabla `UI_VratiSe`, V5): „Igraj" ili „Igraj s prijateljima"
 * dok partija traje ne vodi tiho za novi sto — pita, a „Vrati se za sto" je
 * glavno dugme. Samo prikaz.
 */
export function ResumeSheet({
  table,
  next,
  leaving,
  error,
  onResume,
  onLeave,
  onClose,
}: {
  table: ActiveTable;
  /** Igra novog stola; `null` = „Igraj s prijateljima" (igra se bira poslije). */
  next: GameId | null;
  leaving: boolean;
  error?: string | null | undefined;
  onResume: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  const r = sr.homeResume.sheet;
  return (
    <Sheet title={r.title(sr.games[table.game].name)} closeLabel={r.close} onClose={onClose}>
      <div className="resume-sheet">
        <p className="sheet__note sheet__note--muted">{r.body(next)}</p>
        <button type="button" className="resume-sheet__back" onClick={onResume} disabled={leaving}>
          {r.back}
          <ArrowRightIcon className="resume-sheet__icon" />
        </button>
        <button type="button" className="resume-sheet__leave" onClick={onLeave} disabled={leaving} aria-busy={leaving}>
          {leaving ? r.leaving : next ? r.leave(sr.games[next].name) : r.leaveFriends}
        </button>
        {error ? (
          <p className="resume-sheet__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
