"use client";

import { useEffect, useState } from "react";
import type { ReactionType } from "@zandar/shared-types";
import { REACTIONS } from "@/lib/reactions";

/**
 * ReactionFab — reakcije kao floating dugme (DS §1.3, §4.4, B7).
 *
 * Zamjenjuje stalnu traku: collapsed = jedno dugme dole-desno (ne troši stalni
 * prostor). Tap → 8 emojija; tap emojija → emit `game:react` (onReact) →
 * collapse + 2s cooldown (disabled + vidljiv countdown). Onemogućen tokom
 * pause/abandon (`disabled`).
 *
 * Bot reactions stižu kroz isti `game:reaction` event i prikazuju se identično —
 * ovdje se ništa posebno ne radi za njih.
 *
 * Pozicionira se unutar relativnog roditelja (GameTable overlay sloj).
 */

type ReactionFabProps = {
  onReact: (type: ReactionType) => Promise<void> | void;
  /** Pauza/abandon — onemogući reakcije. */
  disabled?: boolean;
  cooldownMs?: number;
};

export function ReactionFab({
  onReact,
  disabled = false,
  cooldownMs = 2000,
}: ReactionFabProps) {
  const [open, setOpen] = useState(false);
  // Preostali cooldown u ms — odbrojava se na 0 (bez Date.now, SSR-safe).
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const id = setTimeout(
      () => setCooldownLeft((v) => Math.max(0, v - 100)),
      100,
    );
    return () => clearTimeout(id);
  }, [cooldownLeft]);

  const cooling = cooldownLeft > 0;
  const blocked = disabled || cooling;
  // Panel je otvoren samo ako nije blokiran (pauza/cooldown ga zatvaraju).
  const panelOpen = open && !blocked;

  async function handlePick(type: ReactionType) {
    if (blocked) return;
    setOpen(false);
    try {
      await onReact(type);
      setCooldownLeft(cooldownMs);
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  }

  return (
    <>
      {panelOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="absolute bottom-0 right-0 z-40 p-3 pb-safe-bottom pr-safe-right flex flex-col items-end gap-2">
        {/* Emoji panel */}
        {panelOpen && (
          <div className="rounded-token-lg bg-surface-raised border border-white/10 shadow-xl p-2 animate-fade-in">
            <div className="grid grid-cols-4 gap-1">
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => handlePick(r.type)}
                  title={r.label}
                  aria-label={r.label}
                  className="text-2xl p-2 rounded-token-md active:scale-110 active:bg-surface transition-transform"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FAB */}
        <button
          type="button"
          onClick={() => !blocked && setOpen((v) => !v)}
          disabled={blocked}
          aria-label={open ? "Zatvori reakcije" : "Reakcije"}
          aria-expanded={open}
          className={[
            "w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-xl",
            "border transition-transform active:scale-95",
            cooling
              ? "bg-surface-raised border-white/10 text-accent"
              : disabled
                ? "bg-surface-raised/60 border-white/5 opacity-50"
                : "bg-surface-raised border-white/10 active:bg-surface",
          ].join(" ")}
        >
          {cooling ? (
            <span className="text-sm font-mono font-bold tabular-nums">
              {Math.ceil(cooldownLeft / 1000)}
            </span>
          ) : panelOpen ? (
            <span aria-hidden>✕</span>
          ) : (
            <span aria-hidden>🙂</span>
          )}
        </button>
      </div>
    </>
  );
}
