"use client";

import { useEffect, useState } from "react";

/**
 * TurnTimer — countdown za potez (DS §1.4, §4.3, B5).
 *
 * Renderuje se SAMO kad je proslijeđen (tj. to sjedište je na potezu).
 * Tri stanja boje: zeleno 100→50%, narandžasto 50→20%, crveno 20→0%.
 *
 * size="pill" — horizontalna pilula IZNAD avatara (glavni in-game prikaz).
 * size="sm"/"md" — broj / broj+traka (dev/legacy).
 *
 * `deadline` je epoch ms (server-authoritative). `totalSeconds` je puni
 * turn-timeout (default 30, = rulesConfig.turnTimeoutSeconds) za ratio/boju.
 */

type TurnTimerProps = {
  deadline: number;
  totalSeconds?: number;
  size?: "sm" | "md" | "pill";
};

// Pragovi: zeleno ≥50%, narandžasto 50–20%, crveno <20%.
function tone(ratio: number): { text: string; bar: string } {
  if (ratio < 0.2) return { text: "text-danger", bar: "bg-danger" };
  if (ratio < 0.5) return { text: "text-warn", bar: "bg-warn" };
  return { text: "text-success", bar: "bg-success" };
}

export function TurnTimer({
  deadline,
  totalSeconds = 30,
  size = "sm",
}: TurnTimerProps) {
  // null do mount-a: prvi render (SSR + prva hidracija) je determinističan iz
  // props-a (pun timer) → nema hydration mismatch-a. Tek poslije tika realno.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Ne postavljamo sinhrono — interval drži now; prvi render (now=null) je
    // determinističan iz props-a (pun timer) → SSR-safe, bez cascading rendera.
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const current = now ?? deadline - totalSeconds * 1000;
  const remainingMs = Math.max(0, deadline - current);
  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = Math.max(0, Math.min(1, remainingMs / (totalSeconds * 1000)));
  const { text, bar } = tone(ratio);

  // Pred istek (danger) — blagi puls za hitnost.
  const urgency = ratio < 0.2 ? "animate-status-blink" : "";

  // ── pill: horizontalna pilula IZNAD avatara (fill se prazni, boja po pragu) ──
  if (size === "pill") {
    return (
      <div
        className="w-14 h-2 rounded-full bg-black/45 overflow-hidden shadow"
        aria-label={`${seconds} sekundi za potez`}
      >
        <div
          className={`h-full rounded-full ${bar} ${urgency}`}
          style={{ width: `${ratio * 100}%`, transition: "width 0.25s linear" }}
        />
      </div>
    );
  }

  if (size === "sm") {
    return (
      <span
        className={`font-mono font-bold tabular-nums ${text} ${urgency}`}
        aria-label={`${seconds} sekundi`}
      >
        {seconds}s
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5" aria-label={`${seconds} sekundi`}>
      <span className={`font-mono font-bold tabular-nums text-sm ${text} ${urgency}`}>
        {seconds}s
      </span>
      <div className="w-16 h-1.5 rounded-token-sm bg-white/10 overflow-hidden">
        <div
          className={`h-full ${bar} rounded-token-sm transition-all duration-300`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
