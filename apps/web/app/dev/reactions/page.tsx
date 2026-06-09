"use client";

import { useState } from "react";
import type { ReactionType } from "@zandar/shared-types";
import { ReactionFab } from "@/components/ReactionFab";
import { getReactionEmoji } from "@/lib/reactions";

/**
 * Dev preview za ReactionFab (DS B7). Tap FAB → 8 emojija → "emit" (log) →
 * 2s cooldown. Toggle disabled (pauza) onemogući. Nije produkcijski flow.
 */
export default function DevReactionsPage() {
  const [disabled, setDisabled] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function emit(type: ReactionType) {
    setLog((l) => [`${getReactionEmoji(type)} ${type}`, ...l].slice(0, 6));
  }

  return (
    <div className="min-h-[100dvh] bg-surface text-white p-4 pt-safe-top">
      <h1 className="text-lg font-bold mb-3">ReactionFab — dev preview</h1>

      <button
        type="button"
        onClick={() => setDisabled((v) => !v)}
        className={`px-3 py-1.5 rounded-token-md text-sm font-bold transition-colors mb-4 ${
          disabled
            ? "bg-danger text-white"
            : "bg-surface-raised text-muted active:bg-surface"
        }`}
      >
        {disabled ? "Pauza (disabled)" : "Aktivno"}
      </button>

      {/* Simulirani sto — relativni kontejner za overlay */}
      <div className="relative w-full max-w-[360px] mx-auto rounded-token-lg bg-felt border border-white/5 h-[440px] overflow-hidden">
        <div className="p-3 text-[11px] text-muted">
          emit log:
          {log.length === 0 ? (
            <span className="ml-1">— (tapni FAB dole-desno)</span>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {log.map((l, i) => (
                <li key={i} className={i === 0 ? "text-white" : ""}>
                  · {l}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ReactionFab onReact={emit} disabled={disabled} />
      </div>

      <p className="text-[11px] text-muted mt-3">
        collapsed = jedno dugme · tap → 8 emojija · poslije izbora 2s cooldown
        (countdown na FAB-u) · pauza onemogući
      </p>
    </div>
  );
}
