"use client";

import type { RoomPlayer } from "@/lib/api";
import { SeatPuck } from "@/components/SeatPuck";

/**
 * MatchingTable — "sto se postavlja" ekran (DS §7.3, skica docs/skice).
 *
 * Sjedišta su raspoređena OKO ovalnog felt stola (ti dole, ostali gore/lijevo/
 * desno), ne kao ravan red. Popunjavaju se jedan po jedan (staggered) dok se
 * sto "postavlja".
 *
 * DS §7.3 framing — "sto se postavlja", NE pretraga:
 *  - copy je "Pripremamo sto…" / "Igrači sjedaju…" / "Sto je popunjen"
 *  - NEMA brojača "X/Y pronađeno"
 *  - NEMA "X se pridružio" log-a (human-matchmaking framing)
 * Tanak progress bar (bez brojeva) je samo "preparing" indikator.
 *
 * Bez backend-logike — čista prezentacija. Roditelj (/brza, /matching/[id])
 * vodi state (revealed, statusText, done).
 */

type MatchingTableProps = {
  /** Sortirano: lokalni igrač PRVI (ide na dno), pa po seatIndex. */
  players: RoomPlayer[];
  myPlayerId: string | null;
  /** Koliko je sjedišta otkriveno (1–4), redom popunjavanja. */
  revealed: number;
  statusText: string;
  /** Sto popunjen — boja headline-a + ready poruka. */
  done: boolean;
};

// Display index → pozicija oko stola. 0 = ti (dno), pa gore/lijevo/desno.
const POSITIONS = [
  "left-1/2 top-[86%]", // 0 — ti
  "left-1/2 top-[14%]", // 1 — preko stola
  "left-[6%] top-1/2", // 2 — lijevo
  "left-[94%] top-1/2", // 3 — desno
] as const;

export function MatchingTable({
  players,
  myPlayerId,
  revealed,
  statusText,
  done,
}: MatchingTableProps) {
  return (
    <main className="min-h-[100dvh] flex flex-col bg-surface text-white pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right">
      {/* Brend */}
      <div className="text-center pt-6 pb-1 px-5">
        <div className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-accent">
          Tablić&nbsp;-&nbsp;Žandar
        </div>
        <div className="text-[11px] text-muted mt-1">kartaonica.com</div>
      </div>

      {/* Status — bez brojača (DS §7.3) */}
      <div className="text-center px-5 pt-3 min-h-[36px]">
        <h1
          className={[
            "text-[22px] font-bold tracking-tight transition-colors duration-500",
            done ? "text-accent" : "text-white",
          ].join(" ")}
        >
          {statusText}
        </h1>
      </div>

      {/* Ovalni sto sa sjedištima okolo */}
      <div className="flex-1 flex items-center justify-center px-12">
        <div
          className="relative"
          style={{ width: "min(290px, 72vw)", aspectRatio: "300 / 380" }}
        >
          {/* Felt (token bg-felt + neutralni overlay-i + accent ring) */}
          <div
            className="absolute inset-0 bg-felt"
            style={{
              borderRadius: "50%",
              boxShadow:
                "inset 0 0 60px rgba(0,0,0,0.45), 0 0 0 8px rgba(0,0,0,0.25), 0 0 0 9px color-mix(in srgb, var(--accent) 14%, transparent)",
              backgroundImage:
                "radial-gradient(120% 120% at 50% 30%, rgba(255,255,255,0.05), transparent 55%)",
            }}
          />

          {/* Sjedišta */}
          {Array.from({ length: 4 }).map((_, i) => {
            const player = players[i] ?? null;
            const filled = i < revealed;
            const isMe = player?.id === myPlayerId;
            return (
              <div
                key={i}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ${POSITIONS[i]}`}
              >
                <SeatPuck
                  player={player}
                  isMe={isMe}
                  filled={filled}
                  seatIndex={player?.seatIndex ?? i}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress (bez brojeva) */}
      <div className="px-8 pb-1">
        <div className="h-1 rounded-token-sm bg-white/10 overflow-hidden">
          <div
            className="h-full bg-accent rounded-token-sm transition-all duration-500"
            style={{ width: `${Math.min(revealed, 4) * 25}%` }}
          />
        </div>
      </div>

      {/* Ready poruka */}
      <div className="text-center px-5 pt-2 pb-7 min-h-[44px]">
        <span
          className={[
            "text-sm font-bold text-success transition-opacity duration-300",
            done ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          Sto spreman — počinjemo!
        </span>
      </div>
    </main>
  );
}
