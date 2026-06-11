"use client";

import { useEffect, useState } from "react";

/**
 * TurnTimer — countdown za potez (DS §1.4, §4.3, B5).
 *
 * Renderuje se SAMO kad je proslijeđen (tj. to sjedište je na potezu).
 * Tri stanja boje: zeleno 100→50%, narandžasto 50→20%, crveno 20→0%.
 *
 * size="ring" — kružni countdown OKO avatara (industrijski standard za "ko je na
 *   redu"); conic-gradient se prazni, boja po pragu. Glavni in-game prikaz (v3.2).
 * size="pill" — horizontalna pilula IZNAD avatara (legacy/dev).
 * size="sm"/"md" — broj / broj+traka (dev/legacy).
 *
 * `deadline` je epoch ms (server-authoritative). `totalSeconds` je puni
 * turn-timeout (default 30, = rulesConfig.turnTimeoutSeconds) za ratio/boju.
 */

type TurnTimerProps = {
  deadline: number;
  totalSeconds?: number;
  size?: "sm" | "md" | "pill" | "ring";
};

// Pragovi: zeleno ≥50%, narandžasto 50–20%, crveno <20%.
function tone(ratio: number): { text: string; bar: string } {
  if (ratio < 0.2) return { text: "text-danger", bar: "bg-danger" };
  if (ratio < 0.5) return { text: "text-warn", bar: "bg-warn" };
  return { text: "text-success", bar: "bg-success" };
}

// Boja kao CSS token-var (za inline conic-gradient / glow).
function toneVar(ratio: number): string {
  if (ratio < 0.2) return "var(--danger)";
  if (ratio < 0.5) return "var(--warn)";
  return "var(--success)";
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

  // ── ring: kružni countdown OKO avatara (conic-gradient se prazni) ──
  if (size === "ring") {
    const color = toneVar(ratio);
    const deg = ratio * 360;
    return (
      <div
        className={`h-full w-full rounded-full ${urgency}`}
        aria-label={`${seconds} sekundi za potez`}
        style={{
          // Preostali dio = boja praga; potrošeni = prigušena traka.
          background: `conic-gradient(${color} ${deg}deg, color-mix(in srgb, var(--text) 24%, transparent) ${deg}deg 360deg)`,
          // Maska pravi prsten koji "grli" avatar spolja (deblji = čitljiviji countdown).
          WebkitMask: "radial-gradient(circle, transparent 73%, #000 76%)",
          mask: "radial-gradient(circle, transparent 73%, #000 76%)",
          filter: `drop-shadow(0 0 7px color-mix(in srgb, ${color} 90%, transparent))`,
        }}
      />
    );
  }

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
