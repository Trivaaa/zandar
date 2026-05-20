"use client";

import { useEffect, useState } from "react";
import type { ReactionType } from "@zandar/shared-types";
import { REACTIONS } from "@/lib/reactions";

type ReactionPanelProps = {
  onReact: (type: ReactionType) => Promise<void>;
};

export function ReactionPanel({ onReact }: ReactionPanelProps) {
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  const cooling = now < cooldownUntil;
  const remaining = Math.max(0, cooldownUntil - now);

  async function handleClick(type: ReactionType) {
    if (cooling) return;
    try {
      await onReact(type);
      setCooldownUntil(Date.now() + 2000);
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/95 rounded-lg p-2 shadow-lg z-30 border border-zinc-700">
      <div className="grid grid-cols-4 gap-1">
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            onClick={() => handleClick(r.type)}
            disabled={cooling}
            title={r.label}
            className="text-2xl p-2 rounded hover:bg-zinc-800 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition-all"
            type="button"
          >
            {r.emoji}
          </button>
        ))}
      </div>
      {cooling && (
        <div className="text-xs text-zinc-400 text-center mt-1 font-mono">
          {(remaining / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}