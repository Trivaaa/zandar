"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { Sheet } from "@/components/sheet/Sheet";
import { sr } from "@/lib/sr";

/**
 * Razlog prije sistemskog dijaloga (A/B od 1.5.2, grupa `soft`). Sistemski
 * dijalog otvara SAMO „Da, javi mi"; „Ne sada", scrim i Android nazad ga ne
 * troše — Android 13+ ima dvije prilike.
 *
 * Portal na `document.body`: kraj partije animira `transform`, a `position:
 * fixed` unutar njega bi se vezao za panel umjesto za ekran.
 */
export function PushSoftAsk({ onEnable, onDismiss }: { onEnable: () => Promise<void>; onDismiss: () => void }) {
  const [busy, setBusy] = useState(false);
  const copy = sr.push.soft;

  return createPortal(
    <Sheet title={copy.title} closeLabel={copy.notNow} onClose={() => (busy ? undefined : onDismiss())}>
      <p className="sheet__note">{copy.body}</p>
      <p className="sheet__note sheet__note--muted">{copy.note}</p>
      <button
        type="button"
        className="home__cta sheet__btn"
        disabled={busy}
        aria-busy={busy}
        onClick={() => {
          setBusy(true);
          void onEnable();
        }}
      >
        {copy.enable}
      </button>
    </Sheet>,
    document.body,
  );
}
