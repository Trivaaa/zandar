"use client";

import { useEffect, useState } from "react";

/**
 * TurnTimer — countdown za potez (DS §1.4, §4.3, B5).
 *
 * Živi NA aktivnom igraču: unutar aktivnog `SeatChip`-a (size="sm") i u hand
 * zoni kad je tvoj red (size="md"). Boja se mijenja pred istek
 * (success → warn → danger). Renderuje se SAMO kad je proslijeđen (tj. kad je
 * to sjedište/ruka na potezu) — pozivalac kontroliše vidljivost.
 *
 * `deadline` je epoch ms (server-authoritative). `totalSeconds` je puni
 * turn-timeout (default 30, = rulesConfig.turnTimeoutSeconds) za ratio/boju.
 */

type TurnTimerProps = {
  deadline: number;
  totalSeconds?: number;
  size?: "sm" | "md" | "arc";
};

function tone(ratio: number): { text: string; bar: string } {
  if (ratio < 0.25) return { text: "text-danger", bar: "bg-danger" };
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
  const urgency = ratio < 0.25 ? "animate-status-blink" : "";

  // ── arc: polu-luk iznad avatara, hue green→red, zadnjih 5s crveno ──
  if (size === "arc") {
    const r = 26;
    const len = Math.PI * r; // dužina polu-luka
    const visible = len * ratio;
    // hue 120 (zeleno) → 0 (crveno) po preostalom vremenu; ≤5s = crveno
    const hue = remainingMs <= 5000 ? 0 : Math.min(120, Math.round(120 * ratio));
    const color = `hsl(${hue} 72% 48%)`;
    const path = "M 6 32 A 26 26 0 0 1 58 32";
    return (
      <svg
        className={`absolute left-1/2 -translate-x-1/2 -top-3 w-16 h-9 overflow-visible pointer-events-none ${remainingMs <= 5000 ? "animate-status-blink" : ""}`}
        viewBox="0 0 64 36"
        aria-label={`${seconds} sekundi za potez`}
      >
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${visible} ${len}`}
          style={{ transition: "stroke-dasharray 0.25s linear, stroke 0.25s linear" }}
        />
      </svg>
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
